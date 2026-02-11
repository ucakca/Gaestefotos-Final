# Photo Mosaic Wall — Technisches Konzept

**Erstellt:** 2026-02-10
**Status:** Konzept finalisiert, bereit für Implementierung

---

## 1. Überblick

Eine Photo Mosaic Wall verwandelt Gäste-Fotos in ein Gesamtkunstwerk. Jedes hochgeladene Foto wird als kleines Tile an der optimalen Position platziert, sodass aus hunderten Einzelfotos ein großes Bild entsteht (z.B. Logo, Brautpaar-Silhouette, Herz).

### USP (Alleinstellungsmerkmal)
**Kein Fotograf, keine Booth, kein Social Media nötig.** Gäste laden direkt über ihr Smartphone hoch (QR-Code). Das unterscheidet uns fundamental von FotoMaster, PictureMosaics und allen anderen Anbietern, die Hardware oder Fotografen als Bildquelle brauchen.

### 3 Modi
1. **Digital** — Live-Display auf TV/Beamer zeigt Mosaik in Echtzeit
2. **Physical** — Tiles werden als Label gedruckt, Gäste kleben sie auf ein Board
3. **Online** — Interaktive Web-Galerie nach dem Event (Gäste finden ihr Tile)

### Foto-Quellen
- Smartphone-Upload via QR-Code (primär, unser USP)
- Photo Booth (wenn vorhanden, zukünftige Integration)
- Admin-Upload (Fotograf-Bilder nachträglich)

---

## 2. Datenmodell

### MosaicWall
```
id                  String    @id
eventId             String    @unique (FK → Event)
targetImageUrl      String    // Zielbild (hochgeladen vom Host)
gridWidth           Int       // z.B. 24
gridHeight          Int       // z.B. 24
tileSizeMm          Int       // Physische Tile-Größe in mm (z.B. 50)
boardWidthMm        Int?      // Physische Board-Größe (optional)
boardHeightMm       Int?
gridColors          Json      // Vorberechnete Durchschnittfarben pro Zelle [{x,y,r,g,b}]
overlayIntensity    Int       // 0-30, Farb-Overlay des Zielbilds über Tiles (%)
status              Enum      // DRAFT, ACTIVE, COMPLETED
fillMode            Enum      // COLOR_MATCH, HYBRID (Color + leichtes Overlay)
autoFillEnabled     Boolean   // Löcher mit Duplikaten füllen wenn Mosaik "fast fertig"
autoFillThreshold   Int       // Ab wieviel % auto-fill starten (z.B. 85)
displayAnimation    Enum      // PUZZLE, FLIP, PARTICLES, ZOOM_FLY, RIPPLE
showTicker          Boolean   // Gast-Statistiken am Display-Rand
showQrOverlay       Boolean   // QR-Code Overlay auf dem Live-Display
createdAt           DateTime
updatedAt           DateTime
```

### MosaicTile
```
id                  String    @id
mosaicWallId        String    (FK → MosaicWall)
photoId             String?   (FK → Photo, nullable bei auto-fill)
gridX               Int       // 0-indexed X Position
gridY               Int       // 0-indexed Y Position
positionLabel       String    // Human-readable, z.B. "C7"
croppedImageUrl     String?   // Face-cropped/smart-cropped Thumbnail
dominantColor       Json      // {r, g, b}
colorDistance        Float     // Delta-E Score (0 = perfekt)
isAutoFilled        Boolean   // True wenn Duplikat/Auto-Fill
isHero              Boolean   // Admin-markiertes VIP-Tile
printStatus         Enum      // PENDING, PRINTING, PRINTED, PLACED
printNumber         Int?      // Abholnummer (wie beim Bäcker)
source              Enum      // SMARTPHONE, BOOTH, ADMIN
createdAt           DateTime
```

### Board-Größen (Vorlagen)
| Name | Grid | Tiles | Tile-Größe | Board | Für |
|------|------|-------|------------|-------|-----|
| Small | 12×12 | 144 | 50×50mm | 60×60cm | 50-80 Gäste |
| Medium | 24×24 | 576 | 50×50mm | 120×120cm | 100-200 Gäste |
| Large | 48×32 | 1536 | 50×50mm | 240×160cm | 300+ Gäste |
| Custom | frei | frei | frei | frei | Individuell |

---

