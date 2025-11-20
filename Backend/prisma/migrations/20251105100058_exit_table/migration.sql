-- CreateEnum
CREATE TYPE "ExitStatus" AS ENUM ('ACTIVE', 'PENDING_FNF', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClearanceDepartment" AS ENUM ('IT', 'FINANCE', 'HR', 'MANAGER');

-- CreateEnum
CREATE TYPE "ClearanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ExitCase" (
    "id" TEXT NOT NULL,
    "status" "ExitStatus" NOT NULL DEFAULT 'ACTIVE',
    "resignationDate" TIMESTAMP(3) NOT NULL,
    "lastDay" TIMESTAMP(3) NOT NULL,
    "reasonForLeaving" TEXT,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "initiatedById" TEXT NOT NULL,

    CONSTRAINT "ExitCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClearanceTask" (
    "id" TEXT NOT NULL,
    "department" "ClearanceDepartment" NOT NULL,
    "status" "ClearanceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "exitCaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "approvedById" TEXT,

    CONSTRAINT "ClearanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExitCase_tenantId_status_idx" ON "ExitCase"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ExitCase_userId_idx" ON "ExitCase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClearanceTask_exitCaseId_department_key" ON "ClearanceTask"("exitCaseId", "department");

-- AddForeignKey
ALTER TABLE "ExitCase" ADD CONSTRAINT "ExitCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitCase" ADD CONSTRAINT "ExitCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitCase" ADD CONSTRAINT "ExitCase_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceTask" ADD CONSTRAINT "ClearanceTask_exitCaseId_fkey" FOREIGN KEY ("exitCaseId") REFERENCES "ExitCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceTask" ADD CONSTRAINT "ClearanceTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceTask" ADD CONSTRAINT "ClearanceTask_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
