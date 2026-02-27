-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actor_admin_id" TEXT,
ADD COLUMN     "actor_user_id" TEXT,
ADD COLUMN     "after_json" JSONB,
ADD COLUMN     "before_json" JSONB,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "user_agent" TEXT;

-- CreateIndex
CREATE INDEX "admins_role_idx" ON "admins"("role");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_admin_id_idx" ON "audit_logs"("actor_admin_id");
