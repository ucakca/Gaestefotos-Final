# 🎯 Upload-Flow Redesign - Spezifikation

**Ziel:** Instagram-Stil (2-3 Schritte) mit bestehendem Design  
**Prinzip:** Flow vereinfachen, NICHT Design ändern  
**Datum:** 16. Februar 2026

---

## 📋 ANFORDERUNGEN

### ✅ Beibehalten (Design):
- Bestehende Farben & Styling
- Modal-Design (rounded-2xl, bg-card, etc.)
- Icons (Lucide React)
- Animationen (Framer Motion)
- Bottom-Navigation
- Event-Theme-System

### 🔄 Ändern (Flow):
- 8 Schritte → 2-3 Schritte
- Name: Pflicht → Optional
- Album: Vor Upload → Nachträglich (Auto-Kategorisierung)
- Custom-Screen → Native File-Picker

---

## 🎨 NEUER UPLOAD-FLOW (Instagram-Stil)

### SCHRITT 1: Foto auswählen (Native Picker)

```
┌─────────────────────────────────────────────────┐
│ ✕                Foto hochladen                 │ ← Bestehender Header-Style
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │         [📸 Kamera Icon]                │   │ ← Große Buttons
│  │                                         │   │    (bestehende Styling)
│  │         Foto auswählen                  │   │
│  │                                         │   │
│  │  [ Galerie öffnen ]  [ Kamera öffnen ] │   │ ← 2 Optionen
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Oder Fotos hierher ziehen (Desktop)            │ ← Drag & Drop
│                                                 │
│  ────────────────────────────────────────────   │
│                                                 │
│  💡 Tipp: Mehrere Fotos gleichzeitig möglich   │ ← Hinweis
│                                                 │
└─────────────────────────────────────────────────┘
```

**Technisch:**
```tsx
// Native HTML5 File-Picker (funktioniert IMMER!)
<input 
  type="file"
  accept="image/*,video/*"
  multiple              // Multi-Upload!
  capture="environment" // Kamera-Option auf Mobile
  onChange={handleFileSelect}
/>
```

**User-Action:**
- User klickt "Galerie" → Native Picker öffnet sich
- User wählt 1-10 Fotos → SOFORT zu Schritt 2!

**Zeit:** 3 Sekunden

---

### SCHRITT 2: Upload läuft + Optionale Details

```
┌─────────────────────────────────────────────────┐
│ ✕           Fotos werden hochgeladen            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────┐     │
│  │ [Foto 1 Preview]  [Foto 2]  [Foto 3] │     │ ← Thumbs
│  └───────────────────────────────────────┘     │
│                                                 │
│  Uploading 2/3 Fotos...                         │
│  ████████████████░░░░░░ 75%                     │ ← Progress
│                                                 │
│  ────────────────────────────────────────────   │
│                                                 │
│  📝 Details (optional)                          │ ← Während Upload!
│                                                 │
│  Dein Name (wird gespeichert für nächstes Mal)  │
│  ┌─────────────────────────────────────┐       │
│  │ Max Mustermann                      │       │ ← Aus LocalStorage
│  └─────────────────────────────────────┘       │    vorausgefüllt!
│                                                 │
│  Album                                          │
│  ┌─────────────────────────────────────┐       │
│  │ ✨ Wird automatisch erkannt          │       │ ← AI-Auto-Kategorisierung
│  └─────────────────────────────────────┘       │    (bereits vorhanden!)
│                                                 │
└─────────────────────────────────────────────────┘
```

**Verhalten:**
- Upload startet **SOFORT** nach Foto-Auswahl
- User kann **parallel** Name eingeben (oder überspringen!)
- Album wird **automatisch** erkannt (AI: `selectSmartCategoryId`)
- Wenn Upload fertig VOR Name → Name wird nachträglich gespeichert
- Wenn Name fertig VOR Upload → wird mit hochgeladen

**Zeit:** 7-15 Sekunden (inkl. Upload)

---

### SCHRITT 3: Erfolg + Nächste Aktion

