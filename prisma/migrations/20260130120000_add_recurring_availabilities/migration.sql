-- CreateTable
CREATE TABLE "recurring_availabilities" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "availability" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_availabilities_user_id_idx" ON "recurring_availabilities"("user_id");

-- CreateIndex
CREATE INDEX "recurring_availabilities_day_of_week_idx" ON "recurring_availabilities"("day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_availabilities_user_id_day_of_week_key" ON "recurring_availabilities"("user_id", "day_of_week");
