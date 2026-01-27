# 🎯 Vollständiger Implementierungsplan: Optionen 1+2+3

**Startzeit:** 23. Januar 2026, 23:50 Uhr  
**Ziel:** Fehlerfreie Implementierung aller 3 Optionen kombiniert  
**Strategie:** Hoch achtsam, genau, systematisch

---

## ✅ Phase 0: Type-Safety & Build (ABGESCHLOSSEN)

### 0.1 Frontend Type-Errors ✅
- Import für `triggerUploadConfetti` behoben
- Build-Ready: Exit Code 0

### 0.2 Backend Type-Errors ✅  
- `moderationStatus` → `status` (APPROVED)
- `fileSize` → `sizeBytes` (BigInt)
- `uploadedAt` → `createdAt`
- `sortOrder` → `order`
- `filename/originalFilename` → `storagePath`
- `metadata/takenAt` → `exifData/createdAt`
- FFmpeg callbacks typisiert (`err: Error`, `metadata: any`, `progress: any`)

---

## 🚀 Phase 1: Deployment-Prep (Option 1)

### 1.1 Build-Tests
```bash
pnpm --filter @gaestefotos/frontend build
pnpm --filter @gaestefotos/backend build
```

### 1.2 Qualitäts-Checks
- ✅ Type-Check: Frontend + Backend
- ⏳ ESLint: Keine kritischen Warnungen
- ⏳ Unit-Tests: Bestehende Tests laufen

### 1.3 Deployment-Dokumentation
- Deployment-Guide aktualisieren
- Changelog für Quick Wins (A + B.2)
- Migration Notes (falls nötig)

---

## ⚡ Phase 2: Performance-Optimierungen (Option 2 - C.1)

**Aufwand:** ~16 Stunden  
**Priorität:** Hoch (geringes Risiko, hoher Nutzen)

### 2.1 Redis-Caching (6h)

**Backend:**
```typescript
// packages/backend/src/services/cache/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function cacheSet(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}
```

**Caching-Strategie:**
- Event-Daten: 5 Minuten
- Galerie-Fotos: 2 Minuten  
- Statistiken: 10 Minuten
- QR-Designs: 30 Minuten

**Invalidierung:**
- Bei Photo-Upload: `event:${eventId}:photos:*`
- Bei Event-Update: `event:${eventId}:*`
- Bei QR-Update: `event:${eventId}:qr:*`

### 2.2 Image-Optimization (4h)

**Next.js Image-Component:**
```tsx
// packages/frontend/src/components/OptimizedImage.tsx
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

export function OptimizedImage({ 
  src, alt, width, height, priority = false, className 
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width || 800}
      height={height || 600}
      quality={85}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      className={className}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
```

**Backend Image-Pipeline:**
- WebP-Konvertierung (Sharp)
- Responsive Breakpoints (320, 640, 1280, 1920px)
- Progressive JPEG
- EXIF-Stripping (Privacy)

### 2.3 CDN-Integration (3h)

**Cloudflare CDN:**
```typescript
// packages/backend/src/config/cdn.ts
export const CDN_CONFIG = {
  enabled: process.env.CDN_ENABLED === 'true',
  domain: process.env.CDN_DOMAIN || 'cdn.gaestefotos.com',
  cacheControl: {
    images: 'public, max-age=31536000, immutable',
    videos: 'public, max-age=31536000, immutable',
    assets: 'public, max-age=604800',
  },
};

export function getCdnUrl(path: string): string {
  if (!CDN_CONFIG.enabled) return path;
  return `https://${CDN_CONFIG.domain}/${path}`;
}
```

**Cache-Headers:**
```typescript
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
res.setHeader('CDN-Cache-Control', 'max-age=31536000');
```

### 2.4 Database Query Optimization (3h)

**Prisma Optimizations:**
```typescript
// Verwende select statt findMany für große Listen
const photos = await prisma.photo.findMany({
  select: {
    id: true,
    url: true,
    storagePath: true,
    // Nur benötigte Felder
  },
  take: 50, // Pagination
  skip: offset,
});

// Index-Nutzung prüfen
await prisma.$queryRaw`EXPLAIN ANALYZE SELECT...`;
```

**Neue Indices (falls nötig):**
```prisma
@@index([eventId, status, createdAt])
@@index([eventId, categoryId, status])
```

---

## 👥 Phase 3: Gästegruppen-System (Option 3 - B.3)

**Aufwand:** ~9 Stunden  
**Risiko:** Mittel (DB Schema Changes)

### 3.1 Database Schema (2h)

**Neue Models:**
```prisma
model GuestGroup {
  id          String   @id @default(uuid())
  eventId     String
  name        String
  description String?
  color       String?  // Hex-Color für UI
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  guests      Guest[]
  
  @@index([eventId])
  @@map("guest_groups")
}

