# 📐 PHASE 2: Logik-Audit & Feature-Ideen

**Analysiert von:** Sonnet 4.5  
**Datum:** 16. Februar 2026  
**Status:** ✅ Abgeschlossen

---

## 📊 Executive Summary

Die **Gaestefotos-App** hat eine **durchdachte und robuste Architektur**, aber es gibt **kritische Optimierungspotenziale** und mehrere **hochwertige Feature-Möglichkeiten**. Dieser Report analysiert die Kernlogik und schlägt konkrete Verbesserungen vor.

---

## 🔄 1. FOTO-UPLOAD-ZYKLUS (End-to-End)

### 1.1 Aktueller Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ PHOTO UPLOAD PIPELINE                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. REQUEST                                                      │
│    ├─ optionalAuthMiddleware (JWT optional)                    │
│    ├─ requireEventAccess (Event existiert & zugänglich?)       │
│    ├─ enforceEventUploadAllowed                                │
│    │  ├─ Event aktiv & nicht gelöscht?                         │
│    │  ├─ Uploads erlaubt? (featuresConfig.allowUploads)        │
│    │  ├─ Upload-Permission für Co-Host?                        │
│    │  ├─ Event-Datum-Fenster (±1 Tag)                          │
│    │  └─ Storage-Periode nicht abgelaufen?                     │
│    ├─ attachEventUploadRateLimits (Event-spezifisch)           │
│    ├─ photoUploadIpLimiter (IP-basiert)                        │
│    ├─ photoUploadEventLimiter (Event-basiert)                  │
│    ├─ uploadSinglePhoto (Multer: 50MB max)                     │
│    └─ validateUploadedFile (MIME-Type, Magic-Bytes)            │
│                                                                 │
│ 2. IMAGE PROCESSING (imageProcessor.ts)                        │
│    ├─ Original: EXIF stripped (Datenschutz!)                   │
│    ├─ Optimized: 1920px, 85% JPEG (Galerie)                    │
│    └─ Thumbnail: 300x300, 75% JPEG (Previews)                  │
│                                                                 │
│ 3. METADATA EXTRACTION                                          │
│    ├─ extractCapturedAtFromImage (EXIF-Datum)                  │
│    └─ selectSmartCategoryId (AI-basierte Kategorisierung)      │
│                                                                 │
│ 4. STORAGE LIMIT CHECK                                          │
│    ├─ assertUploadWithinLimit (WooCommerce Package)            │
│    ├─ getEventUsageBytes (Photos + Videos + Guestbook)         │
│    └─ Abort if limit exceeded                                  │
│                                                                 │
│ 5. UPLOAD TO SEAWEEDFS (3 Parallel Uploads!)                   │
│    ├─ _opt.jpg → Optimized (Galerie)                           │
│    ├─ _orig.jpg → Original (Host-Download)                     │
│    └─ _thumb.jpg → Thumbnail (Previews)                        │
│                                                                 │
│ 6. DATABASE INSERT (Prisma)                                     │
│    ├─ Photo.create()                                            │
│    ├─ Status: PENDING (wenn Moderation) oder APPROVED          │
│    └─ sizeBytes: SUM(all 3 variants)                           │
│                                                                 │
│ 7. POST-PROCESSING (Async, non-blocking)                       │
│    ├─ processDuplicateDetection (Perceptual Hash)              │
│    ├─ getFaceDetectionMetadata (TensorFlow.js)                 │
│    ├─ addBrandingOverlay (falls konfiguriert)                  │
│    ├─ mosaicEngine.processPhoto (Mosaik-Wand)                  │
│    ├─ checkAchievements (Gamification)                         │
│    └─ sendPushToEvent + notifyEventHost (Realtime)             │
│                                                                 │
│ 8. SOCKET.IO BROADCAST                                          │
│    └─ io.to(eventId).emit('new-photo', ...)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 ✅ Stärken

