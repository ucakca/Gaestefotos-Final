# Neue API Endpoints - Dokumentation
**Version:** 2.0.1  
**Datum:** 23. Januar 2026

---

## 🎯 Co-Host Invitation System

### POST `/api/events/:eventId/cohosts/invite-token`
Erstellt einen Einladungs-Token für Co-Hosts.

**Auth:** Erforderlich (Host/Admin)

**Request Body:**
```json
{
  "email": "cohost@example.com"  // Optional: Email für direkten Versand
}
```

**Response:**
```json
{
  "ok": true,
  "eventId": "uuid",
  "inviteToken": "jwt-token",
  "shareUrl": "https://app.gästefotos.com/e2/event-slug?cohostInvite=token",
  "emailSent": true
}
```

**Features:**
- Token-Gültigkeit: 7 Tage (konfigurierbar via `COHOST_INVITE_TTL_SECONDS`)
- Automatischer Email-Versand wenn Email angegeben
- Share-URL mit eingebettetem Token

---

### GET `/api/events/:eventId/cohosts`
Listet alle Co-Hosts eines Events.

**Auth:** Erforderlich (Host/Co-Host/Admin)

**Response:**
```json
{
  "cohosts": [
    {
      "id": "uuid",
      "role": "COHOST",
      "permissions": {
        "canUpload": true,
        "canModerate": true,
        "canEditEvent": false,
        "canDownload": true
      },
      "createdAt": "2026-01-23T20:00:00Z",
      "user": {
        "id": "uuid",
        "name": "Max Mustermann",
        "email": "max@example.com",
        "role": "HOST"
      }
    }
  ]
}
```

---

### POST `/api/events/:eventId/cohosts`
Fügt einen Co-Host zum Event hinzu.

**Auth:** Erforderlich (Host/Admin)

**Request Body:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "cohost": {
    "id": "uuid",
    "role": "COHOST",
    "permissions": {},
    "user": { ... }
  }
}
```

**Validierung:**
- Feature muss im Package aktiviert sein
- Limit für Co-Hosts wird geprüft
- Host kann nicht als Co-Host hinzugefügt werden

---

### PUT `/api/events/:eventId/cohosts/:userId/permissions`
Aktualisiert die Berechtigungen eines Co-Hosts.

**Auth:** Erforderlich (Host/Admin)

**Request Body:**
```json
{
  "permissions": {
    "canUpload": true,
    "canModerate": false,
    "canEditEvent": false,
    "canDownload": true
  }
}
```

**Response:**
```json
{
  "ok": true,
  "cohost": { ... }
}
```

---

### DELETE `/api/events/:eventId/cohosts/:userId`
Entfernt einen Co-Host vom Event.

**Auth:** Erforderlich (Host/Admin)

**Response:**
```json
{
  "ok": true
}
```

---

## 📦 Bulk Download (Stream-based ZIP)

### POST `/api/events/:eventId/download/zip`
Lädt alle Fotos eines Events als ZIP-Datei herunter (gestreamt).

**Auth:** Erforderlich (Host/Co-Host/Admin)

**Request Body:**
```json
{
  "photoIds": ["uuid1", "uuid2"],  // Optional: Spezifische Fotos
  "categoryId": "uuid",             // Optional: Nach Kategorie filtern
  "dateFrom": "2026-01-20T00:00:00Z",  // Optional: Datum von
  "dateTo": "2026-01-23T23:59:59Z",    // Optional: Datum bis
  "includeVideos": false            // Optional: Videos einbeziehen
}
```

**Response:** Stream (application/zip)
- Content-Disposition: `attachment; filename="event-slug-photos-timestamp.zip"`
- Content-Type: `application/zip`

**Features:**
- Stream-based (kein Memory-Buffering)
- Compression Level: 6 (Balance Speed/Size)
- Unique Filenames: `0001_original-filename.jpg`
- Fehlertoleranz: Einzelne Fehler brechen Download nicht ab
- Progress Logging im Backend

**Performance:**
- ~6MB/s bei Level 6 Compression
- Geeignet für 1000+ Fotos ohne Memory-Issues

---

### GET `/api/events/:eventId/download/stats`
Zeigt Download-Statistiken für ein Event.

**Auth:** Erforderlich (Host/Co-Host/Admin)

**Response:**
```json
{
  "totalPhotos": 234,
  "totalVideos": 12,
  "totalSizeBytes": 1234567890,
  "categories": [
    {
      "id": "uuid",
      "name": "Zeremonie",
      "photoCount": 45
    }
  ]
}
```

---

## 📊 Analytics & Export

### GET `/api/events/:eventId/analytics`
Lädt Analytics-Daten als JSON.

**Auth:** Erforderlich (Host/Co-Host/Admin)

**Response:**
```json
{
  "eventId": "uuid",
  "eventTitle": "Hochzeit 2026",
  "eventDate": "2026-01-25T14:00:00Z",
  "totalPhotos": 456,
  "totalVideos": 23,
  "totalGuests": 87,
  "totalUploads": 479,
  "totalDownloads": 234,
  "totalViews": 5678,
  "storageUsedMB": 3456.78,
  "uploadsByDay": [
    { "date": "2026-01-23", "count": 123 },
    { "date": "2026-01-24", "count": 234 }
  ],
  "topUploaders": [
    { "name": "Max Mustermann", "uploadCount": 67 },
    { "name": "Lisa Schmidt", "uploadCount": 54 }
  ],
  "categoryBreakdown": [
    { "category": "Zeremonie", "photoCount": 89 },
    { "category": "Empfang", "photoCount": 123 }
  ]
}
```

---

### GET `/api/events/:eventId/analytics/export/csv`
Exportiert Analytics als CSV-Datei.

**Auth:** Erforderlich (Host/Co-Host/Admin)

**Response:** CSV-Datei (text/csv)
- Content-Disposition: `attachment; filename="analytics-{eventId}-{timestamp}.csv"`
- UTF-8 BOM für Excel-Kompatibilität

**Inhalt:**
```csv
Kategorie,Wert
Event,Hochzeit 2026
Datum,25.01.2026
Gesamt Fotos,456
Gesamt Videos,23
...

