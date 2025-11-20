-- AlterTable
ALTER TABLE "tenant_api_table" ALTER COLUMN "apiKey" DROP NOT NULL,
ALTER COLUMN "createdByUserId" DROP NOT NULL,
ALTER COLUMN "hashedKey" DROP NOT NULL;
