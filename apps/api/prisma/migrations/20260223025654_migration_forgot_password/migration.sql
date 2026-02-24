-- CreateEnum
CREATE TYPE "TraceabilityEntityType" AS ENUM ('FACTORY', 'SUPPLIER', 'SITE');

-- CreateEnum
CREATE TYPE "TraceabilityRecordType" AS ENUM ('AUDIT', 'CHAIN_OF_CUSTODY', 'ORIGIN');

-- CreateTable
CREATE TABLE "traceability_entities" (
    "id" SERIAL NOT NULL,
    "entity_type" "TraceabilityEntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "region" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traceability_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traceability_records" (
    "id" SERIAL NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "record_type" "TraceabilityRecordType" NOT NULL,
    "record_date" TIMESTAMP(3) NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "evidence_document_id" INTEGER,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traceability_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "traceability_entities_entity_type_idx" ON "traceability_entities"("entity_type");

-- CreateIndex
CREATE INDEX "traceability_entities_name_idx" ON "traceability_entities"("name");

-- CreateIndex
CREATE INDEX "traceability_records_entity_id_idx" ON "traceability_records"("entity_id");

-- CreateIndex
CREATE INDEX "traceability_records_record_type_idx" ON "traceability_records"("record_type");

-- CreateIndex
CREATE INDEX "traceability_records_record_date_idx" ON "traceability_records"("record_date");

-- CreateIndex
CREATE INDEX "traceability_records_is_public_idx" ON "traceability_records"("is_public");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "tags_slug_idx" ON "tags"("slug");

-- AddForeignKey
ALTER TABLE "traceability_records" ADD CONSTRAINT "traceability_records_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "traceability_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceability_records" ADD CONSTRAINT "traceability_records_evidence_document_id_fkey" FOREIGN KEY ("evidence_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
