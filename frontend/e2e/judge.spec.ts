import { test, expect } from '@playwright/test';
test('register, login, run, submit and view accepted progress', async ({ page, request }) => {
  test.skip(process.env.ENABLE_REAL_E2E !== 'true', 'Requires the full stack and reviewed isolated execution provider');
  const username = `e2e_${Date.now()}`;
  await page.goto('/register');
  await page.getByLabel('Email', { exact: true }).fill(`${username}@example.test`);
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill('TestPassword123!');
  // Use the same API for creation if form changes; no test-only execution path exists.
  await page.getByRole('button', { name: /Create Account/i }).click();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${username}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('TestPassword123!');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL('/');
  const denied = await page.request.get('/api/admin/problems'); expect(denied.status()).toBe(403);
  await page.goto('/problems/ledger-total');
  await page.getByRole('button', { name: /Use text editor/i }).click();
  await page.getByLabel('Code editor').fill('import json\nprint(sum(json.loads(input())))');
  await page.getByLabel(/Custom input/).fill('[3,-2,8]');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByText('Run completed', { exact: true })).toBeVisible({ timeout: 120000 });
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText('ACCEPTED', { exact: true }).first()).toBeVisible({ timeout: 120000 });
  const progress = await page.request.get('/api/users/me/progress');
  expect((await progress.json()).problems.some((p: { slug: string }) => p.slug === 'ledger-total')).toBe(true);
  await page.goto('/submissions'); await expect(page.getByText('Ledger Total')).toBeVisible();
});
