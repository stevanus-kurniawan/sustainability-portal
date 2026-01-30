-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admins_email_idx" ON "admins"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admins_status_idx" ON "admins"("status");
