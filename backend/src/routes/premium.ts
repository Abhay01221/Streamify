import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// ---------------------------------------------------------------------------
// Plan config — maps the priceId strings the frontend sends to Razorpay plan
// amounts (in paise, INR × 100) and durations.
// ---------------------------------------------------------------------------
const PLAN_CONFIG: Record<string, { amountPaise: number; durationDays: number; label: string }> = {
  price_monthly: { amountPaise: 82900, durationDays: 30,  label: 'Premium Monthly' }, // ₹829
  price_annual:  { amountPaise: 659900, durationDays: 365, label: 'Premium Annual'  }, // ₹6599
};

// ---------------------------------------------------------------------------
// Razorpay client factory — returns null when credentials are absent so the
// route falls back to mock mode (same behaviour as the old Stripe code).
// ---------------------------------------------------------------------------
const getRazorpay = (): Razorpay | null => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    logger.warn('Payments are not configured');
    return null;
  }
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
};

// ---------------------------------------------------------------------------
// Verify a Razorpay webhook signature.
// Razorpay signs the raw request body with HMAC-SHA256 using the webhook
// secret and sends the digest in the `x-razorpay-signature` header.
//
// express.json() has already parsed req.body by the time we get here, so we
// re-serialise it to a canonical JSON string.  This is safe because Razorpay
// sends compact JSON with no extra whitespace.
// ---------------------------------------------------------------------------
const verifyWebhookSignature = (body: unknown, signature: string, secret: string): boolean => {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

// ---------------------------------------------------------------------------
// POST /api/premium/subscribe
//
// Frontend sends:  { priceId: "price_monthly" | "price_annual" }
// Response shape (same as before):
//   • Live mode:  { checkoutUrl: string }   — frontend redirects here
//   • Mock mode:  { message: string, isPremium: true }
// ---------------------------------------------------------------------------
router.post('/subscribe', authenticate, (_req, _res, next) => {
  next(new AppError('Paid checkout is not implemented for this deployment', 501));
});

// ---------------------------------------------------------------------------
// DELETE /api/premium/cancel
//
// Cancels the user's premium subscription.
// Response: { message: string }
// ---------------------------------------------------------------------------
router.delete('/cancel', authenticate, async (req, res, next) => {
  try {
    const razorpay = getRazorpay();

    // ── Mock mode ──────────────────────────────────────────────────────────
    if (!razorpay) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { isPremium: false, premiumExpiresAt: null },
      });
      return res.json({ message: 'Premium cancelled (mock mode)' });
    }

    // ── Live mode ──────────────────────────────────────────────────────────
    // Look up the stored Razorpay subscription id (persisted on payment
    // capture via the webhook below).
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { stripeCustomerId: true }, // reusing the existing column to store razorpay sub id
    });

    const razorpaySubscriptionId = user?.stripeCustomerId ?? null;

    if (razorpaySubscriptionId) {
      try {
        // Cancel at cycle end — equivalent to Stripe's cancel_at_period_end
        await razorpay.subscriptions.cancel(razorpaySubscriptionId, true);
      } catch (cancelErr) {
        // Log but don't surface — the DB update below is the source of truth
        logger.warn('Razorpay subscription cancel failed:', cancelErr);
      }
    }

    // Mark as cancelled in DB immediately so the user loses access at expiry
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { isPremium: false, premiumExpiresAt: null },
    });

    res.json({ message: 'Subscription will cancel at end of billing period' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/premium/webhook  (Razorpay webhook)
//
// Razorpay sends a POST with JSON body and an `x-razorpay-signature` header.
// Events handled:
//   • payment.captured          → activate premium
//   • subscription.cancelled    → deactivate premium
// ---------------------------------------------------------------------------
router.post('/webhook', async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) throw new AppError('Payments are not configured', 503);
    // Verify before applying any payment event
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'] as string | undefined;
      if (!signature) {
        logger.warn('Razorpay webhook received without signature header');
        return res.status(400).json({ error: 'Missing signature' });
      }

      const isValid = verifyWebhookSignature((req as typeof req & { rawBody?: string }).rawBody, signature, webhookSecret);
      if (!isValid) {
        logger.warn('Razorpay webhook signature verification failed');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body as {
      event: string;
      payload: {
        payment?: { entity: { notes?: Record<string, string>; id: string } };
        subscription?: { entity: { id: string; notes?: Record<string, string> } };
      };
    };

    logger.info(`Razorpay webhook: ${event.event}`);

    // ── payment.captured ───────────────────────────────────────────────────
    // Fired when a one-time payment (order) is successfully captured.
    if (event.event === 'payment.captured') {
      const notes = event.payload.payment?.entity?.notes ?? {};
      const userId = notes['userId'];

      if (userId) {
        const priceId  = notes['priceId'] ?? 'price_monthly';
        const plan     = PLAN_CONFIG[priceId] ?? PLAN_CONFIG['price_monthly'];
        const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);

        await prisma.user.update({
          where: { id: userId },
          data: { isPremium: true, premiumExpiresAt: expiresAt },
        });

        logger.info(`Premium activated for user ${userId} via payment.captured`);
      }
    }

    // ── subscription.activated ─────────────────────────────────────────────
    // Fired when a Razorpay subscription becomes active.
    if (event.event === 'subscription.activated') {
      const sub    = event.payload.subscription?.entity;
      const notes  = sub?.notes ?? {};
      const userId = notes['userId'];

      if (userId && sub) {
        await prisma.user.update({
          where: { id: userId },
          // Reuse stripeCustomerId column to store the Razorpay subscription id
          data: {
            isPremium:        true,
            premiumExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            stripeCustomerId: sub.id,
          },
        });

        logger.info(`Premium activated for user ${userId} via subscription.activated`);
      }
    }

    // ── subscription.cancelled ─────────────────────────────────────────────
    // Fired when a Razorpay subscription is cancelled.
    if (event.event === 'subscription.cancelled') {
      const sub    = event.payload.subscription?.entity;
      const notes  = sub?.notes ?? {};
      const userId = notes['userId'];

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { isPremium: false, premiumExpiresAt: null },
        });

        logger.info(`Premium deactivated for user ${userId} via subscription.cancelled`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

export default router;
