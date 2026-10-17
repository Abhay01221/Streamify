// Local developer verification. Creates uniquely named temporary fixtures and removes only those fixtures.
const { chromium, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error('This smoke check is restricted to a local development app.');
const suffix = crypto.randomBytes(6).toString('hex');
const fixture = { email: `smoke_${suffix}@example.test`, username: `smoke_${suffix}`,
  password: crypto.randomBytes(24).toString('hex'), problemSlug: `smoke-question-${suffix}`, courseSlug: `smoke-course-${suffix}` };
function database(action) {
  const program = `const {PrismaClient}=require('@prisma/client');const bcrypt=require('bcryptjs');
    const data=JSON.parse(require('fs').readFileSync(0,'utf8'));const db=new PrismaClient();
    (async()=>{if(data.action==='create'){await db.user.create({data:{email:data.email,username:data.username,
      passwordHash:await bcrypt.hash(data.password,12),emailVerified:true,isAdmin:true,
      profile:{create:{}},stats:{create:{}},streak:{create:{}},notificationSettings:{create:{}}}});}
    else {await db.studyPlan.deleteMany({where:{slug:data.courseSlug}});await db.problem.deleteMany({where:{slug:data.problemSlug}});
      await db.user.deleteMany({where:{email:data.email,username:data.username}});}})()
    .catch(()=>{console.error('Fixture operation failed');process.exitCode=1}).finally(()=>db.$disconnect());`;
  execFileSync('docker', ['compose', 'exec', '-T', 'api', 'node', '-e', program], {
    cwd: path.resolve(__dirname, '../..'), input: JSON.stringify({ ...fixture, action }), encoding: 'utf8', timeout: 30000,
  });
}

(async () => {
  let browser;
  let created = false;
  try {
    const catalog = await fetch(`${baseURL}/api/problems?limit=100`).then(r => r.json());
    if (catalog.catalogTotal < 27) throw new Error('The live library has not loaded the built-in problems.');
    const course = await fetch(`${baseURL}/api/study-plans/dsa-foundations-to-interviews`).then(r => r.json());
    if (course.plan?.modules?.length !== 22) throw new Error('The live structured course is missing its modules.');
    console.log(`Live catalog: ${catalog.catalogTotal} problems; course: ${course.plan.modules.length} modules.`);
    database('create'); created = true;
    browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto('/problems');
    await expect(page.locator('a[href="/problems/ledger-total"]')).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await page.goto('/study-plan/dsa-foundations-to-interviews');
    await expect(page.getByRole('heading', { name: 'DSA: Foundations to Interviews' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Read, model, prove, measure' })).toBeVisible();
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(fixture.email);
    await page.getByLabel('Password', { exact: true }).fill(fixture.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL(baseURL + '/');
    await page.goto('/admin/problems/new');
    await page.getByLabel('Title', { exact: true }).fill('Live smoke question');
    await page.getByLabel(/^Slug/).fill(fixture.problemSlug);
    await page.getByLabel('Problem statement and input/output format').fill('Read an integer and print the next integer. Input: one number. Output: one number.');
    await page.getByLabel('Input for test case 1', { exact: true }).fill('2');
    await page.getByLabel('Expected output for test case 1', { exact: true }).fill('3');
    await page.getByLabel('Input for test case 2', { exact: true }).fill('5');
    await page.getByLabel('Expected output for test case 2', { exact: true }).fill('6');
    await page.getByLabel('Private Python reference solution', { exact: false }).fill('print(int(input()) + 1)');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.waitForURL(baseURL + '/admin/problems');
    await expect(page.getByRole('cell', { name: 'Live smoke question', exact: true })).toBeVisible();
    await page.goto('/admin/courses/new');
    await page.getByLabel('Course title', { exact: true }).fill('Live smoke course');
    await page.getByLabel(/^Course slug/).fill(fixture.courseSlug);
    await page.getByLabel('Course description', { exact: true }).fill('A temporary course used to verify the actual authoring form.');
    await page.getByLabel('Module 1 title', { exact: true }).fill('Array fundamentals');
    await page.getByLabel('Module 1, lesson 1 title', { exact: true }).fill('One pass through an array');
    await page.getByLabel(/^Module 1, lesson 1 content/).fill('## A running total\n\nVisit every element and add it to a running sum. After each step, the sum equals all values visited. This takes O(n) time and O(1) additional space.');
    await page.getByRole('button', { name: 'Review draft', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm save draft', exact: true }).click();
    await page.waitForURL(/\/admin\/courses\//);
    await expect(page.getByText('Draft saved. You can reopen it from Admin → Courses.')).toBeVisible();
    const providers = await context.request.get('/api/auth/providers').then(r => r.json());
    for (const provider of ['google', 'github']) {
      if (!providers[provider].enabled) throw new Error(provider + ' is not enabled in the actual environment.');
      const response = await context.request.get(`/api/auth/${provider}`, { maxRedirects: 0 });
      if (response.status() !== 302) throw new Error(provider + ' did not start authorization.');
      const target = new URL(response.headers().location);
      const expected = provider === 'google' ? 'accounts.google.com' : 'github.com';
      if (target.hostname !== expected || !target.searchParams.get('state') || !target.searchParams.get('code_challenge')) throw new Error('Invalid OAuth start response.');
    }
    console.log('Live browser checks passed: pagination, actual lessons, password login, problem draft, course draft, Google/GitHub authorization redirects.');
  } finally {
    if (browser) await browser.close();
    if (created) database('cleanup');
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