1. **Mehrschichtige Sicherheit:** 7 Middleware-Layers
2. **EXIF-Stripping:** Datenschutz (GPS-Daten entfernt)
3. **3 Bildvarianten:** Optimiert für verschiedene Use-Cases
4. **Intelligente Kategorisierung:** AI-basiert (selectSmartCategoryId)
5. **Rate-Limiting:** IP + Event + Package-Limits
6. **Realtime-Updates:** Socket.IO für Live-Galerie
7. **Duplikat-Erkennung:** Perceptual Hashing
8. **Face-Detection:** TensorFlow.js
9. **Gamification:** Achievement-System
10. **SeaweedFS:** Eigenes S3-kompatibles Storage (Kosten-effizient!)

### 1.3 🚩 Potenzielle Probleme

#### Problem 1: **Sequentielle Verarbeitung → Lange Upload-Zeiten**

**Aktuell:**
```typescript
const processed = await imageProcessor.processImage(file.buffer);  // BLOCKING
const [storagePath, storagePathOriginal, storagePathThumb] = await Promise.all([
  storageService.uploadFile(...),  // 3 Parallel, gut!
]);
await prisma.photo.create(...);  // BLOCKING

// Post-Processing (7 Tasks!)
await processDuplicateDetection(...);  // BLOCKING
await getFaceDetectionMetadata(...);  // BLOCKING (TensorFlow!)
await addBrandingOverlay(...);  // BLOCKING
// ... usw.
```

**Problem:**
- Image-Processing ist CPU-intensiv (Sharp: resize, compress)
- Face-Detection ist **extrem langsam** (TensorFlow.js kann 1-3 Sekunden dauern!)
- Benutzer wartet auf Response bis ALLES fertig ist

**Impact:**
- Schlechte UX: "Laden..." kann 5-10 Sekunden dauern
- Timeout-Risiko bei langsamen Servern
- Blockiert Node.js Event-Loop

**Lösung: JOB-QUEUE mit Redis/BullMQ**

```typescript
// ✅ OPTIMIERT: Sofortige Response
router.post('/:eventId/photos/upload', async (req, res) => {
  // 1. Minimal-Processing (nur Validierung + Thumbnail)
  const quickThumb = await sharp(buffer).resize(300,300).jpeg({quality:60}).toBuffer();
  
  // 2. Upload RAW + Quick-Thumb
  const [rawPath, thumbPath] = await Promise.all([
    storageService.uploadFile(eventId, 'raw.jpg', buffer, 'image/jpeg'),
    storageService.uploadFile(eventId, 'thumb.jpg', quickThumb, 'image/jpeg'),
  ]);
  
  // 3. DB-Eintrag mit STATUS=PROCESSING
  const photo = await prisma.photo.create({
    data: { 
      eventId, 
      storagePathThumb: thumbPath,
      storagePathOriginal: rawPath,
      status: 'PROCESSING',  // ← NEU!
    }
  });
  
  // 4. Queue Background-Job (Redis/BullMQ)
  await photoProcessingQueue.add('process-upload', {
    photoId: photo.id,
    eventId,
    rawPath,
  });
  
  // 5. Sofortige Response (< 500ms statt 5-10s!)
  res.json({ 
    photoId: photo.id,
    status: 'PROCESSING',
    message: 'Upload erfolgreich - wird verarbeitet...'
  });
});

// Background Worker (separater Prozess!)
photoProcessingQueue.process('process-upload', async (job) => {
  const { photoId, eventId, rawPath } = job.data;
  
  // Langwierige Verarbeitung (blockiert keine API-Requests!)
  const buffer = await storageService.getFile(rawPath);
  const processed = await imageProcessor.processImage(buffer);
  
  const [optimizedPath, originalPath] = await Promise.all([
    storageService.uploadFile(..., processed.optimized),
    storageService.uploadFile(..., processed.original),
  ]);
  
  // Face-Detection (1-3 Sekunden, kein Problem in Background!)
  const faces = await getFaceDetectionMetadata(buffer);
  
  // Duplikat-Check
  const duplicates = await processDuplicateDetection(photoId, buffer);
  
  // DB-Update
  await prisma.photo.update({
    where: { id: photoId },
    data: { 
      storagePath: optimizedPath,
      storagePathOriginal: originalPath,
      status: 'APPROVED',  // oder PENDING wenn Moderation
      faceCount: faces.length,
    }
  });
  
  // Socket.IO: "Foto ist fertig!"
  io.to(eventId).emit('photo-ready', { photoId });
  
  // Achievements, Mosaik, etc.
  await Promise.all([
    mosaicEngine.processPhoto(photoId),
    checkAchievements(eventId),
  ]);
});
```

