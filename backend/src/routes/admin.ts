import { verifyPublication } from '../services/publication';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { cache } from '../utils/redis';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/problems', async (req, res, next) => {
  try {
    const { page, limit } = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(req.query);
    const [problems, total] = await Promise.all([prisma.problem.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { number: 'asc' } }), prisma.problem.count()]);
    res.json({ problems, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});
router.get('/problems/:id', async (req, res, next) => {
  try {
    const problem = await prisma.problem.findUnique({ where: { id: req.params.id }, include: { testCases: { orderBy: { order: 'asc' } }, starterCode: true, constraints: true, examples: { orderBy: { order: 'asc' } } } });
    if (!problem) throw new AppError('Problem not found', 404);
    res.json(problem);
  } catch (err) { next(err); }
});
router.get('/health', async (_req, res, next) => {
  try {
    const { submissionQueue } = await import('../queue/submissionQueue');
    const { redis } = await import('../utils/redis');
    res.json({ queue: await submissionQueue.getJobCounts(), workerHeartbeat: await redis.get('worker:heartbeat') });
  } catch (err) { next(err); }
});

// GET /api/admin/submissions
router.get('/submissions', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const submissions = await prisma.submission.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        user: { select: { username: true } },
        problem: { select: { title: true, slug: true } },
      },
    });

    res.json({ submissions });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/problems
