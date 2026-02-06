-- Ensure unverified users are marked as pending verification
UPDATE "users"
SET "status" = 'PENDING_VERIFICATION'
WHERE "email_verified" = false;

