import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Code2, Flame, Trophy, Users, Zap, BookOpen, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { user } = useAuthStore();

  const { data: dailyChallenge } = useQuery({
    queryKey: ['daily-challenge'],
    queryFn: () => api.get('/problems?limit=1&sortBy=number').then((r) => r.data.problems[0]),
  });

  const { data: stats } = useQuery({
    queryKey: ['global-stats'],
    queryFn: () => api.get('/metrics').then((r) => r.data),
  });

  const { data: studyPlans } = useQuery({
    queryKey: ['study-plans'],
    queryFn: () => api.get('/study-plans').then((r) => r.data.plans.slice(0, 3)),
  });

  const features = [
    { icon: Code2, title: 'Original Problems', desc: 'From Easy to Hard, covering all interview topics' },
    { icon: Zap, title: 'Real Execution', desc: 'Run Python through an isolated execution provider' },
    { icon: Trophy, title: 'Track Progress', desc: 'Review your submissions and solved problems' },
    { icon: Users, title: 'Community', desc: 'Discuss solutions and learn from others' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-coders-green/5 via-transparent to-coders-blue/5" />
        <div className="container mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-coders-green/10 border border-coders-green/20 rounded-full px-4 py-1.5 text-sm text-coders-green mb-6">
              <Flame className="w-4 h-4" />
              <span>Practice Pick available now</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Master Coding
              <br />
              <span className="gradient-text">Interviews</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Practice with real problems, execute code in your browser, compete in contests,
              and land your dream job at top tech companies.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-coders-green text-black hover:bg-coders-green/90 font-semibold" asChild>
                <Link to="/problems">
                  Start Practicing <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" className="border-coders-border" asChild>
                  <Link to="/register">Create Free Account</Link>
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-coders-border bg-coders-surface/50 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            {[
              { label: 'Problems', value: stats?.problems ?? '—' },
              { label: 'Languages', value: '1' },
              { label: 'Users', value: stats?.users ?? '—' },
              { label: 'Submissions Today', value: stats?.submissionsToday ?? '—' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-coders-green">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Practice Pick */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <Flame className="w-5 h-5 text-coders-orange" />
            <h2 className="text-xl font-bold">Practice Pick</h2>
            <span className="text-sm text-muted-foreground ml-auto">Choose a problem and start practicing</span>
          </div>

          {dailyChallenge ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 hover:border-coders-green/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-muted-foreground text-sm">#{dailyChallenge.number}</span>
                    <DifficultyBadge difficulty={dailyChallenge.difficulty} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{dailyChallenge.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {dailyChallenge.tags?.slice(0, 3).map((tag: { slug: string; name: string }) => (
                      <span key={tag.slug} className="text-xs bg-white/5 border border-coders-border rounded px-2 py-0.5 text-muted-foreground">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                <Button className="bg-coders-green text-black hover:bg-coders-green/90 shrink-0" asChild>
                  <Link to={`/problems/${dailyChallenge.slug}`}>
                    Solve Now <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          ) : (
            <Skeleton className="h-32 rounded-xl" />
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-4 bg-coders-surface/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Everything you need to succeed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 text-center hover:border-coders-green/30 transition-colors"
              >
                <div className="w-12 h-12 bg-coders-green/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6 text-coders-green" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Study Plans */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-coders-blue" />
              <h2 className="text-xl font-bold">Study Plans</h2>
            </div>
            <Link to="/study-plan" className="text-sm text-coders-green hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {studyPlans ? studyPlans.map((plan: { id: string; title: string; description: string; estimatedDays: number; problemCount: number }) => (
              <Link key={plan.id} to={`/study-plan`}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="glass-card p-6 hover:border-coders-blue/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-coders-blue" />
                    <h3 className="font-semibold">{plan.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{plan.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{plan.problemCount} problems</span>
                    <span>{plan.estimatedDays} days</span>
                  </div>
                </motion.div>
              </Link>
            )) : Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="py-20 px-4 text-center">
          <div className="container mx-auto max-w-2xl">
            <h2 className="text-4xl font-bold mb-4">Ready to level up?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of developers who use Coders to prepare for technical interviews.
            </p>
            <Button size="lg" className="bg-coders-green text-black hover:bg-coders-green/90 font-semibold" asChild>
              <Link to="/register">Get Started for Free</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
