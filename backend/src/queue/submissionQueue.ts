import Bull from 'bull';
import { SubmissionStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { executionProvider } from '../execution/provider';
import { withExecutionCapacity } from '../execution/capacity';
import { normalizeOutput } from '../execution/policy';

// Only identifiers cross the queue boundary. PostgreSQL owns source and tests.
export const submissionQueue = new Bull('submissions', process.env.REDIS_URL || 'redis://localhost:6379', {
  defaultJobOptions: { attempts: 1, removeOnComplete: 100, removeOnFail: 100, timeout: 900000 },
  settings: { lockDuration: 120000, maxStalledCount: 1 },
});
submissionQueue.on('error', err => logger.error('Queue unavailable', { message: err.message }));

export async function evaluateSubmission(submissionId: string) {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId },
    include: { problem: { include: { testCases: { orderBy: { order: 'asc' } } } } } });
  if (!submission || ['Completed', 'Failed'].includes(submission.queueStatus)) return;
  // Bull's per-job lock coordinates retries; a terminal-state check prevents replay.
  const claim = await prisma.submission.updateMany({ where: { id: submissionId, queueStatus: { in: ['Pending', 'Running'] } },
    data: { status: 'RUNNING', queueStatus: 'Running', startedAt: new Date() } });
  if (!claim.count) return;
  const cases = submission.isRun
    ? submission.customInput !== null ? [{ id: 'custom', input: submission.customInput, output: '', isSample: true }]
      : submission.problem.testCases.filter(tc => tc.isSample)
    : submission.problem.testCases;
  if (!cases.length) throw new Error('No test cases configured');
  let verdict = 'ACCEPTED';
  const results: Array<{ testCaseId: string; passed: boolean; actualOutput: string; expectedOutput: string; runtime: number; memory: number; errorMessage: string | null }> = [];
  const evaluationDeadline = Date.now() + 10 * 60000;
  for (const tc of cases) {
    if (Date.now() >= evaluationDeadline) throw new Error('Evaluation deadline exceeded');
    const result = await executionProvider.execute(submission.code, submission.language, tc.input,
      submission.problem.timeLimit, submission.problem.memoryLimit);
    const passed = result.verdict === 'ACCEPTED' && (submission.isRun || normalizeOutput(result.stdout) === normalizeOutput(tc.output));
    if (!passed && verdict === 'ACCEPTED') verdict = result.verdict === 'ACCEPTED' ? 'WRONG_ANSWER' : result.verdict;
    results.push({ testCaseId: tc.id, passed, actualOutput: result.stdout, expectedOutput: tc.output,
      runtime: result.time, memory: result.memory, errorMessage: tc.isSample ? result.stderr || null : null });
  }
  const runtime = Math.round(results.reduce((sum, r) => sum + r.runtime, 0) / results.length);
  const memory = Math.max(...results.map(r => r.memory));
  await prisma.$transaction(async tx => {
    // Serialize user completions to avoid duplicate solved-problem increments.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${submission.userId} FOR UPDATE`;
    const updated = await tx.submission.updateMany({ where: { id: submissionId, queueStatus: 'Running' },
      data: { status: verdict as SubmissionStatus, verdict, queueStatus: verdict === 'SYSTEM_ERROR' ? 'Failed' : 'Completed',
        completedAt: new Date(), runtime, memory, runtimePercentile: null, memoryPercentile: null,
        errorMessage: verdict === 'SYSTEM_ERROR' ? 'Execution service failed. Please try again.' : null } });
    if (!updated.count) return;
    await tx.submissionTestResult.deleteMany({ where: { submissionId } });
    await tx.submissionTestResult.createMany({ data: results.filter(r => r.testCaseId !== 'custom').map(r => ({ ...r, submissionId })) });
    if (submission.isRun) {
      await tx.submission.update({ where: { id: submissionId }, data: { runOutput: submission.customInput !== null ? results[0].actualOutput : null,
        runError: submission.customInput !== null ? results[0].errorMessage : null } });
      return;
    }
    const accepted = await tx.submission.findMany({ where: { userId: submission.userId, isRun: false, status: 'ACCEPTED', problem: { isActive: true } },
      distinct: ['problemId'], select: { problem: { select: { difficulty: true } } } });
    const total = await tx.submission.count({ where: { userId: submission.userId, isRun: false, queueStatus: 'Completed' } });
    const ac = await tx.submission.count({ where: { userId: submission.userId, isRun: false, status: 'ACCEPTED', problem: { isActive: true } } });
    const stats = { totalSolved: accepted.length, easySolved: accepted.filter(r => r.problem.difficulty === 'EASY').length,
      mediumSolved: accepted.filter(r => r.problem.difficulty === 'MEDIUM').length, hardSolved: accepted.filter(r => r.problem.difficulty === 'HARD').length,
      totalSubmissions: total, acceptedSubmissions: ac, acceptanceRate: total ? ac / total * 100 : 0 };
    await tx.userStats.upsert({ where: { userId: submission.userId }, create: { userId: submission.userId, ...stats }, update: stats });
    if (verdict === 'ACCEPTED') {
      const streak = await tx.userStreak.findUnique({ where: { userId: submission.userId } });
      const today = new Date().toISOString().slice(0, 10), yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (streak && streak.lastSolvedAt?.toISOString().slice(0, 10) !== today) {
        const currentStreak = streak.lastSolvedAt?.toISOString().slice(0, 10) === yesterday ? streak.currentStreak + 1 : 1;
        await tx.userStreak.update({ where: { userId: submission.userId }, data: { currentStreak,
          longestStreak: Math.max(streak.longestStreak, currentStreak), lastSolvedAt: new Date(), totalActiveDays: { increment: 1 } } });
      }
    }
    await tx.$queryRaw`SELECT id FROM "Problem" WHERE id = ${submission.problemId} FOR UPDATE`;
    const problemTotal = await tx.submission.count({ where: { problemId: submission.problemId, isRun: false, queueStatus: 'Completed' } });
    const problemAc = await tx.submission.count({ where: { problemId: submission.problemId, isRun: false, status: 'ACCEPTED' } });
    await tx.problem.update({ where: { id: submission.problemId }, data: { totalSubmissions: problemTotal,
      totalAccepted: problemAc, acceptanceRate: problemTotal ? problemAc / problemTotal * 100 : 0 } });
  }, { timeout: 20000 });
}

