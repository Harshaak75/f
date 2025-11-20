/*
  Warnings:

  - Added the required column `createdByUserId` to the `tenant_api_table` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hashedKey` to the `tenant_api_table` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tenant_api_table" ADD COLUMN     "createdByUserId" TEXT NOT NULL,
ADD COLUMN     "hashedKey" TEXT NOT NULL;
