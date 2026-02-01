# QR-Styler Features - Technische Dokumentation

**Stand:** 20. Januar 2026  
**Version:** 2.0.0  
**Status:** Production Live

---

## 📋 Übersicht

Der QR-Styler wurde massiv erweitert von 4 auf **10 professionelle Templates** (+150%) mit individuellen SVG-Designs, Color Presets und Backend-Integration für Logo-Upload.

---

## 🎨 Templates (10)

### Bestehende Templates (4)
1. **Minimal Classic** - Zeitloser minimalistischer Stil
2. **Minimal Modern** - Modern und clean
3. **Minimal Floral** - Mit dezenten floralen Elementen
4. **Elegant Floral** - Elegante Blumenmuster

### Neue Templates (6)
5. **Elegant Gold** - Luxuriöses dunkles Design mit goldenen Akzenten
   - Hintergrund: `#1a1a1a` (Dunkel)
   - Text: `#f5f5f5` (Hell)
   - Accent: `#d4af37` (Gold)
   - Font: Playfair Display (Headline/Event Name)
   - Design: Goldene Linien und Kreise in den Ecken

6. **Botanical Green** - Naturnahes Design mit pflanzlichen Elementen
   - Hintergrund: `#e8f5e9` (Hellgrün)
   - Text: `#1b5e20` (Dunkelgrün)
   - Accent: `#2e7d32` (Mittelgrün)
   - Design: Organische Ellipsen und Blattformen

7. **Rustic Wood** - Warmes Holz-Design
   - Hintergrund: `#f5f1e8` (Beige)
   - Text: `#3e2723` (Dunkelbraun)
   - Accent: `#8d6e63` (Holzbraun)
   - Design: Doppelte Rahmen mit rustikalem Charakter

8. **Festive Celebration** - Lebendiges festliches Design
   - Hintergrund: `#fff8e1` (Cremeweiß)
   - Text: `#f57c00` (Orange)
   - Accent: `#ff6f00` (Leuchtendes Orange)
   - Design: Kreise, Dreiecke und festliche Akzente

9. **Modern Geometric** - Zeitgenössisches geometrisches Design
   - Hintergrund: `#ffffff` (Weiß)
   - Text: `#212121` (Anthrazit)
   - Accent: `#ff5722` (Deep Orange)
   - Design: Polygon-Rahmen mit diagonalen Linien

10. **Vintage Frame** - Klassischer Rahmen im Vintage-Stil
    - Hintergrund: `#f9f6f0` (Vintage Weiß)
    - Text: `#4a4a4a` (Grau)
    - Accent: `#8b7355` (Vintage Braun)
    - Design: Mehrfach-Rahmen mit Vintage-Ecken

---

## 🎨 Color Presets (10)

### Bestehende Presets (4)
1. **Classic Blue** - Professionell und vertrauenswürdig
2. **Forest Green** - Natürlich und beruhigend
3. **Rose Pink** - Elegant und freundlich
4. **Sunset Orange** - Warm und einladend

### Neue Presets (6)
5. **Luxury Gold** - Exklusiv und hochwertig
6. **Ocean Breeze** - Frisch und modern
7. **Lavender Dream** - Sanft und entspannt
8. **Midnight Blue** - Edel und elegant
9. **Coral Blush** - Warm und lebendig
10. **Sage Green** - Natürlich und harmonisch

---

## 📐 Format-Unterstützung

- **A6** (105mm × 148mm) - 1050 × 1480 px
- **A5** (148mm × 210mm) - 1480 × 2100 px

Für jedes Template existieren beide Formate als individuell angepasste SVG-Dateien.

---

## 🗂️ Dateistruktur

```
packages/frontend/public/qr-templates/
├── minimal-classic/
│   ├── A6.svg
│   └── A5.svg
├── minimal-modern/
│   ├── A6.svg
│   └── A5.svg
├── elegant-gold/      ← NEU
│   ├── A6.svg
│   └── A5.svg
├── botanical-green/   ← NEU
│   ├── A6.svg
│   └── A5.svg
├── rustic-wood/       ← NEU
│   ├── A6.svg
│   └── A5.svg
├── festive-celebration/ ← NEU
│   ├── A6.svg
│   └── A5.svg
├── modern-geometric/  ← NEU
│   ├── A6.svg
│   └── A5.svg
└── vintage-frame/     ← NEU
    ├── A6.svg
    └── A5.svg
```

**Total:** 20 SVG-Dateien (10 Templates × 2 Formate)

---

## 🔧 Template Defaults

Jedes Template hat individuell abgestimmte Standardtexte:

```typescript
function getDefaultsForTemplate(slug: string) {
  switch (slug) {
    case 'elegant-gold':
      return {
        headline: 'Exklusive Momente',
        subline: 'Eure unvergesslichen Aufnahmen',
        callToAction: 'Jetzt teilnehmen',
      };
    case 'botanical-green':
      return {
        headline: 'Natürliche Erinnerungen',
        subline: 'Fotos & Videos in voller Blüte',
        callToAction: 'Entdecken & Hochladen',
      };
    // ... weitere Templates
  }
}
```

---

## 🖼️ SVG Template Struktur