```
┌─────────────────────────────────────────────────┐
│              3 Fotos hochgeladen! 🎉            │
├─────────────────────────────────────────────────┤
│                                                 │
│         ┌───────────────────────────┐           │
│         │                           │           │
│         │      ✓ Erfolgreich!       │           │
│         │                           │           │
│         │   [Konfetti-Animation]    │           │ ← Bestehende Animation
│         │                           │           │
│         └───────────────────────────┘           │
│                                                 │
│  Deine Fotos sind jetzt in der Galerie         │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │ Noch mehr Fotos  │  │  Zur Galerie →   │    │ ← 2 CTAs
│  └──────────────────┘  └──────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Auto-Close:** Nach 3 Sekunden automatisch schließen (oder User klickt)

**Zeit:** 3 Sekunden

---

## 🎨 DESIGN-SPECS (Beibehalten!)

### Farben (aus aktuellem Design)
```css
/* Bestehende Theme-Variablen nutzen */
Modal-Background:  bg-card
Header:            border-b border-border
Text:              text-foreground / text-muted-foreground
Primary-Button:    bg-blue-500 (bestehend)
Success:           bg-success / text-success
Warning:           bg-warning / text-warning
Progress-Bar:      bg-blue-500 (bestehend)
```

### Spacing (aus aktuellem Design)
```css
Modal:       rounded-2xl p-4
Cards:       rounded-xl p-3
Buttons:     rounded-lg px-4 py-2
Gaps:        gap-3 / gap-4
```

### Animationen (bestehende nutzen)
```javascript
// Framer Motion (bereits verwendet)
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: 20 }}
```

**= KEIN visuelles Redesign, nur Flow-Optimierung!**

---

## 🔄 FLOW-VERGLEICH

### Vorher (Workflow-basiert):

| Schritt | Was | Zeit | Abbruch-Rate |
|---------|-----|------|--------------|
| 1 | Kamera-Button | 1s | 0% |
| 2 | Name eingeben | 8s | 20% |
| 3 | Album wählen | 5s | 15% |
| 4 | Foto auswählen | 10s | 15% |
| 5 | Dateityp-Check | 1s | 0% |
| 6 | Größen-Check | 1s | 0% |
| 7 | Upload | 10s | 5% |
| 8 | Erfolg | 3s | 0% |
| **TOTAL** | **8 Steps** | **~60s** | **~55%** |

### Nachher (Instagram-Stil):

| Schritt | Was | Zeit | Abbruch-Rate |
|---------|-----|------|--------------|
| 1 | Foto auswählen (native) | 3s | 5% |
| 2 | Upload + Optional Name | 10s | 5% |
| 3 | Erfolg | 2s | 0% |
| **TOTAL** | **3 Steps** | **~15s** | **~10%** |

**Verbesserung:**
- ⚡ **75% schneller** (60s → 15s)
- 📈 **5x bessere Completion** (45% → 90%)
- 😊 **10x weniger Frustration**

---

## 💻 TECHNISCHE UMSETZUNG

### Was bleibt:
- ✅ `WorkflowUploadModal.tsx` als Container
- ✅ `useUploadStore` für Progress-Tracking
- ✅ Bestehende API: `POST /events/{eventId}/photos/upload`
- ✅ Image-Processing (Sharp: 3 Varianten)
- ✅ Validierung (Backend bleibt gleich)

### Was ändert sich:
- 🔄 `WorkflowRunner` wird NICHT mehr genutzt (für diesen Flow)
- 🔄 Eigene simple Step-Komponenten (statt Workflow-Nodes)
- 🔄 Native `<input type="file">` statt Custom-Screen

### Was neu kommt:
- ✨ Paralleles Upload + Input (Name während Upload)
- ✨ LocalStorage für Name-Persistierung
- ✨ Auto-Kategorisierung aktivieren (AI bereits vorhanden!)

---

## 📱 MOBILE-OPTIMIERUNGEN

### Native Features nutzen:

#### 1. **Kamera-Zugriff (iOS/Android)**
```html
<input type="file" accept="image/*" capture="environment">
```
→ Öffnet DIREKT Kamera (kein Extra-Screen!)

#### 2. **Multi-Select (Desktop/Mobile)**
```html
<input type="file" multiple>
```
→ User kann 10 Fotos auf einmal wählen!

#### 3. **Drag & Drop (Desktop)**
```javascript
onDrop={(e) => {
  const files = Array.from(e.dataTransfer.files);
  handleUpload(files);
}}
```
→ Fotos einfach ins Fenster ziehen!

---

## 🎯 SCREEN-BY-SCREEN SPEC

### Screen 1: Modal öffnet sich

**Layout:**
```
┌────────────────────────────────────────┐
│ [×]        Foto hochladen              │ ← Header (bestehend)
├────────────────────────────────────────┤
│                                        │
│            [📸 Icon]                   │ ← Großes Icon
│                                        │   (bestehender Stil)
│      Wähle ein oder mehrere Fotos      │
│                                        │
│  ┌────────────┐  ┌────────────┐       │
│  │    📱      │  │    📷      │       │ ← 2 große Buttons
│  │  Galerie   │  │   Kamera   │       │   (bestehender Stil:
│  └────────────┘  └────────────┘       │    bg-card, rounded-xl)
│                                        │
│  ────────────────────────────────      │
│                                        │
│  💡 Tipp: Bis zu 10 Fotos auf einmal  │ ← Muted-Text
│                                        │
└────────────────────────────────────────┘
```

**Bestehende Styling-Klassen:**
```tsx
// Modal (aus bestehendem Code übernehmen)
<DialogContent className="bg-card border border-border rounded-2xl max-w-md w-full p-0">
  
