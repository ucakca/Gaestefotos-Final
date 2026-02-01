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

- ◐ **2FA (TOTP) – Admin verpflichtend (Host optional: Follow-up)**
  - DB: `User.twoFactor*` Felder (siehe `docs/DB_FIELD_MEANINGS.md`)
  - ENV: `TWO_FACTOR_ENCRYPTION_KEY` (AES-256-GCM Secret-Encryption)
  - Endpoints/Flows:
    - Login: `POST /api/auth/login` kann `twoFactorRequired` / `twoFactorSetupRequired` zurückgeben (Challenge Token)
    - Verify: `POST /api/auth/2fa/verify` (TOTP oder Recovery Code)
    - Setup (Admin-only): `POST /api/auth/2fa/setup/start` + `POST /api/auth/2fa/setup/confirm`
  - Notes:
    - Host-Opt-in ist aktuell nicht umgesetzt (Setup/Confirm sind role-gated auf `ADMIN`).

- **Events (Create/Read/Update + Public by slug)**
  - Backend: `packages/backend/src/routes/events.ts`
    - `GET /api/events/slug/:slug`

- **Photos/Videos Upload + Moderation (Basis)**
  - Backend: `packages/backend/src/routes/photos.ts`, `packages/backend/src/routes/videos.ts`

- ✅ **Downloads (Guests gated via `allowDownloads`)**
  - Backend:
    - Photos: `GET /api/photos/:photoId/download` (Guest nur wenn `featuresConfig.allowDownloads !== false` und Photo `APPROVED`)
      - Code: `packages/backend/src/routes/photos.ts`
    - Videos: `GET /api/videos/:videoId/download` (Guest nur wenn `featuresConfig.allowDownloads !== false` und Video `APPROVED`)
      - Code: `packages/backend/src/routes/videos.ts`
  - Doku:
    - `docs/API_MAP.md` (ACL/Guards)
    - `docs/DB_FIELD_MEANINGS.md` (`Event.featuresConfig.allowDownloads`)
  - Hinweis (weiter offen): „Optimized Views vs Original Downloads“ Contract/UX (Derivate vs Originalfile) ist als eigenes Thema noch zu verifizieren.

- ✅ **Theme System v1 (Design Tokens, system-wide)**
  - Backend (Admin): `packages/backend/src/routes/adminTheme.ts`
    - `GET /api/admin/theme`
    - `PUT /api/admin/theme`
  - Backend (Public): `packages/backend/src/routes/theme.ts`
    - `GET /api/theme`
  - Storage: `AppSetting` key `theme_tokens_v1` (`packages/backend/prisma/schema.prisma`)
  - Frontend Auto-Apply:
    - `packages/frontend/src/components/ThemeLoader.tsx`
    - `packages/frontend/src/app/layout.tsx`
  - Admin Dashboard Auto-Apply:
    - `packages/admin-dashboard/src/components/ThemeLoader.tsx`
    - `packages/admin-dashboard/src/app/layout.tsx`
  - Admin UI Editor:
    - `packages/admin-dashboard/src/app/settings/page.tsx`

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

- ✅ **Co-Hosts (Event Mitglieder) + Invite Flow**
  - Backend:
    - Routes: `packages/backend/src/routes/cohosts.ts`
      - `GET /api/events/:eventId/cohosts`
      - `POST /api/events/:eventId/cohosts` (Body `{ userId }`)
      - `DELETE /api/events/:eventId/cohosts/:userId`
      - `POST /api/events/:eventId/cohosts/invite-token`
    - Routes: `packages/backend/src/routes/cohostInvites.ts`
      - `POST /api/cohosts/accept` (Body `{ inviteToken }`)
    - Permission: `hasEventManageAccess` (Host/Co-Host/Admin)
  - Admin Dashboard:
    - Event Detail UI: `packages/admin-dashboard/src/app/events/[id]/page.tsx`
  - Public App:
    - Invite Accept: `packages/frontend/src/app/e2/[slug]/page.tsx` (`?cohostInvite=...`)

