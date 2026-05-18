import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { razorpay, toPrismaSubscriptionPlan } from '@/lib/razorpay';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/subscription/verify
 *
 * Called from the Razorpay checkout handler callback after a successful payment.
 * Verifies the payment signature, then upserts the Subscription record.
 *
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment verification fields' },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // Verify the payment signature
    // Razorpay signs: `${order_id}|${payment_id}` with RAZORPAY_KEY_SECRET
    // -----------------------------------------------------------------------
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Missing env var: RAZORPAY_KEY_SECRET');
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    let signatureValid = false;
    try {
      signatureValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(razorpay_signature, 'hex')
      );
    } catch {
      signatureValid = false;
    }

    if (!signatureValid) {
      return NextResponse.json(
        { error: 'Payment signature verification failed' },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // Fetch the payment to get the Razorpay customer ID
    // -----------------------------------------------------------------------
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    const razorpayCustomerId =
      typeof payment.customer_id === 'string' ? payment.customer_id : null;

    const prismaplan = toPrismaSubscriptionPlan(plan ?? 'BASIC');

    // Billing period: now → +30 days (Razorpay one-time order model)
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
          stripeSubscriptionId: razorpay_payment_id, // reuse field for Razorpay payment ID
          plan: prismaplan,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        update: {
          stripeSubscriptionId: razorpay_payment_id,
          plan: prismaplan,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      }),
    ]);

    return NextResponse.json(
      { success: true, message: 'Payment verified and subscription activated' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[verify] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
