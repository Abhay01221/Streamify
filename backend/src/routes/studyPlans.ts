import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { courseInclude, courseProgress, learnerState } from '../services/courses';

const router = Router();
const lookup = (id: string) => ({ isPublished: true, OR: [{ id }, { slug: id }] });
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { page, limit } = pagination.parse(req.query);
    const [plans, total, state] = await Promise.all([
      prisma.studyPlan.findMany({ where: { isPublished: true }, include: courseInclude, orderBy: [{ order: 'asc' }, { slug: 'asc' }], skip: (page - 1) * limit, take: limit }),
      prisma.studyPlan.count({ where: { isPublished: true } }), learnerState(req.user?.id),
    ]);
    res.json({ plans: plans.map(plan => {
      const progress = courseProgress(plan, state);
      return { id: plan.id, slug: plan.slug, title: plan.title, description: plan.description, difficulty: plan.difficulty,
        estimatedDays: plan.estimatedDays, isPremium: plan.isPremium, problemCount: progress.totalProblems,
        moduleCount: plan.modules.length, lessonCount: progress.totalLessons, userProgress: state.enrolled.has(plan.id) ? progress : null };
    }), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const plan = await prisma.studyPlan.findFirst({ where: lookup(req.params.id), include: courseInclude });
    if (!plan) throw new AppError('Course not found', 404);
    if (plan.isPremium && !req.user?.isPremium && !req.user?.isAdmin) throw new AppError('Premium required for this course', 403);
    const state = await learnerState(req.user?.id);
    res.json({ plan: { id: plan.id, slug: plan.slug, title: plan.title, description: plan.description, difficulty: plan.difficulty,
      estimatedDays: plan.estimatedDays, isPremium: plan.isPremium,
      modules: plan.modules.map(module => ({ id: module.id, slug: module.slug, title: module.title, description: module.description, order: module.order,
        lessons: module.lessons.map(lesson => ({ id: lesson.id, slug: lesson.slug, title: lesson.title, summary: lesson.summary, content: lesson.content,
          estimatedMinutes: lesson.estimatedMinutes, order: lesson.order, resources: lesson.resources, completed: state.read.has(lesson.id),
          problems: lesson.problems.map(link => ({ ...link.problem, solved: state.solved.has(link.problemId) })) })) })),
      userProgress: state.enrolled.has(plan.id) ? courseProgress(plan, state) : null,
    } });
  } catch (err) { next(err); }
});

router.post('/:id/enroll', authenticate, async (req, res, next) => {
  try {
    const plan = await prisma.studyPlan.findFirst({ where: lookup(req.params.id), include: courseInclude });
    if (!plan) throw new AppError('Course not found', 404);
    if (plan.isPremium && !req.user!.isPremium && !req.user!.isAdmin) throw new AppError('Premium required for this course', 403);
    const progress = courseProgress(plan, await learnerState(req.user!.id));
    await prisma.userStudyPlanProgress.upsert({ where: { userId_studyPlanId: { userId: req.user!.id, studyPlanId: plan.id } },
      create: { userId: req.user!.id, studyPlanId: plan.id, totalProblems: progress.totalProblems, completedProblems: progress.completedProblems },
      update: { totalProblems: progress.totalProblems, completedProblems: progress.completedProblems } });
    res.json({ progress });
  } catch (err) { next(err); }
});

router.put('/:id/lessons/:lessonId/completion', authenticate, async (req, res, next) => {
  try {
    const { completed } = z.object({ completed: z.boolean() }).strict().parse(req.body);
    const lesson = await prisma.courseLesson.findFirst({ where: { id: req.params.lessonId, module: { studyPlan: lookup(req.params.id) } },
      select: { id: true, module: { select: { studyPlan: { select: { id: true, isPremium: true } } } } } });
    if (!lesson) throw new AppError('Lesson not found', 404);
    const plan = lesson.module.studyPlan;
    if (plan.isPremium && !req.user!.isPremium && !req.user!.isAdmin) throw new AppError('Premium required for this course', 403);
    const enrollment = await prisma.userStudyPlanProgress.findUnique({ where: { userId_studyPlanId: { userId: req.user!.id, studyPlanId: plan.id } } });
    if (!enrollment) throw new AppError('Enroll in the course before saving progress', 409);
    const key = { userId: req.user!.id, lessonId: lesson.id };
    if (completed) await prisma.userLessonProgress.upsert({ where: { userId_lessonId: key }, create: key, update: {} });
    else await prisma.userLessonProgress.deleteMany({ where: key });
    res.json({ completed });
  } catch (err) { next(err); }
});
export default router;
