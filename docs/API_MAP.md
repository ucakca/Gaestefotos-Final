# API Map (Backend) – technisch + laiensicher

Ziel: Schnelle Orientierung, **welcher Endpoint** wofür da ist und **wo der Code lebt**.

## Laiensicher (was passiert wann?)

- **Login**: Du meldest dich an → System setzt ein Cookie → du bist eingeloggt.
- **Event erstellen**: Host legt ein Event an → bekommt einen Gast-Link (`/e/<slug>`).
- **Gäste laden hoch**: Gäste öffnen den Gast-Link → laden Fotos/Videos hoch.
- **Moderation**: Host/Admin gibt Inhalte frei → erst dann tauchen sie öffentlich auf (je nach Event-Config).
- **QR/PDF**: Host/Admin kann QR-Aufsteller exportieren (PNG/PDF) → Gäste scannen und landen im Event.

## Technisch (Backend Router Mounts)

Quelle: `packages/backend/src/index.ts`

- `app.use('/api/auth', authRoutes)` → `packages/backend/src/routes/auth.ts`
- `app.use('/api/events', eventRoutes)` → `packages/backend/src/routes/events.ts`
- `app.use('/api/guests', guestRoutes)` → `packages/backend/src/routes/guests.ts`
- `app.use('/api/photos', photoRoutes)` → `packages/backend/src/routes/photos.ts`
- `app.use('/api/videos', videoRoutes)` → `packages/backend/src/routes/videos.ts`
- `app.use('/api/categories', categoryRoutes)` → `packages/backend/src/routes/categories.ts`
- `app.use('/api/stories', storiesRoutes)` → `packages/backend/src/routes/stories.ts`
- `app.use('/api/statistics', statisticsRoutes)` → `packages/backend/src/routes/statistics.ts`
- `app.use('/api/webhooks/woocommerce', woocommerceWebhooksRoutes)` → `packages/backend/src/routes/woocommerceWebhooks.ts`

### Admin

- Admin Dashboard UI: `packages/frontend/src/app/admin/dashboard/page.tsx`
- Admin Routes (Backend): `packages/backend/src/routes/admin*`
- Marketing / Stats (Admin): `GET /api/admin/marketing/stats` → `packages/backend/src/routes/adminMarketing.ts`

## WordPress Bridge (v1)

### Konfiguration (Env / Secrets)

- **Required (Prod)**
  - `WOOCOMMERCE_WEBHOOK_SECRET` (Webhook signature validation)
- **Optional (Feature/Hardening)**
  - `WORDPRESS_SSO_SECRET` (zusätzlicher Schutz für `POST /api/auth/wordpress-sso` via Header/Body Secret)
  - `WORDPRESS_URL` (default fallback: `https://gästefotos.com`)
  - `WORDPRESS_VERIFY_SECRET` (optional Header `X-GF-Verify-Secret` für WP verify-password)
- **Optional (DB/PHP Fallback für verify-password / user lookup)**
  - `WORDPRESS_DB_HOST`
  - `WORDPRESS_DB_PORT`
  - `WORDPRESS_DB_USER`
  - `WORDPRESS_DB_PASSWORD`
  - `WORDPRESS_DB_NAME`
  - `WORDPRESS_TABLE_PREFIX`
- **Optional (Admin CMS Sync / WP Content Fetch)**
  - `CMS_ALLOWED_HOSTS` (Whitelist für erlaubte WP Hosts; default: Host aus `WORDPRESS_URL`)
  - `CMS_MAX_HTML_BYTES` (Limit für HTML Fetch beim Link-Fallback; default: 2MB)

### WordPress SSO (WP → App)

