# ✅ TODO-Liste für Opus/Windsurf - Upload-Flow Optimierung

**Projekt:** Gästefotos Upload-Flow Redesign  
**Ziel:** Instagram-Stil (2-3 Schritte) + Bulk-Upload (100 Fotos)  
**Assignee:** Opus/Windsurf  
**Geschätzter Aufwand:** 8-10 Stunden  
**Priorität:** 🔴 P0 (Höchste Priorität)

---

## 📋 HAUPTAUFGABEN

### 🔴 TASK 1: Neue QuickUploadModal-Komponente erstellen

**Datei:** `packages/frontend/src/components/e3/QuickUploadModal.tsx` (NEU!)

**Anforderungen:**
- [ ] Neue Datei erstellen
- [ ] TypeScript + React Functional Component
- [ ] Framer Motion für Animationen
- [ ] 3 States: 'select' | 'uploading' | 'success'
- [ ] Native HTML5 File-Input (`<input type="file" multiple>`)
- [ ] Max 100 Fotos
- [ ] Bestehende Design-Tokens nutzen (bg-card, rounded-2xl, etc.)

**Design-Vorgaben:**
```typescript
// Bestehende Components/Styles nutzen:
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Camera, Image, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

// Styling (aus bestehendem Code übernehmen):
// - Modal: bg-card rounded-2xl max-w-md
// - Header: border-b border-border px-4 py-3
// - Buttons: bg-blue-500 hover:bg-blue-600 rounded-lg
// - Inputs: border-2 border-border bg-card text-foreground rounded-xl
```

