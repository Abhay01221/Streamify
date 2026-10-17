import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import axios from 'axios';
import { authenticator } from 'otplib';
import oauth from '../src/routes/oauth';
import { errorHandler } from '../src/middleware/errorHandler';
import { generateTokens } from '../src/middleware/auth';
import { prisma } from '../src/utils/prisma';
import { redis } from '../src/utils/redis';
import { exchangeIdentity, providerAvailability, tokenHash } from '../src/auth/oauth';

jest.mock('axios');
jest.mock('otplib', () => ({ authenticator: { verify: jest.fn() } }));
jest.mock('../src/middleware/auth', () => ({ generateTokens: jest.fn(),
  optionalAuth: (req: { headers: Record<string, string>; user?: unknown }, _res: unknown, next: () => void) => {
    if (req.headers['x-test-user']) req.user = { id: req.headers['x-test-user'] }; next();
  },
  authenticate: (req: { headers: Record<string, string>; user?: unknown }, res: { status: (code: number) => { json: (data: unknown) => void } }, next: () => void) => {
    if (!req.headers['x-test-user']) { res.status(401).json({ error: 'Authentication required' }); return; }
    req.user = { id: req.headers['x-test-user'] }; next();
  },
}));
jest.mock('../src/middleware/rateLimiter', () => ({ authRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next() }));
jest.mock('../src/utils/prisma', () => ({ prisma: { user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() } } }));
jest.mock('../src/utils/redis', () => ({ redis: { setex: jest.fn(), get: jest.fn(), getdel: jest.fn() } }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
const app = express();
app.use(express.json(), cookieParser()); app.use('/api/auth', oauth); app.use(errorHandler);
const store = new Map<string, string>();
const envKeys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
  'OAUTH_CALLBACK_BASE_URL', 'GOOGLE_CALLBACK_URL', 'GITHUB_CALLBACK_URL', 'FRONTEND_URL', 'COOKIE_SECURE'];
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
const user = { id: 'user-id', email: 'learner@test.dev', username: 'learner', isAdmin: false,
  isPremium: false, emailVerified: true, isBanned: false, twoFactorEnabled: false, twoFactorSecret: null };
const cookie = (res: { headers: Record<string, string[]> }, name: string): string =>
  res.headers['set-cookie'].find(value => value.startsWith(`${name}=`))!.split(';')[0];

beforeEach(() => {
  jest.clearAllMocks(); store.clear();
  for (const key of envKeys) delete process.env[key];
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.COOKIE_SECURE = 'false';
  process.env.GOOGLE_CLIENT_ID = 'configured.apps.googleusercontent.com';
  process.env.GOOGLE_CLIENT_SECRET = 'configured-google-secret';
  process.env.GITHUB_CLIENT_ID = 'configuredgithubid';
  process.env.GITHUB_CLIENT_SECRET = 'configured-github-secret';
  (redis.setex as jest.Mock).mockImplementation(async (key: string, _ttl: number, value: string) => { store.set(key, value); return 'OK'; });
  (redis.get as jest.Mock).mockImplementation(async (key: string) => store.get(key) || null);
  (redis.getdel as jest.Mock).mockImplementation(async (key: string) => { const value = store.get(key); store.delete(key); return value || null; });
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.user.create as jest.Mock).mockResolvedValue(user);
  (prisma.user.update as jest.Mock).mockResolvedValue(user);
  (generateTokens as jest.Mock).mockResolvedValue({ accessToken: 'app-access', refreshToken: 'app-refresh' });
  (authenticator.verify as jest.Mock).mockReturnValue(true);
  (axios.post as jest.Mock).mockReset().mockResolvedValue({ data: { access_token: 'provider-access', token_type: 'Bearer' } });
  (axios.get as jest.Mock).mockReset().mockImplementation(async (url: string) => {
    if (url.includes('userinfo')) return { data: { sub: 'google-user-123', email: 'Learner@Test.dev', email_verified: true, name: 'Learner' } };
    if (url.endsWith('/emails')) return { data: [{ email: 'learner@test.dev', verified: true, primary: true }] };
    return { data: { id: 12345, login: 'learner', name: 'Learner', email: 'untrusted-profile-email@test.dev' } };
  });
});
afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

