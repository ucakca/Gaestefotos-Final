# Performance-Optimierungen

**Datum:** 2026-01-15  
**Status:** In Arbeit

---

## 📊 Build-Analyse (Stand 2026-01-15)

### Bundle-Größen

**Größte Routen:**
- `/events/[id]/categories` - **394 kB** (First Load JS)
- `/e/[slug]` - **361 kB**
- `/e2/[slug]` - **349 kB**
- `/events/[id]/dashboard` - **301 kB**
- `/e2/[slug]/invite` - **280 kB**
- `/events/[id]/statistics` - **277 kB**
- `/events/[id]/edit` - **262 kB**
- `/events/[id]/photos` - **239 kB**

**Shared Bundles:**
- First Load JS (all routes): **87.5 kB**
- Middleware: **26.2 kB**

### Framer-Motion Usage

**41 Komponenten** nutzen Framer-Motion:
- Alle Einladungs-Komponenten (6 Dateien)
- Gallery-Komponenten
- Photo-Upload/Editor
- Dashboard-Komponenten
- Guest-View Komponenten

---

## 🎯 Optimierungsziele

1. **Bundle-Size reduzieren**
   - Ziel: Routen unter 250 kB (First Load JS)
   - Fokus: Categories, E-Routes, Dashboard

2. **Code-Splitting verbessern**
   - Lazy Loading für große Komponenten
   - Dynamic Imports für selten genutzte Features

3. **Dependency-Optimierung**
   - Framer-Motion nur wo nötig
   - Tree-shaking verbessern

---

## ✅ Bereits umgesetzte Optimierungen

### 1. DashboardFooter (2026-01-15)
**Problem:** SSR Hydration Mismatch durch Framer-Motion  
**Lösung:** Framer-Motion entfernt, statisches Rendering  
**Ergebnis:** 
- Bug behoben (rosa Blob)
- ~8 kB Bundle-Size reduziert

### 2. Lazy Loading Phase 1 (2026-01-15)
**Implementiert:**
- ✅ QRDesignerPanel (Dashboard) - Dynamic Import
- ✅ PhotoEditor (Photos) - Dynamic Import
- ✅ Recharts Components (Statistics) - Dynamic Import
- ✅ Lucide Icons (Categories) - Gezieltes Import statt Wildcard

**Ergebnisse:**
- `/events/[id]/categories`: 394 kB → **281 kB** (-113 kB / -29%)
- `/events/[id]/statistics`: 277 kB → **171 kB** (-106 kB / -38%)
- `/events/[id]/dashboard`: 301 kB → **278 kB** (-23 kB / -8%)
- **Gesamt:** ~240 kB eingespart

**Dateien geändert:**
- `packages/frontend/src/app/events/[id]/dashboard/page.tsx`
- `packages/frontend/src/app/events/[id]/photos/page.tsx`
- `packages/frontend/src/app/events/[id]/statistics/page.tsx`
- `packages/frontend/src/app/events/[id]/categories/page.tsx`

---

## 🔧 Geplante Optimierungen

### 1. Lazy Loading für große Komponenten

**Kandidaten:**
```tsx
// Dashboard: QR-Designer (23 kB)
const QRDesignerPanel = dynamic(() => import('@/components/qr-designer/QRDesignerPanel'), {
  loading: () => <Skeleton />,
  ssr: false
});

// Categories: Recharts (50+ kB)
const StatisticsCharts = dynamic(() => import('@/components/StatisticsCharts'), {
  loading: () => <Skeleton />
});

// PhotoEditor (nur on-demand)
const PhotoEditor = dynamic(() => import('@/components/PhotoEditor'), {
  ssr: false
});
```

**Erwartete Einsparung:** 80-100 kB pro Route

---

### 2. Framer-Motion Conditional Loading

**Strategy:**
- SSR-Routen: Keine Animationen
- Client-only: Animationen
- Feature-Flag für Nutzer-Präferenz (`prefers-reduced-motion`)

