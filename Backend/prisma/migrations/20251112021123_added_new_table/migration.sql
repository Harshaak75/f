-- AlterTable
ALTER TABLE "tenant_api_table" ADD COLUMN     "idpAuthUrl" TEXT,
ADD COLUMN     "idpClientId" TEXT,
ADD COLUMN     "idpClientSecret" TEXT,
ADD COLUMN     "idpIssuerUrl" TEXT,
ADD COLUMN     "idpTokenUrl" TEXT,
ADD COLUMN     "idpType" TEXT;

-- CreateTable
CREATE TABLE "ExternalIdentity" (
    "id" TEXT NOT NULL,
    "provider" TEXT,
    "subject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentity_email_key" ON "ExternalIdentity"("email");

-- AddForeignKey
ALTER TABLE "ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
