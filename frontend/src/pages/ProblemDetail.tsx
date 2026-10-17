import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import confetti from 'canvas-confetti';
import {
  Play, Send, RotateCcw, Settings2, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, Cpu, Copy, Plus, Trash2,
  BookOpen, MessageSquare, Code2, History, FileText, Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useEditorStore } from '@/store/editorStore';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { AITutor } from '@/components/AITutor';

const LANGUAGES = [{ value: 'python', label: 'Python 3' }];

interface TestResult {
  isHidden?: boolean;
  testCaseId?: string;
  passed: boolean;
  actualOutput?: string;
  expectedOutput?: string;
  runtime: number;
  memory: number;
  errorMessage?: string;
}

interface SubmissionResult {
  submissionId: string;
  status: string;
  isRun?: boolean;
  runtime?: number;
  memory?: number;
  runtimePercentile?: number;
  memoryPercentile?: number;
  testResults?: TestResult[];
  error?: string;
}

export default function ProblemDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const { settings, getCode, setCode, resetCode } = useEditorStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const editorReady = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout>>();
  const [editorFallback, setEditorFallback] = useState(false);
  useEffect(() => { const timer = setTimeout(() => { if (!editorReady.current) setEditorFallback(true); }, 15000); return () => { clearTimeout(timer); clearTimeout(pollTimer.current); }; }, []);

  const [language, setLanguage] = useState('python');
  const [activeTab, setActiveTab] = useState('description');
  const [testTab, setTestTab] = useState('testcase');
  const [customInput, setCustomInput] = useState('');
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [leftWidth, setLeftWidth] = useState(40);
  const [rightWidth, setRightWidth] = useState(30);
  const [bookmarked, setBookmarked] = useState(false);
  const [firstAC, setFirstAC] = useState(false);
  const resizingRef = useRef<'left' | 'right' | null>(null);

  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', slug],
    queryFn: () => api.get(`/problems/${slug}`).then((r) => r.data),
    enabled: !!slug,
  });

  const { data: submissionsData } = useQuery({
    queryKey: ['submissions', slug],
    queryFn: () => api.get(`/problems/${slug}/submissions`).then((r) => r.data),
    enabled: !!slug && !!user,
  });

  useEffect(() => {
    if (user) api.get('/problems/bookmarks').then(({ data }) => setBookmarked(data.bookmarks.some((b: { problem: { slug: string } }) => b.problem.slug === slug))).catch(() => {});
  }, [user, slug]);
  // Get starter code for current language
  const starterCode = problem?.starterCode?.find((s: { language: string; code: string }) => s.language === language)?.code || '';
  const savedCode = getCode(slug || '', language);
  const code = savedCode ?? starterCode;

  // Auto-save
  useEffect(() => {
    if (!settings.autoSave || !slug) return;
    const timer = setTimeout(() => {
      if (code) setCode(slug, language, code);
    }, 30000);
    return () => clearTimeout(timer);
  }, [code, slug, language, settings.autoSave, setCode]);

  // Shared result handler — defined BEFORE the useEffect that references it
  const handleResult = useCallback((result: SubmissionResult) => {
    setSubmissionResult(result);
    setIsSubmitting(false);
    setIsRunning(false);
    setTestTab('result');
    void queryClient.invalidateQueries({ queryKey: ['submissions', slug] });
    void queryClient.invalidateQueries({ queryKey: ['problems'] });

    if (result.status === 'ACCEPTED' && !result.isRun && !firstAC) {
      setFirstAC(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      toast({ title: '🎉 Accepted!', description: 'Great job! Your solution passed all test cases.' });
    } else if (result.status !== 'ACCEPTED' && result.status !== 'PENDING' && result.status !== 'RUNNING') {
      toast({ title: 'Submission failed', description: result.status.replace(/_/g, ' '), variant: 'destructive' });
    }
  }, [firstAC, toast, queryClient, slug]);

  const handleSubmit = useCallback(async (isRun = false) => {
    if (!user) { toast({ title: 'Sign in required', variant: 'destructive' }); return; }
    if (!code.trim()) { toast({ title: 'Write some code first', variant: 'destructive' }); return; }

    if (isRun) setIsRunning(true);
    else setIsSubmitting(true);

    setSubmissionResult(null);

    try {
      const res = await api.post('/submissions', {
        problemSlug: slug,
        language,
        code,
        isRun,
        customInput: isRun ? customInput : undefined,
      });

      const { submissionId } = res.data;

      let attempts = 0;
      const poll = async () => {
        if (++attempts > 150) {
          setIsSubmitting(false); setIsRunning(false);
          toast({ title: 'Still processing', description: 'Check your submission history for the final result.' }); return;
        }
        try {
          const { data } = await api.get(`/submissions/${submissionId}`);
          if (!['PENDING', 'RUNNING'].includes(data.status)) { handleResult({ ...data, submissionId }); return; }
        } catch { /* retry transient read failures */ }
        pollTimer.current = setTimeout(poll, Math.min(1000 * Math.pow(1.25, attempts), 10000));
      };
      pollTimer.current = setTimeout(poll, 1000);

    } catch (err: unknown) {
      setIsRunning(false);
      setIsSubmitting(false);
      const message = err instanceof Error ? err.message : 'Submission failed';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  }, [user, code, slug, language, customInput, toast, handleResult]);

  const handleReset = () => {
    if (code !== starterCode && !window.confirm('Discard your draft and restore starter code?')) return;
    if (slug) resetCode(slug, language);
    toast({ title: 'Code reset to default' });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Code copied!' });
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-56px)] flex">
        <div className="w-2/5 p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="flex-1 bg-coders-surface" />
      </div>
    );
  }

  if (!problem) return <div className="p-8 text-center text-muted-foreground">Problem not found</div>;

  const centerWidth = 100 - leftWidth - rightWidth;

  return (
    <div className="min-h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)] flex flex-col lg:flex-row lg:overflow-hidden">
      {/* Left Panel - Problem Description */}
      <div style={{ width: `${leftWidth}%` }} className="!w-full lg:!w-[40%] min-h-[320px] flex flex-col border-r border-coders-border overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="border-b border-coders-border px-2 pt-2 shrink-0">
            <TabsList className="bg-transparent h-8 gap-1">
              <TabsTrigger value="description" className="text-xs h-7 data-[state=active]:bg-coders-surface">
                <FileText className="w-3 h-3 mr-1" />Description
              </TabsTrigger>
              <TabsTrigger value="editorial" className="text-xs h-7 data-[state=active]:bg-coders-surface">
                <BookOpen className="w-3 h-3 mr-1" />Editorial
              </TabsTrigger>
              <TabsTrigger value="solutions" className="text-xs h-7 data-[state=active]:bg-coders-surface">
                <Code2 className="w-3 h-3 mr-1" />Solutions
              </TabsTrigger>
              <TabsTrigger value="submissions" className="text-xs h-7 data-[state=active]:bg-coders-surface">
                <History className="w-3 h-3 mr-1" />Submissions
              </TabsTrigger>
              <TabsTrigger value="discuss" className="text-xs h-7 data-[state=active]:bg-coders-surface">
                <MessageSquare className="w-3 h-3 mr-1" />Discuss
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="description" className="p-4 m-0 h-full">
              {user && <button className="text-sm mb-3 text-coders-green" onClick={async () => {
                try { if (bookmarked) await api.delete(`/problems/${slug}/bookmark`); else await api.put(`/problems/${slug}/bookmark`); setBookmarked(!bookmarked); }
                catch { toast({ title: 'Could not update bookmark', variant: 'destructive' }); }
              }}>{bookmarked ? 'Remove bookmark' : 'Bookmark problem'}</button>}
              <DescriptionTab problem={problem} />
            </TabsContent>
            <TabsContent value="editorial" className="p-4 m-0">
              <EditorialTab slug={slug!} isPremium={user?.isPremium} />
            </TabsContent>
            <TabsContent value="solutions" className="p-4 m-0">
              <SolutionsTab slug={slug!} />
            </TabsContent>
            <TabsContent value="submissions" className="p-4 m-0">
              <Link className="text-coders-green text-sm" to="/submissions">View all submissions and source code</Link>
              <SubmissionsTab submissions={submissionsData?.submissions || []} />
            </TabsContent>
            <TabsContent value="discuss" className="p-4 m-0">
              <DiscussTab slug={slug!} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Resize handle left */}
      <div
        className="resize-handle hidden lg:block"
        onMouseDown={() => { resizingRef.current = 'left'; }}
      />

      {/* Center Panel - Code Editor */}
      <div style={{ width: `${centerWidth}%` }} className="!w-full lg:!w-[35%] min-h-[480px] flex flex-col overflow-hidden">
        {/* Editor toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-coders-border bg-coders-surface shrink-0">
          <Select value={language} onValueChange={(v) => { setLanguage(v); }}>
            <SelectTrigger className="w-36 h-7 text-xs bg-transparent border-coders-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-coders-surface border-coders-border">
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTestTab('tutor')}>Ask AI</Button>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleCopy} title="Copy code">
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleReset} title="Reset code">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <button className="text-xs p-1 text-muted-foreground" onClick={() => setEditorFallback(v => !v)}>{editorFallback ? 'Use Monaco editor' : 'Use text editor'}</button>
        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          {editorFallback ? <textarea aria-label="Code editor" className="w-full h-full bg-coders-surface p-3 font-mono text-sm" value={code}
            onChange={e => slug && setCode(slug, language, e.target.value)} /> : <Editor
            onMount={() => { editorReady.current = true; setEditorFallback(false); }}
            loading={<button className="p-4" onClick={() => setEditorFallback(true)}>Editor loading… Use text editor</button>}
            height="100%"
            language={language === 'cpp' ? 'cpp' : language === 'csharp' ? 'csharp' : language}
            value={code}
            onChange={(val) => { if (val !== undefined && slug) setCode(slug, language, val); }}
            theme="vs-dark"
            options={{
              fontSize: settings.fontSize,
              tabSize: settings.tabSize,
              minimap: { enabled: settings.minimap },
              wordWrap: settings.wordWrap ? 'on' : 'off',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12 },
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              bracketPairColorization: { enabled: true },
            }}
          />}
        </div>

        {/* Submit bar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-coders-border bg-coders-surface shrink-0">
          <div className="text-xs text-muted-foreground">
            {settings.autoSave && <span>Auto-save on</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={isRunning || isSubmitting}
              className="border-coders-border text-xs h-8"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
              Run
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={isRunning || isSubmitting}
              className="bg-coders-green text-black hover:bg-coders-green/90 text-xs h-8"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Submit
            </Button>
          </div>
        </div>
      </div>

      {/* Resize handle right */}
      <div className="resize-handle hidden lg:block" onMouseDown={() => { resizingRef.current = 'right'; }} />

      {/* Right Panel - Test Results */}
      <div style={{ width: `${rightWidth}%` }} className="!w-full lg:!w-[25%] min-h-[300px] flex flex-col border-l border-coders-border overflow-hidden">
        <Tabs value={testTab} onValueChange={setTestTab} className="flex flex-col h-full">
          <div className="border-b border-coders-border px-2 pt-2 shrink-0">
            <TabsList className="bg-transparent h-8 gap-1">
              <TabsTrigger value="testcase" className="text-xs h-7 data-[state=active]:bg-coders-surface">Testcase</TabsTrigger>
              <TabsTrigger value="result" className="text-xs h-7 data-[state=active]:bg-coders-surface">Result</TabsTrigger>
              <TabsTrigger value="tutor" className="text-xs h-7 data-[state=active]:bg-coders-surface">AI tutor</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="testcase" className="p-3 m-0">
              <TestCasePanel
                testCases={problem.testCases || []}
                customInput={customInput}
                onCustomInputChange={setCustomInput}
              />
            </TabsContent>
            <TabsContent value="result" className="p-3 m-0">
              <ResultPanel result={submissionResult} isLoading={isSubmitting || isRunning} />
            </TabsContent>
            <TabsContent value="tutor" forceMount className="p-3 m-0 data-[state=inactive]:hidden">
              <AITutor problemSlug={slug!} code={code} submissionId={submissionResult?.submissionId} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// Sub-components
