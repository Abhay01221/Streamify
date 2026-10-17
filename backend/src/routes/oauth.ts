import { Router, Response } from 'express';
import { authenticator } from 'otplib';
import { z } from 'zod';
import { redis } from '../utils/redis';
import { prisma } from '../utils/prisma';
import { authenticate, generateTokens, optionalAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { secureCookies, setTokenCookies } from '../auth/cookies';
import { authorizationUrl, exchangeIdentity, findOrCreateOAuthUser, frontendOrigin, linkOAuthAccount, OAuthFailure,
  OAuthFailureReason, OAuthProvider, providerAvailability, providerConfiguration, randomToken, sameToken, tokenHash } from '../auth/oauth';

const router = Router();
const stateSchema = z.object({ provider: z.enum(['google', 'github']), browserHash: z.string(), verifier: z.string(), redirectUri: z.string(), linkingUserId: z.string().optional() });
const cookieOptions = (path: string) => ({ httpOnly: true, secure: secureCookies(), sameSite: 'lax' as const, path });
const stateCookie = (provider: OAuthProvider) => `oauth_${provider}`;
const callbackPath = (provider: OAuthProvider) => `/api/auth/${provider}/callback`;
const twoFactorPath = '/api/auth/oauth/2fa';

function loginRedirect(res: Response, outcome: 'success' | 'two_factor' | 'error', reason?: OAuthFailureReason): void {
  // No caller-supplied return URL; secrets and temporary credentials never enter the URL.
  const target = new URL('/login', frontendOrigin());
  target.searchParams.set('oauth', outcome);
  if (reason) target.searchParams.set('reason', reason);
  res.redirect(target.toString());
}

router.get('/providers', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(providerAvailability());
});

router.get('/connections', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { googleId: true, githubId: true } });
    if (!user) throw new AppError('Account not found.', 404);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ google: { connected: Boolean(user.googleId) }, github: { connected: Boolean(user.githubId) } });
  } catch (error) { next(error); }
});

for (const provider of ['google', 'github'] as const) {
  router.get(`/${provider}`, authRateLimiter, optionalAuth, async (req, res, next) => {
    try {
      const linking = req.query.link === '1';
      if (linking && !req.user) throw new AppError('Sign in before connecting another account.', 401);
      const config = providerConfiguration(provider);
      const state = randomToken(), binding = randomToken(), verifier = randomToken();
      await redis.setex(`oauth:state:${tokenHash(state)}`, 600, JSON.stringify({ provider,
        browserHash: tokenHash(binding), verifier, redirectUri: config.redirectUri,
        ...(linking ? { linkingUserId: req.user!.id } : {}) }));
      res.cookie(stateCookie(provider), binding, { ...cookieOptions(callbackPath(provider)), maxAge: 600_000 });
      res.setHeader('Cache-Control', 'no-store');
      res.redirect(authorizationUrl(provider, state, verifier));
    } catch (error) {
      next(error instanceof AppError ? error : error instanceof OAuthFailure ? new AppError('This sign-in provider has not been configured by the administrator.', 503) : new AppError('Sign-in is temporarily unavailable. Please try again.', 503));
    }
  });

  router.get(`/${provider}/callback`, authRateLimiter, optionalAuth, async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const config = providerConfiguration(provider);
      const state = z.string().regex(/^[A-Za-z0-9_-]{43}$/).safeParse(req.query.state);
      const binding = req.cookies?.[stateCookie(provider)];
      if (!state.success || typeof binding !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(binding)) throw new OAuthFailure('expired');
      const key = `oauth:state:${tokenHash(state.data)}`;
      const saved = await redis.get(key);
      if (!saved) throw new OAuthFailure('expired');
      const parsed = stateSchema.safeParse(JSON.parse(saved));
      if (!parsed.success || parsed.data.provider !== provider || parsed.data.redirectUri !== config.redirectUri ||
        !sameToken(parsed.data.browserHash, tokenHash(binding))) throw new OAuthFailure('expired');
      if (parsed.data.linkingUserId && parsed.data.linkingUserId !== req.user?.id) throw new OAuthFailure('expired');
      // Browser binding is checked before the atomic claim. A forged callback cannot consume another browser's login.
      const claimed = await redis.getdel(key);
      if (!claimed || claimed !== saved) throw new OAuthFailure('expired');
      res.clearCookie(stateCookie(provider), cookieOptions(callbackPath(provider)));
      if (req.query.error) throw new OAuthFailure('cancelled');
      const code = z.string().min(1).max(2048).safeParse(req.query.code);
      if (!code.success) throw new OAuthFailure('provider_error');
      const identity = await exchangeIdentity(provider, code.data, parsed.data.verifier);
      if (parsed.data.linkingUserId) {
        await linkOAuthAccount(provider, identity, parsed.data.linkingUserId);
        res.redirect(new URL('/settings?oauth=linked', frontendOrigin()).toString());
        return;
      }
      const user = await findOrCreateOAuthUser(provider, identity);
      if (user.twoFactorEnabled) {
        const challenge = randomToken();
        await redis.setex(`oauth:2fa:${tokenHash(challenge)}`, 300, user.id);
        res.cookie('oauthTwoFactor', challenge, { ...cookieOptions(twoFactorPath), maxAge: 300_000 });
        loginRedirect(res, 'two_factor');
        return;
      }
      const tokens = await generateTokens(user);
      setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
      loginRedirect(res, 'success');
    } catch (error) {
      // Never expose provider responses or Axios errors: they can contain tokens/client secrets.
      try { loginRedirect(res, 'error', error instanceof OAuthFailure ? error.reason : 'provider_error'); }
      catch { next(new AppError('Sign-in callback URL is not configured correctly.', 503)); }
    }
  });
}

router.post('/oauth/2fa/login', authRateLimiter, async (req, res, next) => {
  try {
    const { code } = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
    const challenge = req.cookies?.oauthTwoFactor;
    if (typeof challenge !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw new AppError('Sign-in expired. Please start again.', 401);
    const key = `oauth:2fa:${tokenHash(challenge)}`;
    const userId = await redis.get(key);
    if (!userId) throw new AppError('Sign-in expired. Please start again.', 401);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isBanned || !user.twoFactorEnabled || !user.twoFactorSecret) throw new AppError('Sign-in is no longer valid.', 401);
    if (!authenticator.verify({ token: code, secret: user.twoFactorSecret })) throw new AppError('Invalid two-factor code.', 400);
    if (await redis.getdel(key) !== userId) throw new AppError('Sign-in expired. Please start again.', 401);
    res.clearCookie('oauthTwoFactor', cookieOptions(twoFactorPath));
    const tokens = await generateTokens(user);
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({ user: { id: user.id, email: user.email, username: user.username, isAdmin: user.isAdmin,
      isPremium: user.isPremium, emailVerified: user.emailVerified }, accessToken: tokens.accessToken });
  } catch (error) { next(error); }
});

export default router;
