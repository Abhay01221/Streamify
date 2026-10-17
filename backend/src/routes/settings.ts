import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// PATCH /api/settings/account
router.patch('/account', async (req, res, next) => {
  try {
    const { currentPassword, newPassword, newEmail } = z.object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8).max(72).optional(),
      newEmail: z.string().email().optional(),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('User not found', 404);

    if (newPassword || newEmail) {
      if (!currentPassword) throw new AppError('Current password required', 400);
      if (!user.passwordHash) throw new AppError('OAuth account — no password set', 400);

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) throw new AppError('Incorrect password', 401);
    }

    const updates: Record<string, unknown> = {};

    if (newPassword) {
      updates.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (newEmail) {
      const existing = await prisma.user.findUnique({ where: { email: newEmail } });
      if (existing) throw new AppError('Email already in use', 409);
      updates.email = newEmail;
      updates.emailVerified = false;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: req.user!.id }, data: updates }),
        prisma.userSession.updateMany({ where: { userId: req.user!.id }, data: { isActive: false } }),
        prisma.refreshToken.updateMany({ where: { userId: req.user!.id }, data: { isRevoked: true } }),
      ]);
    }

    res.json({ message: 'Account updated' });
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/sessions
router.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: { userId: req.user!.id, isActive: true },
      orderBy: { lastActiveAt: 'desc' },
    });
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/settings/sessions/:id
router.delete('/sessions/:id', async (req, res, next) => {
  try {
    await prisma.userSession.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isActive: false },
    });
    res.json({ message: 'Session revoked' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/settings/account
router.delete('/account', async (req, res, next) => {
  try {
    const { password, confirmation } = z.object({
      password: z.string(),
      confirmation: z.literal('DELETE MY ACCOUNT'),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('User not found', 404);

    if (user.passwordHash) {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new AppError('Incorrect password', 401);
    }

    await prisma.user.delete({ where: { id: req.user!.id } });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/settings/notifications
router.patch('/notifications', async (req, res, next) => {
  try {
    const data = z.object({
      submissionResult: z.boolean().optional(),
      contestStarting: z.boolean().optional(),
      discussionReply: z.boolean().optional(),
      badgeEarned: z.boolean().optional(),
      dailyChallenge: z.boolean().optional(),
      emailDigest: z.boolean().optional(),
      emailDigestFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    }).parse(req.body);

    const settings = await prisma.userNotificationSettings.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...data },
      update: data,
    });

    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/data-export
router.get('/data-export', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        profile: true,
        stats: true,
        submissions: { take: 1000, orderBy: { createdAt: 'desc' } },
        notes: true,
        solutions: true,
      },
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="coders-data-export.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      user: {
        email: user?.email,
        username: user?.username,
        createdAt: user?.createdAt,
        profile: user?.profile,
        stats: user?.stats,
      },
      submissions: user?.submissions,
      notes: user?.notes,
      solutions: user?.solutions,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