- **Stats (Host/Admin)**
  - Backend: `packages/backend/src/routes/statistics.ts`

---

## WordPress Bridge

- ✅ **Marketing stats (Admin)**
  - Backend: `packages/backend/src/routes/adminMarketing.ts`
    - `GET /api/admin/marketing/stats?days=30&eventId=...`
  - Quellen:
    - `EventTrafficStat` (Views by source)
    - `WooWebhookEventLog` (Woo webhook logs)

- ✅ **Invitations / RSVP / Shortlinks / ICS**
  - Backend: `packages/backend/src/routes/invitations.ts`
    - enthält RSVP Schema + Passwort-Gate + Shortlink Codes
    - enthält ICS Generation (Calendar Download)
  - Frontend:
    - Einladung: `packages/frontend/src/app/i/[slug]/page.tsx`
    - Guest redirect: `packages/frontend/src/app/e/[slug]/invitation/page.tsx` → `/i/<slug>`
    - Shortlink resolver: `packages/frontend/src/app/s2/[code]/page.tsx` (calls `/api/shortlinks/:code`)
  - Notes:
    - `visibility=UNLISTED` ist Cookie-gated (gesetzt beim Shortlink resolve)

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
    - Premium/Free Plan-Policy (serverseitige Steuerung statt nur env/UI Toggle; aktuell `NEXT_PUBLIC_DISABLE_REALTIME`)
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

- **Theme-Welten / Design Presets (host-selectable)**
  - Requirement:
    - Host kann pro Event eine "Themenwelt" wählen (nicht nur Hochzeit), die Farben/Typo/Komponenten-Stil bestimmt
    - Basis: "Apple clean" + dezente, wählbare Akzent-/Mood-Welten
  - Status: ◐ (Design Presets existieren; Theme-Welten als durchgängiges System für alle Oberflächen zu vervollständigen)

- **Smart Albums (Zeitfenster)**
  - Frontend:
    - UI (startAt/endAt): `packages/frontend/src/app/events/[id]/categories/page.tsx`
  - DB Modell/Validation/Mapping (falls noch nicht final im Backend implementiert)

---

## WordPress / Woo Bridge

- ✅ **Woo Webhooks + Logging**
  - Backend: `packages/backend/src/routes/woocommerceWebhooks.ts`
  - Admin Logs: `packages/backend/src/routes/adminWooWebhooks.ts`
  - Notes:
    - v1 Contract/Endpoint-Alignment ist dokumentiert (siehe `docs/API_MAP.md`)
    - Marketing stats ist umgesetzt (siehe Abschnitt "WordPress Bridge")

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

- ✅ **Admin Dashboard UI Redesign (token-based, responsive)**
  - App Shell: `packages/admin-dashboard/src/components/AdminShell.tsx`, `Sidebar.tsx`
  - Pages:
    - Login: `packages/admin-dashboard/src/app/login/page.tsx`
    - Dashboard: `packages/admin-dashboard/src/app/dashboard/page.tsx`
    - Events: `packages/admin-dashboard/src/app/events/page.tsx`, `packages/admin-dashboard/src/app/events/[id]/page.tsx`
    - Settings/Theme: `packages/admin-dashboard/src/app/settings/page.tsx`

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
    - `POST /api/auth/login` (`passwordLimiter`, 10/15min) (`packages/backend/src/routes/auth.ts`)
    - `POST /api/auth/register` (`passwordLimiter`, 10/15min) (`packages/backend/src/routes/auth.ts`)
    - `POST /api/auth/wordpress-sso` (`wordpressSsoLimiter`, 60/15min) (`packages/backend/src/routes/auth.ts`)
    - `GET /api/invitations/slug/:slug` (`packages/backend/src/routes/invitations.ts`)
    - `POST /api/invitations/slug/:slug/rsvp` (`packages/backend/src/routes/invitations.ts`)
    - `GET /api/invitations/slug/:slug/ics` (`packages/backend/src/routes/invitations.ts`)

- ✅ **Storage Lifecycle (Policy + Workers)**
  - Backend Services (u.a.): `packages/backend/src/services/storagePolicy.ts`
