import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { cache } from '../utils/redis';

const router = Router();

// GET /api/tags
router.get('/', async (_req, res, next) => {
  try {
    const cached = await cache.get('tags:all');
    if (cached) return res.json(cached);

    const tags = await prisma.tag.findMany({
      orderBy: { problemCount: 'desc' },
    });

    await cache.set('tags:all', { tags }, 3600);
    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

// GET /api/tags/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const tag = await prisma.tag.findUnique({
      where: { slug: req.params.slug },
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const problems = await prisma.problem.findMany({
      where: {
        isActive: true,
        tags: { some: { tagId: tag.id } },
      },
      select: {
        id: true, slug: true, title: true, number: true,
        difficulty: true, acceptanceRate: true, isPremium: true,
      },
      orderBy: { number: 'asc' },
    });

    res.json({ tag, problems });
  } catch (err) {
    next(err);
  }
});

export default router;
