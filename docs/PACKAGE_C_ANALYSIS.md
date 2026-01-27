# Package C: Architektur-Refactoring - Detaillierte Analyse

**Datum:** 23. Januar 2026, 22:55 Uhr  
**Status:** 🔍 In Analyse  
**Risiko:** ⚠️ Hoch (Breaking Changes möglich)

---

## Übersicht

Package C umfasst größere Refactorings für langfristige Wartbarkeit und Performance.

**Aus Architecture Audit:**
1. QR-Design Migration (JSON → Model)
2. Komponenten-Library (Shared UI)
3. Performance-Optimierungen
4. Testing-Infrastruktur

---

## 1. QR-Design Migration

### 🔍 Aktueller Zustand

**Problem aus Architecture Audit (Zeile 430-432):**
```typescript
// KONFLIKT:
// - QrDesign Model existiert
// - qrDesigns.ts Route nutzt event.designConfig JSON statt Model
```

**Code-Analyse:**
```typescript
// packages/backend/src/routes/qrDesigns.ts
// Nutzt: event.designConfig.qrDesigns (JSON Array)

// prisma/schema.prisma
model QrDesign {
  id           String   @id @default(uuid())
  eventId      String   @unique  // ⚠️ Nur 1 Design pro Event!
  templateSlug String?
  // ...
}
```

### ⚠️ Kernproblem

**Inkonsistenz:**
- Backend speichert QR-Designs in `event.designConfig` (JSON)
- Prisma Model `QrDesign` existiert, wird aber NICHT genutzt
- Model hat `eventId @unique` → nur 1 Design pro Event erlaubt

**Folgen:**
- Daten nicht in relationaler DB
- Keine Versionierung
- Keine Queries/Filtering
- JSON-Schema-Validierung fehlt

### ✅ Migration-Strategie

#### 1.1 Database-Migration

**Schritt 1: Model anpassen**
```prisma
model QrDesign {
  id           String   @id @default(uuid())
  eventId      String   // ⚠️ @unique entfernen!
  name         String   // "Standard", "Premium", "Custom"
  templateSlug String?
  format       String?  @default("A6")
  headline     String?
  subline      String?
  eventName    String?
  callToAction String?
  bgColor      String?
  textColor    String?
  accentColor  String?
  logoUrl      String?
  isActive     Boolean  @default(true)
  isDefault    Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  @@index([eventId])
  @@unique([eventId, isDefault])  // Nur 1 Default pro Event
  @@map("qr_designs")
}
```

**Schritt 2: Data-Migration Script**
```typescript
// migrations/migrate-qr-designs.ts
async function migrateQrDesigns() {
  const events = await prisma.event.findMany({
    where: {
      designConfig: { not: null }
    }
  });
  
  for (const event of events) {
    const config = event.designConfig as any;
    if (config?.qrDesigns && Array.isArray(config.qrDesigns)) {
      // Migrate each QR Design from JSON to Model
      for (const qrData of config.qrDesigns) {
        await prisma.qrDesign.create({
          data: {
            eventId: event.id,
            name: qrData.name || 'Standard',
            ...qrData,
            isDefault: qrData.isDefault || false,
          }
        });
      }
      
      // Remove from JSON after migration
      delete config.qrDesigns;
      await prisma.event.update({
        where: { id: event.id },
        data: { designConfig: config }
      });
    }
  }
}
```

#### 1.2 Backend-Routes anpassen

**Vor (JSON):**
```typescript
// event.designConfig.qrDesigns[]
```

**Nach (Model):**
```typescript
// GET /events/:eventId/qr-designs
const designs = await prisma.qrDesign.findMany({ where: { eventId } });

// POST /events/:eventId/qr-designs
const design = await prisma.qrDesign.create({ data: { eventId, ...data } });

// PUT /events/:eventId/qr-designs/:designId
await prisma.qrDesign.update({ where: { id: designId }, data });
```

#### 1.3 Backward-Compatibility

**Fallback-Strategie:**
```typescript
async function getQrDesigns(eventId: string) {
  // Try new Model first
  let designs = await prisma.qrDesign.findMany({ where: { eventId } });
  
  if (designs.length === 0) {
    // Fallback to JSON
    const event = await prisma.event.findUnique({ 
      where: { id: eventId },
      select: { designConfig: true }
    });
    const config = event.designConfig as any;
    designs = config?.qrDesigns || [];
  }
  
  return designs;
}
```

### 📊 Aufwand
- **Schema-Anpassung:** 2h
- **Migration-Script:** 4h (inkl. Tests)
- **Backend-Routes:** 3h
- **Frontend-Anpassung:** 2h
- **Testing:** 3h
- **Gesamt:** ~14h

