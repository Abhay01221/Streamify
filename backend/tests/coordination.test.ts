import { Request, Response } from 'express';
import { redis } from '../src/utils/redis';
import { sharedRateLimit } from '../src/middleware/rateLimiter';
import { withExecutionCapacity } from '../src/execution/capacity';
jest.mock('../src/utils/redis', () => ({ redis: { eval: jest.fn(), zrem: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
test('shared rate limit blocks excessive requests by authenticated user', async () => {
  (redis.eval as jest.Mock).mockResolvedValue(3);
  const next = jest.fn(), setHeader = jest.fn();
  await sharedRateLimit('test', 60, 2, true)({ user: { id: 'u' }, ip: '127.0.0.1' } as Request, { setHeader } as unknown as Response, next);
  expect(next.mock.calls[0][0].statusCode).toBe(429);
  expect((redis.eval as jest.Mock).mock.calls[0][2]).toBe('limit:test:u');
});
test('rate-limit outages fail closed', async () => {
  (redis.eval as jest.Mock).mockRejectedValue(new Error('unavailable'));
  const next = jest.fn();
  await sharedRateLimit('test', 60, 2)({ ip: '127.0.0.1' } as Request, { setHeader: jest.fn() } as unknown as Response, next);
  expect(next.mock.calls[0][0].statusCode).toBe(503);
});
test('execution capacity releases its lease after success', async () => {
  (redis.eval as jest.Mock).mockResolvedValue(1);
  expect(await withExecutionCapacity(async () => 42)).toBe(42);
  expect(redis.zrem).toHaveBeenCalledTimes(1);
});
test('execution capacity releases its lease after provider failure', async () => {
  (redis.eval as jest.Mock).mockResolvedValue(1);
  await expect(withExecutionCapacity(async () => { throw new Error('provider unavailable'); })).rejects.toThrow('provider unavailable');
  expect(redis.zrem).toHaveBeenCalledTimes(1);
});