- Backend: `POST /api/auth/wordpress-sso`
  - Code: `packages/backend/src/routes/auth.ts`
  - Request body:
    - `{ "wpUserId": number|string, "ssoSecret"?: string }`
  - Optional secret:
    - Env: `WORDPRESS_SSO_SECRET`
    - Header: `x-gf-wp-sso-secret` (oder Body `ssoSecret`)
  - Rate limit:
    - `wordpressSsoLimiter` (60/15min) → `packages/backend/src/middleware/rateLimit.ts`
  - Response (200):
    - `{ "success": true, "redirectUrl": string, "token": string }`
    - `redirectUrl` zeigt auf `/dashboard?token=...`
  - Failure modes:
    - `400` invalid payload / `wpUserId`
    - `401` secret required but missing
    - `403` secret present but incorrect
    - `404` WordPress user not found

### WordPress Password Verify (App → WP)

Backend nutzt für Login optional WordPress-Verifikation.

- Backend Login (App): `POST /api/auth/login`
  - Code: `packages/backend/src/routes/auth.ts` → `verifyWordPressUser()`
- WordPress REST Endpoint (WP): `POST /wp-json/gaestefotos/v1/verify-password`
  - Code (App-Seite): `packages/backend/src/config/wordpress.ts`
  - Request body:
    - `{ "email": string, "password": string }`
  - Optional secret header:
    - Env: `WORDPRESS_VERIFY_SECRET`
    - Header: `X-GF-Verify-Secret: <secret>`
  - Expected response shape (mindestens):
    - `{ "verified": boolean, ... }`
    - Wenn `verified=true`: erwartet zusätzlich u.a. `user_id`, `email`, `login` (siehe `wordpress.ts`)
  - Failure modes:
    - `400` → credentials ungültig (wird als normales Login-Fail behandelt)
    - `401/403/404`, Timeout oder Netzwerkfehler → WP auth unavailable → Backend antwortet `503`
  - Fallback (optional, App-Seite):
    - Wenn WordPress REST erreichbar ist, aber `verified=false`, wird **nur dann** ein DB/PHP-Fallback versucht,
      wenn WP DB Credentials explizit gesetzt sind:
      - `WORDPRESS_DB_HOST`, `WORDPRESS_DB_USER`, `WORDPRESS_DB_PASSWORD`, `WORDPRESS_DB_NAME`
    - Wenn REST **unavailable** und **kein** DB-Fallback konfiguriert ist → Backend antwortet `503` (kein falsches `401`).

### WooCommerce Webhooks (Woo → App)

- Webhook endpoint (Backend): `POST /api/webhooks/woocommerce/order-paid`
  - Code: `packages/backend/src/routes/woocommerceWebhooks.ts`
  - Signature:
    - Header: `x-wc-webhook-signature`
    - Secret: `WOOCOMMERCE_WEBHOOK_SECRET`
    - Ohne/ungültig → `403 Forbidden`
  - Payload (minimal relevant):
    - `id` (Order ID)
    - `status` (nur `processing`/`completed` wird verarbeitet)
    - `line_items[].sku` (zu matchen gegen `PackageDefinition.sku`)
    - optional: `meta_data[]` mit `eventCode` oder `event_code` (Upgrade-Flow)
    - optional: `customer_id` (WordPress user id) oder fallback über `billing.email`
  - Business rules:
    - **Upgrade**: wenn `eventCode` vorhanden und dem Kunden gehört → Entitlement für Event wird ersetzt (`ACTIVE` → `REPLACED`) und neu als `ACTIVE` angelegt.
    - **Create**: wenn kein `eventCode` → neues Event + Entitlement werden erstellt.
  - Idempotency:
    - `WooWebhookReceipt` (unique `wcOrderId`) verhindert Doppelverarbeitung.
  - Logging:
    - `WooWebhookEventLog` speichert Topic/Status/Reason/PayloadHash (Admin Readback möglich)
  - Admin Readback:
    - `GET /api/admin/webhooks/woocommerce/logs` → `packages/backend/src/routes/adminWooWebhooks.ts`
    - `POST /api/admin/webhooks/woocommerce/replay/:logId` → `packages/backend/src/routes/adminWooWebhooks.ts`
      - Body: `{ "mode": "dry_run" | "apply" }` (aktuell ist es ein "readback" der gespeicherten Payload)

