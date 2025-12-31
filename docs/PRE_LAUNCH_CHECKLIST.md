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

ASSET_PATH=$(curl -sS https://app.gästefotos.com/ | grep -oE '/_next/static/[^"\x27 ]+\.js' | head -n 1)

echo "$ASSET_PATH"
curl -sS -I "https://app.gästefotos.com${ASSET_PATH}" | head
```

### Admin Dashboard

- `GET /` liefert `200`
- Mindestens ein `/_next/static/*` Asset liefert `200`

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://dash.gästefotos.com/

ASSET_PATH=$(curl -sS https://dash.gästefotos.com/ | grep -oE '/_next/static/[^"\x27 ]+\.js' | head -n 1)

echo "$ASSET_PATH"
curl -sS -I "https://dash.gästefotos.com${ASSET_PATH}" | head
```

### Backend

- Health endpoint liefert `200`

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://app.gästefotos.com/api/health
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

## 4) systemd / Services

```bash
sudo systemctl status gaestefotos-backend.service
sudo systemctl status gaestefotos-frontend.service
sudo systemctl status gaestefotos-admin-dashboard.service
```

## 5) Deploy Order (Must)

Wichtig: in Produktion **niemals** `next build` / `pnpm build:prod` laufen lassen, während der Service bereits läuft.

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
