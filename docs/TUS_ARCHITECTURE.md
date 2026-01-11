# Tus.io Resumable Uploads - Architektur-Design

**Erstellt:** 2026-01-10  
**Status:** Implementiert  
**Implementiert:** 2026-01-10

---

## 1. Problem-Statement

### Aktuelle Situation
- **Photo Upload:** Client-side Resize (1920px) → Backend Resize (1920px) → SeaweedFS
- **Video Upload:** Direkt zu Backend (max 100MB) → SeaweedFS
- **Bei Abbruch:** Upload startet bei 0% neu (UX-Killer bei instabilem WLAN)

### Anforderungen
1. **Resumable Uploads:** Bei Abbruch ab letztem Chunk fortsetzen
2. **Original-Qualität:** Fotos/Videos in voller Qualität speichern
3. **Gäste-View:** Komprimierte Ansicht für Galerie
4. **Host-Download:** Original-Qualität

---

## 2. Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  tus-js-client                                               │    │
│  │  - Chunked Upload (5MB chunks)                               │    │
│  │  - Auto-Resume bei Disconnect                                │    │
│  │  - Progress Tracking                                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKEND                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  tus-node-server (Express Middleware)                        │    │
│  │  - Endpoint: POST /api/uploads                               │    │
│  │  - Chunk-Empfang + Zusammenbau                               │    │
│  │  - SeaweedFS als Backend-Store                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                    │                                 │
│                                    ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Post-Upload Processing                                      │    │
│  │  - Original speichern (storagePath_original)                 │    │
│  │  - Optimized generieren (storagePath → 1920px für Galerie)   │    │
│  │  - Thumbnail generieren (storagePath_thumb → 300px)          │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SEAWEEDFS (S3)                                 │
│  events/{eventId}/                                                   │
│  ├── {photoId}/                                                      │
│  │   ├── original.jpg      ← Volle Qualität (für Host-Download)     │
│  │   ├── optimized.jpg     ← 1920px (für Gäste-Galerie)             │
│  │   └── thumb.jpg         ← 300px (für Thumbnails)                 │
│  └── {videoId}/                                                      │
│      └── original.mp4      ← Volle Qualität                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponenten-Design

### 3.1 Backend: tus-node-server

**Package:** `@tus/server` + `@tus/s3-store`

```typescript
// packages/backend/src/routes/uploads.ts

import { Server } from '@tus/server';
import { S3Store } from '@tus/s3-store';

const tusServer = new Server({
  path: '/api/uploads',
  datastore: new S3Store({
    partSize: 5 * 1024 * 1024, // 5MB chunks
    s3ClientConfig: {
      endpoint: process.env.SEAWEEDFS_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.SEAWEEDFS_ACCESS_KEY,
        secretAccessKey: process.env.SEAWEEDFS_SECRET_KEY,
      },
      forcePathStyle: true,
    },
    bucket: process.env.SEAWEEDFS_BUCKET,
  }),
  onUploadFinish: async (req, res, upload) => {
    // Post-Processing: Original → Optimized → Thumbnail
    await processUploadedFile(upload);
  },
});
```

### 3.2 Frontend: tus-js-client

**Package:** `tus-js-client`

```typescript
// packages/frontend/src/lib/tusUpload.ts

import * as tus from 'tus-js-client';

export async function uploadWithTus(
  file: File,
  eventId: string,
  onProgress: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: '/api/uploads',
      retryDelays: [0, 1000, 3000, 5000],
      chunkSize: 5 * 1024 * 1024, // 5MB
      metadata: {
        filename: file.name,
        filetype: file.type,
        eventId: eventId,
      },
      onError: reject,
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress((bytesUploaded / bytesTotal) * 100);
      },
      onSuccess: () => {
        resolve(upload.url);
      },
    });

    // Check for previous upload to resume
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}
```

### 3.3 Post-Upload Processing

```typescript
// packages/backend/src/services/uploadProcessor.ts

interface ProcessingResult {
  originalPath: string;    // Volle Qualität
  optimizedPath: string;   // 1920px für Galerie
  thumbnailPath: string;   // 300px für Previews
}

async function processUploadedFile(
  tusUpload: TusUpload,
  eventId: string,
  mediaType: 'photo' | 'video'
): Promise<ProcessingResult> {
  const originalBuffer = await storageService.getFile(tusUpload.id);
  
  if (mediaType === 'photo') {
    // 1. Original behalten (nur EXIF strippen)
    const original = await sharp(originalBuffer)
      .rotate()
      .withMetadata({ orientation: undefined })
      .toBuffer();
    
    // 2. Optimized für Galerie (1920px)
    const optimized = await sharp(originalBuffer)
      .rotate()
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .withMetadata({ orientation: undefined })
      .toBuffer();
    
    // 3. Thumbnail (300px)
    const thumbnail = await sharp(originalBuffer)
      .rotate()
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 75 })
      .toBuffer();
    
    // Upload alle Varianten
    const basePath = `events/${eventId}/${tusUpload.id}`;
    await Promise.all([
      storageService.uploadBuffer(`${basePath}/original.jpg`, original),
      storageService.uploadBuffer(`${basePath}/optimized.jpg`, optimized),
      storageService.uploadBuffer(`${basePath}/thumb.jpg`, thumbnail),
    ]);
    
    return {
      originalPath: `${basePath}/original.jpg`,
      optimizedPath: `${basePath}/optimized.jpg`,
      thumbnailPath: `${basePath}/thumb.jpg`,
    };
  }
  
  // Videos: Nur Original speichern (kein Transcoding)
  const basePath = `events/${eventId}/${tusUpload.id}`;
  await storageService.uploadBuffer(`${basePath}/original.mp4`, originalBuffer);
  
  return {
    originalPath: `${basePath}/original.mp4`,
    optimizedPath: `${basePath}/original.mp4`, // Gleich für Videos
    thumbnailPath: '', // Video-Thumbnails später
  };
}
```

