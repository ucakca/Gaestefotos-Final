# Features

## Rollen

- **Host**: erstellt Events, verwaltet Inhalte, Gäste-Settings, Downloads/Uploads
- **Gast**: lädt Medien hoch (wenn erlaubt), sieht Galerie, kann herunterladen (wenn erlaubt)
- **Admin**: administrative Funktionen (je nach Setup)

## Core

- **Event Erstellung & Verwaltung**
- **Foto Upload + Moderation (optional)**
- **Video Upload + Moderation (optional)**
- **Kategorien/Alben**
- **Gästebuch**
- **Downloads**
  - Einzel-Downloads
  - Bulk/ZIP Downloads
- **Lifecycle Regeln (UI/Policy)**
  - Upload-Fenster: `event.dateTime ± 1 Tag`
  - Storage-Lock nach `storageEndsAt` (berechnet: `event.dateTime + package duration`)
  - Nach Storage-Lock: Media blur + Upload/Download deaktiviert

## Tech

- **Auth**: JWT + httpOnly Cookie (`auth_token`)
- **Storage**: SeaweedFS (S3 kompatibel)
- **DB**: Postgres + Prisma
- **Frontend**: Next.js 14 App Router
- **Realtime**: Socket.io

## Integrationen

- **WordPress**: Login/Verifikation (je nach Konfiguration)
- **WooCommerce**: Webhooks/Entitlements (je nach Konfiguration)
