-- AlterTable
ALTER TABLE "events" ADD COLUMN     "profileDescription" TEXT;

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "isStoryOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "videoId" TEXT,
ALTER COLUMN "photoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "isStoryOnly" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "stories_photoId_idx" ON "stories"("photoId");

-- CreateIndex
CREATE INDEX "stories_videoId_idx" ON "stories"("videoId");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
