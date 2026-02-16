# ✅ TODO: Dynamic Event Themes Implementation (KORRIGIERT)

> **Erstellt**: 2026-02-16  
> **Korrigiert**: 2026-02-16 (nach Opus-Review)  
> **Referenz**: `claude/OPUS-KORREKTUR-PRAGMATISCH.md` (WICHTIG ZUERST LESEN!)  
> **Agent**: Opus 4.6

## 🚨 WICHTIGE KORREKTUREN
- ❌ **Fehler**: "UnifiedAiCacheService" von Null neu bauen → ✅ **Korrektur**: Bestehendes `aiCache.ts` (464 Zeilen) erweitern!
- ❌ **Fehler**: €500+ Cache-Kosten → ✅ **Korrektur**: €0.40 (Faktor 1000 zu hoch!)
- ❌ **Fehler**: 6-Level-Cache-Hierarchie → ✅ **Korrektur**: 2-3 Levels reichen (pragmatisch!)
- ❌ **Fehler**: EventType Enums (HOCHZEIT) → ✅ **Korrektur**: Strings ("wedding", "party")
- ❌ **Fehler**: 35-45 Tage Aufwand → ✅ **Korrektur**: 20-25 Tage!

**📖 BITTE ZUERST LESEN**: `claude/OPUS-KORREKTUR-PRAGMATISCH.md`

---

## 🎯 PHASE 0: VORBEREITUNG

### Database Schema (KORRIGIERT: Strings statt Enums!)
- [ ] `EventTheme` Model zu `schema.prisma` hinzufügen
- [ ] ⚠️ **KEINE ENUMS!** Nutze `String` statt `EventType`, `Season`, etc.
  - `eventType: String` → Kompatibel mit bestehenden "wedding", "party", "business"
  - `season: String?` → "spring", "summer", "autumn", "winter"
  - `locationStyle: String?` → "indoor", "outdoor", "beach", etc.
- [ ] `Event` Model erweitern: `themeId`, (designConfig bleibt!)
- [ ] Migration erstellen: `npx prisma migrate dev --name add-event-themes`
- [ ] Migration auf Staging testen
- [ ] Backup erstellen vor Production-Migration

### Seed Data
- [ ] Seed-Script erstellen: `packages/backend/prisma/seed-themes.ts`
- [ ] 3 Default-Themes pro EventType erstellen:
  - [ ] Hochzeit: Elegant, Romantic, Modern
  - [ ] Corporate: Professional, Minimal, Dynamic
  - [ ] Geburtstag: Playful, Colorful, Elegant
  - [ ] Kids Party: Playful, Colorful, Fun
  - [ ] Taufe: Soft, Elegant, Traditional
  - [ ] Graduation: Achievement, Modern, Professional
  - [ ] Anniversary: Romantic, Elegant, Nostalgic
- [ ] Seed ausführen: `npx prisma db seed`

### Design Tokens
- [ ] `packages/admin-dashboard/src/app/globals.css` überarbeiten
- [ ] `--theme-*` CSS-Variablen definieren
- [ ] Multi-Layer Shadows hinzufügen
- [ ] Gradient-Utilities erstellen
- [ ] Glassmorphism-Classes definieren

---

## 🚨 PHASE 0.5: AI CACHE ERWEITERN (KORRIGIERT!)

> **⚠️ KORREKTUR**: Bestehendes `aiCache.ts` (464 Zeilen) erweitern, NICHT neu bauen!  
> **Grund**: System funktioniert bereits, `withAiCache` Wrapper überall in Nutzung  
> **Referenz**: `claude/OPUS-KORREKTUR-PRAGMATISCH.md`

### Bestehende Datei erweitern (MODIFY, nicht neu!)
**Datei**: `packages/backend/src/services/cache/aiCache.ts`

- [ ] `'suggest-theme'` zu `AiCacheFeatureKnown` hinzufügen (Zeile ~25-32)
- [ ] `warmUpCache()` erweitern (Zeile ~219-316):
  - [ ] Theme-Generierung für alle Event-Types × Seasons hinzufügen
  - [ ] Preload-Matrix: 6 Event-Types × 4 Seasons = 24 Kombinationen
