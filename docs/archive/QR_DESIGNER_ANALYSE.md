# QR-Code Designer / Tischaufsteller-Designer - Analyse & Fahrplan

**Erstellt:** 2026-01-29  
**Aktualisiert:** 2026-01-29  
**Status:** Planungsphase (kein Coding)  
**Review:** Bestätigt durch Gemini + Claude Analyse

---

## Inhaltsverzeichnis

1. [IST-Zustand Analyse](#1-ist-zustand-analyse)
2. [Architektur-Vision: Slicer-System](#2-architektur-vision-slicer-system)
3. [WYSIWYG Inline-Editing](#3-wysiwyg-inline-editing)
4. [Branding & Marketing](#4-branding--marketing)
5. [Multi-Format Export](#5-multi-format-export)
6. [Typography & Font-Kontrolle](#6-typography--font-kontrolle)
7. [AI-Light Checks (kostenlos)](#7-ai-light-checks-kostenlos)
8. [QR-Code Styling](#8-qr-code-styling)
9. [UX Features](#9-ux-features)
10. [Datenmodell](#10-datenmodell)
11. [Tech-Stack](#11-tech-stack)
12. [Implementierungs-Roadmap](#12-implementierungs-roadmap)
13. [Workflow: Creative Fabrica → App](#13-workflow-creative-fabrica--app)

---

## 1. IST-Zustand Analyse

### 1.1 Aktuelle Architektur

```
/packages/frontend/src/
├── app/events/[id]/qr-styler/page.tsx     # Haupt-Page (759 Zeilen)
├── components/qr-designer/
│   ├── Step1Template.tsx                   # Template-Auswahl
│   ├── Step2Content.tsx                    # Text-Eingaben
│   ├── Step3DesignExport.tsx               # Farben + Export
│   ├── ColorPicker.tsx
│   ├── LogoUpload.tsx
│   ├── QRPreview.tsx
│   └── ... (17 Komponenten gesamt)
└── public/qr-templates/
    ├── minimal-classic/
    │   ├── A5.svg
    │   ├── A6.svg
    │   └── A6-preview.jpg
    ├── elegant-floral/
    └── ... (10 Templates)
```

### 1.2 Template-System (aktuell)

**SVG-Struktur** (Beispiel `minimal-classic/A6.svg`):
```svg
<svg viewBox="0 0 1050 1480">
  <style>
    :root { --gf-bg: #fff; --gf-text: #1a1a1a; --gf-accent: #295B4D; }
  </style>
  
  <rect id="gf:bg" ... />                           <!-- Hintergrund -->
  <text id="gf:text:headline">...</text>            <!-- Dynamischer Text -->
  <text id="gf:text:subline">...</text>
  <text id="gf:text:eventName">...</text>
  <rect id="gf:qr" x="395" y="620" width="260" height="260" />  <!-- QR-Platzhalter -->
  <text id="gf:text:callToAction">...</text>
</svg>
```

**Konvention:**
- `id="gf:qr"` → QR-Code Platzhalter (rect mit x, y, width, height)
- `id="gf:text:*"` → Dynamische Textfelder
- `id="gf:bg"` → Hintergrund-Element
- CSS-Variablen → Farbanpassung (`--gf-bg`, `--gf-text`, `--gf-accent`)

### 1.3 Was funktioniert gut ✅

| Feature | Implementierung |
|---------|-----------------|
| **3-Step Wizard** | Clean UX Flow (Template → Text → Export) |
| **SVG-basiertes Rendering** | Skalierbar, CSS-Variablen für Farben |
| **Autosave** | Config wird automatisch in DB gespeichert |
| **Export PNG/PDF/SVG** | Backend-Rendering mit resvg + pdf-lib |
| **Format-Auswahl** | A5/A6 Toggle |
| **Category Filter** | Templates nach Kategorien filterbar |
| **Content Presets** | Schnellvorlagen (Hochzeit, Geburtstag, etc.) |
| **Color Presets** | Farbschemata zum schnellen Anwenden |

### 1.4 Limitierungen & Probleme ⚠️

| Problem | Beschreibung | Schweregrad |
|---------|--------------|-------------|
| **Hardcoded Templates** | Templates als statische SVG-Dateien in `/public` | 🔴 Kritisch |
| **Kein Admin-Interface** | Neue Templates erfordern manuelles SVG-Editing | 🔴 Kritisch |
| **Keine Bild-Hintergründe** | Nur reine SVG-Grafiken, keine PNG/JPG-Backgrounds | 🟡 Mittel |
| **Feste Text-Positionen** | Font-Size/Position nicht vom User anpassbar | 🟡 Mittel |
| **QR-Code nur Standard** | Keine Dot-Styles, Ecken-Styles, Logos im QR | 🟡 Mittel |
| **Keine Live-Vorschau** | Preview lädt verzögert nach | 🟢 Gering |
| **Keine Scan-Garantie** | Kein Kontrast-Check für QR-Lesbarkeit | 🟡 Mittel |

---

## 2. Architektur-Vision: Slicer-System

### 2.1 2-Tier Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN LAYER (Slicer)                     │
│  ┌─────────────────────────────────────────────────────────┤
│  │  1. Upload: PNG/JPG Hintergrund hochladen               │
│  │  2. Hotspots: Bereiche für Text/QR visuell markieren    │
│  │  3. Constraints: Font, Min/Max Size, Alignment          │
│  │  4. Export: JSON-Config + optimiertes Asset speichern   │
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
                              ↓
                     Template-Bibliothek (DB)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    USER LAYER (WYSIWYG Editor)              │
│  ┌─────────────────────────────────────────────────────────┤
│  │  1. Template wählen (gefiltert nach Kategorie/Event)    │
│  │  2. DIREKT IM PREVIEW Texte bearbeiten (Inline Edit)    │
│  │  3. Sidebar: Farben/QR-Style/Font-Size anpassen         │
│  │  4. AI-Check: Rechtschreibung, Kontrast, Tipps          │
│  │  5. Multi-Format Export: A5/A6/Story/Social             │
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Warum dieser Ansatz?

| Vorteil | Beschreibung |
|---------|--------------|
| **Skalierbarkeit** | Mit Slicer können 20 Templates in 1 Stunde erstellt werden |
| **Design-Integrität** | User kann Design nicht "kaputt machen" (nur fixe Zonen) |
| **WYSIWYG** | Arbeiten direkt am Ergebnis = beste User Experience |
| **Marketing** | Branding auf jedem Export = virales Wachstum |

### 2.3 Datenmodell: Template JSON Schema

```typescript
interface TemplateDefinition {
  // Metadata
  id: string;                    // UUID
  slug: string;                  // "boho-floral-01"
  name: string;                  // "Boho Floral"
  category: TemplateCategory;    // "boho" | "business" | "party" | ...
  tags: string[];                // ["wedding", "outdoor", "rustic"]
  license: "full-pod" | "personal";
  createdAt: Date;
  
  // Dimensions
  format: "A6" | "A5" | "A4" | "custom";
  dimensions: {
    width: number;               // in mm
    height: number;
    dpi: number;                 // 300 für Print
  };
  
  // Background Layer
  background: {
    type: "image" | "color" | "gradient";
    imageUrl?: string;           // CDN URL zum optimierten Asset
    color?: string;
    gradient?: { from: string; to: string; angle: number };
  };
  
  // Hotspots (Text-Zonen)
  textZones: TextZone[];
  
  // QR-Code Zone
  qrZone: {
    x: number;                   // Prozent oder Pixel
    y: number;
    width: number;
    height: number;
    allowedStyles: QRStyle[];    // Welche QR-Styles erlaubt
    defaultStyle: QRStyle;
    padding: number;             // Abstand zum Rand
  };
  
  // Optionale Dekorations-Layer
  overlays?: OverlayLayer[];     // Florale Elemente, Rahmen, etc.
  
  // Defaults für User
  defaults: {
    headline: string;
    subline: string;
    callToAction: string;
    colorScheme: ColorScheme;
  };
}

interface TextZone {
  id: string;                    // "headline" | "subline" | "eventName" | "cta"
  label: string;                 // "Überschrift"
  x: number;
  y: number;
  width: number;
  height: number;
  font: {
    family: string;              // "Playfair Display"
    fallback: string;            // "serif"
    weight: number | number[];   // 400 oder [400, 700] für Range
    style: "normal" | "italic";
  };
  size: {
    default: number;
    min: number;
    max: number;
    unit: "px" | "pt";
  };
  color: {
    type: "fixed" | "variable";
    value?: string;              // Feste Farbe oder CSS-Variable
    variable?: "--gf-text" | "--gf-accent";
  };
  alignment: "left" | "center" | "right";
  maxLines: number;
  optional: boolean;             // Kann leer gelassen werden
}

interface QRStyle {
  dotStyle: "square" | "rounded" | "dots" | "classy" | "classy-rounded";
  cornerStyle: "square" | "rounded" | "dot";
  cornerDotStyle: "square" | "rounded" | "dot";
  allowLogo: boolean;
  logoMaxSize: number;           // Prozent der QR-Fläche
}

interface ColorScheme {
  background: string;
  text: string;
  accent: string;
}
```

### 2.3 Was ich HINZUFÜGEN würde ➕

| Feature | Begründung | Priorität |
|---------|------------|-----------|
| **Admin Slicer UI** | Visuelles Hotspot-Tool für Template-Erstellung | 🔴 P0 |
| **Bild-Hintergründe** | Creative Fabrica Assets nutzen | 🔴 P0 |
| **QR-Code Styling** | Dot-Styles, Corner-Styles, Logos | 🟡 P1 |
| **Kontrast-Checker** | Automatische Scan-Garantie | 🟡 P1 |
| **Font-Auswahl** | Pro Textzone spezifische Fonts | 🟡 P1 |
| **Template-Favoriten** | User kann Templates speichern | 🟢 P2 |
| **AI-Textvorschläge** | Basierend auf Event-Typ generieren | 🟢 P2 |
| **Bulk-Export** | Mehrere Formate auf einmal | 🟢 P2 |

### 2.4 Was ich WEGLASSEN/VEREINFACHEN würde ➖

| Feature | Begründung |
|---------|------------|
| **Freie Text-Positionierung** | Zerstört Design-Integrität, nur fixe Zonen |
| **Unbegrenzte Farbfreiheit** | Lieber kuratierte Paletten pro Template |
| **SVG-only Templates** | Hybrid-Ansatz (Bild + SVG-Overlays) |
| **Manuelle Font-Size** | Auto-Fit basierend auf Textlänge |

### 2.5 Was ich OPTIMIEREN würde 🔧

| Bereich | Aktuell | Vorschlag |
|---------|---------|-----------|
| **Template Storage** | Statische Dateien in `/public` | CDN + DB-Referenz |
| **Rendering** | Client-side SVG-Manipulation | Server-side für Export |
| **Preview** | Verzögertes Laden | Optimistic UI + Skeleton |
| **QR-Library** | `qrcode.react` (basic) | `qr-code-styling` (advanced) |

---

## 3. WYSIWYG Inline-Editing

### 3.1 Konzept: Hybrid-Ansatz

```
┌─────────────────────────────────────────────────────────────┐
│                    DESKTOP VIEW                             │
│  ┌──────────────────────┬──────────────────────────────────┤
│  │   Controls Panel     │      Live Preview (klickbar)     │
│  │   ┌──────────────┐   │   ┌────────────────────────────┐ │
│  │   │ Format: A6 ▼ │   │   │    Unsere Hochzeit   ← click│ │
│  │   │ Farben: ...  │   │   │   Teilt eure Momente  ← click│ │
│  │   │ QR-Style: ...│   │   │       [QR CODE]             │ │
│  │   │ Font-Size: ──│   │   │   Scannen & hochladen       │ │
│  │   └──────────────┘   │   │                              │ │
│  │                      │   │      ○ gästefotos.com        │ │
│  │   Quick Actions:     │   └────────────────────────────┘ │
│  │   [Hochzeit] [Party] │                                   │
│  └──────────────────────┴──────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

### 3.2 So funktioniert's

1. **User klickt auf Text im Preview** → Inline-Editing aktiviert (Cursor blinkt)
2. **Sidebar zeigt kontextabhängig** Font/Farbe für das aktive Element
3. **Farben/Format/QR-Style** bleiben in der Sidebar (nicht inline)
4. **Escape oder Klick außerhalb** → Editing beenden

### 3.3 Technische Umsetzung

```typescript
// State für aktives Element
const [activeZone, setActiveZone] = useState<string | null>(null);

// Klick-Handler auf Text-Element
const handleTextClick = (zoneId: string) => {
  setActiveZone(zoneId);
  // Focus auf verstecktes Input-Feld für Keyboard-Events
};

// Render: contentEditable auf SVG foreignObject
<foreignObject x={zone.x} y={zone.y} width={zone.width} height={zone.height}>
  <div
    contentEditable={activeZone === zone.id}
    onBlur={() => setActiveZone(null)}
    style={{ fontSize: zone.fontSize, fontFamily: zone.font }}
  >
    {texts[zone.id]}
  </div>
</foreignObject>
```

---

## 4. Branding & Marketing

### 4.1 Automatisches Branding auf jedem Export

```
┌────────────────────────┐
│                        │
│    [Design Content]    │
│                        │
│       [QR CODE]        │
│                        │
│   "Scanne & teile"     │
│                        │
│ ────────────────────── │
│   ○ gästefotos.com     │  ← Subtle, immer sichtbar
└────────────────────────┘
```

### 4.2 Branding-Optionen

| Option | Beschreibung | Zielgruppe |
|--------|--------------|------------|
| **Subtle (Default)** | Klein, unten mittig, 60% Opacity | Free User |
| **Minimal** | Nur Icon + URL, unten rechts | Free User |
| **Ohne** | Kein Branding | Premium User |

### 4.3 Implementierung

```typescript
interface ExportOptions {
  format: 'A6' | 'A5' | 'story' | 'square';
  includeBranding: boolean;  // Default: true
  brandingStyle: 'subtle' | 'minimal' | 'none';
}

const BRANDING = {
  subtle: {
    text: 'gästefotos.com',
    position: 'bottom-center',
    fontSize: 12,
    opacity: 0.6
  },
  minimal: {
    text: '📷 gästefotos.com',
    position: 'bottom-right',
    fontSize: 10,
    opacity: 0.4
  }
};
```

### 4.4 Marketing-Effekt

> Ein Gast auf der Hochzeit sieht den Aufsteller → scannt den Code → nutzt die App → 
> sieht das Branding → plant selbst ein Event → weiß woher das Tool kommt.
> **= Kostenloses virales Marketing**

---

## 5. Multi-Format Export

### 5.1 Unterstützte Formate

| Format | Dimensionen | Verwendung |
|--------|-------------|------------|
| **A6 (Default)** | 105×148mm (1240×1748px @300dpi) | Tischaufsteller |
| **A5** | 148×210mm (1748×2480px @300dpi) | Größerer Aufsteller |
| **Instagram Story** | 1080×1920px | Social Media |
| **WhatsApp Status** | 1080×1920px | Direktes Teilen |
| **Quadrat** | 1080×1080px | Instagram Post |
| **Visitenkarte** | 85×55mm | Mini-Karten |

### 5.2 Automatische Layout-Anpassung

Gleiches Design, verschiedene Layouts:

```
A6 (Hochformat)          Story (9:16)           Quadrat (1:1)
┌──────────┐             ┌──────────┐           ┌──────────────┐
│ Headline │             │          │           │   Headline   │
│ Subline  │             │ Headline │           │   [QR CODE]  │
│          │             │ Subline  │           │   Subline    │
│ [QR CODE]│             │ [QR CODE]│           └──────────────┘
│          │             │          │
│ CTA      │             │ CTA      │
└──────────┘             └──────────┘
```

### 5.3 Export-UI

```
┌─────────────────────────────────────────────────────────────┐
│  Export                                                     │
│  ┌─────────────────────────────────────────────────────────┤
│  │  Format:  [A6] [A5] [Story] [Quadrat]                   │
│  │                                                          │
│  │  Dateiformat:  [PNG] [PDF] [SVG]                        │
│  │                                                          │
│  │  Branding:  ● An  ○ Aus (Premium)                       │
│  │                                                          │
│  │  [████████████████ Download ████████████████]           │
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Typography & Font-Kontrolle

### 6.1 Dual-Mode: Auto-Fit + Manual

| Mode | Beschreibung | Standard |
|------|--------------|----------|
| **Auto-Fit** | System berechnet optimale Größe | ✅ Default |
| **Manual** | Slider für Font-Size mit Min/Max | Power User |

### 6.2 Auto-Fit Logik

```typescript
function calculateAutoFitSize(
  text: string,
  zone: TextZone,
  ctx: CanvasRenderingContext2D
): number {
  let fontSize = zone.size.max;
  
  while (fontSize >= zone.size.min) {
    ctx.font = `${fontSize}px ${zone.font.family}`;
    const metrics = ctx.measureText(text);
    
    if (metrics.width <= zone.width) {
      return fontSize;
    }
    fontSize -= 2;
  }
  
  return zone.size.min;
}
```

### 6.3 UI für Font-Size

```
┌─────────────────────────────────────────────────────────────┐
│  Schriftgröße                                               │
│  ┌─────────────────────────────────────────────────────────┤
│  │  ○ Auto-Fit (empfohlen)                                 │
│  │  ● Manuell                                              │
│  │                                                          │
│  │  [========●================] 48px                       │
│  │   24px                    72px                           │
│  │                                                          │
│  │  ⚠️ Text ragt über Rand - verkleinere oder kürze        │
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

### 6.4 Text-Overflow als Design-Feature (Optional)

Manche Designs sehen mit überragendem Text gut aus:

```
    ┌────────────────────────┐
    │                        │
SARAH & MAX                  │  ← Text ragt links raus (absichtlich)
    │                        │
    │       [QR CODE]        │
    └────────────────────────┘
```

```typescript
interface TextZone {
  overflow: {
    allowed: boolean;      // Template definiert ob erlaubt
    mode: 'clip' | 'visible' | 'fade';
    direction: 'left' | 'right' | 'both';
  };
}
```

---

## 7. AI-Light Checks (kostenlos)

### 7.1 Prinzip: Regelbasiert, keine API-Kosten

| Check | Technologie | Kosten |
|-------|-------------|--------|
| **Rechtschreibung** | Browser Spellcheck API | 0€ |
| **Text-Overflow** | Canvas measureText() | 0€ |
| **QR-Kontrast** | WCAG-Formel | 0€ |
| **Textlänge** | Hardcoded Limits | 0€ |
| **Style-Tipps** | Regelbasiert | 0€ |

### 7.2 UI für Feedback

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Design-Check                                [Prüfen]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Rechtschreibung: OK                                     │
│                                                             │
│  ⚠️ Textlänge: Headline könnte abgeschnitten werden        │
│     Empfehlung: Max 20 Zeichen  [Auto-Kürzen]              │
│                                                             │
│  ✅ QR-Kontrast: Gut lesbar (Score: 94%)                   │
│                                                             │
│  💡 Tipp: "Hochzeit Sarah & Max" wirkt persönlicher        │
│     [Übernehmen]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Implementierung (Client-Side)

```typescript
function analyzeDesign(texts: DesignTexts, colors: Colors): DesignFeedback {
  const feedback: DesignFeedback = { warnings: [], tips: [] };
  
  // 1. Textlänge-Check
  if (texts.headline.length > 25) {
    feedback.warnings.push({
      type: 'length',
      field: 'headline',
      message: 'Headline könnte zu lang sein (>25 Zeichen)'
    });
  }
  
  // 2. QR-Kontrast (WCAG)
  const contrast = getContrastRatio(colors.bg, colors.qr);
  if (contrast < 4.5) {
    feedback.warnings.push({
      type: 'contrast',
      message: 'QR-Code Kontrast zu gering für optimales Scannen'
    });
  }
  
  // 3. Doppelte Leerzeichen
  if (Object.values(texts).some(t => t.includes('  '))) {
    feedback.warnings.push({
      type: 'spacing',
      message: 'Doppelte Leerzeichen gefunden'
    });
  }
  
  // 4. Style-Tipps (regelbasiert)
  if (eventType === 'wedding' && !texts.headline.includes('&')) {
    feedback.tips.push('Tipp: Namen mit "&" verbinden wirkt persönlicher');
  }
  
  return feedback;
}

// WCAG Kontrast-Berechnung
function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
```

---

## 8. QR-Code Styling

### 8.1 Library: `qr-code-styling`

```typescript
import QRCodeStyling from 'qr-code-styling';

const qr = new QRCodeStyling({
  width: 300,
  height: 300,
  data: "https://gaestefotos.com/e3/event-slug",
  dotsOptions: {
    type: "classy-rounded",
    color: "#295B4D"
  },
  cornersSquareOptions: {
    type: "extra-rounded",
    color: "#295B4D"
  },
  cornersDotOptions: {
    type: "dot",
    color: "#295B4D"
  },
  backgroundOptions: {
    color: "transparent"
  },
  image: "/logo.png",  // Optional: Logo in der Mitte
  imageOptions: {
    margin: 10,
    imageSize: 0.4
  }
});
```

### 8.2 Verfügbare Styles

| Dot-Style | Corner-Style | Vorschau |
|-----------|--------------|----------|
| square | square | ▪▪▪ |
| rounded | rounded | ●●● |
| dots | dot | ○○○ |
| classy | extra-rounded | ◆◆◆ |
| classy-rounded | - | ◇◇◇ |

### 8.3 UI für QR-Style

```
┌─────────────────────────────────────────────────────────────┐
│  QR-Code Style                                              │
│  ┌─────────────────────────────────────────────────────────┤
│  │  Punkte:   [■] [●] [○] [◆] [◇]                         │
│  │  Ecken:    [▢] [◯] [◉]                                  │
│  │                                                          │
│  │  Logo in Mitte:  [Hochladen]  [x Entfernen]             │
│  │                                                          │
│  │  Farbe:  [████]  (übernimmt Akzentfarbe)               │
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

---

## 9. UX Features

### 9.1 Undo/Redo

```typescript
const [history, setHistory] = useState<DesignState[]>([initialState]);
const [historyIndex, setHistoryIndex] = useState(0);

const undo = () => {
  if (historyIndex > 0) {
    setHistoryIndex(i => i - 1);
    applyState(history[historyIndex - 1]);
  }
};

const redo = () => {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(i => i + 1);
    applyState(history[historyIndex + 1]);
  }
};

// Keyboard shortcuts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.metaKey && e.key === 'z') {
      e.shiftKey ? redo() : undo();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

### 9.2 Template-Empfehlung per Event-Typ

```
Event-Typ: Hochzeit
─────────────────────────────────
Empfohlen für Hochzeiten:
[Elegant Floral] [Boho Rose] [Minimal White]

Alle Templates:
[...filtered list...]
```

### 9.3 Mehrere Designs pro Event speichern

```
"Meine Designs für Hochzeit Sarah & Max"
├── Tischaufsteller v1 (Boho)      [Bearbeiten] [Löschen]
├── Tischaufsteller v2 (Elegant)   [Bearbeiten] [Löschen]
└── Instagram Story Version        [Bearbeiten] [Löschen]

[+ Neues Design erstellen]
```

### 9.4 Social Sharing

```
┌─────────────────────────────────────────────────────────────┐
│  Teilen                                                     │
│  ┌─────────────────────────────────────────────────────────┤
│  │  [WhatsApp]  [Instagram Story]  [E-Mail]  [Link kopieren]│
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Datenmodell

Das vollständige Template-Schema ist in Abschnitt 2.3 dokumentiert.

---

## 11. Tech-Stack

| Bereich | Empfehlung | Begründung |
|---------|------------|------------|
| **Admin Canvas** | Konva.js | Leichter als Fabric.js, React-optimiert |
| **User Preview** | SVG + React | Bestehend, performant |
| **QR-Rendering** | `qr-code-styling` | 6 Styles, Logo-Support |
| **Backend Export** | `@resvg/resvg-js` | Bereits implementiert |
| **PDF** | `pdf-lib` | Bereits implementiert |
| **Template Storage** | DB + CDN | Skalierbar |

---

## 12. Implementierungs-Roadmap

### Phase 1: MVP (5-7 Tage) 🔴 PRIORITÄT

| Feature | Aufwand | Status |
|---------|---------|--------|
| WYSIWYG Inline-Editing | 3 Tage | [ ] |
| Font-Size (Auto + Manual) | 1 Tag | [ ] |
| Branding-Layer | 0.5 Tag | [ ] |
| QR-Code Styling | 1 Tag | [ ] |
| Undo/Redo | 0.5 Tag | [ ] |
| Multi-Format (A5/A6/Story) | 1 Tag | [ ] |
| AI-Light Checks (client-side) | 0.5 Tag | [ ] |

### Phase 2: DB-Migration (2-3 Tage)

- [ ] Prisma Schema für `QRTemplate`
- [ ] API: CRUD Endpoints
- [ ] Migration bestehender Templates
- [ ] CDN-Integration

### Phase 3: Admin Slicer (4-5 Tage) - SPÄTER

- [ ] Konva.js Setup
- [ ] Hotspot-Tool
- [ ] Zone-Properties Panel
- [ ] JSON-Preview + Speichern

### Phase 4: Polish (1-2 Tage)

- [ ] Template-Empfehlung per Event-Typ
- [ ] Mehrere Designs pro Event
- [ ] Social Sharing Integration
- [ ] Mobile Optimierung

---

## 13. Workflow: Creative Fabrica → App

```
SCHRITT 1: Asset-Download
├── Creative Fabrica (Full-POD Lizenz)
├── Format: PNG/JPG (min 300 DPI)
└── Beispiel: 3508 x 4960 px

SCHRITT 2: Optimierung (lokal)
├── Resize auf Zielformat
├── Kompression (TinyPNG)
└── Output: ~200-500 KB

SCHRITT 3: Admin Slicer
├── Upload Asset
├── Text-Hotspots markieren
├── QR-Zone definieren
└── JSON + CDN-Upload

SCHRITT 4: Live in App
├── Template in DB
├── User wählt Template
├── WYSIWYG Editing
└── Export in Druckqualität
```

---

## 14. Fazit

### Das Tool wird:
- **Professionell aussehen** (Creative Fabrica Assets)
- **Sich professionell anfühlen** (WYSIWYG + AI-Feedback)
- **Das Business skalieren** (Admin Slicer für 1000+ Templates)
- **Sich selbst vermarkten** (Branding auf jedem Export)

### Geschätzter Gesamtaufwand:
- **Phase 1 (MVP):** 5-7 Tage
- **Phase 2 (DB):** 2-3 Tage
- **Phase 3 (Slicer):** 4-5 Tage
- **Phase 4 (Polish):** 1-2 Tage

**Total: ~12-17 Tage** für ein Canva-Light Tool

---

*Analyse erstellt: 2026-01-29*  
*Review: Bestätigt durch Claude + Gemini*
