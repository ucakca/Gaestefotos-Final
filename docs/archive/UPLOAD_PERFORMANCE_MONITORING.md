# Upload Performance Monitoring

**Implementiert:** 2026-01-11  
**Feature:** Client-side Upload Metrics Tracking

---

## Überblick

Trackt Upload-Performance-Metriken im Browser (localStorage) für:
- **Bandwidth-Einsparung** durch Client-side Resize
- **Success/Failure Rate** der Uploads
- **Upload-Dauer** und File-Größen
- **Error-Debugging** (letzte 10 Fehlschläge)

**Kein Server-Traffic:** Alle Metriken bleiben client-side (Privacy-compliant).

---

## Implementierung

### 1. Tracking Library

**File:** `packages/frontend/src/lib/uploadMetrics.ts`

**Interface:**
```typescript
interface UploadMetric {
  originalSize: number;      // Originalgröße vor Resize
  resizedSize: number;       // Größe nach Resize
  duration: number;          // Upload-Dauer in ms
  success: boolean;          // Erfolg/Fehlschlag
  errorMessage?: string;     // Error-Message bei Fehlschlag
  fileType: string;          // MIME Type (z.B. "image/jpeg")
  timestamp: number;         // Unix Timestamp
}
```

**Funktionen:**
- `trackUpload(metric)` - Speichert Metrik (max 100 Einträge)
- `getUploadStats()` - Berechnet Statistiken
- `getRecentFailures(limit)` - Zeigt letzte Fehlschläge
- `clearMetrics()` - Löscht alle Metriken

### 2. Integration

**File:** `packages/frontend/src/components/UploadButton.tsx`

**Tracking-Punkte:**
1. **Bei Upload-Start:** Zeitmessung + Größen erfassen
2. **Bei Erfolg (Tus):** `trackUpload()` mit success=true
3. **Bei Erfolg (Fallback):** `trackUpload()` mit success=true
4. **Bei Fehlschlag:** `trackUpload()` mit success=false + errorMessage

**Code:**
```typescript
const startTime = Date.now();
const originalSize = originalFile.size;
const file = await resizeImageIfNeeded(originalFile);
const resizedSize = file.size;

// Bei Erfolg:
trackUpload({
  originalSize,
  resizedSize,
  duration: Date.now() - startTime,
  success: true,
  fileType: originalFile.type,
  timestamp: Date.now(),
});

// Bei Fehler:
trackUpload({
  originalSize,
  resizedSize,
  duration: Date.now() - startTime,
  success: false,
  errorMessage: error.message,
  fileType: originalFile.type,
  timestamp: Date.now(),
});
```

---

## Verwendung

### Stats abrufen (Browser Console)

```javascript
import { getUploadStats } from '@/lib/uploadMetrics';

const stats = getUploadStats();
console.log('Bandwidth Savings:', stats.bandwidthSavings.toFixed(1) + '%');
console.log('Success Rate:', stats.successRate.toFixed(1) + '%');
console.log('Avg Original Size:', (stats.avgOriginalSize / 1024 / 1024).toFixed(2) + ' MB');
console.log('Avg Resized Size:', (stats.avgResizedSize / 1024 / 1024).toFixed(2) + ' MB');
```

### Letzte Failures debuggen

```javascript
import { getRecentFailures } from '@/lib/uploadMetrics';

const failures = getRecentFailures(5);
failures.forEach(f => {
  console.log('Failed:', f.errorMessage, 'Size:', f.originalSize);
});
```

### Metriken löschen

```javascript
import { clearMetrics } from '@/lib/uploadMetrics';
clearMetrics();
```

---

## Beispiel-Statistiken

Nach 50 Uploads (Beispiel):

```json
{
  "totalUploads": 50,
  "successRate": 96.0,
  "failureRate": 4.0,
  "avgOriginalSize": 8388608,      // 8 MB
  "avgResizedSize": 1572864,       // 1.5 MB
  "bandwidthSavings": 81.25,       // 81.25% Einsparung!
  "avgDuration": 2340,             // 2.3 Sekunden
  "lastHour": {
    "uploads": 12,
    "successes": 12,
    "failures": 0
  }
}
```

**Interpretation:**
- Client-side Resize spart **81% Bandwidth** (8MB → 1.5MB)
- **96% Success Rate** (sehr stabil)
- Durchschnittliche Upload-Dauer: **2.3 Sekunden**
- Letzte Stunde: **100% Success** (12/12)

---

## Privacy & DSGVO

**✅ DSGVO-Compliant:**
- Alle Metriken bleiben im Browser (localStorage)
- Keine Übertragung zum Server
- Kein User-Tracking oder Identifikation
- User kann Metriken jederzeit via `clearMetrics()` löschen

**Storage:**
- Key: `gf_upload_metrics`
- Max 100 Einträge (FIFO)
- ~10KB Storage-Größe

---

## Zukünftige Erweiterungen (Optional)

### 1. Admin Dashboard Widget
```typescript
// packages/admin-dashboard/src/components/UploadStatsWidget.tsx
// Zeigt aggregierte Stats aus LocalStorage für Admin-Analyse
```

### 2. Sentry Integration
```typescript
// Optional: Bei hoher Failure-Rate automatisch Sentry Alert
if (stats.failureRate > 10) {
  Sentry.captureMessage('High upload failure rate', {
    level: 'warning',
    extra: { stats },
  });
}
```

### 3. Network Quality Detection
```typescript
// Erkennung langsamer Verbindungen → automatischer Tus-Switch
if (stats.avgDuration > 10000) {
  console.log('Slow network detected, using Tus resumable upload');
}
```

---

## Troubleshooting

**Problem:** Metriken werden nicht gespeichert

**Ursache:** LocalStorage full oder disabled

**Lösung:**
```typescript
// Check if localStorage available
if (typeof window !== 'undefined' && window.localStorage) {
  trackUpload(metric);
}
```

---

**Performance Monitoring ist jetzt live und sammelt Daten client-side.** 📊
