-- CreateTable
CREATE TABLE "tenant_api_table" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_api_table_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_api_table_apiKey_key" ON "tenant_api_table"("apiKey");

-- CreateIndex
CREATE INDEX "tenant_api_table_tenantId_idx" ON "tenant_api_table"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_api_table" ADD CONSTRAINT "tenant_api_table_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
