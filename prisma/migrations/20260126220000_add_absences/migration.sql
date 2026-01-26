-- CreateTable
CREATE TABLE "absences" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "absences_user_id_idx" ON "absences"("user_id");

-- CreateIndex
CREATE INDEX "absences_start_date_end_date_idx" ON "absences"("start_date", "end_date");
