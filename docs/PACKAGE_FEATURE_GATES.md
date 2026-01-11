# 🔐 Package Feature Gates - Technische Dokumentation

**Letzte Aktualisierung:** 2026-01-11  
**Status:** Produktiv

---

## Übersicht

Das Paket-System kontrolliert Feature-Verfügbarkeit basierend auf dem gekauften Paket eines Events. Feature-Gates verhindern die Nutzung von Premium-Features in niedrigeren Paketen.

---

## Architektur

### Feature-Gate Service

**Datei:** `packages/backend/src/services/featureGate.ts`

#### Hauptfunktionen

```typescript
// Prüft ob Feature aktiviert ist
isFeatureEnabled(eventId: string, feature: FeatureKey): Promise<boolean>

// Holt Limit-Wert (null = unbegrenzt)
getFeatureLimit(eventId: string, limit: LimitKey): Promise<number | null>

// Wirft Error wenn Feature nicht verfügbar
assertFeatureEnabled(eventId: string, feature: FeatureKey): Promise<void>

// Wirft Error wenn Limit erreicht
assertWithinLimit(eventId: string, limit: LimitKey, currentCount: number): Promise<void>

// Für Frontend: alle Features + Limits
getEventFeatures(eventId: string): Promise<EventFeatures>
```

#### Feature Keys

```typescript
type FeatureKey =
  | 'videoUpload'      // Video-Uploads (nur Premium)
  | 'stories'          // Stories-Feature (Smart+)
  | 'passwordProtect'  // Passwortschutz (Basic+)
  | 'guestbook'        // Gästebuch (Basic+)
  | 'zipDownload'      // Zip-Download (Basic+)
  | 'bulkOperations'   // Bulk-Aktionen (Smart+)
  | 'liveWall'         // Live-Wall (Smart+)
  | 'faceSearch'       // Gesichtssuche (Premium)
  | 'guestlist'        // Gästeliste (Smart+)
  | 'fullInvitation'   // Vollständige Einladung (Premium)
  | 'coHosts'          // Co-Hosts (Basic+)
  | 'adFree';          // Werbefrei (Premium)
```

#### Limit Keys

```typescript
type LimitKey =
  | 'maxCategories'          // Max Alben (Free: 1, Basic: 1, Smart: 3, Premium: ∞)
  | 'maxChallenges'          // Max Challenges (Free: 0, Basic: 5, Smart: ∞, Premium: ∞)
  | 'maxZipDownloadPhotos'   // Max Fotos pro Zip
  | 'maxCoHosts'             // Max Co-Hosts (Free: 0, Basic: 1, Smart: 3, Premium: ∞)
  | 'storageLimitPhotos';    // Max Foto-Anzahl
```

---

## Implementierte Feature-Gates

### 1. Video Upload (Premium only)

**Route:** `packages/backend/src/routes/videos.ts:358`

```typescript
await assertFeatureEnabled(eventId, 'videoUpload');
```

**Fehler-Response:**
```json
{
  "error": "Video-Uploads sind in deinem aktuellen Paket nicht verfügbar. Upgrade auf Premium für dieses Feature.",
  "code": "FEATURE_NOT_AVAILABLE",
  "requiredUpgrade": true
}
```

**Paket-Verfügbarkeit:**
- ❌ Free
- ❌ Basic
- ❌ Smart
- ✅ Premium

---

### 2. Stories (Smart+)

**Route:** `packages/backend/src/routes/stories.ts:136`

```typescript
await assertFeatureEnabled(eventId, 'stories');
```

**Fehler-Response:**
```json
{
  "error": "Stories sind in deinem aktuellen Paket nicht verfügbar. Upgrade auf Smart oder Premium.",
  "code": "FEATURE_NOT_AVAILABLE",
  "requiredUpgrade": true
}
```

**Paket-Verfügbarkeit:**
- ❌ Free
- ❌ Basic
- ✅ Smart
- ✅ Premium

---

### 3. Challenges Limit

**Route:** `packages/backend/src/routes/challenges.ts:128`

```typescript
const currentChallengeCount = await prisma.challenge.count({ where: { eventId } });
await assertWithinLimit(eventId, 'maxChallenges', currentChallengeCount);
```

**Fehler-Response:**
```json
{
  "error": "Du hast das Limit von 5 Challenges erreicht. Upgrade auf Smart für unbegrenzte Challenges.",
  "code": "LIMIT_REACHED",
  "currentCount": 5,
  "requiredUpgrade": true
}
```

**Paket-Limits:**
- Free: **0** Challenges
- Basic: **5** Challenges
- Smart: **unbegrenzt**
- Premium: **unbegrenzt**