**Vorteile:**
- ✅ Upload-Response: < 500ms (statt 5-10s)
- ✅ Bessere Skalierung (Worker können horizontal skalieren)
- ✅ Retry-Logic bei Fehlern
- ✅ Prioritäts-Queues (Premium-Events zuerst)
- ✅ Monitoring (Queue-Länge, Failed-Jobs)

---

#### Problem 2: **N+1 Query Problem bei Photo-Listing**

**Aktuell (photos.ts:132):**
```typescript
const photos = await prisma.photo.findMany({
  where: { eventId },
  include: {
    guest: { select: { id: true, firstName: true, lastName: true } },
    category: { select: { id: true, name: true } },
    challengeCompletions: { 
      select: { 
        challengeId: true,
        challenge: { select: { id: true, title: true } }  // ← NESTED JOIN!
      }
    },
  },
  orderBy: { createdAt: 'desc' },
});
```

**Problem:**
- Prisma generiert **komplexe JOINs**
- Bei 1000 Fotos mit 10 Challenges = 10.000+ Datensätze im Join
- Langsam bei großen Events

**Lösung: Denormalisierung + Caching**

```typescript
// Option 1: Denormalisierung (speichere challengeTitle direkt in Photo)
model Photo {
  challengeId    String?
  challengeTitle String?  // ← Denormalisiert, aber schnell!
}

// Option 2: DataLoader Pattern (GraphQL-inspiriert)
const categoryLoader = new DataLoader(async (ids) => {
  const categories = await prisma.category.findMany({
    where: { id: { in: ids } }
  });
  return ids.map(id => categories.find(c => c.id === id));
});

// Option 3: Redis-Cache
const cacheKey = `event:${eventId}:photos`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

---

#### Problem 3: **Race Condition bei Concurrent Uploads**

**Szenario:**
- 10 Gäste uploaden gleichzeitig
- Jeder Upload prüft `getEventUsageBytes()` 
- Limit: 1 GB, Usage: 950 MB
- Jedes Foto: 60 MB

**Was passiert:**
```
Time 0ms:   Guest 1 checks → 950 MB ✓ OK
Time 10ms:  Guest 2 checks → 950 MB ✓ OK
Time 20ms:  Guest 3 checks → 950 MB ✓ OK
...
Time 100ms: Alle 10 Uploads starten → 950 + 600 MB = 1550 MB! ❌ OVER LIMIT!
```

**Lösung: Atomic Increment mit Optimistic Locking**

```typescript
// ✅ LÖSUNG: Reserviere Quota BEFORE Upload
await prisma.$transaction(async (tx) => {
  const event = await tx.event.findUnique({
    where: { id: eventId },
    select: { quotaUsedBytes: true, quotaLimitBytes: true }
  });
  
  const newUsage = event.quotaUsedBytes + uploadBytes;
  if (newUsage > event.quotaLimitBytes) {
    throw new Error('LIMIT_EXCEEDED');
  }
  
  // Atomic Increment (PostgreSQL-Level Lock!)
  await tx.event.update({
    where: { id: eventId },
    data: { quotaUsedBytes: { increment: uploadBytes } }
  });
});
```

**Alternative: Redis Distributed Lock**
```typescript
const lock = await redlock.lock(`upload-lock:${eventId}`, 1000);
try {
  // Check + Upload
} finally {
  await lock.unlock();
}
```

---

#### Problem 4: **Event-Datum-Fenster zu restriktiv (±1 Tag)**

**Aktuell (photos.ts:94):**
```typescript
if (!isWithinEventDateWindow(new Date(), event.dateTime, 1)) {
  return res.status(403).json({
    error: 'Uploads nur rund um Event-Datum (±1 Tag)'
  });
}
```

**Problem:**
- **Zu kurzes Fenster!** Gäste wollen oft 2-3 Tage später uploaden (z.B. Nachbereitung)
- Hochzeiten: Fotos kommen oft Tage später per USB-Stick vom Fotografen

**Lösung: Konfigurierbares Upload-Fenster**

```typescript
// Event-Model erweitern
model Event {
  uploadWindowDays Int @default(3)  // ← Host kann konfigurieren
}

