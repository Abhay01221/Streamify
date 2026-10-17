import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, Clock, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { useToast } from '@/components/ui/use-toast';

interface Lesson {
  id: string; slug: string; title: string; summary: string; content: string; estimatedMinutes: number; order: number; completed: boolean;
  problems: { id: string; slug: string; title: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; solved: boolean }[];
  resources: { title: string; url: string; kind: 'practice' | 'reading' | 'video' }[];
}
interface Course {
  id: string; slug: string; title: string; description: string; isPremium: boolean;
  modules: { id: string; slug: string; title: string; description: string; order: number; lessons: Lesson[] }[];
  userProgress: null | { completedLessons: number; totalLessons: number; completedProblems: number; totalProblems: number; percentage: number };
}

function failureMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
}

export default function CourseDetail() {
  const { id } = useParams();
  const [search, setSearch] = useSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['study-plan', id, user?.id];
  const { data, isPending, isError, error, refetch } = useQuery<{ plan: Course }>({
    queryKey, queryFn: () => api.get(`/study-plans/${id}`).then(r => r.data),
  });
  const plan = data?.plan;
  const modules = [...(plan?.modules || [])].sort((a, b) => a.order - b.order);
  const lessons = modules.flatMap(module => [...module.lessons].sort((a, b) => a.order - b.order));
  const nextIncomplete = lessons.find(lesson => !lesson.completed || lesson.problems.some(problem => !problem.solved)) || lessons[0];
  const requestedLesson = search.get('lesson');
  const legacyMatches = lessons.filter(item => item.slug === requestedLesson);
  const lesson = lessons.find(item => item.id === requestedLesson) || (legacyMatches.length === 1 ? legacyMatches[0] : undefined) || nextIncomplete;
  const currentIndex = lessons.findIndex(item => item.id === lesson?.id);
  const currentModule = modules.find(module => module.lessons.some(item => item.id === lesson?.id));
  const selectLesson = (lessonId: string) => { setSearch({ lesson: lessonId }); };
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ['study-plans'] }),
    ]);
  };
  const enroll = useMutation({
    mutationFn: () => api.post(`/study-plans/${plan?.id}/enroll`),
    onSuccess: async () => { await refresh(); toast({ title: 'You are enrolled. Start with the first lesson.' }); },
    onError: error => toast({ title: failureMessage(error, 'Could not enroll in this course.'), variant: 'destructive' }),
  });
  const complete = useMutation({
    mutationFn: ({ lessonId, completed }: { lessonId: string; completed: boolean }) => api.put(`/study-plans/${plan?.id}/lessons/${lessonId}/completion`, { completed }),
    onSuccess: refresh,
    onError: error => toast({ title: failureMessage(error, 'Could not save lesson progress.'), variant: 'destructive' }),
  });

  if (isPending) return <div className="container mx-auto px-4 py-12" role="status">Loading course…</div>;
  if (isError || !plan) return <div className="container mx-auto px-4 py-12"><Link to="/study-plan" className="text-coders-blue">← All courses</Link><p role="alert" className="mt-6">{failureMessage(error, 'This course could not be loaded.')}</p><Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button></div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <Link to="/study-plan" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" />All courses</Link>
      <header className="py-6 border-b border-coders-border mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="max-w-3xl"><p className="text-coders-blue text-xs uppercase tracking-wider mb-2">Structured DSA course{plan.isPremium ? ' · Pro' : ''}</p><h1 className="text-2xl md:text-3xl font-bold">{plan.title}</h1><p className="text-muted-foreground mt-3">{plan.description}</p></div>
          {!user ? <Button asChild><Link to="/login">Sign in to enroll</Link></Button> : !plan.userProgress ? <Button onClick={() => enroll.mutate()} disabled={enroll.isPending}>{enroll.isPending ? 'Enrolling…' : 'Enroll in course'}</Button> : nextIncomplete && <Button variant="outline" onClick={() => selectLesson(nextIncomplete.id)}>{plan.userProgress.percentage >= 100 ? 'Review course' : 'Resume learning'}<ArrowRight className="ml-2 w-4 h-4" /></Button>}
        </div>
        {plan.userProgress && <div className="max-w-xl mt-5 space-y-2"><div className="flex justify-between text-sm"><span>{plan.userProgress.completedLessons}/{plan.userProgress.totalLessons} lessons read · {plan.userProgress.completedProblems}/{plan.userProgress.totalProblems} problems solved</span><span>{Math.round(plan.userProgress.percentage)}%</span></div><Progress value={plan.userProgress.percentage} aria-label="Course progress" /></div>}
      </header>
      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
        <aside className="glass-card p-4 max-h-[400px] overflow-auto lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]" aria-label="Course lessons">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" />Course contents</h2>
          {modules.map((module, index) => <details key={`${module.id}-${currentModule?.id}`} open={module.id === currentModule?.id} className="border-t border-coders-border py-3">
            <summary className="cursor-pointer text-sm font-medium focus-visible:outline-coders-blue">{index + 1}. {module.title.replace(/^\d+\.\s*/, '')}<span className="block text-xs text-muted-foreground mt-1 ml-4">{module.lessons.filter(item => item.completed).length}/{module.lessons.length} lessons read</span></summary>
            <ol className="mt-3 space-y-1">{[...module.lessons].sort((a, b) => a.order - b.order).map(item => <li key={item.id}><button onClick={() => selectLesson(item.id)} aria-current={item.id === lesson?.id ? 'step' : undefined} className={`w-full flex items-start text-left gap-2 rounded-md p-2 text-sm ${item.id === lesson?.id ? 'bg-coders-blue/15 text-coders-blue' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}>{item.completed ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-coders-green" aria-label="Read" /> : <Circle className="w-4 h-4 shrink-0 mt-0.5" />}<span>{item.title}</span></button></li>)}</ol>
          </details>)}
        </aside>
        {lesson ? <main className="glass-card p-5 md:p-8 min-w-0" aria-label="Lesson">
          <p className="text-xs text-coders-blue mb-2">{currentModule?.title} · Lesson {currentIndex + 1} of {lessons.length}</p>
          <h2 className="text-2xl font-bold">{lesson.title}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3"><Clock className="w-3.5 h-3.5" />About {lesson.estimatedMinutes} minutes{lesson.completed && <span className="text-coders-green ml-3">✓ Read</span>}</div>
          {lesson.summary && <p className="text-muted-foreground mt-5">{lesson.summary}</p>}
          <div className="prose prose-invert max-w-none mt-7 text-sm leading-7 break-words [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h3]:font-semibold [&_h3]:mt-4 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:bg-black/30 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:text-coders-blue [&_a]:text-coders-blue [&_a]:underline"><ReactMarkdown>{lesson.content}</ReactMarkdown></div>
          {lesson.problems.length > 0 && <section className="border-t border-coders-border mt-8 pt-6"><h3 className="font-semibold">Practice on CodeForge</h3><p className="text-xs text-muted-foreground mt-1 mb-3">An accepted submission completes each problem automatically.</p><ul className="space-y-2">{lesson.problems.map(problem => <li key={problem.id}><Link to={`/problems/${problem.slug}`} className="flex items-center gap-3 border border-coders-border rounded-lg p-3 hover:border-coders-blue/50">{problem.solved ? <CheckCircle2 className="w-4 h-4 text-coders-green" aria-label="Solved" /> : <Circle className="w-4 h-4 text-muted-foreground" />}<span className="flex-1 text-sm">{problem.title}</span><DifficultyBadge difficulty={problem.difficulty} /><ArrowRight className="w-4 h-4" /></Link></li>)}</ul></section>}
          {lesson.resources.length > 0 && <section className="border-t border-coders-border mt-7 pt-6"><h3 className="font-semibold">Further practice and reading</h3><p className="text-xs text-muted-foreground mt-1 mb-3">These links open external sites. External practice is not verified or counted as a CodeForge solve.</p><ul className="space-y-2">{lesson.resources.filter(resource => /^https?:\/\//i.test(resource.url)).map((resource, index) => <li key={`${resource.url}-${index}`}><a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-coders-blue hover:underline"><ExternalLink className="w-3.5 h-3.5 shrink-0" /><span>{resource.title}</span><span className="text-xs text-muted-foreground">({resource.kind}, external)</span></a></li>)}</ul></section>}
          <div className="border-t border-coders-border mt-8 pt-6 space-y-4">
            {plan.userProgress ? <Button variant={lesson.completed ? 'outline' : 'default'} disabled={complete.isPending} onClick={() => complete.mutate({ lessonId: lesson.id, completed: !lesson.completed })}>{complete.isPending ? 'Saving…' : lesson.completed ? 'Mark as unread' : 'Mark lesson as read'}</Button> : <p className="text-sm text-muted-foreground">Enroll to save your reading progress.</p>}
            <div className="flex justify-between gap-3"><Button variant="ghost" disabled={currentIndex <= 0} onClick={() => selectLesson(lessons[currentIndex - 1].id)}><ArrowLeft className="w-4 h-4 mr-2" />Previous</Button><Button variant="outline" disabled={currentIndex === lessons.length - 1} onClick={() => selectLesson(lessons[currentIndex + 1].id)}>Next lesson<ArrowRight className="w-4 h-4 ml-2" /></Button></div>
          </div>
        </main> : <main className="glass-card p-8 text-muted-foreground">Lessons will appear here when they are added to this course.</main>}
      </div>
    </div>
  );
}
