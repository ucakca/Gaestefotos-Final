# 🗺️ System-Mapping: Dynamic Event Themes

> **Zweck**: Übersicht aller Komponenten, Abhängigkeiten und Datenflüsse für Dynamic Event Themes  
> **Referenz**: `claude/OPUS-MASTER-PLAN-DYNAMIC-THEMES.md`

---

## 📊 COMPONENT-HIERARCHIE

### Backend (packages/backend)

```
src/
├── routes/
│   ├── themes.ts                    ⭐ NEW: Theme CRUD API
│   ├── events.ts                    ✏️ MODIFY: Include themeId in create/update
│   └── adminEvents.ts               ✏️ MODIFY: Default theme for admin-created events
│
├── services/
│   ├── aiService.ts                 ✅ EXISTS: Basis-AI-Integration (Groq)
│   ├── aiThemeGenerator.ts          ⭐ NEW: AI Theme-Generierung
│   ├── themeContextExtractor.ts     ⭐ NEW: Context-Extraktion (Season, Location, etc.)
│   ├── cachedThemeGenerator.ts      ⭐ NEW: Hierarchisches Caching
│   ├── themeValidator.ts            ⭐ NEW: Anti-Kitsch Validation
│   ├── storageService.ts            ✅ EXISTS: SeaweedFS Integration
│   └── cacheService.ts              ✅ EXISTS: Redis Integration
│
├── prisma/
│   ├── schema.prisma                ✏️ MODIFY: EventTheme model + enums
│   └── seed-themes.ts               ⭐ NEW: Seed default themes
│
└── index.ts                         ✏️ MODIFY: Mount theme routes
```

### Frontend (packages/frontend)

```
src/
├── app/
│   ├── e3/[slug]/
│   │   ├── layout.tsx               ✏️ MODIFY: Load theme & wrap in ThemeProvider
│   │   └── page.tsx                 ✏️ MODIFY: Render with theme
│   └── events/[id]/dashboard/
│       └── page.tsx                 ✏️ MODIFY: Show theme info
│
├── components/
│   ├── wizard/
│   │   ├── EventWizard.tsx          ✏️ MODIFY: Add ThemeSelectionStep
│   │   ├── steps/
│   │   │   ├── ThemeSelectionStep.tsx     ⭐ NEW: AI Theme Selection
│   │   │   ├── DesignStep.tsx             ✅ EXISTS: Cover/Profile Images
│   │   │   └── ...                        (other existing steps)
│   │   ├── modals/
│   │   │   └── ThemeFineTuningModal.tsx   ⭐ NEW: Fine-Tuning UI
│   │   └── types.ts                       ✏️ MODIFY: Add themeId, customThemeData
│   │
│   ├── theme/                       ⭐ NEW FOLDER
│   │   ├── ThemeAnimation.tsx       ⭐ NEW: Animation wrapper
│   │   ├── ThemePreview.tsx         ⭐ NEW: Live preview
│   │   ├── ThemeComparison.tsx      ⭐ NEW: A/B comparison
│   │   └── AmbientAnimation.tsx     ⭐ NEW: Background animations
│   │
│   └── e3/
│       ├── EventHero.tsx            ✏️ MODIFY: Apply theme colors/gradient
│       ├── PhotoGallery.tsx         ✏️ MODIFY: Wrap in ThemeAnimation
│       ├── MosaicWall.tsx           ✏️ MODIFY: Apply wallLayout
│       └── GuestbookEntry.tsx       ✏️ MODIFY: Theme colors
│
├── animations/                      ⭐ NEW FOLDER
│   ├── romantic.ts                  ⭐ NEW: Romantic animations
│   ├── professional.ts              ⭐ NEW: Professional animations
│   ├── playful.ts                   ⭐ NEW: Playful animations
│   ├── nature.ts                    ⭐ NEW: Nature animations
│   ├── minimal.ts                   ⭐ NEW: Minimal animations
│   └── index.ts                     ⭐ NEW: Export all
│
├── providers/
│   └── ThemeProvider.tsx            ⭐ NEW: Theme Context & CSS injection
│
└── lib/
    └── themeUtils.ts                ⭐ NEW: Helper functions
```