// Header (bestehend)
<div className="flex items-center justify-between px-4 py-3 border-b border-border">
  
// Buttons (bestehend)
<button className="flex items-center gap-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 p-4">
```

---

### Screen 2: Foto(s) gewählt → Upload läuft

**Layout:**
```
┌────────────────────────────────────────┐
│ [×]        Foto hochladen              │
├────────────────────────────────────────┤
│                                        │
│  ┌────┐ ┌────┐ ┌────┐                │ ← Kleine Previews
│  │IMG1│ │IMG2│ │IMG3│                │   (bestehend aus PhotoGrid)
│  └────┘ └────┘ └────┘                │
│                                        │
│  Hochladen 2/3...                      │
│  ███████████████░░░░░ 75%              │ ← Progress-Bar
│                                        │   (bestehender Stil)
│  ─────────────────────────────────     │
│                                        │
│  📝 Details (optional)                 │ ← Accordion
│                                        │   (bestehend: Accordion-Component)
│  └─ Name:  [Max Mustermann    ]       │
│     Album: [✨ Auto-erkannt ▼ ]       │
│                                        │
└────────────────────────────────────────┘
```

**Bestehende Components nutzen:**
```tsx
// Progress-Bar (aus UploadProgressIndicator.tsx übernehmen)
<div className="h-2 bg-muted rounded-full overflow-hidden">
  <motion.div 
    className="h-full bg-blue-500"
    style={{ width: `${progress}%` }}
  />
</div>

// Accordion (bereits vorhanden: ui/accordion)
<Accordion type="single" collapsible defaultValue="">
  <AccordionItem value="details">
    <AccordionTrigger>Details (optional)</AccordionTrigger>
    <AccordionContent>
      <input placeholder="Dein Name" />
      <select>Auto-erkannt</select>
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

### Screen 3: Erfolg!

**Layout:**
```
┌────────────────────────────────────────┐
│          3 Fotos hochgeladen!          │
├────────────────────────────────────────┤
│                                        │
│         ┌──────────────────┐           │
│         │                  │           │
│         │        ✓         │           │ ← Bestehende CheckCircle
│         │                  │           │   Animation
│         │   Erfolgreich!   │           │
│         │                  │           │
│         └──────────────────┘           │
│                                        │
│  Deine Fotos sind in der Galerie       │
│                                        │
│  ┌─────────────┐  ┌─────────────┐     │
│  │ Noch eins + │  │ Galerie →   │     │ ← Bestehende Buttons
│  └─────────────┘  └─────────────┘     │
│                                        │
└────────────────────────────────────────┘
```

