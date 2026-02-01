# Design System Audit

**Date:** 17. Januar 2026  
**Reviewer:** Claude 4.5 Opus  
**Scope:** app.gästefotos.com vs dash.gästefotos.com

---

## 🎨 Inkonsistenzen zwischen Frontend & Admin-Dashboard

### Farbsystem

| Aspekt | app.gästefotos.com | dash.gästefotos.com | Status |
|--------|-------------------|---------------------|--------|
| **Farbformat** | HSL CSS Variables | Hex CSS Variables | ⚠️ Inkonsistent |
| **Akzentfarbe** | `--app-accent: 340 75% 55%` (Pink) | `--app-accent: #EAA48F` (Pfirsich) | ⚠️ Unterschiedlich |
| **Tailwind Config** | TypeScript, Extended Colors | JavaScript, Simple Colors | ⚠️ Inkonsistent |

### Dark Mode

| Aspekt | app.gästefotos.com | dash.gästefotos.com |
|--------|-------------------|---------------------|
| **Implementierung** | Vollständig definiert | `@media (prefers-color-scheme)` |
| **Status** | ⚠️ Unterschiedliche Implementierung |

### Design Tokens

| Token | app.gästefotos.com | dash.gästefotos.com | Status |
|-------|-------------------|---------------------|--------|
| `--radius` | `0.75rem` | Nicht definiert | ⚠️ Fehlt |
| **Button Variants** | primary, secondary, ghost, danger | - | ⚠️ Prüfen erforderlich |
| **Animationen** | 8+ Custom Keyframes | Nur tailwindcss-animate | ⚠️ Inkonsistent |

---

## ✅ Positive Findings

- Beide nutzen `tailwindcss-animate` Plugin
- Beide nutzen `--app-*` CSS Variables (grundsätzlich kompatibel)
- Loading States: 47+ Komponenten
- Disabled States: 43+ Komponenten

---

## 🎯 Empfohlene Maßnahmen

### Phase 1: Design Token Vereinheitlichung (Prio 1)

**Ziel:** Einheitliches HSL-basiertes Farbsystem

1. **Admin-Dashboard auf HSL migrieren**
   - Hex → HSL konvertieren
   - `--app-accent` angleichen
   - `--radius` Token hinzufügen

2. **Tailwind Config vereinheitlichen**
   - Admin-Dashboard Config auf TypeScript
   - Extended Colors übernehmen
   - Gemeinsame Preset-Datei erstellen

**Dateien:**
- `/packages/admin-dashboard/tailwind.config.ts` (neu erstellen)
- `/packages/frontend/tailwind.config.ts` (als Vorlage)

### Phase 2: Dark Mode Harmonisierung (Prio 2)

**Ziel:** Konsistente Dark Mode Implementierung

1. Admin-Dashboard auf vollständige Dark Mode Definitionen umstellen
2. Theme-Toggle synchronisieren (falls gewünscht)

### Phase 3: Animation & Components (Prio 3)

**Ziel:** Shared Component Library

1. Gemeinsame Animation Keyframes extrahieren
2. Button Variants in Admin-Dashboard übernehmen
3. Shared UI Package evaluieren

---

## 📊 Migration Effort Estimation

```
Phase 1 (Design Tokens):      2-3 Tage
Phase 2 (Dark Mode):           1-2 Tage  
Phase 3 (Animations):          2-3 Tage
Testing & QA:                  1 Tag
─────────────────────────────────────
Total:                         6-9 Tage
```

---

## 🔍 Technische Details

### HSL Farbkonvertierung

```css
/* Aktuell (Hex) */
--app-accent: #EAA48F;

/* Ziel (HSL) */
--app-accent: 340 75% 55%;
/* oder */
--app-accent: 15 65% 75%; /* Pfirsich in HSL */
```

**Empfehlung:** Beide Akzentfarben evaluieren und eine als Standard definieren.

### Tailwind Config Migration

```typescript
// Ziel: Gemeinsame Preset-Datei
// /packages/shared/tailwind.preset.ts
export default {
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'hsl(var(--app-bg))',
          fg: 'hsl(var(--app-fg))',
          accent: 'hsl(var(--app-accent))',
          // ...
        }
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
    },
  },
};

// /packages/frontend/tailwind.config.ts
import sharedPreset from '@gaestefotos/shared/tailwind.preset';
export default {
  presets: [sharedPreset],
  // frontend-specific overrides
};
```

---

## 🚦 Nächste Schritte

1. **Farb-Audit:** Screenshot-Vergleich app vs dash
2. **Entscheidung:** Welche Akzentfarbe wird Standard?
3. **Shared Preset:** Gemeinsame Tailwind Config erstellen
4. **Migration:** Admin-Dashboard auf HSL umstellen
5. **Testing:** Visuelle Regression Tests

**Owner:** Design Team + Frontend Team  
**Timeline:** Q1 2026