### Admin Dashboard (packages/admin-dashboard)

```
src/
├── app/(admin)/manage/
│   ├── themes/                      ⭐ NEW FOLDER
│   │   ├── page.tsx                 ⭐ NEW: Theme Marketplace
│   │   ├── create/
│   │   │   └── page.tsx             ⭐ NEW: Custom Theme Editor
│   │   └── [id]/
│   │       └── page.tsx             ⭐ NEW: Theme Details & Stats
│   │
│   ├── events/create/
│   │   └── page.tsx                 ✏️ MODIFY: Default theme for admin-created events
│   │
│   └── workflows/                   ✅ EXISTS: Workflow Builder (ReactFlow)
│
├── components/
│   ├── Sidebar.tsx                  ✏️ MODIFY: Add "Themes" nav item
│   └── ui/                          ✅ EXISTS: Shared components
│
└── app/globals.css                  ✏️ MODIFY: Design token consolidation
```

---

## 🔄 DATENFLUSS

### 1. Event Creation mit Theme-Selection

```
┌──────────────────────────────────────────────────────────────┐
│ USER: Start Event-Erstellung                                  │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ EventWizard (Frontend)                                         │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Step 1: EventTypeStep                                     │ │
│ │   → User wählt: HOCHZEIT                                  │ │
│ └────────────────────────┬─────────────────────────────────┘ │
│                          ↓                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Step 2: BasicInfoStep                                     │ │
│ │   → User gibt ein:                                        │ │
│ │     - Titel: "Anna & Max"                                 │ │
│ │     - Datum: 2026-06-15 18:00                             │ │
│ │     - Location: "Schloss Neuschwanstein"                  │ │
│ └────────────────────────┬─────────────────────────────────┘ │
│                          ↓                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ⭐ Step 3: ThemeSelectionStep (NEU)                        │ │
│ │   → User klickt "AI Themes generieren"                    │ │
│ │   → API Call:                                             │ │
│ │     POST /api/themes/generate                             │ │
│ │     Body: {                                               │ │
│ │       context: {                                          │ │
│ │         eventType: "HOCHZEIT",                            │ │
│ │         title: "Anna & Max",                              │ │
│ │         dateTime: "2026-06-15T18:00",                     │ │
│ │         locationName: "Schloss Neuschwanstein"            │ │
│ │       },                                                  │ │
│ │       count: 3                                            │ │
│ │     }                                                     │ │
│ └────────────────────────┬─────────────────────────────────┘ │
└──────────────────────────┼─────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ Backend: Theme-Generierung                                     │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ routes/themes.ts: POST /api/themes/generate               │ │
│ └────────────────────────┬─────────────────────────────────┘ │
│                          ↓                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ themeContextExtractor.ts: extractContext()                │ │
│ │   → Extract from dateTime:                                │ │
│ │     - season: SUMMER                                      │ │
│ │     - timeOfDay: EVENING                                  │ │
│ │   → Geocode location:                                     │ │
│ │     - locationStyle: CASTLE                               │ │
│ │   → Extract keywords from title:                          │ │
│ │     - ["Anna", "Max"] → generic                           │ │
│ │   → Result: EventContext {                                │ │
│ │       eventType: HOCHZEIT,                                │ │
│ │       season: SUMMER,                                     │ │
│ │       timeOfDay: EVENING,                                 │ │
│ │       locationStyle: CASTLE,                              │ │
│ │       keywords: []                                        │ │
│ │     }                                                     │ │
│ └────────────────────────┬─────────────────────────────────┘ │
│                          ↓                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ cachedThemeGenerator.ts: getCachedThemes()                │ │
│ │   → Check Cache-Hierarchie:                               │ │
│ │     1. Exact-Match: MISS                                  │ │
│ │     2. Combination: MISS                                  │ │
│ │     3. Location-Style: MISS                               │ │
│ │     4. Season-Palette: HIT! ✅                            │ │
│ │   → Return cached themes for HOCHZEIT + SUMMER            │ │
│ └────────────────────────┬─────────────────────────────────┘ │
│                          ↓ (Falls MISS)                       │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ aiThemeGenerator.ts: generateThemes()                     │ │
│ │   → Build Prompt:                                         │ │
│ │     "Generiere 3 Hochzeits-Themes für einen              │ │
│ │      Sommerabend auf einem Schloss. Stil: elegant,        │ │
│ │      romantisch, königlich. Zeit: Abenddämmerung."        │ │
│ │   → Call Groq AI (Mixtral-8x7b)                           │ │
│ │   → Parse Response (JSON mit Zod)                         │ │
│ │   → Result: 3 GeneratedThemes                             │ │
│ └────────────────────────┬─────────────────────────────────┘ │
│                          ↓                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ themeValidator.ts: calculateTasteScore()                  │ │
│ │   → Validate each theme:                                  │ │
│ │     Theme 1: "Royal Summer Evening"                       │ │
│ │       - colorHarmony: 23/25                               │ │
│ │       - animationSubtlety: 20/25                          │ │
│ │       - typographyBalance: 18/20                          │ │
│ │       - consistencyScore: 18/20                           │ │
│ │       - innovationScore: 8/10                             │ │
│ │       → Total: 87/100 ✅                                  │ │
│ │     Theme 2: "Elegant Castle" → 92/100 ✅                │ │
│ │     Theme 3: "Golden Sunset" → 56/100 ❌ (rejected)       │ │
│ │   → Return top 3 (or regenerate if <3)                    │ │
│ └────────────────────────┬─────────────────────────────────┘ │
│                          ↓                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Cache themes in all levels                                │ │
│ └────────────────────────┬─────────────────────────────────┘ │
│                          ↓                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Return: [Theme1, Theme2, Theme3]                          │ │
│ └────────────────────────┬─────────────────────────────────┘ │
└──────────────────────────┼─────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ EventWizard: ThemeSelectionStep                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Display 3 Theme-Cards:                                    │ │
│ │   [Theme1: "Royal Summer Evening" - 87/100]               │ │
│ │   [Theme2: "Elegant Castle" - 92/100] ⭐ Empfohlen       │ │
│ │   [Theme3: regenerated]                                   │ │
│ │                                                           │ │
│ │ User wählt Theme2 → "Elegant Castle"                      │ │
│ │ User klickt "Anpassen" → ThemeFineTuningModal             │ │
│ │   → Ändert primary-color: #8B5A3C → #A0522D              │ │
│ │   → Reduziert animation-intensity: 100% → 80%             │ │
│ │ Save: customThemeData = {                                 │ │
│ │   colorOverrides: { primary: "#A0522D" },                 │ │
│ │   animationIntensity: 0.8                                 │ │
│ │ }                                                         │ │
│ └────────────────────────┬─────────────────────────────────┘ │
│                          ↓                                    │
│ Continue with Step 4-10...                                    │
│                          ↓                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Final Submit: createEvent()                               │ │
│ │   POST /api/events                                        │ │
│ │   FormData: {                                             │ │
│ │     title, dateTime, location,                            │ │
│ │     themeId: "theme2-id",                                 │ │
│ │     customThemeData: { ... },                             │ │
│ │     coverImage, profileImage, albums, ...                 │ │
│ │   }                                                       │ │
│ └────────────────────────┬─────────────────────────────────┘ │
└──────────────────────────┼─────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ Backend: Event Creation                                        │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ routes/events.ts: POST /api/events                        │ │
│ │   → Validate themeId exists                               │ │
│ │   → Create Event in DB:                                   │ │
│ │     {                                                     │ │
│ │       title: "Anna & Max",                                │ │
│ │       themeId: "theme2-id",                               │ │
│ │       designConfig: {                                     │ │
│ │         customThemeData: {                                │ │
│ │           colorOverrides: { primary: "#A0522D" },         │ │
│ │           animationIntensity: 0.8                         │ │
│ │         },                                                │ │
│ │         coverImageUrl: "...",                             │ │
│ │         profileImageUrl: "..."                            │ │
│ │       }                                                   │ │
│ │     }                                                     │ │
│ │   → Return: { id, slug, ... }                             │ │
│ └────────────────────────┬─────────────────────────────────┘ │
└──────────────────────────┼─────────────────────────────────────┘
                           ↓
                      EVENT CREATED! 🎉
```

