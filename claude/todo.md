# 📋 TODO: gästefotos-app-v2 - Komplette Roadmap

## ✅ ERLEDIGT - Kritische Items (Stand: 2026-01-13)

### Infrastruktur & Konfiguration
- [x] ✅ **Production Upload-Limit auf 128 MB** - `client_max_body_size 128m;` in Nginx
- [x] ✅ **Separater S3-Bucket für Staging** - `gaestefotos-v2-staging` existiert
- [x] ✅ **Staging-Frontend-Service** - `/etc/systemd/system/gaestefotos-frontend-staging.service`

### Security
- [x] ✅ **Neuer JWT-Secret für Staging** - In `.env.staging` gesetzt
- [x] ✅ **Separate Cookie-Domain für Staging** - `.staging.xn--gstefotos-v2a.com`

### Code-Fixes
- [x] ✅ **Client-Side Image Resizing** - 2500px max, 70-80% Upload-Reduktion (Tus.io)
- [x] ✅ **Upload Retry-Logik** - Tus.io mit Resume-Capability implementiert
- [x] ✅ **EXIF/GPS Strip** - Automatisch bei Upload
- [x] ✅ **Multer-Limit 50MB** - photos.ts, guestbook.ts, events.ts

### Bugfixes & Features (2026-01-13)
- [x] ✅ **Bug #8: Design-Bilder bei deaktivierten Events** - Backend erlaubt jetzt Laden
- [x] ✅ **Bug #1: Zurück-Button Mobile** - asChild-Pattern für IconButton
- [x] ✅ **Name-Persist in LocalStorage** - Gast muss Namen nicht bei jedem Upload neu eingeben
- [x] ✅ **WebSocket in Socket.io** - Backend + Frontend nutzen jetzt WebSocket (statt nur Polling)
- [x] ✅ **Realtime-Updates für Dashboard/Photos** - useRealtimePhotos Hook, auto-refresh bei photo_uploaded/approved

---

## ⚠️ WICHTIG - Diese Woche (vor Load-Test!)

### Performance & UX
- [x] ✅ **Dashboard Realtime-Updates via Socket.io** - Erledigt 2026-01-13

- [ ] ⚠️ **Dashboard API-Calls direkt zu localhost** (30 Min)
  - Service: `gaestefotos-admin-dashboard.service`
  - Ändern: `NEXT_PUBLIC_API_URL=http://localhost:8001`
  - **Impact: -100ms Latenz, keine Cloudflare-Abhängigkeit!**

- [x] ✅ **Name-Persist in LocalStorage** - Erledigt 2026-01-13

- [ ] ⚠️ **Upload-ETA anzeigen** (1 Stunde)
  - Progress-Component erweitern
  - ETA-Berechnung: `(100 - progress) / progress * elapsedTime`
  - **Impact: Besseres User-Feedback bei langen Uploads!**

- [ ] ⚠️ **Offline-Queue UI** (3 Stunden)
  - Persistent Badge mit Queue-Count
  - Liste der wartenden Uploads + Manual Retry
  - **Impact: User sehen ausstehende Uploads!**

### Infrastruktur
- [ ] ⚠️ **SeaweedFS Replication aktivieren** (2 Stunden)
  - Command: `weed master -mdir=./mdir -defaultReplication=001`
  - **Impact: Backup! Wenn Server crasht, bleiben Fotos erhalten!**

- [ ] ⚠️ **Multer File Size Limit auf 50 MB** (5 Min)
  - Datei: `packages/backend/src/routes/photos.ts`
  - Zeile 58: `fileSize: 50 * 1024 * 1024`
  - **Impact: Moderne Smartphones (12-15 MB) werden akzeptiert!**

- [ ] ⚠️ **Sharp-Fallback crashen lassen** (5 Min)
  - Datei: `packages/backend/src/services/imageProcessor.ts`
  - Zeile 22-28: `throw new Error('Sharp missing')`
  - **Impact: Keine unkomprimierten 12 MB Bilder ausliefern!**

