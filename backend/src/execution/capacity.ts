import crypto from 'crypto';
import { redis } from '../utils/redis';

const key = 'execution:slots';
const acquireScript = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
redis.call('ZADD', KEYS[1], ARGV[3], ARGV[4])
redis.call('EXPIRE', KEYS[1], 1200)
return 1`;

export async function withExecutionCapacity<T>(work: () => Promise<T>): Promise<T> {
  const owner = crypto.randomUUID();
  const deadline = Date.now() + 4 * 60000;
  while (Date.now() < deadline) {
    const now = Date.now();
    const acquired = await redis.eval(acquireScript, 1, key, now,
      Number(process.env.GLOBAL_EXECUTION_CONCURRENCY || 2), now + 20 * 60000, owner);
    if (acquired === 1) {
      try { return await work(); }
      finally { await redis.zrem(key, owner); }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Execution capacity unavailable');
}
