# Phase 1: Architektur-Map – Gaestefotos-App

**Stand:** Code-First-Analyse (ohne .md-Dokumentation).  
**Ziel:** Lückenlose Übersicht der App-Struktur für das 360-Grad-Audit.

---

## 1. Repo-Überblick

| Bereich | Pfad | Beschreibung |
|--------|------|--------------|
| **Monorepo** | `/` | pnpm-Workspace, `packages/*` |
| **Backend** | `packages/backend` | Express, Socket.IO, Prisma, TUS-Uploads |
| **Frontend** | `packages/frontend` | Next.js 16, App Router |
| **Shared** | `packages/shared` | Typen, Utils, Konstanten |
| **Print-Terminal** | `packages/print-terminal` | Next.js, QR-Scanner, Druck-Station |
| **Booth-App** | `packages/booth-app` | Electron/Next, Kiosk-Booth |
| **Admin-Dashboard** | `packages/admin-dashboard` | Separates Admin-UI |
| **Docs** | `docs/` | Ops, Features, Bot-Knowledge (in Phase 5 prüfen) |
| **Scripts** | `scripts/` | Deploy, Backup, Smoke-Tests, Git-Hooks |
| **Tools** | `tools/devtools-browser` | VNC/Dev-Browser |

---

## 2. Backend-Architektur

### 2.1 Einstieg & Middleware-Kette

- **Einstieg:** `packages/backend/src/index.ts` (~787 Zeilen)
- **HTTP:** Express, `createServer(app)`
- **Realtime:** Socket.IO auf gleichem Server, Pfad `/socket.io`, CORS auf `allowedOrigins`
- **Reihenfolge:**  
  `helmet` → `mongoSanitize` → Request-ID → Logging → CORS → CSRF-Check (non-GET + Cookie) → `express.json` / `urlencoded` → `maintenanceModeMiddleware` → Routen → Error-Handler

### 2.2 Rate Limiting (aus index.ts)

- **Globaler API-Limiter:** auskommentiert (`// app.use('/api', apiLimiter)`)
- **Aktiv pro Route:**  
  `authLimiter` (auth), `uploadLimiter`, `passwordLimiter`, `smsLimiter`, `paymentLimiter`, `leadLimiter`, `aiFeatureLimiter`, `pushSubscribeLimiter`, `analyticsLimiter` auf jeweiligen Mounts

### 2.3 API-Routen (Mount-Pfade)

