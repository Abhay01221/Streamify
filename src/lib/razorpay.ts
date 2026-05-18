import Razorpay from 'razorpay';
import crypto from 'crypto';

if (!process.env.RAZORPAY_KEY_ID) {
  throw new Error('Missing env var: RAZORPAY_KEY_ID');
}
if (!process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Missing env var: RAZORPAY_KEY_SECRET');
}

/**
 * Singleton Razorpay client.
 */
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---------------------------------------------------------------------------
// Plan → amount in paise (1 INR = 100 paise)
// ---------------------------------------------------------------------------
export const PLAN_PRICES: Record<string, number> = {
  BASIC: 49900,      // ₹499/month
  STANDARD: 99900,   // ₹999/month
  PREMIUM: 149900,   // ₹1499/month
};

// ---------------------------------------------------------------------------
// Shared types mirroring Prisma enums — avoids importing Prisma on the edge
// ---------------------------------------------------------------------------
export type PrismaSubscriptionPlan =
  | 'FREE_TRIAL'
  | 'BASIC'
  | 'STANDARD'
  | 'PREMIUM';

export type PrismaSubscriptionStatus =
  | 'ACTIVE'
  | 'CANCELED'
  | 'PAST_DUE'
  | 'EXPIRED';

// ---------------------------------------------------------------------------
// Webhook signature verification
// Razorpay signs webhook payloads with HMAC-SHA256 using the webhook secret.
// ---------------------------------------------------------------------------

/**
 * Verifies a Razorpay webhook signature.
 *
 * @param body      - Raw request body string (must NOT be JSON.parsed)
 * @param signature - Value of the `x-razorpay-signature` header
 * @returns true if the signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('Missing env var: RAZORPAY_WEBHOOK_SECRET');
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    // Buffer lengths differ → invalid signature
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers for mapping Razorpay subscription state → Prisma enums
// ---------------------------------------------------------------------------

export function toPrismaSubscriptionPlan(
  planKey: string
): PrismaSubscriptionPlan {
  const upper = planKey.toUpperCase();
  if (upper === 'PREMIUM') return 'PREMIUM';
  if (upper === 'STANDARD') return 'STANDARD';
  if (upper === 'BASIC') return 'BASIC';
  return 'BASIC';
}

export function toPrismaSubscriptionStatus(
  razorpayStatus: string
): PrismaSubscriptionStatus {
  switch (razorpayStatus) {
    case 'active':
    case 'authenticated':
      return 'ACTIVE';
    case 'pending':
    case 'halted':
      return 'PAST_DUE';
    case 'cancelled':
    case 'completed':
    case 'expired':
      return 'CANCELED';
    default:
      return 'EXPIRED';
  }
}
