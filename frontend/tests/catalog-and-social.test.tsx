import { beforeEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Problems from '../src/pages/Problems';
import StudyPlans from '../src/pages/StudyPlans';
import Login from '../src/pages/Login';
import { SocialLogin, socialLoginUrl } from '../src/components/SocialLogin';
import { api } from '../src/lib/api';
import { useAuthStore } from '../src/store/authStore';

vi.mock('../src/lib/api', () => ({ api: { defaults: { baseURL: '/api' }, get: vi.fn(), post: vi.fn() } }));

const initialAuth = useAuthStore.getState();
const learner = { id: 'first-user', email: 'first@example.test', username: 'first', isAdmin: false, isPremium: false, emailVerified: true };
const problem = { id: 'p', slug: 'parcels', number: 1, title: 'Parcel totals', difficulty: 'EASY', totalSubmissions: 0, acceptanceRate: 0, isPremium: false, userStatus: null, tags: [] };
const providers = { google: { enabled: true }, github: { enabled: false } };

function page(component: React.ReactNode, path = '/problems') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route path="/" element={<p>Signed in home</p>} /><Route path="*" element={component} /></Routes></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ ...initialAuth, user: learner, isLoading: false });
});

test('catalog distinguishes filters from the full library and clears search, topics, status and page', async () => {
  vi.mocked(api.get).mockImplementation(async url => {
    if (url === '/tags') return { data: { tags: [] } };
    const query = new URLSearchParams(String(url).split('?')[1]);
    return { data: { catalogTotal: 27, problems: query.get('search') ? [] : [problem], pagination: { page: Number(query.get('page')), limit: 20, total: query.get('search') ? 0 : 27, totalPages: query.get('search') ? 0 : 2 } } };
  });
  page(<Problems />, '/problems?search=missing&difficulty=HARD&tags=trees&status=solved&page=3');
  expect(await screen.findByText(/0 of 27 problems match your filters/)).toBeInTheDocument();
  expect(screen.getByText(/No problems match your filters/)).toBeInTheDocument();
  expect(screen.queryByText('There are no published problems yet.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
  expect(await screen.findByText(/27 problems available/)).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Search problems' })).toHaveValue('');
  expect(await screen.findByRole('link', { name: 'Parcel totals' })).toBeInTheDocument();
  expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/problems?page=1&limit=20&sortBy=number&sortOrder=asc');
});

test('catalog shows an owner action when there are no published questions', async () => {
  useAuthStore.setState({ user: { ...learner, isAdmin: true } });
  vi.mocked(api.get).mockResolvedValue({ data: { tags: [], problems: [], catalogTotal: 0, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } });
  page(<Problems />);
  expect(await screen.findByText('There are no published problems yet.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Add a problem' })).toHaveAttribute('href', '/admin/problems/new');
  expect(screen.getByRole('link', { name: 'Import problems' })).toHaveAttribute('href', '/admin/content');
  expect(screen.getByText('Showing 0–0 of 0')).toBeInTheDocument();
});

test('changing signed-in users refetches catalog status instead of reusing another user cache', async () => {
  vi.mocked(api.get).mockImplementation(async url => ({ data: url === '/tags' ? { tags: [] } : { catalogTotal: 1, problems: [problem], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }));
  page(<Problems />);
  await screen.findByRole('link', { name: 'Parcel totals' });
  const firstCount = vi.mocked(api.get).mock.calls.filter(([url]) => String(url).startsWith('/problems?')).length;
  act(() => { useAuthStore.setState({ user: { ...learner, id: 'other-user' } }); });
  await waitFor(() => expect(vi.mocked(api.get).mock.calls.filter(([url]) => String(url).startsWith('/problems?')).length).toBeGreaterThan(firstCount));
});

test('course catalog makes content authoring discoverable to app owners', async () => {
  useAuthStore.setState({ user: { ...learner, isAdmin: true } });
  vi.mocked(api.get).mockResolvedValue({ data: { plans: [] } });
  page(<StudyPlans />, '/study-plan');
  expect(await screen.findByText('There are no published courses yet.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Create or edit courses' })).toHaveAttribute('href', '/admin/content?tab=courses');
  expect(screen.getByRole('link', { name: 'Open content studio' })).toBeInTheDocument();
});

test('social login enables configured providers and explains unavailable options', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: providers });
  render(<SocialLogin />);
  expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'GitHub sign-in unavailable' })).toBeDisabled();
  expect(screen.getByText(/configured by the app owner/)).toBeInTheDocument();
  expect(socialLoginUrl('google', 'https://api.example.test/api/')).toBe('https://api.example.test/api/auth/google');
  expect(socialLoginUrl('github')).toBe('/api/auth/github');
});

test('OAuth callback errors use safe messages and never render unknown provider details', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: providers });
  page(<Login />, '/login?oauth=error&reason=private-server-token');
  expect(screen.getByRole('alert')).toHaveTextContent('The sign-in provider could not complete your request.');
  expect(screen.queryByText(/private-server-token/)).not.toBeInTheDocument();
  await screen.findByRole('button', { name: 'Continue with Google' });
});

test('successful OAuth callback restores cookie session before navigating', async () => {
  useAuthStore.setState({ user: null, initialize: vi.fn(async () => { useAuthStore.setState({ user: learner }); }) });
  vi.mocked(api.get).mockResolvedValue({ data: providers });
  page(<Login />, '/login?oauth=success');
  expect(await screen.findByText('Signed in home')).toBeInTheDocument();
  expect(useAuthStore.getState().initialize).toHaveBeenCalledTimes(1);
});

test('OAuth two-factor challenge submits only the code and uses cookies for challenge state', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { user: learner, accessToken: 'access' } });
  page(<Login />, '/login?oauth=two_factor');
  fireEvent.change(screen.getByLabelText('Authenticator Code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
  expect(await screen.findByText('Signed in home')).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/auth/oauth/2fa/login', { code: '123456' });
  expect(useAuthStore.getState().user?.id).toBe('first-user');
});

test('parallel session initialization rotates the refresh token once', async () => {
  useAuthStore.setState({ user: null, accessToken: null, isLoading: true });
  vi.mocked(api.post).mockResolvedValue({ data: { accessToken: 'refreshed' } });
  vi.mocked(api.get).mockResolvedValue({ data: learner });
  const first = initialAuth.initialize();
  const second = initialAuth.initialize();
  expect(first).toBe(second);
  await Promise.all([first, second]);
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState().user?.id).toBe('first-user');
});

test('a late startup failure cannot overwrite a newer successful login', async () => {
  let rejectRefresh: (reason: Error) => void = () => {};
  useAuthStore.setState({ user: null, accessToken: null });
  vi.mocked(api.post).mockImplementation(() => new Promise((_, reject) => { rejectRefresh = reject; }));
  const startup = initialAuth.initialize();
  initialAuth.setUser(learner);
  initialAuth.setAccessToken('new-login-token');
  rejectRefresh(new Error('The old session expired'));
  await startup;
  expect(useAuthStore.getState().user?.id).toBe('first-user');
  expect(useAuthStore.getState().accessToken).toBe('new-login-token');
  expect(useAuthStore.getState().isLoading).toBe(false);
});
