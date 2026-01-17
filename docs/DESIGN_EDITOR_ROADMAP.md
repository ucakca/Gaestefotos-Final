# Design Editor Roadmap - Gemini vs Cascade Analyse

**Date:** 17. Januar 2026  
**Analysten:** Gemini + Claude Cascade

---

## 🎯 Gemini's Feature-Matrix (Original)

### ✅ Was ist gut

1. **Canvas-Ansatz:** fabric.js/konva für gemeinsamen Editor - richtiger Gedanke
2. **JSON-Storage:** Bereits vorhanden (`event.designConfig`)
3. **Dual-Purpose:** Ein Editor für QR + Einladungen - effizienter als zwei getrennte Tools

### ⚠️ Was fehlt (aus Cascade Code-Analyse)

#### 1. Bestehende Architektur nicht berücksichtigt

```
Aktuell im Code:
├─ SVG-Templates (/public/qr-templates/*.svg)
├─ CSS Variables (--gf-bg, --gf-text, --gf-accent)
├─ renderQrToSvgMarkup() - funktioniert bereits
└─ Backend Export-Routes - production-ready

Gemini-Vorschlag:
└─ fabric.js Canvas von Null bauen
```

**Cascade-Empfehlung:**
- **Hybrid-Ansatz:** fabric.js für Einladungen, SVG-Templates für QR behalten
- **Grund:** SVG-Export funktioniert bereits perfekt für Print (300 DPI, PDF-lib)

#### 2. Performance-Überlegungen fehlen

**Gemini:** "15 kuratierte Web-Fonts"  
**Cascade:** 
- Lazy-Loading für Font-Preview (nicht alle vorladen)
- Canvas-Rendering throttlen bei Drag (60fps halten)
- Web-Font-Subsetting (nur verwendete Zeichen)

#### 3. Mobile/Tablet Support fehlt

**Kritisch für Gästefotos:**
- Hosts designen oft auf **iPad**
- Touch-Drag für Elemente
- Responsive Toolbar (Collapse auf Mobile)
- Pinch-to-Zoom für Canvas

#### 4. Print-Spezifische Features unvollständig

| Feature | Gemini | Cascade-Ergänzung |
|---------|--------|-------------------|
| Bleed-Control | ✅ 3mm Auto | ✅ + Host-UI dafür (aktuell nur Admin) |
| Safe-Zone | ❌ | ⚠️ FEHLT - Visualisierung wo Text abgeschnitten wird |
| DPI-Warnung | ❌ | ⚠️ FEHLT - Warnung bei <150 DPI Uploads |
| Crop-Marks | ✅ | ✅ Bereits implementiert (nur Admin) |
| CMYK-Export | ❌ | ⚠️ FEHLT - Nur RGB aktuell |

---

## 🔧 Cascade's Korrigierte Priorisierung

| # | Gemini-Prio | Cascade-Empfehlung | Grund |
|---|-------------|---------------------|-------|
| 1 | Canvas-Basis bauen | **FIX DownloadButton.tsx** | Kritischer Bug - Export funktioniert nicht |
| 2 | Undo/Redo | Nach MVP | Nice-to-have, nicht Launch-kritisch |
| 3 | Batch-Generierung | Später (Admin-Feature) | Nicht Host-relevant für Launch |
| 4 | Font-Library 15 Fonts | 5-7 Fonts + Lazy-Load | Performance > Feature-Anzahl |

---

## 📋 Optimierter Sonnet-Prompt

### Phase 1: Foundation (KW 6-7)

