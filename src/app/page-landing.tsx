'use client';

import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';

export default function LandingPage() {
  const { data: session } = useSession();

  if (session?.user) {
    return null; // Redirect logged-in users to /browse
  }

  return (
    <>
      <Navbar />
      <main className="bg-dark-900">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary-foreground/20 opacity-30" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 text-center px-4 max-w-4xl mx-auto"
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
              Streamify
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 mb-4">
              Stream Everything. Anywhere.
            </p>
            <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              Unlimited movies, TV shows, anime, and K-dramas on your devices. Cancel
              anytime. Start your free 30-day trial today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/plans">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  View Plans
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Floating cards animation */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[
              { color: 'from-primary', delay: 0 },
              { color: 'from-primary-foreground', delay: 0.2 },
              { color: 'from-primary', delay: 0.4 },
            ].map((item, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 3, delay: item.delay, repeat: Infinity }}
                className={`absolute w-48 h-64 bg-gradient-to-br ${item.color} rounded-lg opacity-10`}
                style={{
                  top: `${20 + i * 30}%`,
                  left: `${10 + i * 30}%`,
                }}
              />
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose Streamify?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🎬',
                title: 'Massive Library',
                description: 'Movies, TV shows, anime, K-dramas, and more',
              },
              {
                icon: '📱',
                title: 'Watch Anywhere',
                description: 'Stream on your TV, phone, tablet, or computer',
              },
              {
                icon: '⚡',
                title: '4K Ultra HD',
                description: 'Watch in stunning 4K and HDR quality',
              },
              {
                icon: '🌍',
                title: 'Multi-Language',
                description: 'Subtitles in your favorite language',
              },
              {
                icon: '👥',
                title: 'Multi-Profile',
                description: 'Up to 5 profiles per account',
              },
              {
                icon: '💾',
                title: 'Download & Watch',
                description: 'Download and watch offline',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-dark-card rounded-lg p-8 border border-gray-800 hover:border-primary transition"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-16">Frequently Asked Questions</h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {[
              {
                q: 'How much does Streamify cost?',
                a: 'Plans start at $4.99/month. You can start with a free 30-day trial.',
              },
              {
                q: 'Can I watch on multiple devices?',
                a: 'Yes, depending on your plan. Premium allows 4 screens simultaneously.',
              },
              {
                q: 'Can I download content?',
                a: 'Standard and Premium plans include offline downloads.',
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes, 30 days free with no credit card required.',
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="bg-dark-card rounded-lg p-6 border border-gray-800 hover:border-primary transition"
              >
                <h4 className="font-bold mb-2 text-lg flex items-center gap-2">
                  <span className="text-primary">Q:</span> {faq.q}
                </h4>
                <p className="text-gray-400 ml-6">
                  <span className="text-primary mr-2">A:</span> {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24 mb-12">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="bg-gradient-primary rounded-lg p-12 text-center text-white"
            >
              <h2 className="text-4xl font-bold mb-4">Ready to Stream?</h2>
              <p className="text-lg mb-8 opacity-90">
                Join millions watching on Streamify today
              </p>
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-gray-100"
                >
                  Get Started Now
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
