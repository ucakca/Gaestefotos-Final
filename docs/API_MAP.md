# API Map (Backend) – technisch + laiensicher

Ziel: Schnelle Orientierung, **welcher Endpoint** wofür da ist und **wo der Code lebt**.

## Laiensicher (was passiert wann?)

- **Login**: Du meldest dich an → System setzt ein Cookie → du bist eingeloggt.
- **Passwort vergessen**: Du gibst deine E-Mail ein → bekommst einen Reset-Link per E-Mail → klickst darauf → setzt neues Passwort.
- **Event erstellen**: Host legt ein Event an → bekommt einen Gast-Link (`/e/<slug>`).
- **Gäste laden hoch**: Gäste öffnen den Gast-Link → laden Fotos/Videos hoch.
- **Moderation**: Host/Admin gibt Inhalte frei → erst dann tauchen sie öffentlich auf (je nach Event-Config).
- **QR/PDF**: Host/Admin kann QR-Aufsteller exportieren (PNG/PDF) → Gäste scannen und landen im Event.

## Technisch (Backend Router Mounts)

Quelle: `packages/backend/src/index.ts`

- `app.use('/api/auth', authRoutes)` → `packages/backend/src/routes/auth.ts` (Login, Register, 2FA, Password-Reset, WP-SSO, Refresh, Logout)
- `app.use('/api/events', eventRoutes)` → `packages/backend/src/routes/events.ts`
- `app.use('/api/guests', guestRoutes)` → `packages/backend/src/routes/guests.ts`
- `app.use('/api/photos', photoRoutes)` → `packages/backend/src/routes/photos.ts`
- `app.use('/api/videos', videoRoutes)` → `packages/backend/src/routes/videos.ts`
- `app.use('/api/categories', categoryRoutes)` → `packages/backend/src/routes/categories.ts`
- `app.use('/api/stories', storiesRoutes)` → `packages/backend/src/routes/stories.ts`
- `app.use('/api/statistics', statisticsRoutes)` → `packages/backend/src/routes/statistics.ts`
- `app.use('/api/events', cohostsRoutes)` → `packages/backend/src/routes/cohosts.ts`
- `app.use('/api/cohosts', cohostInvitesRoutes)` → `packages/backend/src/routes/cohostInvites.ts`
- `app.use('/api/webhooks/woocommerce', woocommerceWebhooksRoutes)` → `packages/backend/src/routes/woocommerceWebhooks.ts`

### Admin

- Admin Dashboard UI: `packages/frontend/src/app/admin/dashboard/page.tsx`
- In-App Guidance (Guided Tour): `packages/frontend/src/components/ui/GuidedTour.tsx`
  - funktioniert über `data-tour="..."` Marker im DOM (z.B. `woo-section`, `woo-replay`, `woo-export`, `cms-*`).
- Admin Routes (Backend): `packages/backend/src/routes/admin*`
- Marketing / Stats (Admin): `GET /api/admin/marketing/stats` → `packages/backend/src/routes/adminMarketing.ts`

Admin endpoints (Backend mounts in `packages/backend/src/index.ts`):

- Packages:
  - `GET /api/admin/package-definitions` → `packages/backend/src/routes/packageDefinitions.ts`
  - `POST /api/admin/package-definitions`
  - `PUT /api/admin/package-definitions/:id`
  - `DELETE /api/admin/package-definitions/:id`

- API Keys:
  - `GET /api/admin/api-keys` → `packages/backend/src/routes/adminApiKeys.ts`
  - `POST /api/admin/api-keys`
  - `POST /api/admin/api-keys/:id/revoke`

- Invoices:
  - `GET /api/admin/invoices` → `packages/backend/src/routes/adminInvoices.ts`
  - `GET /api/admin/invoices/export.csv` (CSV Export)

- Email templates:
  - `GET /api/admin/email-templates` → `packages/backend/src/routes/adminEmailTemplates.ts`
  - `GET /api/admin/email-templates/:kind`
  - `PUT /api/admin/email-templates/:kind`
  - `POST /api/admin/email-templates/:kind/preview`
  - `POST /api/admin/email-templates/:kind/test-send`