| Prefix | Route-Datei | Kurzbeschreibung |
|--------|-------------|------------------|
| `/api/health` | health | Liveness/Readiness |
| `/api/auth` | auth | Login, Register, 2FA |
| `/api` | maintenance | Maintenance-Flag |
| `/api` | wpConsent | WP-Consent (Asset/Frame) |
| `/api/theme` | theme | Theme-Abruf |
| `/api/face-search-consent` | faceSearchConsent | Einwilligung Face-Search |
| `/api/events` | events, guests, photoRoutes, categories, challenges, statistics, email, stories, guestbook, duplicates, videoRoutes, cohosts, highlightReels, mosaic, hashtagImport | Event-Kern |
| `/api/statistics` | statistics | User-Statistiken |
| `/api/email` | email | E-Mail-Test |
| `/api/photos` | photoRoutes, categoryRoutes, likes, comments, votes, stories | Fotos, Kategorien, Social |
| `/api/face-search` | faceSearch | Gesichtssuche |
| `/api/print-service` | printService | Druck-Service |
| `/api/videos` | videoRoutes | Video-Dateien |
| `/api/cohosts` | cohostInvites | Co-Host-Einladung |
| `/api` | invitation, qrDesigns | Einladungen, QR-Designs |
| `/api/admin/*` | packageDefinitions, adminWooWebhooks, adminApiKeys, adminInvoices, adminEmailTemplates, adminInvitationTemplates, adminQrTemplates, adminCmsSync, adminMaintenance, adminTheme, adminFaceSearchConsent, adminOps, adminQaLogs, adminImpersonation, adminMarketing, adminPhotos, adminFeatureFlags, adminLogs, adminEvents, adminUsers, adminDashboard, adminSettings, adminAiAnalysis, adminAiProviders, adminCredits | Admin-APIs |
| `/api/qr-templates` | qrTemplates | Öffentliche QR-Templates |
| `/api/cms` | cmsPublic | CMS Public |
| `/api/qa-logs` | qaLogs | QA-Logs (Client) |
| `/api/webhooks/woocommerce` | woocommerceWebhooks | WooCommerce Webhooks |
| `/api/ai` | ai | KI-Assistent |
| `/api/sms` | smsShare (smsLimiter) | SMS-Versand |
| `/api` | galleryEmbed | Galerie-Embed |
| `/api/slideshow` | slideshow | Slideshow |
| `/api/style-transfer` | styleTransfer (aiFeatureLimiter) | Style-Transfer |
| `/api/booth-games` | boothGames (aiFeatureLimiter) | Booth-Games |
| `/api/events` | gamification | Achievements, Leaderboard |
| `/api/push` | push (pushSubscribeLimiter) | Push-Subscribe |
| `/api/events` | analytics (analyticsLimiter) | Analytics |
| `/api/hardware` | hardware | Hardware-Inventar/Bookings |
| `/api/leads` | leads (leadLimiter) | Leads |
| `/api/assets` | assets | Assets |
| `/api/booth-templates` | boothTemplates | Booth-Templates |
| `/api/graffiti` | graffiti | Graffiti |
| `/api/workflows` | workflows | Booth-Workflows |
| `/api` | downloads | ZIP-Download |
| `/api` | payments (paymentLimiter) | Payment-Sessions |
| `/api` | spinner | 360°-Spinner |
| `/api` | drawbot | Drawbot |
| `/api` | videoJobs | Video/GIF/Boomerang-Jobs |
| `/api/uploads` | uploads | TUS-Resumable-Uploads |

### 2.4 Backend-Services (36+ Dateien unter `src/services/`)

- **Storage & Upload:** storage, imageProcessor, packageLimits, uploadDatePolicy, exifStrip
- **Policies:** storagePolicy, eventPolicy
- **Media:** videoProcessor, videoService, virusScan
- **AI/ML:** faceRecognition, faceSearch, faceSwitch, styleTransfer, aiExecution, aiStyleEffects, bgRemoval, smartAlbum
- **Features:** highlightReel, duplicateDetection, guestbookPdf, mosaicEngine, achievementTracker, boothGames
- **Infrastruktur:** cache (redis, aiCache), email, pushNotification, smsService
- **Worker:** retentionPurge, demoMosaicRetention, eventRecap, orphanCleanup, storageReminder, faceSearchConsentRetention, qaLogRetention, wooLogRetention
- **Sonstiges:** featureGate, challengeTemplates, logoOverlay

Alle genannten Services werden von Routen oder index.ts (Worker) referenziert (teils dynamisch per `import()`).

### 2.5 Datenbank (Prisma)

- **Provider:** PostgreSQL (`DATABASE_URL`)
- **Schema:** `packages/backend/prisma/schema.prisma` (~2219 Zeilen)
- **Kernmodelle (Auswahl):** User, Event, EventMember, Guest, Photo, Category, PhotoLike, PhotoComment, PhotoVote, Story, GuestbookEntry, GuestbookPhotoUpload, GuestbookAudioUpload, Video, Challenge, Invitation, MosaicWall, MosaicTile, MosaicPrintJob, Partner, VideoJob, PushSubscription, HardwareInventory, PaymentSession, SpinnerSession, DrawbotJob, AiProvider, AiUsageLog, Lead, Asset, BoothWorkflow, Achievement, … (insgesamt 70+ Modelle)

### 2.6 Uploads-Verzeichnis

- **Pfad:** `packages/backend/uploads/` (z. B. `uploads/events/<eventId>/`)
- **Berechtigung (lokal geprüft):** `755 root:root` – für Produktion sollten Schreibrechte und Besitzer je Deployment geprüft werden.

