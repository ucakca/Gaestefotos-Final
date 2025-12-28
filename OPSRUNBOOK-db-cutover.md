# Ops Runbook: DB Cutover (localhost -> staging/prod Postgres)

## Goal

Switch the local backend from local Postgres (`localhost`) to a real staging/prod Postgres by setting `DATABASE_URL`.

## Preconditions

- You have the target Postgres connection string (staging or prod).
- You have backups / snapshot capability for the target DB.
- Backend process can be restarted.

## Copy/paste: production-first go-live sequence

### 1) Set env (prod)

1) DB

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DBNAME'
```

2) Storage (SeaweedFS)

```bash
export SEAWEEDFS_ENDPOINT='...'
export SEAWEEDFS_SECURE='true'
export SEAWEEDFS_ACCESS_KEY='...'
export SEAWEEDFS_SECRET_KEY='...'
export SEAWEEDFS_BUCKET='...'
export SEAWEEDFS_PREFIX='prod'
```

3) Public URLs

```bash
export BACKEND_URL='https://app.gästefotos.com'
```

4) Auth

```bash
export JWT_SECRET='...'
```

5) Virus scan safety (recommended initially)

```bash
export VIRUS_SCAN_ENFORCE='false'
```

### 2) Deploy (frontend + backend)

- Deploy/build your services as usual for your infrastructure.
- Ensure the backend loads the env above (or `credentials/*.env` via `start-local-backend.sh`).

### 3) Run Prisma migrations (target DB)

From repo root:

```bash
pnpm --filter @gaestefotos/backend prisma migrate deploy
pnpm --filter @gaestefotos/backend prisma generate
```

### 4) Restart backend

```bash
bash ./start-local-backend.sh
```

### 5) Smoke tests (must-pass)

1) Auth
- Login with a known user
- If WP auth is enabled: login with a WP user

2) Uploads
- Upload 1 photo + 1 video (guest + host)
- Verify proxy serving works: `/api/photos/:id/file`, `/api/videos/:id/file`

3) Quarantine sanity
- Admin Dashboard → Event → Upload Issues shows PENDING/ERROR
- Manual `Freigeben` sets scanStatus to CLEAN

4) Optional: enforce quarantine (single event)
- Set `featuresConfig.virusScan.enforce=true`
- Media with `scanStatus != CLEAN` should return 404 on file routes

### 6) Domain cutover (app.gästefotos.com)

1) Ensure reverse proxy routes
- `/api/*` → backend
- everything else → frontend

2) Switch DNS / upstream

3) Post-cutover checks
- Login
- Create event
- Upload photo/video
- Guest QR access
- Admin Dashboard Upload Issues view

### 7) Rollback

- Revert `DATABASE_URL` and/or DNS/upstream to previous services.
- Restart backend.
- If migrations were applied to the wrong DB: restore from backup/snapshot.

## Production-first go-live checklist (recommended)

### A) Environment variables (production)

#### 1) Database

- `DATABASE_URL=postgresql://...`

#### 2) SeaweedFS / Storage

- `SEAWEEDFS_ENDPOINT=...`
- `SEAWEEDFS_SECURE=true|false`
- `SEAWEEDFS_ACCESS_KEY=...`
- `SEAWEEDFS_SECRET_KEY=...`
- `SEAWEEDFS_BUCKET=...`
- `SEAWEEDFS_PREFIX=prod` (recommended)

Notes:
- All media objects are stored under `(<SEAWEEDFS_PREFIX>/)customers/<hostId>/events/<eventId>/...`.

#### 3) Backend URL (for permanent media proxy URLs)

- `BACKEND_URL=https://app.gästefotos.com` (or the final public origin)

#### 4) JWT / Auth

- `JWT_SECRET=...`
- `JWT_EXPIRES_IN=7d` (optional)

#### 5) WordPress auth (if you want existing gästefotos.com users)

- REST verify endpoint configured in backend env (see `packages/backend/.env.example` + `packages/backend/src/config/wordpress.ts`)
- Optional: `credentials/wordpress.env` loaded by `start-local-backend.sh`

Recommended env (names per `.env.example` / `config/wordpress.ts`):

- REST mode (default)
  - `WORDPRESS_URL=https://...` (base URL; backend calls `/wp-json/gaestefotos/v1/verify-password`)
  - `WORDPRESS_VERIFY_SECRET=...` (optional; sent as `X-GF-Verify-Secret`)

- DB mode (optional fallback)
  - `WORDPRESS_DB_HOST=...`
  - `WORDPRESS_DB_PORT=3306`
  - `WORDPRESS_DB_USER=...`
  - `WORDPRESS_DB_PASSWORD=...`
  - `WORDPRESS_DB_NAME=...`
  - `WORDPRESS_TABLE_PREFIX=...`

#### 6) Virus scan / quarantine flags (start safe)

- `VIRUS_SCAN_ENFORCE=false` (recommended initially)
- Per-event overrides are configurable via Admin Dashboard `featuresConfig.virusScan.*`.

## Where DB is configured

- `credentials/postgres.env`
  - `DATABASE_URL=postgresql://...`
- `start-local-backend.sh`
  - loads `credentials/postgres.env` if present
- Backend loads a local `.env` via `ENV_FILE`, but **process env wins**.

## Cutover steps

### 1) Set `DATABASE_URL`

Edit `credentials/postgres.env`:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
```

### 2) Verify you’re not still on localhost

```bash
source credentials/postgres.env
node - <<'NODE'
const u = new URL(process.env.DATABASE_URL);
console.log({ host: u.hostname, port: u.port||null, database: u.pathname.replace(/^\//,'')||null, user: u.username||null });
console.log('is_localhost_db', u.hostname === 'localhost' || u.hostname === '127.0.0.1');
NODE
```

### C) Media upload + quarantine sanity

1) Upload photo + video (guest + host)
- Upload should succeed
- Uploaded media should be visible via proxy URLs

2) Admin Dashboard → Event → Upload Issues
- You should see scan PENDING/ERROR lists as applicable
- Manual `Freigeben` should set scanStatus to CLEAN

3) If you enable quarantine enforcement
- Set per-event `featuresConfig.virusScan.enforce=true`
- A media item with `scanStatus != CLEAN` should return 404 on file route

### 3) Run Prisma migrations against the target DB

From repo root:

```bash
source credentials/postgres.env

pnpm --filter @gaestefotos/backend prisma migrate deploy
pnpm --filter @gaestefotos/backend prisma generate
```

Notes:
- `migrate deploy` applies all migrations, including the latest video scan fields migration.

### 4) Restart backend

```bash
bash ./start-local-backend.sh
```

## Smoke tests after cutover

### A) WordPress login import

WordPress Verify (direct):

```bash
EMAIL="<wp_email_or_username>"
PASS="<wp_password>"

curl -sS -X POST "https://gästefotos.com/wp-json/gaestefotos/v1/verify-password" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
```

Backend login (should return 200 + token):

```bash
curl -sS -X POST "http://localhost:8002/api/auth/login" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
```

Failure classification sanity (important):

- If WordPress auth is enabled and WordPress is unreachable/misconfigured, backend should return **503** (infra failure) and not a misleading **401**.

DB check (read-only):

```bash
source credentials/postgres.env
node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const totalUsers = await prisma.user.count();
  const usersWithWp = await prisma.user.count({ where: { wordpressUserId: { not: null } } });
  console.log({ totalUsers, usersWithWp });
  await prisma.$disconnect();
})();
NODE
```

### B) Webhook idempotency sanity

```bash
source credentials/postgres.env
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

## Rollback

- Revert `DATABASE_URL` to previous value.
- Restart backend.

If migrations were applied to the wrong DB, restore from backup/snapshot.

## Domain cutover (app.gästefotos.com)

### Goal

Point `app.gästefotos.com` to the frontend/backend after smoke tests are green.

### Steps

1) Ensure public URLs are correct
- Backend: `BACKEND_URL=https://app.gästefotos.com`
- Frontend: uses the correct API base URL (via reverse proxy or env)

2) Reverse proxy / TLS
- Terminate TLS for `app.gästefotos.com`
- Proxy `/api/*` to backend and everything else to frontend

3) DNS switch
- Update DNS / proxy upstream to new services

4) Post-cutover checks
- Login
- Create event
- Upload photo/video
- Guest QR access
- Admin Dashboard Upload Issues view
