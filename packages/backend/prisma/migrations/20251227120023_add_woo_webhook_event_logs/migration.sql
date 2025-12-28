-- CreateEnum
CREATE TYPE "WooWebhookProvider" AS ENUM ('WOOCOMMERCE');

-- CreateEnum
CREATE TYPE "WooWebhookLogStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED', 'FORBIDDEN');

-- CreateTable
CREATE TABLE "woo_webhook_event_logs" (
    "id" TEXT NOT NULL,
    "provider" "WooWebhookProvider" NOT NULL DEFAULT 'WOOCOMMERCE',
    "topic" TEXT NOT NULL,
    "wcOrderId" TEXT,
    "eventCode" TEXT,
    "eventId" TEXT,
    "wpUserId" INTEGER,
    "wcProductId" TEXT,
    "wcSku" TEXT,
    "skus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signatureOk" BOOLEAN NOT NULL DEFAULT false,
    "status" "WooWebhookLogStatus" NOT NULL DEFAULT 'RECEIVED',
    "reason" TEXT,
    "error" TEXT,
    "payloadHash" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "woo_webhook_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "woo_webhook_event_logs_provider_idx" ON "woo_webhook_event_logs"("provider");

-- CreateIndex
CREATE INDEX "woo_webhook_event_logs_topic_idx" ON "woo_webhook_event_logs"("topic");

-- CreateIndex
CREATE INDEX "woo_webhook_event_logs_wcOrderId_idx" ON "woo_webhook_event_logs"("wcOrderId");

-- CreateIndex
CREATE INDEX "woo_webhook_event_logs_eventId_idx" ON "woo_webhook_event_logs"("eventId");

-- CreateIndex
CREATE INDEX "woo_webhook_event_logs_status_idx" ON "woo_webhook_event_logs"("status");

-- CreateIndex
CREATE INDEX "woo_webhook_event_logs_createdAt_idx" ON "woo_webhook_event_logs"("createdAt");