### 2. Public Event Page: Theme Rendering

```
┌──────────────────────────────────────────────────────────────┐
│ USER: Öffnet Public Event Link                                │
│ https://app.gästefotos.com/e3/anna-max-ktqc                   │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Frontend: /e3/[slug]/layout.tsx                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Server-Side Rendering (SSR):                              │ │
│ │   1. Fetch Event by slug:                                 │ │
│ │      GET /api/events?slug=anna-max-ktqc                   │ │
│ │      → Returns: {                                         │ │
│ │          id, title, slug, themeId,                        │ │
│ │          designConfig: { customThemeData, ... }           │ │
│ │        }                                                  │ │
│ │                                                           │ │
│ │   2. Fetch Theme:                                         │ │
│ │      GET /api/themes/:themeId                             │ │
│ │      → Returns: EventTheme {                              │ │
│ │          id, name, colors, animations, fonts, ...         │ │
│ │        }                                                  │ │
│ │                                                           │ │
│ │   3. Merge mit customThemeData:                           │ │
│ │      finalTheme = {                                       │ │
│ │        ...theme,                                          │ │
│ │        colors: {                                          │ │
│ │          ...theme.colors,                                 │ │
│ │          primary: customThemeData.colorOverrides.primary  │ │
│ │        },                                                 │ │
│ │        animations: applyIntensity(                        │ │
│ │          theme.animations,                                │ │
│ │          customThemeData.animationIntensity               │ │
│ │        )                                                  │ │
│ │      }                                                    │ │
│ │                                                           │ │
│ │   4. Wrap in ThemeProvider:                               │ │
│ │      <ThemeProvider initialTheme={finalTheme}>            │ │
│ │        <children />                                       │ │
│ │      </ThemeProvider>                                     │ │
│ └────────────────────────┬─────────────────────────────────┘ │
└──────────────────────────┼─────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ ThemeProvider (Client-Side)                                   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ useEffect(() => {                                         │ │
│ │   applyTheme();                                           │ │
│ │ }, [theme])                                               │ │
│ │                                                           │ │
│ │ applyTheme() {                                            │ │
│ │   // Set CSS Variables:                                   │ │
│ │   document.documentElement.style.setProperty(             │ │
│ │     '--theme-primary', theme.colors.primary               │ │
│ │   );                                                      │ │
│ │   document.documentElement.style.setProperty(             │ │
│ │     '--theme-secondary', theme.colors.secondary           │ │
│ │   );                                                      │ │
│ │   // ... all color variables                              │ │
│ │                                                           │ │
│ │   // Set Font Variables:                                  │ │
│ │   document.documentElement.style.setProperty(             │ │
│ │     '--theme-font-heading', theme.fonts.heading           │ │
│ │   );                                                      │ │
│ │   // ...                                                  │ │
│ │ }                                                         │ │
│ └────────────────────────┬─────────────────────────────────┘ │
└──────────────────────────┼─────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ Page Components Render mit Theme                              │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ EventHero.tsx                                             │ │
│ │   → Uses: var(--theme-primary)                            │ │
│ │   → Gradient: var(--theme-gradient-start) to              │ │
│ │              var(--theme-gradient-end)                    │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ PhotoGallery.tsx                                          │ │
│ │   <ThemeAnimation animationType="entrance">               │ │
│ │     {photos.map(photo => (                                │ │
│ │       <PhotoCard key={photo.id} />                        │ │
│ │     ))}                                                   │ │
│ │   </ThemeAnimation>                                       │ │
│ │   → Animation: theme.animations.entrance                  │ │
│ │                (type: "fade", duration: 600ms)            │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ AmbientAnimation.tsx (Background)                         │ │
│ │   {theme.animations.ambient && (                          │ │
│ │     <PetalFall count={20} speed={0.8} />                  │ │
│ │   )}                                                      │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ MosaicWall.tsx                                            │ │
│ │   layout={theme.wallLayout} // "masonry"                  │ │
│ │   → Renders photos in Masonry-Grid                        │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                           ↓
              BEAUTIFULLY THEMED EVENT! 🎨
```

