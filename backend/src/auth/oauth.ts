import crypto from 'crypto';
import axios from 'axios';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

export type OAuthProvider = 'google' | 'github';
export type OAuthFailureReason = 'not_configured' | 'cancelled' | 'expired' | 'email_unverified' |
  'account_exists' | 'account_suspended' | 'provider_error';

export class OAuthFailure extends Error {
  constructor(public readonly reason: OAuthFailureReason) { super(reason); }
}

export const tokenHash = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');
export const randomToken = (): string => crypto.randomBytes(32).toString('base64url');
export function sameToken(a: string, b: string): boolean {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function publicUrl(value: string): URL {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.search || url.hash) {
    throw new OAuthFailure('not_configured');
  }
  return url;
}

export function frontendOrigin(): string {
  try { return publicUrl(process.env.FRONTEND_URL || 'http://localhost:3000').origin; }
  catch { throw new OAuthFailure('not_configured'); }
}

function realCredential(value: string | undefined): value is string {
  return Boolean(value?.trim() && !/(your[-_\s]|replace[-_\s]|placeholder|change[-_\s]?me|example|dummy|insert[-_\s]|[<>])/i.test(value));
}

export function providerConfiguration(provider: OAuthProvider) {
  const prefix = provider.toUpperCase();
  const clientId = process.env[`${prefix}_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]?.trim();
  if (!realCredential(clientId) || !realCredential(clientSecret)) throw new OAuthFailure('not_configured');
  try {
    frontendOrigin();
    const explicitCallback = process.env[`${prefix}_CALLBACK_URL`]?.trim();
    const callback = explicitCallback
      ? publicUrl(explicitCallback)
      : new URL(`/api/auth/${provider}/callback`, publicUrl(process.env.OAUTH_CALLBACK_BASE_URL || frontendOrigin()).origin);
    if (callback.pathname !== `/api/auth/${provider}/callback`) throw new OAuthFailure('not_configured');
    return { clientId, clientSecret, redirectUri: callback.toString() };
  } catch { throw new OAuthFailure('not_configured'); }
}

export function providerAvailability() {
  const enabled = (provider: OAuthProvider) => {
    try { providerConfiguration(provider); return true; } catch { return false; }
  };
  return { google: { enabled: enabled('google') }, github: { enabled: enabled('github') } };
}

export function authorizationUrl(provider: OAuthProvider, state: string, verifier: string): string {
  const { clientId, redirectUri } = providerConfiguration(provider);
  const url = new URL(provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://github.com/login/oauth/authorize');
  url.search = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code', state,
    scope: provider === 'google' ? 'openid email profile' : 'read:user user:email',
    code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}

const requestOptions = { timeout: 10_000, maxRedirects: 0, maxContentLength: 1024 * 1024, maxBodyLength: 16 * 1024 };
const profileSchema = z.object({
  id: z.string().min(1).max(255), email: z.string().email().max(320), name: z.string().max(200).optional(),
});
export type OAuthIdentity = z.infer<typeof profileSchema>;

// These endpoints are fixed provider URLs, never derived from a callback parameter.
// Google: https://developers.google.com/identity/protocols/oauth2/openid-connect
// GitHub: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
export async function exchangeIdentity(provider: OAuthProvider, code: string, verifier: string): Promise<OAuthIdentity> {
  const config = providerConfiguration(provider);
  const tokenResponse = await axios.post(
    provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://github.com/login/oauth/access_token',
    new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret,
      redirect_uri: config.redirectUri, code, code_verifier: verifier, grant_type: 'authorization_code' }).toString(),
    { ...requestOptions, headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  const token = z.object({ access_token: z.string().min(1).max(8192), token_type: z.string().optional() }).parse(tokenResponse.data);
  if (token.token_type && token.token_type.toLowerCase() !== 'bearer') throw new OAuthFailure('provider_error');
  const headers = { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' };
  if (provider === 'google') {
    // Identity is retrieved directly over authenticated HTTPS. No unverified ID-token decoding.
    const response = await axios.get('https://openidconnect.googleapis.com/v1/userinfo', { ...requestOptions, headers });
    const profile = z.object({ sub: z.string().min(1).max(255), email: z.string().email().max(320),
      email_verified: z.boolean(), name: z.string().max(200).optional() }).parse(response.data);
    if (!profile.email_verified) throw new OAuthFailure('email_unverified');
    return profileSchema.parse({ id: profile.sub, email: profile.email.toLowerCase(), name: profile.name });
  }
  const githubHeaders = { ...headers, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'CodeForge' };
  const [userResponse, emailsResponse] = await Promise.all([
    axios.get('https://api.github.com/user', { ...requestOptions, headers: githubHeaders }),
    axios.get('https://api.github.com/user/emails', { ...requestOptions, headers: githubHeaders, params: { per_page: 100 } }),
  ]);
  const profile = z.object({ id: z.number().int().positive().safe(), login: z.string().min(1).max(100),
    name: z.string().max(200).nullable().optional() }).parse(userResponse.data);
  const emails = z.array(z.object({ email: z.string().email().max(320), verified: z.boolean(), primary: z.boolean() })).parse(emailsResponse.data);
  const email = emails.find(value => value.primary && value.verified) || emails.find(value => value.verified);
  if (!email) throw new OAuthFailure('email_unverified');
  return { id: String(profile.id), email: email.email.toLowerCase(), name: profile.name || profile.login };
}

export async function findOrCreateOAuthUser(provider: OAuthProvider, identity: OAuthIdentity) {
  const existing = await prisma.user.findUnique({ where: provider === 'google' ? { googleId: identity.id } : { githubId: identity.id } });
  if (existing) {
    if (existing.isBanned) throw new OAuthFailure('account_suspended');
    return existing;
  }
  // Email is contact information, not permission to take over an existing account.
  const emailOwner = await prisma.user.findFirst({ where: { email: { equals: identity.email, mode: 'insensitive' } } });
  if (emailOwner) throw new OAuthFailure('account_exists');
  const base = identity.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 11) || 'coder';
  try {
    return await prisma.user.create({ data: {
      email: identity.email, username: `${base}_${crypto.randomBytes(4).toString('hex')}`, emailVerified: true,
      ...(provider === 'google' ? { googleId: identity.id } : { githubId: identity.id }),
      isAdmin: false, isPremium: false,
      profile: { create: { displayName: identity.name } }, stats: { create: {} }, streak: { create: {} },
      notificationSettings: { create: {} },
    } });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') throw new OAuthFailure('account_exists');
    throw error;
  }
}

export async function linkOAuthAccount(provider: OAuthProvider, identity: OAuthIdentity, userId: string): Promise<void> {
  const [owner, user] = await Promise.all([
    prisma.user.findUnique({ where: provider === 'google' ? { googleId: identity.id } : { githubId: identity.id } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  if (!user || user.isBanned) throw new OAuthFailure('account_suspended');
  if (owner && owner.id !== userId) throw new OAuthFailure('account_exists');
  const connectedId = provider === 'google' ? user.googleId : user.githubId;
  if (connectedId && connectedId !== identity.id) throw new OAuthFailure('account_exists');
  try {
    await prisma.user.update({ where: { id: userId }, data: provider === 'google' ? { googleId: identity.id } : { githubId: identity.id } });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') throw new OAuthFailure('account_exists');
    throw error;
  }
}
