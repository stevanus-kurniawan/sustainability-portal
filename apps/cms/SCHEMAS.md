# SLMS CMS - Content Type Schemas

This document describes all content types in the Strapi CMS and how to reproduce them.

## Content Types Overview

| Content Type | Description | Draft/Publish |
|--------------|-------------|---------------|
| Category | Document categories | No |
| Tag | Document tags | No |
| Document | Central document repository | Yes |
| DocumentVersion | Document version history | No |
| Certification | Sustainability certifications | Yes |
| License | Business/operational licenses | Yes |
| GrievanceCase | Grievance mechanism cases | No |
| GrievanceUpdate | Case activity log | No |
| TraceabilityEntity | Supply chain entities | No |
| TraceabilityRecord | Traceability audit records | Yes |

## Entity Relationship Diagram

```
Category (1) ─────────────< (N) Document
                                   │
Tag (N) ─────────────────────< (N) Document
                                   │
Document (1) ─────────────────> (1) DocumentVersion (currentVersion)
Document (1) ─────────────────< (N) DocumentVersion (versions)
                                   │
Certification (1) ─────────────> (1) Document
License (1) ─────────────────────> (1) Document
TraceabilityRecord (1) ──────────> (1) Document (evidenceDocument)
                                   
GrievanceCase (1) ─────────────< (N) GrievanceUpdate

TraceabilityEntity (1) ────────< (N) TraceabilityRecord
```

## Schema Definitions

### 1. Category
```json
{
  "name": "string (required)",
  "slug": "uid (from name)",
  "isPublic": "boolean (default: true)",
  "displayOrder": "integer (default: 0)"
}
```

### 2. Tag
```json
{
  "name": "string (required, unique)",
  "slug": "uid (from name)"
}
```

### 3. Document
```json
{
  "title": "string (required)",
  "type": "enum [POLICY, CERTIFICATION, LICENSE, GRIEVANCE, TRACEABILITY, GENERAL]",
  "isPublic": "boolean (default: false)",
  "isPublished": "boolean (default: false)",
  "publishedDate": "datetime",
  "description": "richtext",
  "category": "relation (many-to-one -> Category)",
  "tags": "relation (many-to-many -> Tag)",
  "currentVersion": "relation (one-to-one -> DocumentVersion)",
  "versions": "relation (one-to-many -> DocumentVersion)"
}
```

### 4. DocumentVersion
```json
{
  "versionNo": "integer (required, min: 1)",
  "file": "media (single, required)",
  "fileHash": "string",
  "approvalStatus": "enum [DRAFT, IN_REVIEW, APPROVED, REJECTED] (default: DRAFT)",
  "validFrom": "date",
  "validTo": "date",
  "uploadedByEmail": "string",
  "document": "relation (many-to-one -> Document)"
}
```

### 5. Certification
```json
{
  "name": "string (required)",
  "issuer": "string",
  "certificateNo": "string",
  "issuedDate": "date",
  "expiryDate": "date (required)",
  "status": "enum [ACTIVE, EXPIRING, EXPIRED] (default: ACTIVE)",
  "document": "relation (one-to-one -> Document)"
}
```

### 6. License
```json
{
  "name": "string (required)",
  "authority": "string",
  "licenseNo": "string",
  "issuedDate": "date",
  "expiryDate": "date (required)",
  "status": "enum [ACTIVE, EXPIRING, EXPIRED] (default: ACTIVE)",
  "document": "relation (one-to-one -> Document)"
}
```

### 7. GrievanceCase
```json
{
  "caseNo": "string (required, unique)",
  "channel": "enum [WEB, EMAIL, HOTLINE, OTHER] (default: WEB)",
  "status": "enum [OPEN, IN_REVIEW, CLOSED] (default: OPEN)",
  "category": "string",
  "receivedDate": "date",
  "ownerEmail": "string",
  "publicSummary": "text",
  "isPublicSummary": "boolean (default: false)"
}
```

### 8. GrievanceUpdate
```json
{
  "grievanceCase": "relation (many-to-one -> GrievanceCase)",
  "message": "text",
  "createdByEmail": "string",
  "createdAt": "datetime"
}
```

### 9. TraceabilityEntity
```json
{
  "entityType": "enum [FACTORY, SUPPLIER, SITE] (required)",
  "name": "string (required)",
  "code": "string",
  "region": "string"
}
```

### 10. TraceabilityRecord
```json
{
  "entity": "relation (many-to-one -> TraceabilityEntity)",
  "recordType": "enum [AUDIT, CHAIN_OF_CUSTODY, ORIGIN] (required)",
  "recordDate": "date",
  "isPublic": "boolean (default: false)",
  "evidenceDocument": "relation (one-to-one -> Document)"
}
```

## Database Indexes

The following indexes are created for performance optimization:

| Table | Column(s) | Index Name |
|-------|-----------|------------|
| grievance_cases | case_no | idx_grievance_cases_case_no |
| grievance_cases | status | idx_grievance_cases_status |
| certifications | expiry_date | idx_certifications_expiry_date |
| certifications | status, expiry_date | idx_certifications_status_expiry |
| licenses | expiry_date | idx_licenses_expiry_date |
| licenses | status, expiry_date | idx_licenses_status_expiry |
| documents | type | idx_documents_type |
| documents | is_public | idx_documents_is_public |

## Reproducing Schemas

### Option 1: Using Code (Recommended)

All schemas are defined in code under `src/api/*/content-types/*/schema.json`. 
When Strapi starts, it reads these files and creates/updates the database schema.

```bash
# Start Strapi to auto-create tables
pnpm --filter @slms/cms develop
```

### Option 2: Export/Import

```bash
# Export existing configuration
pnpm --filter @slms/cms strapi configuration:dump --file config-dump.json

# Import configuration to new instance
pnpm --filter @slms/cms strapi configuration:restore --file config-dump.json
```

### Option 3: Database Migrations

Custom migrations are in `database/migrations/`. They run automatically on startup.

To manually run migrations:
```bash
pnpm --filter @slms/cms strapi database:migrate
```

## API Endpoints

Once Strapi is running, all content types are available via REST API:

| Content Type | Endpoint |
|--------------|----------|
| Category | `/api/categories` |
| Tag | `/api/tags` |
| Document | `/api/documents` |
| DocumentVersion | `/api/document-versions` |
| Certification | `/api/certifications` |
| License | `/api/licenses` |
| GrievanceCase | `/api/grievance-cases` |
| GrievanceUpdate | `/api/grievance-updates` |
| TraceabilityEntity | `/api/traceability-entities` |
| TraceabilityRecord | `/api/traceability-records` |

> Note: API access requires proper permissions to be set in the Strapi admin panel under Settings > Users & Permissions > Roles.