---

## 🔗 ABHÄNGIGKEITEN

### Externe Dependencies

#### Backend
- **Groq SDK** (`groq-sdk`): AI Theme-Generierung
- **Redis** (existing): Hierarchisches Caching
- **Prisma** (existing): Database ORM
- **Zod** (existing): Schema-Validation
- **Sharp** (existing): Image Processing (falls Theme-Previews generiert werden)

#### Frontend
- **Framer Motion** (existing): Animationen
- **Zustand** (existing): State-Management
- **React** (existing): UI-Framework
- **Next.js 16** (existing): Framework

#### Admin Dashboard
- **Monaco Editor** (optional): JSON-Editor für Custom-Theme-Creation
- **React Color** (optional): Color-Picker

### Interne Abhängigkeiten

```
EventWizard
  ├─ depends on: ThemeSelectionStep
  │   ├─ depends on: /api/themes/generate
  │   │   ├─ depends on: aiThemeGenerator.ts
  │   │   │   ├─ depends on: Groq SDK
  │   │   │   └─ depends on: themeContextExtractor.ts
  │   │   ├─ depends on: cachedThemeGenerator.ts
  │   │   │   └─ depends on: Redis
  │   │   └─ depends on: themeValidator.ts
  │   └─ depends on: ThemePreview.tsx
  └─ depends on: /api/events (create)
      └─ depends on: Prisma (EventTheme relation)

Public Event Page
  ├─ depends on: /api/events/:id (with theme)
  ├─ depends on: /api/themes/:themeId
  ├─ depends on: ThemeProvider
  │   └─ depends on: CSS Variables
  ├─ depends on: ThemeAnimation
  │   └─ depends on: Framer Motion + Animation-Library
  └─ depends on: AmbientAnimation
      └─ depends on: Animation-Library (romantic.ts, etc.)

Admin Theme Management
  ├─ depends on: /api/themes (CRUD)
  └─ depends on: ThemePreview
```

