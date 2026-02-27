# 360° Audit — Gästefotos App v2
> Erstellt: Vollständiges 5-Phasen Elite-Audit

---

# PHASE 1: DEEP-MAPPING & ARCHITEKTUR (Sonnet 4.5)

## 1.1 Gesamtübersicht

| Metrik | Wert |
|--------|------|
| **Gesamtzeilen Code** | 148.386 |
| **Dateien (.ts/.tsx)** | 694 |
| **Prisma Models** | 79 |
| **Prisma Enums** | 56 |
| **Prisma Migrations** | 49 |
| **Backend Routes** | 87 Dateien |
| **Backend Services** | 48 Dateien |
| **Frontend Components** | 281 (.tsx) |
| **Frontend Pages** | 53 |
| **Admin Dashboard Pages** | 38 |
| **E2E Tests** | 20 |
| **Unit Tests** | 7 |
| **Sprachen (i18n)** | 5 (de, en, fr, es, it) |

## 1.2 Monorepo-Architektur (pnpm Workspaces)

```
gaestefotos-app-v2/
├── packages/
│   ├── backend/          # Express + Prisma + Socket.IO (47.122 Zeilen, 164 Dateien)
│   ├── frontend/         # Next.js 16 + React 18 (76.528 Zeilen, 422 Dateien)
│   ├── admin-dashboard/  # Next.js (Separater Port 3001) (21.260 Zeilen, 78 Dateien)
│   ├── print-terminal/   # Next.js Print-Kiosk (623 Zeilen, 5 Dateien)
│   ├── booth-app/        # Electron Booth (1.357 Zeilen, 13 Dateien)
│   └── shared/           # Gemeinsame Types/Utils (1.496 Zeilen, 12 Dateien)
├── e2e/                  # Playwright E2E Tests (20 Specs)
├── scripts/              # Deploy-, Backup-, Monitoring-Scripts (19 Dateien)
├── photo-booth/          # Konzept-Dokumentation (nur .md)
└── tools/devtools-browser/
```

## 1.3 Tech-Stack

| Layer | Technologie |
|-------|------------|
| **Backend** | Express 4, TypeScript, Prisma 5, PostgreSQL, Redis (ioredis), Socket.IO 4 |
| **Frontend** | Next.js 16, React 18, TailwindCSS, Framer Motion, Zustand, Radix UI, Recharts |
| **Admin** | Next.js, eigene UI-Komponentenbibliothek |
| **AI** | Groq SDK (Llama), @vladmandic/face-api (WASM), Sharp, FFmpeg |
| **Storage** | AWS S3 (@aws-sdk), TUS Resumable Uploads |
| **Monitoring** | Sentry, Winston Logger |
| **Deployment** | Hetzner Bare-Metal, Nginx, systemd, rsync-basiertes deploy.sh |
| **Testing** | Playwright (E2E), Vitest (Unit) |

## 1.4 Backend-Architektur

**Einstiegspunkt**: `index.ts` (807 Zeilen) — Monolithische Express-App mit:
- 87 importierte Route-Module (ALLE korrekt registriert ✅)
- 10 Background Worker (Retention, Virus-Scan, Orphan-Cleanup, etc.)
- WebSocket-Server (Socket.IO) für Echtzeit-Events
- Swagger/OpenAPI Dokumentation (nur in Dev)
- Graceful Shutdown + Sentry Error Tracking

**Route-Registrierung**: Sauber, alle 87 Route-Dateien sind importiert und registriert. KEINE verwaisten Routes gefunden.

**Worker-Prozesse** (im selben Prozess):
1. `retentionPurge` — Foto-Löschung nach Ablauf
2. `demoMosaicRetention` — Demo-Mosaic Cleanup
3. `eventRecap` — Event-Zusammenfassungen
4. `virusScan` — ClamAV Integration
5. `orphanCleanup` — Verwaiste Dateien
6. `storageReminder` — Speicher-Erinnerungen
7. `workflowTimer` — Workflow Cron-Trigger
8. `faceSearchConsentRetention` — DSGVO Consent-Cleanup
9. `qaLogRetention` — QA-Log Bereinigung
10. `wooLogRetention` — WooCommerce-Log Bereinigung

