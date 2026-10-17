import { prisma } from '../utils/prisma';
export async function userStatistics(userId: string) {
  const [solved, totals, verdicts, saved, topics] = await Promise.all([
    prisma.problem.findMany({ where: { isActive: true, submissions: { some: { userId, isRun: false, status: 'ACCEPTED' } } }, select: { difficulty: true } }),
    prisma.problem.groupBy({ by: ['difficulty'], where: { isActive: true }, _count: true }),
    prisma.submission.groupBy({ by: ['status'], where: { userId, isRun: false, queueStatus: 'Completed', problem: { isActive: true } }, _count: true }),
    prisma.userStats.findUnique({ where: { userId } }),
    prisma.$queryRaw<Array<{ name: string; attempts: bigint }>>`SELECT t.name, COUNT(s.id) AS attempts FROM "Submission" s
      JOIN "Problem" p ON p.id = s."problemId" JOIN "ProblemTag" pt ON pt."problemId" = p.id JOIN "Tag" t ON t.id = pt."tagId"
      WHERE s."userId" = ${userId} AND s."isRun" = false AND s."queueStatus" = 'Completed' AND p."isActive" = true
      GROUP BY t.id ORDER BY attempts DESC, t.name LIMIT 10`,
  ]);
  const totalSubmissions = verdicts.reduce((sum, v) => sum + v._count, 0);
  const acceptedSubmissions = verdicts.find(v => v.status === 'ACCEPTED')?._count || 0;
  return { ...saved, totalSolved: solved.length, easySolved: solved.filter(p => p.difficulty === 'EASY').length,
    mediumSolved: solved.filter(p => p.difficulty === 'MEDIUM').length, hardSolved: solved.filter(p => p.difficulty === 'HARD').length,
    totalSubmissions, acceptedSubmissions, acceptanceRate: totalSubmissions ? acceptedSubmissions / totalSubmissions * 100 : 0,
    problemTotals: Object.fromEntries(totals.map(t => [t.difficulty, t._count])),
    totalProblems: totals.reduce((sum, t) => sum + t._count, 0), topics: topics.map(t => ({ name: t.name, attempts: Number(t.attempts) })) };
}