function DescriptionTab({ problem }: { problem: Record<string, unknown> }) {
  const p = problem as {
    number: number; title: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    acceptanceRate: number; totalSubmissions: number; description: string;
    examples: { id: string; inputText: string; outputText: string; explanation?: string }[];
    constraints: { id: string; text: string }[];
    tags: { slug: string; name: string }[];
    companies: { slug: string; name: string }[];
    hints: string[];
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-muted-foreground text-sm">#{p.number}</span>
          <DifficultyBadge difficulty={p.difficulty} />
          <span className="text-xs text-muted-foreground ml-auto">
            {p.acceptanceRate?.toFixed(1)}% acceptance
          </span>
        </div>
        <h1 className="text-xl font-bold mb-3">{p.title}</h1>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {p.tags?.map((tag) => (
            <Link key={tag.slug} to={`/tag/${tag.slug}`}
              className="text-xs bg-white/5 border border-coders-border rounded px-2 py-0.5 text-muted-foreground hover:text-foreground hover:border-coders-green/50 transition-colors">
              {tag.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {p.description}
        </ReactMarkdown>
      </div>

      {p.examples?.map((ex, i) => (
        <div key={ex.id} className="bg-coders-surface rounded-lg p-3 border border-coders-border">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Example {i + 1}</div>
          <div className="font-mono text-xs space-y-1">
            <div><span className="text-muted-foreground">Input: </span>{ex.inputText}</div>
            <div><span className="text-muted-foreground">Output: </span>{ex.outputText}</div>
            {ex.explanation && <div className="text-muted-foreground mt-1">{ex.explanation}</div>}
          </div>
        </div>
      ))}

      {p.constraints?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Constraints:</h3>
          <ul className="space-y-1">
            {p.constraints.map((c) => (
              <li key={c.id} className="text-sm text-muted-foreground font-mono flex items-start gap-2">
                <span className="text-coders-green mt-0.5">•</span>{c.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EditorialTab({ slug, isPremium }: { slug: string; isPremium?: boolean }) {
  const { data } = useQuery({
    queryKey: ['editorial', slug],
    queryFn: () => api.get(`/problems/${slug}/editorial`).then((r) => r.data),
  });

  if (!data) return <Skeleton className="h-64 w-full" />;

  if (data.isPremiumLocked) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6 text-yellow-500" />
        </div>
        <h3 className="font-semibold mb-2">Premium Feature</h3>
        <p className="text-sm text-muted-foreground mb-4">Unlock editorials with a Premium subscription</p>
        <Button size="sm" className="bg-yellow-500 text-black hover:bg-yellow-400" asChild>
          <Link to="/premium">Upgrade to Premium</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.editorial?.map((section: { id: string; title: string; content: string; timeComplexity?: string; spaceComplexity?: string }) => (
        <div key={section.id}>
          <h3 className="font-semibold mb-3">{section.title}</h3>
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{section.content}</ReactMarkdown>
          </div>
          {(section.timeComplexity || section.spaceComplexity) && (
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              {section.timeComplexity && <span>Time: <code className="text-coders-green">{section.timeComplexity}</code></span>}
              {section.spaceComplexity && <span>Space: <code className="text-coders-green">{section.spaceComplexity}</code></span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SolutionsTab({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ['solutions', slug],
    queryFn: () => api.get(`/problems/${slug}/solutions`).then((r) => r.data),
  });

  return (
    <div className="space-y-4">
      {data?.solutions?.map((sol: { id: string; title: string; language: string; upvotes: number; user: { username: string } }) => (
        <div key={sol.id} className="border border-coders-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">{sol.title}</span>
            <Badge variant="outline" className="text-xs">{sol.language}</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>by {sol.user.username}</span>
            <span>👍 {sol.upvotes}</span>
          </div>
        </div>
      ))}
      {!data?.solutions?.length && (
        <p className="text-sm text-muted-foreground text-center py-8">No solutions yet. Be the first!</p>
      )}
    </div>
  );
}

function SubmissionsTab({ submissions }: { submissions: { id: string; status: string; language: string; runtime?: number; memory?: number; createdAt: string }[] }) {
  const statusColors: Record<string, string> = {
    ACCEPTED: 'text-green-400', WRONG_ANSWER: 'text-red-400',
    TIME_LIMIT_EXCEEDED: 'text-yellow-400', RUNTIME_ERROR: 'text-red-500',
    COMPILE_ERROR: 'text-orange-400', PENDING: 'text-blue-400',
  };

  return (
    <div className="space-y-2">
      {submissions.map((sub) => (
        <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg border border-coders-border hover:bg-white/3 text-sm">
          <span className={statusColors[sub.status] || 'text-muted-foreground'}>
            {sub.status.replace(/_/g, ' ')}
          </span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{sub.language}</span>
            {sub.runtime && <span>{sub.runtime}ms</span>}
            <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
      {!submissions.length && (
        <p className="text-sm text-muted-foreground text-center py-8">No submissions yet</p>
      )}
    </div>
  );
}

function DiscussTab({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ['discuss', slug],
    queryFn: () => api.get(`/discuss/${slug}`).then((r) => r.data),
  });

  return (
    <div className="space-y-3">
      {data?.discussions?.map((d: { id: string; title: string; user: { username: string }; _count: { comments: number } }) => (
        <div key={d.id} className="border border-coders-border rounded-lg p-3 hover:bg-white/3 cursor-pointer">
          <p className="text-sm font-medium mb-1">{d.title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{d.user.username}</span>
            <span>{d._count.comments} replies</span>
          </div>
        </div>
      ))}
      {!data?.discussions?.length && (
        <p className="text-sm text-muted-foreground text-center py-8">No discussions yet</p>
      )}
    </div>
  );
}

function TestCasePanel({ testCases, customInput, onCustomInputChange }: {
  testCases: { id: string; input: string; output: string }[]; customInput: string; onCustomInputChange: (v: string) => void;
}) {
  return <div className="space-y-3">
    <label className="text-sm" htmlFor="custom-input">Custom input (empty input is supported)</label>
    <textarea id="custom-input" value={customInput} onChange={e => onCustomInputChange(e.target.value)}
      className="w-full h-28 bg-coders-surface border border-coders-border rounded p-2 font-mono text-sm" />
    {testCases.map((tc, i) => <div key={tc.id} className="text-xs border border-coders-border p-2 rounded">
      <button onClick={() => onCustomInputChange(tc.input)}>Use sample {i + 1}</button>
      <pre className="whitespace-pre-wrap">{tc.input}</pre><p>Expected:</p><pre>{tc.output}</pre>
    </div>)}
  </div>;
}

function ResultPanel({ result, isLoading }: { result: SubmissionResult | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-coders-green" />
        <p className="text-sm text-muted-foreground">Executing your code...</p>
      </div>
    );
  }

  if (!result) {
    return <p className="text-sm text-muted-foreground text-center py-8">Run or submit your code to see results</p>;
  }

  const isAccepted = result.status === 'ACCEPTED';

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 text-lg font-bold ${isAccepted ? 'text-green-400' : 'text-red-400'}`}>
        {isAccepted ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        {result.isRun && result.status === 'ACCEPTED' ? 'Run completed' : result.status.replace(/_/g, ' ')}
      </div>

      {isAccepted && result.runtime !== undefined && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-coders-surface rounded-lg p-3 border border-coders-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />Runtime
            </div>
            <div className="font-bold">{result.runtime}ms</div>
            {result.runtimePercentile && (
              <div className="text-xs text-coders-green">Beats {result.runtimePercentile.toFixed(1)}%</div>
            )}
          </div>
          <div className="bg-coders-surface rounded-lg p-3 border border-coders-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Cpu className="w-3 h-3" />Memory
            </div>
            <div className="font-bold">{((result.memory || 0) / 1024).toFixed(1)}MB</div>
            {result.memoryPercentile && (
              <div className="text-xs text-coders-green">Beats {result.memoryPercentile.toFixed(1)}%</div>
            )}
          </div>
        </div>
      )}

      {result.testResults && (
        <div className="space-y-2">
          {result.testResults.map((tr, i) => (
            <div key={i} className={`rounded-lg p-3 border text-xs ${tr.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                {tr.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                <span className={tr.passed ? 'text-green-400' : 'text-red-400'}>Test {i + 1}</span>
                <span className="text-muted-foreground ml-auto">{tr.runtime}ms</span>
              </div>
              {(!tr.passed || result.isRun) && (
                <div className="space-y-1 font-mono">
                  <div><span className="text-muted-foreground">Expected: </span>{tr.isHidden ? 'Private' : tr.expectedOutput}</div>
                  <div><span className="text-muted-foreground">Got: </span>{tr.isHidden ? 'Hidden test output is private' : tr.actualOutput}</div>
                  {tr.errorMessage && <div className="text-red-400">{tr.errorMessage}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