---

## 4. Datenbank-Schema Erweiterung

```prisma
model Photo {
  // Bestehende Felder...
  storagePath          String?   // Optimized (1920px) - für Galerie
  storagePathOriginal  String?   // Original (volle Qualität) - für Download
  storagePathThumb     String?   // Thumbnail (300px) - für Previews
  
  // Tus-spezifisch
  tusUploadId          String?   // Tus Upload ID für Resume
  uploadStatus         String    @default("PENDING") // PENDING, PROCESSING, COMPLETE, FAILED
}

model Video {
  // Bestehende Felder...
  storagePath          String?   // Original
  storagePathOriginal  String?   // Gleich wie storagePath
  
  // Tus-spezifisch  
  tusUploadId          String?
  uploadStatus         String    @default("PENDING")
}
```

---

## 5. API-Endpunkte

### 5.1 Tus Upload Endpoint

```
POST /api/uploads
├── Header: Tus-Resumable: 1.0.0
├── Header: Upload-Metadata: eventId {base64}, filename {base64}, filetype {base64}
└── Body: Binary chunk data

PATCH /api/uploads/{uploadId}
├── Header: Upload-Offset: {bytes}
└── Body: Next chunk

HEAD /api/uploads/{uploadId}
└── Response: Upload-Offset (für Resume)
```

### 5.2 Download Endpoints

```
GET /api/photos/{id}/file
└── Query: ?quality=original|optimized|thumb
    - Gäste: optimized (Standard)
    - Host/Admin: original wenn ?quality=original

GET /api/photos/{id}/download
└── Immer Original (für Host-Download)

GET /api/videos/{id}/file
└── Immer Original
```

---

## 6. Frontend-Integration

### 6.1 UploadButton.tsx Änderungen

```typescript
// ENTFERNEN: Client-side Resize
// const resizedFile = await resizeImageIfNeeded(file);

// NEU: Tus Upload mit Original-Datei
const uploadUrl = await uploadWithTus(file, eventId, (progress) => {
  setUploadProgress(progress);
});

// Backend verarbeitet Original und erstellt Varianten
```

### 6.2 Galerie-Anzeige

```typescript
// PhotoGrid.tsx - Optimized für Ansicht
<img src={`/api/photos/${photo.id}/file?quality=optimized`} />

// PhotoModal.tsx - Original für Vollansicht (nur Host)
{isHost && <a href={`/api/photos/${photo.id}/download`}>Original herunterladen</a>}
```

---

## 7. Migration bestehender Daten

### Phase 1: Neue Uploads
- Tus aktivieren für neue Uploads
- Alte Uploads weiterhin über Legacy-Route

### Phase 2: Backfill (optional)
- Bestehende Fotos haben kein Original mehr
- Nur für neue Uploads relevant

---

## 8. Konfiguration

```env
# .env
TUS_ENABLED=true
TUS_CHUNK_SIZE=5242880        # 5MB
TUS_MAX_SIZE=524288000        # 500MB (für Videos)
TUS_EXPIRATION=86400000       # 24h (incomplete uploads)
```

---

## 9. Implementierungs-Reihenfolge

| # | Task | Aufwand | Abhängigkeit |
|---|------|---------|--------------|
| 1 | `@tus/server` + `@tus/s3-store` installieren | 30min | - |
| 2 | `/api/uploads` Route erstellen | 2h | 1 |
| 3 | Post-Upload Processor (Original + Optimized + Thumb) | 3h | 2 |
| 4 | DB Schema erweitern (storagePathOriginal, etc.) | 1h | - |
| 5 | Download-Route für Original-Qualität | 1h | 3, 4 |
| 6 | Frontend: tus-js-client integrieren | 2h | 2 |
| 7 | Frontend: Client-side Resize entfernen | 30min | 6 |
| 8 | Galerie: Optimized für Ansicht, Original für Download | 1h | 5 |
| 9 | Tests + Smoke auf Staging | 2h | Alle |

**Gesamt: ~13h (2-3 Tage)**

---

## 10. Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| SeaweedFS S3-Kompatibilität | Niedrig | `@tus/s3-store` ist S3-kompatibel |
| Speicherplatz (3x pro Foto) | Mittel | Nur Original + Optimized speichern |
| Tus-Server Komplexität | Niedrig | Gut dokumentierte Library |
| Migration bestehender Daten | Niedrig | Nur für neue Uploads |

---

## 11. Entscheidungen

### Original-Qualität Speicherung
**Entscheidung:** Original + Optimized + Thumbnail speichern

**Begründung:**
- Host benötigt Original für Druck/Archiv
- Gäste sehen Optimized (schneller, weniger Traffic)
- Thumbnails für Galerie-Performance

### Video-Transcoding
**Entscheidung:** KEIN Transcoding - Original speichern

**Begründung:**
- Transcoding ist CPU-intensiv
- Browser können die meisten Formate abspielen
- Größenlimit (500MB) als Schutz

---

## 12. Nächste Schritte (Sonnet)

1. **Original-Qualität Fix** (sofort)
   - Client-side Resize entfernen
   - Backend: Original speichern, Optimized für Galerie

2. **Tus.io Integration** (danach)
   - Backend Route implementieren
   - Frontend Client integrieren

**Wechsel zu Sonnet für Implementierung.**
