-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FEATURE', 'BUG', 'MAINTENANCE', 'SUPPORT', 'CHORE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('OK', 'ATTENTION', 'CRITICAL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "capacityHoursPerWeek" INTEGER,
ADD COLUMN     "capacitySpPerWeek" INTEGER,
ADD COLUMN     "hoursPerStoryPoint" INTEGER;

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "teamId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'FEATURE',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimateSp" INTEGER NOT NULL DEFAULT 0,
    "estimateHours" INTEGER,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workload_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "plannedSp" INTEGER NOT NULL,
    "plannedHours" INTEGER NOT NULL,
    "capacitySp" INTEGER NOT NULL,
    "capacityHours" INTEGER NOT NULL,
    "utilizationPct" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "burnoutScore" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workload_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_companyId_ownerId_status_dueDate_idx" ON "tasks"("companyId", "ownerId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "tasks_companyId_teamId_idx" ON "tasks"("companyId", "teamId");

-- CreateIndex
CREATE INDEX "tasks_companyId_ownerId_startDate_idx" ON "tasks"("companyId", "ownerId", "startDate");

-- CreateIndex
CREATE INDEX "task_comments_taskId_idx" ON "task_comments"("taskId");

-- CreateIndex
CREATE INDEX "workload_snapshots_weekStart_idx" ON "workload_snapshots"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "workload_snapshots_userId_weekStart_key" ON "workload_snapshots"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "users_companyId_seniority_idx" ON "users"("companyId", "seniority");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workload_snapshots" ADD CONSTRAINT "workload_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
