import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CourseDetail from '../src/pages/CourseDetail';
import StudyPlans from '../src/pages/StudyPlans';
import AdminContent from '../src/pages/AdminContent';
import { api } from '../src/lib/api';
import { useAuthStore } from '../src/store/authStore';

vi.mock('../src/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

const user = { id: 'learner', email: 'learner@test.dev', username: 'learner', isAdmin: false, isPremium: false, emailVerified: true };
const progress = { completedLessons: 1, totalLessons: 2, completedProblems: 0, totalProblems: 1, percentage: 33 };
const course = {
  id: 'course-id', slug: 'array-foundations', title: 'Array foundations', description: 'A structured course.', isPremium: false,
  userProgress: progress,
  modules: [{ id: 'module-id', slug: 'arrays', title: 'Arrays', description: 'Learn arrays', order: 0, lessons: [
    { id: 'first', slug: 'first', title: 'Start here', summary: '', content: 'First lesson text.', estimatedMinutes: 10, order: 0, completed: true, problems: [], resources: [] },
    { id: 'second', slug: 'second', title: 'Running totals', summary: 'Keep one accumulator.', content: '## One pass\n\nUse a loop over the array.', estimatedMinutes: 15, order: 1, completed: false,
      problems: [{ id: 'p', slug: 'parcel-sum', title: 'Parcel sum', difficulty: 'EASY', solved: false }],
      resources: [{ title: 'External exercise', url: 'https://example.org/practice', kind: 'practice' }, { title: 'Unsafe', url: 'javascript:alert(1)', kind: 'reading' }],
    },
  ] }],
};

function renderPage(page: React.ReactNode, path = '/study-plan/array-foundations') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MemoryRouter initialEntries={[path]}><Routes><Route path="/study-plan/:id" element={page} /><Route path="/study-plan" element={page} /><Route path="/admin/content" element={page} /></Routes></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => { vi.resetAllMocks(); useAuthStore.setState({ user, isLoading: false }); });

test('course resumes unread lesson and saves reading progress without marking practice solved', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { plan: course } });
  vi.mocked(api.put).mockResolvedValue({ data: { completed: true } });
  renderPage(<CourseDetail />);
  expect(await screen.findByRole('heading', { name: 'Running totals' })).toBeInTheDocument();
  expect(screen.getByText('1/2 lessons read · 0/1 problems solved')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Parcel sum Easy' })).toHaveAttribute('href', '/problems/parcel-sum');
  expect(screen.getByRole('link', { name: /External exercise/ })).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.queryByRole('link', { name: /Unsafe/ })).not.toBeInTheDocument();
  expect(screen.getByText(/External practice is not verified/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mark lesson as read' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/study-plans/course-id/lessons/second/completion', { completed: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
  expect(await screen.findByRole('heading', { name: 'Start here' })).toBeInTheDocument();
});

test('public course asks visitors to sign in and permits lesson reading', async () => {
  useAuthStore.setState({ user: null });
  vi.mocked(api.get).mockResolvedValue({ data: { plan: { ...course, userProgress: null } } });
  renderPage(<CourseDetail />, '/study-plan/array-foundations?lesson=first');
  expect(await screen.findByRole('heading', { name: 'Start here' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Sign in to enroll' })).toHaveAttribute('href', '/login');
  expect(screen.queryByRole('button', { name: /Mark lesson/ })).not.toBeInTheDocument();
});

test('course list has a recoverable failure instead of an empty successful catalog', async () => {
  vi.mocked(api.get).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { plans: [] } });
  renderPage(<StudyPlans />, '/study-plan');
  expect(await screen.findByRole('alert')).toHaveTextContent('Courses could not be loaded.');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText(/There are no published courses/)).toBeInTheDocument();
});

test('problem import requires a fresh preview and blocks duplicate problems', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { valid: true, items: [{ slug: 'sum-the-parcels', title: 'Sum the parcels', duplicate: false }] } });
  renderPage(<AdminContent />, '/admin/content');
  fireEvent.click(screen.getByRole('button', { name: 'Validate and preview' }));
  expect(await screen.findByRole('button', { name: 'Import as drafts' })).toBeEnabled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Problem import JSON' }), { target: { value: '{"problems": []}' } });
  expect(screen.queryByRole('button', { name: 'Import as drafts' })).not.toBeInTheDocument();
  vi.mocked(api.post).mockResolvedValue({ data: { valid: false, items: [{ slug: 'duplicate', title: 'Duplicate problem', duplicate: true, conflict: 'Problem number already exists' }] } });
  fireEvent.click(screen.getByRole('button', { name: 'Validate and preview' }));
  expect(await screen.findByText('Problem number already exists')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Import as drafts' })).toBeDisabled();
});

test('resume returns to unsolved practice after every lesson has been read', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { plan: {
    ...course, userProgress: { ...progress, completedLessons: 2, percentage: 67 },
    modules: [{ ...course.modules[0], lessons: course.modules[0].lessons.map(lesson => ({ ...lesson, completed: true })) }],
  } } });
  renderPage(<CourseDetail />, '/study-plan/array-foundations?lesson=first');
  expect(await screen.findByRole('heading', { name: 'Start here' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Resume learning' }));
  expect(await screen.findByRole('heading', { name: 'Running totals' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Review course' })).not.toBeInTheDocument();
});

test('lesson ID selects the correct lesson when modules reuse the same lesson slug', async () => {
  const firstLesson = course.modules[0].lessons[0];
  vi.mocked(api.get).mockResolvedValue({ data: { plan: {
    ...course, modules: [
      { ...course.modules[0], lessons: [{ ...firstLesson, id: 'lesson-a', slug: 'introduction', title: 'Array introduction' }] },
      { ...course.modules[0], id: 'module-b', slug: 'trees', title: 'Trees', order: 1, lessons: [{ ...firstLesson, id: 'lesson-b', slug: 'introduction', title: 'Tree introduction' }] },
    ],
  } } });
  renderPage(<CourseDetail />, '/study-plan/array-foundations?lesson=lesson-b');
  expect(await screen.findByRole('heading', { name: 'Tree introduction' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
  expect(await screen.findByRole('heading', { name: 'Array introduction' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next lesson' }));
  expect(await screen.findByRole('heading', { name: 'Tree introduction' })).toBeInTheDocument();
});

test('course author reviews replacement effects before saving existing content', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { courses: [{ id: 'course-id', slug: 'array-foundations', title: 'Array foundations', isPublished: true }] } });
  vi.mocked(api.put).mockResolvedValue({ data: {} });
  renderPage(<AdminContent />, '/admin/content');
  fireEvent.click(screen.getByRole('button', { name: 'Courses' }));
  await screen.findByRole('button', { name: 'Load Array foundations' });
  fireEvent.click(screen.getByRole('button', { name: 'Review course' }));
  expect(screen.getByText(/Omitted modules and lessons, including their reading progress, will be removed/)).toBeInTheDocument();
  expect(api.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm save draft' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/content/courses/array-foundations', expect.objectContaining({ isPublished: false, modules: expect.any(Array) })));
  expect(await screen.findByRole('status')).toHaveTextContent('Course saved.');
});
