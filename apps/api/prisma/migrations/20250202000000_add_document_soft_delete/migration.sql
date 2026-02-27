-- AlterTable
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "deleted_by" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_is_deleted_idx" ON "documents"("is_deleted");
