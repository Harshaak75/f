/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,employeeId]` on the table `EmployeeProfile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employeeId` to the `EmployeeProfile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE');

-- DropForeignKey
ALTER TABLE "public"."AssignedAsset" DROP CONSTRAINT "AssignedAsset_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AssignedAsset" DROP CONSTRAINT "AssignedAsset_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Offer" DROP CONSTRAINT "Offer_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Offer" DROP CONSTRAINT "Offer_userId_fkey";

-- DropIndex
DROP INDEX "public"."AssignedAsset_serialNumber_key";

-- DropIndex
DROP INDEX "public"."AssignedAsset_tenantId_userId_idx";

-- DropIndex
DROP INDEX "public"."DocumentUpload_tenantId_userId_idx";

-- DropIndex
DROP INDEX "public"."EmployeeProfile_tenantId_idx";

-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN     "employeeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "hoursWorked" DOUBLE PRECISION,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "summary" TEXT,
    "goalsCompleted" INTEGER,
    "goalsTotal" INTEGER,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "targetUserId" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_tenantId_userId_date_key" ON "AttendanceRecord"("tenantId", "userId", "date");

-- CreateIndex
CREATE INDEX "PerformanceReview_tenantId_userId_reviewDate_idx" ON "PerformanceReview"("tenantId", "userId", "reviewDate");

-- CreateIndex
CREATE INDEX "ActivityLog_tenantId_timestamp_idx" ON "ActivityLog"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "ActivityLog_performedById_idx" ON "ActivityLog"("performedById");

-- CreateIndex
CREATE INDEX "ActivityLog_targetUserId_idx" ON "ActivityLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AssignedAsset_tenantId_userId_assetType_idx" ON "AssignedAsset"("tenantId", "userId", "assetType");

-- CreateIndex
CREATE INDEX "DocumentUpload_tenantId_userId_documentType_idx" ON "DocumentUpload"("tenantId", "userId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_tenantId_employeeId_key" ON "EmployeeProfile"("tenantId", "employeeId");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedAsset" ADD CONSTRAINT "AssignedAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedAsset" ADD CONSTRAINT "AssignedAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
