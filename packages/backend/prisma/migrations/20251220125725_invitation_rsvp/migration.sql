-- CreateEnum
CREATE TYPE "InvitationRsvpStatus" AS ENUM ('YES', 'NO', 'MAYBE');

-- CreateTable
CREATE TABLE "invitation_rsvps" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "status" "InvitationRsvpStatus" NOT NULL,
    "name" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invitation_rsvps_invitationId_idx" ON "invitation_rsvps"("invitationId");

-- CreateIndex
CREATE INDEX "invitation_rsvps_status_idx" ON "invitation_rsvps"("status");

-- CreateIndex
CREATE INDEX "invitation_rsvps_createdAt_idx" ON "invitation_rsvps"("createdAt");

-- AddForeignKey
ALTER TABLE "invitation_rsvps" ADD CONSTRAINT "invitation_rsvps_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