**Acceptance-Criteria:**
- [ ] Modal öffnet/schließt smooth (Framer Motion)
- [ ] File-Input erlaubt image/* und video/*
- [ ] Multiple-Attribut aktiv
- [ ] Drag & Drop funktioniert (Desktop)
- [ ] Dark Mode kompatibel
- [ ] Responsive (Mobile + Desktop)

**Zeit:** 4 Stunden

---

### 🔴 TASK 2: Schritt 1 - Foto-Auswahl implementieren

**Screen:** "Wähle Fotos aus"

**Sub-Tasks:**
- [ ] 2 große Buttons: "Galerie" | "Kamera"
- [ ] Galerie-Button öffnet File-Picker (multiple)
- [ ] Kamera-Button öffnet File-Picker mit `capture="environment"`
- [ ] Hinweis-Text: "Bis zu 100 Fotos auf einmal"
- [ ] Icon-Größe: w-12 h-12 (bestehender Stil)
- [ ] Button-Style: bg-card hover:bg-muted/50 p-4 rounded-xl

**Code-Referenz:**
```tsx
// Button-Design aus EventHero.tsx übernehmen
<button className="flex items-center gap-3 p-4 bg-background hover:bg-background rounded-xl transition-colors">
  <div className="w-10 h-10 rounded-full bg-foreground/70 flex items-center justify-center">
    <Camera className="w-5 h-5 text-white" />
  </div>
  <span className="font-medium text-foreground">Kamera</span>
</button>

// Native File-Input (versteckt)
<input 
  ref={fileInputRef}
  type="file"
  accept="image/*,video/*"
  multiple
  capture="environment"
  onChange={handleFileSelect}
  className="hidden"
/>
```

**Acceptance-Criteria:**
- [ ] Buttons visuell konsistent mit bestehendem Design
- [ ] File-Picker öffnet sich (native)
- [ ] Bis zu 100 Dateien auswählbar
- [ ] Nach Auswahl → Automatisch zu Schritt 2

**Zeit:** 1 Stunde

---

### 🔴 TASK 3: Schritt 2 - Upload-Logik mit Parallel-Upload

**Screen:** "Upload läuft..."

**Sub-Tasks:**
- [ ] Paralleler Upload (5 gleichzeitig)
- [ ] Gesamt-Progress-Bar
- [ ] Detail-Progress (aktuelles Foto)
- [ ] Datei-Counter: "Uploading 23/47..."
- [ ] LocalStorage: Name laden/speichern
- [ ] Optional: Name-Input (während Upload)
- [ ] Optional: Album-Anzeige "✨ Auto-erkannt"

**Parallel-Upload-Logic:**
```typescript
async function uploadMultipleFiles(files: File[], eventId: string) {
  const BATCH_SIZE = 5; // 5 parallel
  const results: PromiseSettledResult<any>[] = [];
  
  // LocalStorage: Name
  const savedName = localStorage.getItem('guestUploaderName') || '';
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (file, batchIdx) => {
        const globalIdx = i + batchIdx;
        const formData = new FormData();
        formData.append('file', file);
        if (savedName) formData.append('uploaderName', savedName);
        
        // Upload
        const response = await api.post(
          `/events/${eventId}/photos/upload`, 
          formData, 
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const fileProgress = Math.round(
                (progressEvent.loaded * 100) / (progressEvent.total || 1)
              );
              updateFileProgress(globalIdx, fileProgress);
              
              // Gesamt-Progress berechnen
              const totalProgress = calculateTotalProgress();
              setTotalProgress(totalProgress);
            }
          }
        );
        
        return { success: true, index: globalIdx };
      })
    );
    
    results.push(...batchResults);
  }
  
  // Auswertung
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  return { successful, failed, total: files.length };
}
```

**State-Management:**
```typescript
const [files, setFiles] = useState<File[]>([]);
const [uploadProgress, setUploadProgress] = useState<number>(0);
const [fileProgress, setFileProgress] = useState<Record<number, number>>({});
const [uploaderName, setUploaderName] = useState('');
const [uploadResults, setUploadResults] = useState<{
  successful: number;
  failed: number;
  total: number;
} | null>(null);
```

**Progress-Berechnung:**
```typescript
function calculateTotalProgress(): number {
  const completed = Object.values(fileProgress).reduce((sum, p) => sum + p, 0);
  return Math.round(completed / files.length);
}
```

**Acceptance-Criteria:**
- [ ] 5 Uploads laufen parallel
- [ ] Progress-Bar zeigt Gesamt-Fortschritt
- [ ] Aktuelles Foto wird angezeigt
- [ ] Fehler blockieren nicht anderen Uploads
- [ ] Name aus LocalStorage vorausgefüllt
- [ ] Name-Änderung während Upload möglich
- [ ] Bei Upload-Fehler: Einzelne Dateien retry-fähig

**Zeit:** 3 Stunden

---

### 🔴 TASK 4: Schritt 3 - Success-Screen

**Screen:** "Erfolgreich!"

**Sub-Tasks:**
- [ ] Success-Animation (CheckCircle mit Framer Motion)
- [ ] Zusammenfassung: "47 Fotos hochgeladen!"
- [ ] Fehler-Hinweis (falls welche): "3 Fotos konnten nicht hochgeladen werden"
- [ ] 2 CTAs: "Noch eins" | "Zur Galerie"
- [ ] Auto-Close nach 2 Sekunden (oder User klickt)

**Code-Referenz:**
```tsx
// Success-Animation (aus WorkflowUploadModal übernehmen)
{uploadState === 'success' && (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', duration: 0.5 }}
    className="flex flex-col items-center py-8"
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <CheckCircle className="w-16 h-16 text-success mb-3" />
    </motion.div>
    
    <p className="text-foreground font-semibold text-lg mb-1">
      {uploadResults?.successful} Fotos hochgeladen!
    </p>
    
    {uploadResults?.failed > 0 && (
      <p className="text-muted-foreground text-sm">
        {uploadResults.failed} konnten nicht hochgeladen werden
      </p>
    )}
    
    <div className="flex gap-3 mt-6">
      <button 
        onClick={handleReset}
        className="px-4 py-2 bg-muted hover:bg-muted/70 rounded-lg"
      >
        Noch eins
      </button>
      <button 
        onClick={handleClose}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
      >
        Zur Galerie →
      </button>
    </div>
  </motion.div>
)}
```

**Acceptance-Criteria:**
- [ ] Animation smooth
- [ ] Erfolgs-Zahl korrekt
- [ ] Fehler werden angezeigt (falls vorhanden)
- [ ] Auto-Close nach 2s
- [ ] Buttons funktionieren

**Zeit:** 1 Stunde

---

### 🟡 TASK 5: Integration in Event-Seite

**Datei:** `packages/frontend/src/app/e3/[slug]/page.tsx`

**Sub-Tasks:**
- [ ] Import: `import QuickUploadModal from '@/components/e3/QuickUploadModal'`
- [ ] Ersetze `WorkflowUploadModal` durch `QuickUploadModal`
- [ ] Props anpassen (challengeId/categories nicht mehr nötig)
- [ ] onSuccess-Callback beibehalten (`reloadPhotos()`)

**Code-Änderung:**
```typescript
// VORHER (Zeile 49, 651-668):
const WorkflowUploadModal = dynamic(() => import('@/components/workflow-runtime/WorkflowUploadModal'));

<WorkflowUploadModal
  isOpen={uploadModalOpen}
  onClose={() => {
    setUploadModalOpen(false);
    setUploadChallengeId(null);
    setUploadChallengeTitle(null);
  }}
  eventId={event?.id || ''}
  categories={categories.map(c => ({ id: c.id, name: c.name }))}
  challengeId={uploadChallengeId}
  challengeTitle={uploadChallengeTitle}
  onUploadSuccess={() => {
    reloadPhotos();
    setUploadChallengeId(null);
    setUploadChallengeTitle(null);
  }}
  flowType={uploadChallengeTitle === 'KI Foto-Stil' ? 'KI_KUNST' : 'UPLOAD'}
/>

// NACHHER:
const QuickUploadModal = dynamic(() => import('@/components/e3/QuickUploadModal'));

<QuickUploadModal
  isOpen={uploadModalOpen}
  onClose={() => setUploadModalOpen(false)}
  eventId={event?.id || ''}
  onSuccess={reloadPhotos}
/>
```

**Acceptance-Criteria:**
- [ ] Modal öffnet sich bei Kamera-Button
- [ ] Upload funktioniert
- [ ] Galerie aktualisiert sich nach Upload
- [ ] Keine Console-Errors
- [ ] Keine Breaking-Changes

**Zeit:** 30 Minuten

---

### 🟡 TASK 6: Backend Rate-Limit anpassen

**Datei:** `packages/backend/src/middleware/rateLimit.ts`

**Sub-Tasks:**
- [ ] `uploadLimiter` max erhöhen: 200 → 500
- [ ] Kommentar hinzufügen: "Erhöht für Bulk-Uploads (100 Fotos)"

**Code-Änderung (Zeile 73-79):**
```typescript
// VORHER:
export const uploadLimiter: any = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 200, // 200 Uploads pro Stunde
  message: 'Zu viele Uploads, bitte versuchen Sie es später erneut.',
});

// NACHHER:
export const uploadLimiter: any = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 500, // ← Erhöht für Bulk-Uploads (bis zu 100 Fotos)
  message: 'Upload-Limit erreicht. Bitte in einer Stunde erneut versuchen.',
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Acceptance-Criteria:**
- [ ] Rate-Limit auf 500/h erhöht
- [ ] Keine anderen Limiter betroffen
- [ ] Backend-Tests erfolgreich

**Zeit:** 10 Minuten

---

### 🟡 TASK 7: Workflow maxFiles erhöhen (Falls Fallback bleibt)

**Datei:** `packages/backend/prisma/seeds/workflows.ts` (Zeile 84)

**Sub-Tasks:**
- [ ] maxFiles: 10 → 100 ändern

**Code-Änderung:**
```typescript
// VORHER (Zeile 84):
node('u4', 'TAKE_PHOTO', 'Fotos auswählen', 840, 100, { 
  captureMode: 'multi', 
  maxFiles: 10 
}),

// NACHHER:
node('u4', 'TAKE_PHOTO', 'Fotos auswählen', 840, 100, { 
  captureMode: 'multi', 
  maxFiles: 100  // ← Erhöht für Bulk-Uploads
}),
```

**Dann DB-Seed laufen lassen:**
```bash
cd packages/backend
pnpm prisma db seed
```

**Acceptance-Criteria:**
- [ ] Workflow-Definition aktualisiert
- [ ] DB geseedet
- [ ] Alter Flow (falls genutzt) erlaubt 100 Fotos

**Zeit:** 15 Minuten

---

### 🟢 TASK 8: Error-Handling & Retry-Logic

**In:** `QuickUploadModal.tsx`

**Sub-Tasks:**
- [ ] Promise.allSettled nutzen (statt Promise.all)
- [ ] Fehler einzeln tracken
- [ ] Fehlgeschlagene Uploads anzeigen
- [ ] "Erneut versuchen"-Button für Fehler
- [ ] Error-Types unterscheiden:
  - Zu groß (> 50MB)
  - Falscher Typ (nicht Bild/Video)
  - Netzwerk-Fehler
  - Server-Fehler (500)

**Code-Pattern:**
```typescript
const results = await Promise.allSettled(uploads);

const successful = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');

// Fehler analysieren
const errors = failed.map((r, idx) => {
  const error = r.reason?.response?.data?.error || 'Unbekannter Fehler';
  return {
    fileIndex: idx,
    fileName: files[idx].name,
    error,
    retryable: !error.includes('zu groß') && !error.includes('Dateityp')
  };
});

// UI: Fehler anzeigen + Retry-Option
{errors.length > 0 && (
  <div className="mt-4 space-y-2">
    <p className="text-sm font-medium text-destructive">
      {errors.length} Fotos konnten nicht hochgeladen werden:
    </p>
    {errors.map(e => (
      <div key={e.fileIndex} className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground truncate">{e.fileName}</span>
        {e.retryable && (
          <button 
            onClick={() => retryUpload(e.fileIndex)}
            className="text-blue-500 hover:underline"
          >
            Erneut versuchen
          </button>
        )}
      </div>
    ))}
  </div>
)}
```

**Acceptance-Criteria:**
- [ ] Einzelne Fehler blockieren nicht Gesamt-Upload
- [ ] Fehler werden klar angezeigt
- [ ] Retry funktioniert
- [ ] User versteht, warum Fehler (zu groß, falscher Typ, etc.)

**Zeit:** 2 Stunden

---

### 🟢 TASK 9: Progress-Anzeige optimieren

**In:** `QuickUploadModal.tsx`

**Sub-Tasks:**
- [ ] Gesamt-Progress-Bar (0-100%)
- [ ] File-Counter: "23/47 Fotos"
- [ ] Aktuelles Foto: Dateiname + Individual-Progress
- [ ] Zeit-Schätzung: "Noch ca. 2 Minuten..."
- [ ] Thumbnails der hochzuladenden Fotos (optional)

**UI-Design:**
```tsx
<div className="space-y-4">
  {/* Gesamt-Progress */}
  <div>
    <div className="flex items-center justify-between text-sm mb-2">
      <span className="text-foreground font-medium">
        Uploading {completed}/{total} Fotos...
      </span>
      <span className="text-muted-foreground">{totalProgress}%</span>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <motion.div 
        className="h-full bg-blue-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${totalProgress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  </div>
  
  {/* Zeit-Schätzung */}
  <p className="text-xs text-muted-foreground">
    ⏱️ Noch ca. {estimatedTimeRemaining} Sekunden...
  </p>
  
  {/* Detail: Aktuell hochzuladende Fotos */}
  <div className="space-y-1">
    {currentBatch.map((file, idx) => (
      <div key={idx} className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground truncate flex-1">
          📸 {file.name}
        </span>
        <span className="text-muted-foreground">
          {fileProgress[idx] || 0}%
        </span>
      </div>
    ))}
  </div>
