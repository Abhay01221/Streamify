import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const isProd = process.env.NODE_ENV === 'production';

const transports: winston.transport[] = [
  // Always log to console — in Docker, stdout is captured by the container runtime
  new winston.transports.Console({
    format: isProd
      ? combine(timestamp(), errors({ stack: true }), json())
      : combine(colorize(), simple()),
  }),
];

// File transports only in local development (no persistent volume in containers)
if (!isProd) {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

export const logger = winston.createLogger({
  // info in production, debug in development (override with LOG_LEVEL env var)
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'coders-api' },
  transports,
});

/**
 * Returns a child logger with the submissionId bound to every log entry.
 * Use this inside the queue worker for correlated log traces.
 *
 * Example:
 *   const log = submissionLogger('abc123');
 *   log.info('Processing started');
 *   // → { message: 'Processing started', submissionId: 'abc123', ... }
 */
export const submissionLogger = (submissionId: string) =>
  logger.child({ submissionId });
