# QR-Designer V2: Konzept & Spezifikation

> **Ziel:** Ein Canva-inspirierter, adaptiver QR-Designer mit Mobile-First-Ansatz und progressiver Komplexität.

**Erstellt:** 30.01.2026  
**Status:** Konzeptphase  
**Inspiriert von:** Canva Mobile App

---

## Inhaltsverzeichnis

1. [Philosophie & Designprinzipien](#1-philosophie--designprinzipien)
2. [User-Personas & Flows](#2-user-personas--flows)
3. [Mobile UI-Spezifikation](#3-mobile-ui-spezifikation)
4. [Desktop UI-Spezifikation](#4-desktop-ui-spezifikation)
5. [Komponenten-Bibliothek](#5-komponenten-bibliothek)
6. [Feature-Roadmap](#6-feature-roadmap)
7. [Optimierungen](#7-optimierungen)
8. [Technische Architektur](#8-technische-architektur)

---

## 1. Philosophie & Designprinzipien

### 1.1 Kernphilosophie

> **"Jeder kann in 30 Sekunden einen professionellen QR-Code erstellen."**

Der QR-Designer folgt dem Prinzip der **progressiven Offenlegung** (Progressive Disclosure):
- Laien sehen nur das Wesentliche
- Profis können tiefer eintauchen
- Niemand wird überfordert

### 1.2 Designprinzipien

| Prinzip | Bedeutung | Umsetzung |
|---------|-----------|-----------|
| **Template-First** | Niemand startet bei Null | Fertige, professionelle Vorlagen |
| **WYSIWYG** | Was du siehst = was du bekommst | Canvas IST das Endprodukt |
| **Tap-to-Edit** | Direkte Manipulation | Texte auf dem Canvas antippen |
| **Mobile-First** | Touch ist primär | Daumen-freundliche Zonen |
| **Instant Gratification** | Sofortige Ergebnisse | Live-Preview, kein "Speichern" |
| **Zero Decisions** | Keine Entscheidungslähmung | Smarte Defaults überall |

### 1.3 Canva-Learnings

Was macht Canva stark?

1. **Full-Screen Canvas** - Design ist der Star, nicht die UI
2. **Kontextuelle Toolbars** - Tools erscheinen nur wenn relevant
3. **Bottom-Sheets** - Optionen schieben von unten (mobile-native)
4. **Floating Actions** - Aktionen schweben über dem Element
5. **Minimaler Chrome** - Header/Footer so klein wie möglich

---

## 2. User-Personas & Flows

### 2.1 Persona A: "Schnell-Fertig-Lisa" (80% der User)

**Profil:**
- Hochzeitsplanerin oder Gastgeber
- Will "einfach einen QR-Code"
- Technisch nicht versiert
- Nutzt hauptsächlich Smartphone

**Erwartung:**
- Template auswählen
- Namen eintippen
- Fertig in unter 1 Minute

**Flow:**
```
Template wählen → Text ändern → Download
     (10 Sek)      (20 Sek)      (5 Sek)
```

### 2.2 Persona B: "Detail-David" (20% der User)

**Profil:**
- Eventplaner oder Designer
- Will Corporate-Farben einhalten
- Interessiert an QR-Styles
- Nutzt oft Desktop

**Erwartung:**
- Volle Kontrolle über Farben
- QR-Code-Stil anpassen
- Druckfertige Exporte

**Flow:**
```
Template → Text → Erweitert → Farben → QR-Style → Export (PDF/SVG)
```

### 2.3 Adaptiver Flow (Ein System für beide)

```
                    ┌─────────────────┐
                    │  Template wählen │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Quick-Editor   │
                    │  (Texte ändern) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              │              ▼
     ┌────────────────┐      │     ┌────────────────┐
     │  "Fertig"      │      │     │  "Erweitert"   │
     │  → Export PNG  │      │     │  → Options     │
     └────────────────┘      │     └───────┬────────┘
                             │             │
         [Lisa ist hier]     │             ▼
                             │    ┌────────────────┐
                             │    │  Farben        │
                             │    │  QR-Style      │
                             │    │  Format        │
                             │    └───────┬────────┘
                             │            │
                             │            ▼
                             │   ┌────────────────┐
                             │   │  Export        │
                             │   │  PNG/PDF/SVG   │
                             │   └────────────────┘
                             │
                             │   [David ist hier]
```

---

## 3. Mobile UI-Spezifikation

### 3.1 Screen 1: Template-Auswahl

```
┌─────────────────────────────────────────┐
│  ←  QR-Code erstellen              ⟳   │  Header (56px)
├─────────────────────────────────────────┤
│                                         │
│  Für [Hochzeit ▾] empfohlen:            │  Smart-Filter
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │          │  │          │            │
│  │  ♥️       │  │  🌸      │            │
│  │  Minimal │  │  Floral  │            │  Grid 2-spaltig
│  │  Classic │  │  Rose    │            │  Aspect 3:4
│  │          │  │          │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │          │  │          │            │
│  │  ✨      │  │  🎉      │            │
│  │  Elegant │  │  Party   │            │
│  │  Gold    │  │  Confetti│            │
│  │          │  │          │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  Weitere Vorlagen                       │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │  Modern  │  │  Rustikal│            │
│  └──────────┘  └──────────┘            │
│                                         │
├─────────────────────────────────────────┤
│ [Alle] [Minimal] [Elegant] [Natur] →    │  Filter-Pills
└─────────────────────────────────────────┘  (horizontal scroll)
```

**Verhalten:**
- Smart-Filter: Basierend auf Event-Typ (falls bekannt)
- Lazy-Loading: Templates laden beim Scrollen
- Skeleton-Loading während Bilder laden

**Interaktionen:**
| Aktion | Ergebnis |
|--------|----------|
| Tap Template | → Screen 2 (Editor) |
| Filter-Pill | Templates filtern |
| Event-Type Dropdown | Smart-Empfehlungen ändern |

---

### 3.2 Screen 2: Quick-Editor (Canvas-Fokus)

```
┌─────────────────────────────────────────┐
│  ←                      [Erweitert ▾]   │  Header minimal
├─────────────────────────────────────────┤
│                                         │
│                                         │
│         ┌─────────────────────┐         │
│         │                     │         │
│         │   Unsere            │         │
│         │   Fotogalerie       │←─ Tap   │
│         │                     │         │
│         │   ─────────────     │         │
│         │                     │         │
│         │   Anna & Ben        │←─ Tap   │  CANVAS
│         │                     │         │  (Zentriert)
│         │      ┌─────┐        │         │  (70% Höhe)
│         │      │ QR  │        │         │
│         │      │     │        │         │
│         │      └─────┘        │         │
│         │                     │         │
│         │   QR scannen &      │←─ Tap   │
│         │   Fotos teilen      │         │
│         │                     │         │
│         └─────────────────────┘         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│          [ ✓ Fertig & Download ]        │  Primary CTA
│                                         │  (Fixed bottom)
└─────────────────────────────────────────┘
```

**Verhalten:**
- Canvas skaliert automatisch (fit-contain)
- Pinch-to-Zoom möglich
- Texte haben subtilen Hover/Focus-Indikator

**Interaktionen:**
| Aktion | Ergebnis |
|--------|----------|
| Tap auf Text | → Inline-Edit Mode |
| Tap "Erweitert" | → Bottom-Sheet Optionen |
| Tap "Fertig" | → Export-Sheet |
| Pinch | Zoom Canvas |
| Double-Tap | Reset Zoom |

---

### 3.3 Screen 2a: Inline Text-Editing

```
┌─────────────────────────────────────────┐
│  [Abbrechen]                   [Fertig] │
├─────────────────────────────────────────┤
│                                         │
│         ┌─────────────────────┐         │
│         │                     │         │
│         │   Unsere            │         │
│         │   Fotogalerie       │         │
│         │                     │         │
│         │   ─────────────     │         │
│         │   ┌───────────────┐ │         │
│         │   │ Anna & Ben  | │ │←─ Cursor│  Aktives Feld
│         │   └───────────────┘ │         │  hervorgehoben
│         │                     │         │
│         └─────────────────────┘         │
│                                         │
├─────────────────────────────────────────┤
│  Eventname                              │  Label
│  ┌─────────────────────────────────────┐│
│  │ Anna & Ben                        ⌫ ││  Input
│  └─────────────────────────────────────┘│
│                                         │
│  💡 Tipp: Kurze Namen wirken besser     │  Kontext-Tipp
│                                         │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │  Q W E R T Z U I O P               ││
│  │  A S D F G H J K L                 ││  Tastatur
│  │  ⇧ Y X C V B N M ⌫                 ││
│  │  123  🌐  ␣         ⏎              ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Verhalten:**
- Tastatur schiebt Content hoch
- Canvas scrollt zum aktiven Element
- Live-Update im Canvas während Tippen

---

### 3.4 Screen 2b: Erweiterte Optionen (Bottom-Sheet)

```
┌─────────────────────────────────────────┐
│         ┌─────────────────────┐         │
│         │   (Canvas dimmed)   │         │  Hintergrund
│         └─────────────────────┘         │  abgedunkelt
├─────────────────────────────────────────┤
│  ═══════════════════════════════════════│  Drag-Handle
│                                         │
│  📐 Format                              │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  │ A6 │ │ A5 │ │Stor│ │ □  │           │
│  │ ✓  │ │    │ │ y  │ │    │           │  Segmented
│  └────┘ └────┘ └────┘ └────┘           │
│                                         │
│  ───────────────────────────────────────│
│                                         │
│  🎨 Farben                              │
│                                         │
│  Hintergrund      Text         Akzent   │
│  ┌────────┐    ┌────────┐   ┌────────┐ │
│  │ ██████ │    │ ██████ │   │ ██████ │ │  Color-Chips
│  │ #FFFFFF│    │ #1A1A1A│   │ #295B4D│ │
│  └────────┘    └────────┘   └────────┘ │
│                                         │
│  ───────────────────────────────────────│
│                                         │
│  ▣ QR-Code Stil                         │
│                                         │
│  ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐         │
│  │▪▪│  │••│  │○○│  │◐◐│  │◧◧│         │  Visual Picker
│  │▪▪│  │••│  │○○│  │◐◐│  │◧◧│         │
│  └──┘  └──┘  └──┘  └──┘  └──┘         │
│   ↑                                     │
│  Ausgewählt                             │
│                                         │
│           [ Übernehmen ]                │  CTA
│                                         │
└─────────────────────────────────────────┘
```

**Sheet-Verhalten:**
- 3 Zustände: Collapsed (0%), Half (50%), Full (90%)
- Wischen zum Navigieren
- Backdrop-Tap schließt Sheet
- Live-Preview bei jeder Änderung

---

### 3.5 Screen 3: Export (Bottom-Sheet)

```
┌─────────────────────────────────────────┐
│         ┌─────────────────────┐         │
│         │  (Fertiges Design)  │         │
│         └─────────────────────┘         │
├─────────────────────────────────────────┤
│  ═══════════════════════════════════════│
│                                         │
│  📥 Dein QR-Code ist fertig!            │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  📱  PNG für Digital                ││
│  │      WhatsApp, E-Mail, Website      ││  Primär
│  │                          [Download] ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  🖨️  PDF für Druck                  ││
│  │      Hochauflösend, Druckerei-ready ││
│  │                          [Download] ││
│  └─────────────────────────────────────┘│
│                                         │
│  ───────────────────────────────────────│
│                                         │
│  Profi-Optionen                      ▾  │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  📐 SVG (Vektor)                    ││
│  │  🔲 Mit Beschnitt (3mm)             ││  Collapsed
│  │  ✂️ Mit Schnittmarken               ││  by default
│  └─────────────────────────────────────┘│
│                                         │
│  ───────────────────────────────────────│
│                                         │
│  📤 Oder direkt teilen:                 │
│                                         │
│  [WhatsApp] [E-Mail] [Mehr...]          │  Share-Buttons
│                                         │
└─────────────────────────────────────────┘
```

---

## 4. Desktop UI-Spezifikation

### 4.1 Layout-Konzept

Desktop nutzt den zusätzlichen Platz für eine **Side-by-Side-Ansicht**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ←  QR-Designer                                    Angemeldet als: Max  👤 │
├────────────────────────────────────────────────────────────────────────────┤
│                              │                                             │
│   SIDEBAR (320px)            │              CANVAS (flex-1)                │
│                              │                                             │
│   ┌────────────────────────┐ │                                             │
│   │ 📋 Template            │ │         ┌─────────────────────┐             │
│   └────────────────────────┘ │         │                     │             │
│   ┌─────┐ ┌─────┐ ┌─────┐   │         │   Unsere            │             │
│   │     │ │     │ │     │   │         │   Fotogalerie       │             │
│   │ Min │ │ Flo │ │ Ele │   │         │                     │             │
│   └─────┘ └─────┘ └─────┘   │         │   ─────────────     │             │
│                              │         │                     │             │
│   ┌────────────────────────┐ │         │   Anna & Ben        │             │
│   │ ✏️ Texte               │ │         │                     │             │
│   └────────────────────────┘ │         │      ┌─────┐        │             │
│   Headline                   │         │      │ QR  │        │             │
│   [Unsere Fotogalerie    ]   │         │      └─────┘        │             │
│                              │         │                     │             │
│   Subline                    │         │   QR scannen &      │             │
│   [Teilt eure Momente    ]   │         │   Fotos teilen      │             │
│                              │         │                     │             │
│   Eventname                  │         └─────────────────────┘             │
│   [Anna & Ben            ]   │                                             │
│                              │              [Desktop] [Mobile]             │
│   ┌────────────────────────┐ │                                             │
│   │ 🎨 Farben              │ │                                             │
│   └────────────────────────┘ │                                             │
│   Hintergrund [████] #FFF    │                                             │
│   Text        [████] #1A1    │                                             │
│   Akzent      [████] #295    │                                             │
│                              │                                             │
│   ┌────────────────────────┐ │                                             │
│   │ ▣ QR-Style             │ │                                             │
│   └────────────────────────┘ │                                             │
│   [■] [●] [○] [◐] [◧]       │                                             │
│                              │                                             │
├──────────────────────────────┼─────────────────────────────────────────────┤
│                              │    [PNG Download]  [PDF Download]  [Mehr ▾] │
└──────────────────────────────┴─────────────────────────────────────────────┘
```

### 4.2 Desktop-spezifische Features

| Feature | Beschreibung |
|---------|--------------|
| **Keyboard Shortcuts** | Ctrl+Z Undo, Ctrl+S Save, Ctrl+E Export |
| **Preview Toggle** | Desktop/Mobile-Vorschau umschalten |
| **Drag & Drop** | Template-Elemente verschieben (Phase 2) |
| **Multi-Select** | Shift+Click für mehrere Elemente |
| **Zoom-Controls** | +/- Buttons, Scroll-Zoom |
| **Split-View** | Sidebar + Canvas nebeneinander |

### 4.3 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| < 640px (sm) | Mobile: Full-Screen Canvas + Bottom-Sheets |
| 640-1024px (md) | Tablet: Collapsible Sidebar + Canvas |
| > 1024px (lg) | Desktop: Fixed Sidebar + Canvas |

### 4.4 Desktop Sidebar-Akkordeon

```
┌────────────────────────────────────┐
│  📋 Template                    ▾  │  ← Expanded
├────────────────────────────────────┤
│  [Alle] [Minimal] [Elegant] →      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │    │ │    │ │    │ │    │      │
│  └────┘ └────┘ └────┘ └────┘      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │    │ │    │ │    │ │    │      │
│  └────┘ └────┘ └────┘ └────┘      │
└────────────────────────────────────┘
│  ✏️ Texte                       ▸  │  ← Collapsed
│  🎨 Farben                      ▸  │
│  ▣ QR-Style                     ▸  │
│  📐 Format                      ▸  │
│  📥 Export                      ▸  │
└────────────────────────────────────┘
```

---

## 5. Komponenten-Bibliothek

### 5.1 Neue Komponenten benötigt

| Komponente | Beschreibung | Priorität |
|------------|--------------|-----------|
| `<BottomSheet>` | Swipeable Sheet von unten | P0 |
| `<CanvasPreview>` | Zentrierter, skalierbarer Canvas | P0 |
| `<InlineTextEditor>` | Text direkt auf Canvas editieren | P0 |
| `<ColorChip>` | Farbauswahl mit Picker | P1 |
| `<QRStylePicker>` | Visueller QR-Stil Selector | P1 |
| `<FormatSelector>` | Segmented Control für Formate | P1 |
| `<TemplateGrid>` | Lazy-Loading Template-Grid | P1 |
| `<ExportSheet>` | Export-Optionen Sheet | P1 |
| `<Accordion>` | Desktop Sidebar Sections | P2 |

### 5.2 Bestehende Komponenten wiederverwenden

- `<StyledQRCode>` - QR-Code Rendering
- `<Button>` - Buttons aus UI-Kit
- `<Input>` - Text-Inputs
- Motion-Komponenten aus framer-motion

---

## 6. Feature-Roadmap

### 6.1 Phase 1: MVP (Aktuell → Fix)

**Ziel:** Funktionierender Quick-Flow für Laien

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Template-Auswahl | ✅ Existiert | Grid mit Templates |
| Text-Editing | ⚠️ Buggy | Sidebar-basiert, sollte Inline sein |
| Farben | ✅ Existiert | Color-Picker in Sidebar |
| QR-Style | ✅ Existiert | Dot/Corner Style |
| Export PNG | ✅ Existiert | Basic PNG Download |
| Export PDF | ✅ Existiert | Basic PDF Download |
| **Layout-Fix** | 🔴 Needed | Canvas abgeschnitten |
| **Mobile UX** | 🔴 Needed | Bottom-Sheets statt Sidebar |

### 6.2 Phase 2: Polish

| Feature | Beschreibung |
|---------|--------------|
| Inline Text-Editing | Tap auf Canvas zum Bearbeiten |
| Pinch-to-Zoom | Canvas zoomen auf Mobile |
| Undo/Redo | History mit Ctrl+Z |
| Keyboard Shortcuts | Desktop Power-User |
| Template-Favoriten | ♥️ für schnellen Zugriff |
| Zuletzt verwendet | Letzte Designs oben |

### 6.3 Phase 3: Delight

| Feature | Beschreibung |
|---------|--------------|
| Template-Preview Animation | Smooth Transition beim Wechsel |
| AI Text-Vorschläge | "Für Hochzeit: 'Teilt eure Momente'" |
| Brand-Kit | Gespeicherte Firmenfarben |
| Social Sharing | Direkt teilen zu WhatsApp/Instagram |
| QR-Code Animation | Animierter QR-Code (GIF/Video) |
| Collaboration | Link teilen zum gemeinsamen Bearbeiten |

### 6.4 Phase 4: Advanced

| Feature | Beschreibung |
|---------|--------------|
| Custom Templates | Eigene Templates hochladen |
| Element-Editor | Elemente frei positionieren |
| Foto-Upload | Hintergrundbild einfügen |
| Multi-Page | Mehrere Seiten/Designs |
| Print-Bestellung | Direkt drucken lassen |
| White-Label | Branding entfernen (Premium) |

---

## 7. Optimierungen

### 7.1 Performance

| Optimierung | Beschreibung | Priorität |
|-------------|--------------|-----------|
| **SVG Lazy-Loading** | Templates erst bei Sichtbarkeit laden | P0 |
| **Image Optimization** | WebP, responsive srcset | P1 |
| **Code Splitting** | Editor-Bundle separat laden | P1 |
| **Service Worker** | Templates offline cachen | P2 |
| **Canvas Virtualization** | Nur sichtbare Elemente rendern | P2 |

### 7.2 UX-Optimierungen

| Optimierung | Beschreibung |
|-------------|--------------|
| **Skeleton Loading** | Placeholder während Laden |
| **Optimistic Updates** | UI sofort aktualisieren, dann speichern |
| **Debounced Autosave** | Änderungen nach 1s automatisch speichern |
| **Error Recovery** | Bei Fehler: "Erneut versuchen" statt Crash |
| **Offline-Modus** | Warnung wenn offline, Queue für Sync |

### 7.3 Accessibility (a11y)

| Optimierung | Beschreibung |
|-------------|--------------|
| **Keyboard Navigation** | Tab durch alle Elemente |
| **Screen Reader** | ARIA Labels für alle Aktionen |
| **Contrast Check** | Warnung bei schlechtem Kontrast |
| **Focus Indicators** | Sichtbarer Fokus-Ring |
| **Reduced Motion** | Animationen respektieren OS-Setting |

### 7.4 SEO & Sharing

| Optimierung | Beschreibung |
|-------------|--------------|
| **OG-Image** | Generiertes Preview-Bild für Links |
| **Structured Data** | Schema.org für Event |
| **Deep Links** | Direktlinks zu Designs |

---

## 8. Technische Architektur

### 8.1 State Management

```typescript
interface QRDesignerState {
  // Design State
  design: {
    templateSlug: string;
    format: 'A6' | 'A5' | 'story' | 'square';
    texts: {
      headline: string;
      subline: string;
      eventName: string;
      callToAction: string;
    };
    colors: {
      background: string;
      text: string;
      accent: string;
    };
    qrStyle: {
      dotStyle: 'square' | 'rounded' | 'dots';
      cornerStyle: 'square' | 'extra-rounded' | 'dot';
    };
  };
  
  // UI State
  ui: {
    activeSheet: 'none' | 'options' | 'export';
    activeTextField: string | null;
    previewMode: 'desktop' | 'mobile';
    zoom: number;
  };
  
  // History
  history: Design[];
  historyIndex: number;
}
```

### 8.2 Komponenten-Hierarchie

```
<QRDesignerPage>
  ├── <TemplateSelection>         // Screen 1
  │     ├── <TemplateGrid>
  │     └── <FilterPills>
  │
  ├── <QuickEditor>               // Screen 2
  │     ├── <Header>
  │     │     ├── <BackButton>
  │     │     └── <AdvancedToggle>
  │     │
  │     ├── <CanvasPreview>
  │     │     ├── <SVGRenderer>
  │     │     ├── <QROverlay>
  │     │     └── <InlineTextEditor>
  │     │
  │     ├── <BottomCTA>
  │     │
  │     ├── <OptionsSheet>        // Bottom Sheet
  │     │     ├── <FormatSelector>
  │     │     ├── <ColorPicker>
  │     │     └── <QRStylePicker>
  │     │
  │     └── <ExportSheet>         // Bottom Sheet
  │           ├── <ExportOption>
  │           └── <ShareButtons>
  │
  └── <DesktopSidebar>            // Only lg+
        ├── <Accordion section="template">
        ├── <Accordion section="texts">
        ├── <Accordion section="colors">
        ├── <Accordion section="qr-style">
        └── <Accordion section="export">
```

### 8.3 API-Endpunkte (Bestehend)

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/events/:id` | GET | Event-Daten laden |
| `/api/events/:id/qr/config` | PUT | Design speichern |
| `/api/events/:id/qr/export.png` | POST | PNG exportieren |
| `/api/events/:id/qr/export.pdf` | POST | PDF exportieren |

### 8.4 File-Struktur (Vorgeschlagen)

```
packages/frontend/src/app/events/[id]/qr-styler/
├── page.tsx                      # Haupt-Entry (Router)
├── components/
│   ├── TemplateSelection.tsx
│   ├── QuickEditor.tsx
│   ├── CanvasPreview.tsx
│   ├── InlineTextEditor.tsx
│   ├── BottomSheet.tsx
│   ├── OptionsSheet.tsx
│   ├── ExportSheet.tsx
│   ├── DesktopSidebar.tsx
│   ├── FormatSelector.tsx
│   ├── ColorPicker.tsx
│   └── QRStylePicker.tsx
├── hooks/
│   ├── useDesignState.ts         # State + History
│   ├── useAutoSave.ts
│   └── useExport.ts
├── utils/
│   ├── svg-utils.ts
│   └── export-utils.ts
└── types.ts
```

---

## 9. Nächste Schritte

### Sofort (Bug-Fixes)

1. ☐ Canvas-Clipping Fix (Vorschau abgeschnitten)
2. ☐ React Hydration Error beheben
3. ☐ Mobile Layout verbessern

### Kurzfristig (1-2 Wochen)

4. ☐ Bottom-Sheet Komponente bauen
5. ☐ Mobile Quick-Editor implementieren
6. ☐ Inline Text-Editing

### Mittelfristig (1 Monat)

7. ☐ Desktop Sidebar-Layout
8. ☐ Undo/Redo
9. ☐ Template-Favoriten

---

## 10. Entscheidungen (Geklärt)

- [x] **Progressive Disclosure** - Kein Profi-Modus Toggle, Komplexität nur bei Bedarf
- [x] **Templates:** Minimal Classic, Clean, Floral, Elegant Gold, Party Confetti, Corporate Clean
- [x] **Speicherung:** Nur lokal (localStorage + Server beim Export)
- [x] **Premium:** Branding-Entfernung nur im teuersten Paket

---

## 11. Admin Template-Management

### 11.1 Anforderung

> Admin muss neue Templates hinzufügen können ohne Code-Deployment.

### 11.2 Admin-UI Konzept

```
┌────────────────────────────────────────────────────────────────┐
│  Admin Dashboard > QR-Templates                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [+ Neues Template]                              [Sortierung ▾]│
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  📄 Minimal Classic                                      │ │
│  │  Kategorie: Minimal | Formate: A6, A5, Story, Square     │ │
│  │  Status: ✅ Aktiv                      [Bearbeiten] [🗑️] │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  📄 Floral Rose                                          │ │
│  │  Kategorie: Hochzeit | Formate: A6, A5                   │ │
│  │  Status: ✅ Aktiv                      [Bearbeiten] [🗑️] │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 11.3 Template-Upload Flow

```
┌────────────────────────────────────────────────────────────────┐
│  Neues Template erstellen                                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Template-Name *                                               │
│  [Elegant Gold                                              ]  │
│                                                                │
│  Slug (URL-freundlich) *                                       │
│  [elegant-gold                                              ]  │
│                                                                │
│  Kategorie *                                                   │
│  [Elegant ▾]                                                   │
│                                                                │
│  Event-Typen (für Smart-Empfehlungen)                          │
│  [x] Hochzeit  [x] Jubiläum  [ ] Geburtstag  [ ] Business      │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  SVG-Dateien hochladen *                                       │
│                                                                │
│  A6 (Pflicht)     [elegant-gold-A6.svg        ] [📤 Upload]   │
│  A5              [elegant-gold-A5.svg        ] [📤 Upload]    │
│  Story           [                           ] [📤 Upload]    │
│  Square          [                           ] [📤 Upload]    │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  Vorschau-Bild (für Template-Grid)                             │
│  [                                           ] [📤 Upload]    │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  Standard-Farben                                               │
│  Hintergrund [████] #FFFFFF                                    │
│  Text        [████] #1A1A1A                                    │
│  Akzent      [████] #D4AF37                                    │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  Status                                                        │
│  (○) Entwurf  (●) Aktiv  (○) Archiviert                       │
│                                                                │
│                           [Abbrechen]  [Template speichern]    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 11.4 SVG-Anforderungen für Templates

Templates müssen bestimmte Konventionen einhalten:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 1480">
  <style>
    :root {
      --gf-bg: #ffffff;      /* Wird durch User-Auswahl ersetzt */
      --gf-text: #1a1a1a;    /* Wird durch User-Auswahl ersetzt */
      --gf-accent: #295B4D;  /* Wird durch User-Auswahl ersetzt */
    }
  </style>

  <!-- Hintergrund -->
  <rect id="gf:bg" ... />

  <!-- Editierbare Texte -->
  <text id="gf:text:headline">...</text>
  <text id="gf:text:subline">...</text>
  <text id="gf:text:eventName">...</text>
  <text id="gf:text:callToAction">...</text>

  <!-- QR-Code Platzhalter -->
  <rect id="gf:qr" x="..." y="..." width="260" height="260" />

  <!-- Branding (wird bei Premium entfernt) -->
  <g id="gf:branding">
    <text>gästefotos.com</text>
  </g>
</svg>
```

**Pflicht-IDs:**
| ID | Beschreibung |
|----|--------------|
| `gf:bg` | Hintergrund-Element |
| `gf:text:headline` | Hauptüberschrift |
| `gf:text:eventName` | Event-Name |
| `gf:qr` | QR-Code Platzhalter (Position + Größe) |

**Optionale IDs:**
| ID | Beschreibung |
|----|--------------|
| `gf:text:subline` | Untertitel |
| `gf:text:callToAction` | Call-to-Action |
| `gf:branding` | Branding-Gruppe (für Premium-Entfernung) |

### 11.5 Template-Validierung

Beim Upload prüft das System:

1. ✅ Valides SVG
2. ✅ `gf:bg` vorhanden
3. ✅ `gf:text:headline` vorhanden
4. ✅ `gf:text:eventName` vorhanden
5. ✅ `gf:qr` vorhanden mit width/height
6. ✅ CSS-Variablen `--gf-bg`, `--gf-text`, `--gf-accent` definiert
7. ⚠️ Warnung wenn optionale IDs fehlen

### 11.6 Datenbank-Schema

```prisma
model QrTemplate {
  id          String   @id @default(uuid())
  slug        String   @unique
  name        String
  category    String   // 'minimal' | 'elegant' | 'natural' | 'festive' | 'modern'
  eventTypes  String[] // ['wedding', 'birthday', 'corporate', ...]
  
  // SVG-Dateien (S3/R2 URLs)
  svgA6       String   // Pflicht
  svgA5       String?
  svgStory    String?
  svgSquare   String?
  
  // Vorschau
  previewUrl  String?
  
  // Standard-Farben
  defaultBg     String  @default("#ffffff")
  defaultText   String  @default("#1a1a1a")
  defaultAccent String  @default("#295B4D")
  
  // Status
  status      String   @default("draft") // 'draft' | 'active' | 'archived'
  sortOrder   Int      @default(0)
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 11.7 API-Endpunkte (Admin)

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/admin/qr-templates` | GET | Alle Templates listen |
| `/api/admin/qr-templates` | POST | Neues Template erstellen |
| `/api/admin/qr-templates/:id` | PUT | Template bearbeiten |
| `/api/admin/qr-templates/:id` | DELETE | Template löschen |
| `/api/admin/qr-templates/:id/upload` | POST | SVG-Datei hochladen |
| `/api/admin/qr-templates/:id/validate` | POST | SVG validieren |

### 11.8 Public API (für Frontend)

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/qr-templates` | GET | Aktive Templates für User |
| `/api/qr-templates/:slug` | GET | Einzelnes Template mit SVG |

---

## 12. Canva/SVG-Import: Intelligenter Konverter

### 12.1 Problemstellung

Templates manuell zu erstellen ist aufwendig. Canva hat tausende schöne Vorlagen, aber keine API zum direkten Import. 

**Lösung:** Ein intelligenter Konverter der beliebige SVGs (aus Canva, Figma, Illustrator) analysiert und in unser Format umwandelt.

### 12.2 Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Designer       │     │   Export        │     │  Admin-Upload   │
│  erstellt in    │ ──► │   als SVG       │ ──► │  mit Konverter  │
│  Canva/Figma    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Konverter      │
                                               │  analysiert &   │
                                               │  fügt IDs hinzu │
                                               └─────────────────┘
```

### 12.3 Admin-UI: Import-Wizard

```
┌────────────────────────────────────────────────────────────────┐
│  Admin Dashboard > Template-Import                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  📤 SVG hochladen (Canva, Figma, Illustrator, etc.)            │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                                                        │   │
│  │     [canva-export.svg] hierher ziehen                  │   │
│  │            oder klicken zum Auswählen                  │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘

                              ▼ Nach Upload

┌────────────────────────────────────────────────────────────────┐
│  🔍 Analyse-Ergebnis                                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐  ┌────────────────────────────────┐  │
│  │                     │  │                                │  │
│  │   [SVG-Vorschau]    │  │  ERKANNTE ELEMENTE             │  │
│  │                     │  │                                │  │
│  │   Unsere            │  │  📝 Texte                      │  │
│  │   Hochzeit          │  │  ┌────────────────────────────┐│  │
│  │   ─────────         │  │  │ "Unsere Hochzeit"          ││  │
│  │   Anna & Ben        │  │  │ Größe: 72px, oben          ││  │
│  │                     │  │  │ Zuweisung: [Headline ▾]    ││  │
│  │      ┌────┐         │  │  └────────────────────────────┘│  │
│  │      │ QR │         │  │  ┌────────────────────────────┐│  │
│  │      └────┘         │  │  │ "Anna & Ben"               ││  │
│  │                     │  │  │ Größe: 48px, mitte         ││  │
│  │   Scannt mich!      │  │  │ Zuweisung: [Event-Name ▾]  ││  │
│  │                     │  │  └────────────────────────────┘│  │
│  └─────────────────────┘  │  ┌────────────────────────────┐│  │
│                           │  │ "Scannt mich!"             ││  │
│                           │  │ Größe: 32px, unten         ││  │
│                           │  │ Zuweisung: [Call-to-Action]││  │
│                           │  └────────────────────────────┘│  │
│                           │                                │  │
│                           │  ▢ QR-Platzhalter              │  │
│                           │  ┌────────────────────────────┐│  │
│                           │  │ Rechteck 260x260 (mitte)   ││  │
│                           │  │ ✅ Als QR-Position erkannt ││  │
│                           │  └────────────────────────────┘│  │
│                           │                                │  │
│                           │  🎨 Farben                     │  │
│                           │  ┌────────────────────────────┐│  │
│                           │  │ ████ #FFFFFF → Hintergrund ││  │
│                           │  │ ████ #1A1A1A → Text        ││  │
│                           │  │ ████ #D4AF37 → Akzent      ││  │
│                           │  └────────────────────────────┘│  │
│                           └────────────────────────────────┘  │
│                                                                │
│  ───────────────────────────────────────────────────────────  │
│                                                                │
│  Template-Details                                              │
│  Name:      [Elegante Hochzeit                            ]   │
│  Slug:      [elegante-hochzeit                            ]   │
│  Kategorie: [Hochzeit ▾]                                      │
│                                                                │
│                      [Vorschau]  [Konvertieren & Speichern]   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 12.4 Konverter-Algorithmus

#### Schritt 1: SVG Parsing

```typescript
interface ParsedSVG {
  viewBox: { width: number; height: number };
  elements: SVGElement[];
}

interface SVGElement {
  type: 'text' | 'rect' | 'path' | 'image' | 'g';
  id?: string;
  content?: string;      // Für Text
  position: { x: number; y: number };
  size?: { width: number; height: number };
  styles: {
    fill?: string;
    stroke?: string;
    fontSize?: number;
    fontFamily?: string;
  };
}
```

#### Schritt 2: Element-Analyse

```typescript
interface AnalysisResult {
  texts: TextAnalysis[];
  rectangles: RectAnalysis[];
  colors: ColorAnalysis[];
  suggestions: Suggestions;
}

interface TextAnalysis {
  element: SVGElement;
  content: string;
  fontSize: number;
  relativePosition: 'top' | 'middle' | 'bottom';
  suggestedRole: TextRole;
  confidence: number;  // 0-1
}

type TextRole = 'headline' | 'subline' | 'eventName' | 'callToAction' | 'branding' | 'ignore';
```

#### Schritt 3: Heuristiken für automatische Erkennung

| Element | Heuristik | Confidence |
|---------|-----------|------------|
| **Headline** | Größter Text + obere 40% | 0.9 |
| **Subline** | Zweitgrößter Text + unter Headline | 0.7 |
| **Event-Name** | Text mit 2-3 Wörtern + Mitte | 0.6 |
| **Call-to-Action** | Text unter QR + enthält "scan/QR" | 0.8 |
| **QR-Platzhalter** | Quadrat (±10%) + 150-400px + Mitte | 0.95 |
| **Hintergrund** | Größtes Rect + deckt >80% ab | 0.95 |
| **Branding** | Text mit "gästefotos" oder klein + unten | 0.9 |

#### Schritt 4: SVG Transformation

```typescript
function convertToTemplate(svg: string, mappings: ElementMappings): string {
  const doc = parseSVG(svg);
  
  // 1. CSS-Variablen injizieren
  injectCSSVariables(doc, mappings.colors);
  
  // 2. IDs zu Elementen hinzufügen
  for (const [elementId, role] of Object.entries(mappings.texts)) {
    const el = doc.getElementById(elementId);
    el.id = `gf:text:${role}`;
    el.classList.add(role === 'eventName' ? 'gf-accent' : 'gf-text');
  }
  
  // 3. QR-Platzhalter markieren
  const qrRect = doc.getElementById(mappings.qrElement);
  qrRect.id = 'gf:qr';
  
  // 4. Hintergrund markieren
  const bgRect = doc.getElementById(mappings.background);
  bgRect.id = 'gf:bg';
  
  // 5. Branding-Gruppe erstellen (falls vorhanden)
  if (mappings.branding) {
    wrapInGroup(doc, mappings.branding, 'gf:branding');
  }
  
  return serializeSVG(doc);
}
```

### 12.5 Farb-Extraktion & Mapping

```typescript
function extractColors(svg: ParsedSVG): ColorAnalysis[] {
  const colorMap = new Map<string, ColorUsage>();
  
  for (const el of svg.elements) {
    if (el.styles.fill) {
      trackColor(colorMap, el.styles.fill, 'fill', el.type);
    }
    if (el.styles.stroke) {
      trackColor(colorMap, el.styles.stroke, 'stroke', el.type);
    }
  }
  
  // Sortieren nach Häufigkeit
  return Array.from(colorMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([hex, usage]) => ({
      hex,
      suggestedRole: guessColorRole(hex, usage),
      confidence: calculateConfidence(usage),
    }));
}

function guessColorRole(hex: string, usage: ColorUsage): ColorRole {
  // Weiß/Hellgrau → Hintergrund
  if (isLight(hex) && usage.usedIn.includes('rect')) return 'background';
  
  // Dunkel + Text → Textfarbe
  if (isDark(hex) && usage.usedIn.includes('text')) return 'text';
  
  // Bunt + nicht häufigste → Akzent
  if (isSaturated(hex)) return 'accent';
  
  return 'other';
}
```

### 12.6 API-Endpunkte

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/admin/import/analyze` | POST | SVG hochladen & analysieren |
| `/api/admin/import/preview` | POST | Konvertierte Vorschau generieren |
| `/api/admin/import/convert` | POST | SVG konvertieren & speichern |

**Request: Analyze**
```json
{
  "svg": "<svg>...</svg>"
}
```

**Response: Analyze**
```json
{
  "success": true,
  "analysis": {
    "texts": [
      {
        "id": "text-1",
        "content": "Unsere Hochzeit",
        "fontSize": 72,
        "position": "top",
        "suggestedRole": "headline",
        "confidence": 0.92
      }
    ],
    "rectangles": [
      {
        "id": "rect-5",
        "size": { "width": 260, "height": 260 },
        "isQRCandidate": true,
        "confidence": 0.95
      }
    ],
    "colors": [
      { "hex": "#FFFFFF", "suggestedRole": "background", "confidence": 0.98 },
      { "hex": "#1A1A1A", "suggestedRole": "text", "confidence": 0.95 },
      { "hex": "#D4AF37", "suggestedRole": "accent", "confidence": 0.87 }
    ]
  }
}
```

### 12.7 Vorteile dieser Lösung

| Vorteil | Beschreibung |
|---------|--------------|
| **Keine API-Abhängigkeit** | Funktioniert mit jedem SVG-Export |
| **Multi-Source** | Canva, Figma, Illustrator, Sketch, etc. |
| **Semi-automatisch** | KI hilft, Mensch bestätigt |
| **Lernfähig** | Mappings können als Training-Daten dienen |
| **Rechtlich sicher** | User exportiert eigene/lizenzierte Designs |
| **Schnell** | Statt 30 Min manuell → 2 Min mit Konverter |

### 12.8 Einschränkungen

| Einschränkung | Workaround |
|---------------|------------|
| Raster-Bilder in SVG | Warnung anzeigen, User muss entscheiden |
| Sehr komplexe SVGs | Manuelle Zuweisung ermöglichen |
| Fonts nicht eingebettet | System-Fonts als Fallback |
| Animationen | Werden ignoriert |

### 12.9 Zukünftige Erweiterungen

1. **ML-basierte Erkennung** - Trainiertes Modell für bessere Zuweisungen
2. **Batch-Import** - Mehrere SVGs auf einmal konvertieren
3. **Template-Varianten** - Automatisch A6/A5/Story aus einem SVG generieren
4. **Canva-Plugin** - Direkter Export-Button in Canva (falls API erlaubt)

---

**Dokument-Ende**

*Erstellt: 30.01.2026 | Autor: Cascade | Version: 1.0*
