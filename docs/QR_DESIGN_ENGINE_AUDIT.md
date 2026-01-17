# QR Design Engine Audit Report

**Date:** 17. Januar 2026  
**Reviewer:** Claude 4.5 Opus  
**Scope:** Ecardilly/Weddies Check (Print-Ready QR-Cards)

---

## 🚨 KRITISCHER BUG

### DownloadButton.tsx:58-65 - QR-Code Placeholder

**Problem:** SVG-Download generiert **KEINEN echten QR-Code**!

```typescript
// ❌ AKTUELL (Zeile 58-65)
const generateQRSVG = (config: QRDesignConfig): string => {
  // This is a placeholder - in production, use the actual QRCodeSVG component's output
  return `<svg...>`; // ← Falscher SVG, kein QR!
}
```

**Fix:** Nutze `renderQrToSvgMarkup()` aus `qr-styler/page.tsx` als Vorlage

**Impact:** HOCH - User können keine druckfähigen QR-Codes exportieren  
**Effort:** 0.5 Tage

---

## 1️⃣ EDITOR-AUDIT (The Ecardilly Check)

### WYSIWYG-Validierung

| Aspekt | Status | Details |
|--------|--------|---------|
| **Live-Vorschau** | ✅ OK | QR-Styler zeigt SVG-Template mit eingebettetem QR |
| **Farb-Mapping** | ✅ OK | CSS Variables (`--gf-bg`, `--gf-text`, `--gf-accent`) |
| **Text-Preview** | ✅ OK | Headline, Subline, EventName, CTA live aktualisiert |
| **Print-Vorschau** | ⚠️ Teilweise | Browser-Vorschau ≠ exakter PDF-Output (Fonts, Margins) |

### Customization-Features

| Feature | Status | Details |
|---------|--------|---------|
| **Text-Editing** | ⚠️ Eingeschränkt | Nur 4 Textfelder (Headline, Subline, EventName, CTA) |
| **Font-Auswahl** | ❌ FEHLT | Keine Font-Selector UI - Templates nutzen feste Fonts |
| **Font-Größe** | ❌ FEHLT | Keine Größen-Anpassung möglich |
| **Farb-Picker** | ✅ OK | 3 Farben: Hintergrund, Text, Akzent (ColorInput) |
| **Drag-and-Drop Grafiken** | ❌ FEHLT | Kein Grafik-Upload/Positionieren |
| **Layer-Management** | ❌ FEHLT | Keine Ebenen-Steuerung |
| **Logo-Upload** | ⚠️ Teilweise | `centerLogoUrl` in Config, aber UI fehlt |
| **Template-Auswahl** | ✅ OK | 4 Templates (minimal-classic, minimal-floral, minimal-modern, elegant-floral) |
| **Format-Auswahl** | ✅ OK | A5 und A6 verfügbar |

### Tote UI-Elemente

- ✅ Keine toten Buttons - Alle funktionieren
- ⚠️ `DownloadButton.generateQRSVG()` - Placeholder-Implementierung

---

## 2️⃣ PRINT-READY REPORT (The Weddies Check)

### QR-Code Dynamik

| Prüfpunkt | Status | Details |
|-----------|--------|---------|
| **Dynamische Event-URL** | ✅ OK | `${origin}/e/${eventSlug}` |
| **QR-Einbettung** | ✅ OK | `embedQrIntoTemplateSvg()` via SVG-Nesting |
| **Error-Level** | ✅ OK | Level "H" (High - 30% Fehlerkorrektur) |

### Druckqualität

| Aspekt | Status | Details |
|--------|--------|---------|
| **SVG-Export** | ✅ OK | Direkter Download als Vektor (.svg) |
| **PNG-Export** | ✅ OK | 300 DPI via resvg-js oder sharp |
| **PDF-Export** | ✅ OK | via pdf-lib mit korrekter Skalierung |
| **Auflösung** | ✅ OK | `getPrintPixels()` berechnet DPI-basierte Maße |
| **CMYK-Farbraum** | ❌ FEHLT | Nur RGB-Export, keine CMYK-Konvertierung |
| **Beschnittzugabe (Bleed)** | ⚠️ Nur Admin | `bleedMm` nur für Admin-Rolle aktiviert |
| **Schnittmarken (Crop Marks)** | ⚠️ Nur Admin | `cropMarks` nur für Admin-Rolle aktiviert |

### Template-Formate

| Format | Status | Details |
|--------|--------|---------|
| **A6 (Tischkarte)** | ✅ OK | 105×148mm |
| **A5** | ✅ OK | 148×210mm |
| **A4** | ❌ FEHLT | Nicht in SVG-Templates vorhanden |
| **Quadrat** | ❌ FEHLT | Nicht in SVG-Templates vorhanden |
| **Poster 30×40cm** | ❌ FEHLT | Nicht in SVG-Templates vorhanden |
| **L-Ständer** | ❌ FEHLT | Kein spezielles Format |

---

## 3️⃣ WORKFLOW-INTEGRATION

### Speicher-Logik

| Feature | Status | Details |
|---------|--------|---------|
| **Auto-Save** | ✅ OK | 1-Sekunden Debounce in `qr-styler/page.tsx:405-407` |
| **Tab-Schließen** | ⚠️ Kein Dirty-Warning | Keine `beforeunload` Warnung |
| **Config-Persistenz** | ✅ OK | Gespeichert in `event.designConfig.qrTemplateConfig` |

### Export-Funktionalität

| Export | Status | Details |
|--------|--------|---------|
| **PNG Download** | ✅ FUNKTIONIERT | Backend-Rendering via resvg |
| **PDF Download** | ✅ FUNKTIONIERT | Backend mit pdf-lib |
| **SVG Download** | ⚠️ PLACEHOLDER | Client-seitig, aber ohne echten QR-Code! |

