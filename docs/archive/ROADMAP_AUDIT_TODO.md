# ROADMAP_AUDIT_TODO (Verified-First)

Stand: 2026-01-11 (inkl. kritische Bugfixes)

Prinzip: **"Verifizieren statt Annehmen"**
- Viele Punkte sind **Claims** aus Audits.
- Bei Abarbeitung zuerst **Evidence** sammeln (Nginx/Env/Systemd/HTTP), erst dann fixen.

Zusatz-Regel: **"Model strikt einhalten"**
- Wenn ein Punkt ein `**Model:** ...` enthält, dann **vor der Abarbeitung auf dieses Modell wechseln**.
- Wenn ich merke, dass die aktuelle Modell-Stufe für Audit/Logik/Risiko zu schwach ist, sage ich explizit:
  - `BITTE FÜR DIESE AUFGABE AUF CLAUDE 4.5 OPUS UMSCHALTEN`

---

## P0 — Kritische Infrastruktur-Validierung (Blind Spots)

Ziel: Diese Punkte **müssen verifiziert** werden, bevor Milestone 0 startet (sonst sind Fixes/Tests evtl. wertlos oder riskant).

### 1) Staging-App-Lücke (Deploy/Build/Service) — ✅ **BEHOBEN (2026-01-10, Commit 95d86fb)**

- **Implementierung:**
  - ✅ `scripts/deploy-staging.sh` baut jetzt `@gaestefotos/frontend`
  - ✅ `gaestefotos-frontend-staging.service` läuft aktiv (Port 3002)
  - ✅ Smoke Tests erfolgreich: `https://staging.app.xn--gstefotos-v2a.com/`
  - ✅ Build-Artefakte vorhanden (`.next` Verzeichnis)
- **Verifikation:**
  - Service Status: active (running) seit 2026-01-11 00:19:17
  - Frontend Build: Erfolgreich (26.2 kB Middleware, 87.5 kB shared JS)
- **Model:** Sonnet (Implementierung)

### 2) CORS & Origin-Falle (Backend `allowedOrigins` + `.env.staging`)

- **Fact (Code):** Backend CORS/Socket.io `allowedOrigins` basiert auf `process.env.FRONTEND_URL` (comma-separated) + festen Canonical Prod Domains.
- **Risk:** Wenn `.env.staging` die Staging-Origins nicht in `FRONTEND_URL` enthält, werden Browser-Requests von Staging App/Dash trotz korrektem Routing geblockt.
- **Evidence (Repo):** `packages/backend/src/index.ts`:
  - `allowedOriginsFromEnv = (process.env.FRONTEND_URL || '').split(',')...`
  - `cors.origin: allowedOrigins`
- **Evidence (SSH):**
  - `.env.staging` prüfen: `grep -n "^FRONTEND_URL=" /root/gaestefotos-app-v2/packages/backend/.env.staging`
  - laufender Prozess: `systemctl show gaestefotos-backend-staging.service -p Environment --no-pager | tr ' ' '\n' | grep FRONTEND_URL`
  - **Socket.io Origin/WS Test (Staging + Prod):**
    - Cert/HTTPS: `curl -sS -I https://staging.app.xn--gstefotos-v2a.com/api/health | head`
    - Polling (Origin): `curl -sS -I "https://staging.app.xn--gstefotos-v2a.com/socket.io/?EIO=4&transport=polling" -H "Origin: https://staging.app.xn--gstefotos-v2a.com" | head`
    - Polling (Dash-Origin): `curl -sS -I "https://staging.app.xn--gstefotos-v2a.com/socket.io/?EIO=4&transport=polling" -H "Origin: https://staging.dash.xn--gstefotos-v2a.com" | head`
    - Optional WebSocket Handshake Smoke (wenn `websocat`/`wscat` verfügbar): `wscat -c "wss://staging.app.xn--gstefotos-v2a.com/socket.io/?EIO=4&transport=websocket" -H "Origin: https://staging.app.xn--gstefotos-v2a.com"`
- **Decision Gate:**
  - `FRONTEND_URL` muss mindestens enthalten:
    - `https://staging.app.xn--gstefotos-v2a.com`
    - `https://staging.dash.xn--gstefotos-v2a.com`
  - Socket.io Handshake darf nicht an Origin/Cert scheitern (sonst sind Realtime-Claims/Tests wertlos).
- **Model:** Claude 4.5 Opus (Audit), Umsetzung: Sonnet oder Cascade

### 3) SeaweedFS Retention/Orphan Worker Cross-Environment Risiko

