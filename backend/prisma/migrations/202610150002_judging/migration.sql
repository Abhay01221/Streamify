-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'OUTPUT_LIMIT_EXCEEDED';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "customInput" TEXT,
ADD COLUMN     "isRun" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "queueStatus" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN     "runError" TEXT,
ADD COLUMN     "runOutput" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "verdict" TEXT;

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_problemId_key" ON "Bookmark"("userId", "problemId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Submission_queueStatus_createdAt_idx" ON "Submission"("queueStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill completed historic submissions; their original Run/Submit mode is unknowable.
UPDATE "Submission" SET "queueStatus" = CASE WHEN status = 'SYSTEM_ERROR' THEN 'Failed' ELSE 'Completed' END,
"verdict" = status::text, "completedAt" = "createdAt" WHERE status NOT IN ('PENDING', 'RUNNING');
-- Invalidate credentials minted before session-bound authentication.
UPDATE "RefreshToken" SET "isRevoked" = true;
UPDATE "UserSession" SET "isActive" = false;