- [ ] Fallback-Function: `getDefaultThemes(eventType)` erstellen
- [ ] Tests: Verify Theme-Cache funktioniert

### Theme-Generator mit bestehendem Cache
**Datei**: `packages/backend/src/lib/groq.ts` (MODIFY, bestehende Datei!)

- [ ] `suggestTheme` Export hinzufügen mit `withAiCache` Wrapper:
```typescript
export const suggestTheme = withAiCache<
  { eventType: string; season?: string; location?: string },
  GeneratedTheme[]
>(
  'suggest-theme',
  async ({ eventType, season, location }) => {
    // Theme-Generierung via Groq
  },
  { fallback: ({ eventType }) => getDefaultThemes(eventType) }
);
```

### "Cache leeren" Button - KEINE ÄNDERUNG NÖTIG!
**Datei**: `packages/admin-dashboard/src/components/SidebarV2.tsx`

- [x] ✅ **Button macht nur Browser-Reload** (kein Redis-Flush!)
- [x] ✅ **Problem existiert nicht** (Opus hat bestätigt!)
- [ ] ~~routes/adminCache.ts anpassen~~ ← NICHT NÖTIG!

### AI-Cache-Stats erweitern
**Datei**: `packages/backend/src/services/cache/aiCache.ts`

- [ ] `getAiCacheStats()` erweitern: `'suggest-theme'` zu Features-Array hinzufügen (Zeile ~394)
- [ ] `clearAiCache()` prüfen: Funktioniert bereits korrekt (Zeile ~425)
- [ ] `getAiCacheEntryCount()` erweitern: `'suggest-theme'` hinzufügen (Zeile ~450)

---

## 🚀 PHASE 0.6: CACHE PRELOADING (OPTIONAL, ABER EMPFOHLEN!)

> **User-Idee**: "Vielleicht können wir den AI-Cache schon im Vorhinein füllen?"  
> **Impact**: 99% Kosten-Einsparung (€200/Monat → €1.75/Monat)!  
> **Referenz**: `claude/AI-CACHE-PRELOADING-STRATEGIE.md`

### Cache Preload Service
- [ ] Datei erstellen: `packages/backend/src/services/cachePreloadService.ts`
- [ ] `CachePreloadService` Klasse implementieren
- [ ] `PRELOAD_MATRIX` definieren (108 Kombinationen für 80% Abdeckung)
- [ ] `preloadAll()` - Full Preload (alle Kombinationen)
- [ ] `preloadIncremental()` - Nur neue Kombinationen (letzte 30 Tage)
- [ ] Kosten-Tracking & Token-Estimation
- [ ] Rate-Limiting (100ms zwischen Calls)
- [ ] Unit-Tests schreiben

### Preload API-Endpoints
- [ ] Datei erstellen: `packages/backend/src/routes/aiCachePreload.ts`
- [ ] `POST /api/ai-cache/preload` - Full Preload (Admin-only)
- [ ] `POST /api/ai-cache/preload/incremental` - Incremental Preload
- [ ] `GET /api/ai-cache/preload/status` - Coverage-Status
- [ ] Admin-Middleware integrieren
- [ ] Integration-Tests schreiben

### Cron-Jobs (Automatisches Preload)
- [ ] Datei erstellen: `packages/backend/src/jobs/cachePreloadJob.ts`
- [ ] Daily Incremental Preload (3:00 AM, Montag-Samstag)
- [ ] Weekly Full Preload (3:00 AM, Sonntag)
- [ ] Error-Handling & Sentry-Alerts
- [ ] Kosten-Budget-Alert (>€10/Monat)
- [ ] Integration in `packages/backend/src/index.ts`