**⏱ Gesamtaufwand WICHTIG: ~12 Stunden**

---

## 📌 OPTIONAL - Nächsten Monat (Nice-to-Have)

### Environment-Verbesserungen
- [ ] 📌 **Separate PostgreSQL-Instanz für Staging** (8 Stunden)
  - Docker-Container oder VM
  - Echte Isolation (aktuell: shared localhost:5432)

- [ ] 📌 **Cloudflare für Staging aktivieren** (2 Stunden)
  - WAF, DDoS-Protection, CDN
  - Realistische Tests (aktuell: nur Production hat Cloudflare)

- [ ] 📌 **Zwei Staging-Umgebungen** (12 Stunden)
  - `staging-dev.app` → Lockere Limits für Entwicklung
  - `staging-prod.app` → 1:1-Clone von Production

### Features
- [ ] 📌 **Gast-Analytics für Host** (4 Stunden)
  - API: `GET /api/events/:id/analytics/guests`
  - Dashboard-Page: Upload-Heatmap pro Gast

- [ ] 📌 **Email-Benachrichtigung bei Upload** (2 Stunden)
  - Nach erfolgreichem Upload Email an Host
  - Template: "Neues Foto von [Gast-Name]"

- [ ] 📌 **Bulk-Download mit Ordner-Struktur** (3 Stunden)
  - ZIP mit Kategorien als Ordner
  - `Trauung/IMG_001.jpg`, `Feier/IMG_002.jpg`

- [ ] 📌 **QR-Code Vorlagen** (6 Stunden)
  - QR mit Event-Logo in der Mitte
  - Visitenkarten-Format, Tischaufsteller-Format

- [ ] 📌 **Skeleton Loaders** (2 Stunden)
  - Statt "Loading..." Text
  - Animated Skeletons für Grid, Modal, etc.

- [ ] 📌 **Host-Download trotz Storage-Lock** (1 Stunde)
  - Host/Admin sollten IMMER downloaden können
  - Auch nach Package-Ablauf!

**⏱ Gesamtaufwand OPTIONAL: ~40 Stunden**

---

## ✅ ERLEDIGT

### Analysen & Audits
- [x] ✅ **Schonungslose Komplettanalyse erstellt** (SCHONUNGSLOSE_ANALYSE.md)
  - Technische Architektur-Bewertung
  - UX-Flow-Analyse (QR → Upload)
  - Performance-Szenarien (500 Gäste gleichzeitig)
  - Feature-Inventory (Frontend + Backend)
  - Prioritätenliste (Kritisch/Wichtig/Optional)

- [x] ✅ **Multi-Environment Deep-Audit** (MULTI_ENVIRONMENT_DEEP_AUDIT.md)
  - 4-Subdomain-Analyse (Prod App, Prod Dash, Staging App, Staging Dash)
  - SSL-Zertifikate & Environment-Sync
  - Cross-Domain-Logik (App ↔ Dashboard)
  - Deployment-Check (Staging vs. Production)
  - 5 kritische Blocker identifiziert

### Infrastruktur-Checks
- [x] ✅ Projektstruktur analysiert (Monorepo mit pnpm)
- [x] ✅ Backend-Service Status geprüft (Port 8001, aktiv seit 1 Tag)
- [x] ✅ Frontend-Service Status geprüft (Port 3000, aktiv seit 1 Tag)
- [x] ✅ Server-Ressourcen geprüft (125GB RAM, 32 Cores, 2TB Disk)
- [x] ✅ Datenbank-Schema analysiert (Prisma, 40+ Models)
- [x] ✅ API-Endpoints identifiziert (40+ Routes)
- [x] ✅ Bildverarbeitungs-Pipeline untersucht (Sharp, Server-Side)

---

## 📊 METRIKEN & ZIELE

