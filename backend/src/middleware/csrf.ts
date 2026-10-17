import { RequestHandler } from 'express';
import { AppError } from './errorHandler';

// Exact Origin verification plus a required custom header stops cross-site forms
// and fetches. CORS permits this header only for the configured frontend.
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/premium/webhook') return next();
  const origin = req.get('Origin');
  if ((origin && origin !== process.env.FRONTEND_URL) || req.get('X-CodeForge-CSRF') !== '1') {
    return next(new AppError('Request origin verification failed', 403));
  }
  next();
};
