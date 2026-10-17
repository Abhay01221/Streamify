import { PrismaClient } from '@prisma/client';
import { originalProblems } from './originalProblems';
import { dsaProblems } from './dsaProblems';
import { dsaCourse } from './dsaCourse';
const prisma = new PrismaClient();
async function main() {
  const problems = [...originalProblems, ...dsaProblems];
  for (const p of problems) {
    const tag = await prisma.tag.upsert({ where: { slug: p.tag }, create: { slug: p.tag, name: p.tag }, update: {} });
    await prisma.problem.upsert({ where: { slug: p.slug }, update: {}, create: {
      number: p.number, slug: p.slug, title: p.title, difficulty: p.difficulty, description: p.description, referenceSolution: p.reference, hints: [],
      sourceName: 'CodeForge', license: 'Original CodeForge content', attribution: 'CodeForge curriculum authors',
      tags: { create: { tagId: tag.id } }, constraints: { create: p.constraints.map((text, order) => ({ text, order })) },
      testCases: { create: p.testCases.map((tc, order) => ({ ...tc, order })) },
      examples: { create: [{ inputText: p.testCases[0].input, outputText: p.testCases[0].output }] },
      starterCode: { create: { language: 'python', code: '# Read standard input and print the answer.\n' } },
      editorial: { create: { title: 'Reference solution', isPremium: false, content: '```python\n' + p.reference + '\n```' } },
    } });
    await prisma.tag.update({ where: { id: tag.id }, data: { problemCount: await prisma.problemTag.count({ where: { tagId: tag.id } }) } });
  }
  // Preserve authored course edits and existing completion records on repeated seeds.
  if (!await prisma.studyPlan.findUnique({ where: { slug: dsaCourse.slug }, select: { id: true } })) {
    const catalog = await prisma.problem.findMany({ where: { slug: { in: problems.map(p => p.slug) } }, select: { id: true, slug: true } });
    const bySlug = new Map(catalog.map(p => [p.slug, p.id]));
    const problemSlugs = [...new Set(dsaCourse.modules.flatMap(m => m.lessons.flatMap(l => l.problemSlugs)))];
    if (problemSlugs.some(slug => !bySlug.has(slug))) throw new Error('Seed course contains an unknown practice problem');
    const { modules, ...course } = dsaCourse;
    await prisma.studyPlan.create({ data: { ...course,
      problems: { create: problemSlugs.map((slug, order) => ({ problemId: bySlug.get(slug)!, day: order + 1, order })) },
      modules: { create: modules.map((module, order) => ({ slug: module.slug, title: module.title, description: module.description, order,
        lessons: { create: module.lessons.map((lesson, lessonOrder) => ({
          slug: lesson.slug, title: lesson.title, summary: lesson.summary, content: lesson.content,
          estimatedMinutes: lesson.estimatedMinutes, resources: lesson.resources, order: lessonOrder,
          problems: { create: lesson.problemSlugs.map((slug, problemOrder) => ({ problemId: bySlug.get(slug)!, order: problemOrder })) },
        })) },
      })) },
    } });
  }
  console.log(`Seeded ${problems.length} original practice problems and the ${dsaCourse.modules.length}-module DSA course. No users or fabricated statistics created.`);
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
