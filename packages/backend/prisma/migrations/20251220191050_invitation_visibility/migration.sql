-- CreateEnum
CREATE TYPE "InvitationVisibility" AS ENUM ('UNLISTED', 'PUBLIC');

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "visibility" "InvitationVisibility" NOT NULL DEFAULT 'UNLISTED';

-- CreateIndex
CREATE INDEX "invitations_visibility_idx" ON "invitations"("visibility");
