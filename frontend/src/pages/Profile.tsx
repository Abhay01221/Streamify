import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Flame, MapPin, Globe, Github, Linkedin, Trophy, Code2, Star, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => api.get(`/users/${username}`).then((r) => r.data),
    enabled: !!username,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['heatmap', username],
    queryFn: () => api.get(`/users/${username}/heatmap`).then((r) => r.data),
    enabled: !!username,
  });

  const { data: statsData } = useQuery({
    queryKey: ['user-stats', username],
    queryFn: () => api.get(`/users/${username}/stats`).then((r) => r.data),
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex gap-6">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return <div className="p-8 text-center text-muted-foreground">User not found</div>;

  const stats = statsData?.stats || profile.stats;
  const streak = profile.streak;
  const totalSolved = stats?.totalSolved || 0;
  const totalProblems = stats?.totalProblems || 0;

  // Generate heatmap grid (52 weeks x 7 days)
  const today = new Date();
  const heatmap = heatmapData?.heatmap || {};

  const getHeatmapLevel = (count: number) => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
  };

  const weeks: { date: string; count: number }[][] = [];
  for (let w = 51; w >= 0; w--) {
    const week: { date: string; count: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + d));
      const dateStr = date.toISOString().split('T')[0];
      week.push({ date: dateStr, count: heatmap[dateStr] || 0 });
    }
    weeks.push(week);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Profile header */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex flex-col items-center md:items-start gap-4">
          <Avatar className="w-24 h-24 border-2 border-coders-border">
            <AvatarImage src={profile.profile?.avatarUrl} />
            <AvatarFallback className="bg-coders-green text-black text-3xl font-bold">
              {profile.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{profile.profile?.displayName || profile.username}</h1>
            {profile.isPremium && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">PRO</Badge>
            )}
          </div>
          <p className="text-muted-foreground mb-3">@{profile.username}</p>

          {profile.profile?.bio && (
            <p className="text-sm mb-3 max-w-lg">{profile.profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {profile.profile?.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.profile.location}</span>
            )}
            {profile.profile?.website && (
              <a href={profile.profile.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground">
                <Globe className="w-3.5 h-3.5" />{profile.profile.website}
              </a>
            )}
            {profile.profile?.githubUrl && (
              <a href={profile.profile.githubUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground">
                <Github className="w-3.5 h-3.5" />GitHub
              </a>
            )}
          </div>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center gap-1 bg-coders-surface border border-coders-border rounded-xl p-4 min-w-[120px]">
          <Flame className="w-8 h-8 text-coders-orange" />
          <span className="text-3xl font-bold">{streak?.currentStreak || 0}</span>
          <span className="text-xs text-muted-foreground">day streak</span>
          <span className="text-xs text-muted-foreground">Best: {streak?.longestStreak || 0}</span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Solved', value: totalSolved, icon: Code2, color: 'text-coders-green' },
          { label: 'Submissions', value: stats?.totalSubmissions || 0, icon: Trophy, color: 'text-yellow-400' },
          { label: 'Acceptance', value: (stats?.acceptanceRate || 0).toFixed(1) + '%', icon: Star, color: 'text-coders-blue' },
          { label: 'Active Days', value: streak?.totalActiveDays || 0, icon: Calendar, color: 'text-coders-purple' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Solved breakdown */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-semibold mb-4">Problems Solved</h2>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2d3148" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#00b894" strokeWidth="3"
                strokeDasharray={`${(totalProblems ? totalSolved / totalProblems * 100 : 0)} 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold">{totalSolved}</span>
              <span className="text-xs text-muted-foreground">/{totalProblems}</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {[
              { label: 'Easy', count: stats?.easySolved || 0, total: stats?.problemTotals?.EASY || 0, color: 'bg-green-500' },
              { label: 'Medium', count: stats?.mediumSolved || 0, total: stats?.problemTotals?.MEDIUM || 0, color: 'bg-yellow-500' },
              { label: 'Hard', count: stats?.hardSolved || 0, total: stats?.problemTotals?.HARD || 0, color: 'bg-red-500' },
            ].map((d) => (
              <div key={d.label} className="flex items-center gap-3">
                <span className="text-sm w-14">{d.label}</span>
                <div className="flex-1 bg-coders-border rounded-full h-2">
                  <div className={`${d.color} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.min((d.total ? d.count / d.total * 100 : 0), 100)}%` }} />
                </div>
                <span className="text-sm text-muted-foreground w-16 text-right">{d.count}/{d.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-semibold mb-4">Activity</h2>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} solved`}
                    className={`w-3 h-3 rounded-sm heatmap-${getHeatmapLevel(day.count)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <div key={l} className={`w-3 h-3 rounded-sm heatmap-${l}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Badges */}
      {profile.badges?.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">Badges</h2>
          <div className="flex flex-wrap gap-3">
            {profile.badges.map((badge: { id: string; badgeName: string; badgeIcon: string; earnedAt: string }) => (
              <div key={badge.id} title={badge.badgeName}
                className="flex flex-col items-center gap-1 p-3 bg-coders-surface border border-coders-border rounded-xl">
                <span className="text-2xl">{badge.badgeIcon}</span>
                <span className="text-xs text-muted-foreground">{badge.badgeName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <section className="glass-card p-6 mt-6 space-y-3"><h2 className="font-semibold">Recent submissions</h2>
        {statsData?.recentSubmissions?.map((sub: { id: string; status: string; createdAt: string; problem: { title: string; slug: string } }) =>
          <div key={sub.id} className="flex gap-3 text-sm"><Link to={`/problems/${sub.problem.slug}`}>{sub.problem.title}</Link><span>{sub.status}</span><time>{new Date(sub.createdAt).toLocaleString()}</time></div>)}
        {!statsData?.recentSubmissions?.length && <p className="text-sm text-muted-foreground">No submissions yet</p>}
        {profile.isOwn && <Link to="/submissions" className="text-coders-green">View full history and source code</Link>}
      </section>
      <section className="glass-card p-6 mt-6"><h2 className="font-semibold mb-3">Frequently attempted topics</h2>
        {stats?.topics?.map((topic: { name: string; attempts: number }) => <p key={topic.name}>{topic.name}: {topic.attempts}</p>)}
        {!stats?.topics?.length && <p className="text-sm text-muted-foreground">Solve a problem to start tracking topics</p>}
      </section>
    </div>
  );
}
