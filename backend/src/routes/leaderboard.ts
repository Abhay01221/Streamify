import { z } from 'zod';
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { cache } from '../utils/redis';

const router = Router();

// GET /api/leaderboard
router.get('/', async (req, res, next) => {
  try {
    const { sortBy, country, page, limit } = z.object({
      sortBy: z.enum(['solved', 'rating', 'reputation']).default('solved'), country: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50),
    }).parse(req.query);
    const filter = country ? Prisma.sql`AND p.country = ${country}` : Prisma.empty;
    const order = sortBy === 'rating' ? Prisma.sql`st."contestRating" DESC` : sortBy === 'reputation' ? Prisma.sql`st.reputation DESC` : Prisma.sql`solved DESC`;
    const rows = await prisma.$queryRaw<Array<{ username: string; isPremium: boolean; displayName: string | null; avatarUrl: string | null; country: string | null; solved: bigint; contestRating: number; reputation: number }>>(Prisma.sql`
      SELECT u.username, u."isPremium", p."displayName", p."avatarUrl", p.country,
      COUNT(DISTINCT CASE WHEN pr."isActive" THEN s."problemId" END) AS solved,
      COALESCE(st."contestRating", 1500) AS "contestRating", COALESCE(st.reputation, 0) AS reputation
      FROM "User" u JOIN "UserProfile" p ON p."userId" = u.id
      LEFT JOIN "UserStats" st ON st."userId" = u.id
      LEFT JOIN "Submission" s ON s."userId" = u.id AND s.status = 'ACCEPTED' AND s."isRun" = false
      LEFT JOIN "Problem" pr ON pr.id = s."problemId"
      WHERE u."isBanned" = false AND u."isAdmin" = false AND p."isPublic" = true ${filter}
      GROUP BY u.id, p.id, st.id ORDER BY ${order}, u.username ASC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `);
    const total = await prisma.user.count({ where: { isBanned: false, isAdmin: false, profile: { isPublic: true, ...(country ? { country } : {}) } } });
    const result = { leaderboard: rows.map((u, i) => ({ rank: (page - 1) * limit + i + 1,
      username: u.username, displayName: u.displayName, avatar: u.avatarUrl, country: u.country,
      isPremium: u.isPremium, totalSolved: Number(u.solved), contestRating: u.contestRating, reputation: u.reputation })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
