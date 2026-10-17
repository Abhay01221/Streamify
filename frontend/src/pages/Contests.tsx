import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, Calendar, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format } from 'date-fns';

export default function ContestsPage() {
  const [tab, setTab] = useState('upcoming');

  const { data, isLoading } = useQuery({
    queryKey: ['contests', tab],
    queryFn: () => api.get(`/contests?status=${tab.toUpperCase()}`).then((r) => r.data),
  });

  const contests = data?.contests || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Contests</h1>
          <p className="text-muted-foreground text-sm">Compete globally and improve your rating</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-coders-surface border border-coders-border mb-6">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="ended">Past</TabsTrigger>
        </TabsList>

        {['upcoming', 'active', 'ended'].map((t) => (
          <TabsContent key={t} value={t}>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : contests.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No {t} contests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contests.map((contest: {
                  id: string; slug: string; title: string; description?: string;
                  startTime: string; endTime: string; duration: number;
                  _count: { participants: number; problems: number };
                  status: string;
                }) => (
                  <motion.div
                    key={contest.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 hover:border-yellow-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {contest.status === 'ACTIVE' && (
                            <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />LIVE
                            </span>
                          )}
                          <h3 className="font-semibold text-lg">{contest.title}</h3>
                        </div>
                        {contest.description && (
                          <p className="text-sm text-muted-foreground mb-3">{contest.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(contest.startTime), 'MMM d, yyyy HH:mm')}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {contest.duration} min
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {contest._count.participants} registered
                          </span>
                        </div>
                        {contest.status === 'UPCOMING' && (
                          <p className="text-xs text-coders-green mt-2">
                            Starts {formatDistanceToNow(new Date(contest.startTime), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <Button
                        className={contest.status === 'ACTIVE' ? 'bg-coders-green text-black hover:bg-coders-green/90' : ''}
                        variant={contest.status !== 'ACTIVE' ? 'outline' : 'default'}
                        asChild
                      >
                        <Link to={`/contest/${contest.id}`}>
                          {contest.status === 'ACTIVE' ? 'Join Now' : contest.status === 'UPCOMING' ? 'Register' : 'View'}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
