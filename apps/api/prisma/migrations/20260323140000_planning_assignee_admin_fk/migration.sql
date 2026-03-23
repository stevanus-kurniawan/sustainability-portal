-- Drop free-text assignee; use FK to admins instead.
ALTER TABLE "admin_planning_activities" DROP COLUMN IF EXISTS "assignee";

ALTER TABLE "admin_planning_activities" ADD COLUMN "assignee_admin_id" TEXT;

ALTER TABLE "admin_planning_activities" ADD CONSTRAINT "admin_planning_activities_assignee_admin_id_fkey" FOREIGN KEY ("assignee_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "admin_planning_activities_assignee_admin_id_idx" ON "admin_planning_activities"("assignee_admin_id");
