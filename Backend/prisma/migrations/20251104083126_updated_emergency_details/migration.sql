/*
  Warnings:

  - You are about to drop the column `emergencyPhone` on the `EmployeeProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmployeeProfile" DROP COLUMN "emergencyPhone",
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT;
