import { execFileSync } from 'child_process';
import { originalProblems } from '../prisma/originalProblems';
import { normalizeOutput } from '../src/execution/policy';
// These are repository-owned reference programs, never submitted user code.
// Sandbox tests are separate and require an explicitly configured provider.
describe('trusted original reference fixtures', () => {
  for (const problem of originalProblems) {
    test.each(problem.testCases.map((tc, i) => [i, tc.input, tc.output] as const))(`${problem.slug} case %s`, (_i, input, expected) => {
      const output = execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', problem.reference],
        { input, encoding: 'utf8', timeout: 5000 });
      expect(normalizeOutput(output)).toBe(normalizeOutput(expected));
    });
  }
});
