/*
  Warnings:

  - You are about to drop the column `targetAudience` on the `Survey` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SurveyTargetType" AS ENUM ('ALL', 'DEPARTMENT', 'DESIGNATION');

-- AlterTable
ALTER TABLE "Survey" DROP COLUMN "targetAudience",
ADD COLUMN     "targetType" "SurveyTargetType" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "targetValues" TEXT[];
