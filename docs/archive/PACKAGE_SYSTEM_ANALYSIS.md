# 📦 Paket-System Analyse (Opus-Level)

**Datum:** 2026-01-11  
**Status:** ✅ IMPLEMENTIERT (Phase 1-3)  
**Basis:** Screenshot Feature-Matrix + Code-Analyse

---

## 🚀 IMPLEMENTIERUNGSSTATUS

| Phase | Beschreibung | Status |
|-------|--------------|--------|
| **Phase 1** | Schema-Migration + 7 Pakete geseeded | ✅ Fertig |
| **Phase 2** | Feature-Gate Service (`featureGate.ts`) | ✅ Fertig |
| **Phase 3** | Package-Info Endpoint + Video Gate | ✅ Fertig |
| **Phase 4** | Admin Dashboard UI erweitern | 🔜 Ausstehend |
| **Phase 5** | Co-Host UI + weitere Gates | 🔜 Ausstehend |

### Neue Dateien
- `packages/backend/src/services/featureGate.ts` - Feature-Gate Service
- `packages/backend/prisma/seed-packages.ts` - Seed-Script für Pakete
- `packages/backend/prisma/migrations/20260111021804_add_package_feature_flags/` - Migration

### Geänderte Dateien
- `packages/backend/prisma/schema.prisma` - PackageDefinition erweitert (20+ neue Felder)
- `packages/backend/src/routes/events.ts` - Package-Info Endpoint hinzugefügt
- `packages/backend/src/routes/videos.ts` - Video Upload Feature-Gate hinzugefügt

---

## 1. Feature-Matrix aus Screenshot

### Pakete: Free → Basic → Smart → Premium

| Feature | Free (0€) | Basic (29€) | Smart (59€) | Premium (89€) |
|---------|-----------|-------------|-------------|---------------|
| **Foto Upload** | ✅ | ✅ | ✅ | ✅ |
| **Video Upload** | ❌ | ❌ | ❌ | ✅ |
| **Stories** | ❌ | ❌ | ✅ | ✅ |
| **Passwortschutz** | ❌ | ✅ | ✅ | ✅ |
| **Alben/Kategorien** | 1 | 1 | 3 | Unbegrenzt |
| **Gästebuch** | ❌ | ❌ | ❌ | ✅ |
| **Download einzeln** | ✅ | ✅ | ✅ | ✅ |
| **Download .zip** | ❌ | ✅ (Max. 200) | ✅ | ✅ |
| **Social Sharing** | ✅ | ✅ | ✅ | ✅ |
| **Bulk Operation** | ❌ | ❌ | ✅ | ✅ |
| **Werbefrei** | ❌ | ❌ | ✅ | ✅ |
| **Live Wall** | ❌ | ❌ | ✅ | ✅ |
| **Finde meine Fotos** | ❌ | ❌ | ✅ | ✅ |
| **Challenge** | ❌ | ❌ | 3 | Unbegrenzt |
| **Gästeliste** | ❌ | ❌ | ❌ | ✅ |
| **Speicherplatz** | 50 Fotos | 200 Fotos | Unbegrenzt | Unbegrenzt |
| **QR Code Designer** | ✅ | ✅ | ✅ | ✅ |
| **Online Laufzeit** | 14 Tage | 1 Monat | 6 Monate | 1 Jahr |
| **Einladungsseite** | Beschränkt | Beschränkt | ✅ | ✅ |
| **Co-Host** | ? | ? | ? | ✅ (Empfehlung) |

---

## 2. Aktueller Code-Stand

### 2.1 PackageDefinition Schema (MINIMAL)