### Admin-Dashboard: Preload-UI
- [ ] `system/ai-cache/page.tsx`: Preload-Sektion hinzufügen
- [ ] Coverage-Bar (X / 108 Kombinationen gecached)
- [ ] "Full Preload" Button (mit Kosten-Anzeige: ~€0.40)
- [ ] "Incremental Preload" Button
- [ ] Last-Preload-Info (Anzahl, Kosten, Timestamp)
- [ ] Info-Box: "Läuft automatisch täglich um 3:00 Uhr"

### Deployment & Monitoring
- [ ] Initial Preload nach Deployment triggern
- [ ] Cron-Jobs verifizieren (läuft täglich?)
- [ ] Monitoring-Alerts: Preload-Fehler
- [ ] Kosten-Tracking-Dashboard (Grafana)
- [ ] Budget-Alert: >€10/Monat Preload-Kosten

---

## 🎯 PHASE 1: BACKEND - AI THEME GENERATOR

### Context Extractor Service
- [ ] Datei erstellen: `packages/backend/src/services/themeContextExtractor.ts`
- [ ] `extractContext()` Funktion implementieren
- [ ] Season-Detection aus `dateTime`
- [ ] Time-of-Day-Detection
- [ ] Keyword-Extraktion aus Event-Titel
- [ ] Optional: Geocoding für `locationStyle`
- [ ] Unit-Tests schreiben

### AI Theme Generator Service
- [ ] Datei erstellen: `packages/backend/src/services/aiThemeGenerator.ts`
- [ ] `generateThemes()` Funktion implementieren
- [ ] Groq SDK integrieren
- [ ] Prompt-Engineering für Theme-Generierung
- [ ] Response-Parsing mit Zod-Validation
- [ ] Error-Handling & Fallbacks
- [ ] Unit-Tests schreiben

### Cached Theme Generator
- [ ] Datei erstellen: `packages/backend/src/services/cachedThemeGenerator.ts`
- [ ] Cache-Level-Hierarchie definieren
- [ ] `getCachedThemes()` mit Fallback-Logic
- [ ] `cacheThemes()` für alle Levels
- [ ] Cache-Invalidierung (Admin-Endpoint)
- [ ] Cache-Hit-Rate Logging
- [ ] Unit-Tests schreiben

### Theme Validator (Anti-Kitsch)
- [ ] Datei erstellen: `packages/backend/src/services/themeValidator.ts`
- [ ] `calculateTasteScore()` implementieren
- [ ] Farb-Harmonie-Checks
- [ ] Animations-Budget-Checks
- [ ] Konsistenz-Checks
- [ ] Innovation-Score
- [ ] Tests mit guten/schlechten Themes

### API Routes
- [ ] Datei erstellen: `packages/backend/src/routes/themes.ts`
- [ ] `POST /api/themes/generate` - AI-Generierung
- [ ] `GET /api/themes/:id` - Single Theme
- [ ] `GET /api/themes` - Liste mit Filtern
- [ ] `POST /api/themes` - Custom Theme (Admin)
- [ ] `PUT /api/themes/:id` - Theme bearbeiten (Admin)
- [ ] `DELETE /api/themes/:id` - Theme löschen (Admin)
- [ ] `GET /api/themes/stats` - Statistiken (Admin)
- [ ] Integration-Tests schreiben

### Backend Integration
- [ ] `packages/backend/src/index.ts` aktualisieren
- [ ] Theme-Routes mounten: `app.use('/api/themes', themesRouter)`
- [ ] Middleware für Auth/Admin-Role
- [ ] Rate-Limiting für AI-Endpoints

---

## 🎯 PHASE 2: FRONTEND - ANIMATION LIBRARY

### Animation Libraries
- [ ] Ordner erstellen: `packages/frontend/src/animations/`
- [ ] `romantic.ts` - 8+ Animationen (Petal Fall, Heart Pulse, etc.)
- [ ] `professional.ts` - 6+ Animationen (Fade, Slide, Scale, Parallax)
- [ ] `playful.ts` - 8+ Animationen (Bounce, Wiggle, Confetti, Color-Shift)
- [ ] `nature.ts` - 6+ Animationen (Leaf Fall, Wave, etc.)
- [ ] `minimal.ts` - 4+ Animationen (Simple Fade, Slide)
- [ ] `index.ts` - Export all
- [ ] Visual-Tests für jede Animation