## 1.5 Datenbank-Schema (79 Models)

**Kern-Entities**: User, Event, Photo, Video, Guest, Category, Challenge
**Erweitert**: MosaicWall/Tile/PrintJob, Invitation/Rsvp/Visit, GuestbookEntry, Story
**AI-System**: AiProvider, AiUsageLog, AiFeatureMapping, AiResponseCache, AiPromptTemplate
**Business**: PackageDefinition, EventEntitlement, CreditBalance/Transaction, PaymentSession
**Partner**: Partner, PartnerMember, PartnerHardware, BillingPeriod/LineItem, PartnerSubscription/DeviceLicense
**Hardware**: HardwareInventory, HardwareBooking, SpinnerSession, DrawbotJob, VideoJob
**Gamification**: Achievement, UserAchievement, Leaderboard
**Workflow**: BoothWorkflow, WorkflowBackup
**Audit/Compliance**: QaLogEvent, ImpersonationAuditLog, FaceSearchConsent/AuditLog, ApiKey/AuditLog

## 1.6 Architektur-Map

```
                                   ┌─────────────────┐
                                   │   Nginx (443)    │
                                   │  SSL Termination │
                                   └────────┬────────┘
                          ┌─────────────────┼─────────────────┐
                          │                 │                 │
                    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
                    │ Frontend  │    │   Admin    │    │   Print   │
                    │ :3000     │    │ :3001      │    │ :3002     │
                    │ Next.js16 │    │ Next.js    │    │ Next.js   │
                    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
                          │                │                 │
                          └────────┬───────┘─────────────────┘
                                   │ /api/*
                            ┌──────▼──────┐
                            │   Backend   │
                            │   :8001     │
                            │  Express.js │
                            └──┬───┬───┬──┘
                               │   │   │
                    ┌──────────┘   │   └──────────┐
              ┌─────▼─────┐ ┌─────▼─────┐ ┌──────▼─────┐
              │ PostgreSQL │ │   Redis   │ │  S3 / MinIO│
              │  (Prisma)  │ │(Cache/RL) │ │  (Storage) │
              └────────────┘ └───────────┘ └────────────┘
                                   │
                            ┌──────▼──────┐
                            │  Socket.IO  │
                            │  (Realtime) │
                            └─────────────┘
                                   │
                    ┌──────────────┼──────────────┐
              ┌─────▼─────┐ ┌─────▼─────┐ ┌──────▼──────┐
              │   Groq    │ │  ClamAV   │ │   FFmpeg    │
              │ (AI/LLM)  │ │(Antivirus)│ │ (Video/GIF) │
              └───────────┘ └───────────┘ └─────────────┘
```

---

# PHASE 2: LOGIK-AUDIT & FEATURE-IDEEN (Sonnet 4.5)

## 2.1 Foto-Upload-Zyklus — Analyse

### Upload-Pipeline (Zwei parallele Pfade)

**Pfad A: Standard-Upload** (`POST /:eventId/photos/upload`)
1. `optionalAuthMiddleware` → JWT auslesen (optional)
2. `requireEventAccess` → Event-Cookie oder JWT prüfen
3. `enforceEventUploadAllowed` → Event aktiv? Upload-Fenster? Speicher?
4. `attachEventUploadRateLimits` + IP/Event-Limiter
5. `uploadSinglePhoto` → Multer (50MB max, Memory Storage)
6. `validateUploadedFile('image')` → Dateivalidierung
7. `imageProcessor.processImage()` → 3 Varianten (Original, Optimized 1920px, Thumb 300px)
8. Smart Album → EXIF-Datum → Kategorie-Zuordnung
9. `assertUploadWithinLimit()` → Paket-Speicherlimit prüfen
10. Storage Upload (3 Dateien parallel → S3)
11. DB-Eintrag + URL-Update (2 separate Writes!)
12. **Post-Upload Async-Hooks** (alle fire-and-forget):
    - WebSocket `photo_uploaded`
    - Achievement-Check
    - Push-Notification
    - Mosaic Auto-Place
    - Face Detection + Descriptor-Speicherung
    - Duplicate Detection
    - E-Mail an Host

