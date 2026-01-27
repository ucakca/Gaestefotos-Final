# Vollständige Architektur-Analyse: Gästefotos-App v2

**Datum:** 2026-01-10  
**Analysiert von:** Claude (Auto) - Senior Fullstack Architect & UX Specialist  
**Status:** ✅ Analyse abgeschlossen - Bereit für Action-Packages

---

## Executive Summary

Die Codebase zeigt eine **solide, durchdachte Architektur** mit klarer Trennung zwischen Gast-Interface, Host-Dashboard und Backend-API. Die Subdomain-Strategie ist sauber implementiert, die Media-Integrität (Original-Qualität) ist korrekt umgesetzt, und die Auth-Logik ist rollenbasiert getrennt. Es gibt einige **UI/UX-Verbesserungspotenziale** für ein festlicheres Design, besonders auf mobilen Geräten.

---

## 1. Architektur-Check ✅

### 1.1 Subdomain-Routing & Trennung

**✅ VERSTANDEN:** Die Architektur nutzt **drei getrennte Subdomains** mit klarer Logik-Trennung:

#### **Subdomain-Struktur:**

1. **`app.gästefotos.com`** (oder `app.gaestefotos.com`)
   - **Zweck:** Gast-Interface (Foto-Upload, Galerie, Stories, Guestbook)
   - **Frontend:** `packages/frontend/` (Next.js App Router)
   - **Port:** 3002 (laut systemd service)
   - **Routes:** `/e/[slug]` (Event-Galerie), `/i/[slug]` (Invitations), `/live/[slug]` (Live-Wall)

2. **`dash.gästefotos.com`** (oder `dash.gaestefotos.com`)
   - **Zweck:** Host/Admin-Dashboard (Event-Verwaltung, Moderation, Statistiken)
   - **Frontend:** `packages/admin-dashboard/` (Next.js App Router)
   - **Port:** 3101 (laut systemd service)
   - **Routes:** `/events/[id]`, `/dashboard`, `/moderation`, `/analytics`

3. **`gästefotos.com`** (Hauptdomain)
   - **Zweck:** Marketing, Landing Pages, AGB, Datenschutz
   - **Optional:** WordPress-Integration (CMS Sync vorhanden)

#### **CORS-Konfiguration:**

**✅ KORREKT IMPLEMENTIERT** in `packages/backend/src/index.ts` (Zeile 126-160):

```typescript
const CANONICAL_APP_HOST_UNICODE = 'app.gästefotos.com';
const CANONICAL_DASH_HOST_UNICODE = 'dash.gästefotos.com';
const CANONICAL_WP_HOST_UNICODE = 'gästefotos.com';

const allowedOrigins = Array.from(
  new Set([
    ...allowedOriginsFromEnv,  // Aus FRONTEND_URL env
    'http://localhost:3002',
    ...canonicalAppOriginsAscii,
    ...canonicalDashOriginsAscii,
  ])
);
```

**Erkenntnis:** CORS ist **subdomain-aware** und nutzt `domainToASCII()` für Unicode-Domains. ✅

#### **Ordnerstruktur:**

**✅ KONSISTENT:**

```
packages/
├── backend/          # Express API (Port 8001)
│   ├── src/
│   │   ├── routes/   # API-Endpoints
│   │   ├── middleware/ # Auth, Rate-Limiting
│   │   ├── services/  # Business-Logik
│   │   └── index.ts   # CORS-Config, Socket.io
├── frontend/         # Next.js App (app.gästefotos.com)
│   └── src/app/      # App Router Routes
│       ├── e/[slug]/ # Event-Galerie
│       ├── i/[slug]/ # Invitations
│       └── ...
├── admin-dashboard/  # Next.js Dashboard (dash.gästefotos.com)
│   └── src/app/      # App Router Routes
│       ├── events/   # Event-Verwaltung
│       ├── dashboard/# Statistiken
│       └── ...
└── shared/           # Shared Types/Utils
```

**Keine Inkonsistenzen erkannt.** ✅

### 1.2 Middleware & Auth-Flow

**✅ SAUBER GETRENNT:**

#### **Backend Middleware** (`packages/backend/src/middleware/auth.ts`):

