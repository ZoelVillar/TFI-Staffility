-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "position" TEXT,
ADD COLUMN     "salary" DOUBLE PRECISION;
