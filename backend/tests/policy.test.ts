import { normalizeOutput, judge0Verdict, publicTestResult, safeError } from '../src/execution/policy';
import { validateConfiguration } from '../src/config';

test('normalizes line endings and trailing whitespace only', () => {
  expect(normalizeOutput('a  \r\nb\t\r\n')).toBe('a\nb');
  expect(normalizeOutput('a  b')).not.toBe(normalizeOutput('a b'));
  expect(normalizeOutput(' a')).not.toBe(normalizeOutput('a'));
  expect(normalizeOutput('[1, 2]')).not.toBe(normalizeOutput('[1,2]'));
  expect(normalizeOutput('1.001')).not.toBe(normalizeOutput('1'));
});
test.each([[3,'ACCEPTED'],[4,'WRONG_ANSWER'],[5,'TIME_LIMIT_EXCEEDED'],[6,'COMPILE_ERROR'],[7,'RUNTIME_ERROR'],[11,'RUNTIME_ERROR'],[12,'RUNTIME_ERROR'],[13,'SYSTEM_ERROR'],[99,'SYSTEM_ERROR']])('maps provider status %s', (id, verdict) => {
  expect(judge0Verdict(Number(id))).toBe(verdict);
});
test('hidden stdout, expected output, errors and IDs are never exposed', () => {
  const secret = { id: 'r', testCaseId: 'secret-id', passed: false, runtime: 1, memory: 2,
    actualOutput: 'secret-input', expectedOutput: 'secret-output', errorMessage: 'secret-error', testCase: { isSample: false } };
  const result = JSON.stringify(publicTestResult(secret));
  expect(result).not.toContain('secret');
  expect(publicTestResult(secret, true).expectedOutput).toBe('secret-output');
  expect(publicTestResult({ ...secret, testCase: { isSample: true } }).actualOutput).toBe('secret-input');
});
test('bounds and sanitizes diagnostics', () => {
  expect(safeError('File /app/secrets/token.py failed')).not.toContain('/app/secrets');
  expect(safeError('x'.repeat(9000))).toHaveLength(2048);
});
test('configuration rejects weak or equal secrets', () => {
  const env = { DATABASE_URL: 'postgresql://test@localhost/test', REDIS_URL: 'redis://localhost:6379',
    FRONTEND_URL: 'http://localhost:3000', JUDGE0_URL: 'http://localhost:2358', JWT_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'b'.repeat(32) };
  expect(validateConfiguration(env).WORKER_CONCURRENCY).toBe(2);
  expect(() => validateConfiguration({ ...env, JWT_SECRET: 'secret' })).toThrow();
  expect(() => validateConfiguration({ ...env, JWT_REFRESH_SECRET: env.JWT_SECRET })).toThrow();
});
