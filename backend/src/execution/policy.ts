export const normalizeOutput = (value: string): string =>
  value.replace(/\r\n?/g, '\n').split('\n').map(line => line.replace(/[ \t]+$/g, '')).join('\n').replace(/\n+$/g, '');

export const judge0Verdict = (id: number): string => {
  if (id === 3) return 'ACCEPTED';
  if (id === 4) return 'WRONG_ANSWER';
  if (id === 5) return 'TIME_LIMIT_EXCEEDED';
  if (id === 6) return 'COMPILE_ERROR';
  if (id >= 7 && id <= 12) return 'RUNTIME_ERROR';
  return 'SYSTEM_ERROR';
};

// Whitelist fields. Hidden stdout/stderr can echo the entire secret input.
export function publicTestResult(result: { id?: string; passed: boolean; runtime?: number | null; memory?: number | null; testCaseId?: string; actualOutput?: string | null; expectedOutput?: string | null; errorMessage?: string | null; testCase?: { isSample: boolean } }, admin = false): Record<string, unknown> {
  const visible = admin || result.testCase?.isSample === true;
  return {
    id: result.id, passed: result.passed, runtime: result.runtime, memory: result.memory,
    isHidden: !visible,
    ...(visible ? { testCaseId: result.testCaseId, actualOutput: result.actualOutput,
      expectedOutput: result.expectedOutput, errorMessage: result.errorMessage } : {}),
  };
}

export const safeError = (value: string): string => value
  .replace(/(?:https?:\/\/|\/)[^\s"']+/g, '[path]')
  .replace(/[A-Z]:\\[^\s"']+/gi, '[path]').slice(0, 2048);
