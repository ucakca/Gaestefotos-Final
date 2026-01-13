# 📋 Implementierte Funktionen und Logiken - Vollständige Übersicht

**Datum:** 2025-01-XX  
**Version:** 2.0.0  
**Status:** Vollständige Feature-Übersicht

---

## 📋 Inhaltsverzeichnis

1. [Backend API Endpoints](#backend-api-endpoints)
2. [Services & Business Logic](#services--business-logic)
3. [Frontend Features](#frontend-features)
4. [Geschäftslogiken](#geschäftslogiken)
5. [Background Workers](#background-workers)
6. [Security Features](#security-features)
7. [Integrationen](#integrationen)

---

## 🔌 Backend API Endpoints

### 🔐 Authentifizierung (`/api/auth`)

**Datei:** `packages/backend/src/routes/auth.ts`

- ✅ `POST /api/auth/register` - Benutzer-Registrierung (optional, via `ALLOW_SELF_REGISTER=true`)
- ✅ `POST /api/auth/login` - Login mit Email/Passwort
  - WordPress SSO Integration
  - Unicode/IDN Email Support (Punycode-Konvertierung)
  - Email-Kandidaten-Suche (Unicode + ASCII Varianten)
  - JWT Token Generation
  - httpOnly Cookie Setzung
- ✅ `POST /api/auth/logout` - Logout (Cookie löschen)
- ✅ `GET /api/auth/me` - Aktueller Benutzer (authentifiziert)

**Logik:**
- WordPress-Passwort-Verifikation via REST API oder PHP-Fallback
- Passwort-Hashing mit bcrypt
- JWT Token mit konfigurierbarer Expiration
- Cookie-basierte Authentifizierung (httpOnly, secure in Production)

---

### 📅 Event Management (`/api/events`)

**Datei:** `packages/backend/src/routes/events.ts`

#### Event CRUD
- ✅ `GET /api/events` - Liste aller Events (authentifiziert)
- ✅ `GET /api/events/:id` - Event-Details (authentifiziert)
- ✅ `GET /api/events/slug/:slug` - Event via Slug (öffentlich)
- ✅ `POST /api/events` - Event erstellen
  - Slug-Generierung (automatisch oder manuell)
  - Event-Code-Generierung (QR-Code)
  - Design-Config (JSON)
  - Features-Config (JSON)
  - Kategorien-Erstellung (optional)
- ✅ `PATCH /api/events/:id` - Event bearbeiten
- ✅ `DELETE /api/events/:id` - Event löschen (Soft Delete)

#### Event-Zugriff
- ✅ `POST /api/events/:id/access` - Event-Zugriff anfordern (Passwort)
  - Event Access Cookie ausstellen
  - Invite Token Support
- ✅ `POST /api/events/:id/invite-token` - Invite Token generieren

#### Event-Design
- ✅ `POST /api/events/:id/logo` - Logo hochladen
- ✅ `POST /api/events/:id/profile-image` - Profilbild hochladen
- ✅ `POST /api/events/:id/cover-image` - Cover-Bild hochladen
- ✅ `PUT /api/events/:id/design` - Design-Config aktualisieren
- ✅ `GET /api/events/:eventId/design-image/:kind/:storagePath` - Design-Bild abrufen
- ✅ `GET /api/events/:eventId/design/file/:storagePath` - Design-Datei abrufen

#### QR-Code Management
- ✅ `GET /api/events/:id/qr/config` - QR-Code-Konfiguration abrufen
- ✅ `PUT /api/events/:id/qr/config` - QR-Code-Konfiguration aktualisieren
- ✅ `POST /api/events/:id/qr/export.png` - QR-Code als PNG exportieren
- ✅ `POST /api/events/:id/qr/export.pdf` - QR-Code als PDF exportieren
  - A6/A5 Format
  - SVG-Template Support
  - Crop Marks, Bleed, Margins

#### Event-Statistiken & Usage
- ✅ `GET /api/events/:id/usage` - Storage-Usage abrufen
  - Photos Bytes
  - Videos Bytes
  - Guestbook Bytes
  - Design Assets Bytes
  - Total Bytes
- ✅ `GET /api/events/:id/statistics` - Event-Statistiken
- ✅ `GET /api/events/:id/upload-issues` - Upload-Probleme (Rate Limits, etc.)

**Geschäftslogik:**
- Host-Only Zugriff (außer Admin)
- Event Access Cookies (12h TTL)
- Storage-Limit-Prüfung
- Upload-Date-Window-Prüfung (±1 Tag um Event-Datum)

---

### 📸 Foto Management (`/api/events/:eventId/photos` & `/api/photos`)

**Datei:** `packages/backend/src/routes/photos.ts`

#### Foto CRUD
- ✅ `GET /api/events/:eventId/photos` - Fotos eines Events abrufen
  - Status-Filter (PENDING, APPROVED, REJECTED, DELETED)
  - Gast-Informationen
  - Proxy-URLs (same-origin)
- ✅ `POST /api/events/:eventId/photos/upload` - Foto hochladen
  - MIME-Type Validierung
  - Magic Bytes Validierung
  - Image Processing (Thumbnail, Optimierung)
  - Duplikat-Erkennung
  - Gesichtserkennung (optional)
  - EXIF-Daten-Extraktion
  - Storage-Limit-Prüfung
  - Upload-Date-Window-Prüfung
  - Moderation (PENDING/APPROVED)
  - WebSocket-Event (photo_uploaded)
- ✅ `GET /api/photos/:photoId/file` - Foto-Datei abrufen (Proxy)
  - Event-Zugriff-Prüfung
  - Blur-Policy (wenn nicht approved)
  - Content-Type Header
- ✅ `GET /api/photos/:photoId/download` - Foto-Download (mit Watermark optional)
- ✅ `POST /api/photos/:photoId/edit` - Foto bearbeiten (Titel, Beschreibung, Tags)
- ✅ `DELETE /api/photos/:photoId` - Foto löschen (Soft Delete)

#### Foto-Moderation
- ✅ `POST /api/photos/:photoId/approve` - Foto freigeben
  - WebSocket-Event (photo_approved)
  - Email-Benachrichtigung (optional)
- ✅ `POST /api/photos/:photoId/reject` - Foto ablehnen
  - WebSocket-Event (photo_rejected)
  - Email-Benachrichtigung (optional)
- ✅ `POST /api/photos/bulk/approve` - Bulk-Freigabe
- ✅ `POST /api/photos/bulk/reject` - Bulk-Ablehnung
- ✅ `POST /api/photos/bulk/delete` - Bulk-Löschung

#### Foto-Download
- ✅ `GET /api/events/:eventId/download-zip` - Alle Fotos als ZIP
  - Archiver-basiert
  - Progress-Tracking
  - Event-Zugriff-Prüfung

**Geschäftslogik:**
- Upload nur innerhalb ±1 Tag um Event-Datum
- Storage-Lock-Prüfung (Storage-Ends-At)
- Moderation-Required-Prüfung
- Host/Admin können direkt uploaden (APPROVED)
- Gäste müssen moderiert werden (PENDING)

---

### 🎥 Video Management (`/api/events/:eventId/videos` & `/api/videos`)

**Datei:** `packages/backend/src/routes/videos.ts`

#### Video CRUD
- ✅ `GET /api/events/:eventId/videos` - Videos eines Events abrufen
- ✅ `POST /api/events/:eventId/videos/upload` - Video hochladen
  - MIME-Type Validierung (MP4, WebM, QuickTime, M4V)
  - Magic Bytes Validierung
  - Größenlimit: 100MB
  - Storage-Limit-Prüfung
- ✅ `GET /api/videos/:eventId/file/:filename` - Video-Datei abrufen
- ✅ `DELETE /api/videos/:videoId` - Video löschen

#### Video-Moderation
- ✅ `POST /api/videos/:videoId/approve` - Video freigeben
- ✅ `POST /api/videos/:videoId/reject` - Video ablehnen
- ✅ `POST /api/videos/bulk/approve` - Bulk-Freigabe
- ✅ `POST /api/videos/bulk/reject` - Bulk-Ablehnung
- ✅ `POST /api/videos/bulk/delete` - Bulk-Löschung

#### Video-Trash
- ✅ `GET /api/videos/:eventId/trash` - Gelöschte Videos
- ✅ `POST /api/videos/:videoId/restore` - Video wiederherstellen
- ✅ `POST /api/videos/:videoId/purge` - Video endgültig löschen

---

### 👥 Gast Management (`/api/events/:eventId/guests`)

**Datei:** `packages/backend/src/routes/guests.ts`

- ✅ `GET /api/events/:eventId/guests` - Gästeliste abrufen
  - Host/Admin: Vollständige Liste
  - Gast: Nur eigene Daten
- ✅ `POST /api/events/:eventId/guests` - Gast hinzufügen
  - Access Token Generation (UUID)
  - Status: PENDING, ACCEPTED, DECLINED
- ✅ `PUT /api/events/:eventId/guests/:guestId` - Gast bearbeiten
- ✅ `DELETE /api/events/:eventId/guests/:guestId` - Gast löschen

**Geschäftslogik:**
- Access Token für Gast-Zugriff
- Plus-One Count Support
- Dietary Requirements

---

### 🏷️ Kategorien (`/api/events/:eventId/categories`)

**Datei:** `packages/backend/src/routes/categories.ts`

- ✅ `GET /api/events/:eventId/categories` - Kategorien abrufen
- ✅ `POST /api/events/:eventId/categories` - Kategorie erstellen
  - Icon Key Support
  - Sortier-Reihenfolge
  - Upload-Lock Support
  - Upload-Lock bis Datum
  - Challenge-Support
- ✅ `PUT /api/events/:eventId/categories/:categoryId` - Kategorie bearbeiten
- ✅ `DELETE /api/events/:eventId/categories/:categoryId` - Kategorie löschen
- ✅ `PUT /api/photos/:photoId/category` - Foto zu Kategorie zuordnen

**Geschäftslogik:**
- Kategorien können Upload-Lock haben
- Challenge-System pro Kategorie
- Sichtbarkeit für Gäste (isVisible)

---

### 💬 Social Features

#### Likes (`/api/photos/:photoId/like`)

**Datei:** `packages/backend/src/routes/likes.ts`

- ✅ `POST /api/photos/:photoId/like` - Foto liken
  - Reaction Types: "heart", "laugh", "wow", "fire", "clap"
  - IP-basierte Duplikat-Prüfung
  - Gast-basierte Duplikat-Prüfung
- ✅ `GET /api/photos/:photoId/likes` - Likes abrufen
  - Aggregation nach Reaction Type
  - Gast-Informationen

#### Comments (`/api/photos/:photoId/comments`)

**Datei:** `packages/backend/src/routes/comments.ts`

- ✅ `GET /api/photos/:photoId/comments` - Kommentare abrufen
- ✅ `POST /api/photos/:photoId/comments` - Kommentar erstellen
  - Moderation (PENDING, APPROVED, REJECTED)
  - Gast oder anonym (authorName)
- ✅ `POST /api/photos/comments/:commentId/:action` - Kommentar moderieren (approve/reject)
- ✅ `DELETE /api/photos/comments/:commentId` - Kommentar löschen

#### Votes (`/api/photos/:photoId/vote`)

**Datei:** `packages/backend/src/routes/votes.ts`

- ✅ `POST /api/photos/:photoId/vote` - Foto bewerten (1-5 Sterne)
  - IP-basierte Duplikat-Prüfung
- ✅ `GET /api/photos/:photoId/votes` - Votes abrufen
  - Durchschnitts-Rating
  - Vote-Count

---

### 📖 Stories (`/api/events/:eventId/stories`)

**Datei:** `packages/backend/src/routes/stories.ts`

- ✅ `GET /api/events/:eventId/stories` - Stories abrufen
  - Nur aktive Stories
  - Nur nicht abgelaufene Stories
- ✅ `POST /api/events/:eventId/stories` - Story erstellen
  - Aus Foto oder Video
  - 24h Expiration
- ✅ `PUT /api/stories/:storyId` - Story aktivieren/deaktivieren
- ✅ `POST /api/stories/:storyId/view` - Story-View tracken

**Geschäftslogik:**
- Stories laufen nach 24h ab
- Gäste können Stories aktivieren/deaktivieren
- View-Tracking

---

### 📝 Guestbook (`/api/events/:eventId/guestbook`)

**Datei:** `packages/backend/src/routes/guestbook.ts`

#### Guestbook Entries
- ✅ `GET /api/events/:eventId/guestbook` - Gästebuch-Einträge abrufen
  - Pagination
  - Moderation-Filter
- ✅ `POST /api/events/:eventId/guestbook` - Gästebuch-Eintrag erstellen
  - Text-Nachricht
  - Foto-Upload (optional)
  - Audio-Upload (optional)
  - Moderation (PENDING, APPROVED, REJECTED)
- ✅ `POST /api/guestbook/:entryId/:action` - Eintrag moderieren (approve/reject)
- ✅ `DELETE /api/guestbook/:entryId` - Eintrag löschen

#### Guestbook Uploads
- ✅ `POST /api/events/:eventId/guestbook/photo-upload` - Foto für Gästebuch hochladen
  - Temporärer Upload (expiresAt)
  - Claim-System (claimedAt)
- ✅ `POST /api/events/:eventId/guestbook/audio-upload` - Audio für Gästebuch hochladen
- ✅ `GET /api/events/:eventId/guestbook/pending-uploads` - Pending Uploads abrufen

#### Host-Message
- ✅ `PUT /api/events/:eventId/guestbook/host-message` - Host-Nachricht setzen
- ✅ `GET /api/events/:eventId/guestbook/host-message` - Host-Nachricht abrufen

**Geschäftslogik:**
- Temporäre Uploads mit Expiration
- Claim-System für Uploads
- Moderation für Einträge

---

### 🎯 Challenges (`/api/events/:eventId/challenges`)

**Datei:** `packages/backend/src/routes/challenges.ts`

- ✅ `GET /api/events/:eventId/challenges` - Challenges abrufen
- ✅ `POST /api/events/:eventId/challenges` - Challenge erstellen
  - Kategorie-basiert
  - Beschreibung
  - Reward (optional)
- ✅ `PUT /api/challenges/:challengeId` - Challenge bearbeiten
- ✅ `DELETE /api/challenges/:challengeId` - Challenge löschen
- ✅ `POST /api/challenges/:challengeId/complete` - Challenge abschließen
  - Foto-Upload erforderlich
  - Completion-Tracking
- ✅ `POST /api/challenges/:challengeId/claim` - Reward einlösen
- ✅ `GET /api/challenges/:challengeId/completions` - Completions abrufen

**Geschäftslogik:**
- Challenge-Completion via Foto-Upload
- Reward-System
- Completion-Tracking pro Gast

---

### 🔍 Duplikat-Erkennung (`/api/events/:eventId/duplicates`)

**Datei:** `packages/backend/src/routes/duplicates.ts`

- ✅ `GET /api/events/:eventId/duplicates` - Duplikat-Gruppen abrufen
  - Perceptual Hash basiert
  - MD5 Hash basiert
  - Qualitäts-Score
- ✅ `POST /api/events/:eventId/duplicates/:groupId/best` - Bestes Foto setzen
- ✅ `DELETE /api/events/:eventId/duplicates/:groupId` - Duplikat-Gruppe löschen

**Geschäftslogik:**
- MD5 Hash für exakte Duplikate
- Perceptual Hash für ähnliche Bilder
- Qualitäts-Score (Auflösung, Dateigröße, Format, Schärfe)
- Beste-Foto-Auswahl basierend auf Score + Engagement

---

### 🔎 Face Search (`/api/events/:eventId/face-search`)

**Datei:** `packages/backend/src/routes/faceSearch.ts`

- ✅ `POST /api/events/:eventId/face-search` - Gesichtssuche
  - Reference Descriptor (128-dimensional)
  - Min Similarity (default: 0.6)
  - Face Position (x, y, width, height)

**Geschäftslogik:**
- Face Descriptor Extraction (face-api.js)
- Similarity-Berechnung (Cosine Similarity)
- Nur approved Fotos
- Nur Fotos mit Face Detection

---

### 📧 Email (`/api/email` & `/api/events/:eventId/invite`)

**Datei:** `packages/backend/src/routes/email.ts`

- ✅ `POST /api/email/test` - Test-Email senden
- ✅ `POST /api/events/:eventId/invite` - Einladungs-Email senden
  - Template-System
  - Variable-Substitution
  - Invite Token Support
- ✅ `POST /api/events/:eventId/photo-notification` - Foto-Benachrichtigung senden
  - Approved/Rejected Status
  - Photo Count
  - Template-System

**Geschäftslogik:**
- Template-basiertes Email-System
- Variable-Substitution ({{variable}})
- HTML + Text Support
- SMTP-Konfiguration

---

### 🎫 Invitations (`/api/invitations`)

**Datei:** `packages/backend/src/routes/invitations.ts`

#### Invitation Management
- ✅ `GET /api/events/:eventId/invitations` - Invitations abrufen
- ✅ `POST /api/events/:eventId/invitations` - Invitation erstellen
  - Gast-Informationen
  - RSVP Support
  - Shortlink Generation
- ✅ `PUT /api/events/:eventId/invitations/:invitationId` - Invitation bearbeiten
- ✅ `POST /api/events/:eventId/invitations/:invitationId/shortlinks` - Shortlink generieren

#### Public Invitation Pages
- ✅ `GET /api/events/slug/:slug/invitations/public` - Öffentliche Invitations
- ✅ `GET /api/invitations/slug/:slug` - Invitation via Slug
- ✅ `POST /api/invitations/slug/:slug/rsvp` - RSVP absenden
- ✅ `GET /api/invitations/slug/:slug/ics` - ICS Calendar File

#### Shortlinks
- ✅ `GET /api/shortlinks/:code` - Shortlink auflösen
  - Redirect zu Invitation
  - Tracking (optional)

**Geschäftslogik:**
- Slug-basierte Invitations
- RSVP-System (ACCEPTED, DECLINED)
- ICS Calendar Export
- Shortlink-System

---

### 📊 Statistiken (`/api/statistics` & `/api/events/:eventId/statistics`)

**Datei:** `packages/backend/src/routes/statistics.ts`

- ✅ `GET /api/statistics` - User-Statistiken
  - Upload-Historie
  - Engagement-Historie
- ✅ `GET /api/events/:eventId/statistics` - Event-Statistiken
  - Foto-Anzahl
  - Video-Anzahl
  - Gast-Anzahl
  - Upload-Statistiken
  - Engagement-Metriken (Likes, Comments, Views)

---

### 🔧 Admin Features

#### API Keys (`/api/admin/api-keys`)

**Datei:** `packages/backend/src/routes/adminApiKeys.ts`

- ✅ `GET /api/admin/api-keys` - API-Keys auflisten
- ✅ `POST /api/admin/api-keys` - API-Key erstellen
  - Scopes Support
  - Expiration Date
  - Key Hash (SHA-256)
- ✅ `POST /api/admin/api-keys/:id/revoke` - API-Key widerrufen

**Geschäftslogik:**
- Key-Hashing mit Pepper
- Scope-basierte Autorisierung
- Audit-Logging

#### Package Definitions (`/api/admin/package-definitions`)

**Datei:** `packages/backend/src/routes/packageDefinitions.ts`

- ✅ `GET /api/admin/package-definitions` - Packages auflisten
- ✅ `POST /api/admin/package-definitions` - Package erstellen
  - SKU
  - Storage Limit
  - Storage Duration
  - Tier (FREE, SMART, PREMIUM)
- ✅ `PUT /api/admin/package-definitions/:id` - Package bearbeiten
- ✅ `DELETE /api/admin/package-definitions/:id` - Package löschen

#### WooCommerce Webhooks (`/api/admin/webhooks/woocommerce`)

**Datei:** `packages/backend/src/routes/adminWooWebhooks.ts`

- ✅ `GET /api/admin/webhooks/woocommerce/logs` - Webhook-Logs
  - Filter nach Status, Topic, Order ID
  - Pagination
- ✅ `POST /api/admin/webhooks/woocommerce/replay/:logId` - Webhook erneut senden

#### Invoices (`/api/admin/invoices`)

**Datei:** `packages/backend/src/routes/adminInvoices.ts`

- ✅ `GET /api/admin/invoices` - Invoices auflisten
  - Filter nach Status, Date Range
- ✅ `GET /api/admin/invoices/export.csv` - CSV-Export

#### Email Templates (`/api/admin/email-templates`)

**Datei:** `packages/backend/src/routes/adminEmailTemplates.ts`

- ✅ `GET /api/admin/email-templates` - Templates auflisten
- ✅ `GET /api/admin/email-templates/:kind` - Template abrufen
  - INVITATION
  - STORAGE_ENDS_REMINDER
  - PHOTO_NOTIFICATION
- ✅ `PUT /api/admin/email-templates/:kind` - Template aktualisieren
- ✅ `POST /api/admin/email-templates/:kind/preview` - Template-Vorschau
- ✅ `POST /api/admin/email-templates/:kind/test-send` - Test-Email senden

#### CMS Sync (`/api/admin/cms`)

**Datei:** `packages/backend/src/routes/adminCmsSync.ts`

- ✅ `GET /api/admin/cms/wp/:kind/recent` - WordPress Pages/Posts (recent)
- ✅ `GET /api/admin/cms/wp/:kind/search` - WordPress Pages/Posts (search)
- ✅ `GET /api/admin/cms/snapshots` - CMS Snapshots auflisten
- ✅ `POST /api/admin/cms/sync` - CMS Sync durchführen
  - WordPress REST API
  - HTML-Fallback (wenn content.rendered leer)
  - Snapshot-Erstellung
- ✅ `GET /api/admin/cms/faq/preview` - FAQ-Vorschau

#### Maintenance Mode (`/api/admin/maintenance`)

**Datei:** `packages/backend/src/routes/adminMaintenance.ts`

- ✅ `GET /api/admin/maintenance` - Maintenance-Status
- ✅ `PUT /api/admin/maintenance` - Maintenance aktivieren/deaktivieren
  - Message Support
  - Admin-Access während Maintenance

---

### 🌐 Public Endpoints

#### CMS Public (`/api/cms`)

**Datei:** `packages/backend/src/routes/cmsPublic.ts`

- ✅ `GET /api/cms/:kind/:slug` - CMS Content abrufen
  - Aus Snapshot (schnell)
  - Fallback zu WordPress (langsam)

#### Maintenance (`/api/maintenance`)

**Datei:** `packages/backend/src/routes/maintenance.ts`

- ✅ `GET /api/maintenance` - Maintenance-Status (öffentlich)

#### WordPress Consent (`/api/wp-consent`)

**Datei:** `packages/backend/src/routes/wpConsent.ts`

- ✅ `GET /api/wp-consent` - Consent-Status
- ✅ `GET /api/wp-consent/asset/:b64` - Consent-Asset
- ✅ `GET /api/wp-consent/frame` - Consent-Frame

---

### 🛒 WooCommerce Webhooks (`/api/webhooks/woocommerce`)

**Datei:** `packages/backend/src/routes/woocommerceWebhooks.ts`

- ✅ `POST /api/webhooks/woocommerce/order-paid` - Order Paid Webhook
  - Signature-Verifikation
  - Event-Entitlement-Erstellung
  - Package-Definition-Mapping
  - Storage-Limit-Setzung

**Geschäftslogik:**
- Webhook-Signature-Verifikation
- Duplikat-Prüfung (wcOrderId)
- Event-Entitlement-Erstellung
- Package-Definition-Mapping via SKU

---

## 🔧 Services & Business Logic

### 📦 Storage Service

**Datei:** `packages/backend/src/services/storage.ts`

**Funktionen:**
- ✅ `uploadFile()` - Datei zu SeaweedFS hochladen
  - Filename Sanitization
  - Nonce-basierte Key-Generierung
  - Content-Type Support
- ✅ `getFile()` - Datei von SeaweedFS abrufen
  - Stream-Support
  - Buffer-Konvertierung
- ✅ `getFileUrl()` - Presigned URL generieren
  - Expiration Support
- ✅ `deleteFile()` - Datei löschen
- ✅ `ensureBucketExists()` - Bucket-Verifikation

**Logik:**
- S3-kompatible API (SeaweedFS)
- Path-basierte Organisation (`events/{eventId}/...`)
- Filename Sanitization (Path Traversal Protection)

---

### 🖼️ Image Processing Service

**Datei:** `packages/backend/src/services/imageProcessor.ts`

**Funktionen:**
- ✅ `processImage()` - Bild verarbeiten
  - Thumbnail-Generierung (300x300, cover)
  - Bildoptimierung (max 1920px, 80% Quality)
  - Original behalten
- ✅ `getMetadata()` - Bild-Metadaten extrahieren
  - Width, Height
  - Format
  - Size

**Logik:**
- Sharp-basiert
- Fallback wenn Sharp nicht verfügbar
- JPEG-Konvertierung

---

### 🔍 Duplikat-Erkennung Service

**Datei:** `packages/backend/src/services/duplicateDetection.ts`

**Funktionen:**
- ✅ `calculateMD5Hash()` - MD5 Hash berechnen
- ✅ `calculatePerceptualHash()` - Perceptual Hash berechnen
- ✅ `calculateQualityScore()` - Qualitäts-Score berechnen
  - Auflösung
  - Dateigröße
  - Format
  - Schärfe
- ✅ `findDuplicatePhotos()` - Duplikate finden
  - MD5 Hash (exakt)
  - Perceptual Hash (ähnlich)
- ✅ `determineBestPhoto()` - Bestes Foto bestimmen
  - Qualitäts-Score
  - Engagement (Likes, Comments, Views)
  - Zeit-Bonus
- ✅ `processDuplicateDetection()` - Duplikat-Erkennung durchführen
  - Hash-Berechnung
  - Duplikat-Gruppen
  - Beste-Foto-Auswahl

**Logik:**
- MD5 für exakte Duplikate
- Perceptual Hash für ähnliche Bilder
- Hamming Distance für Similarity
- Qualitäts-Score für Beste-Foto-Auswahl

---

### 👤 Gesichtserkennung Service

**Datei:** `packages/backend/src/services/faceRecognition.ts`

**Funktionen:**
- ✅ `detectFaces()` - Gesichter erkennen
  - Face-api.js
  - TensorFlow.js
  - Canvas-basiert
- ✅ `extractFaceDescriptor()` - Face Descriptor extrahieren
  - 128-dimensionaler Vektor
- ✅ `getFaceDetectionMetadata()` - Face Detection Metadaten
  - Face Count
  - Face Positions
  - Face Descriptors

**Logik:**
- Lazy-Loading von face-api.js
- Model-Loading (TinyFaceDetector)
- Fallback wenn nicht verfügbar

---

### 🔎 Face Search Service

**Datei:** `packages/backend/src/services/faceSearch.ts`

**Funktionen:**
- ✅ `searchPhotosByFace()` - Gesichtssuche
  - Reference Descriptor
  - Min Similarity (default: 0.6)
  - Cosine Similarity
- ✅ `calculateFaceSimilarity()` - Similarity berechnen
- ✅ `storeFaceDescriptors()` - Face Descriptors speichern

**Logik:**
- Nur approved Fotos
- Nur Fotos mit Face Detection
- Similarity-Berechnung (Cosine)

---

### 📧 Email Service

**Datei:** `packages/backend/src/services/email.ts`

**Funktionen:**
- ✅ `configure()` - Email-Service konfigurieren
  - SMTP-Konfiguration
  - Nodemailer
- ✅ `renderTemplate()` - Template rendern
  - Variable-Substitution ({{variable}})
  - HTML-Escaping (fehlt noch!)
- ✅ `sendTemplatedEmail()` - Template-Email senden
- ✅ `sendInvitation()` - Einladungs-Email senden
  - Template-System
  - Invite Token Support
- ✅ `sendPhotoNotification()` - Foto-Benachrichtigung senden
  - Approved/Rejected Status
- ✅ `sendStorageEndsReminder()` - Storage-Ends-Reminder senden
  - 30, 7, 1 Tag vorher

**Logik:**
- Template-basiert
- Variable-Substitution
- HTML + Text Support
- Active Template Support (aus DB)

---

### 💾 Cache Service

**Datei:** `packages/backend/src/services/cache.ts`

**Funktionen:**
- ✅ `get()` - Wert aus Cache abrufen
- ✅ `set()` - Wert in Cache setzen (mit TTL)
- ✅ `del()` - Wert löschen
- ✅ `delPattern()` - Pattern-basiertes Löschen
  - ⚠️ Verwendet `KEYS` (blocking!)
- ✅ `exists()` - Key-Existenz prüfen

**Logik:**
- Redis-basiert
- JSON-Serialization
- TTL Support
- Fallback wenn Redis nicht verfügbar

---

### 📦 Package Limits Service

**Datei:** `packages/backend/src/services/packageLimits.ts`

**Funktionen:**
- ✅ `getEffectiveEventPackage()` - Effektives Package bestimmen
  - Entitlement-basiert
  - Package-Definition-Mapping
  - Tier-basierte Defaults
- ✅ `getActiveEventEntitlement()` - Aktives Entitlement abrufen
  - WordPress User ID Isolation
  - Status: ACTIVE
- ✅ `getEventUsageBytes()` - Event-Usage berechnen
  - Photos Bytes
  - Videos Bytes
  - Guestbook Bytes
  - Design Assets Bytes
- ✅ `getEventUsageBreakdown()` - Usage-Breakdown
- ✅ `assertUploadWithinLimit()` - Upload-Limit prüfen
  - Strict Mode (ENFORCE_STORAGE_LIMITS)
  - Permissive Mode

**Logik:**
- Entitlement-basiertes Storage-Limit
- Package-Definition-Mapping via SKU
- Tier-basierte Defaults (FREE: 14d, SMART: 180d, PREMIUM: 365d)
- Usage-Tracking (Photos, Videos, Guestbook, Design)

---

### 📅 Storage Policy Service

**Datei:** `packages/backend/src/services/storagePolicy.ts`

**Funktionen:**
- ✅ `getEventStorageEndsAt()` - Storage-Ends-At berechnen
  - Basierend auf erstem Media-Upload
  - Package-Duration
  - Tier-basierte Defaults
- ✅ `isEventStorageLocked()` - Storage-Lock prüfen
- ✅ `tierToDefaultDurationDays()` - Tier zu Duration
  - FREE: 14 Tage
  - SMART: 180 Tage
  - PREMIUM: 365 Tage
- ✅ `getPackageDurationDaysBySku()` - Duration via SKU

**Logik:**
- Storage-Ends-At basierend auf erstem Upload
- Package-Duration oder Tier-Default
- Grace Period (6 Monate) für Retention Purge

---

### 📅 Event Policy Service

**Datei:** `packages/backend/src/services/eventPolicy.ts`

**Funktionen:**
- ✅ `isWithinEventDateWindow()` - Upload-Date-Window prüfen
  - ±1 Tag um Event-Datum
- ✅ `denyByVisibility()` - Access-Denial nach Visibility
  - Guest: 404
  - Host/Admin: 403

**Logik:**
- Upload nur innerhalb ±1 Tag um Event-Datum
- Visibility-basierte Error-Messages

---

### 📅 Upload Date Policy Service

**Datei:** `packages/backend/src/services/uploadDatePolicy.ts`

**Funktionen:**
- ✅ Upload-Date-Window-Prüfung
- ✅ Event-Datum-Validierung

---

### 🧹 Orphan Cleanup Service

**Datei:** `packages/backend/src/services/orphanCleanup.ts`

**Funktionen:**
- ✅ `startOrphanCleanupWorker()` - Orphan Cleanup Worker starten
  - Verwaiste Dateien finden
  - Storage-Dateien löschen
  - DB-Einträge bereinigen

**Logik:**
- Periodischer Cleanup (konfigurierbar)
- Batch-Processing
- Storage + DB Cleanup

---

### 🗑️ Retention Purge Service

**Datei:** `packages/backend/src/services/retentionPurge.ts`

**Funktionen:**
- ✅ `startRetentionPurgeWorker()` - Retention Purge Worker starten
  - Events nach Storage-Ends-At + Grace Period löschen
  - Hard Delete (wenn konfiguriert)
  - Storage-Dateien löschen

**Logik:**
- Storage-Ends-At + 6 Monate Grace Period
- Hard Delete (ENV: `RETENTION_PURGE_HARD_DELETE=true`)
- Batch-Processing
- Storage + DB Cleanup

---

### 🦠 Virus Scan Service

**Datei:** `packages/backend/src/services/virusScan.ts`

**Funktionen:**
- ✅ `startVirusScanWorker()` - Virus Scan Worker starten
  - Pending Scans verarbeiten
  - Auto-Clean (wenn konfiguriert)
  - Scan-Status aktualisieren

**Logik:**
- Global Auto-Clean (ENV: `VIRUS_SCAN_AUTO_CLEAN=true`)
- Per-Event Auto-Clean (featuresConfig)
- Scan-Status: PENDING, CLEAN, INFECTED

---

### 📧 Storage Reminder Service

**Datei:** `packages/backend/src/services/storageReminder.ts`

**Funktionen:**
- ✅ `startStorageReminderWorker()` - Storage Reminder Worker starten
  - Reminder 30, 7, 1 Tag vor Storage-End
  - Email-Benachrichtigungen
  - Reminder-Log (keine Duplikate)

**Logik:**
- Reminder 30, 7, 1 Tag vorher
- Einmal pro Tag prüfen
- Reminder-Log verhindert Duplikate
- Email-Template-System

---

## 🎨 Frontend Features

### 📱 Seiten & Routen

**Basis-Routen:**
- ✅ `/` - Homepage
- ✅ `/login` - Login-Seite
  - Passwort anzeigen/verbergen
  - "Passwort vergessen?" Link
- ✅ `/register` - Registrierung (redirectet zu `/login`)
- ✅ `/dashboard` - Host-Dashboard
  - Event-Übersicht
  - Quick Actions
  - FAQ-Link
- ✅ `/moderation` - Foto-Moderation
  - Warteschlange
  - Bulk-Operationen
  - Foto-Vorschau

**Event-Routen:**
- ✅ `/e/:slug` - Öffentliche Event-Seite (V1)
  - Galerie
  - Upload
  - Social Features
- ✅ `/e2/:slug` - Öffentliche Event-Seite (V2)
  - Modern UI
  - Galerie
  - Upload
  - Comments Support
- ✅ `/events/:id/dashboard` - Event-Dashboard (Host)
  - Event-Verwaltung
  - Statistiken
  - Gäste-Verwaltung
  - QR-Code-Generator
  - QR-Styler
- ✅ `/events/:id/qr-styler` - QR-Code-Styler
  - Template-Design
  - PDF-Export

**Live-Features:**
- ✅ `/live/:slug` - Live Wall
  - Echtzeit-Updates
  - WebSocket
- ✅ `/live/:slug/camera` - Camera Page
  - Foto aufnehmen
  - Upload

**Invitation-Routen:**
- ✅ `/i/:slug` - Invitation-Seite (V1)
- ✅ `/i2/:slug` - Invitation-Seite (V2)
  - RSVP
  - ICS Export
- ✅ `/s/:code` - Shortlink (V1)
- ✅ `/s2/:code` - Shortlink (V2)

**Admin-Routen:**
- ✅ `/admin/dashboard` - Admin-Dashboard
  - System-Status
  - User-Management
  - Event-Management

**Weitere Routen:**
- ✅ `/faq` - FAQ-Seite (CMS-basiert)
- ✅ `/version` - Version-Info

---

### 🧩 Frontend-Komponenten

**Upload:**
- ✅ `PhotoUpload` - Foto-Upload-Komponente
  - Drag & Drop
  - Mehrfach-Upload
  - Fortschrittsanzeige
  - API-Integration
- ✅ `UploadButton` - Upload-Button
  - Disabled-State mit Reason
  - Upload-Date-Window-Prüfung

**Galerie:**
- ✅ `ModernPhotoGrid` - Moderne Foto-Galerie
  - Lazy Loading
  - Lightbox
  - Downloads
  - Comments Support
- ✅ `PhotoModeration` - Foto-Moderation
  - Warteschlange
  - Bulk-Operationen

**UI:**
- ✅ `MaintenanceBanner` - Maintenance-Banner
- ✅ `ToastProvider` - Toast-Notifications

---

## 🔄 Geschäftslogiken

### 🔐 Authentifizierung & Autorisierung

**Logik:**
- JWT-basierte Authentifizierung
- httpOnly Cookies (secure in Production)
- WordPress SSO Integration
- Unicode/IDN Email Support
- Rollenbasierte Zugriffskontrolle (ADMIN, HOST)
- Event Access Cookies (12h TTL)
- Invite Token Support

---

### 📸 Upload-Logik

**Prüfungen:**
1. Event existiert und ist aktiv
2. Upload-Date-Window (±1 Tag um Event-Datum)
3. Storage-Lock-Prüfung (Storage-Ends-At)
4. Storage-Limit-Prüfung (Package-basiert)
5. Upload-Rate-Limiting (IP + Event)
6. File-Type-Validierung (MIME + Magic Bytes)
7. File-Size-Limit (10MB Photos, 100MB Videos, 20MB Audio)
8. Moderation-Required (Host/Admin: APPROVED, Gast: PENDING)

**Verarbeitung:**
1. Image Processing (Thumbnail, Optimierung)
2. Duplikat-Erkennung (MD5 + Perceptual Hash)
3. Gesichtserkennung (optional)
4. EXIF-Daten-Extraktion
5. Storage-Upload (SeaweedFS)
6. DB-Eintrag erstellen
7. WebSocket-Event senden

---

### 📦 Storage-Limit-Logik

**Berechnung:**
- Entitlement-basiert (WooCommerce)
- Package-Definition-Mapping (SKU)
- Tier-basierte Defaults (FREE, SMART, PREMIUM)
- Usage-Tracking (Photos, Videos, Guestbook, Design)

**Prüfung:**
- Strict Mode: Entitlement erforderlich
- Permissive Mode: Kein Limit = erlauben
- Upload-Limit-Prüfung vor Upload

---

### 📅 Storage-Policy-Logik

**Storage-Ends-At:**
- Basierend auf erstem Media-Upload
- Package-Duration oder Tier-Default
- FREE: 14 Tage
- SMART: 180 Tage
- PREMIUM: 365 Tage

**Storage-Lock:**
- Upload gesperrt nach Storage-Ends-At
- Grace Period: 6 Monate für Retention Purge

---

### 🎯 Moderation-Logik

**Status:**
- PENDING: Wartet auf Freigabe
- APPROVED: Freigegeben
- REJECTED: Abgelehnt
- DELETED: Gelöscht

**Logik:**
- Host/Admin: Direkt APPROVED
- Gast: PENDING (wenn moderationRequired)
- Email-Benachrichtigung (optional)
- WebSocket-Event

---

### 🔄 Duplikat-Erkennungs-Logik

**Hashes:**
- MD5: Exakte Duplikate
- Perceptual Hash: Ähnliche Bilder

**Bestes Foto:**
- Qualitäts-Score (Auflösung, Größe, Format, Schärfe)
- Engagement (Likes, Comments, Views)
- Zeit-Bonus (neuer = besser)

---

### 👤 Gesichtserkennungs-Logik

**Detection:**
- Face-api.js (TinyFaceDetector)
- TensorFlow.js Backend
- Canvas-basiert

**Storage:**
- Face Count
- Face Positions (x, y, width, height)
- Face Descriptors (128-dimensional)

**Search:**
- Cosine Similarity
- Min Similarity: 0.6
- Nur approved Fotos

---

### 📧 Email-Logik

**Templates:**
- INVITATION
- STORAGE_ENDS_REMINDER
- PHOTO_NOTIFICATION

**Rendering:**
- Variable-Substitution ({{variable}})
- HTML + Text Support
- Active Template aus DB

**Versand:**
- SMTP (Nodemailer)
- Reminder-System (30, 7, 1 Tag)

---

### 🎫 Invitation-Logik

**Erstellung:**
- Slug-basiert
- Access Token
- Shortlink-Generation

**RSVP:**
- ACCEPTED, DECLINED
- ICS Calendar Export

**Tracking:**
- View-Tracking (optional)
- RSVP-Tracking

---

## 🔄 Background Workers

### 🗑️ Retention Purge Worker

**Funktion:**
- Events nach Storage-Ends-At + 6 Monate löschen
- Hard Delete (wenn konfiguriert)
- Storage-Dateien löschen

**Konfiguration:**
- `RETENTION_PURGE_INTERVAL_MS` (default: 10min)
- `RETENTION_PURGE_BATCH_SIZE` (default: 200)
- `RETENTION_PURGE_HARD_DELETE` (default: false)

---

### 🦠 Virus Scan Worker

**Funktion:**
- Pending Scans verarbeiten
- Auto-Clean (wenn konfiguriert)
- Scan-Status aktualisieren

**Konfiguration:**
- `VIRUS_SCAN_AUTO_CLEAN` (global)
- Per-Event via featuresConfig

---

### 🧹 Orphan Cleanup Worker

**Funktion:**
- Verwaiste Dateien finden
- Storage-Dateien löschen
- DB-Einträge bereinigen

---

### 📧 Storage Reminder Worker

**Funktion:**
- Reminder 30, 7, 1 Tag vor Storage-End
- Email-Benachrichtigungen
- Reminder-Log (keine Duplikate)

**Konfiguration:**
- `STORAGE_REMINDER_ENABLED` (default: false)
- `STORAGE_REMINDER_INTERVAL_MS` (default: 1h)
- `STORAGE_REMINDER_BATCH_SIZE` (default: 200)

---

## 🛡️ Security Features

### 🔒 Rate Limiting

**Limiter:**
- API Limiter: 2000/15min (zu großzügig!)
- Auth Limiter: 200/15min
- Upload IP Limiter: 120/5min (konfigurierbar)
- Upload Event Limiter: 1000/5min (konfigurierbar)
- Video IP Limiter: 20/10min
- Video Event Limiter: 150/10min
- Password Limiter: 10/15min (zu hoch!)
- Admin Auth Limiter: 20/15min

**Logik:**
- IP-basiert
- Event-basiert (für Uploads)
- Skip in Development
- Skip für File-Requests

---

### 🧹 Input Sanitization

**Middleware:**
- `express-mongo-sanitize` - NoSQL Injection Protection
- Zod-Validierung - Schema-basierte Validierung
- File-Type-Validierung - Magic Bytes

---

### 🔐 Security Headers

**Helmet:**
- CSP (Content Security Policy)
  - ⚠️ unsafe-inline, unsafe-eval (unsicher!)
- XSS-Protection
- Cross-Origin-Embedder-Policy: false (für Socket.IO)

---

### 🔑 Authentifizierung

**JWT:**
- httpOnly Cookies
- Secure in Production
- SameSite: lax
- Konfigurierbare Expiration

**WordPress SSO:**
- REST API (Primary)
- PHP-Fallback
- Passwort-Verifikation

---

## 🔗 Integrationen

### 🛒 WooCommerce

**Webhooks:**
- Order Paid
- Signature-Verifikation
- Event-Entitlement-Erstellung
- Package-Definition-Mapping

**Logik:**
- SKU-basierte Package-Mapping
- Storage-Limit-Setzung
- Storage-Duration-Setzung

---

### 📝 WordPress

**CMS Sync:**
- REST API
- HTML-Fallback
- Snapshot-System

**Auth:**
- Passwort-Verifikation
- User-Synchronisation

---

### 📧 Email

**SMTP:**
- Nodemailer
- Template-System
- HTML + Text

---

### 💾 SeaweedFS

**Storage:**
- S3-kompatible API
- Presigned URLs
- File-Upload/Download

---

### 🔴 Redis

**Caching:**
- JSON-Serialization
- TTL Support
- Pattern-basiertes Löschen

---

## 📊 Zusammenfassung

### API Endpoints
- **Gesamt:** 100+ Endpoints
- **Kategorien:** 25+ Route-Dateien

### Services
- **Gesamt:** 15+ Services
- **Background Workers:** 4

### Frontend Features
- **Seiten:** 20+ Routen
- **Komponenten:** 50+ Komponenten

### Geschäftslogiken
- **Authentifizierung:** JWT + WordPress SSO
- **Upload:** 8 Prüfungen + Verarbeitung
- **Storage:** Entitlement-basiert
- **Moderation:** Status-basiert
- **Duplikat-Erkennung:** MD5 + Perceptual Hash
- **Gesichtserkennung:** Face-api.js
- **Email:** Template-System

---

**Ende der Übersicht**