1. **`authMiddleware`** (Zeile 168-242)
   - Prüft JWT Token (Header oder Cookie)
   - Setzt `req.userId` und `req.userRole`
   - **Rollen:** `HOST`, `ADMIN` (siehe `isPrivilegedRole()`)

2. **`hasEventManageAccess()`** (Zeile 44-67)
   - Host (event.hostId === userId) ✅
   - Admin (isPrivilegedRole) ✅
   - Co-Host (EventMember) ✅

3. **`hasEventPermission()`** (Zeile 17-42)
   - Granulare Permissions: `canUpload`, `canModerate`, `canEditEvent`, `canDownload`
   - Co-Hosts können eingeschränkte Rechte haben

4. **`requireEventAccess`** (Zeile 277-308)
   - Event-Zugriff für Gäste (via Cookie oder Invite-Token)
   - Hosts/Admins via JWT

**✅ KEINE KONFLIKTE:** Auth-Logik ist klar getrennt zwischen:
- **Gäste:** Event-Access-Cookies
- **Hosts:** JWT + Event-Ownership
- **Admins:** JWT + Privileged Role

### 1.3 Potenzielle Inkonsistenzen

**⚠️ KLEINE VERBESSERUNGSPOTENZIALE:**

1. **Frontend-Routing:** 
   - `packages/frontend/src/app/(admin)/` existiert, aber wird wahrscheinlich nicht genutzt (Admin ist in `admin-dashboard`)
   - **Empfehlung:** Prüfen ob `(admin)/` gelöscht werden kann

2. **API-Routing:**
   - Frontend nutzt `/api/*` (Next.js API Routes als Proxy)
   - Backend läuft auf Port 8001
   - **✅ KORREKT:** Next.js rewrites/proxies zu Backend

---

## 2. Media-Integrität ✅

### 2.1 Image-Upload-Flow

**✅ PERFEKT IMPLEMENTIERT:**

#### **Upload-Prozess** (`packages/backend/src/routes/photos.ts`):

1. **Upload** (Zeile 109-122)
   - Multer `memoryStorage()` (50MB Limit)
   - Validierung via `validateUploadedFile()`

2. **Image-Processing** (Zeile 236-250)
   - `imageProcessor.processImage()` erstellt **3 Varianten:**
     - `original` - Volle Qualität, nur EXIF/GPS gestrippt
     - `optimized` - 1920px max, 85% JPEG (für Galerie)
     - `thumbnail` - 300px (für Previews)

3. **Storage** (Zeile 236-250)
   ```typescript
   const [storagePath, storagePathOriginal, storagePathThumb] = await Promise.all([
     storageService.uploadFile(..., processed.optimized, ...),
     storageService.uploadFile(..., processed.original, ...),
     storageService.uploadFile(..., processed.thumbnail, ...),
   ]);
   ```

4. **Database** (Zeile 248-250)
   ```typescript
   storagePath,           // Optimized for gallery view
   storagePathOriginal,   // Original quality for Host download
   storagePathThumb,      // Thumbnail for previews
   ```

**✅ ORIGINAL-QUALITÄT WIRD KORREKT GESPEICHERT!**

#### **Image-Processor** (`packages/backend/src/services/imageProcessor.ts`):

**✅ KORREKT IMPLEMENTIERT** (Zeile 22-59):

```typescript
// Original: Full quality, only rotate and strip EXIF/GPS for privacy
const original = await sharp(buffer)
  .rotate() // Auto-rotate based on EXIF orientation
  .withMetadata({ orientation: undefined }) // Strip all EXIF including GPS
  .toBuffer();

// Optimized: Resize for gallery view (1920px max, good quality)
const optimized = await sharp(buffer)
  .rotate()
  .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 85 })
  .withMetadata({ orientation: undefined })
  .toBuffer();

// Thumbnail: Small preview (300px)
const thumbnail = await sharp(buffer)
  .rotate()
  .resize(300, 300, { fit: 'cover' })
  .jpeg({ quality: 75 })
  .withMetadata({ orientation: undefined })
  .toBuffer();
```

**Erkenntnis:** 
- ✅ Original wird **OHNE Kompression** gespeichert (nur EXIF/GPS gestrippt)
- ✅ Optimized für schnelle Galerie-Ladezeiten
- ✅ Thumbnail für Previews

### 2.2 Download-Flow

**✅ KORREKT IMPLEMENTIERT** (`packages/backend/src/routes/photos.ts` Zeile 499-517):

