# 🔍 Gästefotos App – Gnadenloser Code-Audit

**Datum:** 2026-03-01  
**Scope:** Backend (~55.000 LOC), Frontend (~80.000 LOC), Admin-Dashboard, Prisma Schema, Nginx  
**Methode:** Statische Analyse, Codebase-Durchsicht, Produktions-Checks

---

## 🔴 1. KRITISCHE FEHLER (Must-Fix)

### K1: Video-Upload hält 100 MB im RAM (`multer.memoryStorage()`)
**Datei:** `packages/backend/src/routes/videos.ts:23-36`  
**Problem:** Video-Uploads bis 100 MB werden komplett in den Arbeitsspeicher geladen. Bei 5 gleichzeitigen Uploads = 500 MB RAM weg → OOM-Kill möglich.  
**Fix:** Auf `multer.diskStorage()` oder Stream-basiertes Upload (TUS) umstellen für Videos.

```typescript
// VORHER (gefährlich):
const upload = multer({
  storage: multer.memoryStorage(), // ❌ 100MB pro Upload im RAM
  limits: { fileSize: 100 * 1024 * 1024 },
});

// NACHHER (sicher):
const upload = multer({
  storage: multer.diskStorage({
    destination: '/tmp/video-uploads',
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});
```

### K2: Kein `not-found.tsx`, `error.tsx`, `global-error.tsx` im Frontend
**Problem:** Next.js App Router hat KEINE Error-Boundary-Pages. Bei 404 oder Server-Error sieht der User einen generischen Next.js-Fehlerscreen statt einer gebrandeten Seite.  
**Impact:** Professionelles Erscheinungsbild zerstört. User verliert Vertrauen.  
**Fix:** Drei Dateien erstellen in `packages/frontend/src/app/`:
- `not-found.tsx` – Freundliche 404-Seite mit Zurück-Button
- `error.tsx` – Client-Error-Boundary mit Retry
- `global-error.tsx` – Catch-All für Root-Layout-Fehler

### K3: CSRF-Middleware existiert aber ist NICHT aktiviert
**Datei:** `packages/backend/src/middleware/csrf.ts` (200 Zeilen, vollständig implementiert)  
**Problem:** `csrfProtection` und `csrfTokenGenerator` werden in `index.ts` **nirgends** aufgerufen (0 Treffer). Die gesamte CSRF-Schutzschicht ist toter Code.  
**Impact:** State-Changing Requests (POST/PUT/DELETE) sind ungeschützt gegen CSRF-Attacken. Ein Angreifer könnte über eine manipulierte Seite Events löschen, Fotos hochladen, oder Settings ändern.  
**Fix:** In `index.ts` aktivieren:
```typescript
app.use(csrfTokenGenerator); // Vor den Routes
app.use('/api', csrfProtection); // State-changing requests schützen
```

### K4: `photos.ts` Multer hat KEINEN `fileFilter`
**Datei:** `packages/backend/src/routes/photos.ts:43-48`  
**Problem:** Im Gegensatz zu Videos, Guestbook, FaceSearch etc. hat der Foto-Upload KEINEN MIME-Type-Filter im Multer. Jeder Dateityp wird akzeptiert.  
**Hinweis:** `validateUploadedFile('image')` fängt das nachher ab, aber die Datei ist dann bereits im Speicher.  
**Fix:** `fileFilter` hinzufügen wie bei allen anderen Upload-Routes.

```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Nur Bilddateien sind erlaubt'));
  },
});
```

### K5: `photos.ts` ist 8.480 Zeilen lang
**Problem:** Eine einzelne Route-Datei mit fast 8.500 Zeilen ist unwartbar. Merge-Konflikte, langsame IDE, schwierige Code-Reviews.  
**Fix:** Aufteilen in Sub-Router (wie bereits bei `eventQr.ts`, `eventDesign.ts` gemacht):
- `photoUpload.ts` – Upload-Logic
- `photoGallery.ts` – Listing/Filter/Pagination
- `photoBulk.ts` – Bulk-Operationen (Reorder, Delete, Move)
- `photoExif.ts` – EXIF/Metadata-Endpoints
- `photoDownload.ts` – ZIP-Download

---

## 🟠 2. SICHERHEITSBEDENKEN

### S1: `$queryRawUnsafe` in mehreren Services
**Dateien:** `faceSearchPgvector.ts`, `aiAsyncDelivery.ts`, `trendMonitor.ts`, `email.ts`  
**Bewertung:** Die pgvector-Queries verwenden parametrisierte Platzhalter (`$1`, `$2`...) → **kein akutes SQL-Injection-Risiko**. Aber `$queryRawUnsafe` bypassed Prisma's Type-Safety.  
**Empfehlung:** Wo möglich auf `$queryRaw` mit Template-Literals (`Prisma.sql\`...\``) umstellen.

