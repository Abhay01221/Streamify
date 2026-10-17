import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const slug = z.string().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const problem = z.object({
  title: z.string().min(3).max(200), slug, number: z.number().int().positive(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']), description: z.string().min(10).max(65536),
  referenceSolution: z.string().min(1).max(65536),
  timeLimit: z.number().int().min(100).max(10000).default(2000),
  memoryLimit: z.number().int().min(16384).max(262144).default(262144),
  tags: z.array(slug).max(20).default([]), constraints: z.array(z.string().max(2000)).max(50).default([]),
  testCases: z.array(z.object({ input: z.string().max(65536), output: z.string().max(65536), isSample: z.boolean() }).strict()).min(1).max(100),
  starterCode: z.record(z.enum(['python', 'python3']), z.string().max(65536)).default({ python: '# Read standard input and print the answer.\n' }),
  sourceName: z.string().min(1).max(100).default('CodeForge'), sourceUrl: z.string().url().max(2000).optional(),
  sourceProblemId: z.string().max(200).optional(), license: z.string().max(1000).optional(), attribution: z.string().max(2000).optional(),
}).strict().superRefine((item, ctx) => {
  if (!item.testCases.some(tc => tc.isSample)) ctx.addIssue({ code: 'custom', path: ['testCases'], message: 'Provide at least one sample case' });
  if (item.sourceName !== 'CodeForge' && (!item.license?.trim() || !item.attribution?.trim() || !item.sourceUrl)) {
    ctx.addIssue({ code: 'custom', path: ['license'], message: 'External content requires a source URL, license/permission details and attribution' });
  }
});
export const problemImportSchema = z.object({ problems: z.array(problem).min(1).max(25) }).strict().superRefine((input, ctx) => {
  for (const field of ['slug', 'number'] as const) {
    if (new Set(input.problems.map(p => p[field])).size !== input.problems.length) {
      ctx.addIssue({ code: 'custom', path: ['problems'], message: `Duplicate ${field} inside import` });
    }
  }
});
export type ProblemImportInput = z.infer<typeof problemImportSchema>;

export async function previewProblems(input: ProblemImportInput) {
  const existing = await prisma.problem.findMany({ where: { OR: [
    { slug: { in: input.problems.map(p => p.slug) } }, { number: { in: input.problems.map(p => p.number) } },
    ...input.problems.filter(p => p.sourceProblemId).map(p => ({ sourceName: p.sourceName, sourceProblemId: p.sourceProblemId })),
  ] }, select: { slug: true, number: true, sourceName: true, sourceProblemId: true } });
  const items = input.problems.map(p => {
    const match = existing.find(e => e.slug === p.slug || e.number === p.number || (p.sourceProblemId && e.sourceName === p.sourceName && e.sourceProblemId === p.sourceProblemId));
    return { slug: p.slug, title: p.title, duplicate: !!match, conflict: match ? `Conflicts with ${match.slug} (#${match.number})` : null };
  });
  return { valid: !items.some(item => item.duplicate), items };
}

export async function importProblems(input: ProblemImportInput, actorId: string) {
  if (!(await previewProblems(input)).valid) throw new AppError('Import contains existing slugs, numbers or source IDs; no problems were saved', 409);
  await prisma.$transaction(async tx => {
    for (const p of input.problems) {
      const { tags, constraints, testCases, starterCode, ...fields } = p;
      const tagIds: string[] = [];
      for (const name of [...new Set(tags)]) {
        const tag = await tx.tag.upsert({ where: { slug: name }, create: { slug: name, name }, update: {} });
        tagIds.push(tag.id);
      }
      const saved = await tx.problem.create({ data: { ...fields, isActive: false, hints: [],
        tags: { create: tagIds.map(tagId => ({ tagId })) },
        constraints: { create: constraints.map((text, order) => ({ text, order })) },
        testCases: { create: testCases.map((tc, order) => ({ ...tc, order })) },
        examples: { create: testCases.filter(tc => tc.isSample).map((tc, order) => ({ inputText: tc.input, outputText: tc.output, order })) },
        starterCode: { create: Object.entries(starterCode).map(([language, code]) => ({ language, code })) },
      } });
      for (const tagId of tagIds) await tx.tag.update({ where: { id: tagId }, data: { problemCount: { increment: 1 } } });
      await tx.auditEvent.create({ data: { actorId, action: 'problem.import', targetId: saved.id } });
    }
  }, { timeout: 30000 });
  return { imported: input.problems.length };
}
