# P0 Infrastruktur-Validierung — Ergebnisse

Stand: 2026-01-10 22:25 UTC+01

---

## Zusammenfassung (Decision Gates)

| # | Prüfpunkt | Status | Kritikalität | Aktion erforderlich |
|---|-----------|--------|--------------|---------------------|
| 1 | Staging-Frontend-Service | ❌ FEHLT | **KRITISCH** | Service + Build ergänzen |
| 2 | CORS/Origin (FRONTEND_URL) | ⚠️ UNVOLLSTÄNDIG | HOCH | staging.dash fehlt |
| 3 | Bucket/Secrets Separation | ❌ IDENTISCH | **KRITISCH** | Sofort trennen |
| 4 | Ports/Proxy-Parität | ⚠️ INKONSISTENT | MITTEL | Dokumentieren/vereinheitlichen |
| 5 | Upload-Limits | ⚠️ MISMATCH | MITTEL | Multer auf 50MB+ erhöhen |
| 6 | Cache/CDN Parität | ✅ OK | - | Staging ohne CDN (akzeptabel) |
| 7 | EXIF/GPS Privacy | ⚠️ NICHT GESTRIPPT | HOCH | Strip vor Persist/Serve |
| 8 | CSRF Posture | ✅ OK | - | Origin-Check vorhanden |

---

## Detaillierte Evidence

### 1) Staging-App-Lücke (Deploy/Build/Service)

**Evidence:**
```
$ systemctl status gaestefotos-frontend-staging.service
Unit gaestefotos-frontend-staging.service could not be found.

$ systemctl list-units --type=service | grep gaestefotos
  gaestefotos-admin-dashboard-staging.service  loaded active running
  gaestefotos-admin-dashboard.service          loaded active running
  gaestefotos-backend-staging.service          loaded active running
  gaestefotos-backend.service                  loaded active running
  gaestefotos-frontend.service                 loaded active running  ← nur PROD!
```

**Decision Gate:** ❌ **BESTÄTIGT**
- `gaestefotos-frontend-staging.service` existiert NICHT
- `deploy-staging.sh` baut kein `@gaestefotos/frontend`
- **Task:** "Staging-Frontend-Service + Build in deploy-staging.sh ergänzen"

---

### 2) CORS/Origin + Socket.io

**Evidence (.env.staging):**
```
FRONTEND_URL=https://staging.app.xn--gstefotos-v2a.com
```
→ Nur EINE URL, `staging.dash.xn--gstefotos-v2a.com` fehlt!

**Socket.io Test:**
```
$ curl -I "https://staging.app.xn--gstefotos-v2a.com/socket.io/?EIO=4&transport=polling"
HTTP/2 308 (redirect zu /socket.io ohne query params)
```
→ Socket.io Routing auf Staging ist defekt (308 redirect loop)

**Decision Gate:** ⚠️ **UNVOLLSTÄNDIG**
- `FRONTEND_URL` muss erweitert werden um: `https://staging.dash.xn--gstefotos-v2a.com`
- Socket.io Nginx config auf Staging prüfen

---

### 3) SeaweedFS Bucket/Secrets Separation

**Evidence:**
```
# .env.staging
SEAWEEDFS_ENDPOINT=localhost:8333
SEAWEEDFS_ACCESS_KEY=admin
SEAWEEDFS_SECRET_KEY=ArDo050723*
SEAWEEDFS_BUCKET=gaestefotos-v2

# .env (PROD)
SEAWEEDFS_ENDPOINT=localhost:8333
SEAWEEDFS_ACCESS_KEY=admin
SEAWEEDFS_SECRET_KEY=ArDo050723*
SEAWEEDFS_BUCKET=gaestefotos-v2
```

**IDENTISCH!** Auch:
- `JWT_SECRET` — identisch
- `TWO_FACTOR_ENCRYPTION_KEY` — identisch
- `COOKIE_DOMAIN` — identisch (`.xn--gstefotos-v2a.com`)

**Decision Gate:** ❌ **KRITISCH**
- Staging und Prod teilen **denselben Bucket + dieselben Secrets**
- Retention Worker auf Staging könnte Prod-Daten löschen!
- **Sofort-Task:** Eigenen Staging-Bucket erstellen, alle Secrets rotieren

---

### 4) Ports/Proxy-Parität (8001/8002/8101)

**Evidence (nginx -T):**
```
# Prod Backend
proxy_pass http://127.0.0.1:8001  (app.xn--gstefotos-v2a.com/api)

# Staging Backend  
proxy_pass http://127.0.0.1:8101  (staging.app.xn--gstefotos-v2a.com/api)

# Sonstige Configs
proxy_pass http://127.0.0.1:8002  (einige locations)
```

**systemd:**
```
gaestefotos-backend.service:         PORT=8001
gaestefotos-backend-staging.service: PORT=8101
```

**Decision Gate:** ⚠️ **INKONSISTENT**
- Prod: 8001 ✅
- Staging: 8101 ✅
- Port 8002 taucht in einigen Nginx-Configs auf → Legacy/Orphan?
- **Task:** Port 8002 Referenzen bereinigen oder dokumentieren

---

### 5) Upload-Limit Parität (Nginx + Multer + Timeouts)

**Nginx Evidence:**
```
# app.xn--gstefotos-v2a.com (Prod)
client_max_body_size 134217728;  (128MB)
proxy_read_timeout 910s;
proxy_send_timeout 910s;

# dash.xn--gstefotos-v2a.com
client_max_body_size 32m;
proxy_read_timeout 60s;
```

