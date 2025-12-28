-- CreateTable
CREATE TABLE "guestbook_photo_uploads" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),

  CONSTRAINT "guestbook_photo_uploads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "guestbook_photo_uploads" ADD CONSTRAINT "guestbook_photo_uploads_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "guestbook_photo_uploads_eventId_idx" ON "guestbook_photo_uploads"("eventId");

-- CreateIndex
CREATE INDEX "guestbook_photo_uploads_storagePath_idx" ON "guestbook_photo_uploads"("storagePath");

-- CreateIndex
CREATE INDEX "guestbook_photo_uploads_expiresAt_idx" ON "guestbook_photo_uploads"("expiresAt");

-- CreateIndex
CREATE INDEX "guestbook_photo_uploads_claimedAt_idx" ON "guestbook_photo_uploads"("claimedAt");
