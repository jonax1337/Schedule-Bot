-- AlterTable
ALTER TABLE "scrims" ADD COLUMN "tracker_url" TEXT NOT NULL DEFAULT '';
ALTER TABLE "scrims" ADD COLUMN "tracker_data" JSONB;
