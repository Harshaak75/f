-- CreateTable
CREATE TABLE "CustomReport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataDomain" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "exportOptions" TEXT[],
    "lastRun" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "CustomReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomReport_tenantId_idx" ON "CustomReport"("tenantId");

-- AddForeignKey
ALTER TABLE "CustomReport" ADD CONSTRAINT "CustomReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomReport" ADD CONSTRAINT "CustomReport_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
