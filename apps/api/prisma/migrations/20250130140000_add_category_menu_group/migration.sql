-- AlterTable
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "menu_group" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "categories_menu_group_idx" ON "categories"("menu_group");
