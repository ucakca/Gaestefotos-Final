-- CreateTable
CREATE TABLE "woo_webhook_receipts" (
    "id" TEXT NOT NULL,
    "wc_order_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "woo_webhook_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "woo_webhook_receipts_wc_order_id_key" ON "woo_webhook_receipts"("wc_order_id");