</div>
```

**Zeit-Schätzung-Logic:**
```typescript
const avgTimePerFile = 6; // Sekunden (basierend auf bisherigen Uploads)
const remainingFiles = total - completed;
const estimatedTimeRemaining = remainingFiles * avgTimePerFile / BATCH_SIZE;
```

**Acceptance-Criteria:**
- [ ] Progress-Bar smooth (keine Sprünge)
- [ ] File-Counter korrekt
- [ ] Zeit-Schätzung realistisch (±20%)
- [ ] UI bleibt responsive (kein Freezing)

**Zeit:** 1.5 Stunden

---

### 🟢 TASK 10: LocalStorage für Name-Persistierung

**Sub-Tasks:**
- [ ] Beim Upload: Name speichern
- [ ] Beim Modal-Öffnen: Name laden
- [ ] Input vorausfüllen
- [ ] User kann ändern (nicht locked)

**Code:**
```typescript
// Laden (beim Modal-Open)
useEffect(() => {
  if (isOpen) {
    const savedName = localStorage.getItem('guestUploaderName') || '';
    setUploaderName(savedName);
  }
}, [isOpen]);

// Speichern (nach Upload)
const saveName = () => {
  if (uploaderName.trim()) {
    localStorage.setItem('guestUploaderName', uploaderName.trim());
  }
};

