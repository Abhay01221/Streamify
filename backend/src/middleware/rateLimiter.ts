import { RequestHandler } from 'express';
import { redis } from '../utils/redis';
import { AppError } from './errorHandler';
const increment = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n`;
export function sharedRateLimit(scope: string, windowSeconds: number, maximum: number, byUser = false): RequestHandler {
  return async (req, res, next) => {
    try {
      const identity = byUser ? req.user?.id || req.ip : req.ip;
      const count = Number(await redis.eval(increment, 1, `limit:${scope}:${identity}`, windowSeconds));
      res.setHeader('RateLimit-Limit', maximum);
      res.setHeader('RateLimit-Remaining', Math.max(0, maximum - count));
      if (count > maximum) { res.setHeader('Retry-After', windowSeconds); return next(new AppError('Too many requests. Please try again later.', 429)); }
      next();
    } catch { next(new AppError('Request limiting service unavailable', 503)); }
  };
}
export const rateLimiter = sharedRateLimit('api', 900, 500);
export const authRateLimiter = sharedRateLimit('auth', 900, 10);
export const submissionRateLimiter = sharedRateLimit('execution', 3600, Number(process.env.EXECUTIONS_PER_HOUR || 30), true);
// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        isAdmin: boolean;
        isPremium: boolean;
      };
    }
  }
}