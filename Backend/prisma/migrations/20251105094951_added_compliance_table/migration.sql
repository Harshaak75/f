-- CreateEnum
CREATE TYPE "GrievanceType" AS ENUM ('GRIEVANCE', 'DISCIPLINARY', 'POSH');

-- CreateEnum
CREATE TYPE "GrievanceStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAcknowledgment" (
    "id" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "policyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "PolicyAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrievanceCase" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "type" "GrievanceType" NOT NULL,
    "status" "GrievanceStatus" NOT NULL DEFAULT 'OPEN',
    "dateFiled" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateResolved" TIMESTAMP(3),
    "details" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filedById" TEXT NOT NULL,
    "aboutUserId" TEXT,

    CONSTRAINT "GrievanceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingModule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "TrainingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCompletion" (
    "id" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "TrainingCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Policy_tenantId_idx" ON "Policy"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcknowledgment_policyId_userId_key" ON "PolicyAcknowledgment"("policyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GrievanceCase_caseNumber_key" ON "GrievanceCase"("caseNumber");

-- CreateIndex
CREATE INDEX "GrievanceCase_tenantId_status_idx" ON "GrievanceCase"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TrainingModule_tenantId_idx" ON "TrainingModule"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCompletion_moduleId_userId_key" ON "TrainingCompletion"("moduleId", "userId");

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceCase" ADD CONSTRAINT "GrievanceCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceCase" ADD CONSTRAINT "GrievanceCase_filedById_fkey" FOREIGN KEY ("filedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceCase" ADD CONSTRAINT "GrievanceCase_aboutUserId_fkey" FOREIGN KEY ("aboutUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingModule" ADD CONSTRAINT "TrainingModule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
