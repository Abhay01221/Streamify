import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { DifficultyBadge } from '@/components/DifficultyBadge';

export default function TagPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['tag', slug],
    queryFn: () => api.get(`/tags/${slug}`).then((r) => r.data),
    enabled: !!slug,
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!data?.tag) return <div className="p-8 text-center text-muted-foreground">Tag not found</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-coders-blue/10 rounded-xl flex items-center justify-center">
          <Tag className="w-5 h-5 text-coders-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{data.tag.name}</h1>
          <p className="text-muted-foreground text-sm">{data.problems?.length} problems</p>
        </div>
      </div>

      <div className="rounded-xl border border-coders-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-coders-border bg-coders-surface/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">#</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Acceptance</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {data.problems?.map((p: { id: string; slug: string; number: number; title: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; acceptanceRate: number }) => (
              <tr key={p.id} className="border-b border-coders-border/50 hover:bg-white/3 transition-colors">
                <td className="px-4 py-3 text-sm text-muted-foreground">{p.number}</td>
                <td className="px-4 py-3">
                  <Link to={`/problems/${p.slug}`} className="text-sm font-medium hover:text-coders-green transition-colors">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{p.acceptanceRate.toFixed(1)}%</td>
                <td className="px-4 py-3"><DifficultyBadge difficulty={p.difficulty} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
