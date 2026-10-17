import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { cache } from '../utils/redis';

const router = Router();

// GET /api/contests
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const contests = await prisma.contest.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { startTime: 'desc' },
      include: {
        _count: { select: { participants: true, problems: true } },
      },
    });

    res.json({ contests });
  } catch (err) {
    next(err);
  }
});

// GET /api/contests/:id
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: req.params.id },
      include: {
        problems: {
          include: {
            problem: {
              select: { slug: true, title: true, difficulty: true, acceptanceRate: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { participants: true } },
      },
    });

    if (!contest) throw new AppError('Contest not found', 404);

    let userParticipation = null;
    if (req.user) {
      userParticipation = await prisma.contestParticipant.findUnique({
        where: { contestId_userId: { contestId: contest.id, userId: req.user.id } },
      });
    }

    res.json({ contest, userParticipation });
  } catch (err) {
    next(err);
  }
});

// POST /api/contests/:id/register
router.post('/:id/register', authenticate, async (req, res, next) => {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: req.params.id },
    });

    if (!contest) throw new AppError('Contest not found', 404);
    if (contest.status === 'ENDED') throw new AppError('Contest has ended', 400);

    const existing = await prisma.contestParticipant.findUnique({
      where: { contestId_userId: { contestId: contest.id, userId: req.user!.id } },
    });

    if (existing) throw new AppError('Already registered', 409);

    const userStats = await prisma.userStats.findUnique({
      where: { userId: req.user!.id },
    });

    const participant = await prisma.contestParticipant.create({
      data: {
        contestId: contest.id,
        userId: req.user!.id,
        ratingBefore: userStats?.contestRating || 1500,
      },
    });

    res.status(201).json({ participant });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/contests/:id/register
router.delete('/:id/register', authenticate, async (req, res, next) => {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: req.params.id },
    });

    if (!contest) throw new AppError('Contest not found', 404);
    if (contest.status !== 'UPCOMING') throw new AppError('Cannot unregister from active/ended contest', 400);

    await prisma.contestParticipant.delete({
      where: { contestId_userId: { contestId: contest.id, userId: req.user!.id } },
    });

    res.json({ message: 'Unregistered successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/contests/:id/leaderboard
router.get('/:id/leaderboard', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const cacheKey = `leaderboard:${req.params.id}:${page}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const participants = await prisma.contestParticipant.findMany({
      where: { contestId: req.params.id },
      orderBy: [{ score: 'desc' }, { penalty: 'asc' }],
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        user: {
          select: {
            username: true,
            profile: { select: { avatarUrl: true, country: true } },
          },
        },
      },
    });

    const result = {
      leaderboard: participants.map((p, i) => ({
        rank: (Number(page) - 1) * Number(limit) + i + 1,
        userId: p.userId,
        username: p.user.username,
        avatar: p.user.profile?.avatarUrl,
        country: p.user.profile?.country,
        score: p.score,
        penalty: p.penalty,
        ratingChange: p.ratingChange,
      })),
    };

    await cache.set(cacheKey, result, 30);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/contests/:id/submit
router.post('/:id/submit', authenticate, (_req, _res, next) => {
  next(new AppError('Contest judging is not implemented. Use the practice problem workspace.', 501));
});

export default router;
