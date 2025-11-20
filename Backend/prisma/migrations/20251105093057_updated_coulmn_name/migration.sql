/*
  Warnings:

  - You are about to drop the column `dataOfBirth` on the `EmployeeProfile` table. All the data in the column will be lost.
  - Added the required column `dateOfBirth` to the `EmployeeProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmployeeProfile" DROP COLUMN "dataOfBirth",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3) NOT NULL;