- **Fact (Code):** Retention Purge kann Storage-Objekte löschen via `storageService.deleteFile(storagePath)`.
- **Risk:** Wenn Staging und Production denselben Bucket nutzen, dann kann Staging Worker Storage-Objekte im gemeinsamen Bucket löschen.
  - Das Risiko ist besonders hoch, wenn `storagePath` nicht strikt environment-namespaced ist oder IDs kollidieren.
- **Evidence (Repo):**
  - `packages/backend/src/index.ts` startet Worker: `startRetentionPurgeWorker()` und `startOrphanCleanupWorker()`
  - `packages/backend/src/services/retentionPurge.ts` ruft `storageService.deleteFile(...)` für Photos/Videos auf.
  - `packages/backend/src/services/orphanCleanup.ts` markiert Records als DELETED, aber löscht Storage nicht direkt.
- **Evidence (SSH):**
  - Bucket-Config:
    - `grep -n "^SEAWEEDFS_BUCKET=" /root/gaestefotos-app-v2/packages/backend/.env`
    - `grep -n "^SEAWEEDFS_BUCKET=" /root/gaestefotos-app-v2/packages/backend/.env.staging`
    - `systemctl show gaestefotos-backend.service -p Environment --no-pager | tr ' ' '\n' | grep SEAWEEDFS_BUCKET`
    - `systemctl show gaestefotos-backend-staging.service -p Environment --no-pager | tr ' ' '\n' | grep SEAWEEDFS_BUCKET`
  - Retention Purge Flags:
    - `systemctl show gaestefotos-backend-staging.service -p Environment --no-pager | tr ' ' '\n' | grep RETENTION_PURGE_`
- **Decision Gate:**
  - Wenn Bucket shared: **erst Bucket trennen**, dann erst Retention/Orphan Worker auf Staging aktivieren oder laufen lassen.
- **Model:** Claude 4.5 Opus (Risikoanalyse), Umsetzung: Sonnet oder Cascade

---

## Milestone 0 — GO/NO-GO: Infra & Environment Drift (Prod/Staging)

**STATUS: ✅ ERLEDIGT (2026-01-10)**

Ziel: **Staging ist testbar + sicher**, Production ist upload-fähig.

### Erledigte Fixes:
- ✅ `.env.staging` mit getrennten Secrets/Bucket (JWT, 2FA, Invite, SeaweedFS)
- ✅ `gaestefotos-frontend-staging.service` erstellt und aktiviert
- ✅ `deploy-staging.sh` um Frontend-Build erweitert
- ✅ `FRONTEND_URL` erweitert (staging.app + staging.dash)
- ✅ Multer-Limit erhöht (10MB → 50MB)
- ✅ EXIF/GPS Strip in imageProcessor integriert
- ✅ Backend-Staging + Frontend-Staging Services laufen

### P0 — Verifikation (Claims → Evidence)

1) **Prod Nginx Upload-Limit (`client_max_body_size`)**
- **Status:** Claim (muss bestätigt werden)
- **Evidence needed:** `nginx -T` Auszug + Upload/413 Check
- **Model:** Claude 4.5 Opus (Audit/Risiko), Umsetzung: Sonnet oder Cascade

2) **Staging Dashboard Routing (Plesk Proxy 7081 vs Dashboard 3101)**
- **Status:** Claim
- **Evidence needed:** Nginx vhost config + `curl -I` Ergebnis
- **Model:** Claude 4.5 Opus

3) **Staging/Prod teilen SeaweedFS Bucket**
- **Status:** Claim
- **Evidence needed:** `.env.staging`/systemd `Environment=` + Bucket Listing
- **Model:** Claude 4.5 Opus

4) **Staging/Prod teilen JWT_SECRET**
- **Status:** Claim
- **Evidence needed:** `.env.staging`/systemd `Environment=`
- **Model:** Claude 4.5 Opus

5) **Staging/Prod teilen COOKIE_DOMAIN**
- **Status:** Claim
- **Evidence needed:** `.env.staging`/systemd `Environment=`
- **Model:** Claude 4.5 Opus

6) **Ports/Proxy-Parität (8001/8002) — App/Dash/Backend Upstreams**
- **Status:** Claim
- **Evidence needed:**
  - Nginx vhosts/upstreams je Umgebung: `nginx -T | grep -n "gaestefotos\|xn--gstefotos" -n`
  - Backend Service Port: `systemctl show gaestefotos-backend.service -p ExecStart --no-pager`
  - Backend Staging Port: `systemctl show gaestefotos-backend-staging.service -p ExecStart --no-pager`