async function begin(provider = 'google') {
  const response = await request(app).get(`/api/auth/${provider}`);
  expect(response.status).toBe(302);
  const url = new URL(response.headers.location);
  return { response, state: url.searchParams.get('state')!, binding: cookie(response, `oauth_${provider}`), url };
}

test('provider discovery exposes only availability and rejects placeholder secrets', async () => {
  process.env.GOOGLE_CLIENT_ID = 'your-google-client-id'; delete process.env.GITHUB_CLIENT_SECRET;
  const response = await request(app).get('/api/auth/providers');
  expect(response.body).toEqual({ google: { enabled: false }, github: { enabled: false } });
  expect(response.headers['cache-control']).toBe('no-store');
  const start = await request(app).get('/api/auth/google');
  expect(start.status).toBe(503); expect(axios.post).not.toHaveBeenCalled();
});

test.each(['google', 'github'])('%s authorization binds state to an HttpOnly cookie and uses PKCE with fixed callbacks', async provider => {
  const { response, state, url } = await begin(provider);
  expect(url.hostname).toBe(provider === 'google' ? 'accounts.google.com' : 'github.com');
  expect(url.searchParams.get('redirect_uri')).toBe(`http://localhost:3000/api/auth/${provider}/callback`);
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  const stored = JSON.parse(store.get(`oauth:state:${tokenHash(state)}`)!);
  expect(url.searchParams.get('code_challenge')).toBe(crypto.createHash('sha256').update(stored.verifier).digest('base64url'));
  expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
  expect(response.headers['set-cookie'][0]).toContain(`Path=/api/auth/${provider}/callback`);
  expect(redis.setex).toHaveBeenCalledWith(expect.any(String), 600, expect.any(String));
});

test('callback configuration uses explicit fixed URLs and never request Host headers', async () => {
  process.env.GITHUB_CALLBACK_URL = 'https://api.codeforge.test/api/auth/github/callback';
  const response = await request(app).get('/api/auth/github').set('Host', 'evil.test');
  expect(new URL(response.headers.location).searchParams.get('redirect_uri')).toBe(process.env.GITHUB_CALLBACK_URL);
  process.env.GITHUB_CALLBACK_URL = 'https://api.codeforge.test/evil?return=https://evil.test';
  expect(providerAvailability().github.enabled).toBe(false);
});

test('unsafe nonlocal plaintext origins disable social login', () => {
  process.env.FRONTEND_URL = 'http://public.codeforge.test';
  expect(providerAvailability()).toEqual({ google: { enabled: false }, github: { enabled: false } });
});

test.each(['google', 'github'])('%s valid callback creates an ordinary account and sets only app tokens', async provider => {
  const { state, binding } = await begin(provider);
  const response = await request(app).get(`/api/auth/${provider}/callback`).query({ state, code: 'provider-code', returnTo: 'https://evil.test' }).set('Cookie', binding);
  expect(response.headers.location).toBe('http://localhost:3000/login?oauth=success');
  expect(axios.post).toHaveBeenCalledWith(provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://github.com/login/oauth/access_token',
    expect.stringContaining('code_verifier='), expect.objectContaining({ maxRedirects: 0, timeout: 10_000 }));
  const data = (prisma.user.create as jest.Mock).mock.calls[0][0].data;
  expect(data.email).toBe('learner@test.dev');
  expect(data.isAdmin).toBe(false); expect(data.isPremium).toBe(false);
  expect(data.username).toMatch(/^[a-z0-9_]{3,20}$/);
  expect(data[`${provider}Id`]).toBe(provider === 'google' ? 'google-user-123' : '12345');
  expect(cookie(response, 'accessToken')).toBe('accessToken=app-access');
  expect(cookie(response, 'refreshToken')).toBe('refreshToken=app-refresh');
  expect(JSON.stringify(response.headers)).not.toContain('provider-access');
});

