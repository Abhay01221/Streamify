import { vi, test, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProblemDetail from '../src/pages/ProblemDetail';
import { api } from '../src/lib/api';
import { useAuthStore } from '../src/store/authStore';
vi.mock('../src/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@monaco-editor/react', () => ({ default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) =>
  <textarea aria-label="Code editor" value={value} onChange={e => onChange(e.target.value)} /> }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
test('Run sends custom empty input and Submit does not send custom input', async () => {
  useAuthStore.setState({ user: { id: 'u', email: 'u@test.dev', username: 'u', isAdmin: false, isPremium: false, emailVerified: true } });
  vi.mocked(api.get).mockImplementation(async url => ({ data: url === '/problems/demo' ? {
    title: 'Demo', slug: 'demo', difficulty: 'EASY', tags: [], companies: [], constraints: [], examples: [],
    testCases: [], starterCode: [{ language: 'python', code: 'print(1)' }], totalSubmissions: 0,
  } : url?.startsWith('/submissions/') ? { status: 'ACCEPTED', isRun: true, testResults: [{ passed: true, actualOutput: '1', runtime: 1 }] } : { submissions: [], bookmarks: [] } }));
  vi.mocked(api.post).mockResolvedValue({ data: { submissionId: 's' } });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/problems/demo']}><Routes><Route path="/problems/:slug" element={<ProblemDetail />} /></Routes></MemoryRouter>
  </QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Run', exact: true }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/submissions', expect.objectContaining({ isRun: true, customInput: '' })));
  await screen.findByText('Run completed', {}, { timeout: 4000 });
  expect(screen.getByText('1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
  await waitFor(() => expect(api.post).toHaveBeenLastCalledWith('/submissions', expect.objectContaining({ isRun: false, customInput: undefined })));
});
