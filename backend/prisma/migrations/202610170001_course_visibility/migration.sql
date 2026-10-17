-- Earlier demo study plans were published without any lesson content.
-- Keep their records and enrollments, but require authoring before public display.
UPDATE "StudyPlan" AS plan SET "isPublished" = false
WHERE NOT EXISTS (
  SELECT 1 FROM "CourseModule" AS module
  JOIN "CourseLesson" AS lesson ON lesson."moduleId" = module.id
  WHERE module."studyPlanId" = plan.id
);