## 3. Mosaic Engine (Backend-Service)

### 3.1 Zielbild-Analyse (einmalig bei Setup)
```
Input:  Zielbild (JPEG/PNG)
Output: gridColors[] — Array mit {x, y, r, g, b} pro Zelle

1. Bild laden mit Sharp
2. Resize auf gridWidth × gridHeight Pixel
3. Jeden Pixel = Durchschnittfarbe einer Zelle
4. In Lab-Farbraum konvertieren (für Delta-E)
5. Speichern als JSON im MosaicWall Record
```

### 3.2 Foto-Analyse (bei jedem Upload)
```
Input:  Gäste-Foto
Output: Dominanzfarbe {r, g, b} + gecroppted Tile-Bild

1. Smart-Crop:
   - 1 Gesicht → Face-Center-Crop (quadratisch)
   - 2-3 Gesichter → Bounding-Box um alle, quadratisch
   - 4+ oder kein Gesicht → Center-Crop
2. Resize auf Tile-Auflösung (z.B. 300×300px)
3. Dominanzfarbe: k-means (k=3) auf gecroptem Bild, stärkster Cluster
4. In Lab-Farbraum konvertieren
```

### 3.3 Placement-Algorithmus
```
Input:  Foto-Dominanzfarbe, freie Zellen mit Zielfarben
Output: Beste Position {x, y}

1. Alle freien Zellen durchgehen
2. Delta-E (CIE2000) zwischen Foto-Dominanzfarbe und Ziel-Zellenfarbe berechnen
3. Zelle mit geringstem Delta-E = beste Position
4. Bei Gleichstand: Position näher zur Mitte bevorzugen (ästhetischer)
5. Tile zuweisen, croppedImage speichern
```

### 3.4 Auto-Fill (Löcher-Stopfer)
```
Trigger: autoFillEnabled && platzierte Tiles >= autoFillThreshold%

1. Verbleibende leere Zellen identifizieren
2. Für jede leere Zelle:
   a. Zielfarbe der Zelle holen
   b. Aus bereits platzierten Tiles das farblich ähnlichste finden
   c. Duplikat erstellen (isAutoFilled: true)
   d. Optional: leichte Farbverschiebung via Sharp (Hue ±5°)
3. Mosaik-Status → COMPLETED
```

### 3.5 Quality-Filter
```
Bei Upload:
1. Schärfe-Score berechnen (Laplacian Variance via Sharp)
2. Bei Serie-Erkennung (gleicher User, <30s Abstand, ähnliche Farben):
   → Nur das schärfste Bild fürs Mosaik verwenden
   → Alle Bilder bleiben im normalen Album
```

---

## 4. API Endpoints

### Setup (Host/Admin)
```
POST   /api/events/:eventId/mosaic          — Mosaic Wall erstellen
PUT    /api/events/:eventId/mosaic          — Settings aktualisieren
DELETE /api/events/:eventId/mosaic          — Mosaic Wall löschen
POST   /api/events/:eventId/mosaic/analyze  — Zielbild analysieren (generiert gridColors)
GET    /api/events/:eventId/mosaic          — Mosaic-Config + Stats abrufen
```

### Tiles
```
POST   /api/events/:eventId/mosaic/place    — Foto platzieren (triggert Engine)
GET    /api/events/:eventId/mosaic/tiles     — Alle Tiles abrufen (für Display)
GET    /api/events/:eventId/mosaic/tiles/new?since=timestamp — Neue Tiles seit X (Polling)
PUT    /api/events/:eventId/mosaic/tiles/:id/hero — Tile als Hero markieren
PUT    /api/events/:eventId/mosaic/tiles/:id/print-status — Druckstatus aktualisieren
POST   /api/events/:eventId/mosaic/auto-fill — Auto-Fill triggern
```

### Display & Stats
```
GET    /api/events/:eventId/mosaic/display  — Optimierte Payload für Live-Display
GET    /api/events/:eventId/mosaic/stats    — Ticker-Daten (Top-Uploader, letzte Uploads)
GET    /api/events/:eventId/mosaic/export   — Hochauflösendes Mosaik-Bild generieren
```

### Print
```
GET    /api/events/:eventId/mosaic/print-queue — Offene Druckaufträge
POST   /api/events/:eventId/mosaic/print-queue/:tileId/printed — Als gedruckt markieren
```

