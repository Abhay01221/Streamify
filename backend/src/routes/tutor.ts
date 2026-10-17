import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sharedRateLimit } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { safeError } from '../execution/policy';
import { answerTutor, TutorContext, tutorConfiguration, tutorMessageSchema } from '../ai/tutor';

const router = Router();
router.get('/status', (_req, res) => {
  try { res.json({ enabled: tutorConfiguration().enabled }); }
  catch { res.json({ enabled: false }); }
});

router.post('/messages', authenticate, (req, res, next) => {
  try {
    tutorMessageSchema.parse(req.body);
    const config = tutorConfiguration();
    if (!config.enabled) throw new AppError('AI tutor is not configured yet.', 503);
    return sharedRateLimit('tutor', 3600, config.requestsPerHour, true)(req, res, next);
  } catch (error) { next(error); }
}, async (req, res, next) => {
  const cancellation = new AbortController();
  const cancel = () => { if (!res.writableEnded) cancellation.abort(); };
  res.on('close', cancel);
  try {
    const data = tutorMessageSchema.parse(req.body);
    // Select public fields explicitly: no referenceSolution, editorial, or testCases query.
    const problem = await prisma.problem.findUnique({ where: { slug: data.problemSlug }, select: {
      id: true, title: true, description: true, difficulty: true, isActive: true, isPremium: true,
      constraints: { orderBy: { order: 'asc' }, take: 20, select: { text: true } },
      examples: { orderBy: { order: 'asc' }, take: 3, select: { inputText: true, outputText: true, explanation: true } },
    } });
    if (!problem || !problem.isActive) throw new AppError('Problem not found', 404);
    if (problem.isPremium && !req.user!.isPremium && !req.user!.isAdmin) throw new AppError('Premium required', 403);
    const context: TutorContext = { problem: {
      title: problem.title.slice(0, 300), description: problem.description.slice(0, 16000), difficulty: problem.difficulty,
      constraints: problem.constraints.map(item => item.text.slice(0, 500)),
      examples: problem.examples.map(item => ({ input: item.inputText.slice(0, 2000), output: item.outputText.slice(0, 2000),
        explanation: item.explanation?.slice(0, 1500) })),
    } };
    if (data.submissionId) {
      // Ownership applies to admins too. Hidden results are filtered in SQL, before model context is constructed.
      const submission = await prisma.submission.findFirst({ where: {
        id: data.submissionId, userId: req.user!.id, problemId: problem.id,
      }, select: { status: true, queueStatus: true, verdict: true, language: true,
        testResults: { where: { testCase: { isSample: true } }, take: 10, select: {
          passed: true, actualOutput: true, expectedOutput: true, errorMessage: true, runtime: true, memory: true,
        } },
      } });
      if (!submission) throw new AppError('Submission not found', 404);
      context.execution = { status: submission.status, queueStatus: submission.queueStatus,
        verdict: submission.verdict, language: submission.language,
        publicResults: submission.testResults.map(item => ({ ...item,
          actualOutput: item.actualOutput?.slice(0, 2000) ?? null,
          expectedOutput: item.expectedOutput?.slice(0, 2000) ?? null,
          errorMessage: item.errorMessage ? safeError(item.errorMessage) : null,
        })),
      };
    }
    const answer = await answerTutor(data, context, cancellation.signal);
    if (!cancellation.signal.aborted) res.json(answer);
  } catch (error) { if (!cancellation.signal.aborted) next(error); }
  finally { res.off('close', cancel); }
});

export default router;
