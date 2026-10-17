import axios from 'axios';
import { judge0Verdict, safeError } from './policy';
import { wrapCode } from './wrapper';

export interface ExecutionResult {
  stdout: string; stderr: string; verdict: string; time: number; memory: number;
}
export interface ExecutionProvider {
  execute(code: string, language: string, input: string, timeMs: number, memoryKb: number): Promise<ExecutionResult>;
  health(): Promise<void>;
}
const outputLimit = Number(process.env.MAX_OUTPUT_BYTES || 65536);
const headers = process.env.JUDGE0_AUTH_TOKEN ? { 'X-Auth-Token': process.env.JUDGE0_AUTH_TOKEN } : {};
const base = () => (process.env.JUDGE0_URL || '').replace(/\/+$/, '');
export const executionProvider: ExecutionProvider = {
  async health() {
    if (!base()) throw new Error('JUDGE0_URL is required');
    await axios.get(`${base()}/languages`, { headers, timeout: 3000, maxContentLength: 262144 });
  },
  async execute(code, language, input, timeMs, memoryKb) {
    if (!['python', 'python3'].includes(language)) throw new Error('Unsupported language');
    if (!base()) throw new Error('Execution provider is not configured');
    const options = { headers, timeout: 10000, maxContentLength: outputLimit * 4 + 16384 };
    const response = await axios.post(`${base()}/submissions?base64_encoded=true&wait=false`, {
      source_code: Buffer.from(wrapCode(code, language)).toString('base64'),
      language_id: Number(process.env.JUDGE0_PYTHON_ID || 71),
      stdin: Buffer.from(input).toString('base64'), cpu_time_limit: timeMs / 1000,
      wall_time_limit: Math.max(5, timeMs / 1000 * 3), memory_limit: memoryKb,
      enable_network: false, max_processes_and_or_threads: 16, max_file_size: Math.ceil(outputLimit / 1024),
    }, options);
    const token = response.data?.token;
    if (typeof token !== 'string' || !/^[\w-]+$/.test(token)) throw new Error('Invalid provider response');
    const deadline = Date.now() + Number(process.env.EXECUTION_TIMEOUT_MS || 60000);
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data } = await axios.get(`${base()}/submissions/${token}?base64_encoded=true`, options);
      const id = data?.status?.id;
      if (!Number.isInteger(id)) throw new Error('Invalid provider status');
      if (id <= 2) continue;
      const decode = (value: unknown) => typeof value === 'string' ? Buffer.from(value, 'base64').toString('utf8') : '';
      const stdout = decode(data.stdout), stderr = decode(data.stderr || data.compile_output);
      const exceeded = Buffer.byteLength(stdout) > outputLimit || Buffer.byteLength(stderr) > outputLimit || data.exit_signal === 25;
      return { stdout: Buffer.from(stdout).subarray(0, outputLimit).toString('utf8'), stderr: safeError(stderr),
        verdict: exceeded ? 'OUTPUT_LIMIT_EXCEEDED' : judge0Verdict(id),
        time: Math.max(0, Math.round(Number(data.time || 0) * 1000)), memory: Math.max(0, Math.round(Number(data.memory || 0))) };
    }
    throw new Error('Execution provider deadline exceeded');
  },
};
