-- AlterTable
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "external_link" TEXT;

-- AlterTable
ALTER TABLE "certifications" ADD COLUMN IF NOT EXISTS "external_link" TEXT;

-- AlterTable
ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "external_link" TEXT;

-- AlterTable
ALTER TABLE "grievance_cases" ADD COLUMN IF NOT EXISTS "external_link" TEXT;