test('callbacks require the initiating browser and do not consume state on binding mismatch', async () => {
  const { state, binding } = await begin();
  const forged = await request(app).get('/api/auth/google/callback').query({ state, code: 'attacker-code' }).set('Cookie', `oauth_google=${'a'.repeat(43)}`);
  expect(forged.headers.location).toContain('reason=expired');
  expect(redis.getdel).not.toHaveBeenCalled(); expect(axios.post).not.toHaveBeenCalled();
  const response = await request(app).get('/api/auth/google/callback').query({ state, code: 'real-code' }).set('Cookie', binding);
  expect(response.headers.location).toContain('oauth=success');
});

test('callbacks reject missing cookies, malformed state, and array-valued parameters', async () => {
  const { state, binding } = await begin();
  const missing = await request(app).get('/api/auth/google/callback').query({ state, code: 'code' });
  expect(missing.headers.location).toContain('reason=expired');
  const malformed = await request(app).get('/api/auth/google/callback').query({ state: ['bad', state], code: 'code' }).set('Cookie', binding);
  expect(malformed.headers.location).toContain('reason=expired');
  expect(axios.post).not.toHaveBeenCalled();
});

test('a successful state can be claimed only once', async () => {
  const { state, binding } = await begin();
  const first = await request(app).get('/api/auth/google/callback').query({ state, code: 'code' }).set('Cookie', binding);
  const replay = await request(app).get('/api/auth/google/callback').query({ state, code: 'code' }).set('Cookie', binding);
  expect(first.headers.location).toContain('oauth=success');
  expect(replay.headers.location).toContain('reason=expired'); expect(generateTokens).toHaveBeenCalledTimes(1);
});

test('provider cancellation consumes the browser-bound state without exchanging credentials', async () => {
  const { state, binding } = await begin();
  const response = await request(app).get('/api/auth/google/callback').query({ state, error: 'access_denied', error_description: 'UNTRUSTED_ERROR' }).set('Cookie', binding);
  expect(response.headers.location).toBe('http://localhost:3000/login?oauth=error&reason=cancelled');
  expect(axios.post).not.toHaveBeenCalled(); expect(store.size).toBe(0);
});

test('Google requires a provider-verified email and ignores untrusted token claims', async () => {
  (axios.get as jest.Mock).mockResolvedValue({ data: { sub: 'google-id', email: 'learner@test.dev', email_verified: false } });
  await expect(exchangeIdentity('google', 'code', 'verifier')).rejects.toMatchObject({ reason: 'email_unverified' });
});

test('GitHub uses the email endpoint and prefers a verified primary address', async () => {
  (axios.get as jest.Mock).mockImplementation(async (url: string) => url.endsWith('/emails') ? { data: [
    { email: 'unverified@test.dev', primary: true, verified: false },
    { email: 'secondary@test.dev', primary: false, verified: true },
    { email: 'primary@test.dev', primary: true, verified: true },
  ] } : { data: { id: 12345, login: 'learner', email: 'fake@test.dev' } });
  expect((await exchangeIdentity('github', 'code', 'verifier')).email).toBe('primary@test.dev');
});

test('GitHub rejects accounts with no verified email even if their public profile has an email', async () => {
  (axios.get as jest.Mock).mockImplementation(async (url: string) => url.endsWith('/emails') ? { data: [
    { email: 'unverified@test.dev', primary: true, verified: false },
  ] } : { data: { id: 12345, login: 'learner', email: 'fake@test.dev' } });
  await expect(exchangeIdentity('github', 'code', 'verifier')).rejects.toMatchObject({ reason: 'email_unverified' });
});

