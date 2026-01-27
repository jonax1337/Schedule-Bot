-- CreateEnum
CREATE TYPE "VetoAction" AS ENUM ('BAN', 'PICK', 'DECIDER');

-- CreateEnum
CREATE TYPE "VetoTeam" AS ENUM ('OUR_TEAM', 'OPPONENT');

-- CreateTable
CREATE TABLE "map_veto_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "opponent" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_veto_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_veto_entries" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "action" "VetoAction" NOT NULL,
    "map" TEXT NOT NULL,
    "team" "VetoTeam" NOT NULL,

    CONSTRAINT "map_veto_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "map_veto_sessions_date_idx" ON "map_veto_sessions"("date");

-- CreateIndex
CREATE INDEX "map_veto_entries_session_id_idx" ON "map_veto_entries"("session_id");

-- AddForeignKey
ALTER TABLE "map_veto_entries" ADD CONSTRAINT "map_veto_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "map_veto_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
