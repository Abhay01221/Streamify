import { Response } from 'express';

export function secureCookies(): boolean {
  return process.env.COOKIE_SECURE === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false');
}

export function setTokenCookies(res: Response, accessToken: string, refreshToken: string, rememberMe = false): void {
  res.cookie('accessToken', accessToken, {
    httpOnly: true, secure: secureCookies(), sameSite: 'lax', path: '/', maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: secureCookies(), sameSite: 'lax', path: '/api/auth',
    maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : undefined,
  });
}
