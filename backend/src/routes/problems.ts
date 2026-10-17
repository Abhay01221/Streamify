import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { cache } from '../utils/redis';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/problems
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      tags: z.string().optional(),
      status: z.enum(['todo', 'attempted', 'solved']).optional(),
      search: z.string().optional(),
      companies: z.string().optional(),
      premium: z.coerce.boolean().optional(),
      sortBy: z.enum(['number', 'title', 'difficulty', 'acceptance', 'frequency']).default('number'),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }).parse(req.query);

    const { page, limit, difficulty, tags, status, search, companies, premium, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isActive: true };

    if (difficulty) where.difficulty = difficulty;
    if (premium !== undefined) where.isPremium = premium;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim());
      where.tags = {
        some: {
          tag: { slug: { in: tagList } },
        },
      };
    }

    if (companies) {
      const companyList = companies.split(',').map((c) => c.trim());
      where.companies = {
        some: {
          company: { slug: { in: companyList } },
        },
      };
    }

    // Filter by user status
    let userSolvedIds: string[] = [];
    let userAttemptedIds: string[] = [];

    if (req.user) {
      const submissions = await prisma.submission.findMany({
        where: { userId: req.user.id, isRun: false },
        select: { problemId: true, status: true },
        orderBy: { createdAt: 'desc' },
      });

      const solvedSet = new Set<string>();
      const attemptedSet = new Set<string>();

      for (const sub of submissions) {
        if (sub.status === 'ACCEPTED') solvedSet.add(sub.problemId);
        else attemptedSet.add(sub.problemId);
      }

      userSolvedIds = Array.from(solvedSet);
      userAttemptedIds = Array.from(attemptedSet).filter((id) => !solvedSet.has(id));

      if (status === 'solved') where.id = { in: userSolvedIds };
      else if (status === 'attempted') where.id = { in: userAttemptedIds };
      else if (status === 'todo') {
        where.id = { notIn: [...userSolvedIds, ...userAttemptedIds] };
      }
    }

    const orderBy: Record<string, string> = {};
    if (sortBy === 'acceptance') orderBy.acceptanceRate = sortOrder;
    else if (sortBy === 'title') orderBy.title = sortOrder;
    else if (sortBy === 'difficulty') orderBy.difficulty = sortOrder;
    else orderBy.number = sortOrder;

    const [problems, total, catalogTotal] = await Promise.all([
      prisma.problem.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          slug: true,
          title: true,
          number: true,
          difficulty: true,
          acceptanceRate: true,
          totalSubmissions: true,
          isPremium: true,
          tags: {
            select: {
              tag: { select: { name: true, slug: true } },
            },
          },
          companies: {
            take: 3,
            select: {
              company: { select: { name: true, slug: true, logo: true } },
            },
          },
        },
      }),
      prisma.problem.count({ where }),
      prisma.problem.count({ where: { isActive: true } }),
    ]);

    // Add user status to each problem
    const problemsWithStatus = problems.map((p) => ({
      ...p,
      tags: p.tags.map((t) => t.tag),
      companies: p.companies.map((c) => c.company),
      userStatus: req.user
        ? userSolvedIds.includes(p.id)
          ? 'solved'
          : userAttemptedIds.includes(p.id)
          ? 'attempted'
          : 'todo'
        : null,
    }));

    res.json({
      problems: problemsWithStatus,
      catalogTotal,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/bookmarks', authenticate, async (req, res, next) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({ where: { userId: req.user!.id, problem: { isActive: true } },
      take: 100, orderBy: { createdAt: 'desc' }, include: { problem: { select: { slug: true, title: true, difficulty: true } } } });
    res.json({ bookmarks });
  } catch (err) { next(err); }
});
router.put('/:slug/bookmark', authenticate, async (req, res, next) => {
  try {
    const problem = await prisma.problem.findFirst({ where: { slug: req.params.slug, isActive: true }, select: { id: true } });
    if (!problem) throw new AppError('Problem not found', 404);
    await prisma.bookmark.upsert({ where: { userId_problemId: { userId: req.user!.id, problemId: problem.id } },
      create: { userId: req.user!.id, problemId: problem.id }, update: {} });
    res.json({ bookmarked: true });
  } catch (err) { next(err); }
});
router.delete('/:slug/bookmark', authenticate, async (req, res, next) => {
  try {
    await prisma.bookmark.deleteMany({ where: { userId: req.user!.id, problem: { slug: req.params.slug } } });
    res.json({ bookmarked: false });
  } catch (err) { next(err); }
});