### S2: EXIF-Daten werden korrekt gestrippt ✅
`imageProcessor.ts:30-33` nutzt `.withMetadata({ orientation: undefined })` — das entfernt EXIF inkl. GPS-Koordinaten. **DSGVO-konform.**

### S3: XSS-Schutz vorhanden ✅
- `dangerouslySetInnerHTML` wird **nur** mit `sanitizeCmsHtml()` (DOMPurify) verwendet
- SVG-Upload wird über `isSvgObviouslyUnsafe()` gefiltert
- `mongoSanitize()` gegen NoSQL-Injection aktiv
- Helmet mit CSP konfiguriert

### S4: Kein Cookie-Consent-Banner
**Problem:** Kein `CookieBanner` oder `CookieConsent`-Komponente gefunden. Bei EU/DSGVO-Pflicht problematisch, wenn Tracking-Cookies gesetzt werden.  
**Hinweis:** `auth_token` Cookie wird gesetzt → informierte Einwilligung nötig.  
**Fix:** Cookie-Banner implementieren oder in Datenschutz-Seite dokumentieren (funktionale Cookies ausgenommen).

### S5: QR-Code über externen Service (`qrserver.com`)
**Datei:** `events.ts:1859`  
**Problem:** `GET /:eventId/qr-code` leitet an `api.qrserver.com` weiter. Event-URLs werden an Dritten gesendet.  
**Hinweis:** Ein zweiter Endpoint `GET /:id/qr` in `eventQr.ts:565` nutzt die lokale `qrcode` Library korrekt.  
**Fix:** Den alten Endpoint in `events.ts` auf die lokale Library umstellen oder entfernen (ist redundant).

### S6: Rate-Limiting gut implementiert ✅
- Redis-backed Rate-Limiter (Multi-Instance safe)
- Separate Limits für Auth (20/15min), API (2000/15min), Uploads, 2FA
- User-Identity statt IP für Shared-WiFi-Szenarien (Event-Kontext!)

### S7: Daten-Retention/GDPR vorhanden ✅
Umfangreiche Retention-Services:
- `retentionPurge.ts` – 6 Monate Grace Period nach Event
- `eventPurgeWorker.ts` – Hard-Delete
- `zombieUploadCleanup.ts` – Verwaiste Uploads
- `qaLogRetention.ts`, `wooLogRetention.ts`, `faceSearchConsentRetention.ts`

---

## 🟡 3. UX/DESIGN-OPTIMIERUNGEN

### U1: `maximumScale: 1` blockiert Zoom auf Mobile
**Datei:** `layout.tsx:58`  
**Problem:** `maximumScale: 1` verhindert Pinch-to-Zoom. Das ist ein **Barrierefreiheits-Problem** (WCAG 1.4.4) und frustrierend für ältere Nutzer.  
**Fix:**
```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale: 1, // ENTFERNEN – Zoom erlauben
  viewportFit: 'cover',
  themeColor: '#295B4D',
}
```

### U2: Keine expliziten Touch-Targets (44×44px Minimum)
**Problem:** Keine systematische Verwendung von `min-h-11 min-w-11` (44px) für Touch-Targets. Auf Hochzeiten nutzen Gäste Smartphones, oft mit fettigen Fingern.  
**Empfehlung:** Button-Komponente standardmäßig mit `min-h-[44px] min-w-[44px]` ausstatten.

### U3: Error-Seiten fehlen (siehe K2)
Wiederholung: Keine gebrandeten 404/500-Seiten = schlechte User-Experience.

### U4: Upload-Button Offline-Queue gut implementiert ✅
- `uploadQueue.ts` mit IndexedDB
- `OfflineQueueIndicator.tsx` zeigt Status
- Automatische Retry bei Reconnect
- Progressive Upload (Thumbnail sofort, Full-Quality async)

### U5: OpenGraph/SEO gut implementiert ✅
- Globale Meta-Tags in `layout.tsx` (Title, Description, OG, Twitter Cards)
- Dynamische Meta-Tags pro Event in `e3/[slug]/layout.tsx`
- Keywords, Authors, Robots korrekt konfiguriert
- `metadataBase` gesetzt

---

## 🔵 4. STRATEGISCHE VORSCHLÄGE

### ST1: Onboarding-Speed (QR → Upload)
**Aktuell:** QR-Scan → `/e3/{slug}` → Galerie sehen → Upload-Button → Datei wählen → Upload  
**Analyse:** ~4-5 Klicks, ~8-12 Sekunden. Ziel war <10 Sekunden.  
**Verbesserung:** Deep-Link mit `?upload=1` Parameter, der direkt die Kamera/Dateiauswahl öffnet.