```markdown
## AUFTRAG: Universeller Design-Editor

### 1. TECHNOLOGIE-STACK
- **Canvas-Library:** Konva.js (React-Integration > fabric.js)
- **Bestehend nutzen:** QRDesignConfig (shared/types/qr-design.ts)
- **Export-Routes:** `/api/events/:id/qr/export.{png|pdf}` (NICHT neu bauen)

### 2. ARCHITEKTUR
**Hybrid-Ansatz:**
- **QR-Aufsteller:** Bestehende SVG-Templates + CSS Variables (funktioniert)
- **Einladungen:** Neuer Konva.js Canvas (volle Freiheit)

**Grund:** SVG-Export ist production-ready für Print, nicht kaputt machen!

### 3. INTEGRATION (KRITISCH)
**Dateien zum Studieren:**
- `frontend/src/app/events/[id]/qr-styler/page.tsx` (Auto-Save Pattern 1s Debounce)
- `frontend/src/components/qr-designer/*` (Bestehende UI-Patterns)
- `shared/src/types/qr-design.ts` (Datenmodell)

**Wiederverwendbare Patterns:**
```typescript
// Auto-Save (bereits funktioniert)
const debouncedSave = useMemo(
  () => debounce((config) => saveConfig(config), 1000),
  []
);

// QR-Rendering (bereits funktioniert)
const qrMarkup = await renderQrToSvgMarkup(publicUrl);
const svg = embedQrIntoTemplateSvg(templateSvg, qrMarkup);
```

### 4. MOBILE-FIRST (FEHLT BEI GEMINI)
- Touch-Drag für iPad-Nutzer
- Responsive Toolbar (Collapse <768px)
- Pinch-to-Zoom für Canvas
- Touch-optimierte Button-Größen (min 44x44px)

### 5. PRINT-QUALITÄT
**Neue Features:**
```typescript
// Safe-Zone Visualisierung
const SAFE_ZONE_MM = 5; // 5mm vom Rand
showSafeZoneGuides: boolean;

// DPI-Check
if (uploadedImage.dpi < 150) {
  showWarning('Bild könnte beim Druck verpixeln');
}

// CMYK-Preview (optional)
showCmykPreview: boolean; // Zeigt wie Farben im Druck aussehen
```

### 6. FEATURE-PRIORITÄT

**MVP (Launch-kritisch):**
- [ ] Fix DownloadButton.tsx QR-Embedding
- [ ] Font-Selector (5 Fonts: Sans, Serif, Script, Mono, Display)
- [ ] Font-Size Slider (12-96px)
- [ ] Text-Alignment (left, center, right)
- [ ] Color-Picker (bestehend nutzen)
- [ ] Auto-Save (bestehend nutzen)

**Post-MVP:**
- [ ] Drag-and-Drop Bilder
- [ ] Layer-Management
- [ ] Undo/Redo
- [ ] Grafik-Bibliothek (Icons)
- [ ] Magnetische Hilfslinien

**Admin-Features:**
- [ ] Batch-Generierung
- [ ] CMYK-Export
- [ ] Erweiterte Bleed-Control

### 7. PERFORMANCE-BUDGET
```
Ziel: Canvas-Interaktion < 16ms (60fps)

Maßnahmen:
- Lazy-Load Fonts (nur Preview, nicht alle laden)
- Throttle Canvas-Rendering (requestAnimationFrame)
- Debounce Text-Input (300ms)
- Image-Compression (max 2MB Uploads)
```
```

---

## 🆚 Gemini vs Cascade - Key Differences

| Aspekt | Gemini | Cascade |
|--------|--------|---------|
| **Ansatz** | Von Null bauen | Iterativ auf Bestehendem aufbauen |
| **Canvas** | fabric.js überall | Hybrid: Konva.js (Einladungen) + SVG (QR) |
| **Prio 1** | Canvas-Basis | DownloadButton QR-Bug fixen |
| **Mobile** | Nicht erwähnt | iPad-Support kritisch |
| **Performance** | Nicht erwähnt | Lazy-Loading, Throttling |
| **Integration** | Nicht erwähnt | Bestehende Patterns wiederverwenden |

---

## 🎯 Empfohlene Phase-Einteilung

### Phase 1: Quick Wins (KW 6) - 3-5 Tage
**Ziel:** QR-System produktionsreif machen

- [x] ~~DownloadButton.tsx QR-Bug fixen~~ ✅
- [ ] Font-Selector UI (5 Fonts)
- [ ] Font-Size Slider
- [ ] Template-Formate (A4, Poster, Quadrat)
- [ ] Safe-Zone Visualisierung

**Output:** QR-Aufsteller sind druckfertig

---

### Phase 2: Canvas-Foundation (KW 7-8) - 7-10 Tage
**Ziel:** Einladungskarten-Editor MVP

**Konva.js Setup:**
```typescript
// CanvasEditor.tsx
import { Stage, Layer, Text, Image, Rect } from 'react-konva';

const CanvasEditor = ({ initialConfig }: { initialConfig: InvitationConfig }) => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  
  // Auto-Save Pattern (bestehend)
  const debouncedSave = useMemo(
    () => debounce((config) => api.put(`/events/${eventId}/invitation`, config), 1000),
    []
  );
  
  return (
    <Stage width={800} height={1200}>
      <Layer>
        {elements.map(el => renderElement(el))}
      </Layer>
    </Stage>
  );
};
```

**Features:**
- [ ] Text-Editing (Drag, Resize, Rotate)
- [ ] Image-Upload (Drag-to-Position)
- [ ] Basic Toolbar (Font, Size, Color)
- [ ] Export via bestehende Routes

**Output:** Einladungen können erstellt und exportiert werden

---

### Phase 3: Advanced Features (KW 9-11) - 10-14 Tage
**Ziel:** Canva-ähnliches Feeling

- [ ] Layer-Management (Z-Index)
- [ ] Undo/Redo (10 Schritte)
- [ ] Grafik-Bibliothek (50 Icons)
- [ ] Magnetische Hilfslinien
- [ ] Filter (SW, Sepia)
- [ ] Duplizieren (Strg+D)

**Output:** Professioneller Design-Editor

---

### Phase 4: Admin & Batch (KW 12+) - 5-7 Tage

- [ ] Batch-PDF-Generierung
- [ ] CMYK-Export
- [ ] Erweiterte Print-Kontrolle
- [ ] Template-Bibliothek (Admin erstellt Vorlagen)

---

## 📊 Effort-Schätzung

| Phase | Gemini | Cascade | Unterschied |
|-------|--------|---------|-------------|
| **Phase 1** | - | 3-5 Tage | Nutzt bestehendes System |
| **Phase 2** | 14 Tage | 7-10 Tage | Integration statt Neubau |
| **Phase 3** | 14 Tage | 10-14 Tage | Ähnlich |
| **Phase 4** | 7 Tage | 5-7 Tage | Ähnlich |
| **GESAMT** | ~35 Tage | ~25-36 Tage | **~30% schneller** |

**Grund für Zeitersparnis:**
- Bestehende Export-Routes nutzen
- Auto-Save Pattern wiederverwenden
- SVG-Templates für QR behalten (nicht neu bauen)

---

## 🚀 Sofort-Aktion für Sonnet

**Kopiere diesen Prompt:**

```
Ich arbeite an gästefotos.com - analysiere ZUERST die bestehende Architektur:

Dateien:
1. /packages/frontend/src/app/events/[id]/qr-styler/page.tsx
2. /packages/frontend/src/components/qr-designer/DownloadButton.tsx
3. /packages/shared/src/types/qr-design.ts

Aufgabe:
1. FIX kritischen Bug in DownloadButton.tsx:58-65 (QR wird nicht eingebettet)
2. Nutze renderQrToSvgMarkup() + embedQrIntoTemplateSvg() aus qr-styler/page.tsx
3. DANN: Plane einen Konva.js Canvas-Editor FÜR EINLADUNGEN (nicht QR!)
4. Wiederverwendung: Auto-Save Pattern, Export-Routes, QRDesignConfig-Schema

Constraints:
- Bestehende SVG-Templates NICHT ersetzen
- Mobile/iPad-Support von Anfang an
- Performance-Budget: 60fps für Drag-Operationen
```

---

## ✅ Fazit

**Gemini's Ansatz:** Gut durchdacht, aber **"Greenfield"**-Denken  
**Cascade's Ansatz:** **"Brownfield"**-Optimierung - nutzt bestehendes System

**Empfehlung:** Cascade-Ansatz für schnelleren Launch, Gemini's Feature-Liste als Langzeit-Roadmap

---

**Status:** Phase 1 teilweise abgeschlossen ✅  
**Completed:** DownloadButton.tsx Bug fixed (17.01.2026)  
**Next Step:** Frontend Deployment → dann Font-Selector UI (Phase 1 Rest)
