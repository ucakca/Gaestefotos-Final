# Aufgaben-Aufteilung: 🧠 Opus vs 🎨 Kimi

Stand: 14.02.2026

## Prinzip
- **Opus**: Architektur, Backend, State Machines, Hardware, WebSocket, Cache-Strategie, komplexe Algorithmen
- **Kimi**: Systematische Refactorings, UI-Komponenten, Animationen, Pattern-Migration, CSS/Tailwind

## Reihenfolge & Abhängigkeiten

```
WOCHE 1 (parallel):
  🧠 OPUS: Frontend Deploy (P0) ──→ Mosaic UX Redesign (P0)
  🎨 KIMI: Design-Tokens (P0) ──→ Button-System (P0)

WOCHE 2-3 (parallel):
  🧠 OPUS: Mosaic Backend + WebSocket ──→ Workflow Builder Admin
  🎨 KIMI: Form System ──→ Mosaic Wizard UI (NACH Opus Konzept!)

WOCHE 3-4 (parallel):
  🧠 OPUS: Event Wall Backend + PWA Architektur
  🎨 KIMI: Event Wall UI (NACH Opus Backend!) + PWA Polish

WOCHE 5+ (parallel):
  🧠 OPUS: Upsell Backend
  🎨 KIMI: Gamification + KI-Kunst + Upsell UI
```

## Kritische Abhängigkeiten
- Kimi Mosaic UI **wartet auf** Opus Mosaic Redesign-Konzept
- Kimi Event Wall UI **wartet auf** Opus Event Wall Backend (WebSocket)
- Kimi PWA Polish **wartet auf** Opus PWA Architektur (Service Worker)
- Kimi Upsell UI **wartet auf** Opus Upsell Backend (Feature-Gating API)

## Detailplan

### 🧠 OPUS Aufgaben (≈69h)

| Prio | Aufgabe | Stunden | Status |
|------|---------|---------|--------|
| P0 | Frontend Deploy (WorkflowRunner live) | 2h | 🔄 |
| P0 | Mosaic UX Redesign (5→3 Steps, Live-Build Konzept, Scatter-Auto) | 20h | ⬜ |
| P1 | Mosaic Backend (WebSocket Live-Build, Tile-Platzierung) | 12h | ⬜ |
| P1 | Workflow Builder Admin (ReactFlow DnD, Config-Panels, Validierung) | 15h | ⬜ |
| P1 | Event Wall Backend (WebSocket-Feed, Quellen-Aggregation) | 8h | ⬜ |
| P1 | PWA Architektur (Service Worker, Cache, Offline-Fallbacks) | 8h | ⬜ |
| P2 | Upsell Backend (Feature-Gating, Addon-API, Upgrade-Flow) | 6h | ⬜ |

### 🎨 KIMI Aufgaben (≈83h)

| Prio | Aufgabe | Stunden | Status |
|------|---------|---------|--------|
| P0 | Design-Token Unification (129 Dateien, app-* → modern) | 16h | ⬜ |
| P0 | Button-System Refactoring (BaseButton + 4 Varianten) | 10h | ⬜ |
| P1 | Form System Unification (Input/Select/Textarea + RHF) | 9h | ⬜ |
| P1 | Event Wall UI (Animationen, Quellen-Mixing, Fullscreen) | 12h | ⬜ |
| P1 | Mosaic Wizard UI (3 Steps, Crop, Animations-Kacheln, Board-Designer) | 10h | ⬜ |
| P1 | PWA Polish (Manifest, Icons, Safe-Area, Touch-Targets) | 4h | ⬜ |
| P2 | Gamification UI (Badges, Achievements, Leaderboard, Confetti) | 10h | ⬜ |
| P2 | KI-Kunst Gast-Flow (Selfie, Carousel, Style-Preview, Share) | 8h | ⬜ |
| P2 | Upsell UI (🔒-Badges, Modals, Preis-CTA) | 4h | ⬜ |

## Mosaic: Kimi-Analyse bestätigt

### ✅ Stärken (behalten)
- CIE Lab Delta-E 2000 Algorithmus — Industrie-Standard
- KI-Overlay-Analyse — einzigartig
- Print-Terminal Integration — besser als Mosaically
- Event-gebundenes Live-Mosaik — USP

### 🔴 Schwächen (Opus redesigned)
- 5-Step Wizard → 3 Steps (Modus+Grid → Zielbild+Overlay → Aktivieren)
- Kein Live-Build → WebSocket Tile-Updates
- Scatter-Wert unklar → Auto-Modus + Slider mit Live-Preview
- Keine Gamification → "Finde dich im Mosaik"

### Wizard-Empfehlung: Option A (3 Steps)
1. **Modus & Grid** (Digital/Print + Format auswählen)
2. **Zielbild & Overlay** (Upload + Crop + KI-Scatter automatisch)
3. **Vorschau & Aktivieren** (Live-Preview + Animations-Auswahl + Board-Designer bei Print)
