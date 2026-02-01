# 📸 Gästefotos - Event Foto-Sharing Plattform

**Version:** 2.0.0  
**Status:** ✅ Produktionsbereit  
**Letzte Aktualisierung:** 2026-02-01

---

## 📋 Inhaltsverzeichnis

- [Überblick](#überblick)
- [Architektur](#architektur)
- [Features](#features)
- [Technologie-Stack](#technologie-stack)
- [Projektstruktur](#projektstruktur)
- [Installation](#installation)
- [API-Dokumentation](#api-dokumentation)
- [Admin Dashboard](#admin-dashboard)
- [Deployment](#deployment)
- [Testing](#testing)

---

## Überblick

Gästefotos ist eine Enterprise-grade Event-Foto-Sharing Plattform. Die Anwendung ermöglicht Event-Organisatoren (Hosts), Fotos und Videos von Veranstaltungen zu sammeln, zu moderieren und mit Gästen zu teilen.

### Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        Gästefotos Platform                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Frontend   │  │    Admin    │  │        Backend          │  │
│  │  Next.js 16 │  │  Dashboard  │  │       Express.js        │  │
│  │  Port 3002  │  │  Port 3003  │  │       Port 8002         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┴──────────────────────┘                │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────────────────┐  │
│  │                      PostgreSQL + Prisma                   │  │
│  │                        43 Models                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────┐  ┌────────────────────────────────┐  │
│  │      SeaweedFS        │  │           Redis                │  │
│  │    (S3 Storage)       │  │    (Cache/Sessions)            │  │
│  └───────────────────────┘  └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Rollen

| Rolle | Beschreibung |
|-------|-------------|
| **Host** | Erstellt Events, verwaltet Inhalte, Gäste-Settings, Downloads |
| **Co-Host** | Verwaltet ein Event im Auftrag des Hosts |
| **Gast** | Lädt Medien hoch, sieht Galerie, kann herunterladen |
| **Admin** | Administrative Funktionen im Admin-Dashboard |
| **Superadmin** | Voller Systemzugriff, 2FA erforderlich |

### Dokumentation

| Dokument | Beschreibung |
|----------|-------------|
| `docs/INDEX.md` | Start hier |
| `docs/API_MAP.md` | Endpoints → Dateien |
| `docs/FEATURES.md` | Feature-Übersicht |
| `docs/DEPLOYMENT.md` | Deployment-Anleitung |
| `docs/DB_FIELD_MEANINGS.md` | Datenbank-Felder |

---

## ✨ Features

### Core Features

| Feature | Beschreibung |
|---------|-------------|
| 📷 **Foto-Upload** | TUS-Resumable Upload, EXIF-Extraktion, Auto-Rotation |
| 🎬 **Video-Upload** | MP4/MOV Support, Thumbnail-Generierung |
| 🔐 **Event-Schutz** | Passwort, Shortlinks, QR-Codes |
| 📊 **Statistiken** | Event-Analytics, Gäste-Aktivität, Upload-Trends |
| 🏷️ **Kategorien** | Album-Organisation, Drag & Drop Sortierung |
| 📥 **Downloads** | Einzel-Downloads, Bulk-ZIP (bis 10GB) |
| 💬 **Gästebuch** | Text, Audio, Foto-Uploads |
| 🏆 **Challenges** | Foto-Wettbewerbe mit Voting |
| 📖 **Stories** | Instagram-Style Stories |
| 🖼️ **Live Wall** | Echtzeit Foto-Projektion via WebSocket |
| 👥 **Co-Hosts** | Event-Mitverwalter mit Einladungs-Flow |
| ✉️ **Einladungen** | Dynamische Seiten, RSVP, Gästegruppen |

### QR-Code Designer

- **10+ SVG Templates** in 6 Kategorien (Minimal, Elegant, Natur, Festlich, Modern, Rustikal)
- **Formate**: A6/A5 Tischaufsteller, Story, Square
- **Export**: PNG, PDF (Druckqualität)
- **Anpassbar**: Farben, QR-Stil, Logo-Integration

### PWA / Offline

- **Service Worker**: Network-First API, Cache-First Images
- **Offline-Fallback**: `/offline` Seite
- **Installierbar**: iOS, Android, Desktop
- **Update-Banner**: Automatische Aktualisierung

### Sicherheit

| Feature | Details |
|---------|---------|
| **JWT Auth** | httpOnly Cookies, 7d Expiry |
| **2FA (TOTP)** | Für Admins verpflichtend, AES-256-GCM verschlüsselt |
| **Rate Limiting** | Per-Endpoint Limits |
| **Helmet.js** | Security Headers |
| **Zod Validation** | Input-Validierung auf allen Endpoints |
| **WordPress Auth** | Optional: Passwort-Verifikation via WP REST |

---

## 🛠️ Technologie-Stack

### Packages

| Package | Stack | Port |
|---------|-------|------|
| `@gaestefotos/backend` | Express.js, Prisma, Socket.io | 8002 |
| `@gaestefotos/frontend` | Next.js 16, React 18, TailwindCSS | 3002 |
| `@gaestefotos/admin-dashboard` | Next.js 16, React 18, TailwindCSS | 3003 |
| `@gaestefotos/shared` | TypeScript Types & Utils | - |

### Backend Stack

```
Express.js          - Web Framework
Prisma              - ORM (43 Models, 50 Migrations)
Socket.io           - Realtime WebSockets
Sharp               - Image Processing
@tus/server         - Resumable Uploads
@aws-sdk/client-s3  - S3 Storage (SeaweedFS)
pdf-lib             - PDF Generation
qrcode              - QR Code Generation
nodemailer          - Email
winston             - Logging
zod                 - Input Validation
bcryptjs            - Password Hashing
jsonwebtoken        - JWT Auth
```

### Frontend Stack

```
Next.js 16          - React Framework (App Router)
React 18            - UI Library
TailwindCSS         - Utility-First CSS
Radix UI            - Accessible Components
Framer Motion       - Animations
React Query         - Server State Management
Lucide React        - Icons
react-hook-form     - Form Handling
qr-code-styling     - QR Code Rendering
```

### Infrastruktur

| Service | Verwendung |
|---------|-----------|
| PostgreSQL 14+ | Hauptdatenbank |
| SeaweedFS | S3-kompatibler Objektspeicher |
| Redis | Cache, Rate Limiting, Sessions |
| Nginx | Reverse Proxy, SSL Termination |
| systemd | Process Management |

---

## 📁 Projektstruktur

```
gaestefotos-app-v2/
├── packages/
│   ├── backend/                 # Express.js API Server
│   │   ├── src/
│   │   │   ├── routes/          # 55 API Route Files
│   │   │   ├── services/        # Business Logic
│   │   │   ├── middleware/      # Auth, Rate Limit, Validation
│   │   │   └── index.ts         # Entry Point
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # 43 Database Models
│   │   │   └── migrations/      # 50 Migrations
│   │   └── uploads/             # Temp Upload Directory
│   │
│   ├── frontend/                # Next.js User App
│   │   ├── src/
│   │   │   ├── app/             # 30+ Routes (App Router)
│   │   │   │   ├── events/[id]/ # Event Management
│   │   │   │   ├── e3/[slug]/   # Public Event Gallery
│   │   │   │   ├── i/[slug]/    # Invitation Pages
│   │   │   │   ├── live/[slug]/ # Live Wall + Camera
│   │   │   │   └── dashboard/   # Host Dashboard
│   │   │   ├── components/      # 200+ React Components
│   │   │   └── hooks/           # Custom React Hooks
│   │   └── public/
│   │       └── qr-templates/    # 10+ SVG Templates
│   │
│   ├── admin-dashboard/         # Admin UI
│   │   └── src/app/(admin)/
│   │       ├── dashboard/       # Overview, Stats
│   │       ├── manage/          # Events, Users, QR-Templates, Packages
│   │       ├── settings/        # API Keys, Theme, WooCommerce, Maintenance
│   │       └── system/          # Health, Logs, AI-Analyse, Rate Limits
│   │
│   └── shared/                  # Shared TypeScript Types
│
├── e2e/                         # Playwright E2E Tests (12 Specs)
├── scripts/                     # Deploy & Ops Scripts (16 Files)
├── docs/                        # Documentation (23 Files)
└── photo-booth/                 # Photo Booth Konzept
```

---

## 🚀 Installation

### Voraussetzungen

- Node.js 24+ und pnpm installiert
- PostgreSQL 14+ Datenbank
- SeaweedFS (optional, für Storage)
- Git

### Schritt 1: Repository klonen

```bash
git clone <repository-url>
cd <repo-root>
```

### Schritt 2: Dependencies installieren

```bash
pnpm install
```

### Schritt 3: Datenbank einrichten

```bash
cd packages/backend
pnpm prisma migrate dev
```

### Schritt 4: Umgebungsvariablen konfigurieren

Kopiere `.env.example` zu `.env` und passe die Werte an:

```bash
cp .env.example .env
nano .env
```

---

## Ops Runbooks

- **WooCommerce Webhooks Monitoring**: `OPSRUNBOOK-webhooks.md`
- **DB Cutover (localhost -> staging/prod Postgres)**: `OPSRUNBOOK-db-cutover.md`

Quick smoke (local):

```bash
curl -sS -X POST http://localhost:8002/api/webhooks/woocommerce/order-paid \
  -H 'Content-Type: application/json' \
  --data '{}' \
  -w "\nHTTP_STATUS=%{http_code}\n"
grep -E "woocommerce_webhook_(ignored|duplicate)" /tmp/backend-local.log | tail -n 50
```

Siehe [Konfiguration](#konfiguration) für Details.

### Schritt 5: Services starten

**Backend:**
```bash
cd packages/backend
pnpm dev
```

**Frontend (neues Terminal):**
```bash
cd packages/frontend
pnpm dev
```

Die Anwendung ist jetzt verfügbar unter:
- Frontend: http://localhost:3002
- Backend API: http://localhost:8002

---

## ⚙️ Konfiguration

### Backend `.env` Datei

```env
# Server
PORT=8002
NODE_ENV=development

# Frontend URL (für CORS)
FRONTEND_URL=http://localhost:3002

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/gaestefotos_v2

# JWT
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=7d

# SeaweedFS S3 API
SEAWEEDFS_ENDPOINT=localhost:8333
SEAWEEDFS_ACCESS_KEY=admin
SEAWEEDFS_SECRET_KEY=password
SEAWEEDFS_BUCKET=gaestefotos-v2
SEAWEEDFS_SECURE=false

# SMTP (optional, für Email)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@example.com
```

### Frontend Konfiguration

Die Frontend-Konfiguration erfolgt über Umgebungsvariablen oder direkt im Code:

```env
# .env.local
# Dev/E2E only:
NEXT_PUBLIC_API_URL=http://localhost:8002
```

In Produktion werden API Calls **same-origin** gemacht (Browser: relative `'/api'`).

Siehe `EMAIL_SETUP.md` für detaillierte Email-Konfiguration.

---

## 💻 Entwicklung

### E2E Quickstart (Playwright)

Stabiler lokaler E2E-Run (startet Frontend + Backend automatisch über Playwright `webServer`):

```bash
pnpm run e2e:stable
```

Optional: Git pre-push Hook installieren (führt vor `git push` automatisch `e2e:stable` aus):

```bash
pnpm run hooks:install
```

Hook in Ausnahmefällen überspringen:

```bash
SKIP_E2E_HOOK=1 git push
```

### Backend entwickeln

```bash
cd packages/backend
pnpm dev  # Startet mit Hot Reload
```

### Frontend entwickeln

```bash
cd packages/frontend
pnpm dev  # Startet Next.js Dev Server
```

### Datenbank-Migrationen

```bash
cd packages/backend
pnpm prisma migrate dev    # Neue Migration erstellen
pnpm prisma generate       # Prisma Client generieren
pnpm prisma studio         # Database Browser öffnen
```

### Build für Produktion

```bash
# Backend
cd packages/backend
pnpm build

# Frontend
cd packages/frontend
pnpm build
```

---

## 📡 API-Dokumentation

**Base URL:** `http://localhost:8002/api` (Dev) | `/api` (Prod, same-origin)

### API Routes (55 Dateien)

| Bereich | Routes | Beschreibung |
|---------|--------|--------------|
| **Core** | `auth`, `events`, `photos`, `videos`, `uploads` | Hauptfunktionen |
| **Social** | `likes`, `comments`, `votes`, `guestbook`, `stories` | Interaktionen |
| **Organization** | `categories`, `challenges`, `guests`, `cohosts` | Event-Verwaltung |
| **Invitations** | `invitations`, `cohostInvites` | Einladungssystem |
| **Downloads** | `downloads` | ZIP-Downloads, Einzeldownloads |
| **Statistics** | `statistics` | Analytics |
| **AI** | `ai`, `faceSearch`, `duplicates` | KI-Features |
| **QR/Design** | `qrDesigns`, `qrTemplates`, `theme` | QR-Codes, Branding |
| **Admin** | `admin*` (20 Routes) | Admin-Dashboard APIs |
| **Integrations** | `woocommerceWebhooks`, `cmsPublic`, `wpConsent` | WordPress/WooCommerce |

### Admin API Routes

```
/api/admin/dashboard      - Stats & Übersicht
/api/admin/events         - Event-Management
/api/admin/users          - User-Management
/api/admin/photos         - Foto-Moderation
/api/admin/qr-templates   - QR-Template CRUD
/api/admin/theme          - Theme-Tokens
/api/admin/api-keys       - API-Key Management
/api/admin/logs           - System-Logs
/api/admin/maintenance    - Wartungsmodus
/api/admin/impersonation  - User-Impersonation
```

Vollständige API-Dokumentation: `docs/API_MAP.md`

---

## 🎛️ Admin Dashboard

Das Admin-Dashboard (`dash.gästefotos.com`) bietet vollständige Plattform-Verwaltung:

| Bereich | Funktionen |
|---------|-----------|
| **Dashboard** | Statistiken, aktive Events, System-Health |
| **Events** | Liste, Details, Moderation, Löschen |
| **Users** | Übersicht, Rollen, Impersonation |
| **QR-Templates** | CRUD, SVG-Upload, Kategorien, Premium-Flags |
| **Packages** | Paket-Definitionen verwalten |
| **Theme** | CSS-Token-Editor mit Live-Preview |
| **API Keys** | Key-Management für Integrationen |
| **WooCommerce** | Webhook-Logs, Replay, Event-Zuordnung |
| **Maintenance** | Wartungsmodus aktivieren |
| **Health** | System-Status, Service-Checks |
| **Logs** | QA-Logs, System-Logs |

---

## 🚢 Deployment

### Deploy Scripts (empfohlen)

```bash
# Frontend
bash ./scripts/deploy-frontend-prod.sh

# Admin-Dashboard  
bash ./scripts/deploy-admin-dashboard-prod.sh

# Backend
bash ./scripts/deploy-backend-prod.sh
```

### Wichtig: Build-Reihenfolge

**Niemals** `next build` während der Service läuft! Sonst: `ChunkLoadError` / 404.

```bash
# Korrekte Reihenfolge:
sudo systemctl stop gaestefotos-frontend.service
pnpm build:prod
sudo systemctl start gaestefotos-frontend.service
```

### Services

| Service | Port | systemd Unit |
|---------|------|--------------|
| Backend | 8002 | `gaestefotos-backend.service` |
| Frontend | 3002 | `gaestefotos-frontend.service` |
| Admin | 3003 | `gaestefotos-admin.service` |

---

## 🧪 Testing

### E2E Tests (Playwright)

```bash
# Alle Tests (startet Server automatisch)
pnpm run e2e:stable

# Mit UI
pnpm run e2e:ui

# Report anzeigen
pnpm run e2e:report
```

### Git Pre-Push Hook

```bash
# Installieren (führt e2e:stable vor push aus)
pnpm run hooks:install

# Überspringen
SKIP_E2E_HOOK=1 git push
```

### Test-Specs (12)

- `auth-flows.spec.ts` - Login/Logout
- `cohost-invitation.spec.ts` - Co-Host Flow
- `invitation-flow.spec.ts` - Einladungen
- `security.spec.ts` - Security Tests
- `stories.spec.ts` - Stories Feature
- `tus-resumable.spec.ts` - Upload Tests
- ...

---

## 📚 Dokumentation

| Dokument | Beschreibung |
|----------|-------------|
| `BEDIENUNGSANLEITUNG.md` | Endbenutzer-Anleitung |
| `CHANGELOG.md` | Versionshistorie |
| `docs/INDEX.md` | Dokumentations-Index |
| `docs/FEATURES.md` | Feature-Übersicht |
| `docs/API_MAP.md` | API-Endpoints |
| `docs/DEPLOYMENT.md` | Deploy-Anleitung |
| `docs/DB_FIELD_MEANINGS.md` | Datenbank-Felder |

---

## � Troubleshooting

| Problem | Lösung |
|---------|--------|
| Backend startet nicht | `.env` prüfen, DB-Verbindung, Port 8002 |
| Frontend startet nicht | Port 3002, Logs in `/tmp/frontend.log` |
| ChunkLoadError | Service stoppen → Build → Service starten |
| Sharp Fehler | `pnpm remove sharp && pnpm add sharp@latest` |
| DB Fehler | `pnpm prisma migrate dev` |

---

**Version 2.0.0** | **Status:** ✅ Produktionsbereit | **Stand:** 2026-02-01
