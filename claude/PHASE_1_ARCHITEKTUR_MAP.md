# 🏗️ PHASE 1: Architektur-Map - Gaestefotos App

**Analysiert von:** Sonnet 4.5  
**Datum:** 16. Februar 2026  
**Status:** ✅ Abgeschlossen

---

## 📊 Projekt-Übersicht

### Grundlegende Informationen
- **Projekt-Name:** Gaestefotos App v2.0.0
- **Architektur:** Monorepo (pnpm Workspaces)
- **Haupt-Sprache:** TypeScript
- **Node Version:** >= 18.0.0
- **Package Manager:** pnpm >= 8.0.0

### Repository-Struktur
```
gaestefotos-app/
├── packages/                    # 6 Haupt-Packages
│   ├── backend/                # Node.js/Express API (3.0 MB)
│   ├── frontend/               # Next.js 16 App (4.1 MB)
│   ├── admin-dashboard/        # Next.js Admin Panel (1.0 MB)
│   ├── booth-app/              # Electron Fotobooth (136 KB)
│   ├── print-terminal/         # Print Service (96 KB)
│   └── shared/                 # Gemeinsame Types (96 KB)
├── docs/                       # Dokumentation
├── e2e/                        # E2E Tests (Playwright)
├── scripts/                    # Build/Deploy Scripts
├── tools/                      # Dev Tools
│   └── devtools-browser/       # Browser-basierte DevTools
└── photo-booth/                # Legacy Photo Booth
```

---

## 🎯 Package-Analyse

### 1. Backend (`@gaestefotos/backend`) - 3.0 MB

#### Tech-Stack
- **Runtime:** Node.js + Express.js
- **Datenbank:** PostgreSQL (via Prisma ORM)
- **Cache:** Redis (ioredis)
- **File Storage:** AWS S3 + TUS (resumable uploads)
- **Realtime:** Socket.io
- **Security:** Helmet, bcryptjs, JWT, express-rate-limit
- **Monitoring:** Sentry (Node + Profiling)

#### Kernfunktionen
- **Image Processing:** Sharp, Canvas, EXIF-Stripping
- **AI/ML:** TensorFlow.js, Face Recognition (@vladmandic/face-api), Groq SDK
- **Video:** FFmpeg (fluent-ffmpeg)
- **PDF:** PDFKit, pdf-lib
- **Email:** Nodemailer
- **Push:** web-push
- **Validation:** Zod
- **Logging:** Winston

#### Datenbankschema (Prisma)
- **77 Models** (!!)
- **2219 Zeilen** Schema
- **Hauptmodels:**
  - User, Event, Photo, Video
  - Guest, Category, Challenge
  - FaceSearch, MosaicWall
  - Invoice, Payment, Credits
  - Partner, Hardware, Booth
  - AI-Provider, AI-Cache

#### Services (45 Services gefunden)
```
achievementTracker.ts       - Gamification-Achievements
aiExecution.ts              - AI-Task-Orchestrierung
aiStyleEffects.ts           - KI-Bildstile
bgRemoval.ts                - Hintergrundentfernung
boothGames.ts               - Fotobooth-Spiele
cache.ts / cache/           - Redis-Caching
challengeTemplates.ts       - Challenge-Vorlagen
demoMosaicRetention.ts      - Demo-Daten-Bereinigung
duplicateDetection.ts       - Duplikat-Erkennung
email.ts                    - E-Mail-Versand
eventPolicy.ts              - Event-Richtlinien
eventRecap.ts               - Event-Zusammenfassungen
exifStrip.ts                - EXIF-Metadaten entfernen
faceRecognition.ts          - Gesichtserkennung
faceSearch.ts               - Gesichtssuche
faceSearchConsentRetention.ts - DSGVO-Compliance
faceSwitch.ts               - Face-Swap-Funktion
featureGate.ts              - Feature-Flags
guestbookPdf.ts             - Gästebuch als PDF
highlightReel.ts            - Highlight-Videos
imageProcessor.ts           - Bildverarbeitung
logoOverlay.ts              - Logo-Overlay
mosaicEngine.ts             - Mosaik-Generator
orphanCleanup.ts            - Aufräumen verwaister Daten
packageLimits.ts            - Package-Limitierung
photoCategories.ts          - Foto-Kategorisierung
pushNotification.ts         - Push-Benachrichtigungen
qaLogRetention.ts           - QA-Log-Aufbewahrung
retentionPurge.ts           - Daten-Bereinigung
smartAlbum.ts               - KI-basierte Alben
smsService.ts               - SMS-Versand
storage.ts                  - S3-Storage
storagePolicy.ts            - Storage-Richtlinien
storageReminder.ts          - Storage-Erinnerungen
styleTransfer.ts            - Style-Transfer (KI)
uploadDatePolicy.ts         - Upload-Datum-Policies
videoProcessor.ts           - Video-Verarbeitung
videoService.ts             - Video-Service
virusScan.ts                - Virus-Scanning
wooLogRetention.ts          - WooCommerce-Log-Retention
```

