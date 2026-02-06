-- Ensure the UserStatus enum has PENDING_VERIFICATION value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserStatus'
      AND e.enumlabel = 'PENDING_VERIFICATION'
  ) THEN
    ALTER TYPE "UserStatus" ADD VALUE 'PENDING_VERIFICATION';
  END IF;
END$$;