**Beispiel:**
```tsx
// utils/motion.ts
export const motion = typeof window !== 'undefined' 
  ? require('framer-motion').motion 
  : { div: 'div', button: 'button' }; // Fallback für SSR
```

**Erwartete Einsparung:** 40-60 kB für SSR-Routen

---

### 3. Image-Optimierung

**Bereits implementiert:**
- Next.js Image Optimization
- WebP mit AVIF-Fallback
- Lazy Loading für Bilder

**Verbesserungen:**
- Blur Placeholder für alle Bilder
- Responsive Sizes konfigurieren
- CDN-Caching optimieren

---

### 4. Code-Splitting für Routes

**@next/bundle-analyzer Integration:**
```bash
pnpm add -D @next/bundle-analyzer
```

**next.config.js:**
```js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... existing config
});
```

**Analyse starten:**
```bash
ANALYZE=true pnpm build
```

---

### 5. Dependency-Audit

**Große Dependencies prüfen:**
- `framer-motion` (41 Komponenten) → Conditional Loading
- `recharts` (Statistiken) → Lazy Loading
- `date-fns` → Tree-shaking prüfen
- `lucide-react` → Icon-Set reduzieren?

**Commands:**
```bash
pnpm list --depth=0 --json | jq '.dependencies | to_entries | sort_by(.value.size)'
```

---

## 📈 Performance-Metriken (Ziele)

### Lighthouse Scores (Ziel: > 90)

**Desktop:**
- Performance: > 95
- Accessibility: > 98
- Best Practices: > 95
- SEO: > 95

**Mobile:**
- Performance: > 90
- Accessibility: > 98
- Best Practices: > 95
- SEO: > 95

### Core Web Vitals

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

---

## 🔍 Monitoring

### Tools

1. **Next.js Build Output**
   ```bash
   pnpm build | grep "First Load JS"
   ```

2. **Lighthouse CI** (geplant)
   ```bash
   pnpm add -D @lhci/cli
   ```

3. **Bundle-Analyzer**
   ```bash
   ANALYZE=true pnpm build
   ```

4. **Chrome DevTools**
   - Coverage Tab
   - Performance Tab
   - Network Tab

---

## 📝 Testing-Checklist

Nach jeder Optimierung:

- [ ] Build erfolgreich
- [ ] Keine Runtime-Errors
- [ ] Visual-Regression-Test
- [ ] Lighthouse-Score verbessert
- [ ] Bundle-Size reduziert
- [ ] User Experience unverändert

---

## 🚀 Rollout-Plan

### Phase 1: Quick Wins (1-2h) ✅ ABGESCHLOSSEN
- ✅ DashboardFooter
- ✅ Lazy Loading: QRDesignerPanel (-23 kB auf Dashboard)
- ✅ Lazy Loading: PhotoEditor (on-demand)
- ✅ Lazy Loading: Recharts (-106 kB auf Statistics)
- ✅ Icon-Import-Optimierung (-113 kB auf Categories)

### Phase 2: Structural (2-4h) ✅ ABGESCHLOSSEN
- ✅ Bundle-Analyzer Setup (@next/bundle-analyzer)
- ✅ Dependency-Audit (DEPENDENCY_AUDIT.md)
- ✅ Lazy Loading: StoryViewer (E-Routes)
- ✅ Lazy Loading: FaceSearch (E-Routes)
- ✅ motion.ts Utility (Platzhalter für zukünftiges Conditional Loading)

### Phase 3: Fine-Tuning (4-8h)
- [ ] Route-by-Route Optimierung
- [ ] Image-Optimierung erweitern
- [ ] Lighthouse CI Integration

---

## 📚 Ressourcen

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Performance](https://web.dev/performance/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Framer Motion Performance](https://www.framer.com/motion/guide-reduce-bundle-size/)

---

**Letzte Aktualisierung:** 2026-01-15  
**Phase 1:** Abgeschlossen (~240 kB eingespart)  
**Phase 2:** Abgeschlossen (Bundle-Analyzer + E-Route Optimierungen)  
**Nächster Review:** Phase 3 optional
