-- DropIndex
DROP INDEX "videos_scanStatus_idx";

-- DropIndex
DROP INDEX "videos_scannedAt_idx";

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB DEFAULT '{}',
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_short_links" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "invitation_short_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_visits" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "shortLinkId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_slug_key" ON "invitations"("slug");

-- CreateIndex
CREATE INDEX "invitations_eventId_idx" ON "invitations"("eventId");

-- CreateIndex
CREATE INDEX "invitations_slug_idx" ON "invitations"("slug");

-- CreateIndex
CREATE INDEX "invitations_isActive_idx" ON "invitations"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_short_links_code_key" ON "invitation_short_links"("code");

-- CreateIndex
CREATE INDEX "invitation_short_links_invitationId_idx" ON "invitation_short_links"("invitationId");

-- CreateIndex
CREATE INDEX "invitation_short_links_code_idx" ON "invitation_short_links"("code");

-- CreateIndex
CREATE INDEX "invitation_visits_invitationId_idx" ON "invitation_visits"("invitationId");

-- CreateIndex
CREATE INDEX "invitation_visits_shortLinkId_idx" ON "invitation_visits"("shortLinkId");

-- CreateIndex
CREATE INDEX "invitation_visits_createdAt_idx" ON "invitation_visits"("createdAt");

-- CreateIndex
CREATE INDEX "invitation_templates_isActive_idx" ON "invitation_templates"("isActive");

-- CreateIndex
CREATE INDEX "woo_webhook_receipts_wc_order_id_idx" ON "woo_webhook_receipts"("wc_order_id");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_short_links" ADD CONSTRAINT "invitation_short_links_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_visits" ADD CONSTRAINT "invitation_visits_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_visits" ADD CONSTRAINT "invitation_visits_shortLinkId_fkey" FOREIGN KEY ("shortLinkId") REFERENCES "invitation_short_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