---

### 4. Categories (Alben) Limit

**Route:** `packages/backend/src/routes/categories.ts:141`

```typescript
const currentCategoryCount = await prisma.category.count({ where: { eventId } });
await assertWithinLimit(eventId, 'maxCategories', currentCategoryCount);
```

**Fehler-Response:**
```json
{
  "error": "Du hast das Limit von 1 Alben erreicht. Upgrade auf Smart für 3 Alben.",
  "code": "LIMIT_REACHED",
  "currentCount": 1,
  "requiredUpgrade": true
}
```

**Paket-Limits:**
- Free: **1** Album
- Basic: **1** Album
- Smart: **3** Alben
- Premium: **unbegrenzt**

---

### 5. Guestbook (Basic+)

**Route:** `packages/backend/src/routes/guestbook.ts:390`

```typescript
await assertFeatureEnabled(eventId, 'guestbook');
```

**Fehler-Response:**
```json
{
  "error": "Gästebuch ist in deinem aktuellen Paket nicht verfügbar. Upgrade auf Basic oder höher.",
  "code": "FEATURE_NOT_AVAILABLE",
  "requiredUpgrade": true
}
```

**Paket-Verfügbarkeit:**
- ❌ Free
- ✅ Basic
- ✅ Smart
- ✅ Premium

---

### 6. Face Search (Premium only)

**Route:** `packages/backend/src/routes/faceSearch.ts:387`

```typescript
await assertFeatureEnabled(eventId, 'faceSearch');
```

**Fehler-Response:**
```json
{
  "error": "Gesichtssuche ist in deinem aktuellen Paket nicht verfügbar. Upgrade auf Premium für dieses Feature.",
  "code": "FEATURE_NOT_AVAILABLE",
  "requiredUpgrade": true
}
```

**Paket-Verfügbarkeit:**
- ❌ Free
- ❌ Basic
- ❌ Smart
- ✅ Premium

---

### 7. Co-Hosts (Basic+)

**Routes:** 
- `packages/backend/src/routes/cohosts.ts:161` (add co-host)
- `packages/backend/src/routes/cohosts.ts:290` (invite token)
- `packages/backend/src/routes/cohostInvites.ts:60` (accept invite)

```typescript
await assertFeatureEnabled(eventId, 'coHosts');

const currentCount = await prisma.eventMember.count({ where: { eventId } });
await assertWithinLimit(eventId, 'maxCoHosts', currentCount);
```

**Fehler-Response:**
```json
{
  "error": "Co-Hosts sind in deinem aktuellen Paket nicht verfügbar. Upgrade für dieses Feature.",
  "code": "FEATURE_NOT_AVAILABLE",
  "requiredUpgrade": true
}
```

**Limit-Response:**
```json
{
  "error": "Limit für maxCoHosts erreicht (1/1). Upgrade für mehr.",
  "code": "LIMIT_REACHED",
  "currentCount": 1,
  "maxAllowed": 1,
  "requiredUpgrade": true
}
```

**Paket-Verfügbarkeit:**
- ❌ Free (0 Co-Hosts)
- ❌ Basic (0 Co-Hosts)
- ✅ Smart (2 Co-Hosts)
- ✅ Premium (unbegrenzt)

---

## Package-Info Endpoint

**Endpoint:** `GET /api/events/:id/package-info`

**Response:**
```json
{
  "packageSku": "premium",
  "packageName": "Premium",
  "tier": "PREMIUM",
  "features": {
    "videoUpload": true,
    "stories": true,
    "passwordProtect": true,
    "guestbook": true,
    "zipDownload": true,
    "bulkOperations": true,
    "liveWall": true,
    "faceSearch": true,
    "guestlist": true,
    "fullInvitation": true,
    "coHosts": true,
    "adFree": true
  },
  "limits": {
    "maxCategories": null,
    "maxChallenges": null,
    "maxZipDownloadPhotos": null,
    "maxCoHosts": null,
    "storageLimitPhotos": null
  },
  "usage": {
    "photosBytes": "1234567890",
    "videosBytes": "0",
    "guestbookBytes": "0",
    "totalBytes": "1234567890"
  },
  "storageEndsAt": "2027-01-11T00:00:00.000Z",
  "isStorageLocked": false
}
```

**Verwendung im Frontend:**
```typescript
const packageInfo = await fetch(`/api/events/${eventId}/package-info`).then(r => r.json());

// Feature prüfen
if (!packageInfo.features.videoUpload) {
  showUpgradePrompt('Video-Uploads sind nur in Premium verfügbar');
}

// Limit prüfen
if (packageInfo.limits.maxCategories && categoryCount >= packageInfo.limits.maxCategories) {
  showUpgradePrompt(`Du hast das Limit von ${packageInfo.limits.maxCategories} Alben erreicht`);
}
```