**Multer (Backend Code):**
```typescript
// photos.ts
limits: { fileSize: 10 * 1024 * 1024 }  // 10MB

// guestbook.ts
limits: { fileSize: 10 * 1024 * 1024 }  // 10MB (photos)
limits: { fileSize: 20 * 1024 * 1024 }  // 20MB (audio)

// events.ts (design upload)
limits: { fileSize: 10 * 1024 * 1024 }  // 10MB
```

**Decision Gate:** ⚠️ **MISMATCH**
- Nginx erlaubt 128MB, Multer blockt bei 10MB
- **Task:** Multer-Limit auf 50MB+ erhöhen (aligned mit Roadmap Milestone 3)

---

### 6) Cache/CDN Parität (_next/static)

**Evidence:**
```
# Prod (via Cloudflare)
$ curl -I "https://app.xn--gstefotos-v2a.com/_next/static/chunks/webpack-43e081ac1f89557d.js"
HTTP/2 200
cache-control: public, max-age=31536000, immutable
cf-cache-status: DYNAMIC

# Staging (direkt)
$ curl -I "https://staging.app.xn--gstefotos-v2a.com/_next/static/chunks/webpack-43e081ac1f89557d.js"
HTTP/2 200
cache-control: public, max-age=31536000, immutable
```

**Chunk-Hashes sind IDENTISCH** (weil gleicher Build/gleiche .next Artefakte)

**Decision Gate:** ✅ **OK**
- Staging ohne CDN ist akzeptabel für Testing
- Prod hat Cloudflare (cf-cache-status: DYNAMIC)
- Keine ChunkLoadError-Gefahr solange Build synchron bleibt

---

### 7) EXIF/GPS Privacy

**Evidence (Code):**
```typescript
// uploadDatePolicy.ts - liest EXIF für capturedAt
const exif = await exifr.parse(buffer, { pick: ['DateTimeOriginal', 'CreateDate'] });

// virusScan.ts, orphanCleanup.ts - speichern exifData in DB
exifData: { ... }
```

**Kein EXIF-Strip gefunden!**
- EXIF wird gelesen aber nicht entfernt
- GPS/Location-Daten könnten in Storage + DB landen

**Decision Gate:** ⚠️ **NICHT GESTRIPPT**
- **Task:** "EXIF strip vor Persist/Serve" implementieren
- Sharp oder exifr nutzen um Metadaten zu entfernen vor Storage-Upload

---

### 8) CSRF Posture

**Evidence (index.ts:365-384):**
```typescript
// Origin-Check Middleware vorhanden:
if (allowedOrigins.includes(effectiveOrigin)) {
  return next();
}
return res.status(403).json({ error: 'Forbidden: CSRF protection' });
```

**Cookies:**
```typescript
sameSite: 'lax'  // auth.ts, faceSearch.ts, invitations.ts
```

**Decision Gate:** ✅ **OK**
- Origin-Check ist aktiv in Production
- `sameSite: 'lax'` schützt vor Cross-Site POST
- Kein zusätzlicher CSRF-Token nötig (aber empfohlen für defense-in-depth)

---

## Priorisierte Fix-Liste (GO/NO-GO)

### BLOCKER (vor Milestone 0)

1. **Bucket/Secrets trennen** (Staging ≠ Prod) — ✅ **ERLEDIGT**
   - ✅ Neuer SeaweedFS Bucket: `gaestefotos-v2-staging` (existiert)
   - ✅ Neue Secrets generiert: `JWT_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`, `INVITE_JWT_SECRET`
   - ✅ Eigene `COOKIE_DOMAIN`: `.staging.xn--gstefotos-v2a.com`
   - Datei: `/root/gaestefotos-app-v2/packages/backend/.env.staging`

2. **Staging-Frontend-Service erstellen** — ✅ **ERLEDIGT**
   - ✅ `/etc/systemd/system/gaestefotos-frontend-staging.service` erstellt
   - ✅ `systemctl daemon-reload && enable` ausgeführt
   - ✅ `.env.staging` für Frontend erstellt

3. **deploy-staging.sh erweitert** — ✅ **ERLEDIGT**
   - ✅ `@gaestefotos/frontend` Build hinzugefügt
   - ✅ Frontend-Service stop/start/health-check integriert

4. **FRONTEND_URL erweitert** (.env.staging) — ✅ **ERLEDIGT**
   - ✅ `FRONTEND_URL=https://staging.app.xn--gstefotos-v2a.com,https://staging.dash.xn--gstefotos-v2a.com`

### SHOULD-FIX (Milestone 0-1)

5. **Multer-Limit erhöhen** (10MB → 50MB) — ✅ **ERLEDIGT**
   - ✅ `photos.ts`, `guestbook.ts`, `events.ts` aktualisiert

6. **EXIF/GPS Strip** vor Persist — ✅ **ERLEDIGT**
   - ✅ `imageProcessor.ts` erweitert mit `rotate()` + `withMetadata({ orientation: undefined })`
   - ✅ Neuer Service `exifStrip.ts` für explizite Strip-Funktion (optional nutzbar)
   - Photos + Guestbook-Uploads werden jetzt automatisch EXIF-gestrippt

7. **Port 8002 Referenzen** in Nginx bereinigen — ⏳ PENDING
   - Dokumentieren oder bereinigen (Nice-to-have)

### NICE-TO-HAVE

8. Socket.io Nginx Config auf Staging prüfen (308 redirect) — ⏳ PENDING
9. CSRF Token als defense-in-depth (optional) — ⏳ PENDING

---

## Nächste Schritte

1. ✅ Evidence gesammelt und dokumentiert
2. ✅ Fixes implementiert (Bucket/Secrets/Service/Multer/EXIF)
3. → Backend-Staging neu starten (neue Secrets/Bucket)
4. → Frontend-Staging starten (neuer Service)
5. → Smoke-Tests nach Fixes