### Theme Provider
- [ ] Datei erstellen: `packages/frontend/src/providers/ThemeProvider.tsx`
- [ ] React Context Setup
- [ ] `applyTheme()` - CSS-Variablen setzen
- [ ] `setTheme()` - Theme wechseln
- [ ] `useTheme()` Hook
- [ ] Optional: localStorage-Persistenz
- [ ] Unit-Tests schreiben

### Theme Animation Component
- [ ] Datei erstellen: `packages/frontend/src/components/theme/ThemeAnimation.tsx`
- [ ] Framer-Motion Wrapper
- [ ] `mapToFramerVariants()` Helper
- [ ] Support für entrance/hover/ambient
- [ ] Performance-Optimierung
- [ ] Tests schreiben

### Theme Utils
- [ ] Datei erstellen: `packages/frontend/src/lib/themeUtils.ts`
- [ ] `loadTheme(themeId)` - Fetch von API
- [ ] `applyCustomizations(theme, custom)` - Merge
- [ ] `previewTheme(theme)` - Temporary Apply
- [ ] Unit-Tests schreiben

---

## 🎯 PHASE 3: WIZARD-ERWEITERUNG

### Theme Selection Step
- [ ] Datei erstellen: `packages/frontend/src/components/wizard/steps/ThemeSelectionStep.tsx`
- [ ] UI-Design: 3 Theme-Cards nebeneinander
- [ ] "AI generieren" Button
- [ ] Loading-State (Spinner + Text)
- [ ] Theme-Selection (Radio-Buttons)
- [ ] "Anpassen" Button → Fine-Tuning-Modal
- [ ] Error-Handling (AI Timeout)
- [ ] Mobile-Responsiveness

### Fine-Tuning Modal
- [ ] Datei erstellen: `packages/frontend/src/components/wizard/modals/ThemeFineTuningModal.tsx`
- [ ] Color-Picker für primary/accent
- [ ] Animation-Intensity Slider (0-100%)
- [ ] Font-Size Slider
- [ ] Live-Preview (rechte Seite)
- [ ] "Änderungen speichern" → customThemeData
- [ ] "Zurücksetzen" Button

### Theme Preview Component
- [ ] Datei erstellen: `packages/frontend/src/components/theme/ThemePreview.tsx`
- [ ] Mini-Gallery mit Sample-Fotos
- [ ] Apply Theme CSS
- [ ] Show Animations in Preview
- [ ] Responsive Layout

### A/B Comparison Component
- [ ] Datei erstellen: `packages/frontend/src/components/theme/ThemeComparison.tsx`
- [ ] Side-by-side Vergleich zweier Themes
- [ ] Toggle zwischen A/B
- [ ] "Favorit wählen" Button

### Wizard State Update
- [ ] `packages/frontend/src/components/wizard/types.ts` erweitern
- [ ] `selectedThemeId?: string` hinzufügen
- [ ] `customThemeData?: Json` hinzufügen
- [ ] `generatedThemes?: GeneratedTheme[]` hinzufügen

### Wizard Flow Update
- [ ] `packages/frontend/src/components/wizard/EventWizard.tsx` aktualisieren
- [ ] ThemeSelectionStep einfügen (Step 3, NACH BasicInfo)
- [ ] API Call: `POST /api/themes/generate` mit Context
- [ ] Error-Handling mit Fallback
- [ ] Submit: Include `themeId` & `customThemeData`
- [ ] Progress-Bar aktualisieren (10 Steps statt 9)

### New Step Order
- [ ] Step 1: Event Type Selection
- [ ] Step 2: Basic Info (Titel, Datum, Location)
- [ ] **Step 3: Theme Selection (NEU)**
- [ ] Step 4: Design (Cover/Profile Images)
- [ ] Step 5: Albums
- [ ] Step 6: Access
- [ ] Step 7-10: Extended Mode (optional)

---

## 🎯 PHASE 4: THEME RENDERING

