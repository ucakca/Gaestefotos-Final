-- Add WebP storage path to photos
ALTER TABLE "photos" ADD COLUMN "storagePathWebp" TEXT;

-- Add composite indexes for query performance
CREATE INDEX IF NOT EXISTS "photos_eventId_status_createdAt_idx" ON "photos"("eventId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "photos_eventId_isStoryOnly_createdAt_idx" ON "photos"("eventId", "isStoryOnly", "createdAt");
CREATE INDEX IF NOT EXISTS "photos_eventId_uploadedBy_idx" ON "photos"("eventId", "uploadedBy");
