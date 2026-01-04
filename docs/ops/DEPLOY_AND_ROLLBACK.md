# Deploy & Rollback (Production)

## Ziel

- Deploys reproduzierbar.
- Keine gemischten Next.js Assets (Chunk-404/ChunkLoadError verhindern).

## Services

- Backend: `gaestefotos-backend.service`
- Frontend (app.*): `gaestefotos-frontend.service`
- Admin Dashboard (dash.*): `gaestefotos-admin-dashboard.service`

## Deploy Reihenfolge (Pflicht bei Next.js)

Frontend (app.*):

- `systemctl stop gaestefotos-frontend.service`
- `pnpm -C packages/frontend build:prod`
- `systemctl start gaestefotos-frontend.service`

Admin Dashboard (dash.*):

- `systemctl stop gaestefotos-admin-dashboard.service`
- `pnpm -C packages/admin-dashboard build`
- `systemctl start gaestefotos-admin-dashboard.service`

Backend:

- `systemctl stop gaestefotos-backend.service`
- `pnpm -C packages/backend build`
- `systemctl start gaestefotos-backend.service`

## Minimaler Post-Deploy Smoke (read-only)

- `GET /` (app) muss 200 liefern
- 1x `/_next/static/*.js` muss 200 liefern
- `GET /api/health` muss 200 liefern
- `GET /api/version` muss 200 liefern

Siehe auch: `docs/PRE_LAUNCH_CHECKLIST.md`.

## Rollback (Minimal)

- Auf letzten funktionierenden Commit/Stand zurück.
- Reihenfolge strikt wie oben (stop → build → start).
- Danach wieder Smoke (read-only).