### ⚠️ Risiken
- **Breaking Change:** Ja (aber mit Fallback abgesichert)
- **Data Loss:** Niedrig (Migration-Script mit Backup)
- **Rollback:** Möglich (JSON bleibt erhalten)

---

## 2. Komponenten-Library

### 🔍 Aktueller Zustand

**Problem:**
- UI-Komponenten in `frontend/src/components/ui/`
- Keine Wiederverwendung in `admin-dashboard/`
- Duplizierte Komponenten (Button, Input, etc.)

**Ist-Zustand:**
```
packages/
├── frontend/src/components/ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Dialog.tsx
│   └── ...
├── admin-dashboard/src/components/
│   └── (keine geteilten UI-Komponenten)
└── shared/
    └── types/  (nur Types, keine Komponenten)
```

### ✅ Soll-Zustand

```
packages/
├── shared/
│   ├── types/
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Dialog.tsx
│       └── index.ts
├── frontend/
│   └── (importiert von @gaestefotos/shared/ui)
└── admin-dashboard/
    └── (importiert von @gaestefotos/shared/ui)
```

### 📋 Strategie

#### 2.1 Shared Package Setup

**package.json:**
```json
{
  "name": "@gaestefotos/shared",
  "exports": {
    "./types": "./types/index.ts",
    "./ui": "./ui/index.ts"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "framer-motion": "^10.0.0"
  }
}
```

#### 2.2 Komponenten migrieren

**Priorität (häufig genutzt):**
1. Button, IconButton
2. Input, Textarea, Select
3. Dialog, Modal
4. Skeleton
5. Toast
6. Form-Komponenten

**Vorsichtsmaßnahme:**
- Schritt-für-Schritt migrieren
- Alte Komponenten als Wrapper beibehalten
- Deprecation Warnings

```typescript
// packages/frontend/src/components/ui/Button.tsx
import { Button as SharedButton } from '@gaestefotos/shared/ui';

/** @deprecated Use @gaestefotos/shared/ui Button */
export const Button = SharedButton;
```

#### 2.3 Storybook Integration

```typescript
// packages/shared/.storybook/main.ts
export default {
  stories: ['../ui/**/*.stories.tsx'],
  addons: ['@storybook/addon-essentials'],
};
```

### 📊 Aufwand
- **Shared Package Setup:** 3h
- **Komponenten migrieren:** 8h (15 Komponenten)
- **Storybook Setup:** 4h
- **Documentation:** 3h
- **Gesamt:** ~18h

### ⚠️ Risiken
- **Breaking Change:** Nein (mit Wrapper)
- **Import-Wege ändern:** Ja (aber schrittweise)

---

## 3. Performance-Optimierungen

### 🔍 Analyse-Bereiche

#### 3.1 Image-Lazy-Loading

**Aktuell:**
```tsx
<img src={photo.url} alt="..." />
```

**Optimiert:**
```tsx
import Image from 'next/image';

<Image
  src={photo.url}
  alt="..."
  loading="lazy"
  placeholder="blur"
  blurDataURL={photo.blurHash}
/>
```

**Vorteil:**
- Automatische Optimierung
- Blur-Placeholder
- Lazy Loading
- Responsive Images

#### 3.2 API-Response-Caching (Redis)

**Aktuell:** Jede API-Anfrage trifft DB

**Optimiert:**
```typescript
// middleware/cache.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function cacheMiddleware(req, res, next) {
  const key = `api:${req.path}:${JSON.stringify(req.query)}`;
  const cached = await redis.get(key);
  
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  // Override res.json to cache response
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    redis.setex(key, 300, JSON.stringify(data)); // 5min TTL
    return originalJson(data);
  };
  
  next();
}
```

**Cache-Strategie:**
- Photos-Liste: 5min
- Event-Details: 10min
- Statistics: 1min
- Invalidation bei Änderungen

#### 3.3 CDN-Integration

**Cloudflare Setup:**
```typescript
// Cache-Control Headers setzen
res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
```

**Static Assets:**
- Next.js `_next/static/` → CDN
- Images → CDN (via S3 → CloudFront oder Cloudflare)

### 📊 Aufwand
- **Image-Optimization:** 4h
- **Redis-Caching:** 6h
- **CDN-Setup:** 3h
- **Testing:** 3h
- **Gesamt:** ~16h

---

## 4. Testing-Infrastruktur

### 🔍 Aktueller Zustand

