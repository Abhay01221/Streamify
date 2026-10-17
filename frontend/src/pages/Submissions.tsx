import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
export default function SubmissionsPage() {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const page = Number(params.get('page') || 1);
  const { data, isLoading, isError } = useQuery({ queryKey: ['history', params.toString()], queryFn: () => api.get(`/submissions?${params}`).then(r => r.data) });
  const { data: detail } = useQuery({ queryKey: ['submission', selected], queryFn: () => api.get(`/submissions/${selected}`).then(r => r.data), enabled: !!selected });
  const change = (key: string, value: string) => { const next = new URLSearchParams(params); next.set(key, value); if (key !== 'page') next.set('page', '1'); setParams(next); };
  return <main className="max-w-5xl mx-auto p-6 space-y-4">
    <h1 className="text-2xl font-bold">Submission history</h1>
    <div className="flex flex-wrap gap-3">
      <label>Verdict<select className="block bg-coders-surface border border-coders-border p-2" value={params.get('verdict') || ''} onChange={e => change('verdict', e.target.value)}>
        <option value="">All</option>{['ACCEPTED', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'TIME_LIMIT_EXCEEDED', 'OUTPUT_LIMIT_EXCEEDED', 'SYSTEM_ERROR'].map(v => <option key={v}>{v}</option>)}
      </select></label>
      <label>Problem slug<input className="block bg-coders-surface border border-coders-border p-2" value={params.get('problem') || ''} onChange={e => change('problem', e.target.value)} /></label>
      <label>Language<select className="block bg-coders-surface border border-coders-border p-2" value={params.get('language') || ''} onChange={e => change('language', e.target.value)}><option value="">All</option><option value="python">Python</option></select></label>
    </div>
    {isLoading && <p>Loading submissions…</p>}{isError && <p role="alert">Could not load submission history.</p>}
    {data?.submissions?.length === 0 && <p>No submissions match these filters.</p>}
    {data?.submissions?.map((s: { id: string; problem: { slug: string; title: string }; status: string; language: string; runtime: number | null; memory: number | null; createdAt: string }) =>
      <div key={s.id} className="flex flex-wrap gap-3 rounded border border-coders-border p-3 text-sm">
        <Link to={`/problems/${s.problem.slug}`}>{s.problem.title}</Link><span>{s.language}</span><span>{s.status}</span>
        <span>{s.runtime ?? '—'} ms</span><span>{s.memory ?? '—'} KB</span><time>{new Date(s.createdAt).toLocaleString()}</time>
        <button className="text-coders-green" onClick={() => setSelected(s.id)}>View source and details</button>
      </div>)}
    <div className="flex gap-4"><button disabled={page <= 1} onClick={() => change('page', String(page - 1))}>Previous</button>
      <span>Page {page}</span><button disabled={page >= (data?.pagination.totalPages || 1)} onClick={() => change('page', String(page + 1))}>Next</button></div>
    {detail && <section className="rounded border border-coders-border p-4 space-y-2">
      <button onClick={() => setSelected(null)}>Close details</button><p>{detail.id} · {detail.status} · {detail.testCasesPassed}/{detail.totalTestCases} tests passed</p>
      <pre className="overflow-auto bg-coders-surface p-3">{detail.code}</pre>
      {detail.errorMessage && <p>{detail.errorMessage}</p>}
    </section>}
  </main>;
}
