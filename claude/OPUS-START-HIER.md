# 🚀 OPUS: START HIER!

> **Datum**: 2026-02-16  
> **Priorität**: 🔥 **KRITISCH**  
> **Geschätzter Aufwand**: 35-45 Entwicklertage

---

## 🎯 MISSION

Implementiere **Dynamic Event Themes** mit AI-Generierung, hierarchischem Caching und Theme-Integration für alle Event-Komponenten (inkl. Wizard, Public Event Page, Live-Walls).

---

## 📚 DOKUMENTATIONS-REIHENFOLGE (WICHTIG!)

### 1️⃣ **ZUERST LESEN** (KRITISCH!)
📄 **`claude/KRITISCHE-ERGÄNZUNGEN-AI-CACHE.md`**

**Warum zuerst?**
- ⚠️ Enthält **essentielle Anforderungen**, die im Original-Plan fehlten
- ⚠️ Verhindert **€500+ Kosten** durch versehentliches Cache-Löschen
- ⚠️ ALLE AI-Features müssen hierarchisches Caching nutzen (nicht nur Themes!)
- ⚠️ Event-Walls (Live, Mosaic) brauchen Theme-Integration

**Kern-Punkte:**
- ✅ Unified AI Cache Service für ALLE Features (Theme-Gen, Album-Sug, Titel-Gen, etc.)
- ✅ "Cache leeren" Button muss AI-Cache AUSSCHLIESSEN
- ✅ Admin AI-Cache-Page erweitern (Feature-Breakdown, selektives Löschen)
- ✅ Live-Wall & Mosaic-Wall mit Themes integrieren

---

### 2️⃣ **DANN LESEN** (Vollständiger Plan)
📄 **`claude/OPUS-MASTER-PLAN-DYNAMIC-THEMES.md`**

**Was ist drin?**
- 📊 Systemanalyse (Frontend, Backend, Admin-Dashboard)
- 🎨 Feature-Spezifikation (Theme-Datenstruktur, AI-Generierung)
- 🛠️ Technischer Fahrplan (8 Phasen, detailliert)
- ⚠️ Risiken & Rollback
- 🧪 Testing & Qualitätssicherung
- 🚀 Deployment-Plan (Canary-Rollout)

---

### 3️⃣ **REFERENCE** (Bei Bedarf)
📄 **`claude/SYSTEM-MAPPING-THEMES.md`**

**Was ist drin?**
- 🗺️ Component-Hierarchie (welche Dateien wo)
- 🔄 Datenfluss-Diagramme (Event-Creation → Theme-Rendering)
- 🔗 Abhängigkeiten-Graph
- 📋 Datenbank-Schema (SQL)

---

### 4️⃣ **TODO-LISTE** (Während Implementierung)
📄 **`claude/todo-dynamic-themes.md`**

**Was ist drin?**
- ✅ 200+ konkrete Tasks
- Phase 0.5 bis Phase 8
- Testing-Checkliste
- Deployment-Steps

---

## 🚨 KRITISCHE ÄNDERUNGEN (vs. Original-Plan)

### 🆕 Neue Phase 0.5: Unified AI Cache (ZUERST!)

**Warum neu?**
- Original-Plan hatte nur Theme-Caching
- User-Anforderung: **ALLE AI-Features** müssen Caching nutzen

**Was muss gemacht werden?**
1. `unifiedAiCacheService.ts` erstellen (Hierarchisch, 6 Levels)
2. Bestehende AI-Services migrieren (Album-Sug, Titel-Gen, Hashtag-Gen)
3. `adminCache.ts` anpassen: AI-Cache von "Cache leeren" ausschließen
4. AI-Cache-Stats-Endpoint erweitern

**Impact**: BLOCKING für alles andere! (Muss zuerst implementiert werden)

---

### 🆕 Neue Phase 4.5: Admin AI-Cache-Management

**Warum neu?**
- User will AI-Cache im Dashboard **sehen und verwalten**
- Bestehende AI-Cache-Page muss erweitert werden

**Was muss gemacht werden?**
1. Feature-Auswahl für Warm-Up (nicht nur Event-Types)
2. Stats nach Feature gruppiert (Hit-Rate pro Feature)
3. Feature-spezifisches Cache-Löschen (selektiv)
4. ⚠️ Warnung bei "Alles löschen" (Kosten-Hinweis)

---

### 🆕 Neue Phase 4.75: Event-Walls Theme-Integration

**Warum neu?**
- User-Frage: "Hast du auch Event-Walls berücksichtigt?"
- Walls sind **öffentliche Kern-Features** (Großbildschirm/Beamer)

