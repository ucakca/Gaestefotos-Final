# Ops Runbook: WooCommerce Webhooks

## Log sources

- Backend combined log (script default): `/tmp/backend-local.log`
- API base URL (local): `http://localhost:8002`

## Key log events

### Ignored webhooks (expected)

Grep:

```bash
grep -E "woocommerce_webhook_ignored" /tmp/backend-local.log | tail -n 200
```

Reasons you may see:

- `order_not_paid`
- `no_sku_in_order_payload`
- `unknown_package_sku`
- `missing_customer_mapping`
- `eventCode_not_owned_by_customer`
- `no_local_user_mapping`

### Duplicate/idempotent deliveries (expected)

Grep:

```bash
grep -E "woocommerce_webhook_duplicate" /tmp/backend-local.log | tail -n 200
```

## Health checks

### 1) Signature failures

If you see frequent `403 Forbidden` for `/api/webhooks/woocommerce/order-paid`, verify:

- `WOOCOMMERCE_WEBHOOK_SECRET` matches the WooCommerce webhook secret
- Backend receives raw body correctly (webhook signature depends on raw payload)

### 2) Receipt/idempotency

`WooWebhookReceipt` ensures an order is processed only once.

Quick DB check (requires `DATABASE_URL` in env):

```bash
node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const receipts = await prisma.wooWebhookReceipt.count();
  const entitlements = await prisma.eventEntitlement.count({ where: { source: 'WOOCOMMERCE_ORDER' } });
  console.log({ receipts, entitlements });
  await prisma.$disconnect();
})();
NODE
```

Expected:

- `receipts >= entitlements`
- For a given `wcOrderId`: max 1 entitlement with `source=WOOCOMMERCE_ORDER`

### 3) Entitlement activation

For a given event ID:

```bash
node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const eventId = process.env.EVENT_ID;
  const rows = await prisma.eventEntitlement.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, wcOrderId: true, wcSku: true, storageLimitBytes: true, createdAt: true }
  });
  console.log(rows);
  await prisma.$disconnect();
})();
NODE
```

Set `EVENT_ID=...` before running.

## Smoke checklist (manual)

- Confirm webhook endpoint reachable (returns 403 if signature missing):

```bash
curl -sS -X POST http://localhost:8002/api/webhooks/woocommerce/order-paid -H 'Content-Type: application/json' --data '{}' -w "\nHTTP_STATUS=%{http_code}\n"
```

- After sending a real webhook from Woo, confirm exactly one entitlement was created and webhook duplicates are logged as `woocommerce_webhook_duplicate`.

## Notes

- Webhook responses intentionally return `200` with `{ignored:true}` for non-actionable payloads to avoid Woo retries.
- Logging is PII-minimized; do not add billing email to logs.
