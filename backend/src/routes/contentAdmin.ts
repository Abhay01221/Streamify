import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { courseSchema, courseSlugSchema, saveCourse } from '../services/courses';
import { importProblems, previewProblems, problemImportSchema } from '../services/problemImport';

const router = Router();
router.use(authenticate, requireAdmin);
router.post('/problems/preview', async (req, res, next) => {
  try { res.json(await previewProblems(problemImportSchema.parse(req.body))); } catch (err) { next(err); }
});
router.post('/problems/import', async (req, res, next) => {
  try { res.status(201).json(await importProblems(problemImportSchema.parse(req.body), req.user!.id)); } catch (err) { next(err); }
});
router.get('/courses', async (_req, res, next) => {
  try { res.json({ courses: await prisma.studyPlan.findMany({ orderBy: { createdAt: 'desc' }, take: 100,
    select: { id: true, slug: true, title: true, isPublished: true } }) }); } catch (err) { next(err); }
});
router.get('/courses/:id', async (req, res, next) => {
  try {
    const course = await prisma.studyPlan.findFirst({ where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
      include: { modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' },
        include: { problems: { orderBy: { order: 'asc' }, include: { problem: { select: { slug: true } } } } } } } } } });
    if (!course) throw new AppError('Course not found', 404);
    res.json({ course: { title: course.title, description: course.description, difficulty: course.difficulty,
      estimatedDays: course.estimatedDays, isPublished: course.isPublished, isPremium: course.isPremium,
      modules: course.modules.map(m => ({ slug: m.slug, title: m.title, description: m.description,
        lessons: m.lessons.map(l => ({ slug: l.slug, title: l.title, summary: l.summary, content: l.content,
          estimatedMinutes: l.estimatedMinutes, problemSlugs: l.problems.map(p => p.problem.slug), resources: l.resources })) })) } });
  } catch (err) { next(err); }
});
router.put('/courses/:slug', async (req, res, next) => {
  try { res.json({ course: await saveCourse(courseSlugSchema.parse(req.params.slug), courseSchema.parse(req.body), req.user!.id) }); }
  catch (err) { next(err); }
});
export default router;
