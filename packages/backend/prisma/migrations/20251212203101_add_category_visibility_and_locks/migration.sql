-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "challengeDescription" TEXT,
ADD COLUMN     "challengeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "uploadLockUntil" TIMESTAMP(3),
ADD COLUMN     "uploadLocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "categories_isVisible_idx" ON "categories"("isVisible");
