# 📸 Gästefotos V2 - Event Foto-Sharing Plattform

**Version:** 2.0.0  
**Status:** ✅ Produktionsbereit  
**Letzte Aktualisierung:** 2025-12-06

---

## 📋 Inhaltsverzeichnis

- [Überblick](#überblick)
- [Features](#features)
- [Technologie-Stack](#technologie-stack)
- [Projektstruktur](#projektstruktur)
- [Installation](#installation)
- [Konfiguration](#konfiguration)
- [Entwicklung](#entwicklung)
- [API-Dokumentation](#api-dokumentation)
- [Deployment](#deployment)
- [Ops Runbooks](#ops-runbooks)
- [Troubleshooting](#troubleshooting)

## 📚 Kurze Doku-Links (empfohlen)

- `docs/FEATURES.md`
- `docs/TEST_GUIDE.md`
- `docs/DEPLOYMENT.md`

---

## 🎯 Überblick

Gästefotos V2 ist eine moderne, vollständig funktionsfähige Web-Anwendung für Event-Foto-Sharing. Die Plattform ermöglicht es Event-Organisatoren, Fotos von ihren Veranstaltungen zu sammeln, zu moderieren und mit Gästen zu teilen.

### Hauptfunktionen

- 📷 **Foto-Upload & -Verwaltung**: Gäste können Fotos hochladen, Organisatoren können sie moderieren
- 🔐 **Passwort-Schutz**: Events können mit Passwörtern geschützt werden
- 📊 **Statistiken & Analytics**: Detaillierte Statistiken zu Events, Fotos und Gästen
- 📧 **Email-Integration**: Automatische Einladungen und Benachrichtigungen
- 🏷️ **Kategorien-System**: Fotos können in Kategorien organisiert werden
- 📥 **Download-Funktionalität**: Einzelne Fotos oder ZIP-Archive herunterladen
- 🔗 **Social Sharing**: Fotos auf Facebook, WhatsApp teilen oder Link kopieren
- 📱 **PWA-Unterstützung**: Progressive Web App für mobile Geräte

---

## ✨ Features

### Für Event-Organisatoren

- ✅ Event-Erstellung und -Verwaltung
- ✅ Passwort-Schutz für Events
- ✅ Foto-Moderation (Approve/Reject)
- ✅ Bulk-Operationen (Mehrfach-Auswahl)
- ✅ Gästelisten-Verwaltung
- ✅ Kategorien-Management
- ✅ Statistiken-Dashboard
- ✅ Email-Einladungen versenden
- ✅ Bulk-Einladungen
- ✅ Download-Funktionalität (ZIP)

### Für Gäste

- ✅ Foto-Upload
- ✅ Event-Galerie ansehen
- ✅ Fotos herunterladen
- ✅ Social Sharing (Facebook, WhatsApp)
- ✅ Live Wall (Echtzeit-Updates)
- ✅ Digital Invitation

### Technische Features

- ✅ RESTful API
- ✅ WebSocket für Echtzeit-Updates
- ✅ JWT Authentication
- ✅ Image Processing (Sharp)
- ✅ S3-kompatible Storage (SeaweedFS)
- ✅ PostgreSQL Database
- ✅ PWA mit Service Worker
- ✅ Responsive Design

---

## 🛠️ Technologie-Stack

### Backend

- **Runtime**: Node.js 24+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL mit Prisma ORM
- **Storage**: SeaweedFS (S3-kompatibel)
- **Image Processing**: Sharp
- **Email**: Nodemailer
- **WebSocket**: Socket.io
- **Authentication**: JWT

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules / Tailwind CSS
- **UI Components**: React
- **Charts**: Recharts
- **PWA**: Service Worker, Manifest

### DevOps

- **Package Manager**: pnpm (Workspace)
- **Build Tool**: TypeScript Compiler
- **Process Manager**: systemd / PM2

---

## 📁 Projektstruktur

```
gaestefotos-app-v2/
├── packages/
│   ├── backend/              # Backend API Server
│   │   ├── src/
│   │   │   ├── routes/       # API Routes
│   │   │   │   ├── auth.ts
│   │   │   │   ├── events.ts
│   │   │   │   ├── photos.ts
│   │   │   │   ├── guests.ts
│   │   │   │   ├── categories.ts
│   │   │   │   ├── statistics.ts
│   │   │   │   └── email.ts
│   │   │   ├── services/     # Business Logic
│   │   │   │   ├── email.ts
│   │   │   │   ├── storage.ts
│   │   │   │   └── imageProcessor.ts
│   │   │   ├── middleware/    # Middleware
│   │   │   │   └── auth.ts
│   │   │   ├── config/       # Configuration
│   │   │   │   └── database.ts
│   │   │   └── index.ts      # Entry Point
│   │   ├── prisma/           # Database Schema
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   ├── frontend/             # Next.js Frontend
│   │   ├── src/
│   │   │   └── app/          # Next.js App Router
│   │   │       ├── (auth)/  # Auth Pages
│   │   │       ├── dashboard/
│   │   │       ├── events/
│   │   │       ├── e/        # Public Event Pages
│   │   │       └── live/     # Live Wall
│   │   ├── public/           # Static Assets
│   │   └── package.json
│   │
│   └── shared/               # Shared Utilities
│       ├── src/
│       │   ├── utils/        # Utility Functions
│       │   ├── types/       # TypeScript Types
│       │   └── constants/   # Constants
│       └── package.json
│
├── pnpm-workspace.yaml       # pnpm Workspace Config
├── package.json              # Root Package
└── README.md                 # Diese Datei
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
cd gaestefotos-app-v2
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
curl -sS -X POST http://localhost:8002/api/woocommerce-webhooks/order-paid -H 'Content-Type: application/json' --data '{}' -w "\nHTTP_STATUS=%{http_code}\n"
grep -E "woocommerce_webhook_(ignored|duplicate)" /tmp/backend-appv2.log | tail -n 50
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
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001

---

## ⚙️ Konfiguration

### Backend `.env` Datei

```env
# Server
PORT=8001
NODE_ENV=development

# Frontend URL (für CORS)
FRONTEND_URL=http://localhost:3000

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
NEXT_PUBLIC_API_URL=http://localhost:8001
```

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

### Base URL

```
http://localhost:8001/api
```

### Authentifizierung

Die meisten Endpoints benötigen einen JWT-Token im Authorization Header:

```
Authorization: Bearer <token>
```

### Haupt-Endpoints

#### Authentication

- `POST /api/auth/register` - Benutzer registrieren
- `POST /api/auth/login` - Einloggen
- `GET /api/auth/me` - Aktueller Benutzer

#### Events

- `GET /api/events` - Alle Events abrufen
- `POST /api/events` - Event erstellen
- `GET /api/events/:id` - Event abrufen
- `PUT /api/events/:id` - Event aktualisieren
- `DELETE /api/events/:id` - Event löschen
- `POST /api/events/:id/verify-password` - Passwort verifizieren

#### Photos

- `GET /api/events/:eventId/photos` - Fotos abrufen
- `POST /api/events/:eventId/photos/upload` - Foto hochladen
- `POST /api/photos/:photoId/approve` - Foto genehmigen
- `POST /api/photos/:photoId/reject` - Foto ablehnen
- `DELETE /api/photos/:photoId` - Foto löschen
- `GET /api/photos/:photoId/download` - Foto herunterladen
- `GET /api/events/:eventId/download-zip` - ZIP herunterladen

#### Guests

- `GET /api/events/:eventId/guests` - Gäste abrufen
- `POST /api/events/:eventId/guests` - Gast hinzufügen
- `PUT /api/events/:eventId/guests/:guestId` - Gast aktualisieren
- `DELETE /api/events/:eventId/guests/:guestId` - Gast löschen

#### Categories

- `GET /api/events/:eventId/categories` - Kategorien abrufen
- `POST /api/events/:eventId/categories` - Kategorie erstellen
- `PUT /api/events/:eventId/categories/:categoryId` - Kategorie aktualisieren
- `DELETE /api/events/:eventId/categories/:categoryId` - Kategorie löschen
- `PUT /api/photos/:photoId/category` - Foto Kategorie zuweisen

#### Statistics

- `GET /api/events/:eventId/statistics` - Event-Statistiken
- `GET /api/statistics` - Benutzer-Statistiken

#### Email

- `POST /api/email/test` - Test-Email senden
- `POST /api/events/:eventId/invite` - Einladung senden

Vollständige API-Dokumentation: Siehe `/api` Endpoint für interaktive Dokumentation.

---

## 🚢 Deployment

### Produktions-Build

```bash
# Backend
cd packages/backend
pnpm build
pnpm start

# Frontend
cd packages/frontend
pnpm build
pnpm start
```

### Mit PM2

```bash
# Backend
pm2 start packages/backend/dist/index.js --name gaestefotos-backend

# Frontend
pm2 start packages/frontend/.next/standalone/server.js --name gaestefotos-frontend
```

### Mit systemd

Siehe `RESTART_SERVICES.sh` für systemd Service-Konfiguration.

### Docker (optional)

```dockerfile
# Dockerfile Beispiel
FROM node:24-alpine
WORKDIR /app
COPY . .
RUN pnpm install && pnpm build
EXPOSE 8001 3000
CMD ["pnpm", "start"]
```

---

## 🔧 Troubleshooting

### Backend startet nicht

1. Prüfe `.env` Datei
2. Prüfe Datenbank-Verbindung
3. Prüfe Port 8001 (nicht belegt)
4. Prüfe Logs: `/tmp/backend.log`

### Frontend startet nicht

1. Prüfe Port 3000 (nicht belegt)
2. Prüfe `NEXT_PUBLIC_API_URL`
3. Prüfe Logs: `/tmp/frontend.log`

### Sharp Image Processing Fehler

```bash
cd packages/backend
pnpm remove sharp
pnpm add sharp@latest
```

### Datenbank-Fehler

```bash
cd packages/backend
pnpm prisma migrate reset  # ACHTUNG: Löscht alle Daten!
pnpm prisma migrate dev
```

### Weitere Hilfe

- Siehe `PROBLEME_GELOEST.md` für bekannte Probleme
- Siehe `EMAIL_SETUP.md` für Email-Konfiguration
- Prüfe Logs in `/tmp/`

---

## 📚 Weitere Dokumentation

- [Bedienungsanleitung](BEDIENUNGSANLEITUNG.md) - Für Endbenutzer
- [Email Setup](EMAIL_SETUP.md) - Email-Konfiguration
- [Test Report](TEST_REPORT_*.md) - Test-Ergebnisse
- [Probleme gelöst](PROBLEME_GELOEST.md) - Bekannte Probleme & Lösungen

---

## 📝 Lizenz

[Lizenz hier einfügen]

---

## 👥 Kontakt & Support

[Kontaktinformationen hier einfügen]

---

**Version 2.0.0** - Vollständig funktionsfähig und produktionsbereit! 🎉