#### API-Routes (53+ Route-Dateien)
```
ADMIN-ROUTES:
- adminAiAnalysis.ts        - AI-Analyse-Dashboard
- adminAiProviders.ts       - AI-Provider-Verwaltung
- adminApiKeys.ts           - API-Key-Management
- adminCmsSync.ts           - WordPress CMS Sync
- adminCredits.ts           - Credit-System
- adminDashboard.ts         - Admin-Dashboard
- adminEmailTemplates.ts    - E-Mail-Templates
- adminEvents.ts            - Event-Management
- adminFeatureFlags.ts      - Feature-Flags
- adminInvitationTemplates.ts
- adminInvoices.ts          - Rechnungsverwaltung
- adminLogs.ts              - Log-Viewer
- adminMaintenance.ts       - Wartungs-Modus
- adminOps.ts               - Operations
- adminPhotos.ts            - Foto-Moderation
- adminQrTemplates.ts       - QR-Code-Templates
- adminSettings.ts          - System-Einstellungen
- adminUsers.ts             - User-Management
- adminWooWebhooks.ts       - WooCommerce-Webhooks

PUBLIC/USER-ROUTES:
- auth.ts                   - Login/Register/2FA
- analytics.ts              - Event-Analytics
- assets.ts                 - Asset-Management
- boothGames.ts             - Booth-Game-Logik
- boothTemplates.ts         - Booth-Templates
- categories.ts             - Foto-Kategorien
- challenges.ts             - Challenge-System
- cohostInvites.ts          - Co-Host-Einladungen
- cohosts.ts                - Co-Host-Management
- comments.ts               - Kommentare
- downloads.ts              - Download-Logik
- duplicates.ts             - Duplikat-Handling
- email.ts                  - E-Mail-API
- events.ts                 - Event-CRUD
- faceSearch.ts             - Gesichtssuche-API
- galleryEmbed.ts           - Galerie-Embed
- guests.ts                 - Gästeliste
- guestbook.ts              - Gästebuch
- hardware.ts               - Hardware-API
- hashtagImport.ts          - Instagram-Hashtag-Import
- health.ts                 - Health-Checks
- highlightReels.ts         - Highlight-Reel-API
- likes.ts                  - Like-System
- maintenance.ts            - Wartungs-Status
- mosaic.ts                 - Mosaik-API
- packageDefinitions.ts     - Package-Definitionen
- photos.ts                 - Foto-Upload/CRUD
- push.ts                   - Push-Notifications
- qrTemplates.ts            - QR-Code-Generierung
- slideshow.ts              - Slideshow-Logik
- smsShare.ts               - SMS-Sharing
- spinner.ts                - Glücksrad
- styleTransfer.ts          - Style-Transfer-API
- theme.ts                  - Theme-API
- videos.ts                 - Video-Upload/CRUD
- votes.ts                  - Voting-System
- woocommerceWebhooks.ts    - WooCommerce-Integration
```

#### Middleware
- Authentifizierung (JWT)
- Rate-Limiting
- Helmet (Security Headers)
- CORS
- Mongo-Sanitize
- Error-Handling

#### Skripte
```
test-blend.ts               - Blend-Modus-Tests
update-overlay-and-rerender.ts
rerender-mosaic-tiles.ts    - Mosaik-Regenerierung
```

---

### 2. Frontend (`@gaestefotos/frontend`) - 4.1 MB

#### Tech-Stack
- **Framework:** Next.js 16.1.2 (App Router)
- **React:** 18.2.0
- **UI Framework:** Radix UI + Tailwind CSS
- **State:** Zustand + TanStack Query
- **Forms:** React Hook Form + Zod
- **Animation:** Framer Motion
- **i18n:** next-intl
- **Monitoring:** Sentry Next.js
- **Testing:** Vitest + Playwright