- CMS sync:
  - `GET /api/admin/cms/snapshots` → `packages/backend/src/routes/adminCmsSync.ts`
  - `POST /api/admin/cms/sync`
  - `GET /api/admin/cms/faq/preview`
  - `GET /api/admin/cms/wp/:kind/search`
  - `GET /api/admin/cms/wp/:kind/recent`

- Maintenance mode:
  - `GET /api/admin/maintenance` → `packages/backend/src/routes/adminMaintenance.ts`
  - `PUT /api/admin/maintenance`

- Theme / UI Tokens (Admin):
  - `GET /api/admin/theme` → `packages/backend/src/routes/adminTheme.ts`
  - `PUT /api/admin/theme`
  - Zweck: systemweite CSS-Variablen (Theme Tokens) verwalten (persistiert in `AppSetting.key='theme_tokens_v1'`).

- Face Search Consent (Admin):
  - `GET /api/admin/face-search-consent` → `packages/backend/src/routes/adminFaceSearchConsent.ts`
  - `PUT /api/admin/face-search-consent`
  - Zweck: systemweiten Hinweistext + Checkbox-Label für biometrische Face Search verwalten (persistiert in `AppSetting.key='face_search_consent_v1'`).

- Impersonation:
  - `POST /api/admin/impersonation/token` → `packages/backend/src/routes/adminImpersonation.ts`

- Woo webhook inbox:
  - `GET /api/admin/webhooks/woocommerce/logs` → `packages/backend/src/routes/adminWooWebhooks.ts`
  - `POST /api/admin/webhooks/woocommerce/replay/:logId`

- CDN Browser (Admin):
  - `GET /api/admin/cdn/browse` → `packages/backend/src/routes/adminCdn.ts`
  - `GET /api/admin/cdn/sign` (signierte URL für SeaweedFS)
  - `POST /api/admin/cdn/bulk-sign`
  - `GET /api/cdn/verify` (Nginx auth_request Sub-Request)

- AI Survey Prompts (Admin):
  - `GET /api/admin/ai-survey-prompts` → `packages/backend/src/routes/aiSurveyPrompt.ts`
  - `POST /api/admin/ai-survey-prompts`
  - `PUT /api/admin/ai-survey-prompts/:id`
  - `DELETE /api/admin/ai-survey-prompts/:id`

- Face Swap Templates (Admin):
  - `GET /api/admin/face-swap-templates` → `packages/backend/src/routes/faceSwapTemplates.ts`
  - `POST /api/admin/face-swap-templates`
  - `PUT /api/admin/face-swap-templates/:id`
  - `DELETE /api/admin/face-swap-templates/:id`

- Reference Images (Admin):
  - `GET /api/events/:id/reference-image` → `packages/backend/src/routes/referenceImage.ts`
  - `POST /api/events/:id/reference-image`
  - `DELETE /api/events/:id/reference-image`

- AI Async Delivery (mounted at `/api/ai-jobs`):
  - `GET /api/ai-jobs/video-models` → `packages/backend/src/routes/aiAsyncDelivery.ts`
  - `GET /api/ai-jobs/:shortCode`
  - `GET /api/ai-jobs/admin/list`

- Face-Off (mounted at `/api/events`):
  - `POST /api/events/:eventId/face-off` → `packages/backend/src/routes/faceOff.ts`
  - `GET /api/events/:eventId/face-off/:id`

- Debug Mode:
  - `GET /api/debug/enabled` (public) → `packages/backend/src/routes/debug.ts`
  - `POST /api/debug/toggle` (Admin auth)
  - `GET /api/debug/logs` (Admin auth)
  - `POST /api/debug/logs` (public, Frontend sendet Logs)
  - `DELETE /api/debug/logs` (Admin auth)
  - `POST /api/debug/local-toggle` (localhost-only, kein Auth)

