import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AITutor } from '../src/components/AITutor';
import { api } from '../src/lib/api';
import { useAuthStore } from '../src/store/authStore';

vi.mock('../src/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: { id: 'u', email: 'u@test.dev', username: 'u', isAdmin: false, isPremium: false, emailVerified: true } });
  vi.mocked(api.get).mockResolvedValue({ data: { enabled: true } });
  vi.mocked(api.post).mockResolvedValue({ data: { message: 'Check the loop boundary.' } });
});
const show = () => render(<MemoryRouter><AITutor problemSlug="demo" code="print(1)" submissionId="own-submission" /></MemoryRouter>);

test('a hint excludes code and result data unless the learner selects them', async () => {
  show(); fireEvent.click(await screen.findByRole('button', { name: 'Ask tutor' }));
  await screen.findByText('Check the loop boundary.');
  const payload = vi.mocked(api.post).mock.calls[0][1] as Record<string, unknown>;
  expect(payload.mode).toBe('hint'); expect(payload.code).toBeUndefined(); expect(payload.submissionId).toBeUndefined();
  expect(screen.getByText(/sent to OpenAI/)).toBeInTheDocument();
});

test('debugging requires explicit code sharing and can include public verdict evidence', async () => {
  show(); fireEvent.click(await screen.findByRole('button', { name: 'Debug', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Ask tutor' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Include current code');
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', { name: /Include current code/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Include latest verdict/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Ask tutor' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tutor/messages', expect.objectContaining({ mode: 'debug', code: 'print(1)', submissionId: 'own-submission' }), expect.objectContaining({ signal: expect.any(AbortSignal) })));
});

test('unconfigured tutor presents an honest unavailable state', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { enabled: false } });
  show(); expect(await screen.findByText(/not configured yet/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ask tutor' })).not.toBeInTheDocument();
});

test('changing problems clears in-memory conversation and sharing preferences', async () => {
  const view = show(); fireEvent.click(await screen.findByRole('checkbox', { name: /Include current code/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Ask tutor' }));
  await screen.findByText('Check the loop boundary.');
  view.rerender(<MemoryRouter><AITutor problemSlug="other" code="print(2)" /></MemoryRouter>);
  expect(screen.queryByText('Check the loop boundary.')).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /Include current code/ })).not.toBeChecked();
});
