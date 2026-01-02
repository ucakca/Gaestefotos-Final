# DB Field Meanings (Prisma / PostgreSQL)

Ziel: Dieses Dokument ist die **Single Source of Truth**, welche DB-Felder was bedeuten und welche Produkt-Logiken daran hängen.

> Quelle: `packages/backend/prisma/schema.prisma` + referenzierte Service-/Route-Dateien.

---

## Event (`events`)

### Identität / Lifecycle

- `Event.id`
  - Primärschlüssel (UUID).

- `Event.hostId`
  - Besitzer des Events (`User.id`).

- `Event.slug`
  - Public Identifier für Gast-URL (z.B. `/e2/<slug>`).

- `Event.eventCode`
  - Optionaler zusätzlicher Identifier (z.B. Einladungscode).

- `Event.isActive`
  - Soft-disable Flag. `false` bedeutet: Event ist im System vorhanden, aber nicht nutzbar.

- `Event.deletedAt`
  - Soft-delete Marker. Wenn gesetzt, wird das Event als gelöscht behandelt.

- `Event.purgeAfter`
  - Zeitpunkt, ab dem ein Cleanup/Purge stattfinden kann.

### Event-Infos

- `Event.title`
  - Anzeigename.

- `Event.dateTime`
  - Event-Datum/Uhrzeit für Anzeige und Upload-Window-Heuristiken.
  - **Wichtig:** `dateTime` ist **nicht** der Startpunkt der Storage-Frist (siehe Storage Policy).

- `Event.locationName`, `Event.locationGoogleMapsLink`
  - Optionale Ortsdaten.

- `Event.profileDescription`
  - Optionaler Profil-/Beschreibungstext für die Guest-Ansicht (z.B. unter dem Titel auf `/e2/<slug>`).

### Zugangs- / Feature-Config

- `Event.password`
  - (gehashtes) Passwort für passwortgeschützte Events.

- `Event.featuresConfig` (JSON)
  - Feature Flags / Verhalten für Guest UX.
  - Beispiele:
    - `allowUploads`
    - `allowDownloads`
    - `moderationRequired`
    - `mysteryMode`
    - `showGuestlist`
  - Details/Schema/Enforcement: `docs/EVENT_FEATURES_CONFIG.md`

- `Event.designConfig` (JSON)
  - Design/Branding (Farben, Logo, QR, etc.).
  - **Zweck (laiensicher):**
    - Steuert das Aussehen des Events (Farben, Bilder, ggf. QR‑Darstellung).
    - Wird im Event-Dashboard unter „Design“ gepflegt.
  - **Zweck (technisch):**
    - Flexibles JSON Feld, das UI-/Branding-Parameter pro Event speichert.
    - Enthält u.a. (je nach Feature/Editor):
      - `colors` (primary/secondary/accent)
      - `fonts`
      - `coverImageUrl` (bzw. weitere Asset-URLs)
      - `qrCodeConfig` (QR-Code Darstellung in der Design-Seite)
      - `qrTemplateConfig` (Persistenz des QR‑Styler Templates)
  - Details/Schema/API: `docs/EVENT_DESIGNCONFIG_AND_QR_TEMPLATE_CONFIG.md`

- `Event.designAssetsBytes`
  - Aggregat/Accounting für Design-Uploads.

### Systemfelder

- `Event.createdAt`
  - Zeitpunkt der Event-Erstellung in der DB.

- `Event.updatedAt`
  - Zeitpunkt der letzten DB-Änderung.

---

## Storage/Blur/Lock Policy (zentral)

### Kerndefinition

- **Startpunkt der Speicherdauer:** `firstMediaAt`
  - Das ist der Zeitpunkt des **ersten Uploads eines Mediums** in diesem Event.

- **storageDurationDays**
  - Paketabhängig (FREE default `14`).

- **storageEndsAt**
  - `storageEndsAt = firstMediaAt + storageDurationDays`

- **isStorageLocked**
  - `isStorageLocked = now > storageEndsAt`

### Quelle im Code

- Berechnung:
  - `packages/backend/src/services/storagePolicy.ts`
    - `getEventStorageEndsAt(eventId)`
    - `isEventStorageLocked(eventId)`

- Event APIs liefern:
  - `packages/backend/src/routes/events.ts`
    - `storageEndsAt`, `isStorageLocked`, `effectivePackage`

- Media Delivery ist serverseitig enforced:
  - `packages/backend/src/routes/photos.ts` → `GET /api/photos/:photoId/file`

### Wichtiges Produktverhalten

- Solange `isStorageLocked=false`:
  - Medien normal sichtbar.

- Sobald `isStorageLocked=true`:
  - **Strikte Policy:** Blur/Preview für **alle** (inkl. Host), bis Upgrade.

