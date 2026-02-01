-- Extend qr_templates table with SVG fields and additional metadata

-- Add slug column (required, unique)
ALTER TABLE "qr_templates" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- Add SVG content columns
ALTER TABLE "qr_templates" ADD COLUMN IF NOT EXISTS "svgA6" TEXT;
ALTER TABLE "qr_templates" ADD COLUMN IF NOT EXISTS "svgA5" TEXT;
ALTER TABLE "qr_templates" ADD COLUMN IF NOT EXISTS "svgStory" TEXT;
ALTER TABLE "qr_templates" ADD COLUMN IF NOT EXISTS "svgSquare" TEXT;

-- Add default color columns
ALTER TABLE "qr_templates" ADD COLUMN IF NOT EXISTS "defaultBgColor" TEXT DEFAULT '#ffffff';
ALTER TABLE "qr_templates" ADD COLUMN IF NOT EXISTS "defaultTextColor" TEXT DEFAULT '#1a1a1a';
ALTER TABLE "qr_templates" ADD COLUMN IF NOT EXISTS "defaultAccentColor" TEXT DEFAULT '#295B4D';

-- Add metadata columns
ALTER TABLE "qr_templates" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "qr_templates" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;

-- Set default category if null
ALTER TABLE "qr_templates" ALTER COLUMN "category" SET DEFAULT 'MINIMAL';

-- Make config nullable (was required before)
ALTER TABLE "qr_templates" ALTER COLUMN "config" DROP NOT NULL;

-- Update existing rows: set slug from id if null
UPDATE "qr_templates" SET "slug" = "id" WHERE "slug" IS NULL;

-- Now make slug required and unique
ALTER TABLE "qr_templates" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "qr_templates_slug_key" ON "qr_templates"("slug");

-- Add new indexes
CREATE INDEX IF NOT EXISTS "qr_templates_isActive_idx" ON "qr_templates"("isActive");
CREATE INDEX IF NOT EXISTS "qr_templates_sortOrder_idx" ON "qr_templates"("sortOrder");
