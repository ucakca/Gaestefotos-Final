# Feature Matrix (✅ implementiert / ◐ teilweise / ❌ fehlt)

Ziel: **eine** Tabelle, in der du sofort siehst, was schon existiert (mit Pfaden/Endpoints) und was fehlt.

Legende:
- ✅ = implementiert
- ◐ = teilweise implementiert (Basis vorhanden, Spec-Teile fehlen)
- ❌ = fehlt

---

## QR / Print / Tracking

- ✅ **QR Templates + Export (PNG/PDF)**
  - Backend: `packages/backend/src/routes/events.ts`
    - `GET /api/events/:id/qr/config`
    - `PUT /api/events/:id/qr/config`
    - `POST /api/events/:id/qr/export.png`
    - `POST /api/events/:id/qr/export.pdf`
  - Frontend Admin: `packages/frontend/src/app/admin/dashboard/page.tsx`

- ✅ **QR source tracking (`?source=qr`)**
  - Frontend:
    - Live Wall: `packages/frontend/src/app/live/[slug]/wall/page.tsx`
    - Admin QR Print-Service: `packages/frontend/src/app/admin/dashboard/page.tsx`
    - Guest `/e`: `packages/frontend/src/app/e/[slug]/page.tsx` (reicht `source` durch)
    - Guest `/e2`: `packages/frontend/src/hooks/useGuestEventData.ts` (reicht `source` durch)
  - Backend:
    - `GET /api/events/slug/:slug?source=...` zählt
    - `GET /api/events/:id/traffic` readback
    - Code: `packages/backend/src/routes/events.ts`
  - DB:
    - Prisma: `EventTrafficStat` in `packages/backend/prisma/schema.prisma`
    - Migration: `packages/backend/prisma/migrations/20251228214500_event_traffic_stats/`

- ✅ **Admin Anzeige "Views by source"**
  - `packages/frontend/src/app/admin/dashboard/page.tsx`
  - Backend: `GET /api/events/:id/traffic`

- ✅ **Smoke verified (Prod Domain)**
  - `GET /api/events/slug/:slug?source=qr` increments `source=qr`
  - `GET /api/events/:id/traffic` readback shows increased count

---

## Core Plattform

- **Auth/Login (JWT + Cookies)**
  - Backend: `packages/backend/src/routes/auth.ts`
  - Middleware: `packages/backend/src/middleware/auth.ts`

- **Events (Create/Read/Update + Public by slug)**
  - Backend: `packages/backend/src/routes/events.ts`
    - `GET /api/events/slug/:slug`

- **Photos/Videos Upload + Moderation (Basis)**
  - Backend: `packages/backend/src/routes/photos.ts`, `packages/backend/src/routes/videos.ts`

- **Moderation (Host UI + API Endpoints)**
  - Frontend: `packages/frontend/src/app/moderation/page.tsx`
    - nutzt `POST /api/photos/:photoId/approve` und `POST /api/photos/:photoId/reject`
    - lädt pending photos pro Event via `GET /api/events/:id/photos?status=PENDING`
  - Backend:
    - Photo moderation: `packages/backend/src/routes/photos.ts`
    - Video moderation: `packages/backend/src/routes/videos.ts`

- **Meine Fotos (Guest: "nur meine Uploads")**
  - Status: aktuell keine explizite UI/Route gefunden, die für Gäste "Meine Fotos" anbietet.
  - Hinweis: Es gibt zwar uploader/guestId Felder in der DB, aber es fehlt eine klar dokumentierte Guest-UX und API-Filter, die sicher und eindeutig "meine Uploads" liefert.

- **Categories/Albums (als Filter)**
  - Backend: `packages/backend/src/routes/categories.ts`
  - Frontend: `packages/frontend/src/components/AlbumNavigation`

- **Guestbook**
  - Backend: `packages/backend/src/routes/guestbook.ts`

- **Guestbook Audio (Upload + Proxy)**
  - Backend: `packages/backend/src/routes/guestbook.ts`
    - Proxy: `GET /api/events/:eventId/guestbook/audio/:storagePath(*)`
    - Upload-Handling via `guestbookAudioUpload` (Prisma model)

- **Stories**
  - Backend: `packages/backend/src/routes/stories.ts` (inkl. `POST /:storyId/view`)

- **Stats (Host/Admin)**
  - Backend: `packages/backend/src/routes/statistics.ts`

- **Invitations / RSVP / Shortlinks / ICS**
  - Backend: `packages/backend/src/routes/invitations.ts`
    - enthält RSVP Schema + Passwort-Gate + Shortlink Codes
    - enthält ICS Generation (Calendar Download)
  - (Frontend Pages sind vorhanden, aber nicht vollständig in dieser Matrix verlinkt; siehe Next.js app routes unter `packages/frontend/src/app/i/*` und Dashboard/Event Pages)

