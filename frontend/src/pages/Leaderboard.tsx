import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function LeaderboardPage() {
  const [sortBy, setSortBy] = useState('solved');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', sortBy, page],
    queryFn: () => api.get(`/leaderboard?sortBy=${sortBy}&page=${page}&limit=50`).then((r) => r.data),
  });

  const leaderboard = data?.leaderboard || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-muted-foreground text-sm">Global rankings</p>
          </div>
        </div>

        <Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(1); }}>
          <SelectTrigger className="w-40 bg-coders-surface border-coders-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-coders-surface border-coders-border">
            <SelectItem value="solved">Most Solved</SelectItem>
            <SelectItem value="rating">Contest Rating</SelectItem>
            <SelectItem value="reputation">Reputation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 mb-4">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span>
        <button disabled={page >= (data?.pagination?.totalPages || 1)} onClick={() => setPage(page + 1)}>Next</button>
      </div>
      <div className="rounded-xl border border-coders-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-coders-border bg-coders-surface/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-16">Rank</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Solved</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Rating</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-coders-border/50">
                  <td colSpan={4} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td>
                </tr>
              ))
            ) : leaderboard.map((entry: {
              rank: number; username: string; displayName?: string;
              avatar?: string; country?: string; isPremium: boolean;
              totalSolved: number; contestRating: number;
            }) => (
              <tr key={entry.username} className="border-b border-coders-border/50 hover:bg-white/3 transition-colors">
                <td className="px-4 py-3 text-sm font-bold">
                  {entry.rank === 1 ? <Medal className="w-5 h-5 text-yellow-400" /> :
                   entry.rank === 2 ? <Medal className="w-5 h-5 text-gray-400" /> :
                   entry.rank === 3 ? <Medal className="w-5 h-5 text-amber-600" /> :
                   <span className="text-muted-foreground">#{entry.rank}</span>}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/u/${entry.username}`} className="flex items-center gap-3 hover:text-coders-green transition-colors">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={entry.avatar} />
                      <AvatarFallback className="bg-coders-green text-black text-xs font-bold">
                        {entry.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium text-sm">{entry.displayName || entry.username}</span>
                      {entry.country && <span className="text-xs text-muted-foreground ml-2">{entry.country}</span>}
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-coders-green">{entry.totalSolved}</td>
                <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                  {Math.round(entry.contestRating)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