// GET /api/problems/random
router.get('/random', optionalAuth, async (req, res, next) => {
  try {
    const { difficulty } = z.object({
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
    }).parse(req.query);

    const where: Record<string, unknown> = { isActive: true, isPremium: false };
    if (difficulty) where.difficulty = difficulty;

    const count = await prisma.problem.count({ where });
    const skip = Math.floor(Math.random() * count);

    const problem = await prisma.problem.findFirst({
      where,
      skip,
      select: { slug: true },
    });

    if (!problem) throw new AppError('No problems found', 404);

    res.json({ slug: problem.slug });
  } catch (err) {
    next(err);
  }
});

// GET /api/problems/:slug
router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const { slug } = req.params;

    const problem = await prisma.problem.findUnique({
      where: { slug },
      include: {
        tags: { include: { tag: true } },
        examples: { orderBy: { order: 'asc' } },
        constraints: { orderBy: { order: 'asc' } },
        companies: {
          include: { company: true },
          orderBy: { frequency: 'desc' },
        },
        starterCode: true,
        testCases: {
          where: { isSample: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!problem || ('isActive' in problem && !problem.isActive)) throw new AppError('Problem not found', 404);

    if (problem.isPremium && !req.user?.isPremium && !req.user?.isAdmin) {
      throw new AppError('Premium subscription required', 403);
    }

    const { referenceSolution: _referenceSolution, ...publicProblem } = problem;
    const result = {
      ...publicProblem,
      tags: problem.tags.map((t) => t.tag),
      companies: problem.companies.map((c) => ({
        ...c.company,
        frequency: c.frequency,
      })),
    };


    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/problems/:slug/editorial
router.get('/:slug/editorial', optionalAuth, async (req, res, next) => {
  try {
    const { slug } = req.params;

    const problem = await prisma.problem.findUnique({
      where: { slug },
      select: { id: true, isPremium: true, isActive: true },
    });

    if (!problem || ('isActive' in problem && !problem.isActive)) throw new AppError('Problem not found', 404);

    const editorial = await prisma.editorialSection.findMany({
      where: {
        problemId: problem.id,
        ...((!req.user?.isPremium && !req.user?.isAdmin) ? { isPremium: false } : {}),
      },
      orderBy: { order: 'asc' },
    });

    res.json({ editorial, isPremiumLocked: !req.user?.isPremium && !req.user?.isAdmin });
  } catch (err) {
    next(err);
  }
});

// GET /api/problems/:slug/solutions
router.get('/:slug/solutions', optionalAuth, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 10, language, sortBy = 'votes' } = req.query;

    const problem = await prisma.problem.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });

    if (!problem || ('isActive' in problem && !problem.isActive)) throw new AppError('Problem not found', 404);

    const where: Record<string, unknown> = { problemId: problem.id };
    if (language) where.language = language;

    const orderBy: Record<string, string> =
      sortBy === 'votes' ? { upvotes: 'desc' } :
      sortBy === 'newest' ? { createdAt: 'desc' } :
      { views: 'desc' };

    const solutions = await prisma.solution.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy,
      include: {
        user: {
          select: { username: true, profile: { select: { avatarUrl: true } } },
        },
      },
    });

    res.json({ solutions });
  } catch (err) {
    next(err);
  }
});

// GET /api/problems/:slug/submissions
router.get('/:slug/submissions', authenticate, async (req, res, next) => {
  try {
    const { slug } = req.params;

    const problem = await prisma.problem.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });

    if (!problem || ('isActive' in problem && !problem.isActive)) throw new AppError('Problem not found', 404);

    const submissions = await prisma.submission.findMany({
      where: { userId: req.user!.id, problemId: problem.id, isRun: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        language: true,
        runtime: true,
        memory: true,
        runtimePercentile: true,
        memoryPercentile: true,
        createdAt: true,
      },
    });

    res.json({ submissions });
  } catch (err) {
    next(err);
  }
});

// GET /api/problems/:slug/discuss
router.get('/:slug/discuss', optionalAuth, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const problem = await prisma.problem.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });

    if (!problem || ('isActive' in problem && !problem.isActive)) throw new AppError('Problem not found', 404);

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

export default router;