**Pfad B: TUS Resumable Upload** (`/api/uploads`)
1. TUS-Server mit FileStore (100MB max)
2. Metadaten via Upload-Metadata Header (Base64)
3. `onUploadFinish` → `processCompletedUpload()`
4. Progressive Upload: Quick-Preview (30KB) → TUS Full Upload
5. Cleanup: Temp-Dateien + 2h Stale-File-Cleanup

### Logik-Findings

#### L1: RACE CONDITION — Photo URL Update (MITTEL)
```
photos.ts:433-466
```
Photo wird mit `url: ''` erstellt, dann sofort mit `url: /api/photos/${id}/file` aktualisiert. Zwischen CREATE und UPDATE existiert ein Fenster, in dem WebSocket-Events mit `url: ''` ausgegeben werden könnten. **Fix**: URL direkt im CREATE setzen (CUID ist deterministisch).

#### L2: DUPLIZIERTER VERARBEITUNGSCODE (HOCH)
`photos.ts` (Standard-Upload) und `uploads.ts` (TUS-Upload) enthalten nahezu identische Bildverarbeitungslogik:
- Smart-Album-Chain (3-stufig) → in beiden implementiert
- Storage-Upload (3 Varianten) → in beiden implementiert
- WebSocket-Events → in beiden implementiert

**Aber TUS fehlen**: Face Detection, Duplicate Detection, Achievement-Check, Push-Notifications, Mosaic Auto-Place, E-Mail-Benachrichtigung.

→ **Empfehlung**: Shared `processUploadedPhoto()` Service extrahieren.

#### L3: MEMORY-PRESSURE bei Bulk-Uploads (MITTEL)
Multer nutzt `memoryStorage()` → gesamter Upload-Buffer im RAM. Bei 50MB × 30 gleichzeitigen Uploads = 1.5GB RAM. Der Server hat 125GB RAM, aber es gibt keine Concurrency-Begrenzung pro Event.

#### L4: FACE SEARCH — Lineare Scan-Komplexität (NIEDRIG aktuell, HOCH bei Skalierung)
`faceSearch.ts:98-175`: Alle Photos mit `faceCount > 0` werden geladen und dann in einer Schleife verglichen. Bei 10.000+ Fotos pro Event wird das langsam.
→ **Empfehlung**: Vector-DB oder PG-Embedding für ANN-Search (Approximate Nearest Neighbor).

#### L5: MOSAIC PLACEMENT — Kein Locking (MITTEL)
`mosaicEngine.placePhoto()` liest die `occupied` Tiles, berechnet die Position, und schreibt dann. Bei gleichzeitigen Uploads zweier Fotos könnten beide dieselbe Position erhalten. `@@unique([mosaicWallId, gridX, gridY])` verhindert Duplikate, aber das zweite Insert würde mit einem Prisma-Error fehlschlagen statt elegant re-tried zu werden.
→ **Empfehlung**: Pessimistic Lock oder Retry-Loop mit Backoff.

#### L6: PROGRESSIVE UPLOAD — Zombie-Records (NIEDRIG)
Quick-Preview erstellt einen Photo-Record mit `tags: ['progressive-upload']`. Wenn der TUS-Upload fehlschlägt, bleibt ein Record mit nur einem Thumbnail und `status: PENDING` zurück. Kein Cleanup-Worker dafür.

## 2.2 Auth-System — Analyse

### Positiv
- JWT + HttpOnly Cookies ✅
- Separate `event_access_${eventId}` Cookies pro Event ✅
- `optionalAuthMiddleware` für Guest-Zugriff ✅
- `requireRole()` für Admin-Routen ✅
- `hasEventPermission()` mit granularen Permissions (canUpload, canModerate, canEdit, canDownload) ✅
- Invite-Token für Bootstrapping ✅
- Refresh-Token-System mit Redis (bereits implementiert) ✅

