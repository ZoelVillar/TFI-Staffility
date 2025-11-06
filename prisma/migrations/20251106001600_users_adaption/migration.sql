/*
  Warnings:

  - You are about to drop the column `active` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `hireDate` on the `users` table. All the data in the column will be lost.
  - You are about to alter the column `salary` on the `users` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - A unique constraint covering the columns `[companyId,documentId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- DropIndex
DROP INDEX "public"."users_companyId_active_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "active",
DROP COLUMN "hireDate",
ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "department" TEXT,
ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "employmentType" "EmploymentType",
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "locationCity" TEXT,
ADD COLUMN     "locationCountry" TEXT,
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "workEmail" TEXT,
ADD COLUMN     "workMode" "WorkMode",
ALTER COLUMN "salary" SET DATA TYPE DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "users_companyId_email_idx" ON "users"("companyId", "email");

-- CreateIndex
CREATE INDEX "users_companyId_phone_idx" ON "users"("companyId", "phone");

-- CreateIndex
CREATE INDEX "users_companyId_status_idx" ON "users"("companyId", "status");

-- CreateIndex
CREATE INDEX "users_companyId_createdAt_id_idx" ON "users"("companyId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "users_companyId_documentId_key" ON "users"("companyId", "documentId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
