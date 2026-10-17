import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Clock, Layers, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface CourseSummary {
  id: string; slug: string; title: string; description: string; difficulty: string;
  estimatedDays: number; problemCount: number; lessonCount: number; moduleCount: number; isPremium: boolean;
  userProgress: null | { completedProblems: number; totalProblems: number; completedLessons: number; totalLessons: number; percentage: number };
}

export default function StudyPlansPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useSearchParams();
  const parsedPage = Number(search.get('page') || 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const { data, isPending, isError, refetch } = useQuery<{ plans: CourseSummary[]; pagination?: { totalPages: number } }>({
    queryKey: ['study-plans', user?.id, page],
    queryFn: () => api.get(`/study-plans?page=${page}&limit=12`).then(r => r.data),
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="p-3 bg-coders-blue/10 rounded-xl"><BookOpen className="w-6 h-6 text-coders-blue" /></div>
        <div><h1 className="text-2xl font-bold">DSA courses</h1><p className="text-muted-foreground text-sm">Learn the concepts, practice in order, and build lasting understanding.</p></div>
        {user?.isAdmin && <Button asChild variant="outline" className="sm:ml-auto"><Link to="/admin/content?tab=courses">Create or edit courses</Link></Button>}
      </div>
      <p className="text-sm text-muted-foreground mb-8 max-w-3xl">Each course combines lessons and practice. Lesson completion records what you have read; CodeForge practice is completed when your submission is accepted.</p>
      {isPending && <p role="status" className="py-12 text-muted-foreground">Loading courses…</p>}
      {isError && <div role="alert" className="glass-card p-6"><p>Courses could not be loaded.</p><Button variant="outline" className="mt-3" onClick={() => refetch()}>Try again</Button></div>}
      {data?.plans.length === 0 && <div className="glass-card p-8 text-muted-foreground"><p>{page === 1 ? 'There are no published courses yet.' : 'There are no courses on this page.'}</p>{page === 1 && <p className="mt-3">{user?.isAdmin ? 'Create a course in the content studio, add modules and lessons, then publish it for learners.' : 'Courses will appear here when the app owner publishes them. You can explore the practice library in the meantime.'}</p>}{page === 1 && <Button asChild variant="outline" className="mt-4"><Link to={user?.isAdmin ? '/admin/content?tab=courses' : '/problems'}>{user?.isAdmin ? 'Open content studio' : 'Browse practice problems'}</Link></Button>}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.plans.map(plan => (
          <article key={plan.id} className="glass-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4"><span className="text-xs text-coders-blue uppercase tracking-wide">{plan.difficulty}</span>{plan.isPremium && <span className="text-xs text-yellow-400">PRO</span>}</div>
            <h2 className="font-bold text-xl mb-2"><Link to={`/study-plan/${plan.slug}`} className="hover:text-coders-blue focus-visible:underline">{plan.title}</Link></h2>
            <p className="text-sm text-muted-foreground mb-5 flex-1">{plan.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-5">
              <span className="flex gap-1.5 items-center"><Layers className="w-3.5 h-3.5" />{plan.moduleCount} modules</span>
              <span className="flex gap-1.5 items-center"><BookOpen className="w-3.5 h-3.5" />{plan.lessonCount} lessons</span>
              <span className="flex gap-1.5 items-center"><Target className="w-3.5 h-3.5" />{plan.problemCount} problems</span>
              <span className="flex gap-1.5 items-center"><Clock className="w-3.5 h-3.5" />{plan.estimatedDays} days</span>
            </div>
            {plan.userProgress && <div className="mb-4 space-y-2"><div className="flex justify-between text-xs"><span>Course progress</span><span>{Math.round(plan.userProgress.percentage)}%</span></div><Progress value={plan.userProgress.percentage} aria-label={`${plan.title} progress`} /><p className="text-xs text-muted-foreground">{plan.userProgress.completedLessons}/{plan.userProgress.totalLessons} lessons · {plan.userProgress.completedProblems}/{plan.userProgress.totalProblems} problems</p></div>}
            <Button asChild variant="outline" className="w-full"><Link to={`/study-plan/${plan.slug}`}>{plan.userProgress ? 'Continue learning' : 'Explore course'}<ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
          </article>
        ))}
      </div>
      {(page > 1 || (data?.pagination?.totalPages || 0) > 1) && <nav aria-label="Course catalog pages" className="flex items-center justify-center gap-4 mt-8"><Button variant="outline" disabled={page <= 1 || isPending} onClick={() => setSearch({ page: String(page - 1) })}>Previous page</Button><span className="text-sm text-muted-foreground">Page {page}{data?.pagination ? ` of ${Math.max(1, data.pagination.totalPages)}` : ''}</span><Button variant="outline" disabled={isPending || page >= (data?.pagination?.totalPages || 1)} onClick={() => setSearch({ page: String(page + 1) })}>Next page</Button></nav>}
    </div>
  );
}