**Was muss gemacht werden?**
1. Live-Wall (`/live/[slug]/wall/page.tsx`) mit Theme
2. Mosaic-Wall (`/live/[slug]/mosaic/page.tsx`) mit Theme
3. `wallLayout` aus Theme verwenden ("masonry" | "grid" | "carousel")
4. 3 Layout-Komponenten implementieren

---

## 📋 IMPLEMENTIERUNGS-REIHENFOLGE (UPDATED)

### Phase 0.5: Unified AI Cache 🚨 **ZUERST!**
```bash
packages/backend/src/services/unifiedAiCacheService.ts
packages/backend/src/routes/adminCache.ts (MODIFY)
packages/backend/src/routes/aiCache.ts (EXTEND)
```

**Dauer**: 4-5 Tage  
**Blockt**: Alles andere!

---

### Phase 0.6: Cache Preloading 🚀 **EMPFOHLEN!**
```bash
packages/backend/src/services/cachePreloadService.ts (NEW)
packages/backend/src/routes/aiCachePreload.ts (NEW)
packages/backend/src/jobs/cachePreloadJob.ts (NEW)
```

**Dauer**: 2-3 Tage  
**Abhängigkeit**: Phase 0.5 abgeschlossen  
**ROI**: 99% Kosten-Einsparung (€200/Monat → €1.75/Monat)!

**Warum?**
- ✅ Instant User-Experience (0ms statt 2-5s)
- ✅ €2,379 Einsparung pro Jahr
- ✅ 80-90% Cache-Hit-Rate (statt 20-30%)
- ✅ Offline-Ready (System funktioniert ohne AI-API)

**Details**: Siehe `claude/AI-CACHE-PRELOADING-STRATEGIE.md`

---

### Phase 0: Prisma Schema
```bash
packages/backend/prisma/schema.prisma (MODIFY)
packages/backend/prisma/seed-themes.ts (NEW)
```

**Dauer**: 2-3 Tage  
**Abhängigkeit**: Nach Phase 0.5

---

### Phase 1: Backend - AI Theme Generator
```bash
packages/backend/src/services/themeContextExtractor.ts (NEW)
packages/backend/src/services/aiThemeGenerator.ts (NEW)
packages/backend/src/services/cachedThemeGenerator.ts (NEW)
packages/backend/src/services/themeValidator.ts (NEW)
packages/backend/src/routes/themes.ts (NEW)
```

**Dauer**: 4-5 Tage  
**Abhängigkeit**: Phase 0 & 0.5 abgeschlossen

---

### Phase 2: Frontend - Animation Library
```bash
packages/frontend/src/animations/*.ts (NEW)
packages/frontend/src/providers/ThemeProvider.tsx (NEW)
packages/frontend/src/components/theme/*.tsx (NEW)
```

**Dauer**: 3-4 Tage  
**Abhängigkeit**: Keine (kann parallel zu Phase 1)

---

### Phase 3: Wizard-Erweiterung
```bash
packages/frontend/src/components/wizard/steps/ThemeSelectionStep.tsx (NEW)
packages/frontend/src/components/wizard/modals/ThemeFineTuningModal.tsx (NEW)
packages/frontend/src/components/wizard/EventWizard.tsx (MODIFY)
```

**Dauer**: 5-6 Tage  
**Abhängigkeit**: Phase 1 & 2 abgeschlossen

---

### Phase 4: Theme Rendering
```bash
packages/frontend/src/app/e3/[slug]/layout.tsx (MODIFY)
packages/frontend/src/components/e3/*.tsx (MODIFY)
```

**Dauer**: 4-5 Tage  
**Abhängigkeit**: Phase 2 & 3 abgeschlossen

---

### Phase 4.5: Admin AI-Cache-Management 🆕
```bash
packages/admin-dashboard/src/app/(admin)/system/ai-cache/page.tsx (MODIFY)
packages/admin-dashboard/src/components/Sidebar.tsx (MODIFY)
```

**Dauer**: 2-3 Tage  
**Abhängigkeit**: Phase 0.5 abgeschlossen

---

### Phase 4.75: Event-Walls Theme-Integration 🆕
```bash
packages/frontend/src/app/live/[slug]/wall/page.tsx (MODIFY)
packages/frontend/src/app/live/[slug]/mosaic/page.tsx (MODIFY)
packages/frontend/src/components/walls/*.tsx (NEW)
```

**Dauer**: 3-4 Tage  
**Abhängigkeit**: Phase 2 & 4 abgeschlossen

---

### Phase 5: Admin Theme Management
```bash
packages/admin-dashboard/src/app/(admin)/manage/themes/*.tsx (NEW)
```

**Dauer**: 3-4 Tage  
**Abhängigkeit**: Phase 1 abgeschlossen