## QR / Print Export

Quelle: `packages/backend/src/routes/events.ts`

- `GET /api/events/:id/qr/config` (auth, host/admin)
- `PUT /api/events/:id/qr/config` (auth, host/admin)
- `POST /api/events/:id/qr/export.png` (auth, host/admin)
- `POST /api/events/:id/qr/export.pdf` (auth, host/admin)

Frontend Admin nutzt Export:
- `packages/frontend/src/app/admin/dashboard/page.tsx`

## Invitations / RSVP / Shortlinks / ICS

Quelle: `packages/backend/src/routes/invitations.ts` (gemountet via `app.use('/api', invitationRoutes)`)

### Laiensicher

- **Einladung-Seite**: `/i/<slug>` zeigt Einladung + RSVP + Kalender-Download.
- **Kurzlink**: `/s2/<code>` löst Kurzcode auf → setzt ggf. ein Access-Cookie → leitet nach `/i/<slug>` weiter.
- **Unlisted**: Einladungen mit `visibility=UNLISTED` sind nicht direkt per `/i/<slug>` erreichbar, sondern nur nach Shortlink-Auflösung (Cookie).
- **Passwortschutz**: Wenn `hasPassword=true`, muss ein Passwort mitgegeben werden (GET via Query, RSVP via Body).

### Host/Admin (auth)

- `GET /api/events/:eventId/invitations`
  - Listet Einladungen + Shortlinks + Opens/Rsvp Counts
- `POST /api/events/:eventId/invitations`
  - Body: `{ name, slug?, templateId?, config?, password?, visibility? }`
  - Creates default shortlink + returns `invitationUrl` (`/i/<slug>`)
- `PUT /api/events/:eventId/invitations/:invitationId`
  - Patch: `{ name?, config?, password?, isActive?, visibility? }`
- `POST /api/events/:eventId/invitations/:invitationId/shortlinks`
  - Body: `{ channel?: string }`
  - Returns `{ shortLink: { code, url, ... } }`

### Public

- `GET /api/events/slug/:slug/invitations/public`
  - Listet PUBLIC Einladungen eines Events (für Landing/Directory)

- `GET /api/invitations/slug/:slug`
  - Query: `?password=...` (optional)
  - Returns Einladung + Event Meta + RSVP Counts
  - Passwort-Gate:
    - `401 {error: "PASSWORD_REQUIRED"}` wenn fehlt
    - `403 {error: "INVALID_PASSWORD"}` wenn falsch
  - UNLISTED Gate:
    - ohne Cookie → `404` (bewusst „nicht gefunden“)

- `POST /api/invitations/slug/:slug/rsvp`
  - Body: `{ status: "YES"|"NO"|"MAYBE", name?, password? }`
  - Returns `{ ok: true, rsvp: { yes, no, maybe } }`

- `GET /api/invitations/slug/:slug/ics`
  - Query: `?password=...` (optional)
  - Returns `text/calendar` (Download)
  - `400 {error: "DATE_TIME_MISSING"}` wenn Datum/Uhrzeit fehlt

- `GET /api/shortlinks/:code`
  - Resolves Kurzcode → `{ invitationSlug, invitationUrl, event }`
  - Side effects:
    - setzt ein `invitation_access_<invitationId>` Cookie (12h default; siehe `INVITATION_ACCESS_TTL_SECONDS`)
    - tracked Opens in `InvitationVisit` + `InvitationShortLink.lastAccessedAt`

## Live Wall

Frontend:
- `packages/frontend/src/app/live/[slug]/wall/page.tsx`
  - Modes:
    - Grid / Slideshow
    - Sort: Neueste / Zufall
  - Tiering/Fallback:
    - Realtime (Socket.IO) default
    - Polling fallback wenn `NEXT_PUBLIC_DISABLE_REALTIME=true`
  - Realtime client:
    - `packages/frontend/src/lib/websocket.ts`
    - `packages/frontend/src/hooks/useEventRealtime.ts`

