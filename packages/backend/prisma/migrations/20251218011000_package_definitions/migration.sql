-- CreateEnum
CREATE TYPE "PackageDefinitionType" AS ENUM ('BASE', 'UPGRADE');

-- CreateTable
CREATE TABLE "package_definitions" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PackageDefinitionType" NOT NULL DEFAULT 'BASE',
    "resultingTier" TEXT NOT NULL,
    "upgradeFromTier" TEXT,
    "storageLimitBytes" BIGINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "package_definitions_sku_key" ON "package_definitions"("sku");

-- CreateIndex
CREATE INDEX "package_definitions_sku_idx" ON "package_definitions"("sku");

-- CreateIndex
CREATE INDEX "package_definitions_type_idx" ON "package_definitions"("type");

-- CreateIndex
CREATE INDEX "package_definitions_isActive_idx" ON "package_definitions"("isActive");
