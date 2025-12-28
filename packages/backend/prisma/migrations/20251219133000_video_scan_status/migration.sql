-- Add video scan fields for quarantine-first virus scan pipeline
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "scanStatus" TEXT;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "scannedAt" TIMESTAMP(3);
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "scanError" TEXT;

-- Helpful indexes for monitoring
CREATE INDEX IF NOT EXISTS "videos_scanStatus_idx" ON "videos"("scanStatus");
CREATE INDEX IF NOT EXISTS "videos_scannedAt_idx" ON "videos"("scannedAt");