---

## 🎯 CRITICAL PATH

### Must-Have für MVP (Phase 0-3)

1. ✅ **Prisma Schema** (EventTheme Model) → BLOCKING für alles
2. ✅ **AI Theme Generator** → BLOCKING für Wizard
3. ✅ **Theme-Selection Step** → BLOCKING für Event-Creation
4. ✅ **Theme-Provider** → BLOCKING für Public Event Page
5. ✅ **Animation-Library** → BLOCKING für Theme-Rendering

### Can-Wait (Phase 4-6)

- Admin Theme Marketplace (User können default Themes nutzen)
- Custom Theme Editor (Admin-Feature, nicht kritisch)
- Design-Modernisierung (Improvement, nicht kritisch)
- Advanced Ambient-Animations (Nice-to-have)

---

## 📋 DATENBANKSCHEMA

### EventTheme Table

```sql
CREATE TABLE event_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Context Metadata
  event_type VARCHAR(50) NOT NULL,  -- HOCHZEIT, CORPORATE, etc.
  season VARCHAR(20),               -- SPRING, SUMMER, AUTUMN, WINTER
  time_of_day VARCHAR(20),          -- MORNING, AFTERNOON, EVENING, NIGHT
  location_style VARCHAR(50),       -- URBAN, RURAL, BEACH, etc.
  
  -- Theme Properties
  is_premium BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  
  -- Design Data (JSON)
  colors JSONB NOT NULL,
  animations JSONB NOT NULL,
  fonts JSONB NOT NULL,
  frames JSONB NOT NULL,
  wall_layout VARCHAR(50) NOT NULL DEFAULT 'masonry',
  
  -- Metadata
  preview_image TEXT,
  description TEXT,
  tags TEXT[],
  
  -- Stats
  usage_count INTEGER DEFAULT 0,
  rating FLOAT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_event_themes_event_type_premium ON event_themes(event_type, is_premium);
CREATE INDEX idx_event_themes_season ON event_themes(season);
CREATE INDEX idx_event_themes_public_usage ON event_themes(is_public, usage_count);
```

### Event Table (Modified)