export async function failSubmission(id: string) {
  await prisma.submission.updateMany({ where: { id, queueStatus: { in: ['Pending', 'Running'] } },
    data: { status: 'SYSTEM_ERROR', verdict: 'SYSTEM_ERROR', queueStatus: 'Failed', completedAt: new Date(),
      errorMessage: 'Execution service unavailable or job interrupted. Please try again.' } });
}

export function startWorker() {
  submissionQueue.process('execute', Number(process.env.WORKER_CONCURRENCY || 2), async job => {
    try { await withExecutionCapacity(() => evaluateSubmission(job.data.submissionId)); }
    catch (err) { await failSubmission(job.data.submissionId); throw err; }
  });
  submissionQueue.on('failed', job => { if (job) void failSubmission(job.data.submissionId).catch(err => logger.error(err)); });
  const reconcile = async () => {
    const stale = await prisma.submission.findMany({ where: { queueStatus: { in: ['Pending', 'Running'] },
      createdAt: { lt: new Date(Date.now() - 20 * 60000) } }, select: { id: true }, take: 100 });
    for (const job of stale) await failSubmission(job.id);
  };
  const timer = setInterval(() => { void reconcile().catch(err => logger.error('Reconciliation failed', err)); }, 60000);
  timer.unref();
  void reconcile().catch(err => logger.error(err));
}
export default submissionQueue;
