import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const slug = z.string().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const resourceSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().max(2000).refine(value => new URL(value).protocol === 'https:', 'Use an HTTPS resource URL'),
  kind: z.enum(['practice', 'reading', 'video']),
}).strict();
export const courseSchema = z.object({
  title: z.string().min(3).max(200), description: z.string().min(10).max(10000),
  difficulty: z.string().min(3).max(80), estimatedDays: z.number().int().min(1).max(730),
  isPublished: z.boolean().default(false), isPremium: z.boolean().default(false),
  modules: z.array(z.object({
    slug, title: z.string().min(3).max(200), description: z.string().max(10000).default(''),
    lessons: z.array(z.object({
      slug, title: z.string().min(3).max(200), summary: z.string().max(1000).default(''),
      content: z.string().min(80).max(65536), estimatedMinutes: z.number().int().min(1).max(240).default(20),
      problemSlugs: z.array(slug).max(30).default([]), resources: z.array(resourceSchema).max(20).default([]),
    }).strict()).min(1).max(30),
  }).strict()).min(1).max(40),
}).strict().superRefine((course, ctx) => {
  if (new Set(course.modules.map(m => m.slug)).size !== course.modules.length) {
    ctx.addIssue({ code: 'custom', message: 'Module slugs must be unique', path: ['modules'] });
  }
  course.modules.forEach((module, i) => {
    if (new Set(module.lessons.map(l => l.slug)).size !== module.lessons.length) {
      ctx.addIssue({ code: 'custom', message: 'Lesson slugs must be unique within a module', path: ['modules', i, 'lessons'] });
    }
    module.lessons.forEach((lesson, j) => {
      if (new Set(lesson.problemSlugs).size !== lesson.problemSlugs.length) {
        ctx.addIssue({ code: 'custom', message: 'A lesson cannot repeat a problem', path: ['modules', i, 'lessons', j, 'problemSlugs'] });
      }
    });
  });
});
export type CourseInput = z.infer<typeof courseSchema>;
export const courseSlugSchema = slug;

export const courseInclude = Prisma.validator<Prisma.StudyPlanInclude>()({
  modules: { orderBy: { order: 'asc' }, include: {
    lessons: { orderBy: { order: 'asc' }, include: {
      problems: { orderBy: { order: 'asc' }, where: { problem: { isActive: true } },
        include: { problem: { select: { id: true, slug: true, title: true, difficulty: true, isPremium: true } } } },
    } },
  } },
  problems: { where: { problem: { isActive: true } }, select: { problemId: true } },
});
type Course = Prisma.StudyPlanGetPayload<{ include: typeof courseInclude }>;

export async function learnerState(userId?: string) {
  if (!userId) return { solved: new Set<string>(), read: new Set<string>(), enrolled: new Set<string>() };
  const [accepted, lessons, enrollment] = await Promise.all([
    prisma.submission.findMany({ where: { userId, isRun: false, queueStatus: 'Completed', status: 'ACCEPTED', problem: { isActive: true } },
      distinct: ['problemId'], select: { problemId: true } }),
    prisma.userLessonProgress.findMany({ where: { userId }, select: { lessonId: true } }),
    prisma.userStudyPlanProgress.findMany({ where: { userId }, select: { studyPlanId: true } }),
  ]);
  return { solved: new Set(accepted.map(s => s.problemId)), read: new Set(lessons.map(l => l.lessonId)), enrolled: new Set(enrollment.map(e => e.studyPlanId)) };
}

export function courseProgress(course: Course, state: Awaited<ReturnType<typeof learnerState>>) {
  const lessons = course.modules.flatMap(m => m.lessons);
  const problemIds = new Set([...course.problems.map(p => p.problemId), ...lessons.flatMap(l => l.problems.map(p => p.problemId))]);
  const completedProblems = [...problemIds].filter(id => state.solved.has(id)).length;
  const completedLessons = lessons.filter(l => state.read.has(l.id)).length;
  const total = problemIds.size + lessons.length;
  return { completedProblems, totalProblems: problemIds.size, completedLessons, totalLessons: lessons.length,
    percentage: total ? Math.round((completedProblems + completedLessons) / total * 100) : 0 };
}

// Stable slugs preserve completion records when content is edited.
// Removed modules/lessons are deleted with their completion records.
export async function saveCourse(courseSlug: string, data: CourseInput, actorId: string) {
  const slugs = [...new Set(data.modules.flatMap(m => m.lessons.flatMap(l => l.problemSlugs)))];
  const catalog = await prisma.problem.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true, isActive: true } });
  if (catalog.length !== slugs.length) throw new AppError('One or more practice problems do not exist', 400);
  if (data.isPublished && catalog.some(p => !p.isActive)) throw new AppError('Publish linked practice problems before publishing the course', 400);
  const bySlug = new Map(catalog.map(p => [p.slug, p.id]));
  const { modules, ...fields } = data;
  return prisma.$transaction(async tx => {
    const plan = await tx.studyPlan.upsert({ where: { slug: courseSlug }, create: { slug: courseSlug, ...fields }, update: fields });
    await tx.$queryRaw`SELECT id FROM "StudyPlan" WHERE id = ${plan.id} FOR UPDATE`;
    await tx.courseModule.deleteMany({ where: { studyPlanId: plan.id, slug: { notIn: modules.map(m => m.slug) } } });
    for (const [order, module] of modules.entries()) {
      const savedModule = await tx.courseModule.upsert({ where: { studyPlanId_slug: { studyPlanId: plan.id, slug: module.slug } },
        create: { studyPlanId: plan.id, slug: module.slug, title: module.title, description: module.description, order },
        update: { title: module.title, description: module.description, order } });
      await tx.courseLesson.deleteMany({ where: { moduleId: savedModule.id, slug: { notIn: module.lessons.map(l => l.slug) } } });
      for (const [lessonOrder, lesson] of module.lessons.entries()) {
        const { problemSlugs, ...lessonFields } = lesson;
        const savedLesson = await tx.courseLesson.upsert({ where: { moduleId_slug: { moduleId: savedModule.id, slug: lesson.slug } },
          create: { ...lessonFields, order: lessonOrder, moduleId: savedModule.id }, update: { ...lessonFields, order: lessonOrder } });
        await tx.courseLessonProblem.deleteMany({ where: { lessonId: savedLesson.id } });
        await tx.courseLessonProblem.createMany({ data: problemSlugs.map((problemSlug, problemOrder) => ({ lessonId: savedLesson.id, problemId: bySlug.get(problemSlug)!, order: problemOrder })) });
      }
    }
    await tx.studyPlanProblem.deleteMany({ where: { studyPlanId: plan.id } });
    await tx.studyPlanProblem.createMany({ data: slugs.map((problemSlug, order) => ({ studyPlanId: plan.id, problemId: bySlug.get(problemSlug)!, day: order + 1, order })) });
    await tx.auditEvent.create({ data: { actorId, action: 'course.save', targetId: plan.id } });
    return plan;
  }, { timeout: 30000 });
}
