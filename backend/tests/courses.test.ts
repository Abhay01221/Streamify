import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from '../src/utils/prisma';
import { generateTokens } from '../src/middleware/auth';
import studyPlans from '../src/routes/studyPlans';
import contentAdmin from '../src/routes/contentAdmin';
import { csrfProtection } from '../src/middleware/csrf';
import { errorHandler } from '../src/middleware/errorHandler';
import { courseSchema } from '../src/services/courses';
import { problemImportSchema } from '../src/services/problemImport';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
const app = express();
app.use(express.json(), cookieParser(), csrfProtection);
app.use('/api/study-plans', studyPlans);
app.use('/api/admin/content', contentAdmin);
app.use(errorHandler);
const courseSlug = 'integration-dsa-course';
const courseBody = {
  title: 'Integration DSA course', description: 'A course with an original worked lesson and practice.',
  difficulty: 'Beginner', estimatedDays: 7, isPublished: false,
  modules: [{ slug: 'arrays', title: 'Array foundations', lessons: [{
    slug: 'sum-values', title: 'Sum the values', content: '## A single traversal\n\nKeep a running total and visit every value once. The invariant states that the total is the sum of values already visited. This takes O(n) time.',
    problemSlugs: ['integration-course-problem'], resources: [{ title: 'Python guide', url: 'https://docs.python.org/3/tutorial/', kind: 'reading' }],
  }] }],
};
const importItem = { title: 'Imported ledger', slug: 'integration-imported-ledger', number: 19002,
  difficulty: 'EASY', description: 'Print the sum of the input values.', referenceSolution: 'print(1)',
  testCases: [{ input: '1', output: '1', isSample: true }] };

