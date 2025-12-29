# Gap Analysis (Feature Spec → Code)

Ziel: Für jede Spec-Funktion klar dokumentieren:
- **Status**: vorhanden | teilweise | fehlt
- **Belege**: Dateien / Endpoints
- **Was fehlt genau** (nächste Schritte)

## Host Wizard

- **Wizard Flow / Setup UI**
  - **Status**: teilweise
  - **Belege**:
    - `packages/frontend/src/app/events/new/page.tsx` (wizard redirect via `?wizard=1`)
    - `packages/frontend/src/app/events/[id]/design/page.tsx`
    - `packages/frontend/src/app/events/[id]/categories/page.tsx`
  - **Fehlt**:
    - geführter Setup-Prozess (Design, QR, Smart Albums, Live Preview)

## Smart Albums (Zeitfenster)

- **Album nach Zeitbereichen** (z.B. Trauung 13–15)
  - **Status**: teilweise
  - **Belege**:
    - Guest Album Navigation existiert als Kategorien-Filter:
      - `packages/frontend/src/app/e/[slug]/page.tsx`
      - `packages/frontend/src/app/e2/[slug]/page.tsx`
      - `packages/frontend/src/components/AlbumNavigation`
    - Host UI für Zeitfenster (startAt/endAt):
      - `packages/frontend/src/app/events/[id]/categories/page.tsx`
  - **Fehlt**:
    - DB Modell für Zeitfenster
    - Overlap-Validation + Grenzen (innerhalb Event)
    - Zuordnung (EXIF/createdAt → Album)
    - Lückenlogik (Fallback Album)

## QR / Print

- **QR Anzeige (Live Wall)**
  - **Status**: teilweise
  - **Belege**:
    - `packages/frontend/src/app/live/[slug]/wall/page.tsx` (QRCode)
    - `packages/frontend/src/components/QRCode.tsx` (qrcode.react)
  - **Fehlt**:
    - (n/a) Kanonische QR URL inkl. `?source=qr` ist umgesetzt

- **QR Template Config + Export PNG/PDF**
  - **Status**: vorhanden
  - **Belege**:
    - Backend: `packages/backend/src/routes/events.ts`
      - `GET/PUT /api/events/:id/qr/config`
      - `POST /api/events/:id/qr/export.png`
      - `POST /api/events/:id/qr/export.pdf`
    - Frontend Admin: `packages/frontend/src/app/admin/dashboard/page.tsx`
  - **Fehlt**:
    - Host UX Flow (Wizard/Styler) falls gewünscht

## QR Tracking / Analytics

- **source=qr Tracking (QR scans / opens)**
  - **Status**: vorhanden
  - **Belege**:
    - Frontend QR URLs:
      - `packages/frontend/src/app/live/[slug]/wall/page.tsx` → `/e/<slug>?source=qr`
      - `packages/frontend/src/app/admin/dashboard/page.tsx` → Gast-Link mit `?source=qr`
    - Backend Tracking:
      - `GET /api/events/slug/:slug?source=qr` → `packages/backend/src/routes/events.ts`
      - DB: `event_traffic_stats` (Prisma: `EventTrafficStat`)
  - **Fehlt**:
    - (n/a) Admin Ansicht "Views by source" ist umgesetzt

## Guest PWA Offline

- **Service Worker + IndexedDB Upload Queue**
  - **Status**: vorhanden (MVP)
  - **Fehlt**:
    - UI für Queue Management (Liste/Retry/Delete) (optional)

## Uploads

- **Fotos Upload (Guest)**
  - **Status**: vorhanden
  - **Belege**:
    - Backend: `packages/backend/src/routes/photos.ts`
      - `POST /api/events/:eventId/photos/upload`
      - Guards: event access, allowUploads, Event-Date Window, Storage-Periode, Storage-Limits
      - Rate limits: `photoUploadIpLimiter` + `photoUploadEventLimiter`
      - File validation: `validateUploadedFile('image')`
  - **Fehlt**:
    - (optional) explizite API/UX "Meine Uploads" für Guests (falls Spec)