- Image CDN:
  - `GET /cdn/:photoId` → `packages/backend/src/routes/imageCdn.ts`
  - Query-Params: `?w=400&q=80&f=webp`
  - On-the-fly Resize + Format-Conversion via Sharp

- AI Knowledge Store / Cache:
  - `GET /api/ai/cache/stats` → `packages/backend/src/routes/ai.ts`
  - `GET /api/ai/cache/online-status`
  - `POST /api/ai/cache/seed` (Admin, event types)
  - `POST /api/ai/cache/seed-extended` (Admin, extended seeding)

- Style Transfer:
  - `POST /api/style-transfer/:eventId` → `packages/backend/src/routes/styleTransfer.ts`
  - Provider: fal.ai (flux/dev img2img)

- Booth Games:
  - `POST /api/booth-games/:game` → `packages/backend/src/routes/boothGames.ts`
  - Games: compliment-mirror, fortune-teller, ai-roast, ai-bingo, ai-meme, photo-critic, couple-match, etc.
  - `POST /api/booth-games/bg-removal` (Background Removal via remove.bg)
  - `POST /api/booth-games/face-switch` (Face Switch via fal.ai inswapper)

- SMS Sharing:
  - `GET /api/sms/status` → `packages/backend/src/routes/smsShare.ts`
  - `POST /api/sms/share-photo`

- Gallery Embed:
  - `GET /api/events/:eventId/embed` → `packages/backend/src/routes/galleryEmbed.ts`
  - `GET /embed/:slug` (public embed page, HTML response)

- AI Jobs (RunPod/ComfyUI):
  - `POST /api/ai-jobs` → `packages/backend/src/routes/aiJobs.ts`
  - `GET /api/ai-jobs/:id`
  - `GET /api/ai-jobs/video-models`
  - `GET /api/ai-jobs/admin/list`

- Result Page:
  - `GET /api/r/:shortCode` → `resultRouter` exported from `packages/backend/src/routes/aiJobs.ts`

- Cost Monitoring (Admin):
  - `GET /api/admin/cost-monitoring/summary` → `packages/backend/src/routes/adminCostMonitoring.ts`
  - `GET /api/admin/cost-monitoring/timeline`
  - `GET /api/admin/cost-monitoring/top-events`
  - `GET /api/admin/cost-monitoring/alerts`

- Trend Monitor (Admin):
  - `GET /api/admin/trend-monitor` → `packages/backend/src/routes/trendMonitor.ts`

- Guest Feedback / Google Review:
  - `POST /api/feedback` → `packages/backend/src/routes/feedback.ts` (public, kein Auth)
  - `PATCH /api/feedback/:id/google-sent` (Google-Klick markieren)
  - `GET /api/feedback/stats` (Admin)
  - `GET /api/feedback` (Admin, paginiert)

- Booth Setup:
  - `POST /api/booth/setup` → `packages/backend/src/routes/boothSetup.ts`
  - `GET /api/booth/config/:eventId`
  - `POST /api/booth/heartbeat`
  - `POST /api/booth/upload`

- Booth Games:
  - `POST /api/booth-games/:game` → `packages/backend/src/routes/boothGames.ts`
  - Games: compliment-mirror, fortune-teller, ai-roast, ai-bingo, ai-meme, photo-critic, couple-match, face-switch, bg-removal, style-effect, etc.

- Workflows:
  - `GET /api/workflows` → `packages/backend/src/routes/workflows.ts`
  - `POST /api/workflows`
  - `PUT /api/workflows/:id`
  - `DELETE /api/workflows/:id`

- Hardware:
  - `GET /api/hardware/:eventId` → `packages/backend/src/routes/hardware.ts`
  - `POST /api/hardware/:eventId`

- Air Graffiti:
  - `POST /api/events/:eventId/graffiti` → `packages/backend/src/routes/graffiti.ts`

- Payments:
  - `POST /api/payments` → `packages/backend/src/routes/payments.ts`

