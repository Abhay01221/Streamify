ALTER TABLE "Problem" ADD COLUMN "sourceName" TEXT NOT NULL DEFAULT 'CodeForge',
  ADD COLUMN "sourceUrl" TEXT, ADD COLUMN "sourceProblemId" TEXT,
  ADD COLUMN "license" TEXT, ADD COLUMN "attribution" TEXT;
CREATE UNIQUE INDEX "Problem_sourceName_sourceProblemId_key" ON "Problem"("sourceName", "sourceProblemId");
ALTER TABLE "StudyPlan" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "CourseModule" (
  "id" TEXT NOT NULL, "studyPlanId" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '', "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseModule_studyPlanId_slug_key" ON "CourseModule"("studyPlanId", "slug");
CREATE INDEX "CourseModule_studyPlanId_order_idx" ON "CourseModule"("studyPlanId", "order");
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CourseLesson" (
  "id" TEXT NOT NULL, "moduleId" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL, "summary" TEXT NOT NULL DEFAULT '', "content" TEXT NOT NULL,
  "estimatedMinutes" INTEGER NOT NULL DEFAULT 20, "order" INTEGER NOT NULL DEFAULT 0,
  "resources" JSONB NOT NULL DEFAULT '[]', CONSTRAINT "CourseLesson_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseLesson_moduleId_slug_key" ON "CourseLesson"("moduleId", "slug");
CREATE INDEX "CourseLesson_moduleId_order_idx" ON "CourseLesson"("moduleId", "order");
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CourseLessonProblem" (
  "id" TEXT NOT NULL, "lessonId" TEXT NOT NULL, "problemId" TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CourseLessonProblem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseLessonProblem_lessonId_problemId_key" ON "CourseLessonProblem"("lessonId", "problemId");
CREATE INDEX "CourseLessonProblem_problemId_idx" ON "CourseLessonProblem"("problemId");
ALTER TABLE "CourseLessonProblem" ADD CONSTRAINT "CourseLessonProblem_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLessonProblem" ADD CONSTRAINT "CourseLessonProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserLessonProgress" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "lessonId" TEXT NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserLessonProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserLessonProgress_userId_lessonId_key" ON "UserLessonProgress"("userId", "lessonId");
CREATE INDEX "UserLessonProgress_lessonId_idx" ON "UserLessonProgress"("lessonId");
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
