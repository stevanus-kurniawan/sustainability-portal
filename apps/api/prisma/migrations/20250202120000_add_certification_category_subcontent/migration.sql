-- AlterTable: add category and sub-content placement for certifications
ALTER TABLE "certifications" ADD COLUMN "category_id" INTEGER;
ALTER TABLE "certifications" ADD COLUMN "sub_content_id" INTEGER;

-- Foreign keys
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_sub_content_id_fkey" FOREIGN KEY ("sub_content_id") REFERENCES "sub_contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "certifications_category_id_idx" ON "certifications"("category_id");
CREATE INDEX "certifications_sub_content_id_idx" ON "certifications"("sub_content_id");