Uploads pro Tag
Datum,Anzahl
2026-01-23,123
2026-01-24,234
...

Top Uploader
Name,Uploads
Max Mustermann,67
Lisa Schmidt,54
...

Kategorien
Kategorie,Fotos
Zeremonie,89
Empfang,123
```

---

### GET `/api/events/:eventId/analytics/export/pdf`
Exportiert Analytics als PDF-Dokument.

**Auth:** Erforderlich (Host/Co-Host/Admin)

**Response:** PDF-Stream (application/pdf)
- Content-Disposition: `attachment; filename="analytics-{eventId}-{timestamp}.pdf"`

**Layout:**
- Titel: "Event Analytics"
- Event Info (Name, Datum)
- Summary Statistics (Box)
- Uploads pro Tag (Liste, max 15 Einträge)
- Top Uploader (Top 10)
- Kategorie Breakdown
- Footer mit Erstellungsdatum

---

## 🎬 Video Processing (Backend Service)

**Hinweis:** Diese Services werden intern verwendet, keine direkten API-Endpoints.

### Video Metadata Extraction
```typescript
import { extractVideoMetadata } from './services/videoProcessor';

const metadata = await extractVideoMetadata('/path/to/video.mp4');
// {
//   duration: 120,      // Sekunden
//   width: 1920,
//   height: 1080,
//   codec: 'h264',
//   bitrate: 5000000,   // bits/s
//   fps: 30
// }
```

### Thumbnail Generation
```typescript
import { generateVideoThumbnail } from './services/videoProcessor';

await generateVideoThumbnail(
  '/path/to/video.mp4',
  '/path/to/thumb.jpg',
  {
    timestamp: '00:00:05',  // oder '50%'
    width: 640,
    height: 360
  }
);
```

### Video Compression
```typescript
import { compressVideoForWeb } from './services/videoProcessor';

await compressVideoForWeb(
  '/path/to/input.mov',
  '/path/to/output.mp4',
  '2000k'  // Target Bitrate
);
// Output: H.264 MP4 mit faststart für Streaming
```

### Thumbnail Strip (für Scrubbing)
```typescript
import { generateThumbnailStrip } from './services/videoProcessor';

const thumbPaths = await generateThumbnailStrip(
  '/path/to/video.mp4',
  '/output/dir',
  10  // Anzahl Thumbnails
);
// ['thumb_1.jpg', 'thumb_2.jpg', ...]
```

---

## 🏷️ Smart Photo Categories (EXIF-based)

### Automatische Kategorisierung
```typescript
import { assignSmartCategory } from './services/photoCategories';

const categoryId = await assignSmartCategory(
  eventId,
  photoId,
  exifData
);
```

**Kategorisierungs-Logik:**

1. **Zeit-basiert** (vs. Event-DateTime):
   - "Vorbereitung" (< 12h vor Event)
   - "Während der Feier" (± 2h vom Event)
   - "Nach der Feier" (< 12h nach Event)

2. **Kamera-basiert** (EXIF Make/Model):
   - "Professionelle Fotos" (Canon EOS, Nikon Z, Sony Alpha, Fuji X-T)
   - "Gäste-Fotos" (andere Kameras/Smartphones)

3. **Licht-basiert** (Flash EXIF):
   - "Indoor-Fotos" (Blitz verwendet)
   - "Outdoor-Fotos" (kein Blitz)

### Batch Processing
```typescript
import { batchProcessPhotoCategories } from './services/photoCategories';

const stats = await batchProcessPhotoCategories(
  eventId,
  photoIds  // Optional: spezifische Fotos
);
// {
//   processed: 234,
//   categorized: 189,
//   errors: 0
// }
```

### Category Suggestions
```typescript
import { suggestCategories } from './services/photoCategories';

