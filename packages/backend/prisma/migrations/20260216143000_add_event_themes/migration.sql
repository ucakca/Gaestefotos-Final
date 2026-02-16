-- CreateTable
CREATE TABLE "event_themes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "season" TEXT,
    "locationStyle" TEXT,
    "colors" JSONB NOT NULL,
    "animations" JSONB NOT NULL,
    "fonts" JSONB NOT NULL,
    "wallLayout" TEXT NOT NULL DEFAULT 'masonry',
    "previewImage" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_themes_slug_key" ON "event_themes"("slug");

-- CreateIndex
CREATE INDEX "event_themes_eventType_isPremium_idx" ON "event_themes"("eventType", "isPremium");

-- CreateIndex
CREATE INDEX "event_themes_isPublic_eventType_idx" ON "event_themes"("isPublic", "eventType");

-- AlterTable: Add theme fields to events
ALTER TABLE "events" ADD COLUMN "themeId" TEXT;
ALTER TABLE "events" ADD COLUMN "customThemeData" JSONB;

-- CreateIndex
CREATE INDEX "events_themeId_idx" ON "events"("themeId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "event_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