### Finding
#### L7: AUTH-MIDDLEWARE — User-Lookup bei jedem Request (MITTEL)
`authMiddleware` macht bei JEDEM authentifizierten Request einen DB-Lookup (`prisma.user.findUnique`), um die aktuelle Rolle zu holen. Bei 1000 Requests/Minute = 1000 DB-Queries nur für Auth.
→ **Empfehlung**: Rolle in JWT-Payload cachen, Refresh-Token invalidiert bei Rollenänderung.

## 2.3 Feature-Gate-System — Analyse

Saubere Implementierung mit `FeatureKey`-Type (22 Features) und `LimitKey`-Type (7 Limits). Mapping von Feature-Keys zu PackageDefinition-Feldern. Free-Tier-Defaults korrekt.

**Aber**: `FREE_TIER_FEATURES: FeatureKey[] = []` und `ALWAYS_ENABLED_FEATURES: FeatureKey[] = []` sind leer. Laut Pricing-Modell sollte `faceSearch` in ALWAYS_ENABLED stehen (USP für alle Tiers!).

## 2.4 Feature-Vorschläge (Technologische Optimierungen)

| ID | Vorschlag | Impact | Aufwand |
|----|-----------|--------|---------|
| **T1** | Shared `processUploadedPhoto()` Service (L2 fix) | Consistency, weniger Bugs | 4h |
| **T2** | WebP/AVIF-Generierung statt nur JPEG | 30-50% kleiner, schnellere Gallery | 2h |
| **T3** | Image CDN Layer (Imgproxy/Thumbor) | Skalierung, on-the-fly Resize | 8h |
| **T4** | Bull/BullMQ Job-Queue für async Processing | Robuster als fire-and-forget | 16h |
| **T5** | Database Connection Pooling (PgBouncer) | Skalierung bei vielen Connections | 2h |
| **T6** | GraphQL Gateway oder tRPC für Frontend | Type-Safety, weniger Boilerplate | 40h+ |
| **T7** | Vector Index für Face Search (pgvector) | O(n) → O(log n) bei Face Search | 8h |
| **T8** | Upload Deduplication (pHash vor Upload) | Spart Storage, User-Experience | 4h |
| **T9** | Progressive JPEG → BlurHash Placeholder | Bessere wahrgenommene Performance | 4h |
| **T10** | Stale-While-Revalidate Cache-Strategy | Weniger API-Calls, schnellere UI | 4h |

---

# PHASE 3: SECURITY & DB-HARDENING (Opus 4.6)

## 3.1 SQL-Injection

✅ **SAUBER**: Keine `$queryRawUnsafe` oder `executeRawUnsafe` gefunden. Alle Raw-Queries nutzen `Prisma.sql` Tagged Template Literals (bereits in vorherigem Audit behoben).

## 3.2 XSS (Cross-Site Scripting)

⚠️ **5 × `dangerouslySetInnerHTML`** gefunden:
| Datei | Kontext | Risiko |
|-------|---------|--------|
| `page.tsx` (Landing) | Feature-Liste aus statischem Array | NIEDRIG (statisch) |
| `agb/page.tsx` | CMS-Content | MITTEL (von WordPress) |
| `datenschutz/page.tsx` | CMS-Content | MITTEL (von WordPress) |
| `faq/page.tsx` | CMS-Content | MITTEL (von WordPress) |
| `impressum/page.tsx` | CMS-Content | MITTEL (von WordPress) |

→ **Empfehlung**: DOMPurify für CMS-Content, oder Server-Side Sanitization beim CMS-Sync.

## 3.3 Cookie-Security

✅ **GUT**: Alle Auth-Cookies nutzen `httpOnly: true`, `secure: isProd`, `sameSite: 'lax'`.
- Event-Access-Cookies: 12h TTL ✅
- Auth-Token: Cookie-based ✅
- Refresh-Token: Redis-backed mit Rotation ✅

## 3.4 CSRF-Schutz

✅ **IMPLEMENTIERT**: Origin-basierter CSRF-Schutz + Redis-backed Token-Store (aus vorherigem Audit).

## 3.5 Rate-Limiting

✅ **UMFANGREICH**: 20+ Rate-Limiter, alle Redis-backed:
- Upload: IP + Event-basiert
- Auth: Login/Register
- AI: Feature-spezifisch
- SMS: Eigener Limiter
- TUS: Create-only Limiter
- Push: Subscribe Limiter

