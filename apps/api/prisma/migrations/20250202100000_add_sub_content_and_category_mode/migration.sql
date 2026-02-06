-- CreateEnum
CREATE TYPE "CategoryMode" AS ENUM ('DIRECT', 'WITH_SUBCONTENT');

-- AlterTable: add mode to categories (default DIRECT for backward compatibility)
ALTER TABLE "categories" ADD COLUMN "mode" "CategoryMode" NOT NULL DEFAULT 'DIRECT';

-- CreateTable: sub_contents
CREATE TABLE "sub_contents" (
    "id" SERIAL NOT NULL,
    "parent_category_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_contents_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add sub_content_id to documents (nullable)
ALTER TABLE "documents" ADD COLUMN "sub_content_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "sub_contents_parent_category_id_slug_key" ON "sub_contents"("parent_category_id", "slug");
CREATE INDEX "sub_contents_parent_category_id_idx" ON "sub_contents"("parent_category_id");
CREATE INDEX "documents_sub_content_id_idx" ON "documents"("sub_content_id");

-- AddForeignKey
ALTER TABLE "sub_contents" ADD CONSTRAINT "sub_contents_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_sub_content_id_fkey" FOREIGN KEY ("sub_content_id") REFERENCES "sub_contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
