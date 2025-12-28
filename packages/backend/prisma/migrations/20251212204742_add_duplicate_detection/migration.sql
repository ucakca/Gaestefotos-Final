-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "duplicateGroupId" TEXT,
ADD COLUMN     "isBestInGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "md5Hash" TEXT,
ADD COLUMN     "perceptualHash" TEXT,
ADD COLUMN     "qualityScore" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "photos_duplicateGroupId_idx" ON "photos"("duplicateGroupId");

-- CreateIndex
CREATE INDEX "photos_perceptualHash_idx" ON "photos"("perceptualHash");

-- CreateIndex
CREATE INDEX "photos_md5Hash_idx" ON "photos"("md5Hash");