## 3.6 Security-Findings

#### S1: `eval()` / `new Function()` — KEINE GEFUNDEN ✅

#### S2: SUPERADMIN-Rolle im Code, nicht im Schema (NIEDRIG)
`auth.ts:12`: `isPrivilegedRole()` prüft auf `'ADMIN' || 'SUPERADMIN'`, aber `UserRole`-Enum im Schema hat nur `ADMIN | PARTNER | HOST`. `SUPERADMIN` existiert nicht in der DB.
→ Entweder aus Enum entfernen oder hinzufügen.

#### S3: WebSocket ohne Rate-Limiting (NIEDRIG)
`index.ts:685-725`: Socket.IO `connection` und `join:event` haben kein Rate-Limiting. Ein Client könnte tausende Rooms joinen.
→ **Empfehlung**: Max 10 Rooms pro Socket, Connection-Rate-Limit.

#### S4: TUS Upload-Dir Pfad in Status-Endpoint (NIEDRIG)
`uploads.ts:363-369`: `/api/uploads/status` gibt `uploadDir: TUS_UPLOAD_DIR` zurück → Server-Pfad wird exponiert.
→ **Fix**: `uploadDir` aus Response entfernen.

#### S5: `process.env.JWT_SECRET` ohne Minimum-Length-Check (NIEDRIG)
Nirgendwo wird geprüft, ob JWT_SECRET eine Mindestlänge hat. Ein schwaches Secret (z.B. "test") wäre katastrophal.
→ **Empfehlung**: ≥32 Zeichen Minimum beim Start prüfen.

---

# PHASE 4: UX, DESIGN & MARKETING

## 4.1 SEO-Status

### Positiv
- **Root Layout**: Vollständiges `Metadata`-Objekt mit title, description, keywords, openGraph, twitter ✅
- **Event-Seiten**: Dynamische `generateMetadata()` mit Event-Titel, Location, OG-Image ✅
- **`sitemap.ts`**: Existiert ✅
- **`robots.txt`**: Existiert ✅
- **Meta-Base**: `https://app.xn--gstefotos-v2a.com` (Punycode für Umlaut) ✅

### Fehlende Meta-Tags (14 Seiten!)
Folgende Seiten haben **KEINE** `metadata` oder `generateMetadata`:
- `/admin`, `/agb`, `/create-event`, `/dashboard`, `/datenschutz`, `/faq`
- `/forgot-password`, `/impressum`, `/login`, `/moderation`, `/offline`
- `/partner`, `/register`, `/reset-password`

→ **Empfehlung**: Mindestens `title` + `description` für alle öffentlichen Seiten. Für Auth-Seiten (login, register, etc.) reicht `noindex`.

## 4.2 Accessibility

| Check | Ergebnis |
|-------|----------|
| Empty `alt=""` | 34 × (akzeptabel für dekorative Bilder) |
| `<img>` ohne `alt` | 3 × (müssen gefixt werden) |
| Loading States | 65 Komponenten mit Skeleton/Spinner ✅ |
| Keyboard Navigation | Nicht geprüft (E2E nötig) |
| Color Contrast | Nicht geprüft (braucht Lighthouse) |

## 4.3 UX-Findings

#### U1: LANDING PAGE — `dangerouslySetInnerHTML` für Feature-Liste
Feature-Beschreibungen werden als HTML-Strings gerendert statt als React-Komponenten. Fragile und potenzielles XSS-Risiko.

#### U2: PROGRESSIVE UPLOAD UX — Exzellent
Quick-Preview (30KB) → sofortige Gallery-Anzeige → TUS Full-Upload im Hintergrund. Gäste sehen ihr Foto in ~1 Sekunde. **Best-in-Class UX**.

#### U3: DUAL-WIZARD Problem
Nutzer (Hosts) könnten theoretisch auf den alten `EventWizard` (wizard/) stoßen statt den neuen `SetupWizard` (setup-wizard/). Der alte Wizard sollte entfernt werden.

## 4.4 Design-Konsistenz

