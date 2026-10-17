import { executionProvider } from '../execution/provider';
import { normalizeOutput } from '../execution/policy';
import { AppError } from '../middleware/errorHandler';

export async function verifyPublication(problem: {
  referenceSolution?: string | null; timeLimit: number; memoryLimit: number;
  testCases: Array<{ input: string; output: string; isSample: boolean }>;
}) {
  if (!problem.referenceSolution?.trim()) throw new AppError('Publishing requires a Python reference solution', 400);
  if (!problem.testCases.length || !problem.testCases.some(tc => tc.isSample)) throw new AppError('Publishing requires test cases and at least one sample', 400);
  const deadline = Date.now() + 120000;
  for (const tc of problem.testCases) {
    if (Date.now() > deadline) throw new AppError('Reference verification exceeded its deadline', 503);
    let result;
    try { result = await executionProvider.execute(problem.referenceSolution, 'python', tc.input, problem.timeLimit, problem.memoryLimit); }
    catch { throw new AppError('Execution service unavailable; problem was not published', 503); }
    if (result.verdict !== 'ACCEPTED' || normalizeOutput(result.stdout) !== normalizeOutput(tc.output)) {
      throw new AppError('Reference solution failed a configured test case', 400);
    }
  }
}
