# Event Wizard - Backend Integration

**Status:** ✅ Vollständig implementiert  
**Datum:** 2026-01-11  
**Build:** Frontend (221 kB) + Backend erfolgreich kompiliert

---

## Implementierte Backend-Features

### ✅ Event-Creation API erweitert
**Datei:** `/root/gaestefotos-app-v2/packages/backend/src/routes/events.ts`

#### 1. Multer File Upload
```typescript
const wizardUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  },
});

router.post(
  '/',
  authMiddleware,
  wizardUpload.fields([
    { name: 'coverImage', maxCount: 1 }, 
    { name: 'profileImage', maxCount: 1 }
  ]),
  async (req: AuthRequest, res: Response) => { ... }
);
```

#### 2. Validation Schema erweitert
```typescript
const createEventSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/).optional(),
  dateTime: z.string().datetime().optional(),
  locationName: z.string().optional(),
  locationGoogleMapsLink: z.string().optional(),
  password: z.string().min(4).optional(),              // ✅ NEU
  colorScheme: z.enum(['elegant', 'romantic', 'modern', 'colorful']).optional(), // ✅ NEU
  visibilityMode: z.enum(['instant', 'mystery', 'moderated']).optional(),        // ✅ NEU
  designConfig: z.record(z.any()).optional(),
  featuresConfig: z.record(z.any()).optional(),
  categories: z.array(...).optional(),
});
```

#### 3. FormData JSON Parsing
```typescript
const bodyData = { ...req.body };
if (bodyData.albums) bodyData.albums = JSON.parse(bodyData.albums);
if (bodyData.challenges) bodyData.challenges = JSON.parse(bodyData.challenges);
if (bodyData.guestbook) bodyData.guestbook = JSON.parse(bodyData.guestbook);
if (bodyData.coHostEmails) bodyData.coHostEmails = JSON.parse(bodyData.coHostEmails);
```

#### 4. Password Hashing
```typescript
const bcrypt = require('bcryptjs');
let hashedPassword: string | undefined;
if (data.password) {
  hashedPassword = await bcrypt.hash(data.password, 12);
}
```

#### 5. Album-Mapping (Wizard → Categories)
```typescript
const wizardAlbums = (bodyData.albums || []) as Array<{
  id: string; 
  label: string; 
  enabled: boolean; 
  hostOnly: boolean
}>;

let categoriesCreate: Array<any> = wizardAlbums
  .filter((a) => a.enabled && a.label.trim().length > 0)
  .map((a, idx) => ({
    name: a.label,
    order: idx,
    isVisible: true,
    uploadLocked: a.hostOnly,  // Host-Only Albums → uploadLocked
    uploadLockUntil: null,
    dateTime: null,
    locationName: null,
  }));
```

#### 6. Visibility Mode → FeaturesConfig
```typescript
const wizardFeaturesConfig: any = {};
if (bodyData.visibilityMode) {
  if (bodyData.visibilityMode === 'mystery') {
    wizardFeaturesConfig.mysteryMode = true;
  }
  if (bodyData.visibilityMode === 'moderated') {
    wizardFeaturesConfig.moderationRequired = true;
  }
}
if (bodyData.guestbook?.enabled !== undefined) {
  wizardFeaturesConfig.allowGuestbook = bodyData.guestbook.enabled;
}
```

#### 7. Image Upload nach Event-Creation
```typescript
// Upload cover image
if (files?.coverImage?.[0]) {
  const file = files.coverImage[0];
  const storagePath = await storageService.uploadFile(
    event.id, 
    file.originalname, 
    file.buffer, 
    file.mimetype
  );
  coverImageUrl = `/api/events/${event.id}/design/file/${encodeURIComponent(storagePath)}`;
  await prisma.event.update({
    where: { id: event.id },
    data: {
      designConfig: {
        ...(event.designConfig as any),
        coverImage: coverImageUrl,
        coverImageStoragePath: storagePath,
      },
    },
  });
}
```

#### 8. Challenge-Creation
```typescript
const wizardChallenges = (bodyData.challenges || []) as Array<{
  label: string; 
  icon: string; 
  enabled: boolean
}>;

if (wizardChallenges.length > 0) {
  const challengesToCreate = wizardChallenges
    .filter((c) => c.enabled && c.label.trim().length > 0)
    .map((c, idx) => ({
      eventId: event.id,
      title: c.label,
      order: idx,
      isActive: true,
      isVisible: true,
    }));
  
  if (challengesToCreate.length > 0) {
    await prisma.challenge.createMany({ data: challengesToCreate });
  }
}
```

#### 9. Guestbook Config
```typescript
const event = await prisma.event.create({
  data: {
    // ...
    guestbookHostMessage: bodyData.guestbook?.message || null,
    // ...
  }
});
```

#### 10. Co-Host Invitations (Placeholder)
```typescript
const coHostEmails = (bodyData.coHostEmails || []) as string[];
if (coHostEmails.length > 0) {
  // TODO: Implement co-host invitation email sending
  logger.info('Co-host invitations to send', { 
    eventId: event.id, 
    emails: coHostEmails 
  });
}
```

---

## API Request Format

### POST /api/events

**Content-Type:** `multipart/form-data`