---

## Paket-Matrix (Übersicht)

| Feature | Free | Basic | Smart | Premium |
|---------|------|-------|-------|---------|
| **Foto Upload** | ✅ | ✅ | ✅ | ✅ |
| **Video Upload** | ❌ | ❌ | ❌ | ✅ |
| **Stories** | ❌ | ❌ | ✅ | ✅ |
| **Passwortschutz** | ❌ | ✅ | ✅ | ✅ |
| **Gästebuch** | ❌ | ✅ | ✅ | ✅ |
| **Zip Download** | ❌ | ✅ (200 Fotos) | ✅ (500 Fotos) | ✅ (∞) |
| **Gesichtssuche** | ❌ | ❌ | ❌ | ✅ |
| **Co-Hosts** | ❌ | 1 | 3 | ∞ |
| **Alben** | 1 | 1 | 3 | ∞ |
| **Challenges** | 0 | 5 | ∞ | ∞ |
| **Storage** | 50 Fotos | 300 Fotos | 1000 Fotos | 5000 Fotos |
| **Laufzeit** | 14 Tage | 30 Tage | 6 Monate | 1 Jahr |
| **Werbefrei** | ❌ | ❌ | ❌ | ✅ |

---

## Fehlerbehandlung

### Frontend Error Handling

```typescript
try {
  await createStory(photoId);
} catch (error) {
  if (error.response?.data?.code === 'FEATURE_NOT_AVAILABLE') {
    // Feature nicht verfügbar
    showUpgradeModal({
      feature: 'Stories',
      message: error.response.data.error,
      upgradeUrl: 'https://gästefotos.com/upgrade'
    });
  } else if (error.response?.data?.code === 'LIMIT_REACHED') {
    // Limit erreicht
    showUpgradeModal({
      feature: 'Challenges',
      currentCount: error.response.data.currentCount,
      message: error.response.data.error,
      upgradeUrl: 'https://gästefotos.com/upgrade'
    });
  }
}
```

---

## Noch zu implementieren

### Co-Host Management

**Route:** `packages/backend/src/routes/eventMembers.ts` (noch nicht implementiert)

```typescript
// Beim Hinzufügen eines Co-Hosts:
const currentCoHostCount = await prisma.eventMember.count({
  where: { eventId, role: 'COHOST' }
});
await assertWithinLimit(eventId, 'maxCoHosts', currentCoHostCount);
```

**Limits:**
- Free: **0** Co-Hosts
- Basic: **1** Co-Host
- Smart: **3** Co-Hosts
- Premium: **unbegrenzt**

---

## Testing

### Manueller Test

```bash
# Event mit Free-Paket erstellen
curl -X POST http://localhost:8001/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Event","dateTime":"2026-06-01"}'

# Video Upload versuchen (sollte 403 werfen)
curl -X POST http://localhost:8001/api/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.mp4"

# Response:
# {
#   "error": "Video-Uploads sind in deinem aktuellen Paket nicht verfügbar...",
#   "code": "FEATURE_NOT_AVAILABLE",
#   "requiredUpgrade": true
# }
```

---

## Laien-Erklärung

**Was sind Feature-Gates?**

Feature-Gates sind wie digitale "Türsteher" in der App. Sie prüfen bei jeder Aktion, ob das Event-Paket des Nutzers diese Funktion erlaubt.

**Beispiel:**

1. **Host versucht Video hochzuladen**
2. **System prüft:** "Hat dieses Event das Premium-Paket?"
3. **Wenn NEIN:** Fehlermeldung + Upgrade-Hinweis
4. **Wenn JA:** Upload wird zugelassen

**Vorteile:**
- ✅ Klare Paket-Unterscheidung
- ✅ Upgrade-Anreize
- ✅ Verhindert Feature-Missbrauch
- ✅ Skalierbare Architektur

**Für den Host:**
Der Host sieht Premium-Features in der UI, aber sie sind ausgegraut mit "🔒 Premium Feature" Badge. Bei Klick erscheint ein Upgrade-Hinweis.

---

## Zusammenfassung

✅ **6 Feature-Gates aktiv**  
✅ **2 Limit-Gates aktiv**  
✅ **Package-Info Endpoint verfügbar**  
✅ **Backend deployed und produktiv**  
🔜 **Co-Host Management noch ausstehend**  
🔜 **Frontend Integration noch ausstehend**
