-- AlterTable: refresh_tokens - store SHA-256 hash of token instead of plain text.
-- Requires pgcrypto for digest().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Add new column (nullable for backfill).
ALTER TABLE "refresh_tokens" ADD COLUMN "token_hash" TEXT;

-- Step 2: Backfill existing rows (hash the current token so existing sessions stay valid).
UPDATE "refresh_tokens" SET "token_hash" = encode(digest("token", 'sha256'), 'hex') WHERE "token" IS NOT NULL;

-- Step 3: Enforce NOT NULL (any remaining nulls get a unique placeholder so UNIQUE is satisfied).
UPDATE "refresh_tokens" SET "token_hash" = encode(digest('invalid-' || "id", 'sha256'), 'hex') WHERE "token_hash" IS NULL;
ALTER TABLE "refresh_tokens" ALTER COLUMN "token_hash" SET NOT NULL;

-- Step 4: Drop old indexes and column.
DROP INDEX IF EXISTS "refresh_tokens_token_key";
DROP INDEX IF EXISTS "refresh_tokens_token_idx";
ALTER TABLE "refresh_tokens" DROP COLUMN "token";

-- Step 5: Create unique constraint and index on token_hash.
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");
