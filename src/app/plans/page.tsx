'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Razorpay checkout.js is loaded at runtime — declare the global type
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number | string;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// ---------------------------------------------------------------------------
// Plan definitions (amounts shown in INR for display)
// ---------------------------------------------------------------------------
const PLANS = [
  {
    key: null,
    name: 'Free Trial',
    price: '₹0',
    period: '30 days',
    screens: 1,
    quality: '720p',
    downloads: false,
    features: ['30 days free', '1 screen', '720p max', 'Ad-supported'],
    popular: false,
    cta: 'Get Started',
  },
  {
    key: 'BASIC',
    name: 'Basic',
    price: '₹499',
    period: '/month',
    screens: 1,
    quality: '1080p',
    downloads: false,
    features: ['₹499/month', '1 screen', '1080p', 'No ads'],
    popular: false,
    cta: 'Subscribe',
  },
  {
    key: 'STANDARD',
    name: 'Standard',
    price: '₹999',
    period: '/month',
    screens: 2,
    quality: '1080p',
    downloads: true,
    features: ['₹999/month', '2 screens', '1080p', '10 downloads/month'],
    popular: false,
    cta: 'Subscribe',
  },
  {
    key: 'PREMIUM',
    name: 'Premium',
    price: '₹1499',
    period: '/month',
    screens: 4,
    quality: '4K',
    downloads: true,
    features: ['₹1499/month', '4 screens', '4K + HDR', 'Unlimited downloads'],
    popular: true,
    cta: 'Subscribe',
  },
] as const;

// ---------------------------------------------------------------------------
// Lazily load the Razorpay checkout script
// ---------------------------------------------------------------------------
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PlansPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleSubscribe(planKey: string) {
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }

    setLoadingPlan(planKey);

    try {
      // 1. Load the Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway. Please try again.');
        return;
      }

      // 2. Create a Razorpay order on the server
      const orderRes = await fetch('/api/subscription/create-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        toast.error(err.error ?? 'Failed to create order. Please try again.');
        return;
      }

      const { data } = await orderRes.json();
      const { orderId, amount, currency, keyId } = data;

      // 3. Open the Razorpay modal
      const user = session.user as any;

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'Streamify',
        description: `${planKey.charAt(0) + planKey.slice(1).toLowerCase()} Plan — Monthly`,
        prefill: {
          name: user.name ?? '',
          email: user.email ?? '',
        },
        theme: { color: '#7c3aed' },
        modal: {
          ondismiss: () => {
            setLoadingPlan(null);
          },
        },
        handler: async (response: RazorpayPaymentResponse) => {
          // 4. Verify the payment on the server
          try {
            const verifyRes = await fetch('/api/subscription/verify', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planKey,
              }),
            });

            if (verifyRes.ok) {
              toast.success('Subscription activated! Welcome to Streamify.');
              router.push('/profile?success=true');
            } else {
              const err = await verifyRes.json().catch(() => ({}));
              toast.error(err.error ?? 'Payment verification failed.');
            }
          } catch {
            toast.error('Something went wrong verifying your payment.');
          } finally {
            setLoadingPlan(null);
          }
        },
      });

      rzp.open();
    } catch (err) {
      console.error('[plans] handleSubscribe error:', err);
      toast.error('Something went wrong. Please try again.');
      setLoadingPlan(null);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-dark-900">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-gray-400 text-lg">
              Stream unlimited content. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-lg p-6 border transition flex flex-col ${
                  plan.popular
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-800 bg-dark-card'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                      POPULAR
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <div className="text-3xl font-bold mb-1">
                  {plan.price}
                  <span className="text-base font-normal text-gray-400">
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-3 my-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <span className="text-primary shrink-0">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.key === null ? (
                  // Free trial — just navigate to signup
                  <button
                    onClick={() => router.push('/auth/signup')}
                    className="w-full py-2 rounded-lg font-semibold transition bg-dark-800 text-white hover:bg-dark-700"
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.key!)}
                    disabled={loadingPlan === plan.key}
                    className={`w-full py-2 rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed ${
                      plan.popular
                        ? 'bg-primary text-white hover:opacity-90'
                        : 'bg-dark-800 text-white hover:bg-dark-700'
                    }`}
                  >
                    {loadingPlan === plan.key ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        Processing…
                      </span>
                    ) : (
                      plan.cta
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm mt-10">
            Payments are processed securely by{' '}
            <a
              href="https://razorpay.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Razorpay
            </a>
            . You can cancel anytime from your profile.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
