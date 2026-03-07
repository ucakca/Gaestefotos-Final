# Developer Guide — gästefotos.com

**Erstellt:** 2026-03-06  
**Zielgruppe:** Entwickler, die die App neu übernehmen oder erweitern  
**Status:** Aktuell (entspricht Produktionsstand März 2026)

---

## Inhaltsverzeichnis

1. [Projekt-Übersicht](#1-projekt-übersicht)
2. [Tech Stack](#2-tech-stack)
3. [Repository-Struktur](#3-repository-struktur)
4. [Lokale Entwicklungsumgebung](#4-lokale-entwicklungsumgebung)
5. [Backend-Architektur](#5-backend-architektur)
6. [Frontend-Architektur](#6-frontend-architektur)
7. [Datenbank (Prisma + PostgreSQL)](#7-datenbank-prisma--postgresql)
8. [Storage (SeaweedFS)](#8-storage-seaweedfs)
9. [Cache & Queues (Redis + BullMQ)](#9-cache--queues-redis--bullmq)
10. [Authentifizierung & Autorisierung](#10-authentifizierung--autorisierung)
11. [Upload-Pipeline (TUS)](#11-upload-pipeline-tus)
12. [AI-System](#12-ai-system)
13. [WebSocket & Echtzeit](#13-websocket--echtzeit)
14. [Background-Worker](#14-background-worker)
15. [Testing](#15-testing)
16. [Deployment](#16-deployment)
17. [Environment-Variablen Referenz](#17-environment-variablen-referenz)
18. [Häufige Probleme & Debugging](#18-häufige-probleme--debugging)

---

## 1. Projekt-Übersicht

**gästefotos.com** ist eine Event-Foto-Plattform (SaaS + Hardware). Gäste scannen einen QR-Code am Event, landen in der Web-App, laden Fotos/Videos hoch und können KI-Effekte anwenden.

### Produkttypen
- **SaaS (B2C):** Hosts buchen Pakete (Free/Basic/Smart/Premium) auf gästefotos.com (WooCommerce)
- **Hardware (B2B):** Photo Booth, Mirror Booth, KI Booth, Mosaic Wall, Drawbot, 360° Spinner
- **Partner-Modell:** Fotografen/Eventfirmen arbeiten als weiße-Label-Partner

### URLs (Produktion)
| URL | Zweck |
|-----|-------|
| `app.gästefotos.com` | Gäste-App (Event-Galerie, Upload, AI) |
| `dash.gästefotos.com` | Admin-Dashboard (separates Package) |
| `api.gästefotos.com` → Port 8001 | Backend API |
| `gästefotos.com` | WordPress/WooCommerce Marketing-Site |

---

## 2. Tech Stack

### Backend (`packages/backend/`)
| Komponente | Version | Zweck |
|-----------|---------|-------|
| Node.js | ≥18.0.0 | Runtime |
| TypeScript | 5.3.x | Typsicherheit |
| Express.js | 4.18.x | HTTP-Server |
| Prisma | 5.7.x | ORM + Migrations |
| PostgreSQL | 15+ | Primäre Datenbank |
| Socket.IO | 4.6.x | WebSocket / Echtzeit |
| Redis | 4.6.x (ioredis 5.7) | Cache + Queue-Broker |
| BullMQ | 5.x | Job-Queues |
| @tus/server + @tus/file-store | 2.x | Resumable Uploads |
| sharp | 0.34.x | Bildverarbeitung |
| Winston | 3.17.x | Structured Logging |
| Helmet | 7.2.x | Security Headers |
| Vitest | 1.6.x | Unit-Tests |
| Sentry | 10.x | Error-Tracking |

### Frontend (`packages/frontend/`)
| Komponente | Version | Zweck |
|-----------|---------|-------|
| Next.js | 16.x (App Router) | React-Framework |
| React | 18.2.x | UI |
| TypeScript | 5.3.x | Typsicherheit |
| Tailwind CSS | 3.3.x | Styling |
| Radix UI | diverse | Headless Components |
| TanStack Query | 5.12.x | Server State / Caching |
| Zustand | 4.4.x | Client State |
| Socket.IO Client | 4.6.x | Echtzeit-Updates |
| tus-js-client | 4.3.x | Resumable Uploads |
| Framer Motion | 10.x | Animationen |
| next-intl | 3.26.x | i18n (5 Sprachen) |
| Playwright | 1.57.x | E2E-Tests |
| Vitest | 4.x | Unit-Tests |

### Admin-Dashboard (`packages/admin-dashboard/`)
| Komponente | Version | Zweck |
|-----------|---------|-------|
| Next.js | 16.x (App Router) | Framework |
| React | 18.2.x | UI |
| Tailwind CSS | 3.x | Styling |
| Recharts | 3.5.x | Diagramme |

### Externe Services
| Service | Zweck |
|---------|-------|
| **RunPod Serverless** | AI-Bildverarbeitung (Qwen Image Edit, ComfyUI) |
| **fal.ai** | AI Fallback (Style Transfer, Video, Face Swap) |
| **Groq** | LLM-Inferenz (primär) |
| **Grok/xAI** | LLM-Fallback |
| **OpenAI** | LLM-Fallback (3. Priorität) |
| **remove.bg** | Background Removal |
| **ClamAV** | Virus-Scan für Uploads |
| **SeaweedFS** | Objektspeicher (S3-kompatibel, self-hosted) |
| **Postfix/SMTP** | E-Mail-Versand |
| **Ollama** | LLM offline lokal (llama3.2:3b, llava:7b) |

---

## 3. Repository-Struktur

```
gaestefotos-app-v2/
├── packages/
│   ├── backend/                  # Express.js API-Server
│   │   ├── src/
│   │   │   ├── config/           # database.ts (Prisma), redis.ts
│   │   │   ├── middleware/       # auth.ts, csrf.ts, rateLimit.ts, maintenanceMode.ts
│   │   │   ├── routes/           # ~117 Route-Dateien
│   │   │   ├── services/         # Business-Logic (~40 Services)
│   │   │   ├── utils/            # logger.ts, helpers
│   │   │   ├── workflows/        # 18 ComfyUI Workflow JSONs (Qwen Image Edit)
│   │   │   └── __tests__/        # Unit-Tests (Vitest)
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Datenmodell (~95 Modelle)
│   │   │   └── migrations/       # DB-Migrations
│   │   └── dist/                 # TypeScript Compile-Output (gitignored)
│   │
│   ├── frontend/                 # Next.js App Router
│   │   ├── src/
│   │   │   ├── app/              # App Router Pages (~68 Seiten)
│   │   │   │   ├── [locale]/     # i18n-Wrapper (de/en/fr/es/it)
│   │   │   │   └── e/[slug]/     # Event-Pages (Galerie, Upload)
│   │   │   ├── components/       # ~269 React-Komponenten
│   │   │   │   ├── ui/           # Basis-UI (Button, Modal, etc.)
│   │   │   │   └── *.tsx         # Feature-Komponenten
│   │   │   ├── lib/
│   │   │   │   ├── api.ts        # Axios-Instanz (baseURL, CSRF-Header)
│   │   │   │   ├── tusUpload.ts  # TUS-Upload-Client
│   │   │   │   └── socket.ts     # Socket.IO-Client
│   │   │   └── hooks/            # Custom Hooks (useEvent, usePhotos, etc.)
│   │   └── public/               # Statische Assets
│   │
│   ├── admin-dashboard/          # Separates Next.js Admin-UI
│   │   └── src/app/              # ~57 Admin-Seiten
│   │
│   ├── shared/                   # Gemeinsame TypeScript-Types
│   │   └── src/types/            # Shared Types (User, Event, Photo, etc.)
│   │
│   └── print-terminal/           # Electron Druckstation
│
├── runpod/                       # Docker-Image für RunPod ComfyUI Worker
│   ├── Dockerfile
│   ├── pod-startup.sh
│   └── workflow-sync.sh
│
├── scripts/                      # Deploy-, Smoke-Check-, Setup-Skripte
├── docs/                         # Alle Dokumentationsdateien
│   └── Manuals/                  # Dieses Verzeichnis
│
├── package.json                  # pnpm Workspace Root
├── pnpm-workspace.yaml
└── .env.example
```

### Wichtige Pfade in Produktion
```
/opt/gaestefotos/app/             # Produktionscode (User: gaestefotos)
/opt/gaestefotos/app/packages/backend/.env.production
/opt/gaestefotos/app/packages/frontend/.env.production
/tmp/tus-uploads/                 # TUS Temp-Uploads
```

---

## 4. Lokale Entwicklungsumgebung

### Voraussetzungen
```bash
node --version    # ≥ 18.0.0
pnpm --version    # ≥ 8.0.0
# PostgreSQL 15+ (lokal oder via Docker)
# Redis (lokal oder via Docker)
# Optional: ClamAV (für Virus-Scan)
```

### Setup
```bash
# 1. Repository klonen
git clone <repo-url>
cd gaestefotos-app-v2

# 2. Dependencies installieren (alle Packages)
pnpm install

# 3. Environment-Dateien anlegen
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env.local

# 4. Datenbank migrieren
cd packages/backend
npx prisma migrate dev
npx prisma generate

# 5. Datenbank seeden (optional, Testdaten)
npx prisma db seed
```

### Starten
```bash
# Alle Services gleichzeitig (Frontend + Backend)
pnpm dev

# Einzeln starten
pnpm dev:backend    # Port 8001 (oder .env PORT)
pnpm dev:frontend   # Port 3000

# Admin-Dashboard separat
pnpm --filter @gaestefotos/admin-dashboard dev  # Port 3001
```

### Wichtige Dev-Scripts
```bash
pnpm lint                          # ESLint (alle Packages)
pnpm type-check                    # TypeScript check (alle Packages)
pnpm --filter backend test         # Unit-Tests (Vitest)
pnpm --filter frontend e2e         # E2E-Tests (Playwright)
pnpm --filter backend build        # TypeScript kompilieren
```

---

## 5. Backend-Architektur

### Request-Flow
```
Client (Browser/App)
    │
    ▼
Nginx (Reverse Proxy, Port 443/80)
    │  TLS-Termination, gzip, rate limit vorgelagert
    ▼
Express.js (Port 8001)
    │
    ├── Middleware (in Reihenfolge):
    │   1. Helmet (Security Headers: CSP, HSTS, etc.)
    │   2. CORS (erlaubte Origins aus .env)
    │   3. express-rate-limit (apiLimiter: 2000/15min)
    │   4. maintenanceModeMiddleware
    │   5. express.json() + mongoSanitize
    │   6. requestId (UUID für Tracing)
    │   7. CSRF-Schutz (auf alle POST/PUT/DELETE/PATCH /api/*)
    │
    ├── Routes (~/117 Dateien in src/routes/)
    │   └── → Services (Business-Logic)
    │       └── → Prisma (DB) + Storage + Redis + AI-APIs
    │
    └── Socket.IO (WebSocket auf gleichem HTTP-Server)
```

### Middleware-Details

**CSRF-Schutz** (`src/middleware/csrf.ts`):
- `GET /api/csrf-token` → generiert Token + setzt `csrf-token` Cookie (HttpOnly: false, SameSite: Strict)
- Alle mutierende Requests prüfen `X-CSRF-Token` Header gegen Cookie-Wert
- Ausnahmen: `/api/uploads` (TUS), `/api/webhooks/*`, `/api/workflow-sync`, `/api/health`, `/cdn/*`, `/r/*`

**Authentifizierung** (`src/middleware/auth.ts`):
```typescript
// JWT aus Authorization-Header oder Cookie
// Rollen: ADMIN > PARTNER > HOST > (Gast = kein User)
authenticate        // Pflicht-Auth
authenticateOptional // Optional (für Gäste-Endpoints)
requireAdmin        // Nur ADMIN
requirePartner      // ADMIN oder PARTNER
hasEventAccess      // Event-Eigentümer oder Co-Host oder ADMIN
```

**Rate-Limiting:**
| Limiter | Limit | Fenster | Route |
|---------|-------|---------|-------|
| `apiLimiter` | 2000 req | 15 min | alle /api/* |
| `authLimiter` | 10 req | 15 min | /api/auth/* |
| `uploadLimiter` | 100 req | 15 min | /api/uploads |
| `passwordLimiter` | 5 req | 60 min | /api/auth/forgot-password |
| `aiFeatureLimiter` | 50 req | 1 min | /api/booth-games |
| `paymentLimiter` | 10 req | 60 min | /api/payments |

### Projekt-Konventionen (Backend)

**Route-Datei Struktur:**
```typescript
// src/routes/beispiel.ts
import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await prisma.model.findMany();
    res.json(data);
  } catch (error) {
    logger.error('Fehler', { error });
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

export default router;
```

**Error-Handling:**
- Alle async Routes haben try/catch
- Unbehandelte Fehler → Winston Logger + Sentry (wenn `SENTRY_DSN` gesetzt)
- HTTP-Status-Codes: 400 (Bad Request), 401 (Unauth), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Server Error)
- Response-Format: `{ error: "Fehlermeldung" }` oder `{ message: "Erfolg" }`

**Logging** (`src/utils/logger.ts`):
```typescript
import { logger } from '../utils/logger';

logger.info('Event erstellt', { eventId, userId });
logger.warn('Upload-Limit erreicht', { guestName, eventId });
logger.error('Datenbankfehler', { error: err.message, stack: err.stack });
```

---

## 6. Frontend-Architektur

### App Router Struktur
```
src/app/
├── layout.tsx                    # Root Layout (Theme, CSRF-Fetch, Socket-Init)
├── page.tsx                      # Landing Page (Marketing)
├── [locale]/                     # i18n Wrapper
│   ├── layout.tsx
│   └── e/[slug]/                 # Event-Pages
│       ├── page.tsx              # Event-Galerie (öffentlich)
│       ├── upload/               # Upload-Page
│       └── ai/                   # AI-Effekte-Page
└── host/                         # Host-Dashboard (Auth-required)
    └── events/[id]/
```

### Axios-Instanz (`src/lib/api.ts`)
```typescript
// Zentraler API-Client
import api from '@/lib/api';

// GET
const { data } = await api.get('/events');

// POST (CSRF automatisch im Header)
await api.post('/events', { name: 'Hochzeit' });
```
- `baseURL`: `/api` (relativ zu Next.js Proxy → Backend)
- CSRF-Token wird automatisch aus Cookie gelesen und als `X-CSRF-Token` Header gesendet
- Interceptors: 401 → Redirect zu `/login`, 503 → Maintenance-Page

### State-Management
- **TanStack Query:** Server-State (Fetching, Caching, Invalidierung)
- **Zustand:** Client-State (Upload-Queue, UI-State, Offline-Queue)
- **React Hook Form:** Formulare mit Zod-Validierung

### Socket.IO Integration
```typescript
// src/lib/socket.ts
import { useSocket } from '@/hooks/useSocket';

// In Komponenten:
const socket = useSocket(eventId);

socket.on('photo:new', (photo) => {
  // Echtzeit-Update: neues Foto in Galerie
  queryClient.invalidateQueries({ queryKey: ['photos', eventId] });
});
```

**WebSocket-Events (Auswahl):**
| Event | Richtung | Beschreibung |
|-------|----------|--------------|
| `photo:new` | Server→Client | Neues Foto hinzugefügt |
| `photo:approved` | Server→Client | Foto freigegeben |
| `photo:deleted` | Server→Client | Foto gelöscht |
| `ai-job:done` | Server→Client | AI-Job abgeschlossen |
| `mosaic:update` | Server→Client | Mosaik-Zeile fertig |
| `upload:progress` | Client→Server | Upload-Fortschritt |

### Internationalisierung (i18n)
- **Library:** `next-intl` 3.26.x
- **Sprachen:** de, en, fr, es, it
- **Erkennung:** Cookie `NEXT_LOCALE` + `AutoLocaleDetect` Komponente
- **Übersetzungsdateien:** `src/messages/{locale}.json`
- **Umschalter:** `LanguageSelector` Komponente

---

## 7. Datenbank (Prisma + PostgreSQL)

### Verbindung
```typescript
// src/config/database.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export default prisma;
```

**Connection String** (in `.env`):
```
DATABASE_URL="postgresql://user:pass@localhost:5432/gaestefotos?schema=public"
```

### Wichtigste Prisma-Modelle

```prisma
// Kern-Modelle

model User {
  id         String    @id @default(cuid())
  email      String    @unique
  name       String
  role       UserRole  // ADMIN | HOST | PARTNER
  events     Event[]
  createdAt  DateTime  @default(now())
}

model Event {
  id                String    @id @default(cuid())
  slug              String    @unique  // URL: /e/{slug}
  title             String
  hostId            String
  host              User      @relation(...)
  photos            Photo[]
  videos            Video[]
  guestbookEntries  GuestbookEntry[]
  aiJobs            AiJob[]
  maxUploadsPerGuest Int?     // Upload-Limit pro Gast (null = unbegrenzt)
  requireApproval   Boolean  @default(false)
  isPasswordProtected Boolean @default(false)
  password          String?
  createdAt         DateTime  @default(now())
}

model Photo {
  id                String   @id @default(cuid())
  eventId           String
  storagePath       String?  // Optimized (1920px JPEG) - Galerie
  storagePathOriginal String? // Original (volle Qualität) - Download
  storagePathThumb  String?  // Thumbnail (300px) - Vorschau
  storagePathWebp   String?  // WebP (1920px) - modernes Format
  uploadedBy        String?  // Gast-Name
  uploadedByIpHash  String?  // SHA-256 Hash der IP (DSGVO-konform)
  approved          Boolean  @default(true)
  isBlurry          Boolean  @default(false)
  isDuplicate       Boolean  @default(false)
  uploadStatus      String   @default("PENDING")
  faceData          Json?    // Face-Detection Ergebnisse
  aHash             String?  // Perceptual Hash (Duplikat-Erkennung)
  sha256            String?  // SHA-256 (exakte Duplikat-Erkennung)
  createdAt         DateTime @default(now())
}

model AiJob {
  id          String       @id @default(cuid())
  eventId     String
  guestName   String?
  workflow    String       // z.B. "ai_cartoon", "face_swap"
  inputPhotoId String?
  status      AiJobStatus  // QUEUED | PROCESSING | DONE | FAILED
  result      String?      // StoragePath des Ergebnisses
  shortCode   String?      // Kurz-Code für /r/:shortCode Result-Page
  notified    Boolean      @default(false)
  createdAt   DateTime     @default(now())
  processedAt DateTime?
}
```

### Migration-Workflow
```bash
# Neue Migration erstellen (nach Schema-Änderung)
cd packages/backend
npx prisma migrate dev --name "beschreibung_der_aenderung"

# Produktion: nur apply (kein dev)
npx prisma migrate deploy

# Prisma Client neu generieren
npx prisma generate

# Studio (DB-Browser)
npx prisma studio
```

**Wichtig:** In Produktion niemals `migrate dev` verwenden, nur `migrate deploy`.

---

## 8. Storage (SeaweedFS)

SeaweedFS ist ein self-hosted, S3-kompatibler Objektspeicher.

### Konfiguration (`.env`)
```env
SEAWEEDFS_ENDPOINT=http://localhost:8333
SEAWEEDFS_ACCESS_KEY=your_access_key
SEAWEEDFS_SECRET_KEY=your_secret_key
SEAWEEDFS_BUCKET=gaestefotos
```

### Storage-Service (`src/services/storage.ts`)
```typescript
import { storageService } from '../services/storage';

// Datei hochladen
await storageService.uploadFile(eventId, fileKey, buffer, mimeType);

// Datei-URL generieren (signiert, 1h gültig)
const url = await storageService.getSignedUrl(storagePath);

// Datei löschen
await storageService.deleteFile(storagePath);

// Sicherstellen dass Bucket existiert
await storageService.ensureBucketExists();
```

### Datei-Pfad-Konvention
```
events/{eventId}/{photoId}_orig.jpg    ← Original (volle Qualität)
events/{eventId}/{photoId}_opt.jpg     ← Optimized (1920px JPEG 85%)
events/{eventId}/{photoId}_thumb.jpg   ← Thumbnail (300px JPEG 75%)
events/{eventId}/{photoId}_webp.webp   ← WebP (1920px WebP 82%)
events/{eventId}/{videoId}_orig.mp4    ← Video Original
events/{eventId}/graffiti_{id}.png     ← Air-Graffiti
events/{eventId}/mosaic_{row}.jpg      ← Mosaik-Zeilen
```

### Image CDN (`/cdn/:photoId`)
```
GET /cdn/{photoId}?w=400&q=80&f=webp
    └── On-the-fly Resize + Format-Conversion via Sharp
    └── Nginx: Cache-Control: public, max-age=31536000, immutable
```

---

## 9. Cache & Queues (Redis + BullMQ)

### Redis-Verbindung
```env
REDIS_URL=redis://localhost:6379
```

### Redis-Nutzung
| Key-Pattern | TTL | Inhalt |
|-------------|-----|--------|
| `csrf:{sessionId}` | 24h | CSRF-Token |
| `ai:cache:{hash}` | 24h | AI-Antwort-Cache (Knowledge Store) |
| `rate:{ip}:{route}` | Fenster | Rate-Limit-Counter |
| `session:{id}` | 7d | Session-Daten |
| `event:stats:{eventId}` | 5min | Event-Statistiken (gecacht) |

### BullMQ Queues
```typescript
// src/services/jobQueue.ts
import { Queue, Worker } from 'bullmq';

// Beispiel: Job erstellen
const emailQueue = new Queue('email', { connection: redisConfig });
await emailQueue.add('send', { to: 'gast@example.com', template: 'ai-done' });

// Worker
const worker = new Worker('email', async (job) => {
  await sendEmail(job.data);
}, { connection: redisConfig });
```

**Aktive Queues:**
- `email` — E-Mail-Versand
- `ai-processing` — AI-Jobs (RunPod/Qwen)
- `photo-processing` — Foto-Nachbearbeitung (Resize, Thumb, WebP)
- `video-processing` — Video-Jobs (Highlight Reel)

---

## 10. Authentifizierung & Autorisierung

### JWT-basierte Auth
```typescript
// Login-Flow:
// 1. POST /api/auth/login { email, password }
// 2. Backend prüft bcrypt-Hash
// 3. JWT generieren (HS256, JWT_SECRET aus .env)
// 4. JWT als HttpOnly Cookie + Authorization Header

// Middleware-Verwendung:
router.get('/protected', authenticate, (req, res) => {
  const user = req.user; // { id, email, role, name }
});
```

**JWT-Payload:**
```json
{
  "userId": "cld...",
  "email": "user@example.com",
  "role": "HOST",
  "iat": 1700000000,
  "exp": 1700604800
}
```

### Rollen-System
```
ADMIN  → Vollzugriff auf alles
  │
PARTNER → Eigene Events, Hardware, Team, Billing
  │
HOST   → Eigenes Event verwalten
  │
Gast   → Kein User-Account, anonyme Teilnahme via Event-Slug
```

### Event-Zugriff für Gäste
```typescript
// Gäste identifizieren sich über:
// 1. Event-Slug (/e/{slug})
// 2. Optional: Event-Passwort (wenn passwordProtected=true)
// 3. Guest-Name (wird in localStorage gespeichert)
// 4. IP-Hash (für Upload-Limit-Tracking, SHA-256, DSGVO-konform)
```

### 2FA (TOTP)
- Nur für ADMIN und PARTNER
- `TWO_FACTOR_ENCRYPTION_KEY` im Backend pflichtmäßig in Produktion
- TOTP-Secrets AES-256-GCM verschlüsselt in DB
- Admin-UI: `/manage/security/2fa`

### WordPress SSO
```
POST /api/auth/wordpress-sso
├── WooCommerce sendet nach Kauf: { wpUserId, ssoSecret }
└── Backend erstellt/aktualisiert User + generiert JWT → Redirect zu App
```

---

## 11. Upload-Pipeline (TUS)

### Flow (vereinfacht)
```
1. Gast gibt Namen ein (localStorage)
2. Optional: Quick-Preview (~30KB) → sofort in Galerie sichtbar
3. TUS-Upload (resumable, max 100MB):
   POST /api/uploads  → TUS-Server erstellt Upload-Slot
   PATCH /api/uploads/{id}  → Chunks senden (max 5MB/Chunk)
4. onUploadFinish → processCompletedUpload():
   - IP-Hash extrahieren (für Upload-Limit)
   - ClamAV Virus-Scan
   - Blur-Erkennung (Laplacian-Variance)
   - Duplikat-Erkennung (SHA-256 + pHash aHash)
   - 4 Varianten generieren (orig, opt, thumb, webp)
   - In SeaweedFS speichern
   - Photo in DB speichern
   - Socket.IO: photo:new emittieren
   - Face-Detection starten (async)
5. Upload-Limit prüfen: GET /api/uploads/limit/{eventId}?guest=name
```

### Upload-Limit-Prüfung
```typescript
// Backend prüft beide Kriterien (ODER-Verknüpfung):
// 1. Guest-Name (localStorage)
// 2. IP-Hash (als Fallback)
// Limit: Event.maxUploadsPerGuest (null = unbegrenzt)
```

### Fehlerfälle
| Szenario | Verhalten |
|----------|-----------|
| Virus gefunden | Datei wird in `/uploads/quarantine/` verschoben, kein DB-Eintrag |
| Duplikat erkannt | HTTP 409, kein DB-Eintrag, Meldung "Foto bereits hochgeladen" |
| Upload-Limit erreicht | HTTP 403, Meldung "Limit erreicht ({max} Fotos)" |
| ClamAV offline | Upload erlaubt (Soft-Fail), Warnung geloggt |
| Blur erkannt | Upload erlaubt, `isBlurry=true` in DB |

---

## 12. AI-System

### Architektur-Übersicht
```
Gast wählt AI-Effekt
    │
    ▼
POST /api/booth-games/style-effect (oder /face-switch, /bg-removal)
    │
    ▼
aiExecution.ts
├── Feature-Gate prüfen (Paket ∩ Event ∩ Device)
├── Credit-Check (falls Credits-System aktiv)
├── Provider-Resolution
│   ├── 1. Versuch: RunPod/ComfyUI (Qwen Image Edit fp8)
│   │   └── comfyuiWorkflowRegistry.ts → runpodService.ts
│   └── 2. Fallback: fal.ai (flux/dev img2img)
│
└── Ergebnis:
    ├── Synchron (< 60s): direkt im Response
    └── Async (> 60s): AiJob in DB, shortCode, Gast wird benachrichtigt
```

### RunPod-Integration (`src/services/runpodService.ts`)
```typescript
import { submitJob, pollForResult, submitAndWait, extractOutputBuffer } from '../services/runpodService';

// Job einreichen und auf Ergebnis warten
const result = await submitAndWait({
  input: {
    workflow: workflowJson,
    images: [{ name: 'image.jpg', image: base64Image }]
  }
});

// Output als Buffer extrahieren
const { buffer, externalUrl } = await extractOutputBuffer(result.output);
```

**Wichtige Konstanten:**
```env
RUNPOD_API_KEY=rpa_...
RUNPOD_ENDPOINT_ID=fkyvpdld673jrf   # EU A6000 Endpoint
RUNPOD_TIMEOUT_MS=120000            # 2 Minuten Timeout
```

### 18 ComfyUI Workflows (`src/workflows/*.json`)
```
ai_cartoon.json, ai_oldify.json, ai_style_pop.json,
neon_noir.json, anime.json, watercolor.json, oil_painting.json,
sketch.json, renaissance.json, comic_book.json, pixel_art.json,
yearbook.json, emoji_me.json, pet_me.json, miniature.json,
trading_card.json, time_machine.json, face_swap.json
```

Jeder Workflow folgt diesem Schema:
- Nodes: UNETLoader → CLIPLoader → VAELoader → LoraLoaderModelOnly → LoadImage → TextEncodeQwenImageEdit → KSampler (4 Steps, cfg=1.0, euler) → VAEDecode → SaveImage
- Seed wird vor jedem Job randomisiert
- `face_swap.json` nutzt `TextEncodeQwenImageEditPlus` (2 Bilder: Body + Face)

### Admin-Verwaltung von Workflows
```
GET  /api/admin/workflows/{effect}       ← Workflow-JSON abrufen
PUT  /api/admin/workflows/{effect}       ← Workflow-JSON aktualisieren
DELETE /api/admin/workflows/{effect}     ← Zurücksetzen auf Default
POST /api/admin/workflows/{effect}/test  ← Test-Job mit Beispielbild
```

---

## 13. WebSocket & Echtzeit

### Socket.IO Setup (Backend)
```typescript
// src/index.ts
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});

// Events emittieren (in Services):
import { io } from '../index';
io.to(`event:${eventId}`).emit('photo:new', { photo });
```

### Room-System
```
event:{eventId}   ← alle Teilnehmer eines Events
host:{userId}     ← Host-spezifische Updates
admin:global      ← ADMIN-Dashboard Updates
```

### Verbindungs-Flow (Frontend)
```typescript
// Gast betritt Event:
socket.emit('join-event', { eventId, guestName });
// → Backend: socket.join(`event:${eventId}`)

// Host betritt Dashboard:
socket.emit('join-host', { eventId, token });
// → Backend: socket.join(`host:${userId}`)
```

---

## 14. Background-Worker

Alle Worker starten automatisch mit dem Backend-Service:

| Worker | Datei | Intervall | Beschreibung |
|--------|-------|-----------|--------------|
| **AI Job Worker** | `aiJobWorker.ts` | 30s | RunPod-Jobs pollen, Gäste benachrichtigen |
| **Photo Delivery** | `photoDelivery.ts` | 60s | E-Mails an optIn-Gäste bei neuen Fotos |
| **Event Recap** | `eventRecap.ts` | Cron | Zusammenfassung 24h nach Event-Ende |
| **Retention Purge** | `retentionPurge.ts` | täglich | Abgelaufene Events/Fotos löschen (storageDurationDays) |
| **Virus Scan** | `virusScan.ts` | 30s | ClamAV-Queue abarbeiten |
| **Orphan Cleanup** | `orphanCleanup.ts` | stündlich | Fotos ohne DB-Eintrag löschen |
| **Storage Reminder** | `storageReminder.ts` | täglich | E-Mail vor Ablauf des Speicherplatzes |
| **Workflow Timer** | `workflowTimerWorker.ts` | 60s | Event-Lifecycle-Transitions (Automationen) |
| **QA Log Retention** | `qaLogRetention.ts` | täglich | Alte QA-Logs bereinigen (30d) |
| **WooLog Retention** | `wooLogRetention.ts` | täglich | Alte WooCommerce-Logs bereinigen (90d) |
| **Demo Mosaic** | `demoMosaicRetention.ts` | stündlich | Demo-Mosaike nach 1h löschen |

---

## 15. Testing

### Unit-Tests (Vitest)
```bash
# Backend
pnpm --filter backend test
pnpm --filter backend test:watch

# Frontend
pnpm --filter frontend test
```

**Aktuell bestehende Unit-Tests (`packages/backend/src/__tests__/`):**
```
services/runpodService.test.ts    ← 14 Tests (submitJob, pollForResult, extractOutputBuffer, submitAndWait)
services/csrf.test.ts             ← 2 Tests (Token-Generierung, Cookie-Handling)
services/duplicateDetection.test.ts ← 11 Tests (SHA-256 exakt, pHash ähnlich, Hamming-Distanz)
```

**Alle 27 Tests: ✅ PASS (Stand: 2026-03-06)**

### E2E-Tests (Playwright)
```bash
# Alle E2E-Tests
pnpm e2e

# Stabil mit eigenen Test-URLs
E2E_BASE_URL=http://localhost:3000 pnpm e2e

# Mit UI (interaktiv)
pnpm e2e:ui
```

**Getestete Flows (22 E2E-Tests):**
- Gast-Login + Upload + Galerie
- Host-Event-Erstellung
- AI-Effekte (LLM + Bild)
- Face Swap
- Background Removal
- Video-Generierung
- WooCommerce-Webhook

### Neue Tests schreiben
```typescript
// src/__tests__/services/neuerService.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('neuerService', () => {
  it('sollte X tun', async () => {
    const result = await meineFunktion(input);
    expect(result).toBe(expected);
  });
});
```

---

## 16. Deployment

### Produktions-Pfade
```
Entwicklung:  /root/gaestefotos-app-v2/
Produktion:   /opt/gaestefotos/app/      (User: gaestefotos)
Systemd:      gaestefotos-backend, gaestefotos-frontend, gaestefotos-admin-dashboard
```

### Backend Deploy (empfohlen: deploy.sh)
```bash
cd /root/gaestefotos-app-v2/packages/backend

# Vollständiger Deploy:
bash deploy.sh

# Was deploy.sh macht:
# 1. TypeScript type-check (tsc --noEmit)
# 2. Compile (tsc → dist/)
# 3. rsync src/, dist/, prisma/ → /opt/gaestefotos/app/packages/backend/
# 4. systemctl restart gaestefotos-backend
# 5. GET /api/health → muss 200 liefern
```

### Manueller Backend Deploy
```bash
# 1. Code sync
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.env' \
  /root/gaestefotos-app-v2/packages/backend/ \
  /opt/gaestefotos/app/packages/backend/

# 2. Prisma + Build (auf dem Prod-Pfad)
cd /opt/gaestefotos/app/packages/backend
npx prisma generate
pnpm build

# 3. Service neu starten
systemctl restart gaestefotos-backend

# 4. Health-Check
curl -v http://localhost:8001/api/health
```

### Frontend Deploy
```bash
# Service MUSS vorher gestoppt werden (ChunkLoadError vermeiden)
systemctl stop gaestefotos-frontend

rsync -av --exclude='node_modules' --exclude='.next' --exclude='.env' \
  /root/gaestefotos-app-v2/packages/frontend/ \
  /opt/gaestefotos/app/packages/frontend/

cd /opt/gaestefotos/app/packages/frontend
pnpm build:prod

systemctl start gaestefotos-frontend
```

### Smoke-Check nach Deploy
```bash
# Backend Health
curl -s http://localhost:8001/api/health | python3 -m json.tool

# Frontend
curl -o /dev/null -s -w "HTTP %{http_code}\n" https://app.gästefotos.com/

# Vollständiger Smoke-Check
bash /root/gaestefotos-app-v2/scripts/prelaunch-smoke.sh
```

---

## 17. Environment-Variablen Referenz

### Backend (`.env` oder `.env.production`)

**Pflichtfelder (Produktion):**
```env
# Datenbank
DATABASE_URL=postgresql://user:pass@localhost:5432/gaestefotos

# JWT
JWT_SECRET=min_64_zeichen_zufallsstring

# 2FA Verschlüsselung
TWO_FACTOR_ENCRYPTION_KEY=32_byte_hex_string

# SeaweedFS
SEAWEEDFS_ENDPOINT=http://localhost:8333
SEAWEEDFS_ACCESS_KEY=key
SEAWEEDFS_SECRET_KEY=secret
SEAWEEDFS_BUCKET=gaestefotos

# Redis
REDIS_URL=redis://localhost:6379
```

**KI-Provider:**
```env
# RunPod (primärer Bild-KI Provider)
RUNPOD_API_KEY=rpa_...
RUNPOD_ENDPOINT_ID=fkyvpdld673jrf

# fal.ai (Fallback + Video)
FAL_KEY=fal-...

# LLM Provider
GROQ_API_KEY=gsk_...
XAI_API_KEY=xai-...
OPENAI_API_KEY=sk-...

# Background Removal
REMOVE_BG_API_KEY=...
```

**Externe Dienste:**
```env
# E-Mail (oder aus DB app_settings)
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=noreply@gaestefotos.com
SMTP_PASS=...
SMTP_FROM=noreply@gaestefotos.com

# WooCommerce
WOOCOMMERCE_WEBHOOK_SECRET=...
WORDPRESS_URL=https://gästefotos.com
WORDPRESS_SSO_SECRET=...

# SMS (optional)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+43...

# Sentry (optional)
SENTRY_DSN=https://...@sentry.io/...

# Web Push (optional)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

**App-Konfiguration:**
```env
NODE_ENV=production
PORT=8001
FRONTEND_URL=https://app.gästefotos.com
ADMIN_URL=https://dash.gästefotos.com

# TUS Upload
TUS_UPLOAD_DIR=/tmp/tus-uploads

# Workflow Sync
WORKFLOW_SYNC_KEY=sicherer_sync_key
```

### Frontend (`.env.local` oder `.env.production`)
```env
NEXT_PUBLIC_API_URL=https://app.gästefotos.com/api
NEXT_PUBLIC_APP_URL=https://app.gästefotos.com
NEXT_PUBLIC_SOCKET_URL=https://app.gästefotos.com
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## 18. Häufige Probleme & Debugging

### ChunkLoadError / 404 auf /_next/static/*
**Ursache:** Frontend wurde deployed während Service lief (gemischte Assets)  
**Fix:**
```bash
systemctl stop gaestefotos-frontend
pnpm build:prod
systemctl start gaestefotos-frontend
```

### CSRF-Fehler (403 bei POST-Requests)
**Ursache:** CSRF-Token fehlt oder abgelaufen  
**Debug:**
```bash
# Token manuell holen
curl -c /tmp/cookies.txt http://localhost:8001/api/csrf-token
# Token aus Cookie lesen und in X-CSRF-Token Header setzen
```
**Hinweis:** Frontend holt Token automatisch beim App-Start in `layout.tsx`

### RunPod-Jobs schlagen fehl
**Mögliche Ursachen:**
1. `RUNPOD_API_KEY` oder `RUNPOD_ENDPOINT_ID` falsch
2. Workflow-JSON enthält `"text":` statt `"prompt":` (ComfyUI Node-Interface)
3. GPU nicht verfügbar → BullMQ Job bleibt in `QUEUED`

**Debug:**
```bash
# Backend-Logs
journalctl -u gaestefotos-backend -n 100 --no-pager | grep -i runpod

# Test-Job manuell
curl -X POST http://localhost:8001/api/admin/workflows/ai_cartoon/test \
  -H "Authorization: Bearer {admin_jwt}"
```

### Prisma-Fehler "schema not found"
```bash
cd /opt/gaestefotos/app/packages/backend
npx prisma generate
```

### TUS-Uploads fehlschlagen
```bash
# Temp-Ordner prüfen
ls -la /tmp/tus-uploads/
# Berechtigungen
chown -R gaestefotos:gaestefotos /tmp/tus-uploads/
```

### SeaweedFS nicht erreichbar
```bash
# Status prüfen
curl http://localhost:8333/dir/status
# Bucket neu erstellen
cd packages/backend && node -e "require('./dist/services/storage').storageService.ensureBucketExists()"
```

### Logs einsehen
```bash
# Backend
journalctl -u gaestefotos-backend -f
journalctl -u gaestefotos-backend --since "10 min ago" --no-pager

# Frontend
journalctl -u gaestefotos-frontend -f

# Admin-Dashboard
journalctl -u gaestefotos-admin-dashboard -f

# Alle Services Status
systemctl status gaestefotos-backend gaestefotos-frontend gaestefotos-admin-dashboard
```

---

*Letzte Aktualisierung: 6. März 2026 — Entspricht Produktionsstand v2.0.0*
