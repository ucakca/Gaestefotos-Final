# QR-Templates (SVG) – Spezifikation & Erstellung

Dieses Dokument beschreibt, wie wir druckfertige, editierbare QR-Aufsteller-Templates (ähnlich Everlense) als **SVG** bauen, sodass sie im QR‑Styler bearbeitet und als **PDF/PNG (A6/A5)** exportiert werden können.

## Ziel (MVP)

- Templates sind **SVG** (Vektor) mit definierten **Platzhaltern**.
- Editierbar im QR‑Styler:
  - `headline`
  - `subline`
  - `eventName`
  - `callToAction`
  - Farben (Background/Text/Accent)
- QR ist **fix** in einem Platzhalter (`gf:qr`) (einfach & robust).
- Export: **A6** und **A5** (Print) als **PNG** und **PDF**.

## Grundprinzip

Ein Template ist eine normale SVG-Datei mit ein paar **verbindlichen IDs** und optionalen Klassen. Die App:

- findet Elemente über IDs wie `gf:text:headline`
- ersetzt Inhalte (Text) und Styles (Farben)
- rendert den QR-Code in das definierte Rechteck `gf:qr`

## Größen / Formate

Wir führen Templates pro Format.

- A6: 105 × 148 mm
- A5: 148 × 210 mm

Empfohlene SVG-Attribute:

- `width="105mm" height="148mm"` (bzw. A5)
- `viewBox="0 0 1050 1480"` (bzw. `0 0 1480 2100`)

Warum so?

- Designer arbeiten pixel-/unit-basiert (einfaches Positionieren)
- Export kann mit 10x‑Skalierung (mm*10) sauber auf Print gemappt werden

## Pflicht-Elemente (IDs)

### QR Platzhalter (fix)

Ein Rechteck oder eine Gruppe, die den QR‑Bereich definiert.

- **Pflicht:** `id="gf:qr"`
- Empfehlung: `rect` (am einfachsten)

Beispiel:

```xml
<rect id="gf:qr" x="420" y="980" width="210" height="210" rx="12" />
```

Regeln:

- Der QR wird **zentriert** in diesem Rechteck gerendert.
- `width`/`height` definieren die Zielgröße.

### Textfelder (editierbar)

Pflicht-IDs:

- `id="gf:text:headline"`
- `id="gf:text:subline"`
- `id="gf:text:eventName"`
- `id="gf:text:callToAction"`

Beispiel:

```xml
<text id="gf:text:headline" x="525" y="340" text-anchor="middle">Unsere Fotogalerie</text>
<text id="gf:text:subline" x="525" y="410" text-anchor="middle">Scannen & hochladen</text>
<text id="gf:text:eventName" x="525" y="460" text-anchor="middle">Anna & Ben</text>
<text id="gf:text:callToAction" x="525" y="860" text-anchor="middle">QR-Code scannen & los geht’s</text>
```

Text-Regeln (MVP):

- Text soll **Text** bleiben (nicht in Pfade umwandeln).
- `text-anchor="middle"` ist empfohlen für zentriertes Layout.
- Mehrzeiligkeit: fürs MVP vermeiden (einzeilig). Falls nötig später über `<tspan>`.

## Farben (CSS Custom Properties)

Wir steuern Farben über CSS‑Variablen, damit der Editor nur 3–4 Werte ändern muss.

Pflicht (in `<style>`):

- `--gf-bg`
- `--gf-text`
- `--gf-accent`

Empfohlene Konvention:

- Hintergrund-Shape: `id="gf:bg"`
- Akzent-Shapes: `class="gf-accent"`
- Text: `class="gf-text"` (optional; IDs reichen, aber Klassen machen es einfacher)

Beispiel:

```xml
<style>
  :root {
    --gf-bg: #ffffff;
    --gf-text: #1a1a1a;
    --gf-accent: #2f6f5f;
  }
  #gf\:bg { fill: var(--gf-bg); }
  .gf-text { fill: var(--gf-text); }
  .gf-accent { fill: var(--gf-accent); }
</style>

<rect id="gf:bg" x="0" y="0" width="1050" height="1480" />
```

Hinweis zu `:` in IDs:

- In CSS muss `:` escaped werden: `#gf\:bg`.

## Safe Area (optional aber empfohlen)

Damit Designs nicht zu nah am Rand sind und beim Druck nicht abgeschnitten werden:

- optional: `id="gf:safe"` als Rectangle
- im Template unsichtbar lassen (z.B. `opacity="0"`) oder nur im Designer sichtbar

