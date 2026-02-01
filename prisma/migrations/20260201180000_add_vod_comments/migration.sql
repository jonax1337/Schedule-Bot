-- CreateTable
CREATE TABLE "vod_comments" (
    "id" SERIAL NOT NULL,
    "scrim_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vod_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vod_comments_scrim_id_timestamp_idx" ON "vod_comments"("scrim_id", "timestamp");

-- AddForeignKey
ALTER TABLE "vod_comments" ADD CONSTRAINT "vod_comments_scrim_id_fkey" FOREIGN KEY ("scrim_id") REFERENCES "scrims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