test('course and import schemas reject duplicate identities, unsafe links and publication overrides', () => {
  expect(courseSchema.safeParse({ ...courseBody, modules: [...courseBody.modules, ...courseBody.modules] }).success).toBe(false);
  const badLink = { ...courseBody, modules: [{ ...courseBody.modules[0], lessons: [{ ...courseBody.modules[0].lessons[0],
    resources: [{ title: 'unsafe', url: 'javascript:alert(1)', kind: 'reading' }] }] }] };
  expect(courseSchema.safeParse(badLink).success).toBe(false);
  expect(problemImportSchema.safeParse({ problems: [{ ...importItem, isActive: true }] }).success).toBe(false);
  expect(problemImportSchema.safeParse({ problems: [importItem, importItem] }).success).toBe(false);
  expect(problemImportSchema.safeParse({ problems: [{ ...importItem, sourceName: 'External platform' }] }).success).toBe(false);
});

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('course and content integration on isolated PostgreSQL', () => {
  let token: string, otherToken: string, adminToken: string, userId: string, problemId: string, lessonId: string;
  const mutate = (method: 'post' | 'put', path: string, body: unknown, access = token) =>
    request(app)[method](path).set('X-CodeForge-CSRF', '1').set('Authorization', 'Bearer ' + access).send(body);
  const get = (path: string, access?: string) => {
    const call = request(app).get(path); return access ? call.set('Authorization', 'Bearer ' + access) : call;
  };
  beforeAll(async () => {
    await prisma.studyPlan.deleteMany({ where: { slug: { startsWith: 'integration-' } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'course_test_' } } });
    await prisma.problem.deleteMany({ where: { slug: { startsWith: 'integration-' } } });
    const users = await Promise.all(['learner', 'other', 'admin'].map(name => prisma.user.create({ data: {
      username: 'course_test_' + name, email: 'course_test_' + name + '@test.dev', isAdmin: name === 'admin',
    } })));
    userId = users[0].id;
    [token, otherToken, adminToken] = await Promise.all(users.map(async user => (await generateTokens(user)).accessToken));
    const problem = await prisma.problem.create({ data: { title: 'Course practice', slug: 'integration-course-problem', number: 19001,
      difficulty: 'EASY', description: 'Read a number and print it.', hints: [], referenceSolution: 'PRIVATE_REFERENCE',
      testCases: { create: [{ input: 'sample', output: 'sample', isSample: true }, { input: 'PRIVATE_INPUT', output: 'PRIVATE_EXPECTED', isSample: false }] } } });
    problemId = problem.id;
  });
  afterAll(async () => {
    await prisma.studyPlan.deleteMany({ where: { slug: { startsWith: 'integration-' } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'course_test_' } } });
    await prisma.problem.deleteMany({ where: { slug: { startsWith: 'integration-' } } });
    await prisma.$disconnect();
  });

  test('admin authorization, drafts and published course privacy', async () => {
    expect((await mutate('put', '/api/admin/content/courses/' + courseSlug, courseBody)).status).toBe(403);
    expect((await mutate('put', '/api/admin/content/courses/' + courseSlug, courseBody, adminToken)).status).toBe(200);
    expect((await get('/api/study-plans/' + courseSlug)).status).toBe(404);
    const published = { ...courseBody, isPublished: true };
    expect((await mutate('put', '/api/admin/content/courses/' + courseSlug, published, adminToken)).status).toBe(200);
    const detail = await get('/api/study-plans/' + courseSlug);
    expect(detail.status).toBe(200);
    lessonId = detail.body.plan.modules[0].lessons[0].id;
    expect(detail.body.plan.modules[0].lessons[0].problems[0].slug).toBe('integration-course-problem');
    expect(JSON.stringify(detail.body)).not.toContain('PRIVATE');
    expect(detail.body.plan.userProgress).toBeNull();
    expect((await get('/api/study-plans?page=0')).status).toBe(400);
    const authoring = await get('/api/admin/content/courses/' + courseSlug, adminToken);
    expect(authoring.status).toBe(200);
    expect(courseSchema.safeParse(authoring.body.course).success).toBe(true);
    expect((await mutate('put', '/api/admin/content/courses/' + courseSlug, authoring.body.course, adminToken)).status).toBe(200);
  });

  test('enrollment and lesson completion are idempotent and user-scoped', async () => {
    const path = '/api/study-plans/' + courseSlug;
    expect((await mutate('put', path + '/lessons/' + lessonId + '/completion', { completed: true })).status).toBe(409);
    expect((await mutate('post', path + '/enroll', {})).status).toBe(200);
    expect((await mutate('post', path + '/enroll', {})).status).toBe(200);
    expect((await mutate('put', path + '/lessons/' + lessonId + '/completion', { completed: true })).status).toBe(200);
    expect((await mutate('put', path + '/lessons/' + lessonId + '/completion', { completed: true })).status).toBe(200);
    expect((await get(path, token)).body.plan.userProgress).toMatchObject({ completedLessons: 1, completedProblems: 0, percentage: 50 });
    expect((await get(path, otherToken)).body.plan.modules[0].lessons[0].completed).toBe(false);
    expect((await mutate('put', path + '/lessons/missing/completion', { completed: true })).status).toBe(404);
  });

  test('accepted submissions count once, Runs do not count, edits preserve stable lesson progress', async () => {
    const data = { userId, problemId, language: 'python', code: 'print(1)', status: 'ACCEPTED' as const,
      queueStatus: 'Completed', verdict: 'ACCEPTED' };
    await prisma.submission.create({ data: { ...data, isRun: true } });
    const path = '/api/study-plans/' + courseSlug;
    expect((await get(path, token)).body.plan.userProgress.completedProblems).toBe(0);
    await prisma.submission.createMany({ data: [data, data] });
    expect((await get(path, token)).body.plan.userProgress).toMatchObject({ completedProblems: 1, totalProblems: 1, percentage: 100 });
    expect((await mutate('put', '/api/admin/content/courses/' + courseSlug, { ...courseBody, title: 'Updated DSA course', isPublished: true }, adminToken)).status).toBe(200);
    const edited = (await get(path, token)).body.plan;
    expect(edited.modules[0].lessons[0].id).toBe(lessonId);
    expect(edited.modules[0].lessons[0].completed).toBe(true);
    expect((await mutate('put', path + '/lessons/' + lessonId + '/completion', { completed: false })).status).toBe(200);
    expect((await get(path, token)).body.plan.userProgress.percentage).toBe(50);
  });

  test('unknown/inactive local practice blocks publication and external links stay resource-only', async () => {
    const missing = { ...courseBody, isPublished: true, modules: [{ ...courseBody.modules[0], lessons: [{ ...courseBody.modules[0].lessons[0], problemSlugs: ['missing-problem'] }] }] };
    expect((await mutate('put', '/api/admin/content/courses/' + courseSlug, missing, adminToken)).status).toBe(400);
    await prisma.problem.update({ where: { id: problemId }, data: { isActive: false } });
    expect((await mutate('put', '/api/admin/content/courses/' + courseSlug, { ...courseBody, isPublished: true }, adminToken)).status).toBe(400);
    expect((await get('/api/study-plans/' + courseSlug, token)).body.plan.modules[0].lessons[0].problems).toHaveLength(0);
    await prisma.problem.update({ where: { id: problemId }, data: { isActive: true } });
  });

  test('problem import preview is read-only and commit saves private drafts with atomic duplicate protection', async () => {
    const base = '/api/admin/content/problems/';
    expect((await mutate('post', base + 'preview', { problems: [importItem] })).status).toBe(403);
    const preview = await mutate('post', base + 'preview', { problems: [importItem] }, adminToken);
    expect(preview.body).toMatchObject({ valid: true, items: [{ duplicate: false }] });
    expect(await prisma.problem.count({ where: { slug: importItem.slug } })).toBe(0);
    expect((await mutate('post', base + 'import', { problems: [importItem] }, adminToken)).body.imported).toBe(1);
    const saved = await prisma.problem.findUniqueOrThrow({ where: { slug: importItem.slug } });
    expect(saved.isActive).toBe(false);
    const duplicate = await mutate('post', base + 'preview', { problems: [importItem] }, adminToken);
    expect(duplicate.body).toMatchObject({ valid: false, items: [{ duplicate: true }] });
    const second = { ...importItem, slug: 'integration-second-import', number: 19003 };
    expect((await mutate('post', base + 'import', { problems: [importItem, second] }, adminToken)).status).toBe(409);
    expect(await prisma.problem.count({ where: { slug: second.slug } })).toBe(0);
    expect(await prisma.auditEvent.count({ where: { targetId: saved.id, action: 'problem.import' } })).toBe(1);
  });
});