#### UI-Komponenten
- Radix UI Primitives (Accessible)
- Custom Components (22+ Hauptkomponenten)
- Tailwind CSS + CVA (Class Variance Authority)
- Lucide React Icons

#### Features
- **Foto-Upload:** React Dropzone + TUS (Resumable)
- **Bildbearbeitung:** React Image Crop, Konva/React-Konva
- **QR-Codes:** qr-code-styling, qrcode.react
- **Charts:** Recharts
- **Maps:** Leaflet + React-Leaflet
- **Realtime:** Socket.io Client
- **Konfetti:** canvas-confetti
- **Swipe:** react-swipeable
- **Infinite Scroll:** react-intersection-observer

#### App-Struktur (Next.js App Router)
```
app/
├── (admin)/                # Admin-Bereich (Route Group)
│   └── dashboard/
├── admin/                  # Admin-Login
├── api/                    # API Routes
│   └── wp-consent/
├── dashboard/              # User-Dashboard
├── events/
│   ├── [id]/              # Dynamic Event-Seite
│   └── new/               # Event erstellen
├── e3/                     # Event v3?
│   └── [slug]/
├── live/                   # Live-Galerie
│   └── [slug]/
├── login/                  # Auth
├── register/
├── forgot-password/
├── reset-password/
├── moderation/             # Foto-Moderation
├── partner/                # Partner-Bereich
├── create-event/           # Event-Erstellung
├── agb/                    # AGB
├── datenschutz/            # Datenschutz
├── impressum/              # Impressum
├── faq/                    # FAQ
├── version/                # Version-Info
└── offline/                # Offline-Modus
```

#### Komponenten-Kategorien
```
components/
├── ActionButton.tsx
├── ai-chat/                - AI-Chat-Integration
├── AlbumNavigation.tsx
├── AppLayout.tsx
├── booth/                  - Booth-Komponenten
├── BottomNavigation.tsx
├── dashboard/              - Dashboard-Komponenten
├── e3/                     - Event v3 Komponenten
├── gamification/           - Gamification-UI
├── guest/                  - Gast-Komponenten
├── guest-groups/           - Gruppen-Management
├── highlight-reel/         - Highlight-Reel-UI
├── host-dashboard/         - Host-Dashboard
├── icons/                  - Custom Icons
└── ... (weitere)
```

---

### 3. Admin Dashboard (`@gaestefotos/admin-dashboard`) - 1.0 MB

#### Tech-Stack
- **Framework:** Next.js 16.1.2
- **Flow-Diagramme:** @xyflow/react (für Workflows?)
- **UI:** Radix UI + Tailwind
- **State:** Zustand + TanStack Query
- **Charts:** Recharts
- **Toast:** react-hot-toast
- **Port:** 3001

#### Features
- Admin-Dashboard für Super-Admins
- Workflow-Visualisierung (XY-Flow)
- System-Monitoring
- User-Management
- Event-Oversight

---

### 4. Booth App (`@gaestefotos/booth-app`) - 136 KB

#### Tech-Stack
- **Framework:** Electron 29 + Next.js 14.2
- **UI:** Tailwind + Framer Motion
- **Port:** 3002

#### Build-Targets
- Linux (AppImage, deb)
- Windows (nsis)
- macOS (dmg)

#### Purpose
Standalone Fotobooth-Anwendung für Events (Workflow-basiert)

---

### 5. Print Terminal (`@gaestefotos/print-terminal`) - 96 KB

Minimales Package für Print-Services (Details begrenzt ohne Code-Analyse)

---

### 6. Shared (`@gaestefotos/shared`) - 96 KB

Gemeinsame TypeScript-Types und Utilities für alle Packages.

---

## 🔧 Build & Deploy

### Scripts (Root-Level)
```bash
pnpm dev              # Frontend + Backend parallel
pnpm dev:frontend     # Nur Frontend
pnpm dev:backend      # Nur Backend
pnpm build            # Shared → Frontend → Backend
pnpm e2e              # Playwright E2E Tests
```

### Deployment-Scripts
```
start-local-backend.sh    - Backend lokal starten
start-local-frontend.sh   - Frontend lokal starten
start-local-services.sh   - Alle Services
CLOUDFLARE_API_PURGE.sh   - CDN-Cache leeren
```

### Nginx-Konfiguration
- `nginx.conf.production` vorhanden
- Reverse Proxy für Backend/Frontend

---

## 📦 Hauptabhängigkeiten