**Vorhanden:**
- Playwright E2E Tests (teilweise)
- Vitest Unit Tests (2 Service-Tests)

**Fehlend:**
- Systematische Unit-Tests für Services
- Integration-Tests für API
- Frontend Component-Tests

### ✅ Testing-Strategie

#### 4.1 Backend Unit-Tests

**Services testen:**
```typescript
// __tests__/imageProcessor.test.ts  ✅ Vorhanden
// __tests__/storageService.test.ts  ✅ Vorhanden
// __tests__/emailService.test.ts    ❌ Fehlt
// __tests__/videoProcessor.test.ts  ❌ Fehlt
// __tests__/photoCategories.test.ts ❌ Fehlt
```

**Ziel:** 80% Coverage für Services

#### 4.2 API Integration-Tests

```typescript
// __tests__/integration/events.test.ts
describe('Events API', () => {
  it('should create event', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Event' });
    
    expect(response.status).toBe(201);
  });
});
```

#### 4.3 Frontend Component-Tests

```typescript
// __tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

#### 4.4 E2E Tests erweitern

**Aktuell:** Co-Host E2E Tests vorhanden  
**Erweitern:**
- Upload-Flow
- Gallery-Flow
- Invitation-Flow
- QR-Designer-Flow

### 📊 Aufwand
- **Unit-Tests (10 Services):** 12h
- **Integration-Tests (5 API-Routes):** 8h
- **Component-Tests (15 Komponenten):** 10h
- **E2E Tests (4 Flows):** 8h
- **CI/CD Integration:** 4h
- **Gesamt:** ~42h

---

## 📋 Package C Gesamt-Übersicht

| Feature | Aufwand | Risiko | Breaking | Prio |
|---------|---------|--------|----------|------|
| **1. QR-Migration** | 14h | Hoch | Ja* | Mittel |
| **2. Komponenten-Library** | 18h | Mittel | Nein | Niedrig |
| **3. Performance** | 16h | Niedrig | Nein | Hoch |
| **4. Testing** | 42h | Niedrig | Nein | Hoch |

*Mit Fallback abgesichert

**Gesamt:** ~90 Stunden (2+ Wochen Vollzeit)

---

## ⚠️ Kritische Bewertung

### Risiko-Analyse

**QR-Migration:**
- ⚠️ HÖCHSTES RISIKO
- Kann bestehende Deployments brechen
- Erfordert sorgfältiges Testing
- **Empfehlung:** Nur wenn zwingend nötig

**Komponenten-Library:**
- ✅ Geringes Risiko mit Wrapper-Strategie
- Langfristiger Nutzen hoch
- **Empfehlung:** Schrittweise umsetzen

**Performance:**
- ✅ Geringes Risiko
- Sofortiger Nutzen (User-Experience)
- **Empfehlung:** Priorität 1

**Testing:**
- ✅ Kein Risiko
- Langfristiger Nutzen sehr hoch
- **Empfehlung:** Parallel zu anderen Tasks

---

## 🎯 Empfohlene Reihenfolge

**Szenario 1: Maximale Sicherheit**
1. Testing-Infrastruktur erweitern (42h)
2. Performance-Optimierungen (16h)
3. Komponenten-Library (18h)
4. QR-Migration (14h) - nur wenn Tests grün

**Szenario 2: Schneller Nutzen**
1. Performance-Optimierungen (16h)
2. Testing für neue Features (20h)
3. Komponenten-Library (18h)
4. QR-Migration (14h) - optional

**Szenario 3: Minimal (Quick Wins)**
1. Performance: Redis-Caching (6h)
2. Performance: Image-Optimization (4h)
3. Testing: Critical Paths (12h)

---

## 📝 Vorsichtsmaßnahmen

**Vor Implementierung:**
1. ✅ Backup der Production-DB
2. ✅ Feature-Flags für neue Features
3. ✅ Rollback-Plan dokumentieren
4. ✅ Staging-Environment testen
5. ✅ Monitoring aufsetzen

**Während Implementierung:**
1. ✅ Kleine, atomic Commits
2. ✅ Tests vor jedem Merge
3. ✅ Code-Review erforderlich
4. ✅ Performance-Metrics tracken

**Nach Deployment:**
1. ✅ Error-Monitoring (Sentry)
2. ✅ Performance-Monitoring (Metrics)
3. ✅ User-Feedback sammeln
4. ✅ Rollback bereit halten (24h)

---

**Status:** ✅ Analyse abgeschlossen  
**Empfehlung:** Beginne mit Package C: Performance-Optimierungen (geringes Risiko, hoher Nutzen)
