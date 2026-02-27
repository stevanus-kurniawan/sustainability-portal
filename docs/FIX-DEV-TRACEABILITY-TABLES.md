# Fix: `traceability_records` / `traceability_entities` do not exist

The traceability tables are created by migration **`20260223025654_migration_forgot_password`**. If the API starts but those tables are missing, either the migration never ran or the DB is in an inconsistent state.

Run these on the **backend server** (where Docker dev backend runs).

---

## Step 1: Check migration status

```bash
cd /path/to/sustainability-portal
docker compose -f infra/docker-compose.dev.backend.yml exec api npx prisma migrate status
```

- If it says **"X migration(s) pending"** (e.g. 20260223025654 or others) → go to **Step 2**.
- If it says **"Database schema is up to date!"** but you still get "table does not exist" → go to **Step 3**.

---

## Step 2: Pending migrations – apply them

```bash
docker compose -f infra/docker-compose.dev.backend.yml exec api npx prisma migrate deploy
```

Then restart the API so it picks up the schema:

```bash
docker compose -f infra/docker-compose.dev.backend.yml restart api
```

Check logs:

```bash
docker compose -f infra/docker-compose.dev.backend.yml logs api --tail 50
```

Then try the traceability endpoints again.

---

## Step 3: "Up to date" but tables missing (inconsistent state)

Prisma thinks the migration was applied, but the tables were never created (e.g. partial apply or restored DB). Fix by re-applying that migration.

**If you get P3011** ("Migration ... cannot be rolled back because it was never applied"): the migration is **pending**, not applied. Use **Step 2** instead — run `prisma migrate deploy` only (no `resolve --rolled-back`).

**3a) Mark the migration as rolled back** (only if `migrate status` shows it as applied)

```bash
docker compose -f infra/docker-compose.dev.backend.yml exec api npx prisma migrate resolve --rolled-back "20260223025654_migration_forgot_password"
```

**3b) Apply migrations again**

```bash
docker compose -f infra/docker-compose.dev.backend.yml exec api npx prisma migrate deploy
```

**3c) Restart the API**

```bash
docker compose -f infra/docker-compose.dev.backend.yml restart api
```

Then verify:

```bash
docker compose -f infra/docker-compose.dev.backend.yml exec postgres psql -U slms -d slms -c "\dt traceability*"
```

You should see `traceability_entities` and `traceability_records`.

---

## Step 3b (alternative): "No pending migrations" but tables are missing

Prisma has the migration recorded as applied, but the tables were never created. Remove the migration record so Prisma can run it again.

**Delete the migration record from the database** (run on backend server):

```bash
docker compose -f infra/docker-compose.dev.backend.yml exec postgres psql -U slms -d slms -c "DELETE FROM _prisma_migrations WHERE migration_name = '20260223025654_migration_forgot_password';"
```

**Then apply migrations** (this will run the migration and create the tables):

```bash
docker compose -f infra/docker-compose.dev.backend.yml exec api npx prisma migrate deploy
```

If deploy fails (e.g. on `categories_slug_idx` or `tags_slug_idx` because those indexes already exist), use **Step 4** below to create only the traceability tables by hand and then mark the migration as applied.

**Restart the API:**

```bash
docker compose -f infra/docker-compose.dev.backend.yml restart api
```

---

## Step 4: If Step 3b fails (e.g. migration SQL errors on existing objects)

Apply the traceability part of the migration by hand.

**4a) Connect to Postgres**

```bash
docker compose -f infra/docker-compose.dev.backend.yml exec postgres psql -U slms -d slms
```

**4b) Run this SQL** (creates enums and tables; safe to run only if they don’t exist):

```sql
-- Only if types don't exist yet
CREATE TYPE "TraceabilityEntityType" AS ENUM ('FACTORY', 'SUPPLIER', 'SITE');
CREATE TYPE "TraceabilityRecordType" AS ENUM ('AUDIT', 'CHAIN_OF_CUSTODY', 'ORIGIN');

-- Only if tables don't exist yet
CREATE TABLE IF NOT EXISTS "traceability_entities" (
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

CREATE TABLE IF NOT EXISTS "traceability_records" (
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

CREATE INDEX IF NOT EXISTS "traceability_entities_entity_type_idx" ON "traceability_entities"("entity_type");
CREATE INDEX IF NOT EXISTS "traceability_entities_name_idx" ON "traceability_entities"("name");
CREATE INDEX IF NOT EXISTS "traceability_records_entity_id_idx" ON "traceability_records"("entity_id");
CREATE INDEX IF NOT EXISTS "traceability_records_record_type_idx" ON "traceability_records"("record_type");
CREATE INDEX IF NOT EXISTS "traceability_records_record_date_idx" ON "traceability_records"("record_date");
CREATE INDEX IF NOT EXISTS "traceability_records_is_public_idx" ON "traceability_records"("is_public");

ALTER TABLE "traceability_records" DROP CONSTRAINT IF EXISTS "traceability_records_entity_id_fkey";
ALTER TABLE "traceability_records" ADD CONSTRAINT "traceability_records_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "traceability_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "traceability_records" DROP CONSTRAINT IF EXISTS "traceability_records_evidence_document_id_fkey";
ALTER TABLE "traceability_records" ADD CONSTRAINT "traceability_records_evidence_document_id_fkey" FOREIGN KEY ("evidence_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

If the enums already exist, you’ll get an error on the first two lines; that’s fine. Then type `\q` to exit psql.

**4c) Record the migration as applied** (so Prisma doesn’t try to run it again):

```bash
docker compose -f infra/docker-compose.dev.backend.yml exec api npx prisma migrate resolve --applied "20260223025654_migration_forgot_password"
```

**4d) Restart the API**

```bash
docker compose -f infra/docker-compose.dev.backend.yml restart api
```

---

## Summary

| Situation | Action |
|-----------|--------|
| Pending migrations | `prisma migrate deploy` → restart API |
| "Up to date" but no tables | `migrate resolve --rolled-back "20260223025654_migration_forgot_password"` → `migrate deploy` → restart API |
| Resolve + deploy still fails | Apply SQL in Step 4, then `migrate resolve --applied "20260223025654_migration_forgot_password"` → restart API |
