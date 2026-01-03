# Deployment

## Server

### Services starten

Im Repo Root:

```bash
bash ./start-local-services.sh
```

- **Backend**: `http://localhost:8002`
- **Frontend**: `http://localhost:3002`

### Logs

- Backend: `tail -f /tmp/backend-local.log`
- Frontend: `tail -f /tmp/frontend-local.log`

### Ports

- Backend Port: `8002`
- Frontend Port: `3002`

### Häufige Probleme

- **Port belegt**: die Start-Skripte versuchen Ports via `fuser -k` freizumachen.
- **Next ChunkLoadError / MIME issues**: bei mehreren Next Instanzen muss `NEXT_DIST_DIR` pro Port unterschiedlich sein.

### Production Hinweise

#### Zuständigkeiten (Domains)

- **`app.gästefotos.com`**
  - Public App + **Host UI** (Events, Host Dashboard, Uploads)
  - Darf **kein Admin-Dashboard** mehr ausliefern
- **`dash.gästefotos.com`**
  - **Admin Dashboard** (separates Next.js Package `packages/admin-dashboard`)
  - Admin Login/Settings/2FA usw.

Wenn in Production noch „altes UI“ sichtbar ist, ist das praktisch immer ein **Deploy-/Build-/Cache-Thema** (alter Build läuft noch, oder gemischte Next Assets), nicht ein “UI-Flag”.

- Backend läuft via `gaestefotos-backend.service` als **Build + Start** (kein `pnpm dev/tsx watch`).
- Nginx setzt für `/_next/static/*` ein **immutable Cache-Control** und überschreibt Upstream-Header, damit keine doppelten Cache-Control Header entstehen.

#### Admin-Dashboard (Next.js, Port 3001)

Das Admin-Dashboard liegt als separates Package unter `packages/admin-dashboard`.

- **Local Dev**: `pnpm --filter @gaestefotos/admin-dashboard dev` (Port `3001`)
- **Prod Ziel** (typisch): Subdomain `dash.*` → Reverse Proxy auf Port `3001`
- **Nginx Beispiel**: `packages/admin-dashboard/nginx.conf.example`
- **DNS/Setup Hinweise**: `packages/admin-dashboard/SUBDOMAIN_SETUP.md`

**Wichtig (Env):**

- `NEXT_PUBLIC_API_URL`
  - Local Dev: typischerweise `http://localhost:8001`
  - Production: muss auf die API zeigen (z.B. `https://app.gästefotos.com/api`), da das Admin-Dashboard i.d.R. auf einer eigenen Subdomain läuft.

- `TWO_FACTOR_ENCRYPTION_KEY`
  - Production: **muss gesetzt sein**, damit Admin-2FA (TOTP Setup/Login) funktioniert.
  - Wird im Backend genutzt, um TOTP-Secrets verschlüsselt zu speichern (AES-256-GCM).

**Deploy Admin-Dashboard (systemd) – Reihenfolge analog Frontend**

Wie beim Frontend gilt: in Produktion **niemals** `next build` laufen lassen, während der Service bereits läuft.

Empfohlen: Deploy über Script (erzwingt die Reihenfolge):

```bash
bash ./scripts/deploy-admin-dashboard-prod.sh
```

```bash
sudo systemctl stop gaestefotos-admin-dashboard.service

cd packages/admin-dashboard
pnpm build

sudo systemctl start gaestefotos-admin-dashboard.service
```

**Post-Deploy Smoke Check (Production)**

```bash
# Admin UI muss 200 liefern
curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://dash.gästefotos.com/

# Eine _next/static Datei muss 200 liefern
curl -sS https://dash.gästefotos.com/ | grep -oE '/_next/static/[^"\x27 ]+\.js' | head -n 1
curl -sS -I "https://dash.gästefotos.com<PASTE_PATH_HERE>" | head
```

Alternativ: Repo-Script (inkl. App + Dash + `_next/static` + Backend Health):

```bash
bash ./scripts/prelaunch-smoke.sh

# Optional: andere Domains testen (z.B. Punycode-Host)
APP_URL=https://app.gästefotos.com DASH_URL=https://dash.xn--gstefotos-v2a.com bash ./scripts/prelaunch-smoke.sh

# Optional: Admin Auth Smoke (keine Secrets hardcoden; nur via ENV)
ADMIN_EMAIL="<ADMIN_EMAIL>" ADMIN_PASSWORD="<ADMIN_PASSWORD>" bash ./scripts/prelaunch-smoke.sh
```

