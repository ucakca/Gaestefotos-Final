-- Add missing columns to invitation_templates (legacy table was name/config JSON)
ALTER TABLE "invitation_templates" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "invitation_templates" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "invitation_templates" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "invitation_templates" ADD COLUMN IF NOT EXISTS "html" TEXT;
ALTER TABLE "invitation_templates" ADD COLUMN IF NOT EXISTS "text" TEXT;

-- Best-effort backfill from legacy columns
UPDATE "invitation_templates"
SET
  "slug" = COALESCE(
    "slug",
    NULLIF(("config"->>'slug')::text, ''),
    regexp_replace(lower(COALESCE("name", 'template')), '\\s+', '-', 'g')
  ),
  "title" = COALESCE(
    "title",
    NULLIF(("config"->>'title')::text, ''),
    NULLIF("name", ''),
    'Template'
  ),
  "description" = COALESCE("description", NULLIF(("config"->>'description')::text, '')),
  "html" = COALESCE("html", NULLIF(("config"->>'html')::text, '')),
  "text" = COALESCE("text", NULLIF(("config"->>'text')::text, ''))
WHERE "slug" IS NULL OR "title" IS NULL OR "description" IS NULL OR "html" IS NULL OR "text" IS NULL;

-- Ensure slug/title exist for all rows (required by Prisma schema)
UPDATE "invitation_templates"
SET "slug" = COALESCE("slug", 'template-' || "id")
WHERE "slug" IS NULL OR btrim("slug") = '';

UPDATE "invitation_templates"
SET "title" = COALESCE(NULLIF(btrim("title"), ''), 'Template')
WHERE "title" IS NULL OR btrim("title") = '';

-- Resolve duplicate slugs by appending id suffix (best-effort)
WITH d AS (
  SELECT "slug", MIN("id") AS keep_id
  FROM "invitation_templates"
  WHERE "slug" IS NOT NULL
  GROUP BY "slug"
  HAVING COUNT(*) > 1
)
UPDATE "invitation_templates" t
SET "slug" = t."slug" || '-' || t."id"
FROM d
WHERE t."slug" = d."slug" AND t."id" <> d.keep_id;

-- Ensure slug is unique when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'invitation_templates_slug_key'
  ) THEN
    CREATE UNIQUE INDEX "invitation_templates_slug_key" ON "invitation_templates"("slug");
  END IF;
END $$;

-- Enforce NOT NULL to match Prisma required fields
ALTER TABLE "invitation_templates" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "invitation_templates" ALTER COLUMN "title" SET NOT NULL;

-- Non-unique indexes matching prisma schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'invitation_templates_slug_idx'
  ) THEN
    CREATE INDEX "invitation_templates_slug_idx" ON "invitation_templates"("slug");
  END IF;
END $$;
