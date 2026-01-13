# N5 Docs (Staging/Prod Setup)

## Ports / Services
- Backend API: `http://localhost:8001` (default in `NEXT_PUBLIC_API_URL` fallback)
- Frontend (Next.js): typically `http://localhost:3000`
- Production: Frontend uses relative `/api` (goes through reverse proxy)

## Key API Routes
### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### Events (Host)
- `POST /api/events` create event (generates `eventCode`)
- `GET /api/events/:id` host/superadmin only
- `PUT /api/events/:id` update
- `PUT /api/events/:id/active` toggle active
- `DELETE /api/events/:id` soft delete

### Event Access / Invites
- `POST /api/events/:eventId/invite` send invite to a guest (short-lived invite JWT)
- `POST /api/events/:eventId/invite-bulk` bulk invites
- `PUT /api/events/:eventId/guests/:guestId` RSVP update (supports invite token)

### Storage Usage / Limits
- `GET /api/events/:id/usage` host/superadmin debug endpoint

### WooCommerce Upgrade Flow
- `GET /api/events/:id/upgrade-link?sku=...&productId=...` host/superadmin generates add-to-cart URL incl. `eventCode`
- `POST /api/webhooks/woocommerce/order-paid` WooCommerce webhook (signature required)

### Superadmin: Package Definitions
- Base path: `/api/admin/package-definitions`
- `GET /` list
- `POST /` create
- `PUT /:id` update
- `DELETE /:id` delete

## Environment Variables
### Backend (`packages/backend`)
- `DATABASE_URL` Prisma/Postgres connection string
- `JWT_SECRET` JWT signing secret (app auth)
- `COOKIE_DOMAIN` cookie domain for event-access cookie (prod)
- `EVENT_ACCESS_TTL_SECONDS` TTL for event-access cookie

### Invite JWT
- `INVITE_JWT_SECRET` signing secret for invite JWTs
- `INVITE_TTL_SECONDS` (or equivalent; see backend config) TTL for invite JWTs

### WooCommerce
- `WOOCOMMERCE_WEBHOOK_SECRET` shared secret to validate webhook signature
- `WOOCOMMERCE_URL` WooCommerce base URL
- `WOOCOMMERCE_ADD_TO_CART_URL_TEMPLATE` template used by upgrade link generator
  - should contain placeholders for product/sku and `eventCode` (exact placeholder format is implemented in backend)

### Frontend (`packages/frontend`)
- `NEXT_PUBLIC_API_URL`
  - local dev: e.g. `http://localhost:8001`
  - prod: typically omitted; frontend uses `/api`

## Notes / Invariants
- Host-only / superadmin-only routes intentionally return `404` when unauthorized to prevent event enumeration.
- The remaining `403` responses are intentional (e.g., webhook signature, upload-policy restrictions).
- BigInt fields (e.g., `storageLimitBytes`) must be serialized to string in JSON responses.
