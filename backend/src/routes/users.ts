import { userStatistics } from '../services/statistics';
import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { uploadAvatar } from '../utils/storage';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/me/progress', authenticate, async (req, res, next) => {
  try {
    const { page, limit } = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).parse(req.query);
    const solved = await prisma.submission.findMany({ where: { userId: req.user!.id, isRun: false, status: 'ACCEPTED' },
      distinct: ['problemId'], select: { problem: { select: { id: true, slug: true, title: true, difficulty: true } } }, orderBy: { createdAt: 'asc' } });
    res.json({ problems: solved.slice((page - 1) * limit, page * limit).map(s => s.problem), pagination: { page, limit, total: solved.length } });
  } catch (err) { next(err); }
});

// GET /api/users/:username
router.get('/:username', optionalAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      include: {
        profile: true,
        stats: true,
        streak: true,
        badges: { orderBy: { earnedAt: 'desc' } },
      },
    });

    if (!user) throw new AppError('User not found', 404);

    const isOwn = req.user?.id === user.id;

    if (!user.profile?.isPublic && !isOwn && !req.user?.isAdmin) {
      throw new AppError('This profile is private', 403);
    }

    res.json({
      id: user.id,
      username: user.username,
      isPremium: user.isPremium,
      createdAt: user.createdAt,
      profile: user.profile,
      stats: await userStatistics(user.id),
      streak: user.streak,
      badges: user.badges,
      isOwn,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:username/stats
router.get('/:username/stats', optionalAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      include: { stats: true, profile: true },
    });

    if (!user) throw new AppError('User not found', 404);

    if (!user.profile?.isPublic && req.user?.id !== user.id && !req.user?.isAdmin) throw new AppError('This profile is private', 403);
    // Language distribution
    const languageStats = await prisma.submission.groupBy({
      by: ['language'],
      where: { userId: user.id, status: 'ACCEPTED', isRun: false },
      _count: { language: true },
      orderBy: { _count: { language: 'desc' } },
      take: 10,
    });

    // Recent submissions
    const recentSubmissions = await prisma.submission.findMany({
      where: { userId: user.id, isRun: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, status: true, language: true, runtime: true, memory: true, createdAt: true,
        problem: { select: { slug: true, title: true, difficulty: true } } },
    });

    res.json({
      stats: await userStatistics(user.id),
      languageStats: languageStats.map((l) => ({
        language: l.language,
        count: l._count.language,
      })),
      recentSubmissions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:username/heatmap
router.get('/:username/heatmap', optionalAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: { id: true, profile: { select: { isPublic: true } } },
    });

    if (!user) throw new AppError('User not found', 404);

    if (!user.profile?.isPublic && req.user?.id !== user.id && !req.user?.isAdmin) throw new AppError('This profile is private', 403);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const submissions = await prisma.submission.findMany({
      where: {
        userId: user.id,
        status: 'ACCEPTED', isRun: false,
        createdAt: { gte: oneYearAgo },
      },
      select: { createdAt: true },
    });

    // Group by date
    const heatmap: Record<string, number> = {};
    for (const sub of submissions) {
      const date = sub.createdAt.toISOString().split('T')[0];
      heatmap[date] = (heatmap[date] || 0) + 1;
    }

    res.json({ heatmap });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const updateSchema = z.object({
      displayName: z.string().max(50).optional(),
      bio: z.string().max(500).optional(),
      location: z.string().max(100).optional(),
      website: z.string().url().optional().or(z.literal('')),
      githubUrl: z.string().url().optional().or(z.literal('')),
      linkedinUrl: z.string().url().optional().or(z.literal('')),
      twitterUrl: z.string().url().optional().or(z.literal('')),
      country: z.string().optional(),
      school: z.string().max(100).optional(),
      company: z.string().max(100).optional(),
      jobTitle: z.string().max(100).optional(),
      isPublic: z.boolean().optional(),
      showOnline: z.boolean().optional(),
    });

    const data = updateSchema.parse(req.body);

    const profile = await prisma.userProfile.update({
      where: { userId: req.user!.id },
      data,
    });

    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/me/avatar
router.post('/me/avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new AppError('Invalid file type', 400);
    }

    const avatarUrl = await uploadAvatar(req.user!.id, req.file.buffer, req.file.mimetype);

    await prisma.userProfile.update({
      where: { userId: req.user!.id },
      data: { avatarUrl },
    });

    res.json({ avatarUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
