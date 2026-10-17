import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { submissionRateLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { submissionQueue, failSubmission } from '../queue/submissionQueue';
import { publicTestResult } from '../execution/policy';
const router = Router();
export const submitSchema = z.object({
  problemSlug: z.string().min(1).max(200),
  language: z.enum(['python', 'python3']),
  code: z.string().min(1).max(Number(process.env.MAX_SOURCE_BYTES || 65536))
    .refine(v => Buffer.byteLength(v) <= Number(process.env.MAX_SOURCE_BYTES || 65536), 'Source is too large'),
  isRun: z.boolean().default(false),
  customInput: z.string().max(65536).optional(),
}).strict().refine(v => v.isRun || v.customInput === undefined, 'Custom input is only permitted for Run');

router.post('/', authenticate, submissionRateLimiter, async (req, res, next) => {
  try {
    const data = submitSchema.parse(req.body);
    const problem = await prisma.problem.findUnique({ where: { slug: data.problemSlug },
      select: { id: true, isActive: true, isPremium: true, _count: { select: { testCases: true } } } });
    if (!problem || !problem.isActive) throw new AppError('Problem not found', 404);
    if (problem.isPremium && !req.user!.isPremium && !req.user!.isAdmin) throw new AppError('Premium required', 403);
    if (!data.isRun && !problem._count.testCases) throw new AppError('Problem has no evaluation tests', 409);
    // A PostgreSQL user lock makes admission atomic across API replicas.
    const submission = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${req.user!.id} FOR UPDATE`;
      const active = await tx.submission.count({ where: { userId: req.user!.id, queueStatus: { in: ['Pending', 'Running'] } } });
      if (active >= Number(process.env.MAX_USER_CONCURRENT_JOBS || 2)) throw new AppError('Too many active executions', 429);
      return tx.submission.create({ data: { userId: req.user!.id, problemId: problem.id,
        language: data.language, code: data.code, isRun: data.isRun, customInput: data.isRun ? data.customInput : null } });
    });
    try {
      await submissionQueue.add('execute', { submissionId: submission.id }, { jobId: submission.id });
    } catch {
      await failSubmission(submission.id);
      throw new AppError('Execution queue unavailable. Please try again.', 503);
    }
    res.status(202).json({ submissionId: submission.id, status: 'PENDING', queueStatus: 'Pending' });
  } catch (err) { next(err); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, verdict, language, problem } = z.object({ verdict: z.string().max(40).optional(), language: z.string().max(30).optional(), problem: z.string().max(200).optional(), page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20) }).parse(req.query);
    const where = { userId: req.user!.id, isRun: false, ...(verdict ? { verdict } : {}), ...(language ? { language } : {}), ...(problem ? { problem: { slug: problem } } : {}) };
    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, queueStatus: true, verdict: true, language: true, runtime: true, memory: true,
          createdAt: true, problem: { select: { slug: true, title: true } } } }), prisma.submission.count({ where })]);
    res.json({ submissions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const submission = await prisma.submission.findUnique({ where: { id: req.params.id },
      include: { testResults: { include: { testCase: { select: { isSample: true } } } },
        problem: { select: { slug: true, title: true } } } });
    if (!submission) throw new AppError('Submission not found', 404);
    if (submission.userId !== req.user!.id && !req.user!.isAdmin) throw new AppError('Access denied', 403);
    const testResults = submission.testResults.map(r => publicTestResult(r, req.user!.isAdmin));
    if (submission.isRun && submission.customInput !== null && submission.completedAt) testResults.push({
      testCaseId: 'custom', passed: submission.status === 'ACCEPTED', actualOutput: submission.runOutput,
      expectedOutput: '', runtime: submission.runtime, memory: submission.memory, errorMessage: submission.runError, isHidden: false });
    res.json({ ...submission, testResults, testCasesPassed: submission.testResults.filter(r => r.passed).length,
      totalTestCases: submission.testResults.length });
  } catch (err) { next(err); }
});
export default router;