- TUS Uploads:
  - `POST /api/uploads` → `packages/backend/src/routes/uploads.ts` (TUS Create)
  - `PATCH /api/uploads/:id` (TUS Chunk)
  - `HEAD /api/uploads/:id` (TUS Resume-Status)
  - `GET /api/uploads/status` → `{ enabled, maxSize }` (Public)
  - `GET /api/uploads/limit/:eventId?guest=name` → `{ limited, max, used, remaining }` (Upload-Limit-Info für Gäste)
  - **Limit:** 100MB einheitlich (Multer + TUS + Nginx). Stand: 07.03.2026.

- CSRF Token:
  - `GET /api/csrf-token` → CSRF-Token generieren + Cookie setzen
  - CSRF-Schutz auf allen POST/PUT/DELETE/PATCH `/api/*` Routes (außer uploads, webhooks, workflow-sync, health, landing, cms, /r/)

- Workflow Sync (RunPod → Backend):
  - `POST /api/workflow-sync` → `packages/backend/src/routes/workflowSync.ts` (x-sync-key Auth)

- Admin ComfyUI Workflows:
  - `GET /api/admin/workflows/:effect` → `packages/backend/src/routes/adminWorkflows.ts`
  - `PUT /api/admin/workflows/:effect` (Workflow-JSON aktualisieren)
  - `DELETE /api/admin/workflows/:effect`
  - `POST /api/admin/workflows/:effect/test` (Test-Job an RunPod senden)

## WordPress Bridge (v1)

### Konfiguration (Env / Secrets)

- **Required (Prod)**
  - `WOOCOMMERCE_WEBHOOK_SECRET` (Webhook signature validation)
- **Required (Prod)**
  - `WORDPRESS_SSO_SECRET` (**PFLICHT** für `POST /api/auth/wordpress-sso` — Endpoint ist deaktiviert wenn nicht gesetzt. Constant-time Vergleich via `crypto.timingSafeEqual`.)
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
      - Body: `{ "mode": "dry_run" | "apply" }`
        - `dry_run`: Readback der gespeicherten Payload
        - `apply`: verarbeitet die gespeicherte Payload erneut (Single Source of Truth via Woo webhook processor) und erzeugt einen neuen Log-Eintrag (Reason: `admin_replay_apply`)

### Admin Ops (Diagnostics)

- System Health:
  - `GET /api/admin/ops/health` → `packages/backend/src/routes/adminOps.ts`

- WordPress Auth Diagnostics (verify-password endpoint reachability):
  - `GET /api/admin/ops/wordpress` → `packages/backend/src/routes/adminOps.ts`
    - prüft Erreichbarkeit von `WORDPRESS_URL/wp-json/gaestefotos/v1/verify-password`
    - führt bewusst einen Request mit ungültigen Credentials aus (erwartet HTTP `400` oder `200`)
    - liefert zusätzlich Konfig-Flags:
      - `config.hasVerifySecret`
      - `config.hasWpDbConfig`

## CMS (Public Snapshots)

- Public readback (Snapshot-Content für Seiten wie `/faq`, `/datenschutz`, `/impressum`, `/agb`):
  - `GET /api/cms/:kind/:slug` → `packages/backend/src/routes/cmsPublic.ts`
    - `kind`: `pages` | `posts`
    - Response: `{ snapshot: { title, html, excerpt, link, modifiedGmt, fetchedAt, ... } }`

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
  - `wall:control` (Admin/Host-Fernsteuerung) → Relay in `packages/backend/src/index.ts`
    - **Auth-Check:** Nur Host, Co-Host oder Admin dürfen `wall:control` senden (JWT aus Handshake-Cookie geprüft)
    - Admin/Host sendet `{ eventId, ...controlData }` → Server broadcastet `controlData` an alle Clients im Room `event:<eventId>` (außer Sender)
    - Steuerbare Felder: `viewMode`, `isPlaying`, `soundEnabled`, `intervalSec`, `showQR`, `overlayType`, `overlayIntensity`, `message`, `messageVisible`

