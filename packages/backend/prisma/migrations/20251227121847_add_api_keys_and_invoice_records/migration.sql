-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApiKeyAuditAction" AS ENUM ('CREATED', 'REVOKED', 'USED', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoiceSource" AS ENUM ('WOOCOMMERCE', 'MANUAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'PAID', 'VOID', 'REFUNDED');

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key_audit_logs" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "action" "ApiKeyAuditAction" NOT NULL,
    "scope" TEXT,
    "path" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_records" (
    "id" TEXT NOT NULL,
    "source" "InvoiceSource" NOT NULL DEFAULT 'WOOCOMMERCE',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "wcOrderId" TEXT,
    "wpUserId" INTEGER,
    "eventId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "amountCents" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_prefix_key" ON "api_keys"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_status_idx" ON "api_keys"("status");

-- CreateIndex
CREATE INDEX "api_keys_prefix_idx" ON "api_keys"("prefix");

-- CreateIndex
CREATE INDEX "api_keys_createdById_idx" ON "api_keys"("createdById");

-- CreateIndex
CREATE INDEX "api_keys_expiresAt_idx" ON "api_keys"("expiresAt");

-- CreateIndex
CREATE INDEX "api_key_audit_logs_apiKeyId_idx" ON "api_key_audit_logs"("apiKeyId");

-- CreateIndex
CREATE INDEX "api_key_audit_logs_action_idx" ON "api_key_audit_logs"("action");

-- CreateIndex
CREATE INDEX "api_key_audit_logs_createdAt_idx" ON "api_key_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "invoice_records_source_idx" ON "invoice_records"("source");

-- CreateIndex
CREATE INDEX "invoice_records_status_idx" ON "invoice_records"("status");

-- CreateIndex
CREATE INDEX "invoice_records_wcOrderId_idx" ON "invoice_records"("wcOrderId");

-- CreateIndex
CREATE INDEX "invoice_records_wpUserId_idx" ON "invoice_records"("wpUserId");

-- CreateIndex
CREATE INDEX "invoice_records_eventId_idx" ON "invoice_records"("eventId");

-- CreateIndex
CREATE INDEX "invoice_records_issuedAt_idx" ON "invoice_records"("issuedAt");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_audit_logs" ADD CONSTRAINT "api_key_audit_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_records" ADD CONSTRAINT "invoice_records_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