test('matching email cannot automatically link to an existing password account', async () => {
  (prisma.user.findFirst as jest.Mock).mockResolvedValue(user);
  const { state, binding } = await begin();
  const response = await request(app).get('/api/auth/google/callback').query({ state, code: 'code' }).set('Cookie', binding);
  expect(response.headers.location).toContain('reason=account_exists');
  expect(prisma.user.create).not.toHaveBeenCalled(); expect(generateTokens).not.toHaveBeenCalled();
});

test('existing provider accounts are resolved by immutable provider ID even after email changes', async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
  const { state, binding } = await begin();
  const response = await request(app).get('/api/auth/google/callback').query({ state, code: 'code' }).set('Cookie', binding);
  expect(response.headers.location).toContain('oauth=success');
  expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { googleId: 'google-user-123' } });
  expect(prisma.user.findFirst).not.toHaveBeenCalled(); expect(prisma.user.create).not.toHaveBeenCalled();
});

test('banned social accounts cannot obtain tokens', async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...user, isBanned: true });
  const { state, binding } = await begin();
  const response = await request(app).get('/api/auth/google/callback').query({ state, code: 'code' }).set('Cookie', binding);
  expect(response.headers.location).toContain('reason=account_suspended'); expect(generateTokens).not.toHaveBeenCalled();
});

test('provider error payloads never appear in the callback redirect or response', async () => {
  (axios.post as jest.Mock).mockRejectedValue(new Error('client_secret=SECRET_AND_PROVIDER_TOKEN'));
  const { state, binding } = await begin();
  const response = await request(app).get('/api/auth/google/callback').query({ state, code: 'code' }).set('Cookie', binding);
  expect(response.headers.location).toBe('http://localhost:3000/login?oauth=error&reason=provider_error');
  expect(JSON.stringify(response.headers) + response.text).not.toContain('SECRET_AND_PROVIDER_TOKEN');
});

test('social login honors 2FA with an HttpOnly cookie instead of a URL token', async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...user, twoFactorEnabled: true, twoFactorSecret: 'totp-secret' });
  const { state, binding } = await begin();
  const response = await request(app).get('/api/auth/google/callback').query({ state, code: 'code' }).set('Cookie', binding);
  expect(response.headers.location).toBe('http://localhost:3000/login?oauth=two_factor');
  expect(generateTokens).not.toHaveBeenCalled();
  const challengeCookie = cookie(response, 'oauthTwoFactor');
  expect(response.headers['set-cookie'].find((value: string) => value.startsWith('oauthTwoFactor='))).toContain('HttpOnly');
  const valid = await request(app).post('/api/auth/oauth/2fa/login').set('Cookie', challengeCookie).send({ code: '123456' });
  expect(valid.status).toBe(200); expect(valid.body.user.id).toBe(user.id);
  const replay = await request(app).post('/api/auth/oauth/2fa/login').set('Cookie', challengeCookie).send({ code: '123456' });
  expect(replay.status).toBe(401); expect(generateTokens).toHaveBeenCalledTimes(1);
});

test('invalid 2FA codes preserve the challenge for retry without creating a session', async () => {
  const challenge = 'b'.repeat(43);
  store.set(`oauth:2fa:${tokenHash(challenge)}`, user.id);
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...user, twoFactorEnabled: true, twoFactorSecret: 'totp-secret' });
  (authenticator.verify as jest.Mock).mockReturnValue(false);
  const response = await request(app).post('/api/auth/oauth/2fa/login').set('Cookie', `oauthTwoFactor=${challenge}`).send({ code: '123456' });
  expect(response.status).toBe(400); expect(redis.getdel).not.toHaveBeenCalled(); expect(generateTokens).not.toHaveBeenCalled();
});

