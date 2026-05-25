CREATE TABLE "operational_units" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logo_file_key" TEXT,
  "color_class" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operational_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operational_units_slug_key" ON "operational_units"("slug");
CREATE INDEX "operational_units_name_idx" ON "operational_units"("name");