Admin-Fernsteuerung (Frontend):
- Hook: `packages/frontend/src/hooks/useWallControl.ts` — Role-basiert (admin sendet, wall empfängt)
- Panel: `packages/frontend/src/components/wall/WallAdminControl.tsx` — sichtbar bei `?admin=1`
- Sound: `packages/frontend/src/hooks/useWallSounds.ts` — prozeduraler Web Audio Synthesizer
- Overlay: `packages/frontend/src/components/event-theme/WallThemeOverlay.tsx` — 6 Typen

## Tracking (QR / Quellen)

- Public: `GET /api/events/slug/:slug?source=qr`
  - Zählt Zugriffe pro Quelle (z.B. `qr`)
  - Code: `packages/backend/src/routes/events.ts`
- Host/Admin: `GET /api/events/:id/traffic`
  - Liefert Zähler pro `source`
  - Code: `packages/backend/src/routes/events.ts`

## Photo Delivery (DSGVO Opt-in)

Backend:
- Worker: `packages/backend/src/services/photoDelivery.ts`
  - Prüft alle 60s auf neue APPROVED Fotos
  - Sendet E-Mails an Gäste mit `emailOptIn=true`
  - Respektiert DSGVO: nur mit explizitem Opt-in, Unsubscribe-Link in jeder E-Mail

- Guest Unsubscribe:
  - `GET /api/guests/:guestId/unsubscribe` → `packages/backend/src/routes/guests.ts`
    - Public (kein Auth), rendert HTML-Bestätigungsseite
    - Setzt `emailOptIn=false` auf dem Guest-Record

- Guest Email Opt-in (POST beim Upload):
  - `POST /api/events/:eventId/guests/opt-in` → `packages/backend/src/routes/guests.ts`
    - Body: `{ email, name?, guestId? }`
    - Setzt `emailOptIn=true`, `emailOptInAt=now()` auf Guest
    - Idempotent (doppelte Calls sicher)

Frontend:
- Opt-in UI: `packages/frontend/src/components/upload/QuickUploadModal.tsx` (Success-Phase)
  - E-Mail-Feld + Checkbox, localStorage-Persistenz für wiederkehrende Gäste

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

  - Downloads:
    - `GET /api/photos/:photoId/download`
      - ACL:
        - Host/Admin: immer erlaubt (solange Storage nicht gelocked)
        - Guest: nur mit Event-Access Cookie (`hasEventAccess`) **und** wenn `featuresConfig.allowDownloads !== false` **und** Photo `APPROVED`
      - Storage lifecycle:
        - wenn Storage-Periode vorbei → `403 { code: "STORAGE_LOCKED" }` (denyByVisibility)
    - `POST /api/photos/bulk/download` (ZIP)
      - Host/Admin only
      - Storage lifecycle: wenn vorbei → `403 { code: "STORAGE_LOCKED" }`

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

  - Serve/Proxy:
    - `GET /api/videos/:eventId/file/:storagePath(*)` (inline)

  - Downloads:
    - `GET /api/videos/:videoId/download`
      - ACL:
        - Host/Admin: immer erlaubt (solange Storage nicht gelocked)
        - Guest: nur mit Event-Access Cookie (`hasEventAccess`) **und** wenn `featuresConfig.allowDownloads !== false` **und** Video `APPROVED`
      - Zusätzlich:
        - optional Virus-Scan Enforcement: nicht-clean → 404
      - Storage lifecycle:
        - wenn Storage-Periode vorbei → `403 { code: "STORAGE_LOCKED" }` (denyByVisibility)
    - `POST /api/videos/bulk/download` (ZIP)
      - Host/Admin only
      - (Hinweis) allowDownloads Flag gilt für Gäste; Host/Admin dürfen immer (Original-Download-Contract)
      - Storage lifecycle: wenn vorbei → `403 { code: "STORAGE_LOCKED" }`

Frontend:
- Upload UI + Retry/Queue:
  - `packages/frontend/src/components/UploadButton.tsx`
  - Offline Queue: `packages/frontend/src/lib/uploadQueue.ts` (IndexedDB)
  - Verhalten:
    - Enqueue wenn `navigator.onLine=false` oder `isRetryableUploadError()`
    - Auto-drain beim Page mount + `online` event
