import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/discuss/:problemSlug
router.get('/:problemSlug', optionalAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const problem = await prisma.problem.findUnique({
      where: { slug: req.params.problemSlug },
      select: { id: true },
    });

    if (!problem) throw new AppError('Problem not found', 404);

    const discussions = await prisma.discussion.findMany({
      where: { problemId: problem.id },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: { username: true, profile: { select: { avatarUrl: true } } },
        },
        _count: { select: { comments: true, votes: true } },
      },
    });

    res.json({ discussions });
  } catch (err) {
    next(err);
  }
});

// POST /api/discuss/:problemSlug
router.post('/:problemSlug', authenticate, async (req, res, next) => {
  try {
    const { title, content } = z.object({
      title: z.string().min(5).max(200),
      content: z.string().min(10).max(10000),
    }).parse(req.body);

    const problem = await prisma.problem.findUnique({
      where: { slug: req.params.problemSlug },
      select: { id: true },
    });

    if (!problem) throw new AppError('Problem not found', 404);

    const discussion = await prisma.discussion.create({
      data: {
        userId: req.user!.id,
        problemId: problem.id,
        title,
        content,
      },
      include: {
        user: { select: { username: true } },
      },
    });

    res.status(201).json({ discussion });
  } catch (err) {
    next(err);
  }
});

// POST /api/discuss/comments
router.post('/comments', authenticate, async (req, res, next) => {
  try {
    const { discussionId, content, parentId } = z.object({
      discussionId: z.string(),
      content: z.string().min(1).max(5000),
      parentId: z.string().optional(),
    }).parse(req.body);

    const comment = await prisma.discussionComment.create({
      data: {
        discussionId,
        userId: req.user!.id,
        content,
        parentId,
      },
      include: {
        user: { select: { username: true, profile: { select: { avatarUrl: true } } } },
      },
    });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

// POST /api/discuss/:id/vote
router.post('/:id/vote', authenticate, async (req, res, next) => {
  try {
    const { value } = z.object({ value: z.number().min(-1).max(1) }).parse(req.body);

    const existing = await prisma.discussionVote.findUnique({
      where: { userId_discussionId: { userId: req.user!.id, discussionId: req.params.id } },
    });

    if (existing) {
      if (value === 0) {
        await prisma.discussionVote.delete({ where: { id: existing.id } });
      } else {
        await prisma.discussionVote.update({
          where: { id: existing.id },
          data: { value },
        });
      }
    } else if (value !== 0) {
      await prisma.discussionVote.create({
        data: { userId: req.user!.id, discussionId: req.params.id, value },
      });
    }

    res.json({ message: 'Vote recorded' });
  } catch (err) {
    next(err);
  }
});

export default router;