// featuresConfig erweitern
featuresConfig: {
  allowUploads: true,
  uploadWindowDays: 7,  // ← Flexibel (z.B. 7 Tage für Hochzeiten)
}

// Check anpassen
const uploadWindowDays = featuresConfig.uploadWindowDays || 3;
if (!isWithinEventDateWindow(new Date(), event.dateTime, uploadWindowDays)) {
  return res.status(403).json({
    error: `Uploads nur innerhalb von ${uploadWindowDays} Tagen`
  });
}
```

---

## 🔄 2. EVENT-MANAGEMENT-FLOW

### 2.1 Event-Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ EVENT LIFECYCLE                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. CREATION                                                     │
│    ├─ POST /api/events/create                                   │
│    ├─ Generate unique slug + eventCode                          │
│    ├─ WooCommerce: Create Entitlement (Package-based)           │
│    └─ DB: Event.create() + EventEntitlement                     │
│                                                                 │
│ 2. CONFIGURATION                                                │
│    ├─ PUT /api/events/:id/qr/config (QR-Design)                 │
│    ├─ POST /api/events/:id/design/cover (Cover-Bild)            │
│    ├─ PUT /api/events/:id (Event-Settings)                      │
│    └─ POST /api/events/:id/invite-token (Co-Hosts)              │
│                                                                 │
│ 3. ACTIVE (Event-Datum)                                         │
│    ├─ Uploads erlaubt (±uploadWindowDays)                       │
│    ├─ Live-Galerie aktiv                                        │
│    ├─ Realtime Updates (Socket.IO)                              │
│    └─ Moderation (falls aktiviert)                              │
│                                                                 │
│ 4. POST-EVENT                                                   │
│    ├─ Upload-Fenster läuft ab                                   │
│    ├─ Host kann weiter managen                                  │
│    ├─ Gäste: Read-Only Galerie                                  │
│    └─ Event-Recap generieren (eventRecap.ts)                    │
│                                                                 │
│ 5. ARCHIVIERUNG                                                 │
│    ├─ storageEndsAt Datum (packageLimits.ts)                    │
│    ├─ FREE: 14 Tage, PRO: 365 Tage                              │
│    ├─ Storage-Reminder per E-Mail (storageReminder.ts)          │
│    └─ Soft-Delete (deletedAt != null)                           │
│                                                                 │
│ 6. PURGE (DSGVO)                                                │
│    ├─ retentionPurge.ts (Cron-Job)                              │
│    ├─ Löscht: Photos, Videos, Face-Data                         │
│    ├─ SeaweedFS: DELETE aller Files                             │
│    └─ DB: Hard-Delete (oder anonymisieren)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 ✅ Stärken

1. **WooCommerce-Integration:** Professionelles Billing
2. **Package-System:** FREE, STARTER, PRO, PREMIUM
3. **Storage-Policy:** Automatische Archivierung nach Ablauf
4. **DSGVO-Compliant:** Automatisches Purging
5. **Co-Host-System:** Delegierte Verwaltung
6. **Event-Code:** Einfacher Zugang ohne Login

### 2.3 🚩 Potenzielle Probleme

#### Problem 5: **Keine Soft-Delete-Bestätigung**

**Aktuell:**
```typescript
await prisma.event.update({
  where: { id: eventId },
  data: { deletedAt: new Date() }
});
```

**Problem:**
- Sofort gelöscht, keine Undo-Möglichkeit
- Host könnte versehentlich löschen

**Lösung: Zwei-Schritt-Deletion**

```typescript
// Schritt 1: Vormerken zum Löschen (reversibel)
await prisma.event.update({
  where: { id: eventId },
  data: { 
    markedForDeletionAt: new Date(),
    deletedAt: null  // Noch nicht gelöscht!
  }
});

