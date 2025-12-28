-- AlterTable
ALTER TABLE "events" ADD COLUMN     "designAssetsBytes" BIGINT;

-- AlterTable
ALTER TABLE "guestbook_entries" ADD COLUMN     "photoSizeBytes" BIGINT;

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "sizeBytes" BIGINT;

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "sizeBytes" BIGINT;
