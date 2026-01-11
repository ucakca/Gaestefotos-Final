-- AlterTable
ALTER TABLE "package_definitions" ADD COLUMN     "allowBulkOperations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowCoHosts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowFaceSearch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowFullInvitation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowGuestbook" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowGuestlist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowLiveWall" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowPasswordProtect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowStories" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowVideoUpload" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowZipDownload" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isAdFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxCategories" INTEGER,
ADD COLUMN     "maxChallenges" INTEGER,
ADD COLUMN     "maxCoHosts" INTEGER,
ADD COLUMN     "maxZipDownloadPhotos" INTEGER,
ADD COLUMN     "priceEurCents" INTEGER,
ADD COLUMN     "storageLimitPhotos" INTEGER;

-- CreateIndex
CREATE INDEX "package_definitions_displayOrder_idx" ON "package_definitions"("displayOrder");