```sql
ALTER TABLE events
ADD COLUMN theme_id UUID REFERENCES event_themes(id) ON DELETE SET NULL,
ADD COLUMN custom_theme_data JSONB;

CREATE INDEX idx_events_theme_id ON events(theme_id);
```

---

## 🧪 TESTING-STRATEGIE

### Unit-Tests

| Component | Test-Fälle |
|-----------|-----------|
| `themeContextExtractor.ts` | ✅ Season-Detection, ✅ Time-of-Day, ✅ Keyword-Extraction, ✅ Edge-Cases |
| `aiThemeGenerator.ts` | ✅ Groq-API-Mock, ✅ Response-Parsing, ✅ Error-Handling |
| `cachedThemeGenerator.ts` | ✅ Cache-Hit, ✅ Cache-Miss, ✅ Fallback-Logic |
| `themeValidator.ts` | ✅ Good-Theme (Score >80), ✅ Bad-Theme (Score <60) |
| `ThemeProvider.tsx` | ✅ CSS-Variables-Applied, ✅ Theme-Switch |
| `ThemeAnimation.tsx` | ✅ Framer-Variants-Mapping |

### Integration-Tests

| Endpoint | Test-Fälle |
|----------|-----------|
| `POST /api/themes/generate` | ✅ Valid-Context → 3 Themes, ✅ Invalid-Context → 400, ✅ Timeout → Fallback |
| `GET /api/themes/:id` | ✅ Existing-Theme → 200, ✅ Non-Existing → 404 |
| `POST /api/events` | ✅ With-ThemeId → Saved, ✅ Without-ThemeId → Default-Theme |

### E2E-Tests (Playwright)

| Flow | Test-Fälle |
|------|-----------|
| Event-Creation-Wizard | ✅ Complete-Flow mit Theme-Selection, ✅ AI-Timeout → Fallback, ✅ Fine-Tuning |
| Public-Event-Page | ✅ Theme-Loaded, ✅ Animations-Work, ✅ Colors-Applied |
| Admin-Theme-CRUD | ✅ Create-Theme, ✅ Edit-Theme, ✅ Delete-Theme |

---

## 🚨 RISIKO-MATRIX

| Risiko | Wahrsch. | Impact | Mitigation | Rollback |
|--------|----------|--------|------------|----------|
| 🔴 AI-API-Rate-Limit | Mittel | Hoch | Hierarchisches Caching, Fallback auf Seed-Themes | Keine Änderung |
| 🟡 Performance (Animationen) | Mittel | Mittel | FPS-Monitoring, Throttling auf Low-End-Devices | Feature-Flag |
| 🔴 DB-Migration-Fehler | Niedrig | Kritisch | Backup, Staging-Test | `prisma migrate reset` |
| 🟢 User-Verwirrung (UX) | Mittel | Niedrig | A/B-Tests, Tooltips | Step optional machen |
| 🟡 Theme-Rendering-Bugs | Mittel | Hoch | Visual-Regression-Tests | Fallback auf colorScheme |

---

## 📚 RESSOURCEN

### Code-Referenzen

- **Existing Event-Wizard**: `packages/frontend/src/components/wizard/EventWizard.tsx`
- **Existing AI-Service**: `packages/backend/src/services/aiService.ts`
- **Existing Redis-Cache**: `packages/backend/src/services/cacheService.ts`
- **Existing Framer-Motion**: Used in `packages/frontend/src/components/` (various)

### Externe Docs

- **Groq SDK**: https://console.groq.com/docs/quickstart
- **Framer Motion**: https://www.framer.com/motion/
- **Prisma**: https://www.prisma.io/docs
- **Redis Caching**: https://redis.io/docs/manual/pipelining/

---

## ✅ NEXT STEPS

1. 📖 **OPUS liest**: `claude/OPUS-MASTER-PLAN-DYNAMIC-THEMES.md`
2. 🚀 **OPUS startet**: Phase 0 (Prisma Schema erweitern)
3. 📋 **OPUS trackt**: `claude/todo-dynamic-themes.md` (Tasks abhaken)

---

**DOKUMENT-STATUS**: ✅ Vollständig  
**LETZTE AKTUALISIERUNG**: 2026-02-16  
**VERSION**: 1.0
