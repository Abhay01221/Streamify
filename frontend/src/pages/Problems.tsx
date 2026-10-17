import { useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Shuffle, Lock, CheckCircle2, Circle, Clock, X, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
const STATUSES = ['todo', 'attempted', 'solved'] as const;

export default function ProblemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const search = searchParams.get('search') || '';
  const difficulty = searchParams.get('difficulty') || '';
  const selectedDifficulties = useMemo(() => DIFFICULTIES.some(value => value === difficulty) ? [difficulty] : [], [difficulty]);
  const status = searchParams.get('status') || '';
  const selectedStatus = user && STATUSES.some(value => value === status) ? status : '';
  const tagQuery = searchParams.get('tags') || '';
  const selectedTags = useMemo(() => tagQuery.split(',').filter(Boolean), [tagQuery]);
  const requestedPage = Number(searchParams.get('page') || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedSort = searchParams.get('sortBy') || 'number';
  const sortBy = ['number', 'title', 'difficulty', 'acceptance', 'frequency'].includes(requestedSort) ? requestedSort : 'number';
  const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
  const [randomError, setRandomError] = useState('');

  const updateQuery = (updates: Record<string, string | null>, resetPage = true) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      Object.entries(updates).forEach(([name, value]) => value ? next.set(name, value) : next.delete(name));
      if (resetPage) next.delete('page');
      return next;
    }, { replace: true });
  };
  const setSearch = (value: string) => updateQuery({ search: value });
  const setSelectedStatus = (value: string) => updateQuery({ status: value });
  const setPage = (value: number | ((previous: number) => number)) => updateQuery({ page: String(typeof value === 'function' ? value(page) : value) }, false);
  const clearFilters = () => updateQuery({ search: null, difficulty: null, status: null, tags: null });

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (search) params.set('search', search);
    if (selectedDifficulties.length === 1) params.set('difficulty', selectedDifficulties[0]);
    if (selectedStatus) params.set('status', selectedStatus);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    return params.toString();
  }, [page, search, selectedDifficulties, selectedStatus, selectedTags, sortBy, sortOrder]);

  interface ProblemsResponse {
    catalogTotal?: number;
    problems: {
      id: string; slug: string; number: number; title: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD'; acceptanceRate: number; totalSubmissions: number;
      isPremium: boolean; userStatus: string | null;
      tags: { name: string; slug: string }[];
    }[];
    pagination: {
      page: number; limit: number; total: number; totalPages: number;
    };
  }

  const { data, isLoading, isPlaceholderData, isError, refetch } = useQuery<ProblemsResponse>({
    queryKey: ['problems', user?.id || 'visitor', buildQuery()],
    queryFn: () => api.get(`/problems?${buildQuery()}`).then((r) => r.data),
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === (user?.id || 'visitor') ? previous : undefined,
  });

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get('/tags').then((r) => r.data),
  });

  const handleRandom = async () => {
    setRandomError('');
    try {
      const res = await api.get('/problems/random');
      navigate(`/problems/${res.data.slug}`);
    } catch {
      setRandomError('Could not pick a problem. Please try again.');
    }
  };

  const toggleDifficulty = (d: string) => {
    updateQuery({ difficulty: selectedDifficulties.includes(d) ? null : d });
  };

  const toggleTag = (slug: string) => {
    updateQuery({ tags: (selectedTags.includes(slug) ? selectedTags.filter(value => value !== slug) : [...selectedTags, slug]).join(',') });
  };

  const handleSort = (col: string) => {
    updateQuery({ sortBy: col, sortOrder: sortBy === col && sortOrder === 'asc' ? 'desc' : 'asc' });
  };

  const problems = data?.problems || [];
  const pagination = data?.pagination;
  const catalogTotal = data?.catalogTotal ?? pagination?.total;
  const hasFilters = Boolean(search || selectedDifficulties.length || selectedStatus || selectedTags.length);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Practice problems</h1><p className="mt-1 text-sm text-muted-foreground">Browse all topics or follow a <Link to="/study-plan" className="text-coders-blue underline">DSA course</Link> for an ordered path.</p></div>
        {user?.isAdmin && <div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link to="/admin/problems/new"><Plus className="mr-2 h-4 w-4" />Add a problem</Link></Button><Button asChild variant="outline" size="sm"><Link to="/admin/content">Import problems</Link></Button></div>}
      </div>
      {isError && <p role="alert">Could not load problems. <button onClick={() => refetch()}>Retry</button></p>}
      {randomError && <p role="alert" className="mb-4 text-red-400">{randomError}</p>}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar filters */}
        <aside className="lg:w-56 shrink-0 space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Difficulty</h3>
            <div className="space-y-1">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDifficulty(d)}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                    selectedDifficulties.includes(d)
                      ? d === 'EASY' ? 'bg-green-500/20 text-green-400'
                        : d === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                      : 'text-muted-foreground hover:bg-white/5'
                  }`}
                >
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {user && (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Status</h3>
              <div className="space-y-1">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedStatus(selectedStatus === s ? '' : s)}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      selectedStatus === s ? 'bg-coders-green/20 text-coders-green' : 'text-muted-foreground hover:bg-white/5'
                    }`}
                  >
                    {s === 'solved' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                     s === 'attempted' ? <Clock className="w-3.5 h-3.5" /> :
                     <Circle className="w-3.5 h-3.5" />}
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Topics</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {tagsData?.tags?.map((tag: { slug: string; name: string; problemCount: number }) => (
                <button
                  key={tag.slug}
                  onClick={() => toggleTag(tag.slug)}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between ${
                    selectedTags.includes(tag.slug) ? 'bg-coders-blue/20 text-coders-blue' : 'text-muted-foreground hover:bg-white/5'
                  }`}
                >
                  <span>{tag.name}</span>
                  <span className="text-xs opacity-60">{tag.problemCount}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search problems"
                placeholder="Search problems…"
                className="pl-9 bg-coders-surface border-coders-border"
              />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleRandom} disabled={catalogTotal === 0} className="border-coders-border shrink-0">
              <Shuffle className="w-4 h-4 mr-2" />Pick One
            </Button>
          </div>

          {/* Active filters */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>{isPlaceholderData ? 'Updating results…' : catalogTotal !== undefined ? hasFilters ? `${pagination?.total || 0} of ${catalogTotal} problems match your filters` : `${catalogTotal} problems available` : 'Loading problem catalog…'} <span className="text-xs">20 per page</span></p>
            {hasFilters && <Button size="sm" variant="outline" onClick={clearFilters}>Clear all filters</Button>}
          </div>
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedDifficulties.map((d) => (
                <span key={d} className="flex items-center gap-1 text-xs bg-white/5 border border-coders-border rounded-full px-2 py-1">
                  {d} <button aria-label={`Remove ${d.toLowerCase()} filter`} onClick={() => toggleDifficulty(d)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {selectedStatus && (
                <span className="flex items-center gap-1 text-xs bg-white/5 border border-coders-border rounded-full px-2 py-1">
                  {selectedStatus} <button aria-label="Remove status filter" onClick={() => setSelectedStatus('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedTags.map((t) => (
                <span key={t} className="flex items-center gap-1 text-xs bg-white/5 border border-coders-border rounded-full px-2 py-1">
                  {t} <button aria-label={`Remove ${t} topic filter`} onClick={() => toggleTag(t)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl border border-coders-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-coders-border bg-coders-surface/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-8">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('number')}>#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('title')}>Title</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground hidden md:table-cell"
                    onClick={() => handleSort('acceptance')}>Acceptance</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('difficulty')}>Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {isLoading || isPlaceholderData ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-coders-border/50">
                      <td colSpan={5} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : problems.length === 0 && !isError ? <tr><td colSpan={5} className="p-8 text-center text-muted-foreground"><p>{catalogTotal === 0 ? 'There are no published problems yet.' : hasFilters ? 'No problems match your filters. Clear them to see the full catalog.' : 'There are no problems on this page.'}</p>{catalogTotal === 0 && user?.isAdmin && <p className="mt-3">Use Add a problem or Import problems above to publish your first questions.</p>}{catalogTotal === 0 && !user?.isAdmin && <p className="mt-3">The app owner can publish questions for practice.</p>}{page > 1 && <Button variant="outline" size="sm" className="mt-3" onClick={() => setPage(1)}>Go to first page</Button>}</td></tr> : problems.map((p) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-coders-border/50 hover:bg-white/3 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      {p.userStatus === 'solved' ? (
                        <CheckCircle2 className="w-4 h-4 text-coders-green" />
                      ) : p.userStatus === 'attempted' ? (
                        <Clock className="w-4 h-4 text-coders-orange" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/30" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.number}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.isPremium && <Lock className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                        <Link
                          to={`/problems/${p.slug}`}
                          className="text-sm font-medium hover:text-coders-green transition-colors"
                        >
                          {p.title}
                        </Link>
                        <div className="hidden group-hover:flex gap-1 ml-2">
                          {p.tags?.slice(0, 2).map((tag) => (
                            <span key={tag.slug} className="text-[10px] bg-white/5 border border-coders-border rounded px-1.5 py-0.5 text-muted-foreground">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {p.totalSubmissions ? p.acceptanceRate.toFixed(1) + '%' : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <DifficultyBadge difficulty={p.difficulty} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Showing {problems.length ? (pagination.page - 1) * pagination.limit + 1 : 0}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="border-coders-border">Previous</Button>
                <span className="text-sm">Page {page} of {Math.max(1, pagination.totalPages)}</span>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}
                  className="border-coders-border">Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
