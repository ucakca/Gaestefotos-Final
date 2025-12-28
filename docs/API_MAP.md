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

## QR / Print Export

Quelle: `packages/backend/src/routes/events.ts`

- `GET /api/events/:id/qr/config` (auth, host/admin)
- `PUT /api/events/:id/qr/config` (auth, host/admin)
- `POST /api/events/:id/qr/export.png` (auth, host/admin)
- `POST /api/events/:id/qr/export.pdf` (auth, host/admin)

Frontend Admin nutzt Export:
- `packages/frontend/src/app/admin/dashboard/page.tsx`

## Live Wall

Frontend:
- `packages/frontend/src/app/live/[slug]/wall/page.tsx`

Backend liefert Fotos (approved):
- `GET /api/events/:id/photos?status=APPROVED` (siehe `packages/backend/src/routes/photos.ts` + event policies)

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