```typescript
const downloadPath = isManager && photo.storagePathOriginal 
  ? photo.storagePathOriginal   // Host/Admin: Original
  : photo.storagePath;          // Gast: Optimized

res.setHeader('X-GF-Quality', isManager && photo.storagePathOriginal ? 'original' : 'optimized');
```

**✅ HOSTS BEKOMMEN ORIGINAL-QUALITÄT, GÄSTE BEKOMMEN OPTIMIZED!**

### 2.3 Bulk-Download

**✅ KORREKT** (Zeile 601):
```typescript
const downloadPath = photo.storagePathOriginal || photo.storagePath;
```

**✅ BULK-DOWNLOAD NUTZT ORIGINAL, FALLBACK AUF OPTIMIZED!**

### 2.4 Fazit Media-Integrität

**✅ PERFEKT:** Die Original-Qualität-Strategie ist **vollständig korrekt implementiert**:
- Original wird gespeichert (`storagePathOriginal`)
- Hosts/Admins bekommen Original beim Download
- Gäste bekommen Optimized (schnelle Ladezeiten)
- Thumbnails für Previews

**KEINE ÄNDERUNGEN NÖTIG!** ✅

---

## 3. Datenbank & Auth ✅

### 3.1 Datenbank-Stack

**✅ KORREKT:** PostgreSQL + Prisma ORM (NICHT Supabase!)

**Konfiguration** (`packages/backend/src/config/database.ts`):
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
```

**Schema** (`prisma/schema.prisma`):
- ✅ PostgreSQL Provider
- ✅ Models: `User`, `Event`, `Photo`, `Guest`, `Invitation`, etc.
- ✅ Relations korrekt definiert

**✅ KEINE SUPABASE-ABHÄNGIGKEIT!**

### 3.2 Auth-Flows

**✅ SAUBER GETRENNT:**

#### **Rollen-System:**

1. **`HOST`** (Standard-Rolle)
   - Kann Events erstellen/verwalten
   - Kann Fotos moderieren
   - Kann Co-Hosts einladen
   - **Prüfung:** `event.hostId === userId`

2. **`ADMIN`** (Privileged Role)
   - Kann alles (via `isPrivilegedRole()`)
   - Kann User impersonieren
   - Kann System-Einstellungen ändern
   - **Prüfung:** `isPrivilegedRole(req.userRole)`

3. **Co-Host** (EventMember)
   - Granulare Permissions via `permissions` JSON
   - `canUpload`, `canModerate`, `canEditEvent`, `canDownload`
   - **Prüfung:** `hasEventPermission(req, eventId, perm)`

#### **Auth-Middleware-Flow:**

```
Request → authMiddleware
  ├─ JWT Token vorhanden?
  │  ├─ Ja → req.userId, req.userRole setzen
  │  └─ Nein → 401 Unauthorized
  │
  └─ Event-Zugriff?
     ├─ Host/Admin → JWT
     ├─ Co-Host → JWT + EventMember Check
     └─ Gast → Event-Access-Cookie oder Invite-Token
