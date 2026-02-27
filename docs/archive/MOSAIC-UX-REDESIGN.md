# Mosaic Wall UX Redesign — Opus Konzept

Stand: 14.02.2026

## Analyse

### Stärken (BEHALTEN)
- CIE Lab Delta-E 2000 Algorithmus — Industrie-Standard, besser als Mosaically
- KI-Overlay-Analyse (Kontrast/Helligkeit/Detail → optimale Intensität)
- Print-Terminal mit PIN/QR — einzigartig für Events
- Auto-Fill mit Diversity-Weighting
- WebSocket `mosaic_tile_placed` Events existieren bereits

### Schwächen (BEHEBEN)
| Problem | Impact | Lösung |
|---------|--------|--------|
| 5-Step Wizard | Hohe Abbruchrate, zu viel Reibung | → 3 Steps |
| KI-Analyse als manueller Button | Gast vergisst/überspringt | → Auto-Trigger nach Upload |
| Scatter-Wert unklar | Verwirrung | → Auto-Modus default + Visualisierung |
| Kein Live-Build | Gäste sehen nicht wie Mosaik wächst | → WebSocket Live-Feed |
| Summary als eigener Step | Unnötig | → Inline in Step 3 |

## Neuer 3-Step Wizard

### Step 1: Modus & Grid (unverändert — gut wie es ist)
- Digital/Print Toggle mit Paket-Gating
- Grid-Presets (Klein/Mittel/Groß/XL) + Custom
- Print: Board-Größe + Sticker-Größe → Grid berechnet
- Demo-Banner für Free-User
- Live Grid-Vorschau

### Step 2: Zielbild & Overlay (Merge aus alten Steps 2+3)
- Upload + Crop (react-image-crop, Aspect-Ratio aus Step 1)
- "Kein Zielbild" Toggle → reines Foto-Raster
- **NEU: Auto-KI-Analyse** — nach Upload automatisch analysieren, kein manueller Button
- Overlay-Intensität Slider mit Live-Preview
- **NEU: Scatter Auto-Modus** — Default "Auto" (KI empfiehlt), optional manueller Slider
- Alles auf einer Seite, kein Scrollen auf Desktop

### Step 3: Einstellungen & Start (Merge aus alten Steps 4+5)
- **Oberer Bereich**: Animation-Kacheln (Play + Checkbox)
- **Mittlerer Bereich**: Optionen (Ticker, QR-Overlay, Auto-Fill)
- **Unterer Bereich**: Kompakte Summary-Cards + Activate Button
- Live-Display Link + Print-Station Link (wenn Print-Modus)

## Live-Build Feature (NEU)

### Konzept
Während Gäste Fotos uploaden, baut sich das Mosaik in Echtzeit auf:
1. Gast lädt Foto hoch → Backend platziert Tile via CIE Lab
2. Backend emittiert `mosaic_tile_placed` via WebSocket (existiert bereits!)
3. Live-Display zeigt neues Tile mit gewählter Animation
4. Optional: "Dein Foto wurde platziert!" Push an den Uploader

### Backend-Änderungen
- `mosaic_tile_placed` Event um `croppedImageUrl` erweitern
- Neues Event `mosaic_stats_update` für Ticker (Progress, Top-Uploader)
- `selectedAnimations` Array in DB speichern (statt nur erstes als `displayAnimation`)

### Frontend Live-Display
- MosaicGrid subscribed auf `mosaic_tile_placed`
- Neues Tile erscheint mit gewählter Animation
- Ticker zeigt: Fortschritt, neueste Uploads, Top-Uploader

## Implementierungs-Reihenfolge

1. ✅ Konzept-Dokument (dieses)
2. Types aktualisieren (3 Steps statt 5)
3. Step2TargetOverlay.tsx erstellen (Merge aus Step2 + Step3)
4. Step3SettingsActivate.tsx erstellen (Merge aus Step4 + Step5)
5. MosaicWizard.tsx anpassen (3 Steps)
6. WizardStepIndicator.tsx anpassen (3 Circles)
7. Backend: `selectedAnimations` in DB + API
8. Backend: `mosaic_tile_placed` Event erweitern
9. Build + Test