### Backend (kritisch)
```
@prisma/client: 5.7.0         - ORM
express: 4.18.2               - Web-Framework
@aws-sdk/client-s3: 3.490.0   - File Storage
socket.io: 4.6.0              - Realtime
ioredis: 5.7.0                - Redis Client
sharp: 0.34.5                 - Image Processing
@tensorflow/tfjs: 4.22.0      - ML
jsonwebtoken: 9.0.2           - Auth
winston: 3.17.0               - Logging
@sentry/node: 10.0.0          - Monitoring
```

### Frontend (kritisch)
```
next: 16.1.2                  - Framework
react: 18.2.0                 - UI Library
@tanstack/react-query: 5.12.2 - Data Fetching
zustand: 4.4.7                - State Management
tailwindcss: 3.3.6            - Styling
@sentry/nextjs: 10.32.1       - Monitoring
socket.io-client: 4.6.0       - Realtime
```

---

## 🗄️ Datenbankschema-Übersicht (77 Models)

### Kernmodels
```
User                      - Benutzer (Hosts, Admins, Partner)
Event                     - Events/Hochzeiten
EventMember              - Co-Hosts
Guest                     - Gäste
Photo                     - Fotos
Video                     - Videos
Category                  - Foto-Kategorien
```

### Engagement
```
PhotoLike                - Likes
PhotoComment             - Kommentare
PhotoVote                - Voting
Challenge                - Challenges
ChallengeCompletion      - Challenge-Teilnahmen
ChallengeRating          - Bewertungen
Story                    - Stories
GuestbookEntry           - Gästebuch-Einträge
GuestbookPhotoUpload     - Gästebuch-Fotos
GuestbookAudioUpload     - Gästebuch-Audio
```

### AI/ML
```
AiProvider               - AI-Anbieter (OpenAI, etc.)
AiUsageLog               - AI-Nutzung
AiFeatureMapping         - Feature → Provider
AiResponseCache          - AI-Cache
FaceSearchConsent        - DSGVO-Consent
FaceSearchConsentAuditLog - Audit-Trail
```

### Mosaik
```
MosaicWall               - Mosaik-Wand
MosaicTile               - Mosaik-Kacheln
MosaicPrintJob           - Print-Jobs
```

### Billing & Credits
```
PackageDefinition        - Pakete (Starter, Pro, etc.)
EventEntitlement         - Event-Berechtigungen
InvoiceRecord            - Rechnungen
CreditBalance            - Credit-Guthaben
CreditTransaction        - Credit-Transaktionen
PaymentSession           - Zahlungs-Sessions
BillingPeriod            - Abrechnungszeiträume
BillingLineItem          - Rechnungspositionen
```

### Partner-System
```
Partner                  - Partner/Reseller
PartnerMember            - Partner-Team
PartnerSubscription      - Abonnements
PartnerHardware          - Hardware-Zuordnung
PartnerDeviceLicense     - Device-Lizenzen
```

### Hardware/Booth
```
HardwareInventory        - Hardware-Bestand
HardwareBooking          - Hardware-Buchungen
BoothWorkflow            - Booth-Workflows
BoothTemplate            - Booth-Templates
DrawbotJob               - Zeichenroboter-Jobs
SpinnerSession           - Glücksrad-Sessions
VideoJob                 - Video-Rendering-Jobs
```

### Design-System
```
QrDesign                 - QR-Code-Designs
qr_templates             - QR-Templates
design_projects          - Design-Projekte
design_templates         - Design-Templates
InvitationTemplate       - Einladungs-Templates
GraffitiLayer            - Graffiti-Layer
```

### Admin & Compliance
```
AppSetting               - System-Einstellungen
ApiKey                   - API-Keys
ApiKeyAuditLog           - API-Key-Audit
ImpersonationAuditLog    - Impersonation-Log
EmailTemplate            - E-Mail-Templates
QaLogEvent               - QA-Logs
WooWebhookReceipt        - WooCommerce-Webhooks
WooWebhookEventLog       - Webhook-Logs
CmsContentSnapshot       - CMS-Snapshots
```

### Gamification
```
Achievement              - Achievements
UserAchievement          - User-Achievements
Leaderboard              - Ranglisten
```

### Kommunikation
```
Invitation               - Einladungen
InvitationRsvp           - Zusagen
InvitationShortLink      - Kurz-URLs
InvitationVisit          - Tracking
PushSubscription         - Push-Abos
SmsMessage               - SMS-Verlauf
EmailShareLog            - E-Mail-Share-Log
```

