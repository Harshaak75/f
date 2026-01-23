-- CreateEnum
CREATE TYPE "AccessRole" AS ENUM ('OPERATOR', 'MANAGER', 'PROJECT_MANAGER');

-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN     "accessRole" "AccessRole" NOT NULL DEFAULT 'OPERATOR';
