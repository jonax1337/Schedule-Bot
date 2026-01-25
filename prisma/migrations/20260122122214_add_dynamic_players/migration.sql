-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MAIN', 'SUB', 'COACH');

-- CreateEnum
CREATE TYPE "ScrimResult" AS ENUM ('WIN', 'LOSS', 'DRAW');

-- CreateTable
CREATE TABLE "schedules" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "focus" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_players" (
    "id" SERIAL NOT NULL,
    "schedule_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "availability" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mappings" (
    "id" SERIAL NOT NULL,
    "discord_id" TEXT NOT NULL,
    "discord_username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absences" (
    "id" TEXT NOT NULL,
    "discord_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrims" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "result" "ScrimResult" NOT NULL,
    "score_us" INTEGER NOT NULL DEFAULT 0,
    "score_them" INTEGER NOT NULL DEFAULT 0,
    "map" TEXT NOT NULL DEFAULT '',
    "match_type" TEXT NOT NULL DEFAULT '',
    "our_agents" TEXT NOT NULL DEFAULT '',
    "their_agents" TEXT NOT NULL DEFAULT '',
    "vod_url" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scrims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedules_date_key" ON "schedules"("date");

-- CreateIndex
CREATE INDEX "schedules_date_idx" ON "schedules"("date");

-- CreateIndex
CREATE INDEX "schedule_players_schedule_id_idx" ON "schedule_players"("schedule_id");

-- CreateIndex
CREATE INDEX "schedule_players_user_id_idx" ON "schedule_players"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_mappings_discord_id_key" ON "user_mappings"("discord_id");

-- CreateIndex
CREATE INDEX "user_mappings_discord_id_idx" ON "user_mappings"("discord_id");

-- CreateIndex
CREATE INDEX "user_mappings_role_sort_order_idx" ON "user_mappings"("role", "sort_order");

-- CreateIndex
CREATE INDEX "absences_discord_id_idx" ON "absences"("discord_id");

-- CreateIndex
CREATE INDEX "absences_start_date_idx" ON "absences"("start_date");

-- CreateIndex
CREATE INDEX "absences_end_date_idx" ON "absences"("end_date");

-- CreateIndex
CREATE INDEX "scrims_date_idx" ON "scrims"("date");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "schedule_players" ADD CONSTRAINT "schedule_players_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