#### Frontend Deploy (systemd) – Reihenfolge ist Pflicht

In Produktion darf **niemals** ein `next build` / `pnpm build:prod` laufen, während `gaestefotos-frontend.service` bereits läuft.
Sonst können gemischte/inkonsistente Next-Assets ausgeliefert werden (typisch: `ChunkLoadError` / 404 auf `/_next/static/*`, ggf. durch CDN-Cache verstärkt).

Empfohlen: Deploy über Script (erzwingt die Reihenfolge):

```bash
bash ./scripts/deploy-frontend-prod.sh
```

```bash
sudo systemctl stop gaestefotos-frontend.service

cd packages/frontend
pnpm build:prod

sudo systemctl start gaestefotos-frontend.service
```

#### Post-Deploy Smoke Check (Production)

Nach jedem Deploy kurz prüfen, ob keine Chunk-404s mehr auftreten und ob die entfernten Consent-Endpunkte wirklich weg sind.

```bash
# 1) Hauptseite muss 200 liefern
curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://app.gästefotos.com/

# 2) Eine _next/static Datei muss 200 liefern (URL aus dem HTML extrahieren)
curl -sS https://app.gästefotos.com/ | grep -oE '/_next/static/[^"\x27 ]+\.js' | head -n 1

# Die Ausgabe (Pfad) dann testen:
curl -sS -I "https://app.gästefotos.com<PASTE_PATH_HERE>" | head

# 3) wp-consent muss weg sein (404/410)
curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://app.gästefotos.com/api/wp-consent
curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://app.gästefotos.com/api/wp-consent/frame
```

Wenn (2) einen 404 liefert, obwohl die Datei im HTML referenziert wird, ist das typischerweise ein Cache-Problem (z.B. CDN cached 404). Dann: Cache-Purge/BYPASS für `/_next/static/*` prüfen und den Deploy-Ablauf (stop → build → start) sicherstellen.

#### Troubleshooting: app zeigt noch altes UI / Admin-UI auf app

**Symptom: `app.gästefotos.com` sieht aus wie “alte Version”**

- Ursache fast immer:
  - alter Build/Service läuft noch
  - oder Deploy-Reihenfolge wurde verletzt (Next liefert gemischte Assets)
  - oder CDN/Proxy cached einen 404/alten Asset-Pfad
- Fix:
  - **Deploy-Reihenfolge strikt**: stop → build → start (siehe oben)
  - danach Smoke-Checks (`GET /` und 1x `/_next/static/*` muss 200 liefern)
  - wenn `_next/static` im HTML referenziert wird aber 404 liefert: CDN/Cache-Regeln prüfen, ggf. purge

**Symptom: Host/Admin Routing vermischt (z.B. Admin landet auf `app.*`)**

- Policy:
  - Admin arbeitet ausschließlich auf `dash.*`
  - `app.*` darf Admin nicht mehr “hosten”
- Fix:
  - Frontend muss nach Login bei Admin-Rolle auf `dash.*` umleiten
  - Wenn du es nach Code-Fix noch siehst: **Frontend redeployen**, weil Prod sonst alten Build ausliefert

**Hinweis (gewünschtes UX): Admin-Login ohne doppelte Anmeldung**

- Wenn ein Admin auf `app.*` einloggt, wird er danach direkt auf `dash.*` weitergeleitet.
- Technisch: Redirect zu `https://dash.../login?token=...` und das Dash übernimmt den Token (via `GET /api/auth/me`) und navigiert nach `/dashboard`.

**Hinweis: "Failed to find Server Action \"x\"" im Admin-Dashboard Log**

- Das ist typischerweise ein **stale client / deploy mismatch** (z.B. Nutzer hat noch einen alten Tab offen und schickt danach einen Request gegen den neuen Server).
- Wenn es direkt nach einem Deploy gehäuft auftaucht: Deploy-Reihenfolge prüfen (**stop → build → start**) und sicherstellen, dass keine gemischten Next-Assets ausgeliefert werden.
- Optional: Cache-Regeln prüfen (HTML nicht aggressiv cachen; `/_next/static/*` darf immutable sein).

#### Production Readiness Checklist

Vor Launch / nach größeren Änderungen einmal diese Punkte abhaken:

