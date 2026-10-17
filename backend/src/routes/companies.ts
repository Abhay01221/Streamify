import { Router } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

// GET /api/companies
router.get('/', async (_req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      include: { _count: { select: { problems: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ companies });
  } catch (err) {
    next(err);
  }
});

// GET /api/companies/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { slug: req.params.slug },
    });

    if (!company) return res.status(404).json({ error: 'Company not found' });

    const problems = await prisma.companyProblem.findMany({
      where: { companyId: company.id, problem: { isActive: true } },
      orderBy: { frequency: 'desc' },
      include: {
        problem: {
          select: {
            id: true, slug: true, title: true, number: true,
            difficulty: true, acceptanceRate: true, isPremium: true,
          },
        },
      },
    });

    res.json({
      company,
      problems: problems.map((p) => ({ ...p.problem, frequency: p.frequency })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
