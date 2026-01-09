# Features

## Rollen

- **Host**: erstellt Events, verwaltet Inhalte, Gäste-Settings, Downloads/Uploads
- **Co-Host**: verwaltet ein Event im Auftrag des Hosts (wie Host, aber nicht `hostId`)
- **Gast**: lädt Medien hoch (wenn erlaubt), sieht Galerie, kann herunterladen (wenn erlaubt)
- **Admin/Superadmin**: administrative Funktionen (z.B. Admin-Dashboard)

## Core

- **Event Erstellung & Verwaltung**
- **Co-Hosts (Event Mitglieder)**
  - Co-Hosts können ein Event verwalten (Host/Co-Host/Admin Zugriff)
  - Admin Dashboard: Co-Hosts pro Event anzeigen, suchen, hinzufügen/entfernen
  - Invite Flow:
    - Invite-Link erzeugen (JWT)
    - Accept via App (`?cohostInvite=...` → Login falls nötig → `/api/cohosts/accept`)
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

- **Invitation Templates (Admin)**
  - Backend: `GET/POST/PUT/DELETE /api/admin/invitation-templates`
  - DB: `invitation_templates` unterstützt `slug/title/description/html/text`
  - Admin Dashboard: Seite `/invitation-templates` (CRUD)

- **Impersonation (Admin)**
  - Backend: `POST /api/admin/impersonation/token` (Token mit TTL)
  - Audit: jede Token-Ausstellung wird in `impersonation_audit_logs` erfasst

## Tech

- **Auth**: JWT + httpOnly Cookie (`auth_token`)
  - Login erfolgt über `POST /api/auth/login`
  - In Produktion werden Browser-API Calls **same-origin** gemacht (relative `'/api'`)
  - `/register` ist in der UI deaktiviert; Backend-Register ist standardmäßig gesperrt (optional via `ALLOW_SELF_REGISTER=true`)
- **2FA (TOTP)**
  - Für Admins verpflichtend (Enforcement im Login-Flow)
  - Setup/Opt-in ist aktuell **Admin-only** (Host-Opt-in ist Follow-up, falls gewünscht)
  - Secrets werden im Backend verschlüsselt gespeichert (AES-256-GCM, ENV: `TWO_FACTOR_ENCRYPTION_KEY`)
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

- **Stability / Hardening**
  - Admin CRUD Routes fangen Validierungs-/DB-Fehler ab (kein Prozess-Crash durch unhandled rejections)

## UI / Design

- **Design Tokens (Theme System v1)**
  - Token-basierte Farben (Tailwind + CSS-Variablen) für konsistente UI
- **Status Tokens (UI Konvention)**
  - Status-Farben über Tokens/Utilities (`*-status-*`) statt direkter `var(--status-*)` Klassen

## Integrationen

- **WordPress**: Login/Verifikation (je nach Konfiguration)
- **WooCommerce**: Webhooks/Entitlements (je nach Konfiguration)
  - Admin Tool: "WooCommerce Webhook Inbox" (Logs + Replay/Apply)

## Public Content

- **FAQ (`/faq`)**: rendert aus CMS Snapshots (`GET /api/cms/pages/faq`), Fallback Redirect wenn kein Snapshot vorhanden.
- **Datenschutz (`/datenschutz`)**: rendert aus CMS Snapshots (`GET /api/cms/pages/datenschutz`), Fallback Redirect wenn kein Snapshot vorhanden.
- **Impressum (`/impressum`)**: rendert aus CMS Snapshots (`GET /api/cms/pages/impressum`), Fallback Redirect wenn kein Snapshot vorhanden.
- **AGB (`/agb`)**: rendert aus CMS Snapshots (`GET /api/cms/pages/agb`), Fallback Redirect wenn kein Snapshot vorhanden.
