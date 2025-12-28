-- CreateEnum
CREATE TYPE "EmailTemplateKind" AS ENUM ('INVITATION', 'STORAGE_ENDS_REMINDER', 'PHOTO_NOTIFICATION');

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "kind" "EmailTemplateKind" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT,
    "text" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_kind_key" ON "email_templates"("kind");

-- CreateIndex
CREATE INDEX "email_templates_kind_idx" ON "email_templates"("kind");

-- CreateIndex
CREATE INDEX "email_templates_isActive_idx" ON "email_templates"("isActive");
