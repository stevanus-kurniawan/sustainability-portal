-- CreateEnum
CREATE TYPE "PlanningActivityStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'RESCHEDULE');

-- CreateTable
CREATE TABLE "admin_planning_activities" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "PlanningActivityStatus" NOT NULL DEFAULT 'PENDING',
    "assignee" TEXT NOT NULL DEFAULT '',
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_planning_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_planning_activities_start_date_idx" ON "admin_planning_activities"("start_date");
CREATE INDEX "admin_planning_activities_end_date_idx" ON "admin_planning_activities"("end_date");
