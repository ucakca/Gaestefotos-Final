# Pre-Launch Checklist (Production)

Ziel: einmal vor Launch (oder vor größeren Deploys) schnell sicherstellen, dass App/Dashboard/API sauber laufen.

## 1) Repo Health (local/server shell)

Im Repo Root:

```bash
pnpm -r type-check
pnpm -r lint
```

## 2) Critical Flows (Functional Smoke)

### Frontend (Public)

- `GET /` liefert `200`
- Mindestens ein `/_next/static/*` Asset liefert `200` (keine Chunk-404)

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://app.gästefotos.com/

ASSET_PATH=$(curl -sS https://app.gästefotos.com/ | tr '"' '\n' | tr "'" '\n' | grep -E '^/_next/static/.*\.js$' | head -n 1)

echo "$ASSET_PATH"
curl -sS -I "https://app.gästefotos.com${ASSET_PATH}" | head
```

### Admin Dashboard

- `GET /` liefert `200` oder Redirect (`30x`)
- Mindestens ein `/_next/static/*` Asset liefert `200`

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://dash.xn--gstefotos-v2a.com/

ASSET_PATH=$(curl -sS https://dash.xn--gstefotos-v2a.com/ | tr '"' '\n' | tr "'" '\n' | grep -E '^/_next/static/.*\.js$' | head -n 1)

echo "$ASSET_PATH"
curl -sS -I "https://dash.xn--gstefotos-v2a.com${ASSET_PATH}" | head
```

### Backend

- Health endpoint liefert `200`

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://app.gästefotos.com/api/health
```

### Ops/Health (Admin)

- Admin Endpoint `GET /api/admin/ops/health` liefert `200` (Auth + Rolle `ADMIN` erforderlich)
- Admin UI `/system` zeigt denselben Status im Dashboard an
- Wichtig für das Admin Dashboard (Login/API):
  - `dash.*` muss per Nginx `location ^~ /api/` an das Backend (`127.0.0.1:8001`) proxyen
  - Backend CORS muss `https://dash.xn--gstefotos-v2a.com` (und optional `https://dash.gästefotos.com`) erlauben

```bash
# Requires ADMIN JWT token
curl -sS -H "Authorization: Bearer <ADMIN_JWT>" https://app.gästefotos.com/api/admin/ops/health | head
```

## 3) Policy Checks

### Download Policy (Guests)

Erwartung:

- Guests dürfen nur downloaden, wenn Host `featuresConfig.allowDownloads !== false`.

Backend-Enforcement:

- Photos download route prüft `allowDownloads`
- Videos download route prüft `allowDownloads`

Frontend:

- Public Pages (`/e/*`, `/e2/*`) defaulten Download-UI auf `allowDownloads !== false`.

## 3b) Big end-to-end Testlauf (Read-only Sanity)

Ziel: vor Launch einmal die wichtigsten Pfade „durchklicken/prüfen“, ohne produktive Daten zu verändern.

### Read-only Checks (Shell)

```bash
APP=https://app.gästefotos.com
DASH=https://dash.xn--gstefotos-v2a.com

# 1) App + Assets
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "$APP/"
ASSET_PATH=$(curl -sS "$APP/" | tr '"' '\n' | tr "'" '\n' | grep -E '^/_next/static/.*\.js$' | head -n 1)
curl -sS -I "$APP$ASSET_PATH" | head

# 2) Dash + Assets
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "$DASH/"
DASSET_PATH=$(curl -sS "$DASH/" | tr '"' '\n' | tr "'" '\n' | grep -E '^/_next/static/.*\.js$' | head -n 1)
curl -sS -I "$DASH$DASSET_PATH" | head

# 3) Backend Health
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "$APP/api/health"

# 4) Admin Login → Token (requires ADMIN credentials)
TOKEN=$(curl -sS -X POST "$DASH/api/auth/login" \
  -H "Content-Type: application/json" \
  --data '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

# 5) Admin Ops Health
curl -sS -H "Authorization: Bearer $TOKEN" "$APP/api/admin/ops/health" | head

# 6) Theme Readbacks
curl -sS "$APP/api/theme" | head
curl -sS -H "Authorization: Bearer $TOKEN" "$APP/api/admin/theme" | head
```

### Manual UI Flows (Browser)

- Admin Dashboard:
  - Login
  - `/system` prüfen (alle Checks OK)
  - Events List öffnen, Event Detail öffnen
- Frontend:
  - Login/Host Dashboard öffnen
  - Event erstellen (nur wenn du bewusst testest) oder bestehendes Event öffnen
  - Upload-Flow + Moderation + Guest View (nur in Test-Event)

### Manual UI Flows (Browser) – Co-Host (Invite / Accept)

- Admin Dashboard (`dash.*`):
  - Event öffnen → Abschnitt **Co-Hosts**
  - **Invite-Link erzeugen**
- Public App (`app.*`) in Incognito/Private Window:
  - Invite-Link öffnen (enthält `?cohostInvite=...`)
  - Falls nicht eingeloggt: Login
  - Erwartung: Toast „Co-Host Einladung angenommen“
  - Danach prüfen:
    - Co-Host kann Event verwalten (z.B. `/events/:id/dashboard`, `/events/:id/photos`, `/events/:id/guests`)

### Hinweis: `scripts/prelaunch-smoke.sh` (Admin Auth optional)

- Ohne Admin Credentials (nur Infra):

```bash
SKIP_ADMIN_AUTH=1 bash ./scripts/prelaunch-smoke.sh
```

- Mit Admin Credentials (optional):

```bash
ADMIN_AUTH_BASE_URL=https://dash.xn--gstefotos-v2a.com \
ADMIN_EMAIL="<ADMIN_EMAIL>" \
ADMIN_PASSWORD="<ADMIN_PASSWORD>" \
bash ./scripts/prelaunch-smoke.sh
```

## 4) systemd / Services

```bash
sudo systemctl status gaestefotos-backend.service
sudo systemctl status gaestefotos-frontend.service
sudo systemctl status gaestefotos-admin-dashboard.service
```

## 5) Deploy Order (Must)

Wichtig: in Produktion **niemals** `next build` / `pnpm build:prod` laufen lassen, während der Service bereits läuft.

Empfohlen (copy/paste, erzwingt Reihenfolge):

```bash
bash ./scripts/deploy-frontend-prod.sh
bash ./scripts/deploy-admin-dashboard-prod.sh
```

Frontend:

```bash
sudo systemctl stop gaestefotos-frontend.service

cd packages/frontend
pnpm build:prod

sudo systemctl start gaestefotos-frontend.service
```

Admin Dashboard:

```bash
sudo systemctl stop gaestefotos-admin-dashboard.service

cd packages/admin-dashboard
pnpm build

sudo systemctl start gaestefotos-admin-dashboard.service
```

## 6) Rollback (Minimal)

- letzten funktionierenden Stand (Commit/Artefakt) auschecken/wiederherstellen
- Reihenfolge strikt: **stop → build → start**
- danach erneut Smoke-Checks (Section 2)