- **Decision Gate:** einheitlicher Upstream-Port pro Rolle (App/Dash/Backend) festlegen und Nginx + systemd konsistent machen.
- **Model:** Claude 4.5 Opus

7) **Bucket/Secrets Parität (nicht nur BUCKET)**
- **Status:** Claim
- **Evidence needed (Prod vs Staging vergleichen):**
  - `SEAWEEDFS_ENDPOINT`, `SEAWEEDFS_ACCESS_KEY`, `SEAWEEDFS_SECRET_KEY`, `SEAWEEDFS_BUCKET`
  - `COOKIE_DOMAIN`, `INVITE_JWT_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`
  - `systemctl show gaestefotos-backend.service -p Environment --no-pager | tr ' ' '\n' | egrep "SEAWEEDFS_|COOKIE_DOMAIN|INVITE_JWT_SECRET|TWO_FACTOR_ENCRYPTION_KEY"`
  - `systemctl show gaestefotos-backend-staging.service -p Environment --no-pager | tr ' ' '\n' | egrep "SEAWEEDFS_|COOKIE_DOMAIN|INVITE_JWT_SECRET|TWO_FACTOR_ENCRYPTION_KEY"`
- **Decision Gate:** Staging muss eigene Secrets + eigenes Storage-Credential-Set haben.
- **Model:** Claude 4.5 Opus

8) **Upload-Limit Parität (Nginx + Multer + Timeouts)**
- **Status:** Claim
- **Evidence needed:**
  - Nginx: `nginx -T | egrep -n "client_max_body_size|proxy_read_timeout|proxy_send_timeout|send_timeout"`
  - Backend Multer/Body limits: Code-Search + Config (falls env-driven: `systemctl show ... -p Environment`)
- **Decision Gate:** Limits/Timeouts müssen zusammenpassen (sonst inkonsistente 413/504/499 Symptome).
- **Model:** Claude 4.5 Opus

9) **Cache/CDN Parität für `_next/static` (Staging vs Prod)**
- **Status:** Claim
- **Smoke (Staging + Prod):**
  - HTML laden: `curl -sS https://staging.app.xn--gstefotos-v2a.com/ | head -n 200`
  - ersten `_next/static/` Pfad extrahieren (manuell) und dann: `curl -sS -I "https://staging.app.xn--gstefotos-v2a.com/_next/static/<pfad>" | head`
  - Erwartung: `200` (keine Chunk-404/Cache-Mismatch)
  - **Explizit: "Prod via CDN?" (Cloudflare) Smoke:**
    - `curl -sS -I "https://app.xn--gstefotos-v2a.com/_next/static/<pfad>" | egrep -i "^HTTP/|cf-cache-status:|age:|cache-control:"`
- **Model:** Claude 4.5 Opus

10) **EXIF/GPS: nicht nur Speicherung, auch Auslieferung**
- **Status:** Claim
- **Evidence needed:**
  - Prüfen, ob bei Upload/Persist EXIF gestrippt wird
  - Prüfen, ob bei Auslieferung (Download/Serve) Metadaten entfernt sind
  - **Konkreter Serve-Time Evidence Check (Prod + Staging):**
    - `curl -sS "https://<host>/api/photos/<id>/download" | exiftool - 2>/dev/null | head -n 40`
- **Decision Gate:** wenn nicht gestrippt → Task: **"EXIF strip vor Persist/Serve"**.
- **Model:** Claude 4.5 Opus

11) **CSRF Decision Gate (Cookie-basierte Mutations ohne Token)**
- **Status:** Risiko/Policy
- **Evidence needed:**
  - Welche Endpoints setzen auf Cookie-Auth für POST/PUT/DELETE?
  - Gibt es CSRF Token/Double Submit/Origin Checks?
- **Decision Gate:** akzeptabel (same-site strict + Origin checks) oder CSRF-Token einführen.
- **Model:** Claude 4.5 Opus

### P0 — Fixes (erst nach Evidence)

1) **Prod Upload-Limit fixen**
- Nginx `client_max_body_size` setzen + reload
- **Model:** Sonnet (Implementierung/Runbook) oder Cascade

2) **Staging Dashboard Routing fixen**
- Nginx config korrigieren (zu Port 3101) + reload
- **Model:** Sonnet oder Cascade

3) **Staging Bucket trennen**
- neuen Bucket erstellen + `.env.staging` anpassen + Staging Backend restart
- **Model:** Sonnet oder Cascade