Backend liefert Fotos (approved):
- `GET /api/events/:id/photos?status=APPROVED` (siehe `packages/backend/src/routes/photos.ts` + event policies)

Realtime (Socket.IO):
- Server init + ACL: `packages/backend/src/index.ts`
  - Room: `event:<eventId>`
  - Client join: `join:event` (nur wenn `hasEventAccess()` via Cookie passt)
  - Client leave: `leave:event`
- Emitted events:
  - `photo_uploaded` (bei Upload) → `packages/backend/src/routes/photos.ts`
  - `photo_approved` (bei Moderation) → `packages/backend/src/routes/photos.ts`

## Tracking (QR / Quellen)

- Public: `GET /api/events/slug/:slug?source=qr`
  - Zählt Zugriffe pro Quelle (z.B. `qr`)
  - Code: `packages/backend/src/routes/events.ts`
- Host/Admin: `GET /api/events/:id/traffic`
  - Liefert Zähler pro `source`
  - Code: `packages/backend/src/routes/events.ts`

## Offene Punkte (wird fortlaufend ergänzt)

- Smart Albums (Zeiträume + Validierung)
- PWA Offline Upload Queue

## Uploads (Fotos/Videos)

### Laiensicher

- **Gäste laden hoch**: Fotos/Videos werden direkt im Event hochgeladen.
- **Moderation (optional)**: Wenn Moderation aktiv ist, landen Guest Uploads zuerst in `PENDING`.
- **Upload-Queue**: Wenn du offline bist oder ein temporärer Netzfehler passiert, wird der Upload gespeichert und später automatisch erneut gesendet.

### Technisch

Backend:
- Photos: `packages/backend/src/routes/photos.ts`
  - `POST /api/events/:eventId/photos/upload` (multipart `file`)
    - Guards:
      - `requireEventAccess` (oder Host/Admin via auth)
      - `allowUploads` Feature Flag (guests können blockiert werden)
      - Upload window: Event-Datum ±1 Tag (`UPLOAD_WINDOW_CLOSED`)
      - Storage period (`STORAGE_LOCKED`)
      - Storage limits (`assertUploadWithinLimit`, error → `Speicherlimit erreicht`)
      - File validation: `validateUploadedFile('image')` (magic bytes + mime)
    - Rate limits:
      - `photoUploadIpLimiter` + `photoUploadEventLimiter` (event-spezifisch via `attachEventUploadRateLimits`)
    - Emits realtime:
      - `photo_uploaded` via Socket.IO room `event:<eventId>`
  - `GET /api/events/:eventId/photos?status=...` (Feed; Live Wall nutzt `APPROVED`)

- Videos: `packages/backend/src/routes/videos.ts`
  - `POST /api/events/:eventId/videos/upload` (multipart `file`)
    - Guards:
      - `hasEventAccess` (oder auth)
      - allowUploads / mode gating (z.B. `VIEW_ONLY`)
      - Upload window: Event-Datum ±1 Tag
      - optional `uploadDatePolicy` (± toleranceDays)
      - Category upload lock (optional)
      - Storage limits (`assertUploadWithinLimit`)
      - File validation: `validateUploadedFile('video')`
    - Rate limits:
      - `videoUploadIpLimiter` + `videoUploadEventLimiter`
  - `GET /api/events/:eventId/videos` (Feed, inkl. Proxy URLs)

Frontend:
- Upload UI + Retry/Queue:
  - `packages/frontend/src/components/UploadButton.tsx`
  - Offline Queue: `packages/frontend/src/lib/uploadQueue.ts` (IndexedDB)
  - Verhalten:
    - Enqueue wenn `navigator.onLine=false` oder `isRetryableUploadError()`
    - Auto-drain beim Page mount + `online` event