Alle Templates folgen diesem Schema:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="105mm" height="148mm" viewBox="0 0 1050 1480">
  <style>
    :root {
      --gf-bg: #ffffff;      /* Hintergrundfarbe */
      --gf-text: #1a1a1a;    /* Textfarbe */
      --gf-accent: #295B4D;  /* Akzentfarbe */
    }
    #gf\:bg { fill: var(--gf-bg); }
    .gf-text { fill: var(--gf-text); }
    .gf-accent { fill: var(--gf-accent); }
  </style>

  <rect id="gf:bg" x="0" y="0" width="1050" height="1480" />
  
  <!-- Template-spezifisches Design -->
  
  <text id="gf:text:headline" ... class="gf-text">...</text>
  <text id="gf:text:subline" ... class="gf-text">...</text>
  <text id="gf:text:eventName" ... class="gf-accent">...</text>
  <rect id="gf:qr" ... />
  <text id="gf:text:callToAction" ... class="gf-text">...</text>
  <text id="gf:text:website" ... class="gf-text">gästefotos.com</text>
</svg>
```

**Platzhalter-IDs:**
- `gf:bg` - Hintergrund
- `gf:text:headline` - Überschrift
- `gf:text:subline` - Unterüberschrift
- `gf:text:eventName` - Event-Name
- `gf:qr` - QR-Code Platzhalter
- `gf:text:callToAction` - Call-to-Action Text
- `gf:text:website` - Website (statisch)

---

## 🔌 Backend API

### Logo Upload
```http
POST /api/events/:id/qr/logo
Content-Type: multipart/form-data

{
  "logo": <File>  // PNG, JPG, SVG (max. 5MB)
}

Response:
{
  "logoUrl": "https://..."
}
```

### Logo Delete
```http
DELETE /api/events/:id/qr/logo

Response:
{
  "success": true
}
```

### PDF Export
```http
POST /api/events/:id/qr/export.pdf

{
  "format": "A6" | "A5",
  "svg": "<svg>...</svg>",
  "bleedMm": 0,
  "cropMarks": false,
  "marginMm": 6
}

Response: PDF Binary
```

**Berechtigungen:**
- Hosts: `bleedMm=0`, `cropMarks=false`, `marginMm=6` (fest)
- Admins: Volle Kontrolle über alle Parameter

---

## 💾 Datenbank (QrDesign Model)

```prisma
model QrDesign {
  id            String   @id @default(cuid())
  eventId       String   @unique
  event         Event    @relation(fields: [eventId], references: [id])
  
  templateSlug  String   @default("minimal-classic")
  format        String   @default("A6")
  
  headline      String?
  subline       String?
  eventName     String?
  callToAction  String?
  
  bgColor       String?
  textColor     String?
  accentColor   String?
  
  logoUrl       String?  // ← Logo Upload
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## 🎯 Features

### ✅ Implementiert
- 10 professionelle Templates mit individuellen Designs
- 10 Color Presets
- A5 & A6 Format Support
- Live Preview mit Echtzeit-Updates
- Auto-Save Konfiguration
- Custom Colors (Background, Text, Accent)
- Template-spezifische Defaults
- Backend Logo-Upload API
- PDF Export mit Drucker-Optionen

### 📋 Vorbereitet (nicht aktiv)
- ExportPanel Component (PNG/PDF Download)
- LogoUpload UI Component
- Logo-Einbindung in SVG Templates

---

## 🚀 Deployment

**Git Commits (letzte Session):**
```
e8069af 🚀 QR-Styler PRODUCTION LIVE: 10 Templates deployed & online
b7d17e9 ✅ QR-Styler PRODUCTION: 10 Templates vollständig LIVE
25795a7 🚀 QR-Styler PRODUCTION LIVE: 10 Templates erfolgreich deployed
26c10ce ✨ Template SVGs individualisiert: Elegant Gold & Botanical Green
7b470e5 ✨ Template SVGs individualisiert: Rustic Wood & Festive Celebration
a67e577 ✨ Template SVGs individualisiert: Modern Geometric & Vintage Frame
4f5f10a ✨ SVG Assets für 6 neue QR Templates
8a92e49 ✨ QR-Styler: 6 neue Templates (10 total) - Production Ready
```

**Status:** Production Live seit 20.01.2026

---

## 📊 Statistik

- **Templates:** 10 (vorher 4) → +150%
- **Color Presets:** 10 (vorher 4) → +150%
- **SVG Assets:** 20 Dateien individuell gestaltet
- **Backend Routes:** 3 neue Endpoints
- **Git Commits:** 20+ in dieser Session
- **Code Lines:** ~3000+ Zeilen (Templates + Logic)

---

## 🔜 Roadmap

1. **ExportPanel Integration** - PNG/PDF Download direkt im UI
2. **Logo Upload UI** - Frontend-Component aktivieren
3. **Logo in Templates** - Dynamische Einbindung in SVG
4. **Weitere Templates** - Seasonal, Corporate, Wedding
5. **Template-Kategorien** - Gruppierung nach Anlass
6. **Template-Preview** - Thumbnail-Galerie

---

**Dokumentiert von:** Cascade AI  
**Datum:** 20. Januar 2026  
**Version:** 1.0