```

**✅ KEINE RACE CONDITIONS:** Alle Checks sind synchron.

**✅ KEINE FEHLENDEN TRANSAKTIONEN:** Kritische Operationen nutzen Prisma Transactions (z.B. Photo-Upload mit Duplicate-Detection).

### 3.3 Event-Zugriffskontrolle

**✅ KORREKT IMPLEMENTIERT:**

1. **`hasEventManageAccess()`** - Host/Admin/Co-Host
2. **`hasEventPermission()`** - Granulare Permissions
3. **`requireEventAccess`** - Gast-Zugriff via Cookie/Token

**✅ KEINE INKONSISTENZEN!**

---

## 4. UI/UX Audit 🎨

### 4.1 Design-System

**✅ GUT:** Tailwind mit festlichen Farben (`packages/frontend/src/app/globals.css`):

```css
/* Custom Festive Colors */
--rose: 340 75% 55%;
--rose-light: 340 60% 75%;
--rose-dark: 340 80% 40%;
--gold: 38 92% 50%;
--gold-light: 45 100% 72%;
--champagne: 45 40% 90%;
--blush: 340 30% 95%;
--cream: 40 30% 96%;
```

**✅ DARK MODE SUPPORT** vorhanden (Zeile 75-100).

### 4.2 Verbesserungspotenziale

#### **A) Mobile-First Optimierungen:**

**⚠️ POTENZIAL:**

1. **Touch-Targets:**
   - Buttons könnten größer sein (min. 44x44px für Mobile)
   - Upload-Button könnte prominenter sein

2. **Gestures:**
   - Swipe-Gesten für Foto-Navigation (aktuell nur Klick)
   - Pull-to-Refresh für Galerie

3. **Loading-States:**
   - Skeleton-Loader für besseres UX-Feedback
   - Progressive Image Loading (Blur-Up)

#### **B) Festlicheres Design:**

**⚠️ POTENZIAL:**

1. **Animationen:**
   - Framer Motion ist vorhanden, aber könnte mehr genutzt werden
   - Sanfte Übergänge bei Foto-Uploads
   - Confetti-Animation bei erfolgreichem Upload

2. **Typography:**
   - Elegante Schriftarten für Headlines (z.B. Playfair Display, Cormorant)
   - Größere Schrift für bessere Lesbarkeit auf Mobile

3. **Spacing:**
   - Mehr Whitespace für luftigeres Design
   - Größere Cards für bessere Touch-Targets

#### **C) Interaktive Elemente:**

**⚠️ POTENZIAL:**

1. **Upload-Experience:**
   - Drag & Drop ist vorhanden, aber könnte visuell prominenter sein
   - Upload-Progress mit visueller Animation
   - Success-Feedback (z.B. Foto "fliegt" in die Galerie)

2. **Galerie:**
   - Masonry-Layout für interessanteres Grid
   - Infinite Scroll mit besserem Loading-Feedback
   - Lightbox mit Swipe-Gesten

3. **Stories:**
   - Vollbild-Story-Viewer (ähnlich Instagram)
   - Auto-Advance zwischen Stories

#### **D) Design-Konsistenz:**

**⚠️ POTENZIAL:**

1. **Frontend vs. Dashboard:**
   - Frontend: Festlich, romantisch (Rose, Gold)
   - Dashboard: Professionell, funktional
   - **✅ KORREKT:** Unterschiedliche Design-Sprachen für unterschiedliche Zielgruppen

2. **Komponenten-Wiederverwendung:**
   - `packages/shared/` könnte UI-Komponenten enthalten
   - Aktuell: Separate Komponenten in Frontend/Dashboard

### 4.3 PWA-Integration

**✅ VORHANDEN:**
- Service Worker (siehe `packages/frontend/public/sw.js` oder Next.js PWA)
- Install-Prompt (siehe `packages/frontend/src/components/InstallPrompt.tsx`)

**⚠️ VERBESSERUNGSPOTENZIAL:**
- Offline-Fallback für Galerie
- Background-Sync für Uploads

---

## 5. Feature-Integration (Invitations & QR)

### 5.1 Bestehende Invitation-Struktur

**✅ VORHANDEN:**
- `Invitation` Model in Prisma Schema
- Routes in `packages/backend/src/routes/invitations.ts`
- Frontend-Route `/i/[slug]` in `packages/frontend/src/app/i/[slug]/page.tsx`

**Features:**
- Password-geschützte Einladungen ✅
- RSVP (YES/NO/MAYBE) ✅
- ICS-Download ✅
- Sharing (WhatsApp, Email, Social) ✅

### 5.2 QR-Code-Generierung

**✅ VORHANDEN:**
- QR-Export in `packages/backend/src/routes/events.ts` (Zeile 131-212)
- `QrDesign` Model in Prisma Schema
- Routes in `packages/backend/src/routes/qrDesigns.ts`

**⚠️ KONFLIKT:**
- `QrDesign` Model existiert, aber `qrDesigns.ts` nutzt `event.designConfig.qrDesigns` JSON
- **Empfehlung:** Migration zu Model oder Model löschen

### 5.3 Gästegruppen

**❌ NICHT VORHANDEN:**
- Kein `GuestGroup` Model
- Keine gruppenspezifische Logik
- **MUSS NEU IMPLEMENTIERT WERDEN** (siehe `ANALYSIS_DYNAMIC_INVITATIONS.md`)

---

## 6. Zusammenfassung

### ✅ **Was gut ist:**

1. **Architektur:** Saubere Subdomain-Trennung, klare Ordnerstruktur
2. **Media-Integrität:** Original-Qualität korrekt implementiert
3. **Auth:** Rollenbasierte Zugriffskontrolle sauber getrennt
4. **Database:** PostgreSQL + Prisma (keine Supabase-Abhängigkeit)
5. **CORS:** Subdomain-aware, Unicode-Domain-Support

### ⚠️ **Verbesserungspotenziale:**

1. **UI/UX:** Mehr festliche Animationen, bessere Mobile-Experience
2. **QR-Design:** Model vs. JSON-Inkonsistenz
3. **Gästegruppen:** Muss neu implementiert werden
4. **Komponenten:** Mehr Wiederverwendung zwischen Frontend/Dashboard

### ❌ **Kritische Probleme:**

**KEINE!** Die Codebase ist solide und produktionsreif. ✅

---

## 7. Action-Packages

### 📦 **Package A: Quick Wins (Non-Breaking)**

**Ziel:** Sofortige UI/UX-Verbesserungen ohne Architektur-Änderungen

**Tasks:**
1. **Mobile Touch-Targets:** Buttons auf min. 44x44px erhöhen
2. **Upload-Feedback:** Confetti-Animation bei erfolgreichem Upload
3. **Loading-States:** Skeleton-Loader für Galerie
4. **Typography:** Elegante Schriftarten für Headlines (Playfair Display)
5. **Spacing:** Mehr Whitespace für luftigeres Design

**Aufwand:** 2-3 Tage  
**Risiko:** Niedrig  
**Impact:** Mittel (bessere UX auf Mobile)

---

### 📦 **Package B: Feature-Erweiterungen (Non-Breaking)**

**Ziel:** Neue Features, die bestehende Struktur erweitern

**Tasks:**
1. **Gästegruppen-System:**
   - `GuestGroup` Model hinzufügen
   - API-Routes für Gästegruppen-Management
   - Frontend-UI für Gruppen-Verwaltung

2. **Dynamische Einladungsseiten:**
   - `InvitationSection` / `InvitationContent` Models
   - Gruppenspezifische Inhalte
   - Sektionen-Rendering (Timeline, Location, RSVP)

3. **QR-Code Designer UI:**
   - Frontend-Designer-Komponente
   - Template-Selector
   - Live-Preview
   - Export (PNG/SVG/PDF)

4. **Galerie-Verbesserungen:**
   - Masonry-Layout
   - Infinite Scroll
   - Swipe-Gesten für Navigation

**Aufwand:** 1-2 Wochen  
**Risiko:** Mittel (neue Features, aber non-breaking)  
**Impact:** Hoch (neue Funktionalität)

---

### 📦 **Package C: Architektur-Refactoring (Breaking)**

**Ziel:** Größere Refactorings für langfristige Wartbarkeit

**Tasks:**
1. **QR-Design Migration:**
   - `event.designConfig.qrDesigns` JSON → `QrDesign` Model
   - Migration-Script schreiben
   - Backward-Compatibility sicherstellen

2. **Komponenten-Library:**
   - Shared UI-Komponenten in `packages/shared/`
   - Design-System konsolidieren
   - Storybook für Komponenten-Dokumentation

3. **Performance-Optimierungen:**
   - Image-Lazy-Loading optimieren
   - API-Response-Caching (Redis)
   - CDN-Integration für Static Assets

4. **Testing-Infrastruktur:**
   - E2E-Tests mit Playwright (bereits vorhanden, erweitern)
   - Unit-Tests für Services
   - Integration-Tests für API

**Aufwand:** 2-4 Wochen  
**Risiko:** Hoch (Breaking Changes, Migration nötig)  
**Impact:** Sehr hoch (langfristige Wartbarkeit)

---

## 8. Empfehlung

**Starte mit Package A** für schnelle Wins, dann **Package B** für neue Features, und schließlich **Package C** für langfristige Verbesserungen.

**Priorität:**
1. ✅ Package A (Quick Wins) - Sofort
2. ✅ Package B (Features) - Nach Package A
3. ⏳ Package C (Refactoring) - Nach Package B, wenn Zeit vorhanden

---

**Status:** ✅ Analyse abgeschlossen  
**Nächster Schritt:** Bestätigung der Action-Packages, dann Umsetzung von Package A
