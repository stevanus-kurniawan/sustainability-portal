CREATE TYPE "ContentVersion" AS ENUM ('V1', 'V2');
CREATE TYPE "PolicyKind" AS ENUM ('SOP', 'FORM');
CREATE TYPE "RegulationKind" AS ENUM ('NATIONAL', 'INTERNATIONAL');
CREATE TYPE "ProcedureScope" AS ENUM ('SUSTAINABILITY', 'OPERATIONAL_UNIT');

ALTER TABLE "documents"
  ADD COLUMN "content_version" "ContentVersion" NOT NULL DEFAULT 'V1',
  ADD COLUMN "policy_kind" "PolicyKind",
  ADD COLUMN "regulation_kind" "RegulationKind",
  ADD COLUMN "procedure_scope" "ProcedureScope",
  ADD COLUMN "operational_unit_id" INTEGER;

ALTER TABLE "certifications"
  ADD COLUMN "content_version" "ContentVersion" NOT NULL DEFAULT 'V1',
  ADD COLUMN "operational_unit_id" INTEGER;

ALTER TABLE "licenses"
  ADD COLUMN "content_version" "ContentVersion" NOT NULL DEFAULT 'V1',
  ADD COLUMN "operational_unit_id" INTEGER;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_operational_unit_id_fkey"
  FOREIGN KEY ("operational_unit_id") REFERENCES "operational_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "certifications"
  ADD CONSTRAINT "certifications_operational_unit_id_fkey"
  FOREIGN KEY ("operational_unit_id") REFERENCES "operational_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "licenses"
  ADD CONSTRAINT "licenses_operational_unit_id_fkey"
  FOREIGN KEY ("operational_unit_id") REFERENCES "operational_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "documents_content_version_idx" ON "documents"("content_version");
CREATE INDEX "documents_policy_kind_idx" ON "documents"("policy_kind");
CREATE INDEX "documents_regulation_kind_idx" ON "documents"("regulation_kind");
CREATE INDEX "documents_procedure_scope_idx" ON "documents"("procedure_scope");
CREATE INDEX "documents_operational_unit_id_idx" ON "documents"("operational_unit_id");
CREATE INDEX "certifications_content_version_idx" ON "certifications"("content_version");
CREATE INDEX "certifications_operational_unit_id_idx" ON "certifications"("operational_unit_id");
CREATE INDEX "licenses_content_version_idx" ON "licenses"("content_version");
CREATE INDEX "licenses_operational_unit_id_idx" ON "licenses"("operational_unit_id");