---

### Phase 6: Design-Modernisierung
```bash
packages/admin-dashboard/src/app/globals.css (MODIFY)
packages/admin-dashboard/src/app/(admin)/manage/*/*.tsx (MODIFY)
```

**Dauer**: 6-8 Tage  
**Abhängigkeit**: Keine (kann parallel)

---

### Phase 7: Testing
- E2E-Tests (Playwright)
- Performance-Tests (Lighthouse, FPS)
- Security-Audit
- Load-Tests (k6)

**Dauer**: 4-5 Tage  
**Abhängigkeit**: Phase 1-6 abgeschlossen

---

### Phase 8: Deployment
- Staging-Deployment & UAT
- Feature-Flag Setup
- Production-Deployment (Canary 10% → 50% → 100%)
- Monitoring (Sentry, Prometheus, Grafana)

**Dauer**: 2-3 Tage  
**Abhängigkeit**: Phase 7 abgeschlossen

---

## ⚠️ KRITISCHE WARNINGS

### 🔴 NIEMALS den AI-Cache ohne User-Bestätigung löschen!
**Kosten**: €500+ zum Regenerieren  
**Schutz**: `adminCache.ts` muss Keys mit `ai:cache:*` herausfiltern

### 🔴 Phase 0.5 MUSS zuerst implementiert werden!
**Grund**: Alle AI-Services hängen davon ab  
**Impact**: BLOCKING für Phases 1-8

### 🟡 Event-Walls sind Großbildschirm-Features
**Performance**: 60 FPS mit 100+ Fotos  
**Testing**: TV-Screen-Resolution testen (3840x2160)

---

## 📊 SUCCESS METRICS

### Nach 3 Monaten:

| Metrik | Ziel |
|--------|------|
| **Theme-Adoption-Rate** | >70% Events nutzen AI-Themes |
| **AI-Cache-Hit-Rate (Theme)** | >85% |
| **AI-Cache-Hit-Rate (Album)** | >90% |
| **AI-Kosten pro Event** | <€0.50 |
| **AI-Kosten gesamt** | <€100/Monat (statt €500) |
| **Page-Load-Time** | <2.0s |
| **Lighthouse-Score** | >90 |
| **Walls mit Theme** | >90% |

---

## 🎯 FIRST STEPS (CONCRETE!)

```bash
# 1. Lies die kritischen Ergänzungen
cat claude/KRITISCHE-ERGÄNZUNGEN-AI-CACHE.md

# 2. Lies den vollständigen Plan
cat claude/OPUS-MASTER-PLAN-DYNAMIC-THEMES.md

# 3. Erstelle Unified AI Cache Service
cd /root/gaestefotos-app-v2/packages/backend
touch src/services/unifiedAiCacheService.ts

# 4. Implementiere UnifiedAiCacheService Klasse
# (siehe claude/KRITISCHE-ERGÄNZUNGEN-AI-CACHE.md für Code)

# 5. Passe adminCache.ts an (AI-Cache schützen)
# (siehe claude/KRITISCHE-ERGÄNZUNGEN-AI-CACHE.md)

# 6. Tests schreiben
npm run test:unit

# 7. Erst wenn Phase 0.5 abgeschlossen → Phase 0 (Prisma)
npx prisma migrate dev --name add-event-themes
```

---

## 🆘 BEI PROBLEMEN

### Fragen zu Cache-Hierarchie?
→ Siehe `claude/KRITISCHE-ERGÄNZUNGEN-AI-CACHE.md` (Abschnitt: Unified Caching Service)

### Fragen zu Theme-Datenstruktur?
→ Siehe `claude/OPUS-MASTER-PLAN-DYNAMIC-THEMES.md` (Abschnitt: Feature-Spezifikation)

### Fragen zu Komponenten & Datenfluss?
→ Siehe `claude/SYSTEM-MAPPING-THEMES.md`

### Fragen zu konkreten Tasks?
→ Siehe `claude/todo-dynamic-themes.md`

---

## 💪 LOS GEHT'S!

**Status**: 🟢 **Ready to Start**  
**Priorität**: 🔥🔥🔥 **HÖCHSTE PRIORITÄT**  
**Aufwand**: 35-45 Entwicklertage

**Erfolgs-Kriterium**: Ein neuer User kann in <5 Minuten ein wunderschönes Event mit AI-generiertem Theme erstellen, das perfekt zum Anlass passt und auf allen Walls (Live, Mosaic) konsistent dargestellt wird. AI-Kosten sind durch hierarchisches Caching auf <€100/Monat reduziert.

---

🚀 **Viel Erfolg, Opus!**