---

## 5. Frontend-Routen

### Host/Admin
- `/events/[id]/mosaic/setup` — Zielbild hochladen, Grid konfigurieren, Vorschau
- `/events/[id]/mosaic/manage` — Tiles verwalten, Hero markieren, Stats
- `/events/[id]/mosaic/simulator` — Event-Simulation / Mosaik-Rechner

### Live-Display (öffentlich, kein Auth)
- `/live/[slug]/mosaic` — Fullscreen Mosaic-Only Display für TV/Beamer
- `/live/[slug]/wall?mode=mixed` — Mixed-Mode: Galerie-Slideshow + Mosaik-Fortschritt im Wechsel

### Print-Station (Auth: Host/Operator)
- `/events/[id]/mosaic/print-station` — Druckqueue, Label-Layout

### Online-Galerie (öffentlich)
- `/live/[slug]/mosaic/gallery` — Interaktives Mosaik nach dem Event

---

## 6. Live-Display Animationen

### Neue Tiles einfügen
1. **Puzzle** — Tile fliegt als Puzzleteil von oben/seitlich an seine Position
2. **Flip-Card** — Position dreht sich 3D um und zeigt das Foto
3. **Particles** — Foto materialisiert sich aus Farbpartikeln
4. **Zoom-Fly** — Kamera zoomt zur Position, Foto platziert sich, Kamera zoomt zurück
5. **Ripple** — Foto erscheint, Welle breitet sich kreisförmig aus

### Spezial-Animationen
- **Hero-Moment**: VIP-Tile wird 5 Sekunden groß angezeigt, Gold-Rahmen, dann fliegt es an seine Position
- **"Coming to Life" Puls**: Ab 80% pulsiert das Gesamtbild sanft (CSS glow)
- **Meilenstein-Feuerwerk**: Bei 25%, 50%, 75%, 100% kurze Partikel-Animation
- **Idle-Slideshow**: Wenn keine neuen Tiles: langsamer Pan über das bisherige Mosaik

### Mixed-Mode (Galerie + Mosaik im Wechsel)
Zusätzlicher ViewMode in `/live/[slug]/wall`:
```
[10s] Mosaik-Gesamtansicht (aktueller Stand, neue Tiles hervorgehoben)
        ↓
[5s]  Letztes Foto groß (mit Name/Zeitstempel)
        ↓
[5s]  Nächstes Foto
        ↓
[5s]  Nächstes Foto
        ↓
[10s] Mosaik-Gesamtansicht (aktualisiert)
        ↓
      ... Loop
```
- Timing konfigurierbar (Mosaikdauer, Fotodauer, Anzahl Fotos zwischen Mosaik)
- Smooth Crossfade-Übergang zwischen Galerie und Mosaik

### Ticker (unterer Rand)
- "Zuletzt: Max aus München 📸"
- "Meiste Fotos: Julia (12) 🏆"
- "Noch 47 Tiles bis das Mosaik fertig ist!"
- "53% geschafft — das Bild wird sichtbar!"

---

## 7. Print-Station

### Label-Layout pro Tile
```
┌──────────────────────┐
│                      │
│     [FOTO]           │
│   (quadratisch,      │
│    gecroppt)         │
│                      │
├──────────────────────┤
│  Position: C7        │
│  #42                 │  ← Abholnummer
│  ──── ✂️ ────────── │  ← Schnittlinie (optional)
└──────────────────────┘
```

### Nummern-System
1. Gast lädt Foto hoch → bekommt Nummer auf dem Handy: "Dein Mosaic-Tile: #42"
2. Display an Print-Station: "Jetzt bereit: #42, #43 — Bitte abholen!"
3. Optional: Push-Notification: "Dein Tile ist fertig! Position C7"

### Auto-Print Flow
1. Browser-Seite `/mosaic/print-station` pollt alle 3s nach neuen Tiles
2. Neues Tile erscheint → Label-Layout wird gerendert
3. Auto-Print: `window.print()` im Kiosk-Mode (Chrome `--kiosk-printing`)
4. Status → PRINTED

---

## 8. Mosaik-Rechner / Event-Simulation

### Input
- Erwartete Gästezahl
- Event-Dauer (Stunden)
- Upload-Rate-Schätzung (konservativ: 50% der Gäste laden 1 Foto)