---

## Live Wall

- **Live Wall UI**
  - Frontend: `packages/frontend/src/app/live/[slug]/wall/page.tsx`
  - Backend realtime: Socket.io in `packages/backend/src/index.ts`
  - Implementiert (Basis):
    - Sort-Modi (Neueste/Zufall)
    - Tiering/Fallback (Realtime vs Polling)
    - Basis-Animations (Grid layout + Highlight bei neuen Items)
  - Fehlt:
    - Premium/Free Plan-Policy (serverseitige Steuerung statt nur env/UI Toggle)
    - Spezifizierte Animationen (finales Design/Timing)

---

## PWA / Offline

- **PWA Basis**
  - Manifest: `packages/frontend/public/manifest.json`
  - Service Worker: `packages/frontend/public/sw.js` (minimal cache)
- **Offline Upload Queue (MVP, IndexedDB)**
  - Frontend:
    - Queue Lib: `packages/frontend/src/lib/uploadQueue.ts`
    - Integration: `packages/frontend/src/components/UploadButton.tsx`
  - Verhalten:
    - Enqueue bei `offline` oder retryable network errors
    - Auto-Drain bei `online` und beim Page-Mount
  - Fehlt:
    - UI für Queue Management (Liste/Retry/Delete)
    - Background Sync (optional)
    - Robustere Caching-Strategien für Event Pages/Assets

---

## Host Wizard / Smart Albums

- **Host Wizard (Setup Flow + Live Preview)**
  - Frontend:
    - New Event redirect to wizard: `packages/frontend/src/app/events/new/page.tsx`
    - Design wizard UI: `packages/frontend/src/app/events/[id]/design/page.tsx`
    - Categories wizard UI: `packages/frontend/src/app/events/[id]/categories/page.tsx`
  - Fehlt:
    - Vollständiger Multi-Step Wizard (mehr Steps/Validation)

- **Smart Albums (Zeitfenster)**
  - Frontend:
    - UI (startAt/endAt): `packages/frontend/src/app/events/[id]/categories/page.tsx`
  - DB Modell/Validation/Mapping (falls noch nicht final im Backend implementiert)

---

## WordPress / Woo Bridge

- **Woo Webhooks + Logging**
  - Backend: `packages/backend/src/routes/woocommerceWebhooks.ts`
  - Admin Logs: `packages/backend/src/routes/adminWooWebhooks.ts`
  - Fehlt (falls Spec v1 abweicht):
    - v1 Contract/Endpoint-Alignment
    - Marketing stats endpoint

- ✅ **WordPress SSO (Bridge v1)**
  - Backend: `packages/backend/src/routes/auth.ts`
    - `POST /api/auth/wordpress-sso`

---

## Admin

- ✅ **Admin Impersonation (Login as Host)**
  - Backend: `packages/backend/src/routes/adminImpersonation.ts`
    - `POST /api/admin/impersonation/token`
  - Frontend Admin UI: `packages/frontend/src/app/admin/dashboard/page.tsx`

- ✅ **Admin Dashboard (separates Package, optional)**
  - Package: `packages/admin-dashboard/*`

- **Duplicates (Duplikat-Gruppen, Best-of, Delete)**
  - Backend: `packages/backend/src/routes/duplicates.ts`
    - `GET /api/events/:eventId/duplicates`
    - `POST /api/events/:eventId/duplicates/:groupId/best`
    - `DELETE /api/events/:eventId/duplicates/:groupId`

- **Face Search (Gesichtssuche)**
  - Backend: `packages/backend/src/routes/faceSearch.ts`
    - `POST /api/events/:eventId/face-search` (multipart reference image)

- **Challenges**
  - Backend: `packages/backend/src/routes/challenges.ts`
    - `GET /api/events/:eventId/challenges`
    - `POST/PUT ...` (host/admin)

---

## Hard Constraints

- **Rate Limiting (Basis + angewendet auf Auth/Passwort-Flows)**
  - Backend: `packages/backend/src/middleware/rateLimit.ts`
  - Applied:
    - `POST /api/auth/login` (`packages/backend/src/routes/auth.ts`)
    - `POST /api/auth/register` (`packages/backend/src/routes/auth.ts`)
    - `POST /api/auth/wordpress-sso` (`packages/backend/src/routes/auth.ts`)
    - `GET /api/invitations/slug/:slug` (`packages/backend/src/routes/invitations.ts`)
    - `POST /api/invitations/slug/:slug/rsvp` (`packages/backend/src/routes/invitations.ts`)
    - `GET /api/invitations/slug/:slug/ics` (`packages/backend/src/routes/invitations.ts`)

- ✅ **Storage Lifecycle (Policy + Workers)**
  - Backend Services (u.a.): `packages/backend/src/services/storagePolicy.ts`