### Performance-Ziele
- **Upload-Zeit (10 MB Foto):** 
  - ❌ Aktuell: 40 Sekunden (bei 2 Mbit/s Event-WiFi)
  - ✅ Nach Client-Resize: 5 Sekunden (800 KB)
  
- **Live Wall Latenz:**
  - ❌ Aktuell: 2-5 Sekunden (Polling)
  - ✅ Nach WebSocket: <100ms

- **Backend CPU-Last (500× Upload):**
  - ❌ Aktuell: 500× Sharp-Processing = CPU-Spike
  - ✅ Nach Client-Resize: 10× weniger Last

### Load-Test-Ziele
- [ ] 50 gleichzeitige User (Baseline)
- [ ] 100 gleichzeitige User (Realistic)
- [ ] 500 gleichzeitige User (Peak Event)

**Tools:** Playwright E2E + Artillery Load-Testing

---

## 🎯 ROADMAP-ÜBERSICHT

```
┌─────────────────────────────────────────────────────────────┐
│  WOCHE 1: KRITISCHE BLOCKER (10h)                           │
│  → Upload-Limit, Staging Dashboard, S3-Bucket, Secrets     │
│  → Client-Side Resize, WebSocket, Retry-Logik              │
├─────────────────────────────────────────────────────────────┤
│  WOCHE 2: WICHTIGE VERBESSERUNGEN (12h)                    │
│  → Dashboard Realtime, Name-Persist, Upload-ETA            │
│  → SeaweedFS Replication, Multer Limits, Sharp-Fallback    │
├─────────────────────────────────────────────────────────────┤
│  WOCHE 3: LOAD-TESTS & BUG-FIXES (variabel)                │
│  → 50 → 100 → 500 gleichzeitige User testen                │
│  → Gefundene Bugs fixen                                    │
├─────────────────────────────────────────────────────────────┤
│  WOCHE 4: GO-LIVE VORBEREITUNG                             │
│  → Final Smoke-Tests                                       │
│  → Monitoring Setup (Sentry, Logs)                         │
│  → Backup-Strategie finalisieren                           │
└─────────────────────────────────────────────────────────────┘
```

**GO/NO-GO für Production:** Nach Woche 2 + erfolgreichen Load-Tests ✅

---

## 📝 NOTIZEN & CONTEXT

### Server-Details
- **IP:** 65.109.71.182
- **OS:** Linux 6.8.0-90-generic (Ubuntu/Debian)
- **RAM:** 125 GB (117 GB verfügbar)
- **CPU:** 32 Cores
- **Disk:** 2 TB (36 GB genutzt = 2%)

### Service-Ports
| Service | Production | Staging |
|---------|------------|---------|
| Frontend App | 3000 | 3002 |
| Frontend Dash | 3001 | 3101 |
| Backend | 8001 | 8002 |
| PostgreSQL | 5432 (shared) | 5432 (shared) |
| SeaweedFS | 8333 (shared) | 8333 (shared) |
| Redis | 6379 (shared) | 6379 (shared) |

### Tech-Stack
- **Backend:** Node.js 24, Express.js, TypeScript
- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Database:** PostgreSQL 14+ mit Prisma ORM
- **Storage:** SeaweedFS (S3-kompatibel)
- **Image:** Sharp (Resize, Thumbnail, Optimize)
- **Realtime:** Socket.io (aktuell: Polling-only)
- **Auth:** JWT + httpOnly Cookies + 2FA (TOTP)

### Bekannte Limitierungen
- ⚠️ Kein Client-Side Image Resizing
- ⚠️ Socket.io nur Polling (WebSocket deaktiviert)
- ⚠️ Keine automatische Upload-Retry
- ⚠️ Dashboard ohne Realtime-Updates
- ⚠️ Staging und Production teilen Ressourcen

---

**Letzte Aktualisierung:** 2026-01-10  
**Nächstes Review:** Nach Woche 1 (Kritische Fixes)  
**Verantwortlich:** Senior Technical Product Manager & Fullstack Architect