### ST2: Social Sharing nach Upload
**Status:** Kein systematisches Social-Sharing nach Foto-Upload. `FeedbackFlow` leitet zu Google Reviews, aber nicht zu Instagram/WhatsApp.  
**Vorschlag:** Nach Upload einen "Teile dein Foto!" Share-Sheet anbieten (Web Share API):
```typescript
if (navigator.share) {
  navigator.share({
    title: `Mein Foto von "${eventTitle}"`,
    url: `${baseUrl}/e3/${slug}?photo=${photoId}`,
  });
}
```

### ST3: Dankesseite nach Event
**Status:** Kein Post-Event-Flow. Host bekommt keine "Dein Event war ein Erfolg!"-Email.  
**Vorschlag:** Automatische Event-Recap-Email (Service existiert bereits: `eventRecap.ts`) mit Stats + CTA für nächstes Event.

### ST4: SEO Landing-Pages
**Status:** Nur eine generische Landing Page. Keine spezifischen Seiten für "Hochzeit Fotogalerie", "Firmen-Event Fotos", etc.  
**Vorschlag:** CMS-gesteuerte Landing Pages pro Event-Typ für organisches SEO.

---

## 🟣 5. CODE-REFACTORING

### R1: Dead Code – `middleware/upload.ts`
**Problem:** `packages/backend/src/middleware/upload.ts` wird **nirgends importiert**. Jede Route definiert ihren eigenen Multer. Die Datei ist toter Code.  
**Fix:** Löschen oder als zentrale Upload-Factory refactoren.

### R2: Redundante Multer-Definitionen
**Problem:** 8+ verschiedene Multer-Konfigurationen in verschiedenen Route-Files, alle fast identisch.  
**Fix:** Zentrale `createUpload(type: 'image' | 'video' | 'audio')` Factory:
```typescript
export function createUpload(type: 'image' | 'video' | 'audio', maxMb = 50) {
  const mimePrefix = { image: 'image/', video: 'video/', audio: 'audio/' }[type];
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
      file.mimetype.startsWith(mimePrefix) ? cb(null, true) : cb(new Error(`Nur ${type}-Dateien erlaubt`));
    },
  });
}
```

### R3: Inkonsistente Fehlermeldung-Sprachen
**Problem:** Mix aus Deutsch und Englisch in Error-Responses:
- `'Event nicht gefunden'` (Deutsch, korrekt)
- `'Internal server error'` (Englisch)
- `'No file uploaded'` (Englisch)
- `'Forbidden'` (Englisch)  
**Fix:** Alle Fehlermeldungen auf Deutsch vereinheitlichen (User-facing) oder I18n-Keys verwenden.

### R4: `eventDesign.ts:31` – Falsche Fehlermeldung
```typescript
// Limit ist 50MB, aber Fehlermeldung sagt "Maximum: 10MB"
if (code === 'LIMIT_FILE_SIZE') {
  return res.status(400).json({ error: 'Datei zu groß. Maximum: 10MB' }); // ❌ Falsch
}
```
**Fix:** `'Maximum: 50MB'` oder die Limits selbst auf 10MB senken.

### R5: QR-Code Endpoint Duplikation
- `events.ts:1848` → `GET /:eventId/qr-code` (extern via qrserver.com)
- `eventQr.ts:565` → `GET /:id/qr` (lokal via `qrcode` Library)  
**Fix:** Alten externen Endpoint entfernen, nur den lokalen behalten.

---

## 🛠️ 6. VORGESCHLAGENE ADMIN-DASHBOARD DEV-TOOLS

### Neue Admin-Seiten

| Seite | Pfad | Beschreibung |
|-------|------|-------------|
| **System-Konsole** | `/system/console` | Terminal-ähnliche Oberfläche für vordefinierte Befehle (siehe unten) |
| **API-Playground** | `/system/api-playground` | Swagger-ähnlicher API-Tester mit Auth |
| **DB-Explorer** | `/system/db-explorer` | Read-Only Tabellen-Browser mit Suche/Filter |
| **Event-Simulator** | `/system/event-simulator` | Test-Events erstellen, Fake-Uploads generieren |
| **Queue-Monitor** | `/system/queues` | Job-Queue Status (AI-Jobs, Video-Gen, Email) |
| **Storage-Analyzer** | `/system/storage` | SeaweedFS Nutzung pro Event, Orphan-Detection |
| **Feature-Flag-Audit** | `/system/feature-audit` | Welche Events nutzen welche Features tatsächlich |
| **Performance-Dashboard** | `/system/perf` | Response-Zeiten, Slow-Queries, Memory-Usage |
| **Error-Log-Viewer** | `/system/errors` | Aggregierte Frontend + Backend Errors mit Stack |
| **User-Journey-Replay** | `/system/journeys` | QA-Log Timeline pro Session |

