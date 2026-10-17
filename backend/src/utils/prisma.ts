import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger';

const isProd = process.env.NODE_ENV === 'production';

// In production: only surface errors and warnings.
// In development: also log queries (opt-in via DEBUG=prisma:query).
const logConfig: (Prisma.LogLevel | Prisma.LogDefinition)[] = isProd
  ? [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ]
  : [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ];

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: logConfig });

if (!isProd) {
  globalForPrisma.prisma = prisma;
}

prisma.$on('error' as never, (e) => {
  logger.error('Prisma error:', e);
});

prisma.$on('warn' as never, (e) => {
  logger.warn('Prisma warning:', e);
});

// Only wire up query logging in development
if (!isProd) {
  prisma.$on('query' as never, (e: { query: string; duration: number }) => {
    logger.debug(`Prisma query (${e.duration}ms): ${e.query}`);
  });
}

export default prisma;