```prisma
model PackageDefinition {
  id                String   @id @default(uuid())
  sku               String   @unique
  name              String
  type              PackageDefinitionType @default(BASE)
  resultingTier     String
  upgradeFromTier   String?
  storageLimitBytes BigInt?              // ✅ Implementiert
  storageDurationDays Int?               // ✅ Implementiert
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

**Problem:** Nur `storageLimitBytes` und `storageDurationDays` werden genutzt. Alle anderen Features (Video, Stories, Challenges, etc.) haben KEINE Paket-Einschränkung!

### 2.2 Event featuresConfig (TEILWEISE)

```prisma
featuresConfig Json @default("{
  \"showGuestlist\": false,
  \"mysteryMode\": false,
  \"allowUploads\": true,
  \"moderationRequired\": false,
  \"allowDownloads\": true
}")
```

**Problem:** Diese Flags werden PRO EVENT gesetzt, nicht basierend auf PAKET!

### 2.3 Backend Routes (EXISTIEREN, aber ohne Paket-Prüfung)

| Route | File | Paket-Prüfung? |
|-------|------|----------------|
| Videos | `videos.ts` (326 matches) | ❌ KEINE |
| Stories | `stories.ts` (69 matches) | ❌ KEINE |
| Challenges | `challenges.ts` (116 matches) | ❌ KEINE |
| Guestbook | `guestbook.ts` (63 matches) | ❌ KEINE |
| Categories | `categories.ts` (45 matches) | ❌ KEINE |
| Invitations | `invitations.ts` (126 matches) | ❌ KEINE |
| FaceSearch | `faceSearch.ts` (8 matches) | ❌ KEINE |
| Photos | `photos.ts` | ✅ Storage-Limit |

### 2.4 Co-Host Feature (EXISTIERT)

```prisma
model EventMember {
  id          String          @id @default(uuid())
  eventId     String
  userId      String
  role        EventMemberRole @default(COHOST)
  permissions Json            @default("{}")
  // ...
}

