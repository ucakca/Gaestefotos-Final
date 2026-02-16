# 🎯 OPUS MASTER-PLAN: Dynamic Event Themes & System-Modernisierung

> **Erstellt**: 2026-02-16  
> **Kontext**: Transformation von gästefotos.com zu einem marktführenden Tool mit dynamischen, AI-generierten Event-Themes  
> **Agent**: Claude Opus 4.6  
> **Ziel**: Vollständige Implementierung von kontextbasierten, animierten Event-Themes mit AI-Unterstützung und hierarchischem Caching

---

## 📋 INHALTSVERZEICHNIS

1. [Executive Summary](#executive-summary)
2. [Systemanalyse](#systemanalyse)
3. [Abhängigkeiten & Verbindungen](#abhängigkeiten--verbindungen)
4. [Feature-Spezifikation](#feature-spezifikation)
5. [Technischer Fahrplan](#technischer-fahrplan)
6. [Implementierungs-Phasen](#implementierungs-phasen)
7. [Risiken & Rollback](#risiken--rollback)
8. [Testing & Qualitätssicherung](#testing--qualitätssicherung)
9. [Deployment-Plan](#deployment-plan)

---

## 🎯 EXECUTIVE SUMMARY

### Vision
Gästefotos.com wird das erste Event-Management-System mit **kontextbewussten, AI-kuratierten Themes**, die automatisch auf Eventtyp, Jahreszeit, Standort und weitere Faktoren reagieren. Die Themes umfassen Animationen, Farbschemata, Schriftarten, Layouts und Effekte.

### Kern-Prinzipien
1. **AI-Assisted, Host-Curated**: AI generiert 3 Varianten, Host wählt aus
2. **Anti-Kitsch**: Strikte Design-Regeln und Qualitäts-Scoring
3. **Cost-Effective**: Hierarchisches Caching reduziert AI-Kosten auf nahezu 0
4. **Performance-First**: Animationen sind performant und subtil
5. **Responsive**: Alle Themes funktionieren perfekt auf Desktop & Mobile

### Umfang
- **Neue Features**: Theme-Generator, Theme-Marketplace, Theme-Preview, Animation-Library
- **Erweiterte Features**: Event-Wizard (Theme-Selection), Admin-Dashboard (Theme-Management)
- **Design-Modernisierung**: Komplettes UI-Refresh des Admin-Dashboards
- **Backend**: AI-Service, Caching-Layer, Theme-API, Context-Extractor

---

## 🔍 SYSTEMANALYSE

### 1. AKTUELLE ARCHITEKTUR

#### Frontend-Stack
```
packages/frontend/          (User-Frontend, Next.js 16 App Router)
├── src/app/                (Pages)
│   ├── events/[id]/        (Event-Dashboard)
│   ├── e3/[slug]/          (Public Event-Link)
│   └── page.tsx            (Public Landing)
├── src/components/
│   ├── wizard/             (EventWizard - Event Creation)
│   │   ├── EventWizard.tsx
│   │   ├── steps/          (9 Wizard Steps)
│   │   └── presets/        (Event Types, Albums, Challenges)
│   ├── e3/                 (Public Event Views)
│   ├── dashboard/          (Host Dashboard Components)
│   └── mosaic/             (Mosaic Wall, Print Terminal)
└── src/providers/          (Zustand Stores, Context)
```

#### Admin-Dashboard
```
packages/admin-dashboard/
├── src/app/(admin)/manage/
│   ├── events/             (Event Management)
│   │   ├── create/         (Admin Event Creation)
│   │   └── [id]/           (Event Details)
│   ├── workflows/          (Workflow Builder - ReactFlow)
│   ├── qr-templates/       (QR-Template Management)
│   ├── ai-providers/       (AI Provider Management)
│   ├── landing/            (Trust Badges Management)
│   └── packages/           (Package Definitions)
└── src/components/
    ├── Sidebar.tsx         (Navigation)
    └── ui/                 (Shared UI Components)
```

#### Backend
```
packages/backend/
├── src/
│   ├── routes/             (API Endpoints)
│   │   ├── adminEvents.ts
│   │   ├── events.ts
│   │   ├── adminAiProviders.ts
│   │   ├── adminLandingBadges.ts
│   │   └── adminBoothWorkflows.ts
│   ├── services/
│   │   ├── storageService.ts    (SeaweedFS)
│   │   ├── aiService.ts         (AI Integration)
│   │   └── cacheService.ts      (Redis)
│   └── prisma/
│       └── schema.prisma        (Database Schema)
```

### 2. DATENBANK-SCHEMA (RELEVANT)

#### Event Model (Bestehend)
```prisma
model Event {
  id                      String   @id @default(uuid())
  hostId                  String
  slug                    String   @unique
  title                   String
  dateTime                DateTime?
  locationName            String?
  locationGoogleMapsLink  String?
  
  // ⚠️ WICHTIG: Hier wird Theme-Info gespeichert
  designConfig            Json?    @default("{}")
  
  featuresConfig          Json     @default("{...}")
  
  // Workflow-Verbindung (bereits vorhanden)
  workflowId              String?
  workflow                BoothWorkflow? @relation(fields: [workflowId], references: [id])
  
  // ... weitere Felder
}
```

**Aktueller `designConfig` Inhalt:**
```json
{
  "colorScheme": "default" | "romantic" | "modern" | "elegant" | "playful",
  "coverImageUrl": "string",
  "profileImageUrl": "string"
}
```

### 3. EVENT-WIZARD (User-Frontend)

Der EventWizard ist der **zentrale Einstiegspunkt** für Event-Erstellung:

**Datei**: `packages/frontend/src/components/wizard/EventWizard.tsx`

**Ablauf**:
1. **EventTypeStep**: Wähle Event-Typ (Hochzeit, Corporate, Geburtstag, etc.)
2. **BasicInfoStep**: Titel, Datum, Location
3. **DesignStep**: Cover-Bild, Profil-Bild, **colorScheme**
4. **AlbumsStep**: Album-Presets
5. **AccessStep**: Passwort, Sichtbarkeit

**Erweiterte Schritte** (optional):
6. **ChallengesStep**: Foto-Challenges
7. **GuestbookStep**: Gästebuch-Einstellungen
8. **CoHostsStep**: Co-Hosts hinzufügen
9. **SummaryStep**: Zusammenfassung & Erstellen

**API Call**:
```javascript
POST /api/events
FormData:
  - title, dateTime, location
  - colorScheme      // ⚠️ Wird in designConfig gespeichert
  - coverImage, profileImage
  - albums, challenges, guestbook, coHostEmails
```

### 4. ADMIN EVENT CREATION

**Datei**: `packages/admin-dashboard/src/app/(admin)/manage/events/create/page.tsx`

Admin-spezifische Event-Erstellung:
- Wähle Host-User
- Setze Basis-Infos
- Optional: Package-SKU zuweisen
- **Keine Theme-Auswahl** (wird über User-Wizard nachgeholt)

### 5. WORKFLOW-BUILDER

**Datei**: `packages/admin-dashboard/src/app/(admin)/manage/workflows/page.tsx`

- Verwendet **ReactFlow** für visuelle Workflow-Erstellung
- Events können mit Workflows verknüpft werden (`workflowId`)
- Workflows definieren Booth-Abläufe (z.B. Kamera Action Sheet, Print Terminal)

**Bestehende Workflows**:
- Kamera Action Sheet
- Mosaic Print Terminal
- KI Foto-Stil Flow
- Foto-Spaß Flow
- Face Search Flow
- Gästebuch Flow
- Upload Flow

---

## 🔗 ABHÄNGIGKEITEN & VERBINDUNGEN

### Critical Path: Theme-Integration

```
┌─────────────────────────────────────────────────────────────┐
│  1. USER JOURNEY: Event Creation                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  EventWizard (Frontend)                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Step 1: Event Type (Hochzeit, Corporate, ...)       │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       ↓                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Step 2: Basic Info (Titel, Datum, Location)         │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       ↓                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ⭐ NEW: Step 3: Theme Selection                       │   │
│  │   - AI generiert 3 Varianten basierend auf:         │   │
│  │     • Event Type                                     │   │
│  │     • Season (aus dateTime)                          │   │
│  │     • Location                                       │   │
│  │     • Time of Day                                    │   │
│  │   - User wählt Favorit                               │   │
│  │   - Fine-Tuning mit Slidern (optional)               │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       ↓                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Step 4: Design (Cover/Profile Images)               │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       ↓                                      │
│  API Call: POST /api/events                                  │
│  Payload: { themeId, customThemeData, ... }                 │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Backend: Event Creation                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ routes/events.ts                                     │   │
│  │   ├─ Validate Theme                                  │   │
│  │   ├─ Save Event with themeId                         │   │
│  │   └─ Store customThemeData in designConfig          │   │
│  └────────────────────┬─────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. PUBLIC EVENT VIEW: Theme Rendering                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  /e3/[slug] (Public Event Page)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Load Event + Theme Data                              │   │
│  │   ├─ Fetch: GET /api/events/:id                      │   │
│  │   ├─ Load Theme: GET /api/themes/:themeId            │   │
│  │   └─ Merge with customThemeData                      │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       ↓                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ThemeProvider (React Context)                        │   │
│  │   ├─ Apply CSS Variables (colors, fonts)            │   │
│  │   ├─ Load Animation Library                          │   │
│  │   └─ Inject Theme Styles                             │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       ↓                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Components render with Theme                         │   │
│  │   ├─ PhotoGallery (mit theme.animations)            │   │
│  │   ├─ EventHero (mit theme.colors)                    │   │
│  │   └─ MosaicWall (mit theme.wallLayout)              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Theme-Related Files (NEU zu erstellen)

#### Backend
```
packages/backend/src/
├── routes/
│   ├── themes.ts                    ⭐ NEW: Theme CRUD API
│   └── aiThemeGenerator.ts          ⭐ NEW: AI Theme Generation Endpoint
├── services/
│   ├── aiThemeGenerator.ts          ⭐ NEW: AI-gestützte Theme-Generierung
│   ├── themeContextExtractor.ts     ⭐ NEW: Context-Extraktion (Season, Location)
│   ├── cachedThemeGenerator.ts      ⭐ NEW: Hierarchisches Caching
│   └── themeValidator.ts            ⭐ NEW: Anti-Kitsch Validation
└── prisma/schema.prisma
    └── EventTheme model              ⭐ NEW: Theme-Datenbank
```

#### Frontend
```
packages/frontend/src/
├── animations/                      ⭐ NEW: Animation Library
│   ├── romantic.ts                  (Petal Fall, Heart Pulse, ...)
│   ├── professional.ts              (Fade In, Slide, ...)
│   ├── playful.ts                   (Bounce, Wiggle, ...)
│   ├── nature.ts                    (Leaf Fall, Wave, ...)
│   └── minimal.ts                   (Subtle Fade, Simple Slide, ...)
├── providers/
│   └── ThemeProvider.tsx            ⭐ NEW: Theme Context & CSS Injection
├── components/
│   ├── wizard/steps/
│   │   └── ThemeSelectionStep.tsx   ⭐ NEW: AI Theme Selection Step
│   └── theme/
│       ├── ThemeAnimation.tsx       ⭐ NEW: Animation Wrapper
│       ├── ThemePreview.tsx         ⭐ NEW: Live Preview Component
│       └── ThemeComparison.tsx      ⭐ NEW: A/B Comparison
└── lib/
    └── themeUtils.ts                ⭐ NEW: Theme-Helper-Functions
```

#### Admin Dashboard
```
packages/admin-dashboard/src/app/(admin)/manage/
├── themes/                          ⭐ NEW: Theme Marketplace & Management
│   ├── page.tsx                     (Liste aller Themes)
│   ├── create/page.tsx              (Custom Theme Editor)
│   └── [id]/page.tsx                (Theme Details & Stats)
```

---

## 📐 FEATURE-SPEZIFIKATION

### 1. THEME-DATENSTRUKTUR

#### Prisma Schema Extension

```prisma
model Event {
  // ... existing fields
  
  // ⭐ NEW: Theme-Relation
  themeId          String?
  theme            EventTheme?     @relation(fields: [themeId], references: [id])
  customThemeData  Json?           // User-Anpassungen (Fine-Tuning)
}

model EventTheme {
  id              String   @id @default(uuid())
  slug            String   @unique  // z.B. "romantic-wedding-spring"
  name            String              // z.B. "Romantische Frühlingshochzeit"
  
  // ⭐ Kontext-Metadaten
  eventType       EventType           // HOCHZEIT, CORPORATE, etc.
  season          Season?             // SPRING, SUMMER, AUTUMN, WINTER
  timeOfDay       TimeOfDay?          // MORNING, AFTERNOON, EVENING, NIGHT
  locationStyle   LocationStyle?      // URBAN, RURAL, BEACH, MOUNTAIN, INDOOR
  
  // ⭐ Theme-Eigenschaften
  isPremium       Boolean  @default(false)
  isAiGenerated   Boolean  @default(false)
  isPublic        Boolean  @default(true)   // Im Marketplace sichtbar
  
  // ⭐ Design-Daten (JSON)
  colors          Json     // { primary, secondary, accent, background, text, ... }
  animations      Json     // { entrance, exit, hover, scroll, ... }
  fonts           Json     // { heading, body, accent, sizes, ... }
  frames          Json     // { photoFrame, border, shadow, ... }
  wallLayout      String   // "masonry" | "grid" | "carousel" | "waterfall"
  
  // ⭐ Metadaten
  previewImage    String?             // Theme-Preview-URL
  description     String?
  tags            String[]            // ["elegant", "modern", "minimalist"]
  
  // ⭐ Statistiken
  usageCount      Int      @default(0)
  rating          Float?              // Durchschnittsbewertung (optional, für später)
  
  // Relationen
  events          Event[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([eventType, isPremium])
  @@index([season])
  @@index([isPublic, usageCount])
  @@map("event_themes")
}

enum EventType {
  HOCHZEIT
  CORPORATE
  GEBURTSTAG
  KIDS_PARTY
  TAUFE
  GRADUATION
  ANNIVERSARY
  CUSTOM
}

enum Season {
  SPRING
  SUMMER
  AUTUMN
  WINTER
}

enum TimeOfDay {
  MORNING      // 06:00-11:59
  AFTERNOON    // 12:00-17:59
  EVENING      // 18:00-21:59
  NIGHT        // 22:00-05:59
}

enum LocationStyle {
  URBAN
  RURAL
  BEACH
  MOUNTAIN
  INDOOR
  GARDEN
  CASTLE
  RESTAURANT
}
```

#### Theme Colors Schema
```typescript
interface ThemeColors {
  primary: string;         // Hauptfarbe
  secondary: string;       // Sekundärfarbe
  accent: string;          // Akzentfarbe
  background: string;      // Hintergrund
  surface: string;         // Karten/Oberflächen
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: string;
  success: string;
  warning: string;
  error: string;
  gradient?: {             // Optional: Farbverläufe
    start: string;
    end: string;
    direction: string;     // "to-right" | "to-bottom" | "diagonal"
  };
}
```

#### Theme Animations Schema
```typescript
interface ThemeAnimations {
  entrance: AnimationConfig;    // Elemente erscheinen
  exit: AnimationConfig;        // Elemente verschwinden
  hover: AnimationConfig;       // Hover-Effekte
  scroll: AnimationConfig;      // Scroll-basierte Animationen
  ambient?: AnimationConfig;    // Hintergrund-Animationen (z.B. Petal Fall)
}

interface AnimationConfig {
  type: string;           // "fade" | "slide" | "scale" | "rotate" | "custom"
  duration: number;       // in ms
  easing: string;         // "ease-in-out" | "spring" | custom cubic-bezier
  delay?: number;
  stagger?: number;       // Verzögerung zwischen mehreren Elementen
  custom?: object;        // Framer-Motion-spezifische Props
}
```

### 2. AI-GENERIERUNGS-LOGIK

#### Context Extraction Service

```typescript
// packages/backend/src/services/themeContextExtractor.ts

interface EventContext {
  // Primär-Kontext
  eventType: EventType;
  
  // Temporal-Kontext
  season: Season;
  timeOfDay: TimeOfDay;
  month: number;
  dayOfWeek: number;
  
  // Spatial-Kontext
  locationStyle?: LocationStyle;
  locationName?: string;
  coordinates?: { lat: number; lng: number };
  
  // Social-Kontext
  estimatedGuestCount?: number;
  ageGroup?: 'kids' | 'young-adults' | 'adults' | 'mixed';
  formality?: 'casual' | 'semi-formal' | 'formal';
  
  // Keyword-Extraktion
  keywords: string[];      // Aus Event-Titel extrahiert
  
  // Externe Daten (optional)
  weather?: {              // Falls Weather-API integriert
    condition: string;
    temperature: number;
  };
  
  // Historical Data
  similarEventThemes?: string[];  // Was wurde für ähnliche Events gewählt
}

async function extractContext(eventData: {
  title: string;
  dateTime?: Date;
  locationName?: string;
  locationGoogleMapsLink?: string;
  eventType: EventType;
}): Promise<EventContext> {
  const context: EventContext = {
    eventType: eventData.eventType,
    season: getSeasonFromDate(eventData.dateTime),
    timeOfDay: getTimeOfDay(eventData.dateTime),
    month: eventData.dateTime?.getMonth() || 0,
    dayOfWeek: eventData.dateTime?.getDay() || 0,
    keywords: extractKeywords(eventData.title),
  };
  
  // Optional: Location-Style aus Google Maps
  if (eventData.locationGoogleMapsLink) {
    context.locationStyle = await inferLocationStyle(eventData.locationGoogleMapsLink);
  }
  
  // Optional: Koordinaten aus Location Name
  if (eventData.locationName) {
    context.coordinates = await geocodeLocation(eventData.locationName);
  }
  
  return context;
}
```

#### AI Theme Generator Service

```typescript
// packages/backend/src/services/aiThemeGenerator.ts

interface ThemeGenerationRequest {
  context: EventContext;
  count: number;          // Anzahl der zu generierenden Varianten (default: 3)
  style?: string;         // Optional: "elegant" | "modern" | "playful"
  excludeKitsch: boolean; // Anti-Kitsch-Filter aktivieren
}

interface GeneratedTheme {
  name: string;
  description: string;
  colors: ThemeColors;
  animations: ThemeAnimations;
  fonts: ThemeFonts;
  tasteScore: number;     // 0-100, Anti-Kitsch-Score
  reasoning: string;      // Warum wurde dieses Theme gewählt?
}

async function generateThemes(
  request: ThemeGenerationRequest
): Promise<GeneratedTheme[]> {
  // 1. Cache-Check (Hierarchisch)
  const cacheKey = buildCacheKey(request.context);
  const cached = await getCachedThemes(cacheKey);
  if (cached) return cached;
  
  // 2. Build AI Prompt mit Kontext
  const prompt = buildThemePrompt(request.context);
  
  // 3. AI Call (Groq SDK)
  const aiResponse = await callGroqAI(prompt, {
    temperature: 0.8,    // Kreativität
    max_tokens: 2000,
    model: "mixtral-8x7b-32768"
  });
  
  // 4. Parse AI Response
  const themes = parseThemeResponse(aiResponse);
  
  // 5. Anti-Kitsch Validation
  const validatedThemes = themes
    .map(theme => ({
      ...theme,
      tasteScore: calculateTasteScore(theme)
    }))
    .filter(theme => theme.tasteScore >= 60)  // Min. 60/100 Punkte
    .sort((a, b) => b.tasteScore - a.tasteScore)
    .slice(0, request.count);
  
  // 6. Cache Result
  await cacheThemes(cacheKey, validatedThemes);
  
  return validatedThemes;
}
```

#### Hierarchisches Caching

```typescript
// packages/backend/src/services/cachedThemeGenerator.ts

/**
 * CACHE-HIERARCHIE (Redis)
 * 
 * Level 1: System-Prompt (konstant, nie erneuert)
 *   Key: "theme:system-prompt"
 *   TTL: never
 * 
 * Level 2: Event-Type-Knowledge (z.B. "Was ist typisch für Hochzeiten?")
 *   Key: "theme:knowledge:HOCHZEIT"
 *   TTL: 30 Tage
 * 
 * Level 3: Season-Palettes (z.B. "Frühlingsfarben für Hochzeiten")
 *   Key: "theme:palette:HOCHZEIT:SPRING"
 *   TTL: 90 Tage
 * 
 * Level 4: Location-Styles (z.B. "Beach-Wedding Styles")
 *   Key: "theme:style:HOCHZEIT:BEACH"
 *   TTL: 60 Tage
 * 
 * Level 5: Kombinationen (z.B. "Spring Beach Wedding Morning")
 *   Key: "theme:combo:HOCHZEIT:SPRING:BEACH:MORNING"
 *   TTL: 30 Tage
 * 
 * Level 6: Exact Match (alle Context-Parameter)
 *   Key: "theme:exact:[hash-of-full-context]"
 *   TTL: 7 Tage
 */

interface CacheLevel {
  key: string;
  ttl: number;
  buildKey: (context: EventContext) => string;
}

const CACHE_LEVELS: CacheLevel[] = [
  {
    key: 'system-prompt',
    ttl: -1, // Never expire
    buildKey: () => 'theme:system-prompt'
  },
  {
    key: 'event-type-knowledge',
    ttl: 30 * 24 * 60 * 60, // 30 days
    buildKey: (ctx) => `theme:knowledge:${ctx.eventType}`
  },
  {
    key: 'season-palette',
    ttl: 90 * 24 * 60 * 60, // 90 days
    buildKey: (ctx) => `theme:palette:${ctx.eventType}:${ctx.season}`
  },
  {
    key: 'location-style',
    ttl: 60 * 24 * 60 * 60, // 60 days
    buildKey: (ctx) => `theme:style:${ctx.eventType}:${ctx.locationStyle || 'ANY'}`
  },
  {
    key: 'combination',
    ttl: 30 * 24 * 60 * 60, // 30 days
    buildKey: (ctx) => `theme:combo:${ctx.eventType}:${ctx.season}:${ctx.locationStyle}:${ctx.timeOfDay}`
  },
  {
    key: 'exact-match',
    ttl: 7 * 24 * 60 * 60, // 7 days
    buildKey: (ctx) => `theme:exact:${hashContext(ctx)}`
  }
];

async function getCachedThemes(context: EventContext): Promise<GeneratedTheme[] | null> {
  // Versuche alle Cache-Level von spezifisch zu generell
  for (let i = CACHE_LEVELS.length - 1; i >= 0; i--) {
    const level = CACHE_LEVELS[i];
    const key = level.buildKey(context);
    const cached = await redis.get(key);
    
    if (cached) {
      console.log(`🎯 Cache HIT: ${level.key} (${key})`);
      return JSON.parse(cached);
    }
  }
  
  console.log('❌ Cache MISS: Generating new themes');
  return null;
}

async function cacheThemes(context: EventContext, themes: GeneratedTheme[]): Promise<void> {
  // Speichere in allen Cache-Levels
  for (const level of CACHE_LEVELS) {
    if (level.ttl === -1) continue; // Skip system-prompt
    
    const key = level.buildKey(context);
    const ttl = level.ttl;
    
    await redis.setex(key, ttl, JSON.stringify(themes));
    console.log(`💾 Cached: ${level.key} (TTL: ${ttl}s)`);
  }
}
```

### 3. ANTI-KITSCH VALIDATION

```typescript
// packages/backend/src/services/themeValidator.ts

interface TasteScoreBreakdown {
  colorHarmony: number;      // 0-25 Punkte
  animationSubtlety: number; // 0-25 Punkte
  typographyBalance: number; // 0-20 Punkte
  consistencyScore: number;  // 0-20 Punkte
  innovationScore: number;   // 0-10 Punkte
  total: number;             // 0-100 Punkte
}

function calculateTasteScore(theme: GeneratedTheme): number {
  const breakdown: TasteScoreBreakdown = {
    colorHarmony: evaluateColorHarmony(theme.colors),
    animationSubtlety: evaluateAnimations(theme.animations),
    typographyBalance: evaluateTypography(theme.fonts),
    consistencyScore: evaluateConsistency(theme),
    innovationScore: evaluateInnovation(theme),
    total: 0
  };
  
  breakdown.total = Object.values(breakdown)
    .filter(v => typeof v === 'number')
    .reduce((sum, score) => sum + score, 0);
  
  return breakdown.total;
}

// REGEL 1: Farb-Harmonie
function evaluateColorHarmony(colors: ThemeColors): number {
  let score = 25;
  
  // ❌ -10: Zu viele Primärfarben (>3)
  const primaryColors = [colors.primary, colors.secondary, colors.accent];
  if (primaryColors.length > 3) score -= 10;
  
  // ❌ -5: Primärfarbe = Akzentfarbe (langweilig)
  if (colors.primary === colors.accent) score -= 5;
  
  // ❌ -10: Neon-Farben (zu grell)
  if (isNeonColor(colors.primary) || isNeonColor(colors.accent)) score -= 10;
  
  // ✅ +5: Komplementärfarben (gut)
  if (areComplementaryColors(colors.primary, colors.accent)) score += 5;
  
  return Math.max(0, score);
}

// REGEL 2: Animations-Budget
function evaluateAnimations(animations: ThemeAnimations): number {
  let score = 25;
  let animationCount = 0;
  
  // Zähle aktive Animationen
  Object.values(animations).forEach(config => {
    if (config && config.type !== 'none') animationCount++;
  });
  
  // ❌ -15: Zu viele Animationen (>4 gleichzeitig)
  if (animationCount > 4) score -= 15;
  
  // ❌ -10: Zu schnelle Animationen (<200ms)
  Object.values(animations).forEach(config => {
    if (config && config.duration < 200) score -= 10;
  });
  
  // ✅ +5: Subtile Ambient-Animationen
  if (animations.ambient && animations.ambient.duration > 2000) score += 5;
  
  return Math.max(0, score);
}

// REGEL 3: Ein Statement-Element (nicht mehr!)
function evaluateConsistency(theme: GeneratedTheme): number {
  let score = 20;
  let statementElements = 0;
  
  // Zähle "auffällige" Elemente
  if (theme.colors.gradient) statementElements++;
  if (theme.animations.ambient) statementElements++;
  if (theme.fonts.accent && theme.fonts.accent !== theme.fonts.heading) statementElements++;
  
  // ❌ -15: Mehr als 1 Statement-Element
  if (statementElements > 1) score -= 15;
  
  // ✅ +5: Genau 1 Statement-Element (perfekt)
  if (statementElements === 1) score += 5;
  
  return Math.max(0, score);
}
```

### 4. ANIMATIONS-LIBRARY

#### Romantic Animations
```typescript
// packages/frontend/src/animations/romantic.ts

import { Variants } from 'framer-motion';

export const ROMANTIC_ANIMATIONS = {
  // 🌸 Blütenblätter fallen
  petalFall: {
    hidden: { opacity: 0, y: -50, rotate: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      y: [0, 300],
      rotate: [0, 360],
      transition: {
        duration: 8,
        ease: 'easeInOut',
        repeat: Infinity,
        delay: Math.random() * 3
      }
    }
  } as Variants,
  
  // 💕 Herz-Puls
  heartPulse: {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 1.5,
        ease: 'easeInOut',
        repeat: Infinity
      }
    }
  } as Variants,
  
  // ✨ Glitzer-Fade
  sparkleFade: {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: [0, 1, 0],
      scale: [0, 1.5, 0],
      transition: {
        duration: 2,
        ease: 'easeOut',
        repeat: Infinity,
        repeatDelay: Math.random() * 2
      }
    }
  } as Variants,
  
  // 🎀 Sanftes Slide-In (für Fotos)
  romanticSlide: {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.1, 0.25, 1] // Custom easing
      }
    }
  } as Variants
};
```

#### Professional Animations
```typescript
// packages/frontend/src/animations/professional.ts

export const PROFESSIONAL_ANIMATIONS = {
  // 📊 Fade-In (minimalistisch)
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  } as Variants,
  
  // 📈 Slide-Up (Corporate)
  slideUp: {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  } as Variants,
  
  // 🎯 Scale-In (Logos, Branding)
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  } as Variants,
  
  // 💼 Parallax (Hintergrund-Elemente)
  parallax: {
    initial: { y: 0 },
    animate: (scrollY: number) => ({
      y: scrollY * 0.5,
      transition: { type: 'spring', stiffness: 50 }
    })
  } as Variants
};
```

#### Playful Animations
```typescript
// packages/frontend/src/animations/playful.ts

export const PLAYFUL_ANIMATIONS = {
  // 🎈 Bounce-In
  bounceIn: {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 15
      }
    }
  } as Variants,
  
  // 🎪 Wiggle
  wiggle: {
    initial: { rotate: 0 },
    animate: {
      rotate: [-5, 5, -5, 5, 0],
      transition: {
        duration: 0.8,
        ease: 'easeInOut'
      }
    }
  } as Variants,
  
  // 🎉 Confetti-Fall
  confettiFall: {
    hidden: { opacity: 0, y: -100, rotate: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      y: [0, 500],
      rotate: [0, 720],
      transition: {
        duration: 3,
        ease: 'easeIn',
        repeat: Infinity,
        delay: Math.random() * 2
      }
    }
  } as Variants,
  
  // 🌈 Color-Shift (subtil)
  colorShift: {
    animate: {
      backgroundColor: [
        'rgba(255, 107, 107, 0.1)',
        'rgba(255, 234, 167, 0.1)',
        'rgba(178, 235, 242, 0.1)',
        'rgba(255, 107, 107, 0.1)'
      ],
      transition: {
        duration: 10,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  } as Variants
};
```

### 5. THEME-PROVIDER (Frontend)

```typescript
// packages/frontend/src/providers/ThemeProvider.tsx

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { EventTheme } from '@/types/theme';

interface ThemeContextValue {
  theme: EventTheme | null;
  setTheme: (theme: EventTheme) => void;
  applyTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

export function ThemeProvider({ 
  children, 
  initialTheme 
}: { 
  children: React.ReactNode; 
  initialTheme?: EventTheme | null;
}) {
  const [theme, setTheme] = useState<EventTheme | null>(initialTheme || null);

  const applyTheme = () => {
    if (!theme) return;

    const root = document.documentElement;
    const colors = theme.colors as any;
    const fonts = theme.fonts as any;

    // Apply Color CSS Variables
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--theme-${key}`, value);
      } else if (typeof value === 'object') {
        // Nested objects (e.g. text: { primary, secondary })
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--theme-${key}-${subKey}`, subValue as string);
        });
      }
    });

    // Apply Font CSS Variables
    if (fonts) {
      if (fonts.heading) root.style.setProperty('--theme-font-heading', fonts.heading);
      if (fonts.body) root.style.setProperty('--theme-font-body', fonts.body);
      if (fonts.accent) root.style.setProperty('--theme-font-accent', fonts.accent);
    }

    // Apply to body for global effect
    document.body.style.fontFamily = fonts?.body || 'inherit';
  };

  useEffect(() => {
    applyTheme();
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### 6. THEME-ANIMATION COMPONENT

```typescript
// packages/frontend/src/components/theme/ThemeAnimation.tsx

'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/providers/ThemeProvider';
import { ROMANTIC_ANIMATIONS } from '@/animations/romantic';
import { PROFESSIONAL_ANIMATIONS } from '@/animations/professional';
import { PLAYFUL_ANIMATIONS } from '@/animations/playful';

const ANIMATION_LIBRARIES = {
  romantic: ROMANTIC_ANIMATIONS,
  professional: PROFESSIONAL_ANIMATIONS,
  playful: PLAYFUL_ANIMATIONS,
};

interface ThemeAnimationProps {
  children: React.ReactNode;
  animationType?: 'entrance' | 'hover' | 'ambient';
}

export function ThemeAnimation({ 
  children, 
  animationType = 'entrance' 
}: ThemeAnimationProps) {
  const { theme } = useTheme();
  
  if (!theme || !theme.animations) {
    return <>{children}</>;
  }

  const animationConfig = theme.animations[animationType];
  if (!animationConfig) {
    return <>{children}</>;
  }

  // Map animation config to framer-motion variants
  const variants = mapToFramerVariants(animationConfig);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

function mapToFramerVariants(config: any) {
  // Convert Theme AnimationConfig to Framer-Motion Variants
  const { type, duration, easing, delay, custom } = config;

  const baseVariants: any = {
    hidden: {},
    visible: {}
  };

  switch (type) {
    case 'fade':
      baseVariants.hidden = { opacity: 0 };
      baseVariants.visible = { 
        opacity: 1, 
        transition: { duration: duration / 1000, ease: easing, delay: delay / 1000 } 
      };
      break;
      
    case 'slide':
      const direction = custom?.direction || 'up';
      const distance = custom?.distance || 50;
      baseVariants.hidden = { 
        opacity: 0, 
        [direction === 'up' || direction === 'down' ? 'y' : 'x']: 
          direction === 'down' || direction === 'right' ? -distance : distance 
      };
      baseVariants.visible = { 
        opacity: 1, 
        x: 0, 
        y: 0, 
        transition: { duration: duration / 1000, ease: easing } 
      };
      break;
      
    case 'scale':
      baseVariants.hidden = { opacity: 0, scale: 0.8 };
      baseVariants.visible = { 
        opacity: 1, 
        scale: 1, 
        transition: { duration: duration / 1000, ease: easing } 
      };
      break;
      
    default:
      // Fallback to custom config
      return custom || baseVariants;
  }

  return baseVariants;
}
```

---

## 🗺️ TECHNISCHER FAHRPLAN

### Phase 0: VORBEREITUNG (Dauer: 2-3 Tage)

#### Ziele
- Datenbank-Schema erweitern
- Seed-Daten für initiale Themes erstellen
- Design-Tokens konsolidieren

#### Tasks
1. ✅ **Prisma Schema Update**
   - [ ] `EventTheme` Model hinzufügen
   - [ ] `EventType`, `Season`, `TimeOfDay`, `LocationStyle` Enums erstellen
   - [ ] Event Model mit `themeId` und `customThemeData` erweitern
   - [ ] Migration erstellen: `npx prisma migrate dev --name add-event-themes`

2. ✅ **Seed Initial Themes**
   - [ ] 3 Default-Themes pro Event-Type erstellen (z.B. "Elegant", "Modern", "Playful" für Hochzeiten)
   - [ ] Seed-Script: `packages/backend/prisma/seed-themes.ts`
   - [ ] Ausführen: `npx prisma db seed`

3. ✅ **Design-Token Konsolidierung**
   - [ ] `packages/admin-dashboard/src/app/globals.css` überarbeiten
   - [ ] Neue `--theme-*` CSS-Variablen definieren
   - [ ] Alte inkonsistente Tokens migrieren

**Risiken**: Keine kritischen Risiken. Falls Prisma-Migration fehlschlägt, Rollback via `prisma migrate reset`.

---

### Phase 1: BACKEND - AI THEME GENERATOR (Dauer: 4-5 Tage)

#### Ziele
- AI-Service für Theme-Generierung
- Context-Extraktion
- Hierarchisches Caching

#### Tasks

1. ✅ **Context Extractor Service**
   ```bash
   packages/backend/src/services/themeContextExtractor.ts
   ```
   - [ ] `extractContext()` implementieren
   - [ ] Season-Detection aus `dateTime`
   - [ ] Time-of-Day-Detection
   - [ ] Keyword-Extraktion aus Event-Titel
   - [ ] Optional: Geocoding für `locationStyle`
   - [ ] Tests schreiben

2. ✅ **AI Theme Generator Service**
   ```bash
   packages/backend/src/services/aiThemeGenerator.ts
   ```
   - [ ] `generateThemes()` implementieren
   - [ ] Groq SDK integrieren
   - [ ] Prompt-Engineering für Theme-Generierung
   - [ ] Response-Parsing (JSON-Schema validieren mit Zod)
   - [ ] Fehlerbehandlung

3. ✅ **Cached Theme Generator**
   ```bash
   packages/backend/src/services/cachedThemeGenerator.ts
   ```
   - [ ] Hierarchische Cache-Keys definieren
   - [ ] `getCachedThemes()` mit Fallback-Logic
   - [ ] `cacheThemes()` für alle Levels
   - [ ] Cache-Invalidierung (Admin-Endpoint)
   - [ ] Monitoring: Cache-Hit-Rate loggen

4. ✅ **Theme Validator (Anti-Kitsch)**
   ```bash
   packages/backend/src/services/themeValidator.ts
   ```
   - [ ] `calculateTasteScore()` implementieren
   - [ ] Farb-Harmonie-Checks
   - [ ] Animations-Budget-Checks
   - [ ] Konsistenz-Checks
   - [ ] Tests mit guten/schlechten Themes

5. ✅ **API Routes**
   ```bash
   packages/backend/src/routes/themes.ts
   ```
   - [ ] `POST /api/themes/generate` - AI-Generierung
   - [ ] `GET /api/themes/:id` - Single Theme
   - [ ] `GET /api/themes` - Liste (mit Filtern: eventType, season, etc.)
   - [ ] `POST /api/themes` - Custom Theme erstellen (Admin)
   - [ ] `PUT /api/themes/:id` - Theme bearbeiten (Admin)
   - [ ] `DELETE /api/themes/:id` - Theme löschen (Admin)

6. ✅ **Backend Index Update**
   ```bash
   packages/backend/src/index.ts
   ```
   - [ ] Theme-Routes mounten: `app.use('/api/themes', themesRouter);`

**Testing**:
- Unit-Tests für alle Services
- Integration-Tests für API-Endpoints
- Load-Test für Cache-Performance

**Risiken**:
- **Groq API Limits**: Falls Rate-Limit erreicht → Fallback auf Seed-Themes
- **Cache-Miss bei Load**: Initial hohe AI-Kosten → Pre-Seed häufige Kombinationen

---

### Phase 2: FRONTEND - ANIMATION LIBRARY (Dauer: 3-4 Tage)

#### Ziele
- Erweiterte Animations-Library
- Theme-Animation-Component
- Theme-Provider

#### Tasks

1. ✅ **Animation Libraries**
   ```bash
   packages/frontend/src/animations/
   ```
   - [ ] `romantic.ts` - 8+ Animationen
   - [ ] `professional.ts` - 6+ Animationen
   - [ ] `playful.ts` - 8+ Animationen
   - [ ] `nature.ts` - 6+ Animationen
   - [ ] `minimal.ts` - 4+ Animationen
   - [ ] `index.ts` - Export all

2. ✅ **Theme Provider**
   ```bash
   packages/frontend/src/providers/ThemeProvider.tsx
   ```
   - [ ] React Context Setup
   - [ ] `applyTheme()` - CSS-Variablen setzen
   - [ ] `setTheme()` - Theme wechseln
   - [ ] Persist in localStorage (optional)

3. ✅ **Theme Animation Component**
   ```bash
   packages/frontend/src/components/theme/ThemeAnimation.tsx
   ```
   - [ ] Framer-Motion Wrapper
   - [ ] `mapToFramerVariants()` Helper
   - [ ] Support für alle Animation-Types

4. ✅ **Theme Utils**
   ```bash
   packages/frontend/src/lib/themeUtils.ts
   ```
   - [ ] `loadTheme(themeId)` - Fetch von API
   - [ ] `applyCustomizations(theme, custom)` - Merge customThemeData
   - [ ] `previewTheme(theme)` - Temporary Apply

**Testing**:
- Visual-Tests für jede Animation
- Performance-Tests (FPS während Animationen)
- Mobile-Tests (Touch-Interaktionen)

**Risiken**:
- **Performance auf Low-End-Devices**: Ambient-Animationen könnten laggen → Fallback auf einfache Animationen
- **Browser-Kompatibilität**: Testen auf Safari, Firefox, Chrome

---

### Phase 3: WIZARD-ERWEITERUNG (Dauer: 5-6 Tage)

#### Ziele
- Theme-Selection Step in EventWizard integrieren
- AI-Theme-Generierung im Wizard
- Live-Preview & A/B-Vergleich

#### Tasks

1. ✅ **Theme Selection Step**
   ```bash
   packages/frontend/src/components/wizard/steps/ThemeSelectionStep.tsx
   ```
   - [ ] UI-Design: 3 Theme-Cards nebeneinander
   - [ ] "AI generieren" Button
   - [ ] Loading-State (AI arbeitet)
   - [ ] Theme-Selection (Radio-Buttons)
   - [ ] "Anpassen" Button → Fine-Tuning-Modal

2. ✅ **Fine-Tuning Modal**
   ```bash
   packages/frontend/src/components/wizard/modals/ThemeFineTuningModal.tsx
   ```
   - [ ] Color-Picker für primary/accent
   - [ ] Animation-Intensity Slider (0-100%)
   - [ ] Font-Size Slider
   - [ ] Live-Preview (rechte Seite)
   - [ ] "Änderungen speichern" → customThemeData

3. ✅ **Theme Preview Component**
   ```bash
   packages/frontend/src/components/theme/ThemePreview.tsx
   ```
   - [ ] Mini-Gallery mit Sample-Fotos
   - [ ] Apply Theme CSS
   - [ ] Show Animations in Preview

4. ✅ **Wizard State Update**
   ```bash
   packages/frontend/src/components/wizard/types.ts
   ```
   - [ ] `selectedThemeId?: string`
   - [ ] `customThemeData?: Json`
   - [ ] Update Wizard Steps: Insert ThemeSelectionStep NACH EventTypeStep (Step 2)

5. ✅ **API Integration**
   ```bash
   packages/frontend/src/components/wizard/EventWizard.tsx
   ```
   - [ ] API Call: `POST /api/themes/generate` mit EventContext
   - [ ] Error-Handling (Fallback auf Default-Themes)
   - [ ] Submit: Include `themeId` and `customThemeData`

6. ✅ **Wizard Step Flow Update**
   - [ ] **Neue Reihenfolge**:
     1. Event Type Selection
     2. Basic Info (Titel, Datum, Location) → **Hier Context extrahieren!**
     3. **⭐ Theme Selection (NEU)** → AI-Generierung
     4. Design (Cover/Profile Images)
     5. Albums
     6. Access
     7-9. Extended Mode (Challenges, Guestbook, Co-Hosts, Summary)

**Testing**:
- User-Flow-Tests (E2E mit Playwright)
- Mobile-Tests (Step 3 auf kleinen Screens)
- Error-Scenarios (AI Timeout, No Themes generated)

**Risiken**:
- **AI-Generierung dauert zu lange**: Timeout nach 10s → Fallback auf Seed-Themes
- **User verwirrt von zu vielen Optionen**: A/B-Test mit "Empfohlen"-Badge

---

### Phase 4: THEME RENDERING (Dauer: 4-5 Tage)

#### Ziele
- Theme auf Public Event Page rendern
- Dynamic Theme Loading
- Animation Integration

#### Tasks

1. ✅ **Event Page Theme Loader**
   ```bash
   packages/frontend/src/app/e3/[slug]/layout.tsx
   ```
   - [ ] Fetch Event inkl. Theme-Data
   - [ ] Load Theme via `GET /api/themes/:themeId`
   - [ ] Merge mit `customThemeData`
   - [ ] Wrap in `<ThemeProvider initialTheme={theme}>`

2. ✅ **Component-Integration**
   ```bash
   packages/frontend/src/components/e3/
   ```
   - [ ] **EventHero.tsx**: Theme-Colors & Gradient
   - [ ] **PhotoGallery.tsx**: Wrap Photos in `<ThemeAnimation type="entrance">`
   - [ ] **MosaicWall.tsx**: Apply Theme wallLayout
   - [ ] **GuestbookEntry.tsx**: Theme-Colors für Cards

3. ✅ **Ambient Animations**
   ```bash
   packages/frontend/src/components/theme/AmbientAnimation.tsx
   ```
   - [ ] Petal Fall (Romantic)
   - [ ] Confetti (Playful)
   - [ ] Parallax-Shapes (Professional)
   - [ ] Performance: Max. 20 Partikel gleichzeitig

4. ✅ **Responsive Breakpoints**
   - [ ] Desktop: Full Animations
   - [ ] Tablet: Reduced Animations
   - [ ] Mobile: Minimal Animations (nur entrance/exit)

**Testing**:
- Performance-Tests (Lighthouse Score)
- Visual-Regression-Tests (Percy/Chromatic)
- Cross-Browser-Tests

**Risiken**:
- **Theme lädt zu langsam**: Server-Side-Rendering für Initial-Theme
- **Animationen zu heavy**: Detect low-end devices via `navigator.hardwareConcurrency`

---

### Phase 5: ADMIN THEME MANAGEMENT (Dauer: 3-4 Tage)

#### Ziele
- Theme-Marketplace im Admin-Dashboard
- Custom-Theme-Editor
- Theme-Statistiken

#### Tasks

1. ✅ **Theme Marketplace Page**
   ```bash
   packages/admin-dashboard/src/app/(admin)/manage/themes/page.tsx
   ```
   - [ ] Liste aller Public-Themes
   - [ ] Filter: Event Type, Season, Premium
   - [ ] Suche nach Name/Tags
   - [ ] Sortierung: Most Used, Newest, Highest Rated
   - [ ] Preview-Modal

2. ✅ **Custom Theme Creator**
   ```bash
   packages/admin-dashboard/src/app/(admin)/manage/themes/create/page.tsx
   ```
   - [ ] Form für Theme-Name, Description, Tags
   - [ ] Color-Picker für alle Farben
   - [ ] Animation-Config (JSON-Editor)
   - [ ] Font-Selection
   - [ ] Live-Preview (wie im Wizard)
   - [ ] Save: `POST /api/themes`

3. ✅ **Theme Details Page**
   ```bash
   packages/admin-dashboard/src/app/(admin)/manage/themes/[id]/page.tsx
   ```
   - [ ] Theme-Info
   - [ ] Verwendungs-Statistiken (Events mit diesem Theme)
   - [ ] Edit-Button → Editor
   - [ ] Delete-Button (mit Bestätigung)
   - [ ] "Als Vorlage duplizieren"

4. ✅ **Sidebar Update**
   ```bash
   packages/admin-dashboard/src/components/Sidebar.tsx
   ```
   - [ ] Neuer Nav-Item: "Themes" (Icon: Palette)

**Testing**:
- Admin-Flow-Tests
- Permission-Tests (nur ADMIN-Role)

**Risiken**: Keine kritischen Risiken.

---

### Phase 6: DESIGN-MODERNISIERUNG (Dauer: 6-8 Tage)

> **Kontext**: Diese Phase adressiert die umfassenden Design-Probleme, die in `claude/VOLLSTÄNDIGE-DESIGN-ANALYSE-2026.md` identifiziert wurden.

#### Ziele
- Konsolidierung der Design-Tokens
- Modernisierung des Admin-Dashboards
- Mobile-UI-Fixes

#### Tasks

1. ✅ **Design-Token Konsolidierung**
   ```bash
   packages/admin-dashboard/src/app/globals.css
   ```
   - [ ] Neue `--app-*` Tokens (siehe Design-Audit)
   - [ ] Multi-Layer Shadows
   - [ ] Gradient-Utilities
   - [ ] Glassmorphism-Classes

2. ✅ **Dashboard-Modernisierung**
   - [ ] **Landing Badges Page**: Modernisieren (bereits in Analyse)
   - [ ] **AI Providers Page**: Modernisieren (siehe `claude/analyse-ai-providers-page.md`)
   - [ ] **QR Templates Page**: Modernisieren
   - [ ] **Workflow Builder**: Visual-Refresh

3. ✅ **Mobile-Fixes**
   - [ ] **Bottom-Sheet Bug**: Swipe-to-Dismiss implementieren (Vaul-Library)
   - [ ] **Buttons zu klein**: Min. 44x44px Touch-Targets
   - [ ] **Spacing-Probleme**: Konsistente Abstände

4. ✅ **Dark-Mode Fix**
   - [ ] Braune Farben ersetzen durch Slate-Gray
   - [ ] Kontrast-Tests (WCAG AA)

**Testing**:
- Visual-Regression-Tests
- Mobile-Tests (iOS Safari, Chrome Mobile)
- Accessibility-Tests (axe-core)

**Risiken**:
- **Breaking Changes**: Alte Komponenten könnten brechen → Incremental Rollout
- **User-Gewöhnung**: A/B-Test für neues Design

---

### Phase 7: TESTING & OPTIMIZATION (Dauer: 4-5 Tage)

#### Ziele
- E2E-Tests
- Performance-Optimierung
- Security-Audit

#### Tasks

1. ✅ **E2E-Tests (Playwright)**
   ```bash
   packages/frontend/__tests__/e2e/theme-selection.spec.ts
   ```
   - [ ] Complete Wizard-Flow mit Theme-Selection
   - [ ] Theme-Generation Happy-Path
   - [ ] Theme-Generation Error-Path (Timeout)
   - [ ] Fine-Tuning-Modal
   - [ ] Public Event Page mit Theme

2. ✅ **Performance-Tests**
   - [ ] Lighthouse CI integrieren
   - [ ] Target: Score >90 (Performance, Accessibility, Best Practices)
   - [ ] Animation-Performance: 60 FPS

3. ✅ **Security-Audit**
   - [ ] Rate-Limiting für AI-Endpoints
   - [ ] Input-Validation (Zod-Schemas)
   - [ ] SQL-Injection-Tests
   - [ ] XSS-Tests

4. ✅ **Load-Tests (k6)**
   - [ ] 100 concurrent Theme-Generations
   - [ ] Cache-Hit-Rate nach Warm-Up
   - [ ] Database-Query-Optimierung

**Risiken**:
- **Performance-Bottlenecks**: Redis-Optimierung, DB-Indexing
- **Security-Vulnerabilities**: Regelmäßige Dependency-Updates

---

### Phase 8: DEPLOYMENT (Dauer: 2-3 Tage)

#### Ziele
- Staging-Deployment
- Production-Deployment mit Feature-Flag
- Monitoring

#### Tasks

1. ✅ **Staging-Deployment**
   - [ ] Deploy auf `https://staging-dash.gästefotos.com`
   - [ ] Smoke-Tests
   - [ ] User-Acceptance-Testing (UAT)

2. ✅ **Feature-Flag Setup**
   ```prisma
   model FeatureFlag {
     key       String   @id
     enabled   Boolean  @default(false)
     rollout   Int      @default(0)  // 0-100%
   }
   ```
   - [ ] Flag: `dynamic_themes_enabled`
   - [ ] Initial Rollout: 10% (Canary)

3. ✅ **Production-Deployment**
   - [ ] DB-Migration: `prisma migrate deploy`
   - [ ] Backend: `systemctl restart gaestefotos-backend`
   - [ ] Frontend: `systemctl restart gaestefotos-frontend`
   - [ ] Admin-Dashboard: `systemctl restart gaestefotos-admin-dashboard`

4. ✅ **Monitoring**
   - [ ] Sentry-Alerts für Theme-Errors
   - [ ] Prometheus-Metrics: Cache-Hit-Rate, AI-Latency
   - [ ] Grafana-Dashboard: Theme-Usage-Stats

5. ✅ **Rollout-Plan**
   - [ ] Woche 1: 10% (Canary)
   - [ ] Woche 2: 50% (wenn keine Errors)
   - [ ] Woche 3: 100% (Full-Rollout)

**Risiken**:
- **Migration-Fehler**: Pre-Test auf Staging-DB-Snapshot
- **High AI-Costs**: Budget-Alert bei >100€/Tag

---

## ⚠️ RISIKEN & ROLLBACK

### Kritische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation | Rollback |
|--------|-------------------|--------|------------|----------|
| Groq API Rate-Limit | Mittel | Hoch | Cache + Fallback auf Seed-Themes | Keine Änderung nötig |
| Performance-Probleme | Mittel | Hoch | Load-Tests, Animation-Throttling | Feature-Flag deaktivieren |
| DB-Migration fehlschlägt | Niedrig | Kritisch | Backup + Staging-Test | `prisma migrate reset` + Restore |
| User-Verwirrung (UX) | Mittel | Mittel | A/B-Tests, Onboarding-Tooltips | Wizard-Step optional machen |
| Theme-Rendering-Bugs | Mittel | Hoch | Visual-Regression-Tests | Fallback auf `designConfig.colorScheme` |

### Rollback-Strategie

#### Schneller Rollback (Feature-Flag)
```sql
UPDATE feature_flags SET enabled = false WHERE key = 'dynamic_themes_enabled';
```
→ System nutzt altes colorScheme-basiertes Design

#### Vollständiger Rollback (Code)
```bash
# 1. Git Revert
git revert <commit-hash> --no-commit
git commit -m "Rollback: Dynamic Themes"

# 2. Deploy old version
pnpm run build
systemctl restart gaestefotos-*

# 3. DB-Rollback (falls nötig)
npx prisma migrate resolve --rolled-back <migration-name>
```

#### Daten-Backup
```bash
# VOR jedem Deployment:
pg_dump -U postgres gaestefotos > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🧪 TESTING & QUALITÄTSSICHERUNG

### Test-Pyramide

```
         ┌────────────┐
         │  E2E Tests  │  (Playwright) - 10%
         └────────────┘
       ┌──────────────────┐
       │ Integration Tests │  (API-Tests) - 30%
       └──────────────────┘
     ┌────────────────────────┐
     │     Unit Tests          │  (Jest/Vitest) - 60%
     └────────────────────────┘
```

### Test-Coverage-Ziele

- **Backend Services**: >80% Coverage
- **Frontend Components**: >70% Coverage
- **API Endpoints**: 100% Critical Paths

### Testing-Checkliste

#### Unit-Tests
- [ ] `themeContextExtractor.ts`: Alle Edge-Cases (keine Datum, ungültige Location)
- [ ] `aiThemeGenerator.ts`: Mock Groq-Responses
- [ ] `cachedThemeGenerator.ts`: Cache-Hit/Miss-Scenarios
- [ ] `themeValidator.ts`: 10+ Test-Themes (gute/schlechte)

#### Integration-Tests
- [ ] API: `POST /api/themes/generate` → Valid Response
- [ ] API: `GET /api/themes/:id` → 404 bei ungültiger ID
- [ ] API: Cache-Invalidierung → Neue Themes generiert

#### E2E-Tests
- [ ] Wizard: Vollständiger Flow mit Theme-Selection
- [ ] Public Event Page: Theme korrekt geladen
- [ ] Admin: Theme erstellen, bearbeiten, löschen
- [ ] Mobile: Wizard auf iPhone 12 (Safari)

#### Visual-Regression-Tests
- [ ] EventHero mit 3 verschiedenen Themes
- [ ] PhotoGallery mit Animationen
- [ ] Admin-Dashboard: Themes-Page

#### Performance-Tests
- [ ] Lighthouse: Score >90
- [ ] Animation-FPS: >55 FPS (60 FPS Ziel)
- [ ] API-Latency: Theme-Generation <5s (P95)

---

## 🚀 DEPLOYMENT-PLAN

### Pre-Deployment-Checkliste

- [ ] Alle Tests grün (Unit, Integration, E2E)
- [ ] Staging-Deployment erfolgreich
- [ ] UAT abgeschlossen (3+ Test-User)
- [ ] Performance-Tests bestanden
- [ ] Security-Audit abgeschlossen
- [ ] DB-Backup erstellt
- [ ] Rollback-Plan getestet
- [ ] Monitoring-Alerts konfiguriert
- [ ] Documentation aktualisiert

### Deployment-Steps (Production)

#### 1. Database-Migration
```bash
# SSH auf Production-Server
ssh root@gaestefotos.com

# Backup
pg_dump -U postgres gaestefotos > ~/backups/pre-theme-migration.sql

# Migration
cd /opt/gaestefotos/app/packages/backend
npx prisma migrate deploy

# Verify
npx prisma studio  # Check EventTheme table exists
```

#### 2. Backend-Deployment
```bash
cd /opt/gaestefotos/app

# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Build backend
pnpm --filter @gaestefotos/backend build

# Restart service
systemctl restart gaestefotos-backend

# Check logs
journalctl -u gaestefotos-backend -f -n 50
```

#### 3. Frontend-Deployment
```bash
# Build frontend
pnpm --filter @gaestefotos/frontend build

# Restart service
systemctl restart gaestefotos-frontend

# Check
curl https://app.gästefotos.com/api/health
```

#### 4. Admin-Dashboard-Deployment
```bash
# Build admin-dashboard
pnpm --filter @gaestefotos/admin-dashboard build

# Restart service
systemctl restart gaestefotos-admin-dashboard

# Check
curl https://dash.gästefotos.com/api/health
```

#### 5. Seed Initial Themes
```bash
cd /opt/gaestefotos/app/packages/backend
npx prisma db seed
```

#### 6. Feature-Flag Activation
```bash
# Enable für 10% der User (Canary)
psql -U postgres gaestefotos -c \
  "INSERT INTO feature_flags (key, enabled, rollout) VALUES ('dynamic_themes_enabled', true, 10);"
```

#### 7. Smoke-Tests
```bash
# Test Theme-Generation
curl -X POST https://api.gästefotos.com/api/themes/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "eventType": "HOCHZEIT",
      "season": "SPRING",
      "timeOfDay": "EVENING"
    },
    "count": 3
  }'