// Im Success-Callback
handleWorkflowComplete: async () => {
  // ... upload logic ...
  saveName();
  setUploadState('success');
}
```

**Acceptance-Criteria:**
- [ ] Name wird gespeichert
- [ ] Name wird beim nächsten Upload geladen
- [ ] Leerer Name wird nicht gespeichert
- [ ] User kann ändern/löschen

**Zeit:** 30 Minuten

---

### 🟢 TASK 11: Auto-Kategorisierung aktivieren

**Backend-Code:** Bereits vorhanden! (`selectSmartCategoryId`)

**Frontend-Task:**
- [ ] NICHT mehr Album-Auswahl-Step anzeigen
- [ ] Backend entscheidet automatisch
- [ ] Optional: Anzeige "Album: ✨ Automatisch erkannt"

**Code:**
```typescript
// FormData OHNE categoryId senden
const formData = new FormData();
formData.append('file', file);
formData.append('uploaderName', uploaderName);
// categoryId wird NICHT gesendet → Backend nutzt AI!

// Optional: Anzeige im UI
<div className="text-xs text-muted-foreground">
  Album: ✨ Wird automatisch erkannt
</div>
```

**Acceptance-Criteria:**
- [ ] Kein Album-Auswahl-Step mehr
- [ ] Backend-AI funktioniert (bereits getestet)
- [ ] Fotos landen im korrekten Album

**Zeit:** 15 Minuten

---

## 🧪 TESTING-CHECKLISTE

### Funktional:
- [ ] Single-Upload funktioniert (1 Foto)
- [ ] Multi-Upload funktioniert (10 Fotos)
- [ ] Bulk-Upload funktioniert (50 Fotos)
- [ ] Max-Test (100 Fotos)
- [ ] Stress-Test (100 Fotos á 10MB = 1GB)
- [ ] Error-Handling (zu große Datei, falscher Typ)
- [ ] Parallel-Upload (5 gleichzeitig)
- [ ] Progress-Anzeige korrekt
- [ ] LocalStorage (Name-Persistierung)
- [ ] Auto-Kategorisierung (AI)

### Browser-Compatibility:
- [ ] Chrome (Desktop)
- [ ] Safari (Desktop)
- [ ] Firefox (Desktop)
- [ ] Chrome (Android)
- [ ] Safari (iOS)
- [ ] Edge (Desktop)

### Responsive:
- [ ] Mobile (320px-480px)
- [ ] Tablet (768px-1024px)
- [ ] Desktop (1920px+)

### Theme:
- [ ] Light Mode
- [ ] Dark Mode
- [ ] System-Präferenz

### Performance:
- [ ] 10 Fotos: < 30s
- [ ] 50 Fotos: < 2 Min
- [ ] 100 Fotos: < 5 Min
- [ ] Kein Browser-Freeze
- [ ] Memory-Leak-Check (100 Fotos)

---

## 📁 DATEIEN ZU ERSTELLEN/ÄNDERN

### Neu erstellen:
1. ✅ `packages/frontend/src/components/e3/QuickUploadModal.tsx`

### Zu ändern:
2. ✅ `packages/frontend/src/app/e3/[slug]/page.tsx` (Integration)
3. ✅ `packages/backend/src/middleware/rateLimit.ts` (Limit erhöhen)
4. ✅ `packages/backend/prisma/seeds/workflows.ts` (maxFiles erhöhen)

**Total:** 1 neue Datei, 3 Änderungen

---

## 🎯 ACCEPTANCE-CRITERIA (Gesamt)

### Must-Have:
- [x] Upload-Flow: 8 Schritte → 2-3 Schritte
- [x] Max-Fotos: 10 → 100
- [x] Paralleler Upload: 5 gleichzeitig
- [x] Native File-Picker (kein Custom-Screen)
- [x] Name optional (aus LocalStorage)
- [x] Auto-Kategorisierung (AI)
- [x] Progress-Anzeige (Gesamt + Details)
- [x] Error-Handling (einzelne Fehler)
- [x] Bestehende Design-Language
- [x] Dark Mode kompatibel

### Nice-to-Have (später):
- [ ] Background-Upload (Service-Worker)
- [ ] Drag & Drop (Desktop)
- [ ] Thumbnail-Preview vor Upload
- [ ] Batch-Upload-Endpoint (Backend)
- [ ] Resume bei Verbindungsabbruch

---

## 📊 ZEIT-SCHÄTZUNG

| Task | Aufwand | Priorität |
|------|---------|-----------|
| TASK 1: QuickUploadModal erstellen | 4h | 🔴 P0 |
| TASK 2: Foto-Auswahl Screen | 1h | 🔴 P0 |
| TASK 3: Upload-Logic (Parallel) | 3h | 🔴 P0 |
| TASK 4: Success-Screen | 1h | 🔴 P0 |
| TASK 5: Integration | 0.5h | 🔴 P0 |
| TASK 6: Backend Rate-Limit | 0.25h | 🟡 P1 |
| TASK 7: Workflow maxFiles | 0.25h | 🟡 P1 |
| TASK 8: Error-Handling | 2h | 🟡 P1 |
| TASK 9: Progress optimieren | 1.5h | 🟢 P2 |
| TASK 10: LocalStorage | 0.5h | 🟢 P2 |
| TASK 11: Auto-Kategorisierung | 0.25h | 🟢 P2 |

**TOTAL:** ~10 Stunden (1.25 Arbeitstage)

**P0 (Must-Have):** 9.5 Stunden  
**P1 (Should-Have):** 2.5 Stunden  
**P2 (Nice-to-Have):** 2.25 Stunden

---

## 🚀 DEPLOYMENT-PLAN

### 1. Development (lokal)
```bash
cd /root/gaestefotos-app-v2/packages/frontend
pnpm dev