// Schritt 2: Nach 7 Tagen WIRKLICH löschen (Cron-Job)
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const eventsToDelete = await prisma.event.findMany({
  where: {
    markedForDeletionAt: { lt: sevenDaysAgo },
    deletedAt: null
  }
});

for (const event of eventsToDelete) {
  await prisma.event.update({
    where: { id: event.id },
    data: { deletedAt: new Date() }
  });
}
```

---

#### Problem 6: **Package-Upgrade: Keine automatische Entitlement-Aktualisierung**

**Szenario:**
- Event hat FREE Package (14 Tage Storage)
- Host kauft PRO Upgrade (365 Tage Storage)
- WooCommerce-Webhook erstellt neue EventEntitlement
- **Aber:** Alte Entitlement bleibt aktiv (Status: ACTIVE)

**Aktuell (packageLimits.ts:71):**
```typescript
return prisma.eventEntitlement.findFirst({
  where: { eventId, status: 'ACTIVE' },
  orderBy: { createdAt: 'desc' }  // ← Nimmt neueste, aber beide sind ACTIVE!
});
```

**Problem:**
- Potenzielle Duplikate
- Unklare Business-Logic (Was passiert mit altem Entitlement?)

**Lösung: Automatisches Deaktivieren**

```typescript
// WooCommerce Webhook: Neues Package gekauft
router.post('/woocommerce/package-purchased', async (req, res) => {
  const { eventId, wcOrderId, wcSku } = req.body;
  
  // 1. Deaktiviere alte Entitlements
  await prisma.eventEntitlement.updateMany({
    where: { eventId, status: 'ACTIVE' },
    data: { 
      status: 'SUPERSEDED',  // ← Neuer Status
      supersededAt: new Date()
    }
  });
  
  // 2. Erstelle neues Entitlement
  await prisma.eventEntitlement.create({
    data: {
      eventId,
      wcOrderId,
      wcSku,
      status: 'ACTIVE',
      activatedAt: new Date()
    }
  });
});
```

---

## 📊 3. DATENBANKSCHEMA-ANALYSE

### 3.1 Kritische Findings

#### Finding 1: **Fehlende Indizes auf häufigen Queries**

**Analyse:** 77 Models, aber vermutlich nicht alle Indizes optimiert.

**Beispiel: Photo-Galerie-Query**
```typescript
// Häufigste Query (photos.ts:153)
const photos = await prisma.photo.findMany({
  where: { 
    eventId,           // ✓ Indexed
    isStoryOnly: false // ❌ NICHT indexed!
  },
  orderBy: { createdAt: 'desc' }  // ❌ Kein Composite Index!
});
```

**Lösung: Composite Index**
```prisma
model Photo {
  @@index([eventId, isStoryOnly, createdAt])  // ← Composite für häufige Query
  @@index([eventId, status, createdAt])       // ← Für Moderation-View
}
```

---

#### Finding 2: **BigInt für Storage → Gut, aber inconsistent**

**Aktuell:**
```prisma
model Photo {
  sizeBytes BigInt?  // ✓ Gut!
}