- **Videos Upload (Guest)**
  - **Status**: vorhanden
  - **Belege**:
    - Backend: `packages/backend/src/routes/videos.ts`
      - `POST /api/events/:eventId/videos/upload`
      - Rate limits: `videoUploadIpLimiter` + `videoUploadEventLimiter`
      - optional `uploadDatePolicy` + category upload locks

- **Offline Upload Queue (Frontend)**
  - **Status**: vorhanden (MVP)
  - **Belege**:
    - `packages/frontend/src/lib/uploadQueue.ts`
    - `packages/frontend/src/components/UploadButton.tsx`
  - **Fehlt**:
    - Queue Management UI (Liste/Retry/Delete)

## Live Wall

- **Realtime Live Wall**
  - **Status**: teilweise
  - **Belege**:
    - `packages/frontend/src/app/live/[slug]/wall/page.tsx`
    - Backend: Socket.io init in `packages/backend/src/index.ts`
    - Emitted events: `photo_uploaded` / `photo_approved` in `packages/backend/src/routes/photos.ts`
  - **Fehlt**:
    - serverseitige Plan/Feature-Policy (aktuell: Polling vs Realtime nur per Frontend/env)
    - (optional) weitere Sort-Modi / finale Spec-Animationen
    - definierte Animationen (Spec)

## WordPress Bridge

- **WordPress SSO (Bridge v1)**
  - **Status**: vorhanden
  - **Belege**:
    - Backend: `packages/backend/src/routes/auth.ts`
      - `POST /api/auth/wordpress-sso`
  - **Notes**:
    - Rate limit: `wordpressSsoLimiter` (60/15min) in `packages/backend/src/middleware/rateLimit.ts`
    - Secret handling:
      - Env: `WORDPRESS_SSO_SECRET`
      - Secret kann via Header `x-gf-wp-sso-secret` oder Body `ssoSecret` geliefert werden
      - Statuscodes: `401` wenn Secret fehlt, `403` wenn Secret falsch ist

- **WordPress Password Verify (REST /wp-json/gaestefotos/v1/verify-password)**
  - **Status**: vorhanden (als Login-Integration)
  - **Belege**:
    - Backend Login: `POST /api/auth/login` → `packages/backend/src/routes/auth.ts`
    - WP-Verify Client: `packages/backend/src/config/wordpress.ts`
      - ruft `POST ${WORDPRESS_URL}/wp-json/gaestefotos/v1/verify-password`
      - optional `X-GF-Verify-Secret` via `WORDPRESS_VERIFY_SECRET`
  - **Notes**:
    - WP REST `400` wird als "invalid credentials" behandelt
    - WP REST unavailable → Backend antwortet `503` (damit gültige WP User nicht fälschlich `401` bekommen)
    - DB/PHP Fallback wird nur versucht, wenn WP DB Credentials explizit konfiguriert sind:
      - `WORDPRESS_DB_HOST`, `WORDPRESS_DB_USER`, `WORDPRESS_DB_PASSWORD`, `WORDPRESS_DB_NAME`

- **WooCommerce Webhooks**
  - **Status**: vorhanden
  - **Belege**:
    - `packages/backend/src/routes/woocommerceWebhooks.ts`
  - **Fehlt**:
    - Admin Readback/Replay UX (Backend routes vorhanden; UI/Flow optional)

  - **Technisch (Ist-Stand / Mounts)**:
    - `POST /api/webhooks/woocommerce/order-paid`
    - Secret: `WOOCOMMERCE_WEBHOOK_SECRET` + `x-wc-webhook-signature`
    - DB:
      - `WooWebhookEventLog` (Logging)
      - `WooWebhookReceipt` (Idempotency)
      - `EventEntitlement` (Result)

