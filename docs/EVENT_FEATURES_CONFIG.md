# Event.featuresConfig (Guest UX Flags) – technisch + laiensicher

Ziel: Dokumentiert, welche Feature-Flags pro Event existieren, wie Defaults sind, wo sie enforced werden, und was das für Host/Gäste bedeutet.

---

## Laiensicher (Was ist das?)

`featuresConfig` ist eine Sammlung von Schaltern (Flags), mit denen ein Host/Admin pro Event steuert, **was Gäste dürfen** und **wie Inhalte erscheinen**.

Typische Beispiele:

- Uploads erlauben oder sperren
- Downloads erlauben oder sperren
- Moderation erzwingen (Uploads müssen erst freigegeben werden)
- „Mystery Mode“ (besondere Guest UX)
- Gästeliste anzeigen/ausblenden

Wichtig:

- Manche Flags wirken „nur“ in der Oberfläche.
- Kritische Dinge (Uploads/Downloads) werden zusätzlich **serverseitig enforced**, damit man es nicht per Browser-Trick umgehen kann.

---

## Technisch (Datenmodell)

- Feld: `Event.featuresConfig` (JSON)
- Shared TS Typ (Basis): `packages/shared/src/types/index.ts` → `EventFeaturesConfig`
  - Enthält aktuell (typed):
    - `showGuestlist: boolean`
    - `mysteryMode: boolean`
    - `allowUploads: boolean`
    - `moderationRequired: boolean`
    - `allowDownloads: boolean`

In der Praxis wird `featuresConfig` aber teilweise „erweitert“ genutzt (als untyped JSON) für zusätzliche Optionen (siehe unten).

---

## Kern-Flags (MVP) + Verhalten

### `allowUploads`

- **Bedeutung:** Ob Gäste Medien hochladen dürfen.
- **Default:** `true`
- **Frontend Nutzung:**
  - `packages/frontend/src/hooks/useGuestEventData.ts`
    - bestimmt `uploadDisabled` / `uploadDisabledReason`
  - `packages/frontend/src/components/ModernPhotoGrid.tsx`
    - zeigt Upload UI nur wenn `allowUploads`
- **Backend Enforcement:**
  - `packages/backend/src/routes/photos.ts` → Upload Guard (`enforceEventUploadAllowed`)
  - `packages/backend/src/routes/videos.ts` → analog für Video Upload

Zusätzliche Blocker (auch wenn `allowUploads=true`):

- Storage Lock (Speicherperiode abgelaufen)
- Upload-Window um das Event-Datum (±1 Tag)

### `allowDownloads`

- **Bedeutung:** Ob Gäste Download-Buttons sehen/nutzen dürfen.
- **Default:** `true`
- **Frontend Nutzung:**
  - `packages/frontend/src/app/e2/[slug]/page.tsx` (prop `allowDownloads` in Grid)
  - `packages/frontend/src/components/ModernPhotoGrid.tsx` (Downloads disabled wenn storage locked)
  - `packages/frontend/src/components/InstagramGallery.tsx` / `Gallery.tsx`
- **Backend Enforcement:**
  - `packages/backend/src/routes/photos.ts` (Download: Gäste nur wenn nicht `allowDownloads === false`)
  - `packages/backend/src/routes/events.ts` (z.B. Event Download Endpoints)

### `moderationRequired`

- **Bedeutung:** Uploads von Gästen landen zunächst in „Pending“ und müssen freigegeben werden.
- **Default:** `false`
- **Frontend Nutzung:**
  - `packages/frontend/src/hooks/useGuestEventData.ts`
    - Gäste sehen (implizit) nur `APPROVED` wenn Moderation aktiv ist
- **Backend Enforcement:**
  - `packages/backend/src/routes/photos.ts`
    - setzt Status auf `PENDING` für Gäste, `APPROVED` für Host/Admin
  - `packages/backend/src/routes/videos.ts`
    - analog

### `mysteryMode`

- **Bedeutung:** Alternative Guest UX (z.B. „Mystery“/versteckte Darstellung).
- **Default:** `false`
- **Frontend Nutzung:**
  - `packages/frontend/src/app/e2/[slug]/page.tsx` (conditional rendering)

### `showGuestlist`

- **Bedeutung:** Ob Gästeliste sichtbar ist.
- **Default:** `true`
- **Frontend/Admin:**
  - konfigurierbar u.a. im Event Edit UI (`packages/frontend/src/app/events/[id]/edit/page.tsx`)

---

## Erweiterte Flags (untyped, aber genutzt)

Diese Flags sind in `featuresConfig` bereits im Code vorgesehen, aber nicht (oder noch nicht) im shared TS Interface abgebildet:

### `allowComments` (default true)

- **Bedeutung:** Aktiviert/Deaktiviert Kommentare.
- **Backend Enforcement:**
  - `packages/backend/src/routes/comments.ts`
    - `allowComments !== false` → sonst 404
- **Frontend Nutzung:**
  - `packages/frontend/src/app/e2/[slug]/page.tsx` gibt `allowComments` an `ModernPhotoGrid`

### `moderateComments` (default false)

- **Bedeutung:** Kommentare müssen freigegeben werden.
- **Backend:**
  - `packages/backend/src/routes/comments.ts`
    - initialStatus `PENDING` wenn `moderateComments === true`

### `faceSearch` (default true)

- **Bedeutung:** Face Search Feature an/aus.
- **Frontend:**
  - `packages/frontend/src/app/e2/[slug]/page.tsx` zeigt `FaceSearch` nur wenn `faceSearch !== false`
- **Backend Enforcement:**
  - `packages/backend/src/routes/faceSearch.ts` → `faceSearch !== false` sonst 404

### `uploadRateLimits`

- **Zweck:** Per-Event Overrides für Rate Limits (anti-spam/abuse).
- **Backend:**
  - `packages/backend/src/middleware/rateLimit.ts`
    - lädt `featuresConfig.uploadRateLimits` und hängt es als `req.uploadRateLimits` an
    - Limiter lesen daraus `photoIpMax`, `photoEventMax`, `videoIpMax`, `videoEventMax`
- **Admin UI:**
  - `packages/admin-dashboard/src/app/events/[id]/page.tsx` (speichert in `featuresConfig.uploadRateLimits`)

### `uploadDatePolicy`

- **Zweck:** Konfigurierbares Upload-Zeitfenster um das Event-Datum.
- **Backend:**
  - `packages/backend/src/routes/videos.ts` referenziert `uploadDatePolicy` (enabled/toleranceDays)
- **Admin UI:**
  - `packages/admin-dashboard/src/app/events/[id]/page.tsx`

---

## Defaults (wo festgelegt?)

- Beim Event Create/Init:
  - `packages/backend/src/routes/events.ts`
    - Default Object enthält: `showGuestlist`, `mysteryMode`, `allowUploads`, `moderationRequired`, `allowDownloads`

---

## Hinweise / Tech Debt

- `EventFeaturesConfig` (shared) bildet nur die Kernflags ab.
- Im Backend/Frontend wird `featuresConfig` an mehreren Stellen als `any` verwendet.
- Wenn wir weitere Flags langfristig unterstützen, sollten wir:
  - das Shared Interface erweitern
  - und/oder `zod` Schemas für bekannte Subkeys definieren