const suggestions = await suggestCategories(eventId);
// [
//   "Vormittag", "Nachmittag", "Abend",
//   "Zeremonie", "Empfang", "Dinner", "Tanz",
//   "Gruppenfotos", "Candid Momente", "Location"
// ]
```

---

## 🔒 CSRF Protection

### GET `/api/csrf-token`
Generiert und liefert CSRF-Token für Client.

**Auth:** Optional (aber Session erforderlich)

**Response:**
```json
{
  "csrfToken": "64-char-hex-token"
}
```

**Token wird auch als Cookie gesetzt:**
- Name: `csrf-token`
- HttpOnly: `false` (JS-Zugriff für Header)
- Secure: `true` (nur Production)
- SameSite: `strict`
- MaxAge: 1 Stunde

### CSRF Validation

**Middleware:** Automatisch für POST/PUT/DELETE/PATCH aktiv

**Header erforderlich:**
```http
X-CSRF-Token: {token-from-cookie-or-api}
```

**Fehler bei fehlerhaftem/fehlendem Token:**
```json
{
  "error": "CSRF-Token ungültig",
  "statusCode": 403
}
```

**Bypass für sichere Methoden:**
- GET, HEAD, OPTIONS: Keine CSRF-Validierung

---

## 🛠️ Integration Beispiele

### Frontend: Bulk Download
```typescript
const downloadPhotos = async (eventId: string, filters: any) => {
  const response = await fetch(`/api/events/${eventId}/download/zip`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(filters),
  });

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `photos-${eventId}.zip`;
  a.click();
};
```

### Frontend: Analytics Export
```typescript
const exportAnalytics = async (eventId: string, format: 'csv' | 'pdf') => {
  const url = `/api/events/${eventId}/analytics/export/${format}`;
  window.open(url, '_blank');
};
```

### Frontend: CSRF Protection
```typescript
// Get CSRF token
const getCsrfToken = async () => {
  const response = await fetch('/api/csrf-token');
  const { csrfToken } = await response.json();
  return csrfToken;
};

// Use in requests
const createEvent = async (data: any) => {
  const csrfToken = await getCsrfToken();
  
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  return response.json();
};
```

### Backend: Smart Categories on Upload
```typescript
// In photo upload route
const exifData = await extractExifData(filePath);
if (exifData) {
  await assignSmartCategory(eventId, photo.id, exifData);
}
```

---

## 📋 Environment Variables

### Neue Variablen

```bash
# Co-Host Invitations
COHOST_INVITE_TTL_SECONDS=604800  # 7 Tage
INVITE_JWT_SECRET=your-secret     # Falls abweichend von JWT_SECRET

# CSRF Protection
CSRF_TOKEN_EXPIRY=3600000         # 1 Stunde (ms)

# Video Processing (FFmpeg)
FFMPEG_PATH=/usr/bin/ffmpeg       # Optional: Pfad zu FFmpeg Binary
FFPROBE_PATH=/usr/bin/ffprobe     # Optional: Pfad zu FFprobe Binary
```

---

## 🚀 Deployment Checklist

### 1. Dependencies installieren
```bash
pnpm install
# Neue Packages: archiver, csv-writer, pdfkit, exif-parser, fluent-ffmpeg, vitest
```

### 2. FFmpeg installieren (Server)
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install ffmpeg

# Verify
ffmpeg -version
```

### 3. Environment Variables setzen
```bash
# .env
CSRF_TOKEN_EXPIRY=3600000
COHOST_INVITE_TTL_SECONDS=604800
```

### 4. Build & Restart
```bash
# Backend
cd packages/backend
pnpm build
pm2 restart gaestefotos-backend

# Oder systemctl
sudo systemctl restart gaestefotos-backend
```

### 5. Test neue Endpoints
```bash
# Health Check
curl http://localhost:8002/api/health

# CSRF Token
curl http://localhost:8002/api/csrf-token

# Analytics (mit Auth)
curl -H "Authorization: Bearer {token}" \
  http://localhost:8002/api/events/{eventId}/analytics
```

---

## 🔍 Monitoring & Logging

### Log-Format (Winston)
```json
{
  "level": "info",
  "message": "[downloads] Bulk download started",
  "eventId": "uuid",
  "userId": "uuid",
  "photoCount": 234,
  "filters": { ... },
  "timestamp": "2026-01-23T20:00:00Z"
}
```

### Metrics zu überwachen
- Download-Größen (MB)
- Download-Dauer (Sekunden)
- CSRF Token-Validierungsfehler
- Video Processing Errors
- Smart Category Assignment Rate

### Fehler-Handling
Alle Endpoints nutzen unified Error-Handler:
```json
{
  "code": "RES_001",
  "message": "Event nicht gefunden",
  "statusCode": 404,
  "timestamp": "2026-01-23T20:00:00Z"
}
```

---

**Version:** 2.0.1  
**Letzte Aktualisierung:** 23. Januar 2026