- **Admin: WooCommerce Webhook Logs/Replay**
  - **Status**: vorhanden (Logs), teilweise (Replay)
  - **Belege**:
    - Backend: `packages/backend/src/routes/adminWooWebhooks.ts`
      - `GET /api/admin/webhooks/woocommerce/logs`
      - `POST /api/admin/webhooks/woocommerce/replay/:logId`
    - Frontend Admin UI: `packages/frontend/src/app/admin/dashboard/page.tsx` ("WooCommerce Webhook Inbox")
  - **Fehlt**:
    - echtes "apply" replay (aktuell gibt `replay` nur den gespeicherten Log/Payload zurück)

- **Marketing stats (Admin)**
  - **Status**: vorhanden
  - **Belege**:
    - Backend: `packages/backend/src/routes/adminMarketing.ts`
      - `GET /api/admin/marketing/stats?days=30&eventId=...`
    - Datenquellen:
      - `EventTrafficStat` (Views by source)
      - `WooWebhookEventLog` (Woo webhook / conversions)

## Invitations / RSVP / Shortlinks / ICS

- **Invitations + RSVP + ICS + Shortlinks**
  - **Status**: vorhanden
  - **Belege**:
    - Backend: `packages/backend/src/routes/invitations.ts`
      - Host/Admin:
        - `GET /api/events/:eventId/invitations`
        - `POST /api/events/:eventId/invitations`
        - `PUT /api/events/:eventId/invitations/:invitationId`
        - `POST /api/events/:eventId/invitations/:invitationId/shortlinks`
      - Public:
        - `GET /api/invitations/slug/:slug`
        - `POST /api/invitations/slug/:slug/rsvp`
        - `GET /api/invitations/slug/:slug/ics`
        - `GET /api/shortlinks/:code`
    - Frontend:
      - Einladung: `packages/frontend/src/app/i/[slug]/page.tsx`
      - Guest redirect: `packages/frontend/src/app/e/[slug]/invitation/page.tsx`
      - Shortlink resolver: `packages/frontend/src/app/s2/[code]/page.tsx`
  - **Notes**:
    - UNLISTED Einladungen sind über Access-Cookie geschützt (Cookie wird beim Shortlink Resolve gesetzt)
    - Passwort-Gate: `401 PASSWORD_REQUIRED` / `403 INVALID_PASSWORD`
    - Rate limit public endpoints via `passwordLimiter` in `packages/backend/src/middleware/rateLimit.ts`
  - **Fehlt**:
    - (optional) Admin/Host UI für Templates/Editor (falls Spec mehr als MVP verlangt)

## Admin Impersonation

- **Admin "Login as Host"**
  - **Status**: vorhanden
  - **Belege**:
    - Backend: `packages/backend/src/routes/adminImpersonation.ts`
      - `POST /api/admin/impersonation/token`
    - Frontend Admin UI: `packages/frontend/src/app/admin/dashboard/page.tsx`

## Hard Constraints

- **Rate Limits**
  - **Status**: vorhanden
  - **Belege**:
    - `packages/backend/src/middleware/rateLimit.ts`
    - Applied:
      - `POST /api/auth/login` (`passwordLimiter`, 10/15min) (`packages/backend/src/routes/auth.ts`)
      - `POST /api/auth/register` (`passwordLimiter`, 10/15min) (`packages/backend/src/routes/auth.ts`)
      - `POST /api/auth/wordpress-sso` (`wordpressSsoLimiter`, 60/15min) (`packages/backend/src/routes/auth.ts`)
      - `GET /api/invitations/slug/:slug` (`packages/backend/src/routes/invitations.ts`)
      - `POST /api/invitations/slug/:slug/rsvp` (`packages/backend/src/routes/invitations.ts`)
      - `GET /api/invitations/slug/:slug/ics` (`packages/backend/src/routes/invitations.ts`)

- **Storage Lifecycle (Retention/Reminders/Cleanup)**
  - **Status**: vorhanden
  - **Belege**:
    - `packages/backend/src/services/storagePolicy.ts`
    - `packages/backend/src/services/retentionPurge.ts`
    - `packages/backend/src/services/storageReminder.ts`