- **UI-Bibliothek**: Radix UI + shadcn/ui Pattern (51 Dateien in `ui/`) ✅
- **Styling**: TailwindCSS durchgehend ✅
- **Dark Mode**: ThemeProvider implementiert ✅
- **Event-Theming**: Dynamic CSS Custom Properties ✅
- **Animationen**: Framer Motion ✅

## 4.5 UX-Verbesserungsvorschläge

| ID | Vorschlag | Impact | Aufwand |
|----|-----------|--------|---------|
| **U4** | Offline-Galerie (Service Worker Cache für geladene Fotos) | Hoch für Events mit schlechtem Empfang | 8h |
| **U5** | Upload-Batch mit Fortschrittsanzeige (nicht einzeln) | Weniger Frustration bei Multi-Upload | 4h |
| **U6** | Lazy-Load für Lightbox (nur sichtbare Fotos laden) | Performance bei 1000+ Fotos | 4h |
| **U7** | Swipe-Gesten in Lightbox (Mobile) | Standard-Erwartung auf Mobil | 2h |
| **U8** | Konfetti/Animation nach erstem Upload (bereits implementiert aber nur teilweise) | Engagement | 1h |
| **U9** | "Teile dein bestes Foto" Push nach Event | Re-Engagement, Content-Generierung | 2h |
| **U10** | Host-Dashboard: Split in Tabs (statt 1572-Zeilen-Monolith) | Wartbarkeit + Performance | 8h |

---

# PHASE 5: REALITÄTS-CHECK & ABSCHLUSSBERICHT

## 5.1 Dead Code — Vollständige Liste

### Frontend Komponenten (17 ungenutzt, ~135 KB)
| Datei | Größe | Empfehlung |
|-------|-------|------------|
| `BottomNavigation.tsx` | 22.687 B | LÖSCHEN (ersetzt durch e3/BottomNav) |
| `EventHeader.tsx` | 23.495 B | LÖSCHEN (ersetzt durch e3/EventHero) |
| `HostPhotoUpload.tsx` | 14.120 B | LÖSCHEN (ersetzt durch WorkflowUploadModal) |
| `InstagramGallery.tsx` | 11.426 B | LÖSCHEN (nie integriert) |
| `InstagramUploadButton.tsx` | 9.974 B | LÖSCHEN (nie integriert) |
| `MasonryGallery.tsx` | 8.882 B | LÖSCHEN (ersetzt durch ModernPhotoGrid) |
| `TimeInput24h.tsx` | 8.711 B | PRÜFEN (könnte für Setup-Wizard nötig sein) |
| `ColorSchemeSelector.tsx` | 6.113 B | LÖSCHEN (ThemeProvider übernimmt) |
| `WifiBanner.tsx` | 5.748 B | LÖSCHEN (ersetzt durch e3/WifiNotification) |
| `InstallPrompt.tsx` | 5.687 B | BEHALTEN (PWA-Feature, evtl. reaktivieren) |
| `DateRangeFilter.tsx` | 4.547 B | LÖSCHEN (E2E-Test existiert aber Komponente ungenutzt) |
| `UploadProgressIndicator.tsx` | 4.089 B | LÖSCHEN (uploadStore + QuickUploadModal ersetzen) |
| `OptimizedImage.tsx` | 3.414 B | LÖSCHEN (Next/Image wird direkt genutzt) |
| `Envelope.tsx` | 2.570 B | LÖSCHEN (Animations-Spielerei) |
| `InfiniteScrollGallery.tsx` | 2.383 B | LÖSCHEN (ersetzt durch ModernPhotoGrid) |
| `WpConsentBanner.tsx` | 1.545 B | LÖSCHEN (nicht eingebunden) |
| `ActionButton.tsx` | 1.330 B | LÖSCHEN (shadcn/ui Button wird genutzt) |

### Frontend Hooks (4 ungenutzt)
| Hook | Empfehlung |
|------|------------|
| `useBrowserLanguage.ts` | LÖSCHEN (AutoLocaleDetect ersetzt) |
| `usePullToRefresh.ts` | BEHALTEN (nützlich für Mobile, evtl. aktivieren) |
| `useUpgradeModal.ts` | LÖSCHEN (packageInfo.features Gate ersetzt) |
| `useUploadQueue.ts` | LÖSCHEN (uploadStore ersetzt) |

