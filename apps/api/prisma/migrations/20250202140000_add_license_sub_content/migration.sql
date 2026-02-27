-- AlterTable
ALTER TABLE "licenses" ADD COLUMN "sub_content_id" INTEGER;

-- CreateIndex
CREATE INDEX "licenses_sub_content_id_idx" ON "licenses"("sub_content_id");

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_sub_content_id_fkey" FOREIGN KEY ("sub_content_id") REFERENCES "sub_contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
