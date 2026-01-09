-- CreateEnum
CREATE TYPE "EventMemberRole" AS ENUM ('COHOST');

-- CreateTable
CREATE TABLE "event_members" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EventMemberRole" NOT NULL DEFAULT 'COHOST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_members_eventId_idx" ON "event_members"("eventId");

-- CreateIndex
CREATE INDEX "event_members_userId_idx" ON "event_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "event_members_eventId_userId_key" ON "event_members"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
