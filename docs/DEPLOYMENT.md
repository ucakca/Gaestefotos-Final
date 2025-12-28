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

- Backend läuft via `gaestefotos-backend.service` als **Build + Start** (kein `pnpm dev/tsx watch`).
- Nginx setzt für `/_next/static/*` ein **immutable Cache-Control** und überschreibt Upstream-Header, damit keine doppelten Cache-Control Header entstehen.

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