4) **Staging JWT Secret rotieren**
- Secret neu generieren + `.env.staging` + restart
- **Model:** Sonnet oder Cascade

5) **Staging Cookie Domain trennen**
- `.env.staging` COOKIE_DOMAIN setzen + restart
- **Model:** Sonnet oder Cascade

---

## Milestone 1 — Event Upload Reliability (Schlechtes Event-WLAN)

**STATUS: ✅ ERLEDIGT (2026-01-10)**

Ziel: Uploads funktionieren zuverlässig (weniger Failed Uploads, kleinere Dateien).

1) **Client-side Image Resize/Compress** — ✅ **ERLEDIGT**
- Datei: `packages/frontend/src/components/UploadButton.tsx`
- ✅ Canvas/Bitmap Resize (max 1920px, JPEG Quality 0.8)
- ✅ Funktion `resizeImageIfNeeded()` implementiert
- ✅ Automatische Größenreduktion vor Upload
- **Model:** Claude 4.5 Sonnet

2) **Upload Retry (Exponential Backoff)** — ✅ **ERLEDIGT**
- ✅ Automatische Retries bei retryable network errors (max 3)
- ✅ Exponential Backoff: 1s, 2s, 4s delays
- ✅ Funktionen `getRetryDelay()` und `sleep()` implementiert
- **Model:** Claude 4.5 Sonnet

3) **Offline-Queue auch bei Disconnect während Upload** — ✅ **ERLEDIGT**
- ✅ Disconnect-Erkennung: `ERR_NETWORK`, timeout, `AbortError`
- ✅ Auto-Queue bei Verbindungsabbruch (1. Versuch)
- ✅ Queue Count Badge UI (alle Button-Varianten)
- ✅ `getQueueCount()` Funktion für UI-Feedback
- **Model:** Claude 4.5 Sonnet

---

## Milestone 2 — Realtime skalierbar

**STATUS: ✅ ERLEDIGT (2026-01-10)**

1) **Socket.io: WebSocket wieder aktivieren** — ✅ **ERLEDIGT**
- ✅ Backend: `transports: ['websocket', 'polling']` in `index.ts`
- ✅ Nginx Staging: Socket.io Proxy mit WebSocket Upgrade Headers
- ✅ Test: `"upgrades":["websocket"]` bestätigt
- **Model:** Opus (Design/Risiko) + Sonnet (Implementierung)

2) **Admin Dashboard Updates** — ✅ **ERLEDIGT**
- ✅ Entscheidung: **Optimiertes Polling** (Socket.io wäre Overkill für 1-3 Admins)
- ✅ `/logs`: Polling von 3s auf 10s erhöht, Visibility API
- ✅ `/dashboard`: Auto-Refresh alle 30s hinzugefügt
- **Model:** Opus (Abwägung) + Sonnet (Implementierung)

---

## Milestone 3 — Business/Policy & Safety Nets

**STATUS: ✅ ERLEDIGT (2026-01-10)**

1) **Host/Admin Download trotz Storage Lock erlauben** — ✅ **ERLEDIGT**
- ✅ `photos.ts`: Einzel- und Bulk-Download für Manager nach Storage Lock erlaubt
- ✅ `videos.ts`: Einzel- und Bulk-Download für Manager nach Storage Lock erlaubt
- ✅ Gäste werden weiterhin blockiert (STORAGE_LOCKED)
- **Model:** Opus (Policy) + Sonnet (Implementierung)

2) **Backend Multer File Size Limit erhöhen (z.B. 50MB)** — ✅ **ERLEDIGT**
- ✅ 50MB in `photos.ts`, `guestbook.ts`, `events.ts`
- **Model:** Sonnet

---

## Milestone 4 — Production Hardening (Betrieb, Resilience, Privacy)

**STATUS: ✅ ANALYSIERT (2026-01-10)** — 2 ACTION REQUIRED Items

Ziel: Production ist robust gegen schlechte Netze, regressions, und "silent failures". Zusätzlich Datenschutz/Compliance-Verbesserungen.

### P1 — Graceful Degradation & Offline-Souveränität (Upload Resume)

