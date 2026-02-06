-- Add email verification fields (no token storage)
ALTER TABLE "users"
ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- Preserve existing ACTIVE users (no forced re-verification)
UPDATE "users"
SET
  "email_verified" = true,
  "email_verified_at" = NOW()
WHERE "status" = 'ACTIVE';