### Event Page Theme Loader
- [ ] `packages/frontend/src/app/e3/[slug]/layout.tsx` aktualisieren
- [ ] Fetch Event inkl. Theme-Data
- [ ] Load Theme via API: `GET /api/themes/:themeId`
- [ ] Merge mit `customThemeData`
- [ ] Wrap in `<ThemeProvider initialTheme={theme}>`

### Component Integration
- [ ] `EventHero.tsx`: Theme-Colors & Gradient
- [ ] `PhotoGallery.tsx`: Wrap Photos in `<ThemeAnimation>`
- [ ] `MosaicWall.tsx`: Apply Theme wallLayout
- [ ] `GuestbookEntry.tsx`: Theme-Colors für Cards
- [ ] `EventHeader.tsx`: Theme-Colors
- [ ] `InfoTab.tsx`: Theme-Styling

### Ambient Animations
- [ ] Datei erstellen: `packages/frontend/src/components/theme/AmbientAnimation.tsx`
- [ ] Petal Fall (Romantic)
- [ ] Confetti (Playful)
- [ ] Parallax-Shapes (Professional)
- [ ] Performance: Max. 20 Partikel
- [ ] Detect low-end devices & disable

### Responsive Breakpoints
- [ ] Desktop: Full Animations
- [ ] Tablet: Reduced Animations (80%)
- [ ] Mobile: Minimal Animations (entrance/exit only)
- [ ] Detect via `window.matchMedia`

---

## 🎯 PHASE 4.5: ADMIN AI-CACHE-MANAGEMENT (ERWEITERT)

> **Kontext**: Bestehende AI-Cache-Page muss erweitert werden  
> **Datei**: `packages/admin-dashboard/src/app/(admin)/system/ai-cache/page.tsx`

### AI-Cache-Page erweitern
- [ ] Feature-Auswahl für Warm-Up hinzufügen (Theme-Gen, Album-Sug, etc.)
- [ ] Stats nach Feature gruppiert anzeigen
- [ ] Hit-Rate pro Feature visualisieren
- [ ] Feature-spezifisches Cache-Löschen (Dropdown)
- [ ] ⚠️ Warnung bei "Alles löschen" (Kosten-Hinweis: €500+)
- [ ] Bestätigungs-Dialog mit expliziter Warnung

### Sidebar: Cache-Button-Tooltip
- [ ] `components/Sidebar.tsx`: Tooltip zu "Cache leeren" Button
- [ ] Text: "Löscht Session- & UI-Cache (AI-Cache bleibt geschützt)"
- [ ] Info-Icon mit Erklärung

### Backend-Integration
- [ ] API: `GET /ai/cache/stats` mit Feature-Breakdown
- [ ] API: `POST /ai/cache/warm-up` mit Feature-Auswahl
- [ ] API: `DELETE /ai/cache/:feature` für selektives Löschen

---

## 🎯 PHASE 4.75: EVENT-WALLS THEME-INTEGRATION (NEU!)

> **KRITISCH**: Event-Walls sind öffentliche Kern-Features!  
> **Referenz**: `claude/KRITISCHE-ERGÄNZUNGEN-AI-CACHE.md`

### Live-Wall Theme-Integration
- [ ] Datei: `packages/frontend/src/app/live/[slug]/wall/page.tsx`
- [ ] Theme-Loading: `GET /api/events?slug=...` → `GET /api/themes/:themeId`
- [ ] Wrap in `<ThemeProvider initialTheme={theme}>`
- [ ] Ambient-Animationen (Background) hinzufügen
- [ ] Theme-Farben für Header & Gradient
- [ ] Photo-Grid mit Theme-Animationen
- [ ] Responsive-Breakpoints (Desktop/TV-Screen)
- [ ] Realtime-Updates mit Socket.IO

### Mosaic-Wall Theme-Integration
- [ ] Datei: `packages/frontend/src/app/live/[slug]/mosaic/page.tsx`
- [ ] Theme-Loading implementieren
- [ ] Wrap in `<ThemeProvider>`
- [ ] `theme.wallLayout` verwenden:
  - [ ] "masonry" - Bestehend, Theme-Farben hinzufügen
  - [ ] "grid" - Neu implementieren mit Theme
  - [ ] "carousel" - Neu implementieren mit Theme
