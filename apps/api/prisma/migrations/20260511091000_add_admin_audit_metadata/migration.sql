ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "created_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

ALTER TABLE "admins"
  ADD COLUMN IF NOT EXISTS "created_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

ALTER TABLE "roles"
  ADD COLUMN IF NOT EXISTS "created_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

ALTER TABLE "permissions"
  ADD COLUMN IF NOT EXISTS "created_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "created_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

ALTER TABLE "sub_contents"
  ADD COLUMN IF NOT EXISTS "created_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

ALTER TABLE "tags"
  ADD COLUMN IF NOT EXISTS "created_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

ALTER TABLE "admin_planning_activities"
  ADD COLUMN IF NOT EXISTS "created_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

ALTER TABLE "operational_units"
  ADD COLUMN IF NOT EXISTS "created_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;
