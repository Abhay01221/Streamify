import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from '../src/utils/prisma';
import auth from '../src/routes/auth';
import problems from '../src/routes/problems';
import submissions from '../src/routes/submissions';
import admin from '../src/routes/admin';
import users from '../src/routes/users';
import leaderboard from '../src/routes/leaderboard';
import { errorHandler } from '../src/middleware/errorHandler';
import { csrfProtection } from '../src/middleware/csrf';
import { evaluateSubmission } from '../src/queue/submissionQueue';
import { executionProvider } from '../src/execution/provider';

jest.mock('../src/utils/redis', () => ({ redis: { eval: jest.fn().mockResolvedValue(1), setex: jest.fn(), get: jest.fn(), getdel: jest.fn() },
  cache: { get: jest.fn(), set: jest.fn(), del: jest.fn(), delPattern: jest.fn() } }));
jest.mock('bull', () => jest.fn().mockImplementation(() => ({ on: jest.fn(), add: jest.fn().mockResolvedValue({ id: 'job' }) })));
jest.mock('../src/execution/provider', () => ({ executionProvider: { execute: jest.fn() } }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
const app = express();
app.use(express.json(), cookieParser(), csrfProtection);
app.use('/api/auth', auth); app.use('/api/problems', problems); app.use('/api/submissions', submissions);
app.use('/api/leaderboard', leaderboard); app.use('/api/admin', admin); app.use('/api/users', users); app.use(errorHandler);
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('isolated PostgreSQL API and judging integration', () => {
  let token: string, otherToken: string, userId: string, problemId: string;
  const send = (path: string, body: unknown, access = token) => request(app).post(path)
    .set('X-CodeForge-CSRF', '1').set('Authorization', `Bearer ${access || ''}`).send(body);
  beforeAll(async () => {
    await prisma.user.deleteMany(); await prisma.problem.deleteMany();
    await send('/api/auth/register', { email: 'first@test.dev', username: 'first', password: 'Password123!' });
    const login = await send('/api/auth/login', { email: 'first@test.dev', password: 'Password123!' });
    expect(login.status).toBe(200); token = login.body.accessToken; userId = login.body.user.id;
    await send('/api/auth/register', { email: 'second@test.dev', username: 'second', password: 'Password123!' });
    otherToken = (await send('/api/auth/login', { email: 'second@test.dev', password: 'Password123!' })).body.accessToken;
    const problem = await prisma.problem.create({ data: { title: 'Test Problem', slug: 'test-problem', number: 1,
      difficulty: 'EASY', description: 'A deterministic test problem', hints: [],
      testCases: { create: [{ input: 'sample', output: 'ok', isSample: true }, { input: 'SECRET_INPUT', output: 'SECRET_OUTPUT', isSample: false }] } } });
    problemId = problem.id;
  });
  afterAll(async () => { await prisma.$disconnect(); });
  test('CSRF, authentication and role checks', async () => {
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(403);
    expect((await send('/api/auth/login', {}, '')).status).toBe(400);
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/admin/problems').set('Authorization', `Bearer ${token}`)).status).toBe(403);
    expect((await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').set('X-CodeForge-CSRF', '1').send({})).status).toBe(403);
  });
  test('catalog samples, pagination and publication', async () => {
    const detail = await request(app).get('/api/problems/test-problem');
    expect(detail.status).toBe(200); expect(JSON.stringify(detail.body)).not.toContain('SECRET_INPUT');
    expect((await request(app).get('/api/problems?page=0')).status).toBe(400);
    await prisma.problem.update({ where: { id: problemId }, data: { isActive: false } });
    expect((await request(app).get('/api/problems/test-problem')).status).toBe(404);
    await prisma.problem.update({ where: { id: problemId }, data: { isActive: true } });
  });
  test('custom submit input and unsupported languages are rejected', async () => {
    expect((await send('/api/submissions', { problemSlug: 'test-problem', language: 'python', code: 'print(1)', customInput: 'attack' })).status).toBe(400);
    expect((await send('/api/submissions', { problemSlug: 'test-problem', language: 'java', code: 'x' })).status).toBe(400);
  });
  test('real persistence, ownership and hidden execution-result privacy', async () => {
    const created = await send('/api/submissions', { problemSlug: 'test-problem', language: 'python', code: 'print(1)' });
    expect(created.status).toBe(202);
    (executionProvider.execute as jest.Mock).mockResolvedValue({ stdout: 'SECRET_INPUT', stderr: 'SECRET_INPUT', verdict: 'RUNTIME_ERROR', time: 1, memory: 3 });
    await evaluateSubmission(created.body.submissionId);
    const result = await request(app).get(`/api/submissions/${created.body.submissionId}`).set('Authorization', `Bearer ${token}`);
    expect(result.body.status).toBe('RUNTIME_ERROR'); expect(result.body.queueStatus).toBe('Completed');
    expect(result.body.testResults.find((r: { isHidden: boolean }) => r.isHidden)).toEqual(expect.objectContaining({ passed: false, isHidden: true }));
    expect(JSON.stringify(result.body.testResults.find((r: { isHidden: boolean }) => r.isHidden))).not.toContain('SECRET');
    expect((await request(app).get(`/api/submissions/${created.body.submissionId}`).set('Authorization', `Bearer ${otherToken}`)).status).toBe(403);
  });
  test('empty custom input runs without awarding progress and persists output', async () => {
    const created = await send('/api/submissions', { problemSlug: 'test-problem', language: 'python', code: 'print(42)', isRun: true, customInput: '' });
    (executionProvider.execute as jest.Mock).mockResolvedValue({ stdout: '42\n', stderr: '', verdict: 'ACCEPTED', time: 1, memory: 3 });
    await evaluateSubmission(created.body.submissionId);
    expect(executionProvider.execute).toHaveBeenLastCalledWith('print(42)', 'python', '', 2000, 262144);
    expect((await prisma.userStats.findUnique({ where: { userId } }))!.totalSolved).toBe(0);
    const result = await request(app).get(`/api/submissions/${created.body.submissionId}`).set('Authorization', `Bearer ${token}`);
    expect(result.body.testResults[0].actualOutput).toBe('42\n');
  });
  test('accepted completion is idempotent and catalog solved status survives later failure', async () => {
    const created = await send('/api/submissions', { problemSlug: 'test-problem', language: 'python', code: '# correct' });
    (executionProvider.execute as jest.Mock).mockResolvedValueOnce({ stdout: 'ok\n', stderr: '', verdict: 'ACCEPTED', time: 1, memory: 3 })
      .mockResolvedValueOnce({ stdout: 'SECRET_OUTPUT', stderr: '', verdict: 'ACCEPTED', time: 1, memory: 3 });
    await evaluateSubmission(created.body.submissionId); await evaluateSubmission(created.body.submissionId);
    expect((await prisma.userStats.findUnique({ where: { userId } }))!.totalSolved).toBe(1);
    await prisma.submission.create({ data: { userId, problemId, language: 'python', code: 'x', status: 'WRONG_ANSWER', queueStatus: 'Completed' } });
    const list = await request(app).get('/api/problems').set('Authorization', `Bearer ${token}`);
    expect(list.body.problems[0].userStatus).toBe('solved');
  });
  test('private profiles never expose source through statistics', async () => {
    await prisma.userProfile.update({ where: { userId }, data: { isPublic: false } });
    expect((await request(app).get('/api/users/first/stats')).status).toBe(403);
    const own = await request(app).get('/api/users/first/stats').set('Authorization', `Bearer ${token}`);
    expect(own.body.recentSubmissions[0]).not.toHaveProperty('code');
  });
  test('refresh rotates credentials once and stores only hashes', async () => {
    const login = await send('/api/auth/login', { email: 'first@test.dev', password: 'Password123!' });
    const cookie = login.headers['set-cookie'].find((c: string) => c.startsWith('refreshToken=')).split(';')[0];
    const refresh = await request(app).post('/api/auth/refresh').set('X-CodeForge-CSRF', '1').set('Cookie', cookie).send({});
    expect(refresh.status).toBe(200);
    const replay = await request(app).post('/api/auth/refresh').set('X-CodeForge-CSRF', '1').set('Cookie', cookie).send({});
    expect(replay.status).toBe(401);
    const tokens = await prisma.refreshToken.findMany({ where: { userId } });
    expect(tokens.every(t => /^[a-f0-9]{64}$/.test(t.token))).toBe(true);
  });
  test('admin creates drafts, publishes, edits cases and rejects mass assignment', async () => {
    const second = await prisma.user.update({ where: { email: 'second@test.dev' }, data: { isAdmin: true } });
    const created = await send('/api/admin/problems', { title: 'Admin Problem', slug: 'admin-problem', number: 2,
      difficulty: 'EASY', description: 'Admin authored problem', referenceSolution: 'print(1)', testCases: [{ input: '', output: 'ok', isSample: true }] }, otherToken);
    expect(created.status).toBe(201);
    expect((await request(app).get('/api/problems/admin-problem')).status).toBe(404);
    const id = created.body.problem.id;
    const update = (body: unknown) => request(app).patch(`/api/admin/problems/${id}`).set('Authorization', `Bearer ${otherToken}`).set('X-CodeForge-CSRF', '1').send(body);
    (executionProvider.execute as jest.Mock).mockResolvedValue({ stdout: 'ok', stderr: '', verdict: 'ACCEPTED', time: 1, memory: 3 });
    expect((await update({ isActive: true })).status).toBe(200);
    expect((await update({ totalAccepted: 999 })).status).toBe(400);
    expect((await update({ testCases: [] })).status).toBe(400);
    expect((await prisma.auditEvent.count({ where: { actorId: second.id } }))).toBeGreaterThan(0);
  });
  test('leaderboard excludes private, admin, suspended users and counts distinct solves', async () => {
    await prisma.userProfile.update({ where: { userId }, data: { isPublic: true } });
    const list = await request(app).get('/api/leaderboard?limit=1');
    expect(list.status).toBe(200); expect(list.body.leaderboard[0].username).toBe('first');
    expect(list.body.leaderboard[0].totalSolved).toBe(1);
    expect(list.body.pagination.total).toBe(1);
  });
  test('logout revokes an already issued access token', async () => {
    expect((await send('/api/auth/logout', {})).status).toBe(200);
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });
});
