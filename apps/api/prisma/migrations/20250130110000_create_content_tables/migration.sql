-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('POLICY', 'CERTIFICATION', 'LICENSE', 'GRIEVANCE', 'TRACEABILITY', 'GENERAL');
CREATE TYPE "CertificationStatus" AS ENUM ('ACTIVE', 'EXPIRING', 'EXPIRED');
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRING', 'EXPIRED');
CREATE TYPE "GrievanceStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'CLOSED');

-- CreateTable: categories (minimal; menu_group and mode added in later migrations)
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable: documents (without external_link, sub_content_id, is_deleted/deleted_by/deleted_at; added in later migrations)
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "category_id" INTEGER,
    "current_version_id" INTEGER,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" SERIAL NOT NULL,
    "document_id" INTEGER NOT NULL,
    "version_no" INTEGER NOT NULL,
    "file_key" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "approval_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_tags" (
    "document_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "document_tags_pkey" PRIMARY KEY ("document_id","tag_id")
);

-- CreateTable: certifications (without external_link, category_id, sub_content_id; added in later migrations)
CREATE TABLE "certifications" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "certificate_no" TEXT,
    "issued_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "status" "CertificationStatus" NOT NULL DEFAULT 'ACTIVE',
    "document_id" INTEGER,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: licenses (without external_link, sub_content_id; added in later migrations)
CREATE TABLE "licenses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "authority" TEXT,
    "license_no" TEXT,
    "issued_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "document_id" INTEGER,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: grievance_cases (without external_link; added in next migration)
CREATE TABLE "grievance_cases" (
    "id" SERIAL NOT NULL,
    "case_no" TEXT NOT NULL,
    "status" "GrievanceStatus" NOT NULL DEFAULT 'OPEN',
    "category" TEXT,
    "received_date" TIMESTAMP(3) NOT NULL,
    "public_summary" TEXT,
    "evidence_document_id" INTEGER,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grievance_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grievance_updates" (
    "id" SERIAL NOT NULL,
    "grievance_case_id" INTEGER NOT NULL,
    "update_text" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grievance_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_is_public_idx" ON "categories"("is_public");
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");
CREATE UNIQUE INDEX "documents_current_version_id_key" ON "documents"("current_version_id");
CREATE INDEX "documents_type_idx" ON "documents"("type");
CREATE INDEX "documents_is_public_idx" ON "documents"("is_public");
CREATE INDEX "documents_is_published_idx" ON "documents"("is_published");
CREATE INDEX "documents_category_id_idx" ON "documents"("category_id");
CREATE INDEX "documents_published_at_idx" ON "documents"("published_at");
CREATE UNIQUE INDEX "document_versions_document_id_version_no_key" ON "document_versions"("document_id", "version_no");
CREATE INDEX "document_versions_document_id_idx" ON "document_versions"("document_id");
CREATE INDEX "document_tags_document_id_idx" ON "document_tags"("document_id");
CREATE INDEX "document_tags_tag_id_idx" ON "document_tags"("tag_id");
CREATE INDEX "certifications_status_idx" ON "certifications"("status");
CREATE INDEX "certifications_document_id_idx" ON "certifications"("document_id");
CREATE INDEX "certifications_expiry_date_idx" ON "certifications"("expiry_date");
CREATE INDEX "licenses_status_idx" ON "licenses"("status");
CREATE INDEX "licenses_document_id_idx" ON "licenses"("document_id");
CREATE INDEX "licenses_expiry_date_idx" ON "licenses"("expiry_date");
CREATE UNIQUE INDEX "grievance_cases_case_no_key" ON "grievance_cases"("case_no");
CREATE INDEX "grievance_cases_status_idx" ON "grievance_cases"("status");
CREATE INDEX "grievance_cases_category_idx" ON "grievance_cases"("category");
CREATE INDEX "grievance_cases_received_date_idx" ON "grievance_cases"("received_date");
CREATE INDEX "grievance_updates_grievance_case_id_idx" ON "grievance_updates"("grievance_case_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "grievance_cases" ADD CONSTRAINT "grievance_cases_evidence_document_id_fkey" FOREIGN KEY ("evidence_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "grievance_updates" ADD CONSTRAINT "grievance_updates_grievance_case_id_fkey" FOREIGN KEY ("grievance_case_id") REFERENCES "grievance_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
