import { openapi } from './openapi';
import { validateConfiguration } from './config';
import { csrfProtection } from './middleware/csrf';
import crypto from 'crypto';
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { setupSocketIO } from './socket';
import { setIO } from './socket/emitter';

// Routes
import authRoutes from './routes/auth';
import problemRoutes from './routes/problems';
import submissionRoutes from './routes/submissions';
import contestRoutes from './routes/contests';
import userRoutes from './routes/users';
import studyPlanRoutes from './routes/studyPlans';
import leaderboardRoutes from './routes/leaderboard';
import tagRoutes from './routes/tags';
import companyRoutes from './routes/companies';
import discussRoutes from './routes/discuss';
import notificationRoutes from './routes/notifications';
import premiumRoutes from './routes/premium';
import adminRoutes from './routes/admin';
import settingsRoutes from './routes/settings';
import contentAdminRoutes from './routes/contentAdmin';
import tutorRoutes from './routes/tutor';
import oauthRoutes from './routes/oauth';

validateConfiguration();
const app = express();

app.set('trust proxy', 1);
app.use((_req, res, next) => { res.setHeader('X-Request-ID', crypto.randomUUID()); next(); });

const server = http.createServer(app);


// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  path: '/ws',
});

setupSocketIO(io);

// Register the io instance in the emitter BEFORE the queue worker starts,
// so that submissionQueue can emit events without a circular import.
setIO(io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Handled by frontend
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CodeForge-CSRF'],
}));

// Body parsing
app.use(express.json({ limit: '256kb', verify: (req, _res, buffer) => { (req as typeof req & { rawBody?: string }).rawBody = buffer.toString('utf8'); } }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));
app.use(cookieParser());
app.use(compression());

// Logging
app.use(morgan(':res[X-Request-ID] :method :url :status :response-time ms', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Rate limiting
app.use('/api/', rateLimiter, csrfProtection);

// ── Health & Readiness probes ──────────────────────────────
// /health — liveness: always 200 if the process is alive
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// /ready — readiness: checks all downstream dependencies
app.get('/ready', async (_req, res) => {
  const checks: Record<string, 'ok' | 'fail'> = {
    db: 'fail',
    redis: 'fail',
    queue: 'fail',
    execution: 'fail',
    worker: 'fail',
  };

  // PostgreSQL
  try {
    const { prisma: db } = await import('./utils/prisma');
    await db.$queryRaw`SELECT 1`;
    checks.db = 'ok';
  } catch { /* fail */ }

  // Redis
  try {
    const { redis: redisClient } = await import('./utils/redis');
    const pong = await redisClient.ping();
    if (pong === 'PONG') checks.redis = 'ok';
  } catch { /* fail */ }

  // Bull queue (connected = redis ok + queue client ok)
  try {
    const { submissionQueue } = await import('./queue/submissionQueue');
    await submissionQueue.isReady();
    checks.queue = 'ok';
  } catch { /* fail */ }

  try {
    const { executionProvider } = await import('./execution/provider');
    await executionProvider.health(); checks.execution = 'ok';
  } catch { /* fail */ }
  try {
    const { redis } = await import('./utils/redis');
    if (await redis.get('worker:heartbeat')) checks.worker = 'ok';
  } catch { /* fail */ }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'degraded',
    checks,
  });
});

app.get('/api/metrics', async (_req, res, next) => {
  try {
    const { prisma } = await import('./utils/prisma');
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const [problems, users, submissionsToday] = await Promise.all([
      prisma.problem.count({ where: { isActive: true } }), prisma.user.count(),
      prisma.submission.count({ where: { isRun: false, createdAt: { gte: today } } }),
    ]);
    res.json({ problems, users, submissionsToday });
  } catch (err) { next(err); }
});

app.get('/api/openapi.json', (_req, res) => { res.json(openapi); });

// API Routes
app.use('/api/auth', oauthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/discuss', discussRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/admin/content', contentAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tutor', tutorRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 Coders API running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ── Graceful shutdown ──────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Drain the Bull queue (stop accepting new jobs, finish current ones)
      const { submissionQueue } = await import('./queue/submissionQueue');
      await submissionQueue.pause(true); // local pause — don't accept new jobs
      logger.info('Submission queue paused');
    } catch (err) {
      logger.warn('Could not pause submission queue:', err);
    }

    try {
      const { prisma: db } = await import('./utils/prisma');
      await db.$disconnect();
      logger.info('Prisma disconnected');
    } catch (err) {
      logger.warn('Prisma disconnect error:', err);
    }

    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force exit after 15 s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 15000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled promise rejections so they don't silently swallow errors
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

export { io };
export default app;