- [ ] Theme-Farben für Borders & Shadows
- [ ] Realtime-Updates mit Theme-Animationen
- [ ] Performance-Optimierung (Lazy-Loading)

### Wall-Layout-Komponenten
- [ ] `components/walls/MasonryLayout.tsx` mit Theme
- [ ] `components/walls/GridLayout.tsx` (NEU)
- [ ] `components/walls/CarouselLayout.tsx` (NEU)
- [ ] Layout-Switcher (Admin kann wallLayout wählen)

### Testing
- [ ] E2E-Test: Live-Wall lädt Theme korrekt
- [ ] E2E-Test: Mosaic-Wall verwendet `wallLayout`
- [ ] Visual-Regression: Alle 3 Wall-Layouts mit 3 Themes
- [ ] Performance: 60 FPS auch mit 100+ Fotos
- [ ] Mobile-Tests (falls Walls mobil angezeigt werden)

---

## 🎯 PHASE 5: ADMIN THEME MANAGEMENT

### Theme Marketplace Page
- [ ] Datei erstellen: `packages/admin-dashboard/src/app/(admin)/manage/themes/page.tsx`
- [ ] Liste aller Public-Themes
- [ ] Filter: Event Type, Season, Premium, Public
- [ ] Suche nach Name/Tags
- [ ] Sortierung: Most Used, Newest, Highest Rated
- [ ] Preview-Modal mit Live-Demo
- [ ] "Duplizieren" Button

### Custom Theme Creator
- [ ] Datei erstellen: `packages/admin-dashboard/src/app/(admin)/manage/themes/create/page.tsx`
- [ ] Form: Name, Description, Tags
- [ ] Color-Picker (alle Farben)
- [ ] Animation-Config (JSON-Editor mit Monaco)
- [ ] Font-Selection (Google Fonts Integration?)
- [ ] Live-Preview (wie im Wizard)
- [ ] Save: `POST /api/themes`
- [ ] Validation mit Zod

### Theme Details Page
- [ ] Datei erstellen: `packages/admin-dashboard/src/app/(admin)/manage/themes/[id]/page.tsx`
- [ ] Theme-Info (Name, Tags, Colors)
- [ ] Verwendungs-Statistiken (Chart)
- [ ] Liste der Events mit diesem Theme
- [ ] Edit-Button → Editor
- [ ] Delete-Button mit Bestätigung
- [ ] "Als Vorlage duplizieren"

### Sidebar Update
- [ ] `packages/admin-dashboard/src/components/Sidebar.tsx` aktualisieren
- [ ] Neuer Nav-Item: "Themes" (Icon: Palette)
- [ ] Position: Nach "Workflow Builder"

---

## 🎯 PHASE 6: DESIGN-MODERNISIERUNG

### Design Token Konsolidierung
- [ ] `packages/admin-dashboard/src/app/globals.css` komplett überarbeiten
- [ ] Alte Tokens migrieren
- [ ] Multi-Layer Shadows definieren
- [ ] Gradient-Utilities
- [ ] Glassmorphism-Classes
- [ ] Hover-Lift-Classes

### Dashboard Modernisierung
- [ ] Landing Badges Page modernisieren
- [ ] AI Providers Page modernisieren
- [ ] QR Templates Page modernisieren
- [ ] Workflow Builder Visual-Refresh
- [ ] Packages Page modernisieren
- [ ] Events Page modernisieren

### Mobile Fixes
- [ ] Bottom-Sheet: Swipe-to-Dismiss mit Vaul
- [ ] Buttons: Min. 44x44px Touch-Targets
- [ ] Spacing: Konsistente Abstände
- [ ] Text-Sizes: Min. 16px (verhindert Zoom auf iOS)

