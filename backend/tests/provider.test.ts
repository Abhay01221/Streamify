import axios from 'axios';
import { executionProvider } from '../src/execution/provider';
jest.mock('axios');
const post = axios.post as jest.Mock, get = axios.get as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); });
test('sends documented resource restrictions and decodes real provider output', async () => {
  post.mockResolvedValue({ data: { token: 'abc-123' } });
  get.mockResolvedValue({ data: { status: { id: 3 }, stdout: Buffer.from('hello\n').toString('base64'), time: '0.012', memory: 1024 } });
  const result = await executionProvider.execute('print("hello")', 'python', '', 1000, 65536);
  expect(result).toEqual({ stdout: 'hello\n', stderr: '', verdict: 'ACCEPTED', time: 12, memory: 1024 });
  expect(post.mock.calls[0][1]).toEqual(expect.objectContaining({ enable_network: false, cpu_time_limit: 1,
    memory_limit: 65536, max_processes_and_or_threads: 16, stdin: '' }));
});
test('provider outage rejects without fake execution', async () => {
  post.mockRejectedValue(new Error('unavailable'));
  await expect(executionProvider.execute('print(1)', 'python', '', 1000, 65536)).rejects.toThrow('unavailable');
});
test('malformed provider response rejects', async () => {
  post.mockResolvedValue({ data: {} });
  await expect(executionProvider.execute('print(1)', 'python', '', 1000, 65536)).rejects.toThrow('Invalid provider response');
});
test('output is capped and classified separately', async () => {
  post.mockResolvedValue({ data: { token: 'abc' } });
  get.mockResolvedValue({ data: { status: { id: 3 }, stdout: Buffer.from('x'.repeat(70000)).toString('base64') } });
  const result = await executionProvider.execute('print(1)', 'python', '', 1000, 65536);
  expect(result.verdict).toBe('OUTPUT_LIMIT_EXCEEDED'); expect(Buffer.byteLength(result.stdout)).toBe(65536);
});
