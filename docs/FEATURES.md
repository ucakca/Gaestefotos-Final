# Features

## Rollen

- **Host**: erstellt Events, verwaltet Inhalte, Gäste-Settings, Downloads/Uploads
- **Gast**: lädt Medien hoch (wenn erlaubt), sieht Galerie, kann herunterladen (wenn erlaubt)
- **Admin/Superadmin**: administrative Funktionen (z.B. Admin-Dashboard)

## Core

- **Event Erstellung & Verwaltung**
- **Foto Upload + Moderation (optional)**
- **Video Upload + Moderation (optional)**
- **Kategorien/Alben**
- **Gästebuch**
- **Downloads**
  - Einzel-Downloads
  - Bulk/ZIP Downloads
  - Policy:
    - Host/Admin: erlaubt (solange Storage nicht gelocked)
    - Gast: nur wenn Host `featuresConfig.allowDownloads !== false` und Media `APPROVED`
- **Lifecycle Regeln (UI/Policy)**
  - Upload-Fenster: `event.dateTime ± 1 Tag`
  - Storage-Lock nach `storageEndsAt` (berechnet: `event.dateTime + package duration`)
  - Nach Storage-Lock: Media blur + Upload/Download deaktiviert

## Tech

- **Auth**: JWT + httpOnly Cookie (`auth_token`)
  - Login erfolgt über `POST /api/auth/login`
  - In Produktion werden Browser-API Calls **same-origin** gemacht (relative `'/api'`)
  - `/register` ist in der UI deaktiviert; Backend-Register ist standardmäßig gesperrt (optional via `ALLOW_SELF_REGISTER=true`)
- **Login UI**:
  - Passwort anzeigen/verbergen
  - Link „Passwort vergessen?“ (führt auf `gästefotos.com`)
- **WordPress Login/Verifikation** (wenn konfiguriert):
  - Passwort-Verifikation via WP REST Endpoint
  - Unterstützt Unicode-IDN Domains in Emails (z.B. `test@gästefotos.com`) durch Kandidaten-Suche (Unicode + Punycode Varianten)
- **Admin Access**:
  - Admin-Landing nach Login: `/admin/dashboard`
  - Guard via Middleware: `/admin/*` nur für Rollen `ADMIN`/`SUPERADMIN`
- **Storage**: SeaweedFS (S3 kompatibel)
- **DB**: Postgres + Prisma
- **Frontend**: Next.js 14 App Router
- **Realtime**: Socket.io

## Integrationen

- **WordPress**: Login/Verifikation (je nach Konfiguration)
- **WooCommerce**: Webhooks/Entitlements (je nach Konfiguration)
