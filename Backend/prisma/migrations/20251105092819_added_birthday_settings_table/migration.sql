/*
  Warnings:

  - Added the required column `dataOfBirth` to the `EmployeeProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN     "dataOfBirth" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "enableAnniversaryEmails" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableBirthdayEmails" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "geofenceRadius" INTEGER,
ADD COLUMN     "milestoneEmailTemplate" TEXT,
ADD COLUMN     "officeLatitude" DOUBLE PRECISION,
ADD COLUMN     "officeLongitude" DOUBLE PRECISION;