### Dark Mode Fix
- [ ] Braune Farben durch Slate-Gray ersetzen
- [ ] Kontrast-Tests (WCAG AA)
- [ ] Neue Dark-Mode-Palette definieren
- [ ] CSS-Variablen für Dark-Mode

---

## 🎯 PHASE 7: TESTING & OPTIMIZATION

### E2E Tests (Playwright)
- [ ] Test: Complete Wizard-Flow mit Theme-Selection
- [ ] Test: Theme-Generation Happy-Path
- [ ] Test: Theme-Generation Error-Path (Timeout)
- [ ] Test: Fine-Tuning-Modal
- [ ] Test: Public Event Page mit Theme
- [ ] Test: Admin Theme CRUD
- [ ] Test: Mobile Wizard (iPhone 12)

### Performance Tests
- [ ] Lighthouse CI integrieren
- [ ] Target: Score >90
- [ ] Animation-Performance: 60 FPS
- [ ] Lazy-Loading für Themes
- [ ] Code-Splitting optimieren

### Security Audit
- [ ] Rate-Limiting für AI-Endpoints
- [ ] Input-Validation (Zod)
- [ ] SQL-Injection-Tests
- [ ] XSS-Tests
- [ ] CSRF-Protection
- [ ] Dependency-Audit

### Load Tests (k6)
- [ ] 100 concurrent Theme-Generations
- [ ] Cache-Hit-Rate nach Warm-Up
- [ ] Database-Query-Optimierung
- [ ] Redis-Optimierung

---

## 🎯 PHASE 8: DEPLOYMENT

### Staging Deployment
- [ ] Deploy auf `https://staging-dash.gästefotos.com`
- [ ] Smoke-Tests
- [ ] User-Acceptance-Testing (3+ Test-User)
- [ ] Performance-Tests auf Staging

### Feature Flag Setup
- [ ] FeatureFlag Model zu Schema hinzufügen
- [ ] Flag erstellen: `dynamic_themes_enabled`
- [ ] Initial Rollout: 10%
- [ ] Middleware für Feature-Check

### Production Deployment
- [ ] DB-Backup erstellen
- [ ] DB-Migration: `prisma migrate deploy`
- [ ] Backend: Build & Restart
- [ ] Frontend: Build & Restart
- [ ] Admin-Dashboard: Build & Restart
- [ ] Seed-Themes ausführen

### Monitoring Setup
- [ ] Sentry-Alerts für Theme-Errors
- [ ] Prometheus-Metrics: Cache-Hit-Rate, AI-Latency
- [ ] Grafana-Dashboard: Theme-Usage-Stats
- [ ] Budget-Alert: >100€/Tag AI-Costs

### Rollout Plan
- [ ] Woche 1: 10% Rollout (Canary)
- [ ] Woche 2: 50% Rollout (wenn keine Errors)
- [ ] Woche 3: 100% Rollout (Full)

---

## 📊 SUCCESS METRICS

### Tracking Setup
- [ ] Theme-Adoption-Rate tracken
- [ ] User-Satisfaction-Survey (Wizard-Rating)
- [ ] AI-Cost per Event loggen
- [ ] Cache-Hit-Rate Dashboard
- [ ] Page-Load-Time monitoren
- [ ] Lighthouse-Score CI/CD

### Business Metrics
- [ ] Conversion-Rate vor/nach
- [ ] Event-Creation-Rate
- [ ] User-Retention
- [ ] NPS-Score

---

## 🔧 MAINTENANCE

### Documentation
- [ ] API-Dokumentation (Swagger/OpenAPI)
- [ ] Theme-Schema-Dokumentation
- [ ] Admin-User-Guide (Theme-Creation)
- [ ] Developer-Guide (Custom Animations)

### Monitoring & Alerts
- [ ] Sentry-Error-Tracking
- [ ] Prometheus-Metrics
- [ ] Grafana-Dashboards
- [ ] On-Call-Rotation (falls nötig)

---

**STATUS**: 🟢 Ready to Start  
**GESCHÄTZTER AUFWAND**: 30-40 Entwicklertage  
**PRIORITÄT**: 🔥 HOCH
