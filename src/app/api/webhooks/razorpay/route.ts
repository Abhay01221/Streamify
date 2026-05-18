import { NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  toPrismaSubscriptionPlan,
  toPrismaSubscriptionStatus,
} from '@/lib/razorpay';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/webhooks/razorpay
 *
 * Razorpay sends webhook events as JSON with an `x-razorpay-signature` header.
 * We must read the raw body (request.text()) before any parsing so the HMAC
 * is computed over the exact bytes Razorpay signed.
 *
 * Register this URL in your Razorpay Dashboard → Settings → Webhooks.
 * Active events: payment.captured, subscription.charged, subscription.cancelled
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing x-razorpay-signature header' },
      { status: 400 }
    );
  }

  // -------------------------------------------------------------------------
  // 1. Verify signature
  // -------------------------------------------------------------------------
  let isValid = false;
  try {
    isValid = verifyWebhookSignature(body, signature);
  } catch (err) {
    console.error('[razorpay-webhook] Signature check threw:', err);
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  // -------------------------------------------------------------------------
  // 2. Parse and dispatch
  // -------------------------------------------------------------------------
  let event: { event: string; payload: any };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.payload);
        break;

      default:
        // Acknowledge unhandled events so Razorpay doesn't retry them
        break;
    }
  } catch (err) {
    console.error(`[razorpay-webhook] Handler error for ${event.event}:`, err);
    // Return 500 so Razorpay retries
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * payment.captured
 *
 * Fired when a one-time order payment is successfully captured.
 * Reads userId and plan from the order notes, then upserts the Subscription.
 */
async function handlePaymentCaptured(payload: any) {
  const payment = payload?.payment?.entity;
  if (!payment) {
    console.warn('[razorpay-webhook] payment.captured: missing payment entity');
    return;
  }

  // Notes are set on the order at create-order time
  const notes = payment.notes ?? {};
  const userId = notes.userId as string | undefined;
  const plan = notes.plan as string | undefined;

  if (!userId || !plan) {
    console.warn(
      '[razorpay-webhook] payment.captured: missing userId or plan in notes',
      notes
    );
    return;
  }

  const prismaplan = toPrismaSubscriptionPlan(plan);
  const razorpayCustomerId =
    typeof payment.customer_id === 'string' ? payment.customer_id : null;

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        ...(razorpayCustomerId
          ? { stripeCustomerId: razorpayCustomerId }
          : {}),
        subscriptionPlan: prismaplan,
        subscriptionStatus: 'ACTIVE',
        trialUsed: true,
      },
    }),
    prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeSubscriptionId: payment.id, // reuse field for Razorpay payment ID
        plan: prismaplan,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
      update: {
        stripeSubscriptionId: payment.id,
        plan: prismaplan,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    }),
  ]);
}

/**
 * subscription.charged
 *
 * Fired on each successful recurring charge.
 * Updates the Subscription's billing period and status.
 */
async function handleSubscriptionCharged(payload: any) {
  const subscription = payload?.subscription?.entity;
  const payment = payload?.payment?.entity;

  if (!subscription) {
    console.warn('[razorpay-webhook] subscription.charged: missing subscription entity');
    return;
  }

  // Look up our Subscription row by the Razorpay subscription ID stored in
  // stripeSubscriptionId (we reuse that column for Razorpay IDs)
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { userId: true },
  });

  if (!existing) {
    console.warn(
      '[razorpay-webhook] subscription.charged: no record for',
      subscription.id
    );
    return;
  }

  const status = toPrismaSubscriptionStatus(subscription.status ?? 'active');
  const currentStart = subscription.current_start
    ? new Date(subscription.current_start * 1000)
    : new Date();
  const currentEnd = subscription.current_end
    ? new Date(subscription.current_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: existing.userId },
      data: { subscriptionStatus: status },
    }),
    prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status,
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        // Update the latest payment ID for reference
        ...(payment?.id ? { stripeSubscriptionId: payment.id } : {}),
      },
    }),
  ]);
}

/**
 * subscription.cancelled
 *
 * Fired when a Razorpay subscription is cancelled.
 * Sets status to CANCELED and resets the user's plan to FREE_TRIAL.
 */
async function handleSubscriptionCancelled(payload: any) {
  const subscription = payload?.subscription?.entity;

  if (!subscription) {
    console.warn('[razorpay-webhook] subscription.cancelled: missing subscription entity');
    return;
  }

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { userId: true },
  });

  if (!existing) {
    console.warn(
      '[razorpay-webhook] subscription.cancelled: no record for',
      subscription.id
    );
    return;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: existing.userId },
      data: {
        subscriptionPlan: 'FREE_TRIAL',
        subscriptionStatus: 'CANCELED',
      },
    }),
    prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: false,
      },
    }),
  ]);
}