### Sonstiges
```
Lead                     - Leads/Anfragen
Asset                    - Assets
EventTrafficStat         - Traffic-Statistiken
EventReminderLog         - Erinnerungs-Log
WorkflowBackup           - Workflow-Backups
PrintServiceSettings     - Print-Einstellungen
```

---

## 🔍 Erste Erkenntnisse

### ✅ Stärken
1. **Moderne Tech-Stack:** Next.js 16, TypeScript, Prisma
2. **Skalierbare Architektur:** Monorepo, Microservices-ähnlich
3. **Umfangreiche Features:** 77 DB-Models, 45+ Services
4. **Security-Fokus:** Helmet, Rate-Limiting, JWT, 2FA
5. **Monitoring:** Sentry Integration
6. **AI-Integration:** TensorFlow, Face Recognition, Groq
7. **Realtime:** Socket.io für Live-Updates
8. **Resumable Uploads:** TUS-Protokoll
9. **Accessibility:** Radix UI Primitives
10. **i18n:** Mehrsprachigkeit (next-intl)

### 🚩 Potenzielle Probleme-Bereiche

#### 1. **Komplexität**
- 77 Datenbank-Models → sehr hohe Komplexität
- 45+ Services → schwer zu warten
- 53+ API-Routes → große Angriffsfläche

#### 2. **Code-Größe**
- Frontend: 401 TS/TSX-Dateien
- Backend: 144 TS-Dateien
- Gefahr von ungenutztem/redundantem Code

#### 3. **Dependencies**
- Sehr viele Dependencies (80+ Backend, 90+ Frontend)
- Risiko: Veraltete Packages, Security-Vulnerabilities

#### 4. **Datenbankschema**
- 2219 Zeilen → extrem umfangreich
- Potenziell Performance-Probleme bei Joins
- Migrations-Historie (50 Migrations)

#### 5. **Legacy-Code**
- `photo-booth/` Ordner → vermutlich alte Version
- Mehrere Booth-Implementierungen (booth-app, photo-booth)

#### 6. **Dokumentation**
- Docs-Ordner vorhanden, aber keine Analyse (noch)

---

## 🎯 Nächste Schritte (Phase 2)

In Phase 2 (Sonnet 4.5 - Logik-Audit) wird analysiert:

1. **Foto-Upload-Zyklus:** End-to-End-Flow inkl. TUS, Processing, Storage
2. **Event-Lifecycle:** Erstellung → Nutzung → Archivierung → Purge
3. **AI-Pipeline:** AI-Provider → Execution → Caching
4. **Payment-Flow:** WooCommerce → Credits → Entitlements
5. **Face-Search:** Consent → Recognition → Search → DSGVO-Compliance
6. **Mosaik-Engine:** Tile-Generation → Rendering → Printing
7. **Race Conditions:** Concurrent Uploads, Multiple Admins
8. **N+1 Queries:** Prisma-Query-Optimierung

---

## 📊 Statistiken

| Metrik | Wert |
|--------|------|
| **Packages** | 6 |
| **Gesamt-Codebase** | ~8.5 MB (ohne node_modules) |
| **Backend TS-Dateien** | 144 |
| **Frontend TS/TSX-Dateien** | 401 |
| **Datenbank-Models** | 77 |
| **API-Routes** | 53+ |
| **Services** | 45+ |
| **Komponenten** | 22+ (Hauptkomponenten) |
| **Schema-Zeilen** | 2219 |
| **Migrations** | 50+ |
| **Dependencies (Backend)** | ~80 |
| **Dependencies (Frontend)** | ~90 |

---

## 🔗 Systemintegration

### Externe Services
- **AWS S3:** File Storage
- **Redis:** Caching + Sessions
- **PostgreSQL:** Hauptdatenbank
- **WooCommerce:** Billing-Integration (WordPress)
- **Sentry:** Error-Tracking
- **Cloudflare:** CDN + Cache Purging
- **AI-Provider:** OpenAI/Groq (vermutlich)
- **SMS-Provider:** (zu identifizieren)
- **E-Mail:** SMTP via Nodemailer
- **Push:** Web-Push-API

### Ports (Entwicklung)
- Frontend: 3000 (default Next.js)
- Admin-Dashboard: 3001
- Booth-App: 3002
- Backend: 8011 (vermutlich, aus E2E-Config)

---

**Ende Phase 1 - Architektur-Mapping**

➡️ **Nächste Phase:** Phase 2 - Logik-Audit & Feature-Ideen (Sonnet 4.5)