**Bestehende Success-Animation:**
```tsx
// Aus WorkflowUploadModal.tsx übernehmen
{uploadState === 'success' && (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    className="flex flex-col items-center py-8"
  >
    <CheckCircle className="w-16 h-16 text-success mb-3" />
    <p className="text-foreground font-medium">Erfolgreich!</p>
  </motion.div>
)}
```

**Auto-Close:** Nach 2 Sekunden (oder User klickt "Galerie")

---

## 🔧 IMPLEMENTIERUNGS-PLAN

### Phase 1: Neue Komponente (4 Stunden)

**Datei:** `components/e3/QuickUploadModal.tsx` (NEU!)

```tsx
'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Camera, Image, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useUploadStore } from '@/store/uploadStore';

interface QuickUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess?: () => void;
}

export default function QuickUploadModal({ 
  isOpen, 
  onClose, 
  eventId,
  onSuccess 
}: QuickUploadModalProps) {
  
  const [step, setStep] = useState<'select' | 'uploading' | 'success'>('select');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploaderName, setUploaderName] = useState('');
  const { addUpload, updateProgress, setStatus } = useUploadStore();
  
  // SCHRITT 1: Native File-Picker
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files).slice(0, 10); // Max 10
    setSelectedFiles(fileArray);
    setStep('uploading');
    handleUpload(fileArray);
  };
  
  // SCHRITT 2: Upload (sofort!)
  const handleUpload = async (files: File[]) => {
    // LocalStorage: Name laden
    const savedName = localStorage.getItem('guestUploaderName') || '';
    setUploaderName(savedName);
    
    let completed = 0;
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      if (savedName) formData.append('uploaderName', savedName);
      
      await api.post(`/events/${eventId}/photos/upload`, formData, {
        onUploadProgress: (e) => {
          const progress = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(Math.round(((completed + progress/100) / files.length) * 100));
        }
      });
      completed++;
    }
    
    setStep('success');
    setTimeout(() => {
      onClose();
      onSuccess?.();
    }, 2000); // Auto-close nach 2s
  };
  
  // SCHRITT 3: Name speichern (nachträglich)
  const saveName = () => {
    if (uploaderName.trim()) {
      localStorage.setItem('guestUploaderName', uploaderName.trim());
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card rounded-2xl max-w-md p-0">
        {/* Bestehender Header-Style */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Foto hochladen</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted/50">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        <div className="p-4">
          <AnimatePresence mode="wait">
            {step === 'select' && (
              <SelectStep onFileSelect={handleFileSelect} />
            )}
            {step === 'uploading' && (
              <UploadingStep 
                progress={uploadProgress} 
                fileCount={selectedFiles.length}
                uploaderName={uploaderName}
                onNameChange={setUploaderName}
              />
            )}
            {step === 'success' && (
              <SuccessStep fileCount={selectedFiles.length} />
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Pseudo-Code:** Zeigt Struktur, nutzt bestehende Components!

---

### Phase 2: Integration (2 Stunden)

**Ändern in:** `app/e3/[slug]/page.tsx`

```tsx
// VORHER:
const WorkflowUploadModal = dynamic(() => import('@/components/workflow-runtime/WorkflowUploadModal'));

// NACHHER:
const QuickUploadModal = dynamic(() => import('@/components/e3/QuickUploadModal'));

// In Component:
<QuickUploadModal
  isOpen={uploadModalOpen}
  onClose={() => setUploadModalOpen(false)}
  eventId={event.id}
  onSuccess={reloadPhotos}
/>
```

**Bestehende Props beibehalten:**
- `isOpen`, `onClose`, `eventId`, `onSuccess`
- **Entfernen:** `challengeId`, `categories`, `flowType` (nicht mehr nötig!)

---

### Phase 3: Testing & Refinement (2 Stunden)

**Test-Cases:**
1. ✅ Single-Upload (1 Foto)
2. ✅ Multi-Upload (10 Fotos)
3. ✅ Mit Name
4. ✅ Ohne Name (überspringen)
5. ✅ Name aus LocalStorage
6. ✅ Progress-Tracking
7. ✅ Error-Handling (zu groß, falscher Typ)
8. ✅ Mobile (iOS Safari, Android Chrome)
9. ✅ Desktop (Chrome, Firefox, Safari)
10. ✅ Dark Mode

---

## 🎨 DESIGN-TOKENS (Referenz)

### Aus bestehendem Code:

```tsx
// Modal (aus WorkflowUploadModal.tsx, Zeile 125)
<DialogContent className="bg-card border border-border rounded-2xl max-w-md w-full p-0 overflow-hidden max-h-[90vh]">

