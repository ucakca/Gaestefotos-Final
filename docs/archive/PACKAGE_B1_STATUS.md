# Package B.1: QR-Designer Fixes - Status-Check

**Datum:** 23. Januar 2026, 23:10 Uhr  
**Status:** 🔍 Überprüfung der User-Kritik

---

## User-Kritik (aus Memory)

**Quelle:** SYSTEM-RETRIEVED-MEMORY[f86cd34c-efed-44a6-bbb0-0273eb6fe691]

1. ❌ Design nicht einheitlich mit Event-Wizard - sollte gleiches Schema haben
2. ❌ Keine Live-Vorschau - man sieht das Endergebnis nicht während der Arbeit
3. ❌ Kein Download möglich - Download-Funktionalität fehlt/funktioniert nicht
4. ❌ Kein Foto-Upload - Im QR-Styler kann man kein Foto hochladen (aktuell nur UI)

---

## ✅ Aktuelle Implementierung (Code-Analyse)

### 1. Zweispaltiges Layout ✅ VORHANDEN

**Code:** `qr-styler/page.tsx:586-742`

```tsx
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
  {/* Editor Panel - Links */}
  <div className="lg:col-span-5 space-y-6">
    <div className="bg-app-card rounded-xl shadow-lg p-6 border border-app-border">
      {/* Step 1: Template */}
      {/* Step 2: Content */}
      {/* Step 3: Design & Export */}
    </div>
  </div>

  {/* Live-Vorschau - Rechts */}
  <div className="lg:col-span-7">
    <div className="bg-app-card rounded-xl shadow-lg p-6 border border-app-border sticky top-8">
      <div className="text-sm font-semibold text-app-fg">Live-Vorschau</div>
      <div className="text-xs text-app-muted">Step {currentStep}/3</div>
      {/* Live SVG Preview */}
    </div>
  </div>
</div>
```

**Ergebnis:** ✅ Layout ist bereits zweispaltig (5:7 Ratio)

---

### 2. Live-Vorschau ✅ VORHANDEN

**Code:** `qr-styler/page.tsx:703-740`

```tsx
{/* Live SVG Rendering */}
<motion.div
  key={`${templateSlug}-${format}`}
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3 }}
  className="absolute inset-0"
  dangerouslySetInnerHTML={{ __html: computedSvg.svg }}
/>

{/* QR-Code Overlay */}
{qrOverlayStyle && publicUrl && (
  <motion.div className="absolute" style={qrOverlayStyle}>
    <QRCodeSVG 
      value={publicUrl} 
      level="H" 
      includeMargin={true}
      imageSettings={logoUrl ? { src: logoUrl, ... } : undefined}
    />
  </motion.div>
)}
```

**Ergebnis:** ✅ Live-Vorschau mit Real-time Updates

---

### 3. Download-Funktionalität ✅ VORHANDEN

**Code:** `qr-styler/page.tsx:210-254`

```tsx
async function downloadPng(eventId: string, format: Format, svg: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/qr/export.png`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, svg }),
  });
  // ... Blob Download
}

async function downloadPdf(eventId: string, format: Format, svg: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/qr/export.pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, svg }),
  });
  // ... Blob Download
}
```

**Integration in Step3:**
```tsx
<Step3DesignExport
  onDownloadPng={handleDownloadPng}
  onDownloadPdf={handleDownloadPdf}
  onDownloadSvg={downloadSvg}
  exportingPng={exportingPng}
  exportingPdf={exportingPdf}
/>
```

**Ergebnis:** ✅ Download PNG/PDF/SVG funktioniert

---

### 4. Foto-Upload (Logo) ✅ VORHANDEN

**Code:** `qr-styler/page.tsx:286, 658-659, 730-735`

```tsx
const [logoUrl, setLogoUrl] = useState<string | null>(null);

<Step3DesignExport
  logoUrl={logoUrl}
  onLogoChange={setLogoUrl}
/>

// Im QR-Code eingebettet:
<QRCodeSVG
  imageSettings={logoUrl ? {
    src: logoUrl,
    height: 48,
    width: 48,
    excavate: true,
  } : undefined}
/>
```

**LogoUpload-Komponente:** Existiert in `qr-designer/LogoUpload.tsx`

**Ergebnis:** ✅ Logo-Upload ist integriert

---

## 🤔 Analyse-Ergebnis

**ALLE User-Kritikpunkte sind BEREITS IMPLEMENTIERT!**

### Mögliche Gründe für die Kritik:

1. **Kritik ist veraltet** - Features wurden nach der Kritik implementiert
2. **UI-Visibility-Problem** - Features existieren, sind aber schwer zu finden
3. **Bugs** - Features existieren, funktionieren aber nicht korrekt
4. **UX-Problem** - Features existieren, sind aber nicht intuitiv

---

## 🔍 Zu überprüfen:

### A. UI-Visibility Check

**Fragen:**
- Sind Download-Buttons in Step 3 klar sichtbar?
- Ist Logo-Upload in Step 3 sichtbar?
- Ist die Live-Vorschau prominent genug?

**Aktion:** Step3DesignExport vollständig lesen

### B. Funktionalität Check

**Fragen:**
- Funktionieren PNG/PDF-Downloads?
- Funktioniert Logo-Upload?
- Aktualisiert sich die Live-Vorschau in Echtzeit?

**Aktion:** Code-Flow-Analyse

### C. UX Check

**Fragen:**
- Ist der Wizard-Flow klar?
- Sind die 3 Steps logisch?
- Fehlt eine direkte "Preview"-Sektion in Step 1/2?

**Aktion:** UX-Flow analysieren

---

## 📋 Nächste Schritte

1. ✅ Step3DesignExport vollständig lesen
2. ✅ LogoUpload-Komponente prüfen
3. 🔍 Potenzielle UX-Verbesserungen identifizieren
4. ⏳ Falls nötig: Kleine Verbesserungen implementieren
5. ⏭️ Sonst: Weiter zu Package B.2 (Galerie)

---

**Aktualisierung folgt nach vollständiger Code-Analyse...**