**Fields:**
```
title: string
dateTime: ISO string
location?: string
password: string
visibilityMode: 'instant' | 'mystery' | 'moderated'
colorScheme: 'elegant' | 'romantic' | 'modern' | 'colorful'
coverImage?: File
profileImage?: File
albums: JSON string (Array<AlbumConfig>)
challenges?: JSON string (Array<ChallengeConfig>)
guestbook?: JSON string ({ enabled, message, allowVoice })
coHostEmails?: JSON string (string[])
```

**Response:**
```json
{
  "event": { ... },
  "id": "event-uuid"
}
```

---

## Datenbank-Mapping

| Wizard-Feld | Prisma Model | Feld | Transformation |
|-------------|--------------|------|----------------|
| `password` | `Event` | `password` | bcrypt hash |
| `colorScheme` | `Event` | `designConfig.colorScheme` | Direct |
| `visibilityMode=mystery` | `Event` | `featuresConfig.mysteryMode` | Boolean |
| `visibilityMode=moderated` | `Event` | `featuresConfig.moderationRequired` | Boolean |
| `coverImage` | `Event` | `designConfig.coverImage` | S3 URL |
| `profileImage` | `Event` | `designConfig.profileImage` | S3 URL |
| `albums[]` | `Category` | `name, uploadLocked` | Map array |
| `challenges[]` | `Challenge` | `title, order` | Map array |
| `guestbook.message` | `Event` | `guestbookHostMessage` | Direct |
| `guestbook.enabled` | `Event` | `featuresConfig.allowGuestbook` | Boolean |

---

## Bestehende Datenbank-Felder

### Event Model (bereits vorhanden)
```prisma
model Event {
  id                     String   @id @default(uuid())
  hostId                 String
  slug                   String   @unique
  title                  String
  dateTime               DateTime?
  locationName           String?
  password               String?  // ✅ bcrypt hash
  designConfig           Json?    // ✅ colorScheme, coverImage, profileImage
  featuresConfig         Json     // ✅ mysteryMode, moderationRequired, allowGuestbook
  guestbookHostMessage   String?  // ✅ Guestbook message
  
  categories Category[]   // ✅ Albums
  challenges Challenge[]  // ✅ Challenges
  members    EventMember[] // ✅ Co-Hosts (später)
}
```

### Challenge Model (bereits vorhanden)
```prisma
model Challenge {
  id          String   @id @default(uuid())
  eventId     String
  categoryId  String?
  title       String   // ✅ Challenge label
  description String?
  order       Int      // ✅ Sort order
  isActive    Boolean  // ✅ enabled
  isVisible   Boolean
}
```

### Category Model (bereits vorhanden)
```prisma
model Category {
  id             String    @id @default(uuid())
  eventId        String
  name           String    // ✅ Album label
  order          Int       // ✅ Sort order
  isVisible      Boolean   // ✅ enabled
  uploadLocked   Boolean   // ✅ hostOnly
}
```

---

## Fehlende Implementierung

### Co-Host Email Invitations
**Status:** Placeholder implementiert, Email-Service fehlt noch

**Nächste Schritte:**
1. Email-Template für Co-Host Einladungen erstellen
2. JWT-Token für Invite-Links generieren
3. Email-Service (Resend/SendGrid) integrieren
4. Route für `/api/cohostInvites/accept` bereits vorhanden

**Temporärer Workaround:**
Logs zeigen eingeladene Emails → Manuelles Hinzufügen als EventMember möglich

---

## Testing Checklist

### ✅ Kompilierung
- [x] Frontend Build erfolgreich (221 kB)
- [x] Backend TypeScript erfolgreich
- [x] Backend Build erfolgreich

### ⏳ Funktionale Tests (User muss durchführen)
- [ ] Event erstellen mit Cover/Profile Image
- [ ] Password-Schutz testen
- [ ] Mystery Mode vs. Moderated Mode
- [ ] Albums korrekt erstellt
- [ ] Challenges korrekt erstellt
- [ ] Guestbook aktiviert
- [ ] Color Scheme im Frontend angezeigt

### ⏳ Edge Cases
- [ ] Event ohne Bilder erstellen
- [ ] Event ohne Challenges
- [ ] Event ohne Guestbook
- [ ] Nur Quick-Finish (Steps 1-5)
- [ ] Kompletter Extended Flow (Steps 1-9)

---

## Deployment-Hinweise

### Environment Variables (bereits korrekt)
```bash
SEAWEEDFS_ENDPOINT=https://s3.gästefotos.com
SEAWEEDFS_BUCKET=gaestefotos-v2
COOKIE_DOMAIN=.xn--gstefotos-v2a.com
```

### Migration (nicht nötig)
Alle benötigten Felder bereits im Schema vorhanden:
- ✅ `Event.password`
- ✅ `Event.designConfig` (JSON)
- ✅ `Event.featuresConfig` (JSON)
- ✅ `Event.guestbookHostMessage`
- ✅ `Category` model
- ✅ `Challenge` model

### Nginx Upload Limit
**WICHTIG:** Nginx limit auf 50 MB bereits gesetzt (siehe `/docs/TODO.md`)

---

## Nächste Schritte

1. **Lokales Testing:** Dev-Server starten und Wizard durchlaufen
2. **Co-Host Emails:** Email-Service integrieren (optional)
3. **Staging:** Auf Staging-Umgebung deployen
4. **E2E Tests:** Playwright-Tests für Wizard schreiben
5. **Production:** Nach erfolgreichem Testing live schalten

---

**Integration Status:** ✅ **Fertig**  
**Offene Punkte:** Co-Host Email-Service (optional), Funktionales Testing durch User
