import { userStatistics } from '../services/statistics';
import { setTokenCookies } from '../auth/cookies';
import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';
import { AppError } from '../middleware/errorHandler';
import { authenticate, generateTokens, hashToken } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { sendEmail } from '../utils/email';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(72).refine(v => Buffer.byteLength(v) <= 72, 'Password exceeds 72 bytes'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(72).refine(v => Buffer.byteLength(v) <= 72, 'Password exceeds 72 bytes'),
});

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const { email, username, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      throw new AppError(
        existing.email === email ? 'Email already in use' : 'Username taken',
        409
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        emailVerifyToken,
        profile: { create: {} },
        stats: { create: {} },
        streak: { create: {} },
        notificationSettings: { create: {} },
      },
    });

    // Send verification email
    await sendEmail({
      to: email,
      subject: 'Verify your Coders account',
      html: `
        <h2>Welcome to Coders!</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${process.env.FRONTEND_URL}/verify-email?token=${emailVerifyToken}">
          Verify Email
        </a>
        <p>This link expires in 24 hours.</p>
      `,
    });

    res.status(201).json({
      message: process.env.SMTP_HOST ? 'Account created. Please check your email to verify.' : 'Account created. You can now sign in.',
      userId: user.id,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { email, password, rememberMe } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { stats: true },
    });

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    if (user.isBanned) {
      throw new AppError('Account suspended', 403);
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      const tempToken = crypto.randomBytes(32).toString('hex');
      await redis.setex(`2fa:${tempToken}`, 300, user.id);
      res.json({ requiresTwoFactor: true, tempToken });
      return;
    }

    const { accessToken, refreshToken } = await generateTokens({
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      isPremium: user.isPremium,
    });

    setTokenCookies(res, accessToken, refreshToken, rememberMe);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        isPremium: user.isPremium,
        emailVerified: user.emailVerified,
      },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: hashToken(refreshToken), userId: req.user!.id },
        data: { isRevoked: true },
      });
    }

    await prisma.userSession.updateMany({ where: { userId: req.user!.id }, data: { isActive: false } });
    await prisma.refreshToken.updateMany({ where: { userId: req.user!.id }, data: { isRevoked: true } });
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth' });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', authRateLimiter, async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 401);
    }

    const payload = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as { userId: string; sessionId: string };

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: hashToken(refreshToken),
        userId: payload.userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const { user } = storedToken;
    const session = await prisma.userSession.findFirst({ where: { id: payload.sessionId, userId: user.id, isActive: true } });
    if (!session || user.isBanned) throw new AppError('Session expired', 401);
    const claimed = await prisma.refreshToken.updateMany({ where: { id: storedToken.id, isRevoked: false }, data: { isRevoked: true } });
    if (!claimed.count) throw new AppError('Refresh token already used', 401);
    const tokens = await generateTokens(user, session.id);

    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        profile: true,
        stats: true,
        streak: true,
      },
    });

    if (!user) throw new AppError('User not found', 404);

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      isPremium: user.isPremium,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      profile: user.profile,
      stats: await userStatistics(user.id),
      streak: user.streak,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body);

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user || Date.now() - user.createdAt.getTime() > 86400000) throw new AppError('Invalid or expired verification token', 400);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authRateLimiter, async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    if (!process.env.SMTP_HOST) throw new AppError('Password recovery is not configured', 503);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      await redis.setex(`reset:${resetToken}`, 3600, user.id); // 1 hour

      await sendEmail({
        to: email,
        subject: 'Reset your Coders password',
        html: `
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">
            Reset Password
          </a>
          <p>This link expires in 1 hour.</p>
        `,
      });
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const userId = await redis.getdel(`reset:${token}`);
    if (!userId) throw new AppError('Invalid or expired reset token', 400);

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await redis.del(`reset:${token}`);

    await prisma.userSession.updateMany({ where: { userId }, data: { isActive: false } });
    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/2fa/setup
router.post('/2fa/setup', authenticate, async (req, res, next) => {
  try {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(
      req.user!.email,
      'Coders',
      secret
    );

    await redis.setex(`2fa_setup:${req.user!.id}`, 600, secret);

    const qrCode = await QRCode.toDataURL(otpauth);

    res.json({ secret, qrCode });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/2fa/verify
router.post('/2fa/verify', authenticate, async (req, res, next) => {
  try {
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);

    const secret = await redis.get(`2fa_setup:${req.user!.id}`);
    if (!secret) throw new AppError('2FA setup expired', 400);

    const isValid = authenticator.verify({ token: code, secret });
    if (!isValid) throw new AppError('Invalid 2FA code', 400);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { twoFactorEnabled: true, twoFactorSecret: secret },
    });

    await redis.del(`2fa_setup:${req.user!.id}`);

    res.json({ message: '2FA enabled successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/2fa/disable
router.post('/2fa/disable', authenticate, async (req, res, next) => {
  try {
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.twoFactorSecret) throw new AppError('2FA not enabled', 400);

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });
    if (!isValid) throw new AppError('Invalid 2FA code', 400);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    res.json({ message: '2FA disabled successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/2fa/login
router.post('/2fa/login', authRateLimiter, async (req, res, next) => {
  try {
    const { tempToken, code } = z
      .object({ tempToken: z.string(), code: z.string().length(6) })
      .parse(req.body);

    const userId = await redis.get(`2fa:${tempToken}`);
    if (!userId) throw new AppError('Invalid or expired session', 400);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret || user.isBanned) throw new AppError('Invalid credentials', 401);

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });
    if (!isValid) throw new AppError('Invalid 2FA code', 400);

    if (await redis.getdel(`2fa:${tempToken}`) !== userId) throw new AppError('Invalid or expired session', 400);

    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      isPremium: user.isPremium,
    });

    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        isPremium: user.isPremium,
      },
      accessToken: tokens.accessToken,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