# Test Theme-Loading
curl https://api.gästefotos.com/api/themes/<theme-id>
```

#### 8. Monitoring Check
- [ ] Grafana: Theme-Usage-Stats sichtbar
- [ ] Sentry: Keine neuen Errors
- [ ] Prometheus: Cache-Hit-Rate >0%

### Post-Deployment

#### Woche 1 (Canary)
- [ ] Täglich Logs checken
- [ ] User-Feedback sammeln
- [ ] Performance-Metriken überwachen
- [ ] AI-Kosten tracken

#### Woche 2 (50% Rollout)
```sql
UPDATE feature_flags SET rollout = 50 WHERE key = 'dynamic_themes_enabled';
```

#### Woche 3 (Full Rollout)
```sql
UPDATE feature_flags SET rollout = 100 WHERE key = 'dynamic_themes_enabled';
```

---

## 📊 SUCCESS METRICS

### KPIs

| Metrik | Baseline | Ziel (3 Monate) |
|--------|----------|-----------------|
| Theme-Adoption-Rate | 0% | >70% Events nutzen AI-Themes |
| User-Satisfaction (NPS) | - | >8/10 (Wizard-Rating) |
| AI-Cost per Event | - | <€0.50 (durch Caching) |
| Cache-Hit-Rate | 0% | >85% |
| Page-Load-Time (Public Event) | 2.5s | <2.0s |
| Lighthouse-Score | 75 | >90 |
| Theme-Marketplace-Usage | - | 100+ Custom-Themes |

### Business Impact

- **Differentiation**: Einzigartiges Feature im Markt
- **Conversion**: Schönere Events → Höhere Conversion-Rate
- **Retention**: User erstellen mehr Events (wegen besserer Designs)
- **Word-of-Mouth**: User teilen schönere Events → Organisches Wachstum

---

## 🎓 LEARNINGS & BEST PRACTICES

### Do's ✅
- **Hierarchisches Caching**: Reduziert AI-Kosten drastisch
- **AI-Assisted, Host-Curated**: Balanciert Automatisierung & Kontrolle
- **Anti-Kitsch-Rules**: Sichert Design-Qualität
- **Feature-Flag-Rollout**: Ermöglicht schnellen Rollback
- **Visual-Regression-Tests**: Verhindert Design-Bugs

### Don'ts ❌
- **Voll-Automatisierung**: User wollen Kontrolle
- **Zu viele Animationen**: Performance-Killer
- **Keine Cache-Strategie**: Explodieren AI-Kosten
- **Big-Bang-Deployment**: Risiko zu hoch
- **Ignorieren von Mobile**: 60%+ Traffic ist mobil

---

## 📚 ANHANG

### Relevante Dokumente

1. **`claude/VOLLSTÄNDIGE-DESIGN-ANALYSE-2026.md`**
   - Umfassende Design-Audit des Systems
   - Identifizierte Design-Probleme
   - Modernisierungs-Vorschläge

2. **`claude/analyse-ai-providers-page.md`**
   - Spezifische Analyse der AI-Providers-Page
   - Design-Inkonsistenzen
   - Feature-Empfehlungen

3. **`claude/DESIGN-AUDIT-2026.md`**
   - Benchmark gegen Canva/Creative Fabrica
   - Design-Token-Chaos-Dokumentation
   - Prioritierte Roadmap

4. **`claude/todo.md`**
   - Live-Todo-Liste (wird laufend aktualisiert)

### Code-Referenzen

#### Backend
- `packages/backend/prisma/schema.prisma` - Datenbank-Schema
- `packages/backend/src/routes/events.ts` - Event-API
- `packages/backend/src/services/aiService.ts` - Basis-AI-Service

#### Frontend
- `packages/frontend/src/components/wizard/EventWizard.tsx` - Event-Wizard
- `packages/frontend/src/components/e3/` - Public Event Components
- `packages/frontend/src/app/globals.css` - Design-Tokens

#### Admin
- `packages/admin-dashboard/src/app/(admin)/manage/` - Admin-Pages
- `packages/admin-dashboard/src/components/Sidebar.tsx` - Navigation

### API-Endpoints

#### Themes API
```
POST   /api/themes/generate         - AI Theme-Generierung
GET    /api/themes                  - Liste aller Themes
GET    /api/themes/:id              - Single Theme
POST   /api/themes                  - Custom Theme erstellen (Admin)
PUT    /api/themes/:id              - Theme bearbeiten (Admin)
DELETE /api/themes/:id              - Theme löschen (Admin)
GET    /api/themes/stats            - Verwendungs-Statistiken (Admin)
```

#### Events API (Erweitert)
```
POST   /api/events                  - Event erstellen (inkl. themeId)
GET    /api/events/:id              - Event laden (inkl. Theme-Data)
PUT    /api/events/:id/theme        - Theme wechseln
```

---

## 🎯 NEXT STEPS FÜR OPUS

### Sofort starten (Phase 0)
1. Prisma-Schema erweitern
2. Migration erstellen & testen
3. Seed-Themes erstellen

### Diese Woche (Phase 1)
1. Context-Extractor implementieren
2. AI-Theme-Generator aufsetzen
3. Caching-Layer bauen

### Nächste Woche (Phase 2-3)
1. Animation-Library erstellen
2. Theme-Provider implementieren
3. Wizard erweitern

---

**STATUS**: 🟢 Ready for Implementation  
**LETZTE AKTUALISIERUNG**: 2026-02-16  
**GESCHÄTZTER AUFWAND**: 30-40 Entwicklertage  
**PRIORITÄT**: 🔥 HOCH

---

> **💡 TIP für OPUS**: Beginne mit Phase 0 (DB-Migration), dann Phase 1 (Backend). Erst wenn Backend stabil läuft, mit Frontend-Integration starten. Teste jeden Schritt gründlich!

> **⚠️ WICHTIG**: Alle Änderungen am Wizard müssen auch die Admin-Event-Creation berücksichtigen. Events, die vom Admin erstellt werden, sollten Default-Themes erhalten.

> **🚀 ERFOLGS-KRITERIUM**: Ein neuer User kann in <5 Minuten ein wunderschönes Event mit AI-generiertem Theme erstellen, das nicht kitschig aussieht und perfekt zum Anlass passt.
