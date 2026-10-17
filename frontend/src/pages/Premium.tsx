import { motion } from 'framer-motion';
import { Check, Zap, Code2, BookOpen, Trophy, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';

const FEATURES = {
  free: [
    'Access to 500+ free problems',
    'Code execution in 11 languages',
    'Community discussions',
    'Basic statistics',
    '30 submissions/hour',
  ],
  premium: [
    'All 2000+ problems including premium',
    'Full editorial access',
    'Company-specific problem sets',
    'Advanced analytics & insights',
    'Unlimited submissions',
    'Interview simulation mode',
    'Custom study plans',
    'Priority support',
  ],
};

export default function PremiumPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post('/premium/subscribe', {
        priceId: plan === 'monthly' ? 'price_monthly' : 'price_annual',
      });
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast({ title: 'Premium activated!', description: res.data.message });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to start subscription', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.isPremium) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-yellow-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">You're a Pro member!</h1>
        <p className="text-muted-foreground">Enjoy all premium features. Thank you for your support.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5 text-sm text-yellow-400 mb-4">
          <Zap className="w-4 h-4" />Premium
        </div>
        <h1 className="text-4xl font-bold mb-4">Unlock your full potential</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Get access to all problems, editorials, and advanced features to ace your next interview.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Free */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-1">Free</h3>
          <div className="text-3xl font-bold mb-4">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
          <ul className="space-y-2 mb-6">
            {FEATURES.free.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-coders-green mt-0.5 shrink-0" />{f}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full border-coders-border" disabled>Current Plan</Button>
        </div>

        {/* Monthly */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-card p-6 border-yellow-500/30 relative"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">
            POPULAR
          </div>
          <h3 className="font-bold text-lg mb-1">Premium Monthly</h3>
          <div className="text-3xl font-bold mb-4">$9.99<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
          <ul className="space-y-2 mb-6">
            {FEATURES.premium.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />{f}
              </li>
            ))}
          </ul>
          <Button className="w-full bg-yellow-500 text-black hover:bg-yellow-400 font-semibold"
            onClick={() => handleSubscribe('monthly')} disabled={isLoading}>
            <Zap className="w-4 h-4 mr-2" />Get Premium
          </Button>
        </motion.div>

        {/* Annual */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-1">Premium Annual</h3>
          <div className="text-3xl font-bold mb-1">$79.99<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
          <p className="text-xs text-coders-green mb-4">Save 33% vs monthly</p>
          <ul className="space-y-2 mb-6">
            {FEATURES.premium.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-coders-green mt-0.5 shrink-0" />{f}
              </li>
            ))}
          </ul>
          <Button className="w-full bg-coders-green text-black hover:bg-coders-green/90 font-semibold"
            onClick={() => handleSubscribe('annual')} disabled={isLoading}>
            Get Annual Plan
          </Button>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Code2, title: '2000+ Problems', desc: 'Including premium company-specific sets' },
          { icon: BookOpen, title: 'Full Editorials', desc: 'Step-by-step solutions for every problem' },
          { icon: Trophy, title: 'Interview Sim', desc: 'Timed mock interviews with real problems' },
          { icon: BarChart3, title: 'Advanced Stats', desc: 'Deep insights into your performance' },
        ].map((f) => (
          <div key={f.title} className="glass-card p-4 text-center">
            <f.icon className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <h4 className="font-semibold text-sm mb-1">{f.title}</h4>
            <p className="text-xs text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
