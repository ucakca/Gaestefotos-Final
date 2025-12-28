# Gap Analysis (Feature Spec → Code)

Ziel: Für jede Spec-Funktion klar dokumentieren:
- **Status**: vorhanden | teilweise | fehlt
- **Belege**: Dateien / Endpoints
- **Was fehlt genau** (nächste Schritte)

## Host Wizard

- **Wizard Flow / Setup UI**
  - **Status**: fehlt (noch nicht eindeutig gefunden)
  - **Belege**:
    - (TODO: Entry Points finden, falls anders benannt)
  - **Fehlt**:
    - geführter Setup-Prozess (Design, QR, Smart Albums, Live Preview)

## Smart Albums (Zeitfenster)

- **Album nach Zeitbereichen** (z.B. Trauung 13–15)
  - **Status**: fehlt
  - **Belege**:
    - Guest Album Navigation existiert als Kategorien-Filter:
      - `packages/frontend/src/app/e/[slug]/page.tsx`
      - `packages/frontend/src/app/e2/[slug]/page.tsx`
      - `packages/frontend/src/components/AlbumNavigation`
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
  - **Status**: teilweise
  - **Belege**:
    - Frontend QR URLs:
      - `packages/frontend/src/app/live/[slug]/wall/page.tsx` → `/e/<slug>?source=qr`
      - `packages/frontend/src/app/admin/dashboard/page.tsx` → Gast-Link mit `?source=qr`
    - Backend Tracking:
      - `GET /api/events/slug/:slug?source=qr` → `packages/backend/src/routes/events.ts`
      - DB: `event_traffic_stats` (Prisma: `EventTrafficStat`)
  - **Fehlt**:
    - Admin Ansicht "Views by source" (UI)

## Guest PWA Offline

- **Service Worker + IndexedDB Upload Queue**
  - **Status**: unklar/zu prüfen
  - **Fehlt**:
    - belastbare Offline Queue & Retry Pipeline (wenn nicht vorhanden)

## Live Wall

- **Realtime Live Wall**
  - **Status**: teilweise
  - **Belege**:
    - `packages/frontend/src/app/live/[slug]/wall/page.tsx`
    - Backend: Socket.io init in `packages/backend/src/index.ts`
  - **Fehlt**:
    - Tiering (Polling vs Premium)
    - Sort-Modi
    - definierte Animationen (Spec)

## WordPress Bridge

- **WooCommerce Webhooks**
  - **Status**: teilweise
  - **Belege**:
    - `packages/backend/src/routes/woocommerceWebhooks.ts`
  - **Fehlt**:
    - v1 Contract/Endpoints (falls abweichend)
    - Marketing stats endpoint (Spec)

## Admin Impersonation

- **Admin "Login as Host"**
  - **Status**: fehlt

## Hard Constraints

- **Rate Limits**
  - **Status**: vorhanden
  - **Belege**:
    - `packages/backend/src/middleware/rateLimit.ts`

- **Storage Lifecycle (Retention/Reminders/Cleanup)**
  - **Status**: vorhanden
  - **Belege**:
    - `packages/backend/src/services/storagePolicy.ts`
    - `packages/backend/src/services/retentionPurge.ts`
    - `packages/backend/src/services/storageReminder.ts`

