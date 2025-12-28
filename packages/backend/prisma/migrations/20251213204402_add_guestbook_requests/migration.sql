-- AlterTable
ALTER TABLE "events" ALTER COLUMN "featuresConfig" SET DEFAULT '{"showGuestlist":false,"mysteryMode":false,"allowUploads":true,"moderationRequired":false,"allowDownloads":true}';

-- CreateTable
CREATE TABLE "guestbook_requests" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "message" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guestbook_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guestbook_requests_eventId_idx" ON "guestbook_requests"("eventId");

-- CreateIndex
CREATE INDEX "guestbook_requests_guestId_idx" ON "guestbook_requests"("guestId");

-- CreateIndex
CREATE INDEX "guestbook_requests_isRead_idx" ON "guestbook_requests"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "guestbook_requests_eventId_guestId_key" ON "guestbook_requests"("eventId", "guestId");

-- AddForeignKey
ALTER TABLE "guestbook_requests" ADD CONSTRAINT "guestbook_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guestbook_requests" ADD CONSTRAINT "guestbook_requests_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
