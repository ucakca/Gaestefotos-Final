# 🐛 Bug-Liste & Architektur-Probleme - Gästefotos App

Erstellt: 2026-02-03
Letzte Aktualisierung: 2026-02-15
Status: In Bearbeitung

---

## Übersicht

### UI-Bugs (schnelle Fixes)

| ID | Problem | Bereich | Priorität | Status |
|----|---------|---------|-----------|--------|
| BUG-001 | Theme wechselt nach Login von Dark → Light | Theme-System | 🔴 Hoch | ✅ Erledigt |
| BUG-002 | Input-Felder im Bottom-Sheet unlesbar im Dark Mode | Dark Mode CSS | 🔴 Hoch | ✅ Erledigt |
| BUG-003 | Setup-Checkliste Header öffnet nicht beim Klick | Dashboard Accordion | 🟡 Mittel | ✅ Erledigt (kein Bug) |
| BUG-005 | Service Worker: "Response body already used" Fehler | PWA/Caching | 🟠 Niedrig | ✅ Erledigt |
| BUG-006 | 404 bei design-image URLs | API/Images | 🟡 Mittel | ✅ Erledigt |
| BUG-007 | Doppeltes /api/api/ in Foto-URLs | API/URLs | 🔴 Hoch | ✅ Erledigt |
| BUG-008 | buildApiUrl() prefixed /api/ vor https:// URLs | API/URLs | 🔴 Hoch | ✅ Erledigt |
| BUG-009 | Foto-Klick in Dashboard-Galerie öffnet /photos statt Lightbox | Dashboard UX | � Hoch | ✅ Erledigt |
| BUG-010 | /invitations fehlt Bottom-Navigation | Navigation | 🟡 Mittel | ✅ Erledigt |
| BUG-011 | QR-Styler fehlt Bottom-Navigation | Navigation | 🟡 Mittel | ✅ Erledigt |
| BUG-012 | Setup Galerie/Design Links führen zum Dashboard (Redirect-Loop) | Navigation | 🟡 Mittel | ✅ Erledigt |

### Architektur-Probleme (größere Refactorings)

| ID | Problem | Bereich | Priorität | Status |
|----|---------|---------|-----------|--------|
| ARCH-001 | Doppelte Funktionen: KI-Farbgenerator, Design-Seite, Setup-Menu | UX/Architektur | 🔴 Hoch | ⏳ Offen |
| ARCH-002 | Design-Seite altmodisch vs. QR-Styler/Wizard modern | UI-Konsistenz | 🔴 Hoch | ⏳ Offen |
| ARCH-003 | Setup-Checkliste Navigation inkonsistent | UX | 🟡 Mittel | ✅ Erledigt |
| ARCH-004 | Erweiterte Optionen im Setup versteckt | UX | 🟡 Mittel | ✅ Erledigt |
| DM-001 | Dark Mode: Hardcoded Light-Mode Farben in ~40 Komponenten | Dark Mode CSS | 🔴 Hoch | ✅ Erledigt |
| UX-001 | Challenges Toggle nur in erweiterten Einstellungen | UX | 🔴 Hoch | ✅ Erledigt |
| ARCH-004 | /edit Seite aufräumen, Optionen in Setup-Tab einbauen | UX/Architektur | 🟡 Mittel | ✅ Erledigt |

---

## Details

### BUG-001: Theme-Persistenz nach Login

**Problem:**
- Login-Seite zeigt korrektes Dark Theme
- Nach erfolgreichem Login wechselt Dashboard zu Light Theme
- User-Präferenz wird nicht respektiert

**Erwartetes Verhalten:**
- Theme sollte persistent bleiben (aus localStorage oder System-Präferenz)

**Betroffene Dateien (vermutlich):**
- `packages/frontend/src/app/layout.tsx`
- `packages/frontend/src/components/ThemeProvider.tsx`
- `packages/frontend/src/app/(host)/dashboard/page.tsx`

**Screenshots:** SS1, SS2

---

### BUG-002: Dark Mode Input-Felder unlesbar

**Problem:**
- Bottom-Sheet für Event-Titel hat dunklen Hintergrund
- Input-Text ist ebenfalls dunkel → nicht sichtbar/lesbar
- Betrifft wahrscheinlich alle Bottom-Sheets/Modals

**Erwartetes Verhalten:**
- Input-Felder sollten helle Schrift auf dunklem Hintergrund haben
- Oder hellen Hintergrund mit dunkler Schrift (konsistent mit Theme)

**Betroffene Dateien (vermutlich):**
- `packages/frontend/src/components/ui/BottomSheet.tsx`
- `packages/frontend/src/components/ui/Input.tsx`
- CSS-Variablen für Dark Mode

**Screenshots:** SS3

---

### BUG-003: Setup-Checkliste Accordion defekt

