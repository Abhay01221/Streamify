import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';

type Mode = 'hint' | 'explain' | 'solution' | 'debug';
interface ChatMessage { role: 'user' | 'assistant'; content: string }
interface Props { problemSlug: string; code: string; submissionId?: string }
const modes: { value: Mode; label: string; prompt: string }[] = [
  { value: 'hint', label: 'Hint', prompt: 'Give me one hint to get started.' },
  { value: 'explain', label: 'Explain', prompt: 'Explain this problem and walk through an example.' },
  { value: 'solution', label: 'Solution', prompt: 'Explain an approach and provide a Python solution.' },
  { value: 'debug', label: 'Debug', prompt: 'Help me find what is wrong with my code.' },
];

export function AITutor({ problemSlug, code, submissionId }: Props) {
  const user = useAuthStore(state => state.user);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [mode, setMode] = useState<Mode>('hint');
  const [message, setMessage] = useState('');
  const [includeCode, setIncludeCode] = useState(false);
  const [includeResult, setIncludeResult] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const conversationEnd = useRef<HTMLDivElement>(null);

  const checkStatus = () => {
    setStatusError(false);
    setEnabled(null);
    api.get('/tutor/status').then(({ data }) => setEnabled(data.enabled === true))
      .catch(() => { setStatusError(true); setEnabled(false); });
  };
  useEffect(() => {
    checkStatus();
    return () => { controller.current?.abort(); };
  }, []);
  // Conversations remain in memory and are reset whenever the problem or signed-in account changes.
  useEffect(() => {
    controller.current?.abort(); controller.current = null;
    setHistory([]); setMessage(''); setError(''); setIncludeCode(false); setIncludeResult(false); setLoading(false);
  }, [problemSlug, user?.id]);
  useEffect(() => { conversationEnd.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }); }, [history, loading]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || !user || !enabled) return;
    if (mode === 'debug' && (!includeCode || !code.trim())) {
      setError('Select “Include current code” and add code in the editor to debug it.'); return;
    }
    if (includeCode && code.length > 32768) { setError('Your code is too long for the tutor (32,768 characters maximum).'); return; }
    const prompt = message.trim() || modes.find(item => item.value === mode)!.prompt;
    const previous = history.slice(-6).map(item => ({ ...item, content: item.content.slice(0, item.role === 'assistant' ? 6000 : 2000) }));
    const request = new AbortController();
    controller.current = request; setLoading(true); setError('');
    try {
      const { data } = await api.post('/tutor/messages', {
        problemSlug, mode, message: prompt, history: previous,
        ...(includeCode ? { code } : {}), ...(includeResult && submissionId ? { submissionId } : {}),
      }, { signal: request.signal, timeout: 65000 });
      if (!request.signal.aborted) {
        setHistory(current => [...current.slice(-14), { role: 'user', content: prompt }, { role: 'assistant', content: data.message }]);
        setMessage('');
      }
    } catch (failure: unknown) {
      if (!request.signal.aborted) {
        const response = failure as { response?: { data?: { error?: string } } };
        setError(response.response?.data?.error || 'The tutor could not respond. Please try again.');
      }
    } finally {
      if (controller.current === request) { setLoading(false); controller.current = null; }
    }
  };

  return <section aria-label="AI tutor" className="space-y-4 text-sm">
    <div>
      <h2 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-coders-green" />AI tutor</h2>
      <p className="text-xs text-muted-foreground mt-2">Ask for a hint, a Python solution, or help debugging. Verify AI suggestions with Run and Submit.</p>
    </div>
    {enabled === null ? <p role="status" className="text-muted-foreground">Checking tutor availability…</p>
      : !enabled ? <div className="rounded-lg border border-coders-border p-3 space-y-2">
        <p>{statusError ? 'Could not check tutor availability.' : 'The AI tutor is not configured yet. Your administrator can enable it.'}</p>
        <Button variant="outline" size="sm" onClick={checkStatus}>Retry availability</Button>
      </div> : !user ? <p><Link to="/login" className="text-coders-green underline">Sign in</Link> to use the AI tutor.</p> : <>
        <div className="grid grid-cols-2 gap-2" aria-label="Tutor mode">
          {modes.map(item => <Button key={item.value} size="sm" variant={mode === item.value ? 'secondary' : 'outline'}
            aria-pressed={mode === item.value} disabled={loading} onClick={() => { setMode(item.value); setError(''); }}>{item.label}</Button>)}
        </div>
        <div aria-live="polite" aria-relevant="additions" className="space-y-4">
          {history.map((item, index) => <article key={index} className={item.role === 'user' ? 'rounded-lg bg-coders-surface p-3' : 'rounded-lg border border-coders-border p-3'}>
            <p className="text-xs font-semibold text-muted-foreground mb-2">{item.role === 'user' ? 'You' : 'AI tutor'}</p>
            <div className="prose prose-invert prose-sm max-w-none break-words [&_pre]:overflow-x-auto [&_pre]:text-xs">
              <ReactMarkdown skipHtml components={{ a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                img: ({ alt }) => <span>{alt}</span> }}>{item.content}</ReactMarkdown>
            </div>
          </article>)}
          {loading && <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Thinking…</p>}
          <div ref={conversationEnd} />
        </div>
        <form onSubmit={send} className="space-y-3">
          <label className="block text-xs text-muted-foreground" htmlFor="tutor-message">Your question (optional)</label>
          <textarea id="tutor-message" value={message} onChange={event => setMessage(event.target.value)} maxLength={4000}
            placeholder={modes.find(item => item.value === mode)?.prompt} disabled={loading}
            rows={3} className="w-full rounded-md border border-coders-border bg-coders-surface p-2 text-sm" />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={includeCode} disabled={loading}
            onChange={event => setIncludeCode(event.target.checked)} />Include current code{mode === 'debug' ? ' (required for debugging)' : ''}</label>
          {submissionId && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={includeResult} disabled={loading}
            onChange={event => setIncludeResult(event.target.checked)} />Include latest verdict and public test results</label>}
          <p className="text-xs text-muted-foreground">Your message, public problem details, and any code or results you select are sent to OpenAI. Hidden tests are excluded.</p>
          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {loading ? <Button type="button" variant="outline" size="sm" onClick={() => { controller.current?.abort(); setLoading(false); }}>Cancel request</Button>
              : <Button type="submit" size="sm" className="bg-coders-green text-black hover:bg-coders-green/90"><Send className="w-3.5 h-3.5 mr-2" />Ask tutor</Button>}
            <Button type="button" size="sm" variant="ghost" disabled={loading || !history.length} onClick={() => { setHistory([]); setError(''); }}>Clear chat</Button>
          </div>
        </form>
      </>}
  </section>;
}