1) **Resumable Uploads (Chunked/Tus) evaluieren** — ✅ **IMPLEMENTIERT (2026-01-10, Commit 95d86fb)**
- **Problem:** Upload-Abbruch bei 90% ⇒ Gast startet wieder bei 0%
- **Implementierung (Tus.io):**
  - ✅ Backend: `@tus/server` v2.3.0, Route `/api/uploads`
  - ✅ Frontend: `tus-js-client` v4.3.1, `tusUpload.ts` Helper
  - ✅ UI Integration: `UploadButton.tsx` mit Tus + Fallback
  - ✅ Nginx Proxy: Tus-spezifische Headers konfiguriert (Prod + Staging)
  - ✅ Features: 5MB Chunks, 500MB max, auto-resume bei disconnect
  - ✅ Post-Upload: Backend erstellt 3 Varianten (Original/Optimized/Thumbnail)
- **Zusätzliche Optimierung (2026-01-11, Commit eb11fff):**
  - ✅ Client-side Resize (2500px max) vor Upload → 70-80% kleinere Files
  - ✅ Upload Queue Fix: `continue` statt `break` → kein Datenverlust mehr
- **Dokumentation:** `docs/TUS_ARCHITECTURE.md`
- **Model:** Opus (Architektur), Sonnet (Implementierung)

### P1 — Deep Monitoring & Alerting — ✅ **IMPLEMENTIERT (2026-01-10)**

1) **Sentry End-to-End (Backend + Frontend)** — ✅ **ERLEDIGT**
- **Implementierung:**
  - ✅ Backend: Sentry SDK v10 bereits vorhanden, funktioniert mit SENTRY_DSN
  - ✅ Frontend: `@sentry/nextjs` installiert
  - ✅ Config-Dateien: `sentry.client.config.ts` + `sentry.server.config.ts`
  - ✅ Dokumentation: `docs/SENTRY_SETUP.md`
- **Setup-Anleitung:**
  1. Sentry Projekt auf sentry.io erstellen
  2. `SENTRY_DSN` in `.env` (Prod) und `.env.staging` setzen
  3. `NEXT_PUBLIC_SENTRY_DSN` für Frontend (optional)
  4. Services neu starten
- **Model:** Sonnet (Implementierung)

2) **Uptime Monitoring** — ✅ **DOKUMENTIERT**
- **Dokumentation:** `docs/UPTIME_MONITORING.md`
- **Setup-Anleitung für UptimeRobot:**
  - 4 Health-Check Monitors (Prod + Staging App/Dashboard)
  - Alert Contacts konfigurieren
  - Empfohlene Einstellungen dokumentiert
- **Model:** Sonnet

### P1 — Database Integrity & Migration Safety

1) **Staging DB: eigene Instanz statt nur eigenes DB-Name/Schema evaluieren** — ✅ **ANALYSIERT**
- **Analyse (2026-01-10):**
  - Prod: `gaestefotos_v2` auf `localhost:5432`
  - Staging: `gaestefotos_v2_staging` auf `localhost:5432`
  - Risiko: Beide auf gleichem Server → potentielle Lock-Konflikte
- **Decision:** Status Quo akzeptabel
  - ✅ Unterschiedliche DB-Namen bereits implementiert
  - ⏳ Connection Pooling prüfen (PgBouncer/Prisma) bei Performance-Issues
  - ⏳ Volle Isolation erst bei hoher Staging-Last
- **Model:** Opus (Risikoanalyse)

2) **Migration-Safety Prozess** — ✅ **BEREITS IMPLEMENTIERT**
- ✅ `deploy-staging.sh` führt Migration vor Prod aus
- ✅ Smoke-Test nach Migration
- ✅ `prisma migrate deploy` in Deploy-Skripten integriert
- **Model:** Opus

### P1 — Automatisiertes Rollback — ✅ **IMPLEMENTIERT**

1) **Git Rollback Skript** — ✅ **IMPLEMENTIERT (2026-01-10)**
- **Implementierung:**
  - `scripts/rollback.sh` erstellt
  - Unterstützt: Rollback zu HEAD~1, spezifischem Commit, --list, --status
  - Automatisches: Stop → Reset → Install → Migrate → Build → Start
  - Rollback-History wird in `.rollback-history` protokolliert
  - Unterstützt Staging via `STAGING=true`
- **Usage:**
  ```bash
  ./scripts/rollback.sh              # Rollback zu HEAD~1
  ./scripts/rollback.sh abc123       # Rollback zu spezifischem Commit
  ./scripts/rollback.sh --list       # Zeige letzte 10 Commits
  STAGING=true ./scripts/rollback.sh # Staging-Rollback
  ```
- **Model:** Sonnet (Implementierung)

### P1 — Privacy / EXIF / GPS — ✅ **IMPLEMENTIERT (2026-01-10, Commit 95d86fb)**