// Guest Model erweitern
model Guest {
  // ... existing fields
  groupId     String?
  group       GuestGroup? @relation(fields: [groupId], references: [id], onDelete: SetNull)
  
  @@index([groupId])
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_guest_groups
npx prisma generate
```

### 3.2 Backend API (3h)

**Routes:**
```typescript
// GET /api/events/:id/guest-groups
// POST /api/events/:id/guest-groups
// PUT /api/events/:id/guest-groups/:groupId
// DELETE /api/events/:id/guest-groups/:groupId
// PUT /api/events/:id/guests/:guestId/group (assign)
```

**Service:**
```typescript
// packages/backend/src/services/guestGroups.ts
export async function createGuestGroup(
  eventId: string,
  data: { name: string; description?: string; color?: string }
) {
  const maxOrder = await prisma.guestGroup.findFirst({
    where: { eventId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  
  return prisma.guestGroup.create({
    data: {
      eventId,
      ...data,
      order: (maxOrder?.order || 0) + 1,
    },
  });
}
```

### 3.3 Frontend UI (4h)

**Komponenten:**
```typescript
// packages/frontend/src/components/GuestGroupManager.tsx
- GuestGroupList (Sidebar)
- GuestGroupForm (Create/Edit)
- GuestAssignment (Drag & Drop)
- GuestGroupBadge (Color-coded)
```

**Features:**
- Gruppen erstellen/bearbeiten/löschen
- Farben zuweisen
- Gäste per Drag & Drop zuordnen
- Bulk-Assignment
- Gruppenfilter in Gästeliste

---

## 📨 Phase 4: Dynamische Einladungen (Option 3 - B.4)

**Aufwand:** ~16 Stunden  
**Risiko:** Mittel (abhängig von B.3)

### 4.1 Database Schema (3h)

**Neue Models:**
```prisma
model InvitationSection {
  id             String   @id @default(uuid())
  invitationId   String
  type           SectionType
  title          String?
  content        Json?    // Rich Content
  order          Int      @default(0)
  isVisible      Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  invitation     Invitation @relation(fields: [invitationId], references: [id], onDelete: Cascade)
  groupAccess    SectionGroupAccess[]
  
  @@index([invitationId])
  @@index([order])
  @@map("invitation_sections")
}

model SectionGroupAccess {
  id        String   @id @default(uuid())
  sectionId String
  groupId   String
  
  section   InvitationSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  group     GuestGroup        @relation(fields: [groupId], references: [id], onDelete: Cascade)
  
  @@unique([sectionId, groupId])
  @@index([sectionId])
  @@index([groupId])
  @@map("section_group_access")
}

enum SectionType {
  HEADER
  TEXT
  IMAGE
  VIDEO
  COUNTDOWN
  RSVP
  LOCATION
  AGENDA
  CUSTOM
}
```

### 4.2 Section Editor (8h)

**Drag & Drop Builder:**
```typescript
// packages/frontend/src/components/invitation-editor/
- SectionList (Draggable)
- SectionEditor (Rich Text)
- SectionPreview (Live)
- GroupAccessControl (Checkboxes)
```

**Libraries:**
- `@dnd-kit/core` für Drag & Drop
- `@tiptap/react` für Rich Text
- `framer-motion` für Animationen

### 4.3 Conditional Rendering (3h)

**Backend:**
```typescript
export async function getInvitationForGuest(
  invitationSlug: string,
  guestToken?: string
): Promise<InvitationWithSections> {
  const guest = guestToken ? await getGuestByToken(guestToken) : null;
  const groupId = guest?.groupId;
  
  const sections = await prisma.invitationSection.findMany({
    where: {
      invitationId,
      isVisible: true,
      OR: [
        { groupAccess: { none: {} } }, // Public sections
        { groupAccess: { some: { groupId } } }, // Group-specific
      ],
    },
    orderBy: { order: 'asc' },
  });
  
  return { invitation, sections };
}
```

### 4.4 Templates & Presets (2h)

**Vorgefertigte Templates:**
- Hochzeit (Trauung, Empfang, Party)
- Geburtstag (Timeline, Überraschung)
- Firmenfeier (Agenda, Standorte)

---

## 📋 Phase 5: Testing & Dokumentation

### 5.1 Integration Tests
```typescript
// packages/backend/src/__tests__/integration/guestGroups.test.ts
describe('Guest Groups', () => {
  it('should create group and assign guests', async () => {
    // Test
  });
});
```

### 5.2 E2E Tests
```typescript
// packages/frontend/e2e/guest-groups.spec.ts
test('Host can create guest groups', async ({ page }) => {
  // Playwright test
});
```

### 5.3 Dokumentation
- API-Dokumentation (OpenAPI)
- User-Guide (Laiensicher)
- Migration-Guide
- Performance-Benchmarks

---

## 📊 Erfolgs-Metriken

**Performance:**
- Redis-Cache-Hit-Rate: >80%
- Image-Load-Time: <500ms
- API-Response-Time: <200ms

**Features:**
- Guest-Groups: Funktional
- Dynamic-Invitations: Funktional
- Keine Breaking Changes

**Qualität:**
- Type-Coverage: 100%
- Test-Coverage: >70%
- Zero Critical Bugs

---

**Status:** Phase 0 abgeschlossen ✅  
**Nächster Schritt:** Build-Tests + Phase 2 Performance
