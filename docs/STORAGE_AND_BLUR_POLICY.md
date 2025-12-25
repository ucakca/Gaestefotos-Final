# Storage & Blur Policy

## Ziel

Diese Policy beschreibt, **wann Fotos/Videos im Event “normal” sichtbar sind** und **wann ein Blur/Lock aktiv wird**.

## Definitionen

- **storageDurationDays**
  - Anzahl Tage Speicherdauer, abhängig vom Paket.
  - Default (FREE): `14` Tage.
  - Bei Upgrade: wird über das aktive Entitlement (`EventEntitlement.wcSku`) und `PackageDefinition.storageDurationDays` bestimmt.

- **firstMediaAt**
  - Zeitpunkt des **ersten Uploads eines Mediums** in einem Event.
  - Medium = frühestes `createdAt` aus:
    - `Photo` (nicht gelöscht)
    - `Video` (nicht gelöscht)
    - `GuestbookEntry`

- **storageEndsAt**
  - `storageEndsAt = firstMediaAt + storageDurationDays`

- **isStorageLocked**
  - `isStorageLocked = now > storageEndsAt`
  - Wenn `firstMediaAt` fehlt (noch kein Upload): `storageEndsAt = null` und `isStorageLocked = false`.

## Verhalten (Frontend + Backend)

### Solange `isStorageLocked = false`

- Grid/Feed zeigt die Fotos normal.
- Modal darf geöffnet werden.
- `/api/photos/:photoId/file` liefert das Original.

### Sobald `isStorageLocked = true`

- **Strikte Policy:** Für **alle** (Gäste + Host + Admin) sind Medien nur noch als Preview sichtbar.
- `ModernPhotoGrid` blockiert das Öffnen des Foto-Modals.
- `/api/photos/:photoId/file` liefert eine **Blur-Preview** statt dem Original (Server-seitig erzwungen).
- Downloads bleiben deaktiviert.

## Upgrade-Verhalten

- Ein Upgrade (neues aktives Entitlement) ändert `storageDurationDays`.
- Dadurch verschiebt sich `storageEndsAt` automatisch nach hinten:
  - `storageEndsAt = firstMediaAt + newDurationDays`
- Wenn `storageEndsAt` wieder in der Zukunft liegt, wird `isStorageLocked` wieder `false` und Medien sind wieder normal sichtbar.

## Technische Umsetzung (Code)

- **Berechnung:** `packages/backend/src/services/storagePolicy.ts`
  - `getEventStorageEndsAt(eventId)`
  - `isEventStorageLocked(eventId)`

- **Event API liefert Felder:** `packages/backend/src/routes/events.ts`
  - `storageEndsAt`
  - `isStorageLocked`
  - `effectivePackage.packageDefinition.storageDurationDays`

- **Blur-Preview erzwungen:** `packages/backend/src/routes/photos.ts`
  - `GET /api/photos/:photoId/file`

- **UI-Block in Grid:** `packages/frontend/src/components/ModernPhotoGrid.tsx`
  - `openPost()` blockiert bei `isStorageLocked`
  - Thumbnails nutzen `object-cover`