- **Monitoring/Alerts**: Fehler-Monitoring aktiv (Sentry) + einfache Uptime Checks (z.B. `GET /api/health` und `GET /`).
- **Backups/Restore**: DB Backups automatisiert + mindestens einmal Restore getestet.
- **Logs/Rotation**: journald/logrotate Retention prüfen, damit Logs nicht unendlich wachsen.
- **Cloudflare/Cache**: Regelwerk für `/_next/static/*` prüfen (keine 404 dauerhaft cachen; immutable Assets ok).
- **Health Checks**: `GET /api/health` muss 200 liefern; Frontend `GET /` muss 200 liefern; `_next/static` Assets müssen 200 liefern.
- **Rollback**: definierter Ablauf (letzter funktionierender Build) und klare Deploy-Reihenfolge (stop → build → start).

Sentry aktivieren: Im Backend ist Sentry vorbereitet, aber nur aktiv, wenn `SENTRY_DSN` im Backend-Environment gesetzt ist (z.B. `packages/backend/.env`).

#### Launch Checklist (Ops)

Diese Checkliste ist als “einmal durchklicken/abarbeiten” gedacht.

**Vor dem Deploy**

- Prüfen: `git status` sauber, richtige Branch/Commit.
- Prüfen: freie Disk / genügend Speicher.
- Prüfen: `systemctl status gaestefotos-backend.service` und `gaestefotos-frontend.service` sind healthy.

**Deploy Frontend (Production)**

- Pflicht: `bash ./scripts/deploy-frontend-prod.sh`
- Danach Smoke-Checks aus dem Abschnitt „Post-Deploy Smoke Check (Production)“.

**Deploy Backend (Production)**

- Service stoppen.
- Build durchführen.
- Service starten.
- Health prüfen: `GET /api/health`.

**Nach dem Deploy (Verifikation)**

- Frontend `GET /` liefert 200.
- Mindestens 1 `/_next/static/*` Asset liefert 200 (kein Chunk-404).
- `GET /api/health` liefert 200.
- (Wenn Consent entfernt): `/api/wp-consent*` liefert 404/410.

**Troubleshooting (Next.js / Admin Dashboard)**

- Symptom: `Error: Failed to find Server Action ... This request might be from an older or newer deployment`
- Ursache: meist stale Build/Assets (Mismatch zwischen Client und Server)
- Fix (Runbook):
  - `systemctl stop gaestefotos-admin-dashboard.service`
  - `pnpm --filter @gaestefotos/shared build`
  - `pnpm --filter @gaestefotos/admin-dashboard build`
  - `systemctl start gaestefotos-admin-dashboard.service`
  - danach: `scripts/prelaunch-smoke.sh` + `journalctl -u gaestefotos-admin-dashboard.service --since "10 min ago"`

**Rollback (Minimal)**

- Letzten funktionierenden Stand/Artefakt/Commit wiederherstellen.
- Reihenfolge strikt einhalten: stop → build → start.
- Danach erneut Smoke-Checks.

**Monitoring nach Launch**

- Erste 30–60 Minuten: Error-Logs beobachten.
- Wenn Sentry aktiv: Alerts auf Error-Spikes.
- Wenn CDN davor: bei Chunk-404 sofort Cache-Regeln/Purge prüfen.

## staging

Staging ist optional und kann als Reverse-Proxy auf die App genutzt werden (Routing/Parität prüfen).

## Daily Repo / Docs Update (Ritual)

Ziel: 1x pro Tag den Repo-Stand und die kanonischen Docs aktuell halten (ohne Automation).

1) **Arbeitsbaum prüfen**

```bash
git status
```

2) **Frontend Checks (vor allem nach UI/Token Änderungen)**

```bash
pnpm -w lint
pnpm -w type-check
```

3) **Status Token Sweep Check (optional, wenn daran gearbeitet wurde)**

```bash
rg "\\[var\\(--status-" packages/frontend/src
```

4) **Docs updaten (Single Source of Truth)**

- `docs/TODO.md`
- `docs/FEATURES.md`
- `docs/FEATURE_MATRIX.md`
- `docs/DEPLOYMENT.md`
- `docs/DB_FIELD_MEANINGS.md`

5) **Commit + Push**

```bash
git add -A
git commit -m "docs/ui: update status token sweep + docs"
git push
```