---

## 4️⃣ CROSS-DOMAIN KONSISTENZ

| Aspekt | dash. (Host-Design) | app. (Gast-Ansicht) | Status |
|--------|---------------------|---------------------|--------|
| **Logo** | Kann gesetzt werden | Wird angezeigt | ✅ OK |
| **Farben** | QR-Designer Colors | Event designConfig | ✅ OK |
| **QR-Ziel-URL** | Konfiguriert | `/e/{slug}` landet richtig | ✅ OK |

---

## 5️⃣ FEATURE-GAP-ANALYSE

### Kritisch fehlend für "Produktion"

| # | Feature | Priorität | Aufwand | Sprint |
|---|---------|-----------|---------|--------|
| **0** | **DownloadButton QR-SVG Fix** | **KRITISCH** | **S** | **Sofort** |
| 1 | Font-Auswahl UI | HOCH | M | Sprint 1 |
| 2 | Font-Größe Slider | HOCH | S | Sprint 1 |
| 3 | Grafik-Upload (Drag & Drop) | HOCH | L | Sprint 2 |
| 4 | CMYK-Farbraum Export | MITTEL | M | Sprint 2 |
| 5 | Weitere Formate (A4, Poster, Quadrat) | MITTEL | S | Sprint 1 |
| 6 | Beschnittzugabe für Host | MITTEL | S | Sprint 2 |
| 7 | Layer-Management | NIEDRIG | L | Sprint 3 |
| 8 | Undo/Redo | NIEDRIG | M | Sprint 3 |
| 9 | Dirty-State Warning | NIEDRIG | S | Sprint 2 |

**Aufwand-Legende:** S = <4h, M = 1-2 Tage, L = 3-5 Tage

---

## 📋 WINDSURF TASK-LIST

### 🔴 Sofort (Kritisch)

**Task 1:** ✅ **FIX DownloadButton.tsx QR-SVG Placeholder**

**Location:** `/packages/frontend/src/components/qr-designer/DownloadButton.tsx:58-65`

**Problem:**
```typescript
const generateQRSVG = (config: QRDesignConfig): string => {
  // This is a placeholder - in production, use the actual QRCodeSVG component's output
  return `<svg...>`; // ← Produziert falschen SVG, KEINEN QR-Code!
}
```

**Lösung:**
- Nutze `renderQrToSvgMarkup()` aus `qr-styler/page.tsx` als Vorlage
- Backend-Route für SVG-Rendering nutzen (bereits vorhanden)
- Oder: QRCode-Component serverseitig rendern

**Effort:** 2-4 Stunden

---

### 🟡 Sprint 1 (Editor-Verbesserung)

**Task 2:** Font-Selector implementieren
- UI: Dropdown mit 5-10 Web-Fonts
- Backend: Font-Embedding in SVG/PDF Export
- Effort: 1-2 Tage

**Task 3:** Font-Size Slider
- Range: 12-96px für Headline, 10-48px für andere
- Effort: 0.5 Tage

**Task 4:** Weitere Template-Formate erstellen
- A4, Quadrat (20×20cm), Poster (30×40cm) SVGs
- Effort: 0.5 Tage

---

### 🟢 Sprint 2 (Print-Qualität)

**Task 5:** CMYK-Konvertierung für PDF
- Color-Profile-Handling
- Effort: 1-2 Tage

**Task 6:** Beschnittzugabe für Hosts aktivieren
- Checkbox: "Druckerei-Modus" mit 3mm Bleed
- Effort: 0.5 Tage

**Task 7:** Dirty-State Warning
- `window.addEventListener('beforeunload', ...)`
- Effort: 0.5 Tage

---

### 🔵 Sprint 3 (Erweiterte Features)

**Task 8:** Grafik-Upload mit Positionierung
- File-Upload + Canvas-Drag-Platzierung
- Effort: 3-5 Tage

**Task 9:** Logo-Upload UI komplettieren
- Aktuell nur in Config, keine vollständige UI
- Effort: 1 Tag

---

## 📊 Prioritäts-Matrix

```
Impact vs Effort

HIGH IMPACT, LOW EFFORT (Quick Wins):
├─ DownloadButton QR-SVG Fix ⭐
├─ Font-Size Slider
├─ Weitere Formate (A4, Poster)
└─ Dirty-State Warning

HIGH IMPACT, MEDIUM EFFORT:
├─ Font-Selector UI
├─ CMYK-Export
└─ Beschnittzugabe für Hosts

HIGH IMPACT, HIGH EFFORT:
└─ Grafik-Upload (Drag & Drop)

LOW PRIORITY:
├─ Layer-Management
└─ Undo/Redo
```

---

## ✅ Bewertung

**WYSIWYG-Qualität:** 7/10 (gut, aber Print-Vorschau ungenau)  
**Feature-Vollständigkeit:** 6/10 (Basis funktioniert, erweiterte Features fehlen)  
**Druckqualität:** 8/10 (SVG/PDF OK, aber CMYK fehlt)  
**Workflow-Integration:** 7/10 (Auto-Save gut, aber kein Dirty-Warning)

**Gesamt:** 7/10 - **Produktionsreif mit Einschränkungen**

---

## 🎯 Empfehlung

**Phase 1 (Sofort):**
- DownloadButton QR-SVG Fix (kritisch!)

**Phase 2 (KW 6-7):**
- Font-Selector + Font-Size
- Weitere Formate

**Phase 3 (KW 8-10):**
- CMYK + Beschnittzugabe
- Grafik-Upload

---

**Reviewer:** Claude 4.5 Opus  
**Status:** Ready for Implementation
