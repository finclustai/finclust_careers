-- AlterEnum
ALTER TYPE "ApplicationSource" ADD VALUE 'TELEGRAM' BEFORE 'LINKEDIN';

-- AlterTable
ALTER TABLE "job_openings" ADD COLUMN     "share_message" TEXT;
