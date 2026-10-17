import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Trophy, Clock, Users, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInSeconds } from 'date-fns';

function Countdown({ targetDate }: { targetDate: Date }) {
  const [seconds, setSeconds] = useState(differenceInSeconds(targetDate, new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(differenceInSeconds(targetDate, new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (seconds <= 0) return <span className="text-coders-green">Started!</span>;

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return (
    <span className="font-mono text-2xl font-bold">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [leaderboard, setLeaderboard] = useState<unknown[]>([]);

  const { data } = useQuery({
    queryKey: ['contest', id],
    queryFn: () => api.get(`/contests/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ['contest-leaderboard', id],
    queryFn: () => api.get(`/contests/${id}/leaderboard`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (leaderboardData?.leaderboard) setLeaderboard(leaderboardData.leaderboard);
  }, [leaderboardData]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit('contest:join', id);
    socket.on('contest:leaderboard', (data: unknown[]) => setLeaderboard(data));
    return () => {
      socket.emit('contest:leave', id);
      socket.off('contest:leaderboard');
    };
  }, [id]);

  const registerMutation = useMutation({
    mutationFn: () => api.post(`/contests/${id}/register`),
    onSuccess: () => {
      toast({ title: 'Registered successfully!' });
      queryClient.invalidateQueries({ queryKey: ['contest', id] });
    },
    onError: () => toast({ title: 'Registration failed', variant: 'destructive' }),
  });

  const contest = data?.contest;
  const isRegistered = !!data?.userParticipation;

  if (!contest) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {contest.status === 'ACTIVE' && (
                <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />LIVE
                </span>
              )}
              <h1 className="text-2xl font-bold">{contest.title}</h1>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />{contest.duration} minutes
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />{contest._count?.participants || 0} participants
              </span>
            </div>
          </div>

          <div className="text-right">
            {contest.status === 'UPCOMING' && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">Starts in</p>
                <Countdown targetDate={new Date(contest.startTime)} />
              </div>
            )}
            {contest.status === 'ACTIVE' && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">Ends in</p>
                <Countdown targetDate={new Date(contest.endTime)} />
              </div>
            )}
            {!isRegistered && contest.status !== 'ENDED' && user && (
              <Button
                onClick={() => registerMutation.mutate()}
                disabled={registerMutation.isPending}
                className="bg-coders-green text-black hover:bg-coders-green/90"
              >
                Register
              </Button>
            )}
            {isRegistered && (
              <span className="flex items-center gap-1.5 text-coders-green text-sm">
                <CheckCircle2 className="w-4 h-4" />Registered
              </span>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="problems">
        <TabsList className="bg-coders-surface border border-coders-border mb-6">
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="problems">
          <div className="space-y-3">
            {contest.problems?.map((cp: { id: string; points: number; order: number; problem: { slug: string; title: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; acceptanceRate: number } }) => (
              <div key={cp.id} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-muted-foreground">{String.fromCharCode(65 + cp.order)}</span>
                  <div>
                    <p className="font-medium">{cp.problem.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <DifficultyBadge difficulty={cp.problem.difficulty} />
                      <span className="text-xs text-muted-foreground">{cp.problem.acceptanceRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-yellow-400">{cp.points} pts</span>
                  {(isRegistered || contest.status === 'ENDED') && (
                    <Button size="sm" variant="outline" className="border-coders-border" asChild>
                      <a href={`/problems/${cp.problem.slug}`}>Solve</a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard">
          <div className="rounded-xl border border-coders-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-coders-border bg-coders-surface/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Rank</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Score</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Penalty</th>
                </tr>
              </thead>
              <tbody>
                {(leaderboard as { rank: number; username: string; score: number; penalty: number }[]).map((entry) => (
                  <tr key={entry.username} className="border-b border-coders-border/50 hover:bg-white/3">
                    <td className="px-4 py-3 text-sm font-bold">
                      {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                    </td>
                    <td className="px-4 py-3 text-sm">{entry.username}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-coders-green">{entry.score}</td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground">{entry.penalty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