### Output
- Empfohlene Board-Größe
- Geschätzte Fertigstellungszeit
- Tiles pro Minute (für Druckplanung)
- Empfehlung: Auto-Fill an/aus

### Beispiel
```
Input:  150 Gäste, 5 Stunden Event
→ 50% Upload-Rate = 75 Fotos
→ Empfehlung: Small Board (12×12 = 144 Tiles)
→ 75 echte Fotos + 69 Auto-Fill = 100% in ~3 Stunden
→ Druckrate: ~0.4 Tiles/Minute → jeder Drucker schafft das locker
```

---

## 9. Integration mit bestehendem System

### Photo-Upload Hook
Wenn ein Event eine aktive MosaicWall hat:
1. Foto wird normal hochgeladen (UploadButton.tsx)
2. Backend: Nach erfolgreichem Upload → prüfe ob MosaicWall aktiv
3. Wenn ja → automatisch `mosaic.place()` aufrufen
4. Gast bekommt Tile-Nummer + Position zurück

### Feature Flag
- `featuresConfig.mosaicWall: boolean` im Event
- Feature-Gate im Backend: prüft Paket-Berechtigung
- Wizard: Mosaic-Setup als optionaler Step

### Dashboard-Integration
- Mosaic-Stats auf dem Event-Dashboard
- "Mosaic Wall einrichten" Button
- Live-Vorschau des aktuellen Stands

---

## 10. Monetarisierung

- **Free Tier**: Nur digitales Mosaik (kein Print-Support, kein Export)
- **Pro/Premium**: Physical + Print-Station + HD-Export + Online-Galerie
- **Enterprise**: Sponsoring-Tiles (Logo in Ecken), Custom Board-Größen
- **Upsell nach Event**: Print-on-Demand Poster (Druckpartner-Integration, Phase 5+)
- **"Digitales Dankeschön"**: Banner auf der Event-Seite (`/e3/[slug]`) nach dem Event: "Das Mosaik ist fertig! → Ansehen". Kein WhatsApp/SMS/E-Mail nötig — der Gast hat den Link bereits auf dem Handy. Optionaler Fallback: E-Mail (wenn freiwillig beim Upload angegeben).

---

## 11. Implementierungs-Reihenfolge

### Phase 1: Digital MVP (2-3 Tage)
- [ ] Prisma Schema: MosaicWall + MosaicTile
- [ ] Mosaic Engine Service (Zielbild-Analyse, Foto-Analyse, Placement)
- [ ] API Endpoints (CRUD + Place + Tiles)
- [ ] Auto-Hook bei Photo-Upload
- [ ] Admin-Setup UI (Zielbild + Grid-Config)

### Phase 2: Live-Display (1-2 Tage)
- [ ] `/live/[slug]/mosaic` Route (Fullscreen, kein Auth)
- [ ] Polling-Hook (3s Intervall)
- [ ] 5 Tile-Animationen (Puzzle, Flip, Particles, Zoom, Ripple)
- [ ] Hero-Moment Animation
- [ ] Ticker (Stats am unteren Rand)
- [ ] "Coming to Life" Puls ab 80%
- [ ] Meilenstein-Animationen (25/50/75/100%)

### Phase 3: Print-Station (1 Tag)
- [ ] `/events/[id]/mosaic/print-station` Route
- [ ] Label-Layout Rendering
- [ ] Nummern-System (Abholnummer auf Gast-Handy)
- [ ] Auto-Print Modus (Chrome Kiosk)
- [ ] Print-Queue Management

### Phase 4: Online-Galerie + Extras (1 Tag)
- [ ] Interaktive Online-Mosaic-Galerie (Hover/Tap zeigt Foto)
- [ ] "Mein Tile finden" Funktion
- [ ] HD-Export des fertigen Mosaiks
- [ ] "Digitales Dankeschön" E-Mail
- [ ] Mosaik-Rechner / Event-Simulation

### Phase 5: Feature Flag + Business (0.5 Tag)
- [ ] Feature-Gate im Backend
- [ ] Paket-Integration (Free vs. Pro)
- [ ] Sponsoring-Tiles (Corporate)
- [ ] Dashboard-Widget

---

*Konzept finalisiert: 2026-02-10*
*Quellen: FotoMaster, PictureMosaics, Limelight Photo Booth*