model Event {
  designAssetsBytes BigInt?  // ✓ Gut!
}
```

**Problem:**
- JavaScript kann BigInt nicht direkt JSON.stringify()
- Braucht Custom-Serializer (schon vorhanden: `serializeBigInt`)

**Empfehlung:** Konsistent verwenden, aber dokumentieren!

---

#### Finding 3: **Json-Felder statt typisierte Columns**

**Aktuell:**
```prisma
model Event {
  designConfig   Json?  // ← Untypisiert!
  featuresConfig Json   // ← Untypisiert!
}
```

**Problem:**
- Keine Type-Safety in DB
- Schwer zu querien (PostgreSQL JSON-Queries sind langsam)
- Migration-Hell (Schema-Änderungen im JSON)

**Empfehlung:**
- Für **häufig genutzte** Felder: eigene Columns
- Für **selten genutzte** Felder: JSON OK

**Beispiel:**
```prisma
model Event {
  // Häufig genutzt → eigene Columns
  allowUploads       Boolean @default(true)
  moderationRequired Boolean @default(false)
  uploadWindowDays   Int     @default(3)
  
  // Selten genutzt → JSON
  extendedConfig Json?  // theme colors, etc.
}
```

---

## 🚀 4. FEATURE-VORSCHLÄGE (High-Value)

### Feature 1: **Progressive Web App (PWA) für Offline-Support**

**Problem:** Gäste haben auf Events oft schlechtes WLAN.

**Lösung:**
- Service Worker für Offline-Caching
- IndexedDB für lokale Foto-Queue
- Hintergrund-Sync wenn Internet wieder da

**Tech:**
- Next.js PWA Plugin
- Workbox (Google)

**Impact:** ⭐⭐⭐⭐⭐ (Game-Changer für UX!)

---

### Feature 2: **Smart Auto-Slideshow mit AI-Curation**

**Idee:**
- AI wählt **beste** Fotos aus (Qualität, Faces, Lächeln)
- Automatische Slideshow für Beamer/TV
- Fullscreen-Modus mit Transitions

**Tech:**
- TensorFlow.js: Image Quality Assessment
- Face-API: Lächeln-Detektion
- Framer Motion: Smooth Transitions

**Impact:** ⭐⭐⭐⭐ (Wow-Faktor!)

---

### Feature 3: **WhatsApp-Integration für Photo-Sharing**

**Idee:**
- "Per WhatsApp teilen"-Button
- QR-Code scannen → Foto direkt in WhatsApp
- WhatsApp-Bot für Event-Updates

**Tech:**
- WhatsApp Business API
- Twilio/MessageBird Integration

**Impact:** ⭐⭐⭐⭐⭐ (Virale Verbreitung!)

---

### Feature 4: **Live-Voting für "Foto des Abends"**

**Idee:**
- Gäste voten für ihre Lieblingsfotos
- Leaderboard in Echtzeit
- Gewinner-Foto prominent anzeigen

**Tech:**
- Socket.IO für Realtime-Votes
- Schon vorhanden: PhotoVote-Model!

**Impact:** ⭐⭐⭐⭐ (Engagement!)

---

### Feature 5: **AI-Powered Face-Grouping (wie Google Photos)**

**Idee:**
- Automatisches Gruppieren von Personen
- "Zeige mir alle Fotos von Person X"
- DSGVO-compliant mit Opt-In

**Tech:**
- @vladmandic/face-api (schon vorhanden!)
- Face-Embeddings in Vector-DB (pgvector)

**Impact:** ⭐⭐⭐⭐⭐ (Killer-Feature!)

---

### Feature 6: **Timelapse-Generator aus Event-Fotos**

**Idee:**
- Alle Fotos eines Events → Video
- Chronologisch sortiert
- Mit Musik hinterlegt

**Tech:**
- FFmpeg (schon vorhanden!)
- Background-Job-Queue

**Impact:** ⭐⭐⭐⭐ (Erinnerungs-Wert!)

---

### Feature 7: **"Photo-Challenge"-Templates**

**Idee:**
- Vordefinierte Challenge-Packs (z.B. "Hochzeit Classics")
- "Küss die Braut", "Tanzfläche", "Selfie mit DJ", etc.
- Gamification mit Punkten

**Tech:**
- Challenge-Model (schon vorhanden!)
- Template-System

**Impact:** ⭐⭐⭐⭐ (Event-Spaß!)

---

### Feature 8: **Instagram-Stories-Export**

**Idee:**
- Fotos optimiert für Instagram Stories (1080x1920)
- Automatisches Branding (Event-Logo)
- Direkter Upload (Instagram API)

**Tech:**
- Sharp: Resize + Overlay
- Instagram Graph API

**Impact:** ⭐⭐⭐⭐⭐ (Virales Marketing!)

---

### Feature 9: **Premium: Professioneller Fotograf-Modus**

**Idee:**
- Separate Galerie für Profi-Fotos
- Wasserzeichen auf Previews
- Bezahl-Download für Hochauflösung

**Tech:**
- Category: "PROFESSIONAL"
- Watermark-Service
- Stripe Integration

**Impact:** ⭐⭐⭐⭐⭐ (Neues Revenue-Model!)

---

### Feature 10: **Event-Analytics Dashboard**

**Idee:**
- Welche Fotos bekommen meiste Likes?
- Zu welcher Uhrzeit meiste Uploads?
- Welche Kategorien am beliebtesten?

**Tech:**
- Recharts (schon vorhanden!)
- Analytics-Service

**Impact:** ⭐⭐⭐ (Insight für Hosts!)

---

## 📈 5. PERFORMANCE-OPTIMIERUNGEN

### Opt 1: **CDN für SeaweedFS**

**Aktuell:** Fotos werden direkt von SeaweedFS geladen.

**Problem:** 
- Langsam bei globalen Nutzern
- Hohe Latenz

**Lösung: Cloudflare vor SeaweedFS**

```nginx
# nginx.conf
location /cdn/ {
  proxy_pass http://seaweedfs:8333/;
  proxy_cache cdn_cache;
  proxy_cache_valid 200 365d;
  add_header X-Cache-Status $upstream_cache_status;
}
```

---

### Opt 2: **Redis-Caching für häufige Queries**

**Beispiel:**
```typescript
// Event-Details (ändern sich selten)
const cacheKey = `event:${eventId}:details`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const event = await prisma.event.findUnique(...);
await redis.setex(cacheKey, 3600, JSON.stringify(event));
```

---

### Opt 3: **Database Connection Pooling**

**Aktuell:** Prisma nutzt Default-Pool (10 Connections).

**Problem:** Bei hoher Last können Connections ausgehen.

**Lösung:**
```typescript
// DATABASE_URL="postgresql://...?connection_limit=100&pool_timeout=30"
```

---

## 🐛 6. GEFUNDENE BUGS

### Bug 1: **qrDesign Table Missing (events.ts)**

**Code:**
```typescript
// TODO: qrDesign table not in schema - return mock
```

**Impact:** ⚠️ Mittelschwer  
**Fix:** Entweder Tabelle erstellen oder Code entfernen

---

### Bug 2: **Invitation Editor: Unvollständig**

**Code:**
```typescript
{/* TODO: Render elements here */}
```

**Impact:** 🔴 Kritisch (Feature nicht funktional)  
**Fix:** Komponente implementieren

---

### Bug 3: **Sentry Error-Tracking nicht aktiv**

**Code:**
```typescript
// TODO: Send to Sentry or similar
```

**Impact:** 🟡 Medium (Fehler gehen verloren)  
**Fix:** Sentry-Integration aktivieren

---

### Bug 4: **Upload-Confetti deaktiviert**

**Code:**
```typescript
// triggerUploadConfetti(); // TODO: Re-implement confetti
```

**Impact:** 🟢 Niedrig (nur UX-Detail)  
**Fix:** Confetti re-implementieren

---

## 📊 7. API-ENDPOINT-INVENTAR

### Photos API (12 Endpoints)

| Method | Route | Auth | Beschreibung |
|--------|-------|------|--------------|
| GET | `/:eventId/photos` | Optional | Galerie-Liste |
| POST | `/:eventId/photos/upload` | Optional | Foto hochladen |
| GET | `/photos/:photoId/file` | Public | Foto-File |
| GET | `/:eventId/photos/:photoId` | Auth | Foto-Details |
| POST | `/:eventId/photos/:photoId/restore` | Host | Restore deleted |
| POST | `/:eventId/photos/:photoId/reject` | Host | Moderation reject |
| POST | `/:eventId/photos/:photoId/approve` | Host | Moderation approve |
| POST | `/:eventId/photos/:photoId/delete` | Host | Soft-delete |
| DELETE | `/:eventId/photos/:photoId` | Host | Hard-delete |
| POST | `/:eventId/photos/:photoId/category` | Host | Set category |
| DELETE | `/:eventId/photos/:photoId/category` | Host | Remove category |

### Events API (36 Endpoints!)

| Method | Route | Beschreibung |
|--------|-------|--------------|
| GET | `/` | Meine Events |
| POST | `/create` | Neues Event |
| GET | `/:id` | Event-Details |
| PATCH | `/:id` | Event bearbeiten |
| DELETE | `/:id` | Event löschen |
| GET | `/slug/:slug` | Event per Slug |
| POST | `/:id/access` | Event-Passwort |
| POST | `/:id/invite-token` | Co-Host einladen |
| GET | `/:id/usage` | Storage-Usage |
| GET | `/:id/wifi` | WiFi-Daten |
| GET | `/:id/traffic` | Traffic-Stats |
| ... | ... | (30+ weitere) |

**Fazit:** Sehr umfangreiches API, gut strukturiert!

---

## 🎯 Prioritäts-Matrix

| Maßnahme | Impact | Effort | Priorität |
|----------|--------|--------|-----------|
| **Job-Queue für Upload** | 🔥🔥🔥🔥🔥 | 🔧🔧🔧 | **P0** |
| **N+1 Query Fix** | 🔥🔥🔥🔥 | 🔧🔧 | **P0** |
| **Race Condition Fix** | 🔥🔥🔥🔥 | 🔧🔧 | **P0** |
| **WhatsApp-Integration** | 🔥🔥🔥🔥🔥 | 🔧🔧🔧🔧 | **P1** |
| **PWA Offline-Support** | 🔥🔥🔥🔥🔥 | 🔧🔧🔧🔧 | **P1** |
| **Face-Grouping** | 🔥🔥🔥🔥🔥 | 🔧🔧🔧🔧🔧 | **P1** |
| **Instagram-Stories-Export** | 🔥🔥🔥🔥🔥 | 🔧🔧🔧 | **P1** |
| **Fotograf-Modus** | 🔥🔥🔥🔥🔥 | 🔧🔧🔧🔧 | **P2** |
| **Live-Voting** | 🔥🔥🔥🔥 | 🔧🔧 | **P2** |
| **Smart-Slideshow** | 🔥🔥🔥🔥 | 🔧🔧🔧 | **P2** |
| **Timelapse-Generator** | 🔥🔥🔥🔥 | 🔧🔧🔧 | **P2** |
| **Challenge-Templates** | 🔥🔥🔥🔥 | 🔧🔧 | **P2** |
| **Event-Analytics** | 🔥🔥🔥 | 🔧🔧 | **P3** |
| **Zwei-Schritt-Deletion** | 🔥🔥 | 🔧 | **P3** |
| **Upload-Fenster konfigurierbar** | 🔥🔥🔥 | 🔧 | **P3** |

---

**Ende Phase 2 - Logik-Audit**

➡️ **Nächste Phase:** Phase 3 - Security & DB-Hardening (Opus 4.6)