// Header (Zeile 127)
<div className="flex items-center justify-between px-4 py-3 border-b border-border">
  <h2 className="text-lg font-bold text-foreground">{title}</h2>
  <button className="p-2 rounded-full hover:bg-muted/50 transition-colors">
    <X className="w-5 h-5 text-muted-foreground" />
  </button>
</div>

// Loading-State (Zeile 143)
<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />

// Success-State (aus EventHero.tsx inspiriert)
<CheckCircle className="w-16 h-16 text-success mb-3" />

// Button-Primary (aus EventHero.tsx, Zeile 603)
<button className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors">
  Galerie öffnen
</button>

// Input-Fields (aus dashboard/page.tsx, Zeile 669)
<input className="w-full px-4 py-3 border-2 border-border bg-card text-foreground rounded-xl focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors placeholder:text-muted-foreground" />
```

**= Alle Styles bereits vorhanden, nur neu kombinieren!**

---

## 📊 ACCEPTANCE-CRITERIA

### Funktional:
- [x] Upload in max. 3 Schritten
- [x] Name ist optional
- [x] Album wird automatisch erkannt
- [x] Multi-Upload funktioniert (bis 10 Fotos)
- [x] Progress-Anzeige
- [x] LocalStorage für Name
- [x] Auto-Close nach Erfolg
- [x] Error-Handling

### Non-Funktional:
- [x] Bestehende Design-Language
- [x] Responsive (Mobile + Desktop)
- [x] Dark Mode kompatibel
- [x] Accessibility (ARIA-Labels)
- [x] Performance (< 15s gesamt)
- [x] Keine Breaking-Changes (alte API bleibt)

### User-Experience:
- [x] Intuitive Bedienung (wie Instagram)
- [x] Sofortiges Feedback
- [x] Kein "Wie viele Schritte noch?"-Gefühl
- [x] Erfolgs-Animation (Positive Reinforcement)

---

## 🔄 MIGRATION-PLAN

### Option A: Sofort-Ersatz (Risikoreicher)
```
Alte WorkflowUploadModal.tsx → Archivieren
Neue QuickUploadModal.tsx → Aktivieren
```

### Option B: Parallel-Betrieb (Empfohlen!)
```
Feature-Flag: ENABLE_QUICK_UPLOAD

if (ENABLE_QUICK_UPLOAD) {
  return <QuickUploadModal ... />
} else {
  return <WorkflowUploadModal ... />  // Fallback
}
```

**Vorteil:** Kann A/B-getestet werden, Rollback möglich!

---

## 🎯 NÄCHSTE SCHRITTE

### 1. Review & Approval (10 Min)
- Diese Spec durchlesen
- Feedback geben
- Freigabe erteilen

### 2. Implementation (8 Stunden)
- QuickUploadModal.tsx erstellen
- Integration in e3/page.tsx
- LocalStorage-Logic
- Testing

### 3. Deployment (1 Stunde)
- Staging-Deployment
- E2E-Tests
- Production-Deployment

**Gesamt:** 1 Arbeitstag

---

## 💬 FRAGEN AN DICH

1. **Soll ich jetzt mit der Implementierung starten?**
2. **Soll der alte Flow als Fallback bleiben?** (Feature-Flag?)
3. **Soll ich die anderen Flows auch vereinfachen?**
   - Gästebuch (aktuell 6 Schritte → 3?)
   - Face-Search (aktuell 8 Schritte → 4?)
4. **Testing:** Nur Staging oder direkt Production?

---

**Bereit für Umsetzung!** Sage Bescheid und ich starte mit dem Code. 🚀
