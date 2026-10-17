import { test, expect } from '@playwright/test';

// Deterministic browser UI checks. PostgreSQL persistence is tested separately
// by backend/tests/courses.test.ts; this suite does not claim a live AI/judge call.
test('course reading, practice links and mobile layout', async ({ page }, testInfo) => {
  let read = false;
  const user = { id: 'ui-learner', username: 'learner', email: 'learner@example.test', isAdmin: false, isPremium: false, emailVerified: true };
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'ui-test-only' } });
    if (path === '/api/auth/me') return route.fulfill({ json: user });
    if (path.endsWith('/completion')) {
      read = route.request().postDataJSON().completed;
      return route.fulfill({ json: { completed: read } });
    }
    if (path === '/api/study-plans/demo-course') return route.fulfill({ json: { plan: {
      id: 'demo-course', slug: 'demo-course', title: 'DSA: Foundations to Interviews',
      description: 'Learn the concept, walk through an example, and practise with the coding judge.', isPremium: false,
      userProgress: { completedLessons: Number(read), totalLessons: 1, completedProblems: 0, totalProblems: 1, percentage: read ? 50 : 0 },
      modules: [{ id: 'arrays', slug: 'arrays', title: 'Arrays and invariants', description: '', order: 0, lessons: [{
        id: 'sum-lesson', slug: 'sum-values', title: 'One pass through an array', summary: 'Use an invariant to explain why a running total is correct.',
        content: '## Keep a running total\n\nAfter processing the first i values, total is their sum.\n\n```python\ntotal = 0\nfor value in values:\n    total += value\n```\n\nThe traversal uses O(n) time and O(1) extra space.',
        estimatedMinutes: 20, order: 0, completed: read,
        problems: [{ id: 'ledger', slug: 'ledger-total', title: 'Ledger Total', difficulty: 'EASY', solved: false }],
        resources: [{ title: 'Python data structures', url: 'https://docs.python.org/3/tutorial/datastructures.html', kind: 'reading' }],
      }] }],
    } } });
    return route.fulfill({ json: { notifications: [], count: 0, plans: [] } });
  });
  await page.goto('/study-plan/demo-course');
  await expect(page.getByRole('heading', { name: 'DSA: Foundations to Interviews' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'One pass through an array' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Ledger Total/ })).toHaveAttribute('href', '/problems/ledger-total');
  await page.getByRole('button', { name: 'Mark lesson as read', exact: true }).click();
  await expect(page.getByText('1/1 lessons read · 0/1 problems solved')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark as unread', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume learning' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Python data structures/ })).toHaveAttribute('rel', 'noopener noreferrer');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('course.png'), fullPage: true });
});