**Problem:**
- Klick auf "Setup-Checkliste" Header tut nichts
- Accordion öffnet/schließt nicht

**Erwartetes Verhalten:**
- Klick sollte Checkliste auf-/zuklappen

**Betroffene Dateien (vermutlich):**
- `packages/frontend/src/components/dashboard/SetupChecklist.tsx`
- Accordion-Komponente

**Screenshots:** SS4

---

### BUG-004: Inkonsistente Checklisten-Navigation

**Problem:**
- ❌ "Event-Titel festlegen" → öffnet allgemeines Setup Bottom-Menü
- ❌ "Datum & Ort hinzufügen" → öffnet allgemeines Setup Bottom-Menü
- ✅ "Design" → öffnet Design-Einstellungen (korrekt)
- ✅ "QR-Code Designer" → öffnet QR-Designer (korrekt)
- ✅ "Einladungen" → öffnet Einladungen (korrekt)

**Erwartetes Verhalten:**
- ALLE Checklisten-Punkte sollten konsistent zur jeweiligen Einstellung navigieren
- Event-Titel → direkt zum Titel-Editor
- Datum & Ort → direkt zum Datum/Ort-Editor

**Betroffene Dateien (vermutlich):**
- `packages/frontend/src/components/dashboard/SetupChecklist.tsx`
- Navigation-Handler für einzelne Punkte

**Screenshots:** SS4

---

### BUG-005: Service Worker Clone-Fehler

**Problem:**
- Console-Fehler: `TypeError: Failed to execute 'clone' on 'Response': Response body is already used`
- Response wird doppelt konsumiert (z.B. `response.json()` und dann nochmal cachen)

**Erwartetes Verhalten:**
- Keine Console-Fehler
- Sauberes Caching ohne Response-Konflikte

**Betroffene Dateien (vermutlich):**
- `packages/frontend/public/sw.js`
- `packages/frontend/src/components/pwa/ServiceWorkerProvider.tsx`

**Screenshots:** SS3 (Console)

---

### BUG-006: 404 bei design-image URLs

**Problem:**
- Bilder laden nicht: `/api/events/{id}/design-image/profile/...`
- 404 Not Found Fehler

**Bereits durchgeführte Änderungen:**
- `encodeURIComponent` aus 4 Dateien entfernt:
  - `EventHeader.tsx`
  - `EventCard.tsx`
  - `EventHero.tsx`
  - `EventInfoCard.tsx`
- Frontend neu gebaut und deployed (2026-02-02)

**Status:** Muss getestet werden ob Fix funktioniert

**Betroffene Dateien:**
- `packages/frontend/src/components/EventHeader.tsx`
- `packages/frontend/src/components/host-dashboard/EventCard.tsx`
- `packages/frontend/src/components/e3/EventHero.tsx`
- `packages/frontend/src/components/dashboard/EventInfoCard.tsx`

---

## Architektur-Details

### ARCH-001: Doppelte Funktionen eliminieren

**Aktueller Zustand (Chaos):**

| Funktion | Ort 1 | Ort 2 | Ort 3 |
|----------|-------|-------|-------|
| Farben setzen | Wizard (KI-Generator) ✨ | Design-Seite (manuell) 👴 | Setup-Menu (versteckt) |
| Bilder hochladen | Wizard ✨ | Design-Seite 👴 | - |
| Event-Titel | Setup-Checkliste | Event-Info | Setup-Menu |
| Datum & Ort | Setup-Checkliste | Event-Info | Setup-Menu |

**Problem:** 
- Gleiche Funktion an 2-3 verschiedenen Orten
- Alle sehen anders aus (modern vs. altmodisch)
- User weiß nicht wo er was findet
- KI-Farbgenerator im Wizard ist modern, Design-Seite ist altmodisch

**Lösung: Eine Wahrheit pro Funktion**

| Funktion | Einziger Ort | Entfernen von |
|----------|--------------|---------------|
| Farben/Branding | **Wizard** (KI-Generator) | Design-Seite, Setup-Menu |
| Bilder | **Wizard** | Design-Seite |
| Event-Info | **Event-Info Seite** | Setup-Menu (nur Navigation) |
| QR-Design | **QR-Styler** | - |

---

### ARCH-002: Design-Seite modernisieren oder entfernen

**Aktueller Zustand:**
- `/events/{id}/design` ist altmodisch (klassisches Formular)
- Kein Live-Preview
- Inkonsistent mit QR-Styler und Wizard

**Optionen:**

1. **Option A: Design-Seite → Redirect zum Wizard**
   - `/events/{id}/design` → `/events/{id}/dashboard?tab=design` (Wizard öffnet sich)
   - Alte Design-Seite wird nicht mehr benötigt
   - Alle Design-Funktionen im Wizard konsolidiert

