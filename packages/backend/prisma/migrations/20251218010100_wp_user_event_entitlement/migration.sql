-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'REPLACED', 'CANCELLED');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "eventCode" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "wordpressUserId" INTEGER;

-- CreateTable
CREATE TABLE "event_entitlements" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "wpUserId" INTEGER NOT NULL,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL,
    "wcOrderId" TEXT,
    "wcProductId" TEXT,
    "wcSku" TEXT,
    "storageLimitBytes" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_entitlements_eventId_idx" ON "event_entitlements"("eventId");

-- CreateIndex
CREATE INDEX "event_entitlements_wpUserId_idx" ON "event_entitlements"("wpUserId");

-- CreateIndex
CREATE INDEX "event_entitlements_status_idx" ON "event_entitlements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "events_eventCode_key" ON "events"("eventCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_wordpressUserId_key" ON "users"("wordpressUserId");

-- AddForeignKey
ALTER TABLE "event_entitlements" ADD CONSTRAINT "event_entitlements_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
