-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "daysLWP" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "totalEmployees" INTEGER NOT NULL,
    "totalGross" DOUBLE PRECISION NOT NULL,
    "totalDeductions" DOUBLE PRECISION NOT NULL,
    "totalNet" DOUBLE PRECISION NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRunItem" (
    "id" TEXT NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "hra" DOUBLE PRECISION NOT NULL,
    "allowances" DOUBLE PRECISION NOT NULL,
    "grossSalary" DOUBLE PRECISION NOT NULL,
    "pfDeduction" DOUBLE PRECISION NOT NULL,
    "taxDeduction" DOUBLE PRECISION NOT NULL,
    "lwpDeduction" DOUBLE PRECISION NOT NULL,
    "otherDeductions" DOUBLE PRECISION NOT NULL,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "lwpDays" DOUBLE PRECISION NOT NULL,
    "runId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PayrollRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_tenantId_month_year_key" ON "PayrollRun"("tenantId", "month", "year");

-- CreateIndex
CREATE INDEX "PayrollRunItem_runId_idx" ON "PayrollRunItem"("runId");

-- CreateIndex
CREATE INDEX "PayrollRunItem_userId_idx" ON "PayrollRunItem"("userId");

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunItem" ADD CONSTRAINT "PayrollRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunItem" ADD CONSTRAINT "PayrollRunItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunItem" ADD CONSTRAINT "PayrollRunItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