### Frontend Lib (1 ungenutzt)
| Datei | Empfehlung |
|-------|------------|
| `flags.ts` | LÖSCHEN |

### Backend Services (2 ungenutzt)
| Service | Empfehlung |
|---------|------------|
| `exifStrip.ts` | LÖSCHEN (imageProcessor.processImage strippt EXIF) |
| `videoProcessor.ts` | LÖSCHEN (videoService.ts wird genutzt) |

### Legacy Wizard (10 Dateien)
| Verzeichnis | Empfehlung |
|-------------|------------|
| `components/wizard/*` | LÖSCHEN (setup-wizard/ ist der aktive Wizard) |

## 5.2 God-Objects (Refactoring-Priorität)

| Datei | Zeilen | Empfohlenes Refactoring |
|-------|--------|------------------------|
| `routes/events.ts` | **2.450** | Aufteilen: `events/crud.ts`, `events/settings.ts`, `events/members.ts`, `events/hashtag.ts` |
| `QrStylerClient.tsx` | 1.745 | Aufteilen: `QrCanvas.tsx`, `QrControls.tsx`, `QrTemplateSelector.tsx` |
| `dashboard/page.tsx` | 1.572 | Aufteilen: `DashboardOverview.tsx`, `DashboardGallery.tsx`, `DashboardSetup.tsx` |
| `routes/mosaic.ts` | 1.496 | Aufteilen: `mosaic/crud.ts`, `mosaic/tiles.ts`, `mosaic/print.ts` |
| `routes/photos.ts` | 1.460 | Aufteilen: `photos/upload.ts`, `photos/crud.ts`, `photos/serve.ts` |
| `routes/videos.ts` | 1.329 | Aufteilen: `videos/upload.ts`, `videos/crud.ts`, `videos/serve.ts` |

## 5.3 Fehlende Konfiguration

| Item | Status | Fix |
|------|--------|-----|
| `.env.example` admin-dashboard | ❌ FEHLT | Erstellen |
| `.env.example` print-terminal | ❌ FEHLT | Erstellen |
| `.env.example` booth-app | ❌ FEHLT | Erstellen |
| JWT_SECRET Minimum-Length Check | ❌ FEHLT | ≥32 Zeichen beim Start prüfen |
| `faceSearch` in ALWAYS_ENABLED_FEATURES | ❌ FEHLT | Laut Pricing-Modell: alle Tiers |

## 5.4 Inkonsistenzen

| Item | Problem | Fix |
|------|---------|-----|
| Prisma Naming | `design_projects`, `design_templates`, `qr_templates` = snake_case; Rest = PascalCase | @@map() auf snake_case vereinheitlichen |
| SUPERADMIN Rolle | Im Code geprüft, im Schema nicht definiert | Enum erweitern oder Code bereinigen |
| TUS vs Standard Upload | Unterschiedliche Post-Processing-Pipelines | Shared Service extrahieren |
| URL-Update nach Create | Photo.url = '' bei Create, dann Update | URL direkt im Create setzen |

## 5.5 Test-Coverage Gap

| Bereich | Ist | Soll |
|---------|-----|------|
| E2E (Playwright) | 20 Specs | 40+ (alle User-Flows) |
| Unit Tests Frontend | 7 | 50+ (Hooks, Utils, Components) |
| Unit Tests Backend | **0** | **30+** (Services, Middleware, Utils) |
| Integration Tests | 0 | 10+ (API Routes mit Test-DB) |

---

## PRIORISIERTE ROADMAP

### SOFORT (Sprint 1 — 1-2 Tage)
1. 🔴 **Dead Code löschen** — 17 Komponenten, 4 Hooks, 2 Services, 1 Lib, Legacy Wizard (F1-F5)
2. 🔴 **TUS Upload-Dir aus Status-Endpoint entfernen** (S4)
3. 🔴 **`faceSearch` in `ALWAYS_ENABLED_FEATURES` eintragen** (Pricing-Bug!)
4. 🔴 **3 × `<img>` ohne `alt` fixen** (Accessibility)
5. 🟡 **Meta-Tags für 14 Seiten ohne Metadata** (SEO)

