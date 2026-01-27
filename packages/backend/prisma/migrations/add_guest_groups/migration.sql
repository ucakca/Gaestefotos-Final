-- CreateTable
CREATE TABLE "guest_groups" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_groups_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "guests" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "guest_groups_eventId_idx" ON "guest_groups"("eventId");

-- CreateIndex
CREATE INDEX "guests_groupId_idx" ON "guests"("groupId");

-- AddForeignKey
ALTER TABLE "guest_groups" ADD CONSTRAINT "guest_groups_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "guest_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