router.post('/problems', async (req, res, next) => {
  try {
    const schema = z.object({
      title: z.string().min(3).max(200),
      slug: z.string().min(3).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      number: z.number().int().positive(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
      description: z.string().min(10).max(65536),
      referenceSolution: z.string().max(65536).optional(),
      isPremium: z.boolean().default(false),
      isActive: z.boolean().default(false),
      timeLimit: z.number().int().min(100).max(10000).default(2000),
      memoryLimit: z.number().int().min(16384).max(262144).default(262144),
      hints: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      companies: z.array(z.string()).default([]),
      examples: z.array(z.object({
        inputText: z.string(),
        outputText: z.string(),
        explanation: z.string().optional(),
      })).default([]),
      constraints: z.array(z.string()).default([]),
      testCases: z.array(z.object({
        input: z.string(),
        output: z.string(),
        isSample: z.boolean().default(false),
      })).default([]),
      starterCode: z.record(z.string()).default({}),
      editorial: z.array(z.object({
        title: z.string(),
        content: z.string(),
        approach: z.string().optional(),
        timeComplexity: z.string().optional(),
        spaceComplexity: z.string().optional(),
        isPremium: z.boolean().default(true),
      })).default([]),
    });

    const data = schema.parse(req.body);
    if (data.isActive) await verifyPublication(data);

    // Get or create tags
    const tagIds = await Promise.all(
      data.tags.map(async (tagName) => {
        const tag = await prisma.tag.upsert({
          where: { slug: tagName.toLowerCase().replace(/\s+/g, '-') },
          create: {
            name: tagName,
            slug: tagName.toLowerCase().replace(/\s+/g, '-'),
          },
          update: {},
        });
        return tag.id;
      })
    );

    const problem = await prisma.problem.create({
      data: {
        title: data.title,
        slug: data.slug,
        number: data.number,
        difficulty: data.difficulty,
        description: data.description,
        referenceSolution: data.referenceSolution,
        isPremium: data.isPremium,
        isActive: data.isActive,
        timeLimit: data.timeLimit,
        memoryLimit: data.memoryLimit,
        hints: data.hints,
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
        examples: {
          create: data.examples.map((e, i) => ({ ...e, order: i })),
        },
        constraints: {
          create: data.constraints.map((text, i) => ({ text, order: i })),
        },
        testCases: {
          create: data.testCases.map((tc, i) => ({ ...tc, order: i })),
        },
        starterCode: {
          create: Object.entries(data.starterCode).map(([language, code]) => ({
            language,
            code,
          })),
        },
        editorial: {
          create: data.editorial.map((e, i) => ({ ...e, order: i })),
        },
      },
    });

    // Update tag counts
    await Promise.all(
      tagIds.map((tagId) =>
        prisma.tag.update({
          where: { id: tagId },
          data: { problemCount: { increment: 1 } },
        })
      )
    );

    await cache.delPattern('problem:*');

    await prisma.auditEvent.create({ data: { actorId: req.user!.id, action: 'problem.create', targetId: problem.id } });
    res.status(201).json({ problem });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/problems/:id
router.patch('/problems/:id', async (req, res, next) => {
  try {
    const data = z.object({
      title: z.string().min(3).max(200).optional(), description: z.string().min(10).max(65536).optional(),
      referenceSolution: z.string().max(65536).optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(), isActive: z.boolean().optional(), isPremium: z.boolean().optional(),
      timeLimit: z.number().int().min(100).max(10000).optional(), memoryLimit: z.number().int().min(16384).max(262144).optional(),
      hints: z.array(z.string().max(2000)).max(20).optional(),
      testCases: z.array(z.object({ input: z.string().max(65536), output: z.string().max(65536), isSample: z.boolean() })).max(100).optional(),
      starterCode: z.record(z.string().max(65536)).optional(),
      constraints: z.array(z.string().max(2000)).max(100).optional(),
      examples: z.array(z.object({ inputText: z.string().max(65536), outputText: z.string().max(65536), explanation: z.string().max(4000).optional() })).max(20).optional(),
    }).strict().parse(req.body);
    const { testCases, starterCode, constraints, examples, ...fields } = data;
    const snapshot = await prisma.problem.findUnique({ where: { id: req.params.id }, include: { testCases: true } });
    if (!snapshot) throw new AppError('Problem not found', 404);
    if (fields.isActive ?? snapshot.isActive) await verifyPublication({ ...snapshot, ...fields, testCases: testCases || snapshot.testCases });
    const problem = await prisma.$transaction(async tx => {
      const existing = await tx.problem.findUnique({ where: { id: req.params.id }, include: { _count: { select: { testCases: true } } } });
      if (!existing) throw new AppError('Problem not found', 404);
      if (existing.updatedAt.getTime() !== snapshot.updatedAt.getTime()) throw new AppError('Problem changed during verification; reload and retry', 409);
      if ((fields.isActive ?? existing.isActive) && (testCases ? !testCases.length : !existing._count.testCases)) throw new AppError('Published problems need test cases', 400);
      if (testCases) await tx.testCase.deleteMany({ where: { problemId: existing.id } });
      if (starterCode) await tx.starterCode.deleteMany({ where: { problemId: existing.id } });
      if (constraints) await tx.problemConstraint.deleteMany({ where: { problemId: existing.id } });
      if (examples) await tx.problemExample.deleteMany({ where: { problemId: existing.id } });
      const updated = await tx.problem.update({ where: { id: existing.id }, data: { ...fields,
        ...(testCases ? { testCases: { create: testCases.map((tc, order) => ({ ...tc, order })) } } : {}),
        ...(starterCode ? { starterCode: { create: Object.entries(starterCode).map(([language, code]) => ({ language, code })) } } : {}),
        ...(constraints ? { constraints: { create: constraints.map((text, order) => ({ text, order })) } } : {}),
        ...(examples ? { examples: { create: examples.map((example, order) => ({ ...example, order })) } } : {}),
      } });
      await tx.auditEvent.create({ data: { actorId: req.user!.id, action: 'problem.update', targetId: existing.id } });
      return updated;
    });

    await cache.del(`problem:${problem.slug}`);
    res.json({ problem });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/problems/:id
router.delete('/problems/:id', async (req, res, next) => {
  try {
    const problem = await prisma.problem.findUnique({
      where: { id: req.params.id },
      select: { slug: true },
    });

    await prisma.$transaction([prisma.problem.update({ where: { id: req.params.id }, data: { isActive: false } }),
      prisma.auditEvent.create({ data: { actorId: req.user!.id, action: 'problem.unpublish', targetId: req.params.id } })]);

    if (problem) await cache.del(`problem:${problem.slug}`);

    res.json({ message: 'Problem deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, username: true, isPremium: true,
        isAdmin: true, isBanned: true, emailVerified: true, createdAt: true,
        stats: { select: { totalSolved: true } },
      },
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req, res, next) => {
  try {
    const { isBanned, isPremium, isAdmin } = z.object({
      isBanned: z.boolean().optional(),
      isPremium: z.boolean().optional(),
      isAdmin: z.boolean().optional(),
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isBanned, isPremium, isAdmin },
      select: { id: true, username: true, isBanned: true, isPremium: true, isAdmin: true },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/analytics
router.get('/analytics', async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalProblems,
      totalSubmissions,
      todaySubmissions,
      todayNewUsers,
      languageStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.problem.count({ where: { isActive: true } }),
      prisma.submission.count(),
      prisma.submission.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.submission.groupBy({
        by: ['language'],
        _count: { language: true },
        orderBy: { _count: { language: 'desc' } },
        take: 10,
      }),
    ]);

    res.json({
      totalUsers,
      totalProblems,
      totalSubmissions,
      todaySubmissions,
      todayNewUsers,
      languageStats: languageStats.map((l) => ({
        language: l.language,
        count: l._count.language,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