enum EventMemberRole {
  COHOST
}
```

**Status:** Schema existiert, aber:
- ❌ Keine UI im Frontend für Co-Host Management
- ❌ Keine Paket-Einschränkung (alle können Co-Hosts hinzufügen)
- ✅ Backend-Logik für Permissions existiert teilweise

---

## 3. Gap-Analyse: Was FEHLT?

### 3.1 Schema-Erweiterung für PackageDefinition

**ALLE Features aus Screenshot müssen in PackageDefinition definiert werden:**

```prisma
model PackageDefinition {
  id                    String   @id @default(uuid())
  sku                   String   @unique
  name                  String
  type                  PackageDefinitionType @default(BASE)
  resultingTier         String
  upgradeFromTier       String?
  isActive              Boolean  @default(true)
  
  // === STORAGE & DURATION ===
  storageLimitBytes     BigInt?              // null = unlimited
  storageLimitPhotos    Int?                 // Alternative: Foto-Anzahl statt Bytes
  storageDurationDays   Int?                 // Online-Laufzeit
  
  // === FEATURE FLAGS ===
  allowVideoUpload      Boolean  @default(false)
  allowStories          Boolean  @default(false)
  allowPasswordProtect  Boolean  @default(false)
  allowGuestbook        Boolean  @default(false)
  allowZipDownload      Boolean  @default(false)
  allowBulkOperations   Boolean  @default(false)
  allowLiveWall         Boolean  @default(false)
  allowFaceSearch       Boolean  @default(false)  // "Finde meine Fotos"
  allowGuestlist        Boolean  @default(false)
  allowFullInvitation   Boolean  @default(false)  // Nicht-beschränkte Einladungsseite
  isAdFree              Boolean  @default(false)  // Werbefrei
  
  // === LIMITS ===
  maxCategories         Int?                 // null = unlimited
  maxChallenges         Int?                 // null = unlimited
  maxZipDownloadPhotos  Int?                 // z.B. 200 für Basic
  maxCoHosts            Int?                 // Empfehlung: 0/1/3/unlimited
  
  // === METADATA ===
  displayOrder          Int      @default(0)
  priceEur              Decimal? @db.Decimal(10, 2)  // Für Anzeige
  description           String?  @db.Text
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

### 3.2 Feature-Gate Middleware/Service

**NEUE Datei:** `packages/backend/src/services/featureGate.ts`

```typescript
import { getEffectiveEventPackage } from './packageLimits';
import prisma from '../config/database';

export type FeatureKey =
  | 'videoUpload'
  | 'stories'
  | 'passwordProtect'
  | 'guestbook'
  | 'zipDownload'
  | 'bulkOperations'
  | 'liveWall'
  | 'faceSearch'
  | 'guestlist'
  | 'fullInvitation'
  | 'adFree';

export type LimitKey =
  | 'maxCategories'
  | 'maxChallenges'
  | 'maxZipDownloadPhotos'
  | 'maxCoHosts';

export async function isFeatureEnabled(
  eventId: string,
  feature: FeatureKey
): Promise<boolean> {
  const { packageDefinition, isFree } = await getEffectiveEventPackage(eventId);
  
  if (isFree) {
    // Free tier: nur Basis-Features
    return ['photoUpload', 'singleDownload', 'socialSharing', 'qrDesigner'].includes(feature);
  }
  
  const pkg = await prisma.packageDefinition.findFirst({
    where: { sku: packageDefinition.sku, isActive: true },
  });
  
  if (!pkg) return false;
  
  const featureMap: Record<FeatureKey, keyof typeof pkg> = {
    videoUpload: 'allowVideoUpload',
    stories: 'allowStories',
    passwordProtect: 'allowPasswordProtect',
    guestbook: 'allowGuestbook',
    zipDownload: 'allowZipDownload',
    bulkOperations: 'allowBulkOperations',
    liveWall: 'allowLiveWall',
    faceSearch: 'allowFaceSearch',
    guestlist: 'allowGuestlist',
    fullInvitation: 'allowFullInvitation',
    adFree: 'isAdFree',
  };
  
  return pkg[featureMap[feature]] === true;
}

export async function getFeatureLimit(
  eventId: string,
  limit: LimitKey
): Promise<number | null> {
  const { packageDefinition } = await getEffectiveEventPackage(eventId);
  
  const pkg = await prisma.packageDefinition.findFirst({
    where: { sku: packageDefinition.sku, isActive: true },
  });
  
  if (!pkg) return 0; // Free tier defaults
  
  return pkg[limit] ?? null; // null = unlimited
}

export async function assertFeatureEnabled(
  eventId: string,
  feature: FeatureKey
): Promise<void> {
  const enabled = await isFeatureEnabled(eventId, feature);
  
  if (!enabled) {
    const err: any = new Error(`Feature "${feature}" not available in current package`);
    err.code = 'FEATURE_NOT_AVAILABLE';
    err.httpStatus = 403;
    err.details = { eventId, feature };
    throw err;
  }
}

export async function assertWithinLimit(
  eventId: string,
  limit: LimitKey,
  currentCount: number
): Promise<void> {
  const max = await getFeatureLimit(eventId, limit);
  
  if (max !== null && currentCount >= max) {
    const err: any = new Error(`Limit "${limit}" reached (${currentCount}/${max})`);
    err.code = 'LIMIT_REACHED';
    err.httpStatus = 403;
    err.details = { eventId, limit, currentCount, max };
    throw err;
  }
}
```

### 3.3 Route-Integration

**Beispiel: videos.ts erweitern**

```typescript
import { assertFeatureEnabled } from '../services/featureGate';

router.post('/events/:id/videos/upload', async (req, res) => {
  const eventId = req.params.id;
  
  // NEU: Feature-Gate prüfen
  await assertFeatureEnabled(eventId, 'videoUpload');
  
  // ... bestehende Upload-Logik
});
```

### 3.4 Frontend Package-Info Endpoint

**NEUER Endpoint:** `GET /api/events/:id/package-info`

```typescript
router.get('/events/:id/package-info', async (req, res) => {
  const eventId = req.params.id;
  const pkg = await getEffectiveEventPackage(eventId);
  const pkgDef = await prisma.packageDefinition.findFirst({
    where: { sku: pkg.packageDefinition.sku },
  });
  
  res.json({
    tier: pkg.packageDefinition.resultingTier,
    name: pkgDef?.name || 'Free',
    features: {
      videoUpload: pkgDef?.allowVideoUpload ?? false,
      stories: pkgDef?.allowStories ?? false,
      // ... alle Features
    },
    limits: {
      storage: pkg.packageDefinition.storageLimitBytes,
      duration: pkg.packageDefinition.storageDurationDays,
      categories: pkgDef?.maxCategories ?? 1,
      challenges: pkgDef?.maxChallenges ?? 0,
      coHosts: pkgDef?.maxCoHosts ?? 0,
    },
    usage: await getEventUsageBreakdown(eventId),
  });
});
```

---

## 4. Co-Host Feature Status

### 4.1 Aktueller Stand

**Schema:** ✅ Existiert (`EventMember` mit `COHOST` role)

**Backend:**
- ✅ Prisma Model existiert
- ❓ API Endpoints für Co-Host Management?

**Frontend:**
- ✅ Dashboard referenziert `member` (64 matches)
- ❓ UI für Co-Host hinzufügen/entfernen?

### 4.2 Empfehlung für Co-Host pro Paket

| Paket | Max Co-Hosts | Empfehlung |
|-------|--------------|------------|
| Free | 0 | Keine Co-Hosts |
| Basic | 1 | 1 Co-Host |
| Smart | 3 | 3 Co-Hosts |
| Premium | Unbegrenzt | null (unlimited) |

### 4.3 Co-Host Implementierung

**Backend Endpoints:**
```
POST   /api/events/:id/members     - Co-Host einladen
GET    /api/events/:id/members     - Co-Hosts auflisten
DELETE /api/events/:id/members/:userId - Co-Host entfernen
PATCH  /api/events/:id/members/:userId - Permissions ändern
```

**Permissions JSON:**
```json
{
  "canUpload": true,
  "canModerate": true,
  "canEditEvent": false,
  "canInviteGuests": true,
  "canViewStatistics": false,
  "canDownloadAll": true
}
```

---

## 5. Empfehlungen für zusätzliche Features

### 5.1 Nicht im Screenshot, aber sinnvoll

| Feature | Beschreibung | Paket |
|---------|--------------|-------|
| **Co-Host** | Event mit anderen teilen | Smart/Premium |
| **Statistiken** | Erweiterte Event-Analytics | Smart/Premium |
| **Custom Branding** | Eigenes Logo, Farben | Smart/Premium |
| **API Zugang** | Für Fotografen-Integration | Premium |
| **Priority Support** | Schnellere Reaktionszeit | Premium |
| **White Label** | Keine "Gästefotos" Branding | Enterprise? |
| **Multi-Event** | Mehrere Events gleichzeitig | Premium |
| **Photo Slideshow** | Automatische Slideshow | Smart/Premium |
| **Audio Messages** | Sprachnachrichten im Gästebuch | Premium |
| **Export Guestbook** | PDF Export des Gästebuchs | Smart/Premium |

### 5.2 Technische Empfehlungen

1. **Caching für Package-Info**
   - Package-Definition ändert sich selten
   - Redis/Memory Cache für `isFeatureEnabled()`
   - TTL: 5 Minuten

2. **Graceful Degradation**
   - Bei Paket-Downgrade: Features deaktivieren, aber Daten behalten
   - Warnung an Host: "Upgrade für Feature X"

3. **Upgrade-Prompts**
   - Frontend zeigt "🔒 Premium Feature" bei deaktivierten Features
   - Link zu Upgrade-Seite auf gästefotos.com

4. **Trial/Demo Mode**
   - 7 Tage Premium-Features testen
   - Wasserzeichen auf Downloads während Trial

---

## 6. Implementierungsplan

### Phase 1: Schema-Migration (1-2h)

1. **PackageDefinition Schema erweitern**
   - Alle Feature-Flags hinzufügen
   - Prisma migration erstellen
   - Seed-Daten für Free/Basic/Smart/Premium

2. **Admin Dashboard erweitern**
   - UI für alle neuen Felder in `/packages`
   - Feature-Toggles als Checkboxen

### Phase 2: Feature-Gate Service (2-3h)

1. **featureGate.ts Service erstellen**
   - `isFeatureEnabled()`
   - `getFeatureLimit()`
   - `assertFeatureEnabled()`

2. **Package-Info Endpoint**
   - `GET /api/events/:id/package-info`
   - Inkl. Usage-Breakdown

### Phase 3: Route-Integration ✅ FERTIG

1. **Video Upload Gate** ✅
   - `assertFeatureEnabled(eventId, 'videoUpload')`
   - Route: `packages/backend/src/routes/videos.ts:358`

2. **Stories Gate** ✅
   - `assertFeatureEnabled(eventId, 'stories')`
   - Route: `packages/backend/src/routes/stories.ts:136`

3. **Challenges Limit** ✅
   - `assertWithinLimit(eventId, 'maxChallenges', count)`
   - Route: `packages/backend/src/routes/challenges.ts:128`

4. **Categories Limit** ✅
   - `assertWithinLimit(eventId, 'maxCategories', count)`
   - Route: `packages/backend/src/routes/categories.ts:141`

5. **Guestbook Gate** ✅
   - `assertFeatureEnabled(eventId, 'guestbook')`
   - Route: `packages/backend/src/routes/guestbook.ts:390`

6. **FaceSearch Gate** ✅
   - `assertFeatureEnabled(eventId, 'faceSearch')`
   - Route: `packages/backend/src/routes/faceSearch.ts:387`

7. **Co-Host Gate + Limit** 🔜 TODO
   - `assertFeatureEnabled(eventId, 'coHosts')`
   - `assertWithinLimit(eventId, 'maxCoHosts', count)`
   - Route: `packages/backend/src/routes/eventMembers.ts` (noch nicht implementiert)

### Phase 4: Frontend Integration (2-3h)

1. **Package-Info Hook**
   - `usePackageInfo(eventId)` Hook
   - Feature-Flags im Context

2. **Feature-Locked UI**
   - Disabled State für gesperrte Features
   - Upgrade-Prompts
   - "🔒 Premium" Badges

3. **Host Dashboard**
   - "Mein Paket" Sektion
   - Usage-Anzeige (Storage, etc.)
   - Upgrade-Button

### Phase 5: Co-Host UI (2-3h)

1. **Co-Host Management Page**
   - Liste der Co-Hosts
   - Einladen per E-Mail
   - Permissions bearbeiten
   - Entfernen

2. **Co-Host Dashboard Access**
   - Co-Host kann Event sehen
   - Permissions-basierte UI

---

## 7. Datenbank Seed für Pakete

```typescript
// prisma/seed.ts
const packages = [
  {
    sku: 'free',
    name: 'Free',
    type: 'BASE',
    resultingTier: 'FREE',
    storageLimitPhotos: 50,
    storageDurationDays: 14,
    allowVideoUpload: false,
    allowStories: false,
    allowPasswordProtect: false,
    allowGuestbook: false,
    allowZipDownload: false,
    allowBulkOperations: false,
    allowLiveWall: false,
    allowFaceSearch: false,
    allowGuestlist: false,
    allowFullInvitation: false,
    isAdFree: false,
    maxCategories: 1,
    maxChallenges: 0,
    maxCoHosts: 0,
    priceEur: 0,
    displayOrder: 1,
  },
  {
    sku: 'basic',
    name: 'Basic',
    type: 'BASE',
    resultingTier: 'BASIC',
    storageLimitPhotos: 200,
    storageDurationDays: 30,
    allowVideoUpload: false,
    allowStories: false,
    allowPasswordProtect: true,
    allowGuestbook: false,
    allowZipDownload: true,
    allowBulkOperations: false,
    allowLiveWall: false,
    allowFaceSearch: false,
    allowGuestlist: false,
    allowFullInvitation: false,
    isAdFree: false,
    maxCategories: 1,
    maxChallenges: 0,
    maxZipDownloadPhotos: 200,
    maxCoHosts: 1,
    priceEur: 29,
    displayOrder: 2,
  },
  {
    sku: 'smart',
    name: 'Smart',
    type: 'BASE',
    resultingTier: 'SMART',
    storageLimitPhotos: null, // Unbegrenzt
    storageDurationDays: 180,
    allowVideoUpload: false,
    allowStories: true,
    allowPasswordProtect: true,
    allowGuestbook: false,
    allowZipDownload: true,
    allowBulkOperations: true,
    allowLiveWall: true,
    allowFaceSearch: true,
    allowGuestlist: false,
    allowFullInvitation: true,
    isAdFree: true,
    maxCategories: 3,
    maxChallenges: 3,
    maxCoHosts: 3,
    priceEur: 59,
    displayOrder: 3,
  },
  {
    sku: 'premium',
    name: 'Premium',
    type: 'BASE',
    resultingTier: 'PREMIUM',
    storageLimitPhotos: null,
    storageDurationDays: 365,
    allowVideoUpload: true,
    allowStories: true,
    allowPasswordProtect: true,
    allowGuestbook: true,
    allowZipDownload: true,
    allowBulkOperations: true,
    allowLiveWall: true,
    allowFaceSearch: true,
    allowGuestlist: true,
    allowFullInvitation: true,
    isAdFree: true,
    maxCategories: null, // Unbegrenzt
    maxChallenges: null,
    maxCoHosts: null,
    priceEur: 89,
    displayOrder: 4,
  },
];
```

---

## 8. WooCommerce SKU Mapping

**WooCommerce Produkte müssen diese SKUs haben:**

| Produkt | SKU | Preis |
|---------|-----|-------|
| Free (Auto) | `free` | 0€ |
| Basic Paket | `basic` | 29€ |
| Smart Paket | `smart` | 59€ |
| Premium Paket | `premium` | 89€ |
| Basic → Smart Upgrade | `upgrade-basic-smart` | 30€ |
| Basic → Premium Upgrade | `upgrade-basic-premium` | 60€ |
| Smart → Premium Upgrade | `upgrade-smart-premium` | 30€ |

---

## 9. Nächste Schritte

**Empfehlung:** Mit Phase 1 (Schema-Migration) starten, dann iterativ die anderen Phasen.

**Geschätzte Gesamtzeit:** 10-15 Stunden

**Priorität:**
1. 🔴 Schema-Migration (Basis für alles)
2. 🔴 Feature-Gate Service
3. 🟡 Route-Integration (Video, Stories, Challenges)
4. 🟡 Frontend Package-Info
5. 🟢 Co-Host UI
6. 🟢 Admin Dashboard Erweiterung

---

**Diese Analyse dient als Grundlage für die Implementierung des vollständigen Paket-Systems.** 📦
