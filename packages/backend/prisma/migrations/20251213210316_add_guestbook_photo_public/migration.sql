-- AlterTable
ALTER TABLE "guestbook_entries" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "photoStoragePath" TEXT;

-- CreateIndex
CREATE INDEX "guestbook_entries_isPublic_idx" ON "guestbook_entries"("isPublic");