### Konsolen-Befehle (System-Konsole)

```
BACKEND-BEFEHLE:
  health                  → Backend Health-Check
  cache:flush             → Redis Cache komplett leeren
  cache:stats             → Redis Memory/Keys Info
  retention:run           → Retention-Purge manuell triggern
  zombies:cleanup         → Verwaiste Uploads aufräumen
  ai:status               → AI-Provider Status (Ollama, fal.ai, RunPod)
  ai:cache:seed           → Knowledge-Store neu seeden
  email:test <addr>       → Test-Email senden
  event:stats <id>        → Event-Statistiken
  event:recalc <id>       → Storage neu berechnen
  db:stats                → DB-Größe, Tabellen-Counts
  db:vacuum               → PostgreSQL VACUUM ANALYZE
  jobs:pending             → Offene AI-Jobs anzeigen
  jobs:retry <id>          → Fehlgeschlagenen Job erneut starten
  storage:orphans          → Dateien ohne DB-Referenz finden
  storage:usage            → SeaweedFS Speicherverbrauch
  nginx:reload             → Nginx Config neu laden
  services:status          → Alle Systemd-Services Status
  logs:tail <service> [n]  → Letzte N Logzeilen eines Services
  
DIAGNOSE-BEFEHLE:
  diagnose:event <id>     → Vollständiger Event-Gesundheitscheck
  diagnose:user <id>      → User-Account Analyse
  diagnose:uploads        → Upload-Pipeline Statusprüfung
  diagnose:ai             → AI-Service Konnektivität testen
  diagnose:email          → SMTP-Verbindung testen
  diagnose:storage        → SeaweedFS Erreichbarkeit + Quota
  diagnose:ssl            → SSL-Zertifikat Ablaufprüfung
  diagnose:dns            → DNS-Auflösung testen
  
BATCH-BEFEHLE:
  batch:reprocess-thumbs <eventId>  → Thumbnails neu generieren
  batch:migrate-storage <from> <to> → Storage-Migration
  batch:export-users                → CSV-Export aller User
  batch:notify-inactive             → Inaktive Events Email senden
```

### Bestehende Admin-Seiten die fehlen/erweitert werden sollten

| Feature | Status | Aktion |
|---------|--------|--------|
| **Backup/Restore UI** | Seite existiert (`/system/backups`) | Testen ob funktional |
| **Real-time WebSocket Monitor** | Fehlt | Socket.IO Connections + Events anzeigen |
| **Cron-Job Dashboard** | Fehlt | Alle Timer/Intervals mit letztem Run-Zeitpunkt |
| **A/B-Test Manager** | Fehlt | Feature-Flags für A/B-Tests erweitern |
| **Revenue Dashboard** | Fehlt | WooCommerce Orders + Revenue Charts |
| **Partner-Performance** | Seite existiert | Erweitern: Conversion-Rates, Churn |

---

## 📊 ZUSAMMENFASSUNG

| Kategorie | Anzahl | Priorität |
|-----------|--------|-----------|
| 🔴 Kritische Fehler | 5 | Sofort fixen |
| 🟠 Sicherheitsbedenken | 3 (aktiv), 4 (OK) | Mittelfristig |
| 🟡 UX-Optimierungen | 3 | Nächster Sprint |
| 🔵 Strategische Vorschläge | 4 | Roadmap |
| 🟣 Code-Refactoring | 5 | Continuous |
| 🛠️ Admin-Tools | 10+ neue Seiten | Roadmap |

### Was bereits gut ist ✅
- **Image-Processing-Pipeline** (Sharp: Original, Optimized 1920px, Thumbnail 300px, WebP) — exzellent
- **EXIF-Stripping** für DSGVO — korrekt implementiert
- **Rate-Limiting** mit Redis — professionell
- **Offline-Upload-Queue** mit IndexedDB — robust
- **Progressive Upload** (Thumbnail first) — gute UX
- **XSS-Schutz** mit DOMPurify — korrekt
- **Error-Boundary** im Frontend — vorhanden und loggt an Backend
- **Retention/GDPR** Worker — umfangreich
- **SEO/OpenGraph** — gut konfiguriert
- **Sentry-Integration** — vorhanden
- **Feature-Gating** — sauber pro Package-Tier
- **Upload-Security** (`uploadSecurity.ts`) — Magic-Byte-Validierung via `file-type`
