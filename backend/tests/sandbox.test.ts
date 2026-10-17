import { executionProvider } from '../src/execution/provider';
// Explicit opt-in: these programs must only run on a deployment whose isolation
// has been reviewed. This file never runs submitted programs on the app host.
const sandbox = process.env.ENABLE_SANDBOX_TESTS === 'true' ? describe : describe.skip;
sandbox('real isolated execution provider', () => {
  test.each([
    ['print(42)', '', 'ACCEPTED'],
    ['print(input())', 'hello', 'ACCEPTED'],
    ['this is invalid Python !!!', '', 'COMPILE_ERROR'],
    ['raise ValueError("test")', '', 'RUNTIME_ERROR'],
    ['while True: pass', '', 'TIME_LIMIT_EXCEEDED'],
    ['while True: print("x" * 1000)', '', 'OUTPUT_LIMIT_EXCEEDED'],
  ])('program receives %s', async (code, input, verdict) => {
    const result = await executionProvider.execute(code, 'python', input, 1000, 65536);
    expect(result.verdict).toBe(verdict);
  }, 90000);
});
