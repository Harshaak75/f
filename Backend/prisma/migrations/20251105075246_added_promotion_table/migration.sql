-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PromotionRequest" (
    "id" TEXT NOT NULL,
    "currentDesignation" TEXT NOT NULL,
    "currentAnnualCTC" DOUBLE PRECISION NOT NULL,
    "proposedDesignation" TEXT NOT NULL,
    "proposedAnnualCTC" DOUBLE PRECISION NOT NULL,
    "proposedIncrementPercent" DOUBLE PRECISION NOT NULL,
    "budgetImpact" DOUBLE PRECISION NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING_MANAGER',
    "managerNotes" TEXT,
    "hrNotes" TEXT,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "approvedById" TEXT,

    CONSTRAINT "PromotionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromotionRequest_tenantId_status_idx" ON "PromotionRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PromotionRequest_userId_idx" ON "PromotionRequest"("userId");

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
