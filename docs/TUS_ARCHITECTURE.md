# Tus.io Resumable Uploads - Architektur-Design

**Erstellt:** 2026-01-10  
**Status:** Implementiert  
**Implementiert:** 2026-01-10  
**Aktualisiert:** 2026-03-07

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
│  │  @tus/server v2.x (Express Middleware)                       │    │
│  │  - Endpoint: POST /api/uploads                               │    │
│  │  - Chunk-Empfang + Zusammenbau                               │    │
│  │  - FileStore (lokaler Temp-Ordner /tmp/tus-uploads)          │    │
│  │  - IP-basiertes Upload-Limit (maxUploadsPerGuest)            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                    │                                 │
│                                    ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Post-Upload Processing (processCompletedUpload)             │    │
│  │  - Original speichern (storagePathOriginal, EXIF-stripped)   │    │
│  │  - Optimized generieren (storagePath → 1920px JPEG 85%)      │    │
│  │  - Thumbnail generieren (storagePathThumb → 300px JPEG 75%) │    │
│  │  - WebP generieren (storagePathWebp → 1920px WebP 82%)      │    │
│  │  - sharp(buffer).rotate() + pipeline.clone() (1× geladen)   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SEAWEEDFS (S3)                                 │
│  events/{eventId}/                                                   │
│  ├── {photoId}/                                                      │
│  │   ├── {id}_orig.jpg     ← Volle Qualität (für Host-Download)     │
│  │   ├── {id}_opt.jpg      ← 1920px JPEG 85% (für Gäste-Galerie)   │
│  │   ├── {id}_thumb.jpg    ← 300px JPEG 75% (Thumbnails)            │
│  │   └── {id}_webp.webp    ← 1920px WebP 82% (modernes Format)      │
│  └── {videoId}/                                                      │
│      └── original.mp4      ← Volle Qualität                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponenten-Design

### 3.1 Backend: tus-node-server

**Package:** `@tus/server` + `@tus/file-store`

```typescript
// packages/backend/src/routes/uploads.ts (vereinfacht)

import { Server } from '@tus/server';
import { FileStore } from '@tus/file-store';

const tusServer = new Server({
  path: '/api/uploads',
  respectForwardedHeaders: true,
  datastore: new FileStore({
    directory: process.env.TUS_UPLOAD_DIR || '/tmp/tus-uploads',
  }),
  maxSize: 104_857_600, // 100MB
  onUploadCreate: async (req, upload) => {
    // Validate: eventId in metadata, auth check
    await validateTusRequest(req);
    return { res: undefined, metadata: upload.metadata };
  },
  onUploadFinish: async (req, upload) => {
    // IP-Hash für Upload-Limit-Tracking extrahieren
    // Post-Processing: Original → Optimized → Thumbnail → WebP
    await processCompletedUpload(upload);
    return {};
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
    // Pipeline: 1× Bild laden, 4 Varianten via clone()
    const pipeline = sharp(originalBuffer).rotate(); // EXIF-Rotation VOR Strip
    // sharp() ohne .withMetadata() = strippt EXIF automatisch (inkl. GPS)

    const [original, optimized, thumbnail, webp] = await Promise.all([
      pipeline.clone().toBuffer(),
      pipeline.clone().resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 }).toBuffer(),
      pipeline.clone().resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 75 }).toBuffer(),
      pipeline.clone().resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 }).toBuffer(),
    ]);
    
    // Upload alle 4 Varianten parallel zu SeaweedFS
    await Promise.all([
      storageService.uploadFile(eventId, `${photoId}_orig`, original, 'image/jpeg'),
      storageService.uploadFile(eventId, `${photoId}_opt`, optimized, 'image/jpeg'),
      storageService.uploadFile(eventId, `${photoId}_thumb`, thumbnail, 'image/jpeg'),
      storageService.uploadFile(eventId, `${photoId}_webp`, webp, 'image/webp'),
    ]);
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
  storagePathWebp      String?   // WebP (1920px) - modernes Format
  
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

### 5.2 Status & Limit Endpoints

```
GET /api/uploads/status
└── Response: { enabled: true, maxSize: 104857600 }

GET /api/uploads/limit/:eventId?guest=name
└── Response: { limited: bool, max: number|null, used: number, remaining: number|null }
    - Zeigt Gästen ihr verbleibendes Upload-Kontingent
```

### 5.3 Download Endpoints

```
GET /cdn/:photoId
└── Query: ?w=400&q=80&f=webp
    - On-the-fly Resize + Format-Conversion via Sharp
    - Gäste: optimized/webp (Standard)
    - Host/Admin: original wenn ?quality=original

GET /api/photos/{id}/download
└── Immer Original (für Host-Download)

GET /api/videos/{id}/file
└── Immer Original
```

---

## 6. Frontend-Integration

### 6.1 UploadButton.tsx — Progressiver Upload (aktuelle Implementierung)

```typescript
// Client-side Resize BLEIBT (Bandbreiten-Optimierung, max 2500px)
const file = await resizeImageIfNeeded(originalFile);

// Phase 1: Tiny Preview (~30KB) für sofortige Galerie-Anzeige
const preview = await generateQuickPreview(originalFile);
await api.post(`/events/${eventId}/photos/quick-preview`, previewForm);

// Phase 2: Volle Qualität via TUS (resumable)
await uploadWithTus(file, { eventId, uploadedBy: name, onProgress });

// Backend erstellt 4 Varianten + speichert in SeaweedFS
// + Upload-Limit-Anzeige: GET /api/uploads/limit/:eventId
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
TUS_UPLOAD_DIR=/tmp/tus-uploads    # Temp-Ordner für Chunks
TUS_MAX_SIZE=104857600             # 100MB (Fotos + Videos)
# Cleanup: Stale Temp-Files werden alle 30min gelöscht (> 2h alt)
# Progressive Zombie-Records werden alle 15min gelöscht (> 1h alt)
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
- Größenlimit (100MB via TUS) als Schutz

---

## 12. Status (Stand: 07.03.2026)

✅ **Alle Schritte abgeschlossen:**
1. Original-Qualität Fix — Backend speichert 4 Varianten (orig, opt, thumb, webp)
2. TUS-Integration — `@tus/server` v2.x + `@tus/file-store` in `uploads.ts`
3. Frontend — `tus-js-client` in `tusUpload.ts` mit auto-resume
4. Upload-Limits — Multer + TUS + Nginx einheitlich auf 100MB
5. IP-basiertes Upload-Limit (S-05) + Gäste-Anzeige
6. Progressive Upload (Phase 1: Vorschau → Phase 2: TUS Full Quality)
7. GPS-EXIF-Strip auf Bild- und Metadaten-Ebene (DSGVO)
8. Production Tests bestanden (206/206 Unit-Tests, alle Services aktiv)