test('2FA rejects expired, missing, banned and no-longer-enabled accounts', async () => {
  expect((await request(app).post('/api/auth/oauth/2fa/login').send({ code: '123456' })).status).toBe(401);
  const challenge = 'b'.repeat(43);
  store.set(`oauth:2fa:${tokenHash(challenge)}`, user.id);
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...user, isBanned: true, twoFactorEnabled: true, twoFactorSecret: 'totp-secret' });
  expect((await request(app).post('/api/auth/oauth/2fa/login').set('Cookie', `oauthTwoFactor=${challenge}`).send({ code: '123456' })).status).toBe(401);
  expect(generateTokens).not.toHaveBeenCalled();
});

test('database uniqueness races do not implicitly link another account', async () => {
  (prisma.user.create as jest.Mock).mockRejectedValue({ code: 'P2002' });
  const { state, binding } = await begin();
  const response = await request(app).get('/api/auth/google/callback').query({ state, code: 'code' }).set('Cookie', binding);
  expect(response.headers.location).toContain('reason=account_exists'); expect(generateTokens).not.toHaveBeenCalled();
});

test('connecting an account requires an authenticated initiating user', async () => {
  const response = await request(app).get('/api/auth/google?link=1&linkingUserId=attacker');
  expect(response.status).toBe(401); expect(redis.setex).not.toHaveBeenCalled();
});

test('explicit linking stores the session user, changes only the provider field and preserves the current session', async () => {
  const response = await request(app).get('/api/auth/google?link=1&linkingUserId=attacker').set('X-Test-User', user.id);
  const state = new URL(response.headers.location).searchParams.get('state')!;
  expect(JSON.parse(store.get(`oauth:state:${tokenHash(state)}`)!).linkingUserId).toBe(user.id);
  (prisma.user.findUnique as jest.Mock).mockImplementation(async (query: { where: { id?: string } }) => query.where.id ? user : null);
  const result = await request(app).get('/api/auth/google/callback').query({ state, code: 'code' })
    .set('Cookie', cookie(response, 'oauth_google')).set('X-Test-User', user.id);
  expect(result.headers.location).toBe('http://localhost:3000/settings?oauth=linked');
  expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: user.id }, data: { googleId: 'google-user-123' } });
  expect(generateTokens).not.toHaveBeenCalled(); expect(prisma.user.create).not.toHaveBeenCalled();
});

test.each([undefined, 'another-user'])('link callbacks reject expired or switched sessions (%s) before consuming state', async identity => {
  const response = await request(app).get('/api/auth/google?link=1').set('X-Test-User', user.id);
  const state = new URL(response.headers.location).searchParams.get('state')!;
  let callback = request(app).get('/api/auth/google/callback').query({ state, code: 'code' }).set('Cookie', cookie(response, 'oauth_google'));
  if (identity) callback = callback.set('X-Test-User', identity);
  const result = await callback;
  expect(result.headers.location).toContain('reason=expired');
  expect(redis.getdel).not.toHaveBeenCalled(); expect(prisma.user.update).not.toHaveBeenCalled();
});

test('a provider identity already owned by another user cannot be linked', async () => {
  const response = await request(app).get('/api/auth/github?link=1').set('X-Test-User', user.id);
  const state = new URL(response.headers.location).searchParams.get('state')!;
  (prisma.user.findUnique as jest.Mock).mockImplementation(async (query: { where: { id?: string } }) => query.where.id ? user : { ...user, id: 'other-user' });
  const result = await request(app).get('/api/auth/github/callback').query({ state, code: 'code' })
    .set('Cookie', cookie(response, 'oauth_github')).set('X-Test-User', user.id);
  expect(result.headers.location).toContain('reason=account_exists'); expect(prisma.user.update).not.toHaveBeenCalled();
});

test('connected-account discovery requires authentication and returns only flags', async () => {
  expect((await request(app).get('/api/auth/connections')).status).toBe(401);
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ googleId: 'google-id', githubId: null });
  const result = await request(app).get('/api/auth/connections').set('X-Test-User', user.id);
  expect(result.body).toEqual({ google: { connected: true }, github: { connected: false } });
});