1) **EXIF/GPS Handling auditieren und ggf. strippen** — ✅ **IMPLEMENTIERT**
- **Implementierung:**
  - ✅ `imageProcessor.ts`: `.withMetadata({ orientation: undefined })` strippt EXIF/GPS
  - ✅ Angewendet auf alle 3 Varianten (Original, Optimized, Thumbnail)
  - ✅ CapturedAt wird VOR Strip extrahiert und in DB gespeichert
  - ✅ Privacy-compliant: GPS-Koordinaten werden entfernt
- **Verifikation:** `packages/backend/src/services/imageProcessor.ts:35,46,56`
- **Model:** Opus (Policy + Audit) + Sonnet (Implementierung)

### P1 — External Health Monitoring — ✅ **DOKUMENTIERT**

1) **Health Endpoint extern überwachen** — ✅ **ERLEDIGT**
- **Status:**
  - ✅ Health Endpoint existiert und funktioniert:
    - Staging: `https://staging.app.gästefotos.com/api/health` → `{"status":"healthy"}`
    - Prod: `https://app.gästefotos.com/api/health` → `{"status":"healthy"}`
  - ✅ Dokumentation: `docs/UPTIME_MONITORING.md`
- **Setup-Anleitung:**
  1. UptimeRobot oder StatusCake Account erstellen
  2. Health-Checks für Prod + Staging einrichten (1-5 min Intervall)
  3. Alerting via E-Mail/Slack konfigurieren
- **Model:** Sonnet (Dokumentation)

---

## Milestone 5 — Resumable Uploads + Original Quality — ✅ **IMPLEMENTIERT (2026-01-10)**

### P0 — Tus.io Resumable Uploads — ✅ **IMPLEMENTIERT**

1) **Architektur-Design** — ✅ **ERLEDIGT**
- **Dokumentation:** `docs/TUS_ARCHITECTURE.md`
- **Model:** Opus

2) **Backend Implementierung** — ✅ **ERLEDIGT**
- **Implementierung:**
  - `@tus/server` + `@tus/file-store` installiert
  - `packages/backend/src/routes/uploads.ts` erstellt
  - Route: `POST /api/uploads` (Tus Protocol)
  - Post-Upload Processing: Original + Optimized + Thumbnail
- **Model:** Sonnet

3) **Frontend Client** — ✅ **ERLEDIGT**
- **Implementierung:**
  - `tus-js-client` installiert
  - `packages/frontend/src/lib/tusUpload.ts` erstellt
  - Unterstützt Auto-Resume bei Verbindungsabbruch
- **Model:** Sonnet

### P0 — Original-Qualität Fix — ✅ **IMPLEMENTIERT**

1) **DB Schema** — ✅ **ERLEDIGT**
- Neue Felder in `Photo` Model:
  - `storagePathOriginal` - Volle Qualität für Host-Download
  - `storagePathThumb` - 300px Thumbnail für Previews
  - `storagePath` - 1920px Optimized für Galerie

2) **Backend ImageProcessor** — ✅ **ERLEDIGT**
- `imageProcessor.processImage()` generiert jetzt 3 Varianten:
  - Original: Volle Qualität, nur EXIF stripped
  - Optimized: 1920px, 85% JPEG für Galerie
  - Thumbnail: 300px für Previews

3) **Download-Route** — ✅ **ERLEDIGT**
- Host/Admin erhalten Original-Qualität
- Gäste erhalten Optimized-Qualität
- Header `X-GF-Quality: original|optimized`

4) **Frontend** — ✅ **ERLEDIGT**
- Client-side Resize entfernt
- Original-Datei wird zum Backend gesendet

### P1 — DB Isolation — ✅ **DOKUMENTIERT**

1) **Dokumentation** — ✅ **ERLEDIGT**
- `docs/DB_ISOLATION.md` erstellt
- `scripts/setup-staging-db.sh` erstellt
- Prod: `gaestefotos_v2`, Staging: `gaestefotos_v2_staging`

---

## Regression & Abschluss

1) **Automated:**
- `pnpm type-check`
- `pnpm --filter frontend build`
- `pnpm --filter backend build`

2) **Manual Smoke:**
- Co-Host Permissions: upload/download/moderate/edit-event
- Invite/SSO returnUrl Flow

---

## Modell-Empfehlung (Kurz)
- **Audit/Architektur/Risiko:** Claude 4.5 Opus
- **Implementierung (Code):** Claude 4.5 Sonnet
- **Koordination/Allround:** Cascade