2. **Option B: Design-Seite modernisieren**
   - Gleiches Layout wie QR-Styler (2-spaltig, Live-Preview)
   - Aufwand: ~1-2 Tage
   - Duplikation bleibt bestehen

**Empfehlung:** Option A (Redirect zum Wizard)

---

### ARCH-003: Setup-Checkliste konsistent machen

**Aktueller Zustand:**
- Einige Punkte öffnen Setup-Menu (falsch)
- Andere Punkte öffnen echte Einstellungen (richtig)

**Lösung: Setup-Checkliste erweitern**

```
Setup-Checkliste (erweitert):
┌─────────────────────────────────────────────────────────────┐
│ □ Event-Titel festlegen      → Inline-Editor oder Modal     │
│ □ Datum & Ort hinzufügen     → Inline-Editor oder Modal     │
│ □ Design anpassen            → Öffnet Wizard (Design-Tab)   │
│ □ QR-Code gestalten          → Öffnet QR-Styler             │
│ □ Einladungen versenden      → Öffnet Einladungen-Seite     │
│ □ Profilbild hochladen       → Öffnet Bild-Upload           │
│ □ Titelbild hochladen        → Öffnet Bild-Upload           │
└─────────────────────────────────────────────────────────────┘
```

**Prinzip:** Ein Klick = Eine Aktion (keine verschachtelten Menüs)

---

### ARCH-004: Erweiterte Optionen richtig einpflegen

**Aktueller Zustand:**
- Erweiterte Optionen sind im Setup-Menu versteckt
- Unklar welche Optionen wo existieren

**Lösung:**
1. Alle erweiterten Optionen inventarisieren
2. Prüfen ob sie woanders existieren (Duplikate entfernen)
3. Nicht-Duplikate an logische Stelle verschieben:
   - Design-bezogen → Wizard
   - Event-Info-bezogen → Event-Info Seite
   - Feature-bezogen → Features-Seite

---

## Umsetzungsplan

### Phase 1: Schnelle Bug-Fixes (1 Tag)
- [x] BUG-001: Theme-Persistenz fixen ✅ (Dashboard hardcodierte Farben durch CSS-Variablen ersetzt)
- [x] BUG-002: Dark Mode Input-Felder fixen ✅ (SetupTabV2, TitleContent, DateLocationContent)
- [x] BUG-003: Accordion fixen ✅ (Code war korrekt, kein Bug)
- [x] BUG-006: Design-image URLs ✅ (encodeURIComponent in 4 Komponenten hinzugefügt)

### Phase 2: Setup-Checkliste (1 Tag)
- [x] ARCH-003: Alle Checklisten-Punkte konsistent machen ✅
- [x] Event-Titel/Datum öffnen jetzt direkt Sheets (nicht Setup-Tab) ✅

### Phase 3: Konsolidierung (2-3 Tage)
- [x] ARCH-001: Design-Seite → Redirect zum Dashboard/Setup ✅
- [ ] ARCH-004: Erweiterte Optionen inventarisieren und einpflegen
- [ ] Alte/doppelte Komponenten entfernen

### Phase 4: Cleanup
- [x] BUG-005: Service Worker Clone-Fehler ✅ (response.clone() vor return + sw.js v5)
- [x] BUG-007: Doppeltes /api/api/ in Foto-URLs ✅ (buildApiUrl idempotent gemacht)
- [x] BUG-008: buildApiUrl() absolute URLs ✅ (early return für http/https URLs)
- [x] BUG-009: Dashboard-Galerie Lightbox ✅ (Link→button + inline Lightbox)
- [x] BUG-010: /invitations Bottom-Nav ✅ (DashboardFooter hinzugefügt)
- [x] BUG-011: QR-Styler Bottom-Nav ✅ (DashboardFooter hinzugefügt)
- [x] UX-001: Challenges Toggle ✅ (Schieberegler direkt auf Challenges-Seite)
- [x] BUG-012: Setup Galerie/Design Links ✅ (?wizard=1 an alle /design Links)
- [x] ARCH-004: /edit aufgeräumt ✅ (Feature-Toggles + Slug in SetupTabV2, /edit → Redirect)
- [x] DM-001: Dark Mode Fixes ✅ (40+ Dateien: setup-wizard, gamification, e3, ai-chat, workflow-runtime, invitation-editor, mosaic, highlight-reel, wizard — alle hardcoded light-mode Farben durch opacity-based Theme-Tokens ersetzt)
- [ ] Unused Code entfernen
- [ ] Dokumentation aktualisieren

---

## Notizen

- Erstellt: 2026-02-03
- Priorisierung: BUG-001 und BUG-002 zuerst (UX-kritisch)
- Architektur-Änderungen nach Bug-Fixes
