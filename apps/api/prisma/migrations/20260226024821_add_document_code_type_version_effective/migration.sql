-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "code" TEXT,
ADD COLUMN     "document_type" TEXT,
ADD COLUMN     "effective_date" TIMESTAMP(3),
ADD COLUMN     "version_label" TEXT;
