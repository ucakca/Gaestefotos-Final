-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('HEADER', 'TEXT', 'IMAGE', 'VIDEO', 'COUNTDOWN', 'RSVP', 'LOCATION', 'AGENDA', 'CUSTOM');

-- CreateTable
CREATE TABLE "invitation_sections" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "title" TEXT,
    "content" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_group_access" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "section_group_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invitation_sections_invitationId_idx" ON "invitation_sections"("invitationId");

-- CreateIndex
CREATE INDEX "invitation_sections_order_idx" ON "invitation_sections"("order");

-- CreateIndex
CREATE INDEX "section_group_access_sectionId_idx" ON "section_group_access"("sectionId");

-- CreateIndex
CREATE INDEX "section_group_access_groupId_idx" ON "section_group_access"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "section_group_access_sectionId_groupId_key" ON "section_group_access"("sectionId", "groupId");

-- AddForeignKey
ALTER TABLE "invitation_sections" ADD CONSTRAINT "invitation_sections_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_group_access" ADD CONSTRAINT "section_group_access_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "invitation_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_group_access" ADD CONSTRAINT "section_group_access_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "guest_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
