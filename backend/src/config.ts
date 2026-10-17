import 'dotenv/config';
import { z } from 'zod';

export function validateConfiguration(env: NodeJS.ProcessEnv = process.env) {
  return z.object({
    DATABASE_URL: z.string().url(), REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(32), JWT_REFRESH_SECRET: z.string().min(32),
    FRONTEND_URL: z.string().url(), JUDGE0_URL: z.string().url(),
    MAX_SOURCE_BYTES: z.coerce.number().int().min(1024).max(262144).default(65536),
    MAX_OUTPUT_BYTES: z.coerce.number().int().min(1024).max(262144).default(65536),
    GLOBAL_EXECUTION_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(2),
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
    MAX_USER_CONCURRENT_JOBS: z.coerce.number().int().min(1).max(10).default(2),
    EXECUTION_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(60000),
  }).refine(v => v.JWT_SECRET !== v.JWT_REFRESH_SECRET, 'JWT secrets must differ').parse(env);
}