---

## 3. Frontend-Architektur

### 3.1 Framework & Einstieg

- **Next.js 16**, App Router
- **Einstieg:** `packages/frontend/src/app/layout.tsx`, `page.tsx`

### 3.2 App-Routen (Ordner unter `src/app/`)

- **(admin)** – Admin-Layout: dashboard (qr-templates, create-event, hardware, print-service, templates, workflows)
- **admin** – Admin-Seiten
- **agb, datenschutz, faq, impressum** – Recht/Info
- **api** – API-Routes (z. B. wp-consent)
- **create-event, dashboard** – Event-Erstellung & Dashboard
- **e3** – E3-spezifische Seiten
- **events** – events/new, events/[id] (dashboard, categories, photos, videos, invitations, guestbook, mosaic, live-wall, live-analytics, statistics, guests, design, wifi, challenges, booth-games, ki-booth, air-graffiti, leads, duplicates, assets, package, qr-styler, mosaic/print-station)
- **live** – live/[slug] (wall, camera, mosaic/gallery)
- **login, register, forgot-password, reset-password** – Auth
- **moderation** – Moderation
- **offline** – Offline-Seite
- **partner** – Partner-Bereich
- **version** – Version-Endpoint

### 3.3 Wichtige Frontend-Bereiche

- **Store:** authStore, uploadStore, toastStore (Zustand)
- **Lib:** api, auth, tusUpload, uploadQueue, uploadMetrics, websocket, sanitize, designPresets, workflow-runtime, qaLog, flags
- **Hooks:** useRealtimeNotifications, useRealtimePhotos, useUploadQueue, useGuestEventData, useWorkflow, usePackageFeatures, useStoriesViewer, usePushNotifications, …
- **Components:** workflow-runtime, wizard, dashboard, guest, wall, mosaic, invitation-editor, booth, qr-designer, ui, pwa, gamification, e3, highlight-reel, ai-chat, monetization

---

## 4. Shared-Paket

- **Typen:** types (api, errors, qr-design, invitation, invitation-design), Re-Export von User/Event/Photo/Guest/Category
- **Utils:** validation, string, date (formatDate, formatDateTime, slugify, generateRandomCode, …)
- **Constants:** zentral exportiert
- **Nutzung:** Backend und Frontend importieren `@gaestefotos/shared`

---

## 5. Weitere Pakete

- **print-terminal:** Next.js-App für Druck-Station, Route `t/[slug]`, QR-Scanner, API-Anbindung
- **booth-app:** Electron + Next, Booth-Steps, workflow-runtime
- **admin-dashboard:** separates Admin-UI-Paket

---

## 6. Skripte (Auswahl)

- **Deploy:** deploy-backend-prod, deploy-frontend-prod, deploy-admin-dashboard-prod, deploy-staging
- **DB:** setup-staging-db, backup-db-prod
- **Ops:** rollback, promote-to-prod, prelaunch-smoke, prod-smoke-admin, verify-prod, cloudflare-purge
- **Dev:** start-local-backend, start-local-frontend, start-local-services
- **Git:** git-hooks (pre-push, install-hooks)

---

## 7. Erkenntnisse für folgende Phasen

1. **API-Integrität (Phase 2):** Foto-Upload-Zyklus über TUS (`/api/uploads`) + photoRoutes; Events/Photos/Categories/Guests stark vernetzt; viele Admin-Routen.
2. **Security (Phase 3):** Globaler API-Limiter deaktiviert; CORS/CSRF und Helmet aktiv; mongoSanitize für NoSQL; Rate-Limits nur teilweise pro Route.
3. **UX/Design (Phase 4):** App Router mit vielen Event-Subrouten; Live-Wall/Camera/Mosaic; Booth- und Workflow-UI; PWA/Offline.
4. **Dokumentation (Phase 5):** Abgleich mit allen .md unter docs/ und Root.

Diese Map bildet die Basis für das weitere sequenzielle Audit (Phase 2–5).