Siehe Details: `docs/STORAGE_AND_BLUR_POLICY.md`.

---

## Medien-Tabellen

### Photo (`photos`)

- `Photo.eventId`
  - Zugehöriges Event.

- `Photo.storagePath`
  - S3/SeaweedFS Objektpfad (autoritativer Speicherort).

- `Photo.url`
  - Optionaler (legacy) URL-Fallback.

- `Photo.status`
  - Moderation State:
    - `PENDING`, `APPROVED`, `REJECTED`, `DELETED`

- `Photo.deletedAt`
  - Soft-delete Marker.

- `Photo.purgeAfter`
  - Cleanup Zeitpunkt.

- `Photo.sizeBytes`
  - Speicherkosten Accounting.

- `Photo.createdAt`
  - Zeitpunkt des Uploads.
  - **Wichtig:** fließt in `firstMediaAt` ein (Storage-Frist Start).

- `Photo.isStoryOnly`
  - Wenn `true`, ist dieses Foto **nur** für Stories gedacht und wird aus der regulären Grid-/Feed-Listung standardmäßig ausgeschlossen.

### Video (`videos`)

- Analog zu `Photo`:
  - `storagePath`, `status`, `deletedAt`, `purgeAfter`, `sizeBytes`, `createdAt`

- `Video.isStoryOnly`
  - Wenn `true`, ist dieses Video **nur** für Stories gedacht und wird aus der regulären Grid-/Feed-Listung standardmäßig ausgeschlossen.

- `Video.thumbnailPath`
  - Pfad zum Thumbnail.

- `Video.createdAt`
  - Fließt in `firstMediaAt` ein.

### GuestbookEntry (`guestbook_entries`)

- `GuestbookEntry.photoStoragePath`
  - Optional: Foto-Upload im Gästebuch.

- `GuestbookEntry.status`
  - Moderation State:
    - `PENDING`, `APPROVED`, `REJECTED`

- `GuestbookEntry.isPublic`
  - Ob der Eintrag im Feed sichtbar ist.

- `GuestbookEntry.createdAt`
  - Fließt in `firstMediaAt` ein.

---

## Stories

### Story (`stories`)

- `Story.eventId`
  - Zugehöriges Event.

- `Story.photoId`, `Story.videoId`
  - Eine Story referenziert **entweder** ein Foto **oder** ein Video.
  - Das referenzierte Medium wird im Story-Viewer angezeigt.

- `Story.createdAt`, `Story.updatedAt`
  - Timestamps.

---

## Packages / Entitlements

### EventEntitlement (`event_entitlements`)

- `EventEntitlement.status`
  - `ACTIVE` ist maßgeblich.

- `EventEntitlement.wcSku`
  - SKU der bezahlten Option (WooCommerce).

- `EventEntitlement.storageLimitBytes`
  - Optional: Limit direkt aus Entitlement.

- `EventEntitlement.wpUserId`
  - Käufer/Owner Referenz (WordPress User).

### PackageDefinition (`package_definitions`)

- `PackageDefinition.sku`
  - SKU-Mapping.

---

## CMS Content Snapshots

### CmsContentSnapshot (`cms_content_snapshots`)

- **Zweck (laiensicher):**
  - Diese Tabelle speichert eine **Kopie (Snapshot)** von wichtigen WordPress-Inhalten (z.B. FAQ-Seite).
  - Vorteil: Die Gästefotos-App kann die Inhalte **stabil und schnell** aus der eigenen Datenbank anzeigen, auch wenn WordPress gerade langsam ist oder Plugins/Page-Builder im WP-REST-API keinen Editor-Text liefern.

- **Zweck (technisch):**
  - Persistierte Quelle für HTML/Excerpt von WP-Seiten/Posts.
  - Wird über Admin CMS Sync (`/api/admin/cms/*`) aktualisiert.
  - Bei WordPress-Instanzen, die `content.rendered` leer liefern (Theme/Page-Builder), nutzt der Sync einen Fallback:
    - Fetch von `link` (public page) und Extraktion des Hauptbereichs (z.B. `<main>`).

#### Felder

- `CmsContentSnapshot.id`
  - Primärschlüssel (UUID).

- `CmsContentSnapshot.kind`
  - Quelle/Typ: `pages` oder `posts`.

- `CmsContentSnapshot.slug`
  - WordPress Slug (URL-Teil, z.B. `faq`).
  - Unique zusammen mit `kind`.

- `CmsContentSnapshot.title`
  - Titel aus WordPress (`title.rendered`).

- `CmsContentSnapshot.html`
  - Gespeicherter HTML-Inhalt.
  - Kann aus `content.rendered` kommen oder aus dem Fallback `link.<main|article|body>`.

- `CmsContentSnapshot.excerpt`
  - Optionaler Auszug aus WordPress (`excerpt.rendered`).

