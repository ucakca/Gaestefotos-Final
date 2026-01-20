# Opus-Analyse Umsetzung (20.01.2026)

## 📊 Ausgangslage

**Templates:** 4 → 10 (150% Steigerung) ✅

**Vorhandene Templates:**
- botanical-green
- elegant-floral, elegant-gold
- festive-celebration
- minimal-classic, minimal-floral, minimal-modern
- modern-geometric
- rustic-wood
- vintage-frame

**Neue Components:**
- ExportPanel.tsx (171 Zeilen) ✅
- LogoUpload.tsx (148 Zeilen) ✅
- FontSelector.tsx ✅
- FontSizeSlider.tsx ✅

**Backend:**
- Logo Upload Routes ✅
- cohostInvites.ts (3KB) ✅
- cohosts.ts erweitert (10KB) ✅

---

## 🎯 Optimierungsvorschläge & Status

### 1. Template-Kategorisierung ✅ UMGESETZT

**Implementiert:**
```typescript
const TEMPLATE_CATEGORIES = [
  { key: 'all', label: 'Alle Templates' },
  { key: 'minimal', label: 'Minimal' },      // 3 Templates
  { key: 'elegant', label: 'Elegant' },      // 2 Templates
  { key: 'natural', label: 'Natürlich' },    // 2 Templates
  { key: 'festive', label: 'Festlich' },     // 1 Template
  { key: 'modern', label: 'Modern' },        // 1 Template
  { key: 'classic', label: 'Klassisch' },    // 1 Template
];
```

**Features:**
- Filter-Dropdown im UI
- Dynamisches Filtern mit `useMemo`
- Alle Templates kategorisiert

**Code:** `packages/frontend/src/app/events/[id]/qr-styler/page.tsx:35-43`

---

### 2. QR-Code mit Logo ✅ UMGESETZT (Quick Win 1)

**Problem:** 
- `logoUrl` State vorhanden
- LogoUpload Component funktional
- ABER: Logo nicht im QR-Code sichtbar

**Lösung:**
```tsx
<QRCodeSVG 
  value={publicUrl} 
  level="H" 
  includeMargin={true} 
  imageSettings={logoUrl ? {
    src: logoUrl,
    height: 48,
    width: 48,
    excavate: true,  // Hintergrund ausschneiden
  } : undefined}
/>
```

**Effekt:**
- Logo wird in QR-Code eingebettet (Center)
- `excavate: true` sorgt für Lesbarkeit
- Funktioniert mit PNG/JPG/SVG

**Code:** `packages/frontend/src/app/events/[id]/qr-styler/page.tsx:756-765`

---

### 3. Font-Preview System ✅ VERBESSERT (Quick Win 2)

**Vorher:**
```tsx
<SelectItem value={key} style={{ fontFamily: font.fontFamily }}>
  {font.name}
</SelectItem>
```

**Nachher:**
```tsx
<SelectItem value={key}>
  <div className="flex flex-col gap-1">
    <span className="text-sm font-medium">{font.name}</span>
    <span 
      className="text-xs text-app-muted"
      style={{ fontFamily: font.fontFamily }}
    >
      Unsere Fotogalerie
    </span>
  </div>
</SelectItem>
```

**Verbesserungen:**
- Font-Name in Standard-Schrift (lesbar)
- Sample-Text "Unsere Fotogalerie" in echter Font
- Zweizeilige Darstellung für bessere UX

**Code:** `packages/frontend/src/components/qr-designer/FontSelector.tsx:20-33`

---

### 4. Custom Background Upload ⏳ GEPLANT

**Konzept:**
- Upload-Feld für eigenes Hintergrundbild
- Auto-Kontrast für QR-Code Lesbarkeit
- Positionierungshilfe (Grid-Overlay)

**Technischer Ansatz:**
```typescript
interface CustomBackgroundState {
  url: string | null;
  brightness: number;  // 0-100
  qrPosition: 'center' | 'top-right' | 'bottom-left';
}
```

**Aufwand:** ~30min
**Status:** Nicht implementiert (niedrige Priorität vs. andere Features)

---

### 5. 4-Step-Wizard UX ⏳ KONZEPT

**Vorgeschlagene Steps:**
1. **Template auswählen** (mit Kategorien) ✅ Bereits vorhanden
2. **Texte + Logo** (mit Preview) ✅ Bereits vorhanden
3. **Farben + Fonts** (visuell) ✅ Bereits vorhanden
4. **Export** (Download/Druckservice) ⚠️ Teilweise

**Aktueller Status:**
- Alle Funktionen auf einer Seite (Single-Page)
- Zweispaltig: Editor links, Preview rechts
- Kein Wizard-Flow

**Bewertung:**
- Current UX ist gut für Power-User
- Wizard würde Einstieg vereinfachen
- Aufwand: ~2h für vollständigen Wizard

**Empfehlung:** Später, wenn User-Feedback zeigt dass onboarding schwierig ist

---

### 6. Druckservice Integration ❌ NICHT GEPLANT

**Vorschlag:**
- "Jetzt bestellen" Button → WooCommerce
- Preise aus Admin-Dashboard
- Design-Config als Parameter

**Status:** Nicht implementiert

**Grund:** 
- Requires external WooCommerce Integration
- Geschäftsmodell-Entscheidung nötig
- Technisch komplex (Payment, Order Management)

**Alternative:** 
- PDF Export mit Druckspezifikationen ✅ Bereits vorhanden
- User druckt selbst oder bei lokalem Dienstleister

---

## 📊 Zusammenfassung

### ✅ Umgesetzt (Quick Wins):
1. **Template-Kategorisierung** - 6 Kategorien, Filter-UI
2. **QR-Logo Integration** - Logo im QR-Code Center
3. **Font-Preview** - Sample-Text im Dropdown

### ⏳ Geplant:
- Custom Background Upload (bei Bedarf)
- 4-Step-Wizard (bei User-Feedback)

### ❌ Nicht geplant:
- Druckservice Integration (Business-Entscheidung erforderlich)

---

## 🚀 Impact

**User Experience:**
- ✅ Bessere Template-Organisation (Kategorien)
- ✅ Logo im QR-Code sichtbar
- ✅ Fonts visuell vorschaubar

**Technical Debt:**
- Keine neuen Dependencies
- Minimale Code-Änderungen (~30 Zeilen)
- Backwards-kompatibel

**Performance:**
- Keine Auswirkung
- QR-Logo: Client-side Rendering (qrcode.react)
- Font-Preview: CSS nur

---

## 📝 Nächste Schritte

**Kurzfristig:**
1. User-Feedback zu neuen Features sammeln
2. Analytics: Welche Templates/Kategorien werden genutzt?

**Mittelfristig:**
1. Custom Background Upload (wenn nachgefragt)
2. Template-Thumbnails in Auswahl

**Langfristig:**
1. 4-Step-Wizard (bei schlechtem Onboarding)
2. Druckservice (Business-Entscheidung)

---

**Datum:** 20.01.2026  
**Commits:** 2  
**Zeilen geändert:** ~30  
**Build-Zeit:** ~5s  
**Status:** ✅ Production Live