# Testen unter: http://localhost:3000/e3/test-event
```

### 2. Staging
```bash
./scripts/deploy-staging.sh

# E2E-Tests:
pnpm e2e

# Manuell testen:
# - 1 Foto Upload
# - 10 Fotos Upload
# - 50 Fotos Upload
# - 100 Fotos Upload (Stress-Test)
```

### 3. Production
```bash
# Nur Frontend (Backend-Änderung minimal)
./scripts/deploy-frontend-prod.sh

# Cloudflare-Cache leeren
./CLOUDFLARE_API_PURGE.sh
```

---

## 📋 CODE-QUALITÄTS-CHECKLISTE

### Vor Commit:
- [ ] ESLint: Keine Errors
- [ ] TypeScript: Keine Errors
- [ ] Prettier: Code formatiert
- [ ] Imports: Aufgeräumt (keine ungenutzten)
- [ ] Console.logs: Entfernt
- [ ] Comments: Sinnvolle Dokumentation

### Vor Deployment:
- [ ] Unit-Tests: Geschrieben (optional)
- [ ] E2E-Tests: Erstellt
- [ ] Performance-Test: 100 Fotos in < 5 Min
- [ ] Memory-Leak-Check: Kein Leak
- [ ] Accessibility: ARIA-Labels korrekt

---

## 🎯 SUCCESS-METRICS

### Nach Deployment messen:

| Metrik | Vorher | Ziel |
|--------|--------|------|
| Upload-Completion-Rate | 45% | 90% |
| Durchschnittliche Upload-Zeit | 60s | 15s |
| Fotos pro Upload (Durchschnitt) | 1.2 | 5+ |
| User-Zufriedenheit | 6/10 | 9/10 |
| Bulk-Uploads (50+) pro Tag | 0 | 10+ |

### Tracking:
```typescript
// Analytics-Event senden
analytics.track('upload_completed', {
  fileCount: files.length,
  totalSize: totalBytes,
  duration: uploadDuration,
  method: 'quick_upload',
  hadErrors: failedCount > 0,
});
```

---

## 📝 WICHTIGE HINWEISE FÜR WINDSURF

### ⚠️ NICHT ändern:
- Bestehende `WorkflowUploadModal.tsx` (als Fallback behalten!)
- Backend-API `/events/:eventId/photos/upload` (bleibt gleich!)
- Image-Processing (Sharp, 3 Varianten)
- Design-Tokens (Farben, Spacing, etc.)

### ✅ WIEDERVERWENDEN:
- `Dialog` Component (ui/dialog)
- `useUploadStore` Hook (store/uploadStore)
- Bestehende Icons (Lucide React)
- Bestehende Animationen (Framer Motion)
- Error-Messages (aus Backend-Responses)

### 🎨 DESIGN-KONSISTENZ:
- Alle Klassen aus bestehendem Code kopieren
- KEINE neuen Farben erfinden
- KEINE neuen Spacing-Werte
- Theme-Variablen nutzen (bg-card, text-foreground, etc.)

---

## 🐛 BEKANNTE ISSUES (Aus Audit)

### Aus Phase 2 (Logik-Audit):
- [ ] Race-Condition bei Concurrent-Uploads (Fix: Atomic-Increment)
- [ ] N+1 Query Problem (Fix: Composite-Index)

**Hinweis:** Diese betreffen Backend, nicht Frontend-Upload-Modal!

### Aus Phase 3 (Security-Audit):
- [ ] Magic-Byte-Validation fehlt (Backend)
- [ ] Virus-Scan ist Stub (Backend)

**Hinweis:** Nicht Teil dieser Upload-Flow-Optimierung!

---

## ✅ FINAL CHECKLIST VOR START

- [ ] Spec gelesen & verstanden
- [ ] Bestehenden Code analysiert (WorkflowUploadModal, Dialog, etc.)
- [ ] Design-Tokens notiert (Farben, Spacing)
- [ ] Test-Event verfügbar (für Testing)
- [ ] Node.js + pnpm installiert
- [ ] Branch erstellt: `feature/quick-upload-modal`

---

## 🚀 START-KOMMANDO FÜR WINDSURF

```bash
# 1. Branch erstellen
git checkout -b feature/quick-upload-modal

# 2. Frontend-Dev-Server starten
cd packages/frontend
pnpm dev

# 3. Neue Komponente erstellen
touch src/components/e3/QuickUploadModal.tsx

# 4. Los geht's! 🚀
```

---

**BEREIT FÜR IMPLEMENTIERUNG!**

Opus/Windsurf kann jetzt diese TODO-Liste Schritt für Schritt abarbeiten.

**Geschätzte Completion:** 10 Stunden  
**Erwarteter Impact:** 🔥🔥🔥🔥🔥 (2x mehr Uploads!)
