-- AlterTable
ALTER TABLE "guestbook_entries" ADD COLUMN     "audioDurationMs" INTEGER,
ADD COLUMN     "audioMimeType" TEXT,
ADD COLUMN     "audioSizeBytes" BIGINT,
ADD COLUMN     "audioStoragePath" TEXT,
ADD COLUMN     "audioUrl" TEXT;

-- AlterTable
ALTER TABLE "photo_likes" ADD COLUMN     "reactionType" TEXT;

-- CreateTable
CREATE TABLE "guestbook_audio_uploads" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "guestbook_audio_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guestbook_audio_uploads_eventId_idx" ON "guestbook_audio_uploads"("eventId");

-- CreateIndex
CREATE INDEX "guestbook_audio_uploads_storagePath_idx" ON "guestbook_audio_uploads"("storagePath");

-- CreateIndex
CREATE INDEX "guestbook_audio_uploads_expiresAt_idx" ON "guestbook_audio_uploads"("expiresAt");

-- CreateIndex
CREATE INDEX "guestbook_audio_uploads_claimedAt_idx" ON "guestbook_audio_uploads"("claimedAt");

-- AddForeignKey
ALTER TABLE "guestbook_audio_uploads" ADD CONSTRAINT "guestbook_audio_uploads_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