Beispiel:

```xml
<rect id="gf:safe" x="60" y="60" width="930" height="1360" opacity="0" />
```

## Assets (Illustrationen / Hintergründe)

Dekorative Elemente (Blumen, Rahmen, Texturen) sind erlaubt als:

- Vektor-Shapes innerhalb der SVG
- oder eingebettete Bilder (`<image>`)

MVP-Empfehlung:

- bevorzugt Vektor oder sehr hochauflösende Rasterbilder
- keine externen URLs, sondern embedded / data URIs oder später serverseitig als Asset Pack

## Fonts

MVP-Regel:

- Designer nutzt Fonts aus einer vereinbarten Liste.
- Text nicht in Pfade konvertieren.

Später:

- Fonts werden für PDF‑Export serverseitig eingebettet.

## Erstellung in Figma (oder Alternativen)

### Figma

- Frame in A6/A5 anlegen (oder Custom Frame in 1050×1480 / 1480×2100)
- Textlayer benennen (z.B. `gf:text:headline`), ebenso QR‑Placeholder `gf:qr`
- Export als **SVG**
- Achtung: je nach Export-Optionen kann Figma Texte „flatten“. Ziel ist: `<text>` bleibt `<text>`.

### Illustrator / Affinity / Inkscape

- Dokumentgröße auf A6/A5 setzen
- IDs/Layer-Namen setzen (je nach Tool „Object ID“ / „Layer ID“)
- Export als SVG, Text als Text

## Template QA-Checklist (vor dem Einchecken)

- SVG enthält `gf:qr` (mit `x/y/width/height`)
- SVG enthält alle 4 Text-IDs:
  - `gf:text:headline`
  - `gf:text:subline`
  - `gf:text:eventName`
  - `gf:text:callToAction`
- Farben über `--gf-bg`, `--gf-text`, `--gf-accent` steuerbar
- Text ist **nicht** in Pfade umgewandelt
- Keine externen Bild-URLs (wenn möglich)
- Test: Im Browser öffnen, sieht korrekt aus

## Dateikonvention (im Repo)

Vorschlag:

- `packages/frontend/src/assets/qr-templates/<template-slug>/A6.svg`
- `packages/frontend/src/assets/qr-templates/<template-slug>/A5.svg`

Beispiele:

- `minimal-classic/A6.svg`
- `minimal-classic/A5.svg`

Aktuell im Projekt:

- `public/qr-templates/minimal-classic/A6.svg`
- `public/qr-templates/minimal-classic/A5.svg`
- `public/qr-templates/minimal-floral/A6.svg`
- `public/qr-templates/minimal-floral/A5.svg`

## Persistenz (pro Event)

Die QR‑Styler Einstellungen können pro Event gespeichert werden (für Host/Admin). Die Daten liegen in `events.designConfig.qrTemplateConfig`.

### API

- `GET /api/events/:id/qr/config`
  - Antwort: `{ ok: true, qrTemplateConfig: <object|null> }`
- `PUT /api/events/:id/qr/config`
  - Body (Schema):
    - `templateSlug`: string
    - `format`: `A6` | `A5`
    - `headline`, `subline`, `eventName`, `callToAction`: string
    - `bgColor`, `textColor`, `accentColor`: `#RRGGBB`

## Export (Print)

### PNG

- `POST /api/events/:id/qr/export.png`
  - Body: `{ format: 'A6'|'A5', svg: '<svg...>' }`
  - Output: `image/png` (print-ready)

### PDF

- `POST /api/events/:id/qr/export.pdf`
  - Body: `{ format: 'A6'|'A5', svg: '<svg...>', bleedMm?, cropMarks?, marginMm? }`
  - Output: `application/pdf` (1 Seite, A6/A5)

Verhalten:

- **Host (normaler Export / home print):**
  - echte A6/A5 Seitengröße (mm → pt)
  - standardmäßig mit **Sicherheitsrand** (Default: `marginMm=6`), damit Home‑Printer nichts abschneiden
  - `bleedMm` und `cropMarks` werden serverseitig ignoriert
- **Admin (Print-Service / provider-ready):**
  - kann optional **Beschnitt** (`bleedMm`, z.B. 3mm) und **Schnittmarken** (`cropMarks=true`) aktivieren
  - sobald `bleedMm>0` oder `cropMarks=true`, wird `marginMm` automatisch auf `0` gesetzt (Design liegt auf Trim-Box)

