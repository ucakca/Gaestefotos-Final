-- CreateEnum
CREATE TYPE "CmsContentKind" AS ENUM ('pages', 'posts');

-- CreateTable
CREATE TABLE "cms_content_snapshots" (
    "id" TEXT NOT NULL,
    "kind" "CmsContentKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "html" TEXT,
    "excerpt" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "link" TEXT,
    "modifiedGmt" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_content_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cms_content_snapshots_kind_idx" ON "cms_content_snapshots"("kind");

-- CreateIndex
CREATE INDEX "cms_content_snapshots_slug_idx" ON "cms_content_snapshots"("slug");

-- CreateIndex
CREATE INDEX "cms_content_snapshots_fetchedAt_idx" ON "cms_content_snapshots"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cms_content_snapshots_kind_slug_key" ON "cms_content_snapshots"("kind", "slug");