### KURZFRISTIG (Sprint 2-3 — 1 Woche)
6. 🔴 **Shared `processUploadedPhoto()` Service** — TUS + Standard vereinheitlichen (L2)
7. 🟡 **Photo URL direkt im Create setzen** (L1 Race Condition)
8. 🟡 **DOMPurify für CMS-Content** (S2 XSS)
9. 🟡 **WebP-Generierung als 4. Variante** (T2)
10. 🟡 **.env.example für 3 Packages erstellen** (F9)
11. 🟡 **Progressive-Upload Zombie-Cleanup Worker** (L6)

### MITTELFRISTIG (Sprint 4-8 — 1 Monat)
12. 🟡 **Backend-Unit-Tests aufbauen** — 30 Tests für kritische Services (F11)
13. 🟡 **events.ts in Sub-Router aufteilen** (F8)
14. 🟡 **Dashboard Page in Tabs aufteilen** (U10)
15. 🟡 **Upload-Komponenten konsolidieren** (F6) — max 3 statt 8
16. 🟡 **Mosaic Placement Retry-Loop** (L5)

### LANGFRISTIG (Q3-Q4 2026)
17. 🟢 **pgvector für Face Search** (L4/T7)
18. 🟢 **BullMQ Job-Queue** (T4)
19. 🟢 **Image CDN (Imgproxy)** (T3)
20. 🟢 **Shared Package erweitern** (F13) — Types, Validation, Constants

---

## POSITIV-BILANZ (Stärken der App)

| # | Stärke | Bewertung |
|---|--------|-----------|
| P1 | Saubere Route-Registrierung — 87/87 korrekt ✅ | Exzellent |
| P2 | 79 Prisma-Models mit umfangreicher Indexierung | Exzellent |
| P3 | Progressive Upload UX (1-Sekunden-Preview) | Best-in-Class |
| P4 | Vollständige i18n (5 Sprachen, alle Guest-UI) | Exzellent |
| P5 | Workflow Builder (37 Step-Typen, XState Runtime) | Einzigartig |
| P6 | Umfassendes Rate-Limiting (20+ Redis-backed) | Exzellent |
| P7 | Mosaic Wall (Color-Match + Overlay-Blending) | Einzigartig |
| P8 | Partner/Franchise-System (Full-Stack) | Production-Ready |
| P9 | Gamification (Achievements, Leaderboard) | Wettbewerbsvorteil |
| P10 | DSGVO-konforme Face Search mit Consent-System | Pflicht erfüllt |
| P11 | Dynamic Event Themes (AI-generiert) | Premium-Feature |
| P12 | 10 Background Worker für automatische Bereinigung | Robust |

---

## GESAMTBEWERTUNG

| Bereich | Score | Kommentar |
|---------|-------|-----------|
| **Architektur** | 7/10 | Solide Monorepo-Struktur, aber God-Objects und Code-Duplikation |
| **Security** | 8/10 | Starkes Fundament (Helmet, CSRF, Rate-Limiting, ClamAV). Kleinere XSS-Risiken bei CMS |
| **Code-Qualität** | 6/10 | Viel Dead Code, fehlende Tests, inkonsistente Naming |
| **UX/Design** | 8/10 | Moderne UI, Progressive Upload, Event-Theming. SEO-Lücken |
| **Performance** | 7/10 | 3-Varianten-Pipeline gut, aber kein CDN, keine WebP, Memory-Upload |
| **Feature-Completeness** | 9/10 | Extrem umfangreich: Mosaic, AI, Workflows, Partner, Gamification |
| **Production-Readiness** | 7/10 | Funktioniert, aber Dead Code + fehlende Tests = Risiko |

**Gesamt: 7.4 / 10** — Solide App mit beeindruckendem Feature-Set. Hauptschwächen sind Wartbarkeit (Dead Code, God-Objects) und Test-Coverage. Nach Cleanup der Sofort-Items → 8.5/10.