- `CmsContentSnapshot.sourceUrl`
  - Die WP-REST-URL, die beim Sync verwendet wurde.

- `CmsContentSnapshot.link`
  - Öffentliche URL der Seite/Posts (wichtig für den HTML-Fallback).

- `CmsContentSnapshot.modifiedGmt`
  - `modified_gmt` aus WordPress (String).

- `CmsContentSnapshot.fetchedAt`
  - Zeitpunkt des letzten erfolgreichen Fetch/Snapshots.

- `CmsContentSnapshot.createdAt`, `CmsContentSnapshot.updatedAt`
  - System-Timestamps.

- `PackageDefinition.storageDurationDays`
  - Überschreibt Default Dauer, wenn gesetzt.

- `PackageDefinition.resultingTier`
  - Fallback-Tier (`FREE`, `SMART`, `PREMIUM`, ...), wenn `storageDurationDays` nicht gesetzt.

### Effective Package (Runtime)

- Berechnung:
  - `packages/backend/src/services/packageLimits.ts` → `getEffectiveEventPackage(eventId)`

- In Event API enthalten als:
  - `event.effectivePackage`

---

## App Settings (Systemweite Konfiguration)

### AppSetting (`app_settings`)

- **Zweck (laiensicher):**
  - Speichert zentrale, systemweite Einstellungen (z.B. Theme-Farben) in der Datenbank.
  - Vorteil: Änderungen wirken sofort, ohne dass man Code deployen muss.

- **Zweck (technisch):**
  - Key/Value Store für globale Konfiguration.
  - Prisma Model: `packages/backend/prisma/schema.prisma` → `model AppSetting`.

#### Felder

- `AppSetting.key`
  - Primärschlüssel.
  - Beispiele: `theme_tokens_v1`, `face_search_consent_v1`.

- `AppSetting.value` (JSON)
  - Struktur hängt vom `key` ab.

#### Keys & Value Schema

- `theme_tokens_v1`
  - **Wofür:** Systemweite CSS Custom Properties (Theme Tokens).
  - **Value Schema:**

    ```json
    {
      "tokens": {
        "--app-bg": "#ffffff",
        "--app-fg": "#111827"
      }
    }
    ```

  - **Code:**
    - Admin API: `packages/backend/src/routes/adminTheme.ts`
    - Public Read API: `packages/backend/src/routes/theme.ts`
    - Admin UI: `packages/admin-dashboard/src/app/settings/page.tsx`

- `face_search_consent_v1`
  - **Wofür:** Systemweiter Hinweistext + Checkbox-Label für Face Search Consent.
  - **Value Schema:**

    ```json
    {
      "noticeText": "…",
      "checkboxLabel": "…"
    }
    ```

  - **Code:**
    - Admin API: `packages/backend/src/routes/adminFaceSearchConsent.ts`
    - Admin UI: `packages/admin-dashboard/src/app/settings/page.tsx`

---

## Access / Auth (Kurz)

- Gästezugang ist cookie/token-basiert und wird bei `GET /api/events/slug/:slug` initialisiert.
- Implementierung: `packages/backend/src/middleware/auth.ts` und `packages/backend/src/routes/events.ts`.

- Storage Accounting / Usage ist **host/admin-only**:
  - `GET /api/events/:id/usage`
  - `GET /api/events/:id/storage-limits`
  - Für Gäste soll hier **kein 401** entstehen (da Gäste typischerweise kein JWT haben), sondern ein unauffälliges **404**.

---

## Storage Lock (Guest UX)

- Backend erzwingt Storage Lock serverseitig (z.B. Foto/Video File Endpoints).
- Guest-Seite (`/e2/[slug]`) soll bei `isStorageLocked=true`:
  - **Fotos weiterhin anzeigen**, aber als Preview **unscharf** (Blur ist Teil der “locked” Experience).
  - **Kein Upgrade-CTA** für Gäste anzeigen (Entscheidung liegt beim Host).
  - Ein **kurzer, erklärender Hinweis-Banner** ist ok (rein informativ).
  - Primary Upload CTA bleibt sichtbar, ist aber **disabled** (psychologischer Effekt + Klarheit).

- Frontend Implementierung:
  - `packages/frontend/src/app/e2/[slug]/page.tsx` (Verdrahtung von `isStorageLocked`, `uploadDisabled`, `uploadDisabledReason`)
  - `packages/frontend/src/components/EventHeader.tsx` (Hero + Hinweis-Banner)
  - `packages/frontend/src/components/ModernPhotoGrid.tsx` (Blur/locked Darstellung in Grid)

---

## Erweiterung

Dieses Dokument wird iterativ erweitert (z.B. Stories, Challenges, Votes, Duplicates, FaceSearch).
