import 'dotenv/config';
import { prisma } from './utils/prisma';
async function main() {
  const days = Number(process.env.SOURCE_RETENTION_DAYS || 90);
  if (!Number.isInteger(days) || days < 1) throw new Error('SOURCE_RETENTION_DAYS must be a positive integer');
  const cutoff = new Date(Date.now() - days * 86400000);
  const result = await prisma.$transaction([
    prisma.submission.updateMany({ where: { completedAt: { lt: cutoff }, queueStatus: { in: ['Completed', 'Failed'] } },
      data: { code: '[Source removed by retention policy]', customInput: null, runOutput: null, runError: null, errorMessage: null } }),
    prisma.submissionTestResult.updateMany({ where: { submission: { completedAt: { lt: cutoff } } }, data: { actualOutput: null, expectedOutput: null, errorMessage: null } }),
    prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  ]);
  console.log('Retention completed', result.map(r => r.count));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
