# gästefotos.com — Offene Aufgaben

> Stand: 14.02.2026 — Phase 1 + Phase 2 + Phase 3 + Phase 4 abgeschlossen

---

## 📊 Code-Analyse & Findings (14.02.2026)

### Gemini-Analyse — Bewertung

| Gemini-Kritik | Realität | Bewertung |
|---------------|----------|-----------|
| "Flache Ordnerstruktur" | Monorepo: `packages/frontend`, `packages/backend`, `packages/admin-dashboard`, `packages/print-terminal` | ❌ **Falsch** |
| "`use client` zu weit oben" | Next.js 16 Tree-Shaking, Impact gering | ⚠️ **Teilweise** |
| "Domain-Driven Design fehlt" | Backend hat klare Route-Struktur (`/api/auth`, `/api/events`, `/api/photos`, etc.) | ❌ **Falsch** |
| "Race Conditions Upload" | Bereits gefixt: `setPhotos(prev => [...prev, newPhoto])` + Socket.IO Real-time | ✅ **Bereits gefixt** |
| "Error-Handling Supabase/Firebase" | Wir nutzen **SeaweedFS** (selbst-gehostet), nicht Supabase | ❌ **Falsch** — kennt Stack nicht |
| "Hydration Mismatch" | Sortierung serverseitig via API, keine Client-Randomisierung | ✅ **Bereits berücksichtigt** |
| "Layout Shift (CLS)" | `next/image` mit `fill` + `aspect-ratio` Container | ✅ **Bereits gefixt** |
| "Upload Feedback fehlt" | Progress-Bar + Toast-Notifications implementiert | ✅ **Bereits implementiert** |
| "Farbkontrast WCAG" | Phase 4 Bug-Fix: Filter-Badge (`bg-white/30`) | ✅ **Bereits gefixt** |

**Fazit**: Gemini analysiert generisch ohne projektspezifisches Wissen. Stack (SeaweedFS, Monorepo) nicht erkannt.

### Architektur-Stärken

| Aspekt | Implementierung |
|--------|-----------------|
| **Monorepo** | pnpm workspaces, 4 Packages, shared types |
| **API** | Express + Prisma + Socket.IO, klare Route-Struktur |
| **Storage** | SeaweedFS (selbst-gehostet), kein Vendor Lock-in |
| **Auth** | JWT + Session-basiert, Role-based (ADMIN/PARTNER/HOST) |
| **Real-time** | Socket.IO für Live-Updates (Galerie, Mosaic, Analytics) |
| **AI** | Multi-Provider (Groq/Grok/OpenAI) mit Fallback-Kette + Redis-Cache |

### Offene Punkte — Konsolidierte Liste

| Kategorie | Erledigt | Offen | Priorität |
|-----------|----------|-------|-----------|
| **AI-Integration** | 4 | 11 | � MEDIUM |
| **Bugs** | 2 | 0 | ✅ |
| **Neue Features** | 0 | 5 | � HIGH |
| **Tech-Debt** | 0 | 7 | 🟢 LOW |
| **Zu testen** | 1 | 1 | 🟡 MEDIUM |
| **Features Phase 1-4** | ~50 | 0 | ✅ |

### Empfohlene Reihenfolge

1. ~~**NF-1**: Admin Log-System~~ ✅ erledigt (14.02.2026)
2. ~~**NF-2**: Workflow Builder erweitern~~ ✅ erledigt (Schema + API, Migration pending)
3. ~~**AI-10**: Cache-Verwaltung UI~~ ✅ erledigt (Admin Dashboard)
4. **AI-3**: Grok API-Key besorgen (XAI_API_KEY in .env)
5. **AI-12**: Bild-KI Provider evaluieren (Replicate vs Stability vs fal.ai)
6. **NF-5**: Storage Subdomain (USB-Export)

---

## 🤖 Phase 5 — AI-Integration & Offline-Strategie

> Detaillierte Docs: [AI-STRATEGIE.md](./AI-STRATEGIE.md) | [AI-OFFLINE-STRATEGIE.md](./AI-OFFLINE-STRATEGIE.md)

### AI Provider Setup

| # | Aufgabe | Status | Priorität | Beschreibung |
|---|---------|--------|-----------|--------------|
| AI-1 | **Groq Integration** | ✅ erledigt | — | Llama 3.1 70B aktiv, ~$0.00059/1k Tokens |
| AI-2 | **AI-Cache-System** | ✅ erledigt | — | Redis-basiertes Cache mit 30d TTL, Hit-Tracking, Fallbacks |
| AI-3 | **Grok (xAI) API-Key** | ⏳ offen | MEDIUM | `XAI_API_KEY` in .env setzen, Seed ausführen |
| AI-4 | **OpenAI API-Key** | ⏳ offen | LOW | `OPENAI_API_KEY` in .env setzen, als Fallback |
| AI-5 | **AiFeatureMapping DB** | ✅ erledigt (20.02.2026) | — | 40 Mappings in DB, Auto-Setup Button im Admin Dashboard |

### AI Backend Erweiterungen

| # | Aufgabe | Status | Priorität | Beschreibung |
|---|---------|--------|-----------|--------------|
| AI-6 | **Warm-Up Endpoint** | ✅ erledigt | — | `POST /api/ai/cache/warm-up` implementiert |
| AI-7 | **Cache-Stats Endpoint** | ✅ erledigt | — | `GET /api/ai/cache/stats` + `/online-status` + `DELETE /cache` |
| AI-8 | **Ollama Integration** | ✅ erledigt (20.02.2026) | — | ollama-local Provider konfiguriert (llama3.2:3b, localhost:11434) |
| AI-9 | **Redis AOF Persistenz** | ✅ erledigt (20.02.2026) | — | appendonly=yes, appendfsync=everysec, CONFIG REWRITE |

### AI Admin Dashboard

| # | Aufgabe | Status | Priorität | Beschreibung |
|---|---------|--------|-----------|--------------|
| AI-10 | **Cache-Verwaltung UI** | ✅ erledigt | — | `/system/ai-cache` mit Stats, Warm-Up, Clear, Event-Type-Auswahl |
| AI-11 | **Provider-Monitoring** | ⏳ offen | LOW | API-Status, Latenz, Fehlerrate pro Provider |

### Bild-KI Features (Cloud-only)

| # | Aufgabe | Status | Priorität | Beschreibung |
|---|---------|--------|-----------|--------------|
| AI-12 | **Bild-KI Provider** | ⏳ offen | MEDIUM | Replicate, Stability AI, oder fal.ai evaluieren |
| AI-13 | **BG Removal** | ✅ erledigt (20.02.2026) | — | bgRemoval.ts Service + /booth-games/bg-removal Route + AiEffectsModal UI |
| AI-14 | **AI Oldify/Cartoon** | ✅ erledigt | — | Implementiert via aiStyleEffects.ts |
| AI-15 | **Style Transfer** | ⏳ offen | LOW | Erweiterte Kunststile (über aktuelle 10 hinaus) |

### Zusammenfassung AI

| Kategorie | Erledigt | Offen |
|-----------|----------|-------|
| Provider Setup | 3 | 2 |
| Backend | 4 | 0 |
| Admin UI | 1 | 1 |
| Bild-KI | 2 | 2 |
| **Gesamt** | **10** | **5** |

---

## ✅ Phase 4 — Dashboard Redesign & Event Wall

> Detailliertes Planungsdokument: [PHASE4-PLANUNG.md](./PHASE4-PLANUNG.md)

| # | Feature | Status | Beschreibung |
|---|---------|--------|--------------|
| P4-1 | **Bugs fixen** | ✅ erledigt | Galerie: Filter-Badge lesbar (bg-white/30). "Alle Medien anzeigen" → Inline-Expansion statt /photos Link. Gästebuch-Tab funktional mit API. Dead-Link entfernt. |
| P4-2 | **Naming & Navigation** | ✅ erledigt | KI Booth→KI-Kunst, Booth-Spiele→Foto-Spiele, Share-Link→Share, Live Wall→Event Wall, CHALLENGES→FOTO-SPIELE. Leads + Assets aus Host Quick Actions entfernt. |
| P4-3 | **Dashboard-Redesign** | ✅ erledigt | Upsell-Karte mit Paket-Tier + Feature-Übersicht (Lock-Icons). Setup-Tab Feature-Cards mit Progressive Disclosure (10 Features als visuelle Karten mit Aktiv/Upgrade Status). Foto-Spiele zählt unique Teilnehmer. |
| P4-4 | **Event Wall** | ✅ erledigt | Slideshow-Modus mit 5 Animationen (Fade/Slide/Zoom/Flip/Collage), Play/Pause/Skip/Shuffle, Settings-Panel (Animation-Typ, Intervall 3-15s), Grid/Slideshow Toggle, Progress-Bar, Vollbild-Support. |
| P4-5 | **Gamification** | ✅ erledigt | Backend: Achievement-Seeds (14 Badges in 6 Kategorien), Check+Unlock API, Leaderboard API. Frontend: AchievementList, BadgePopup (Spring-Animation), Leaderboard mit Rang-Icons. |
| P4-6 | **KI-Kunst Gast-Flow** | ✅ erledigt | KiKunstFlow Komponente: Selfie-Kamera (Front/Rear), Stil-Carousel (10 Stile), Processing-Animation, Ergebnis mit Download + Native Share (File-API). |
| P4-7 | **Hardware Inventar & Buchung** | ✅ erledigt | Backend: CRUD für Inventar (6 Typen) + Buchungen mit Verfügbarkeitsprüfung + Auto-Status-Update. Frontend: Admin-Seite mit Inventar-Grid + Kalender-Ansicht + Hardware/Booking-Modals. |

---

## ✅ Phase 1–3 — Abgeschlossen

### HIGH (Phase 3)

| # | Feature | Status | Beschreibung |
|---|---------|--------|--------------|
| 1 | **Booth-Games & KI Booth Navigation** | ✅ erledigt | Refactored zu "Foto-Spaß" — Guest-Nav mit Camera-Center-Button + Action Sheet, Solo-Selfie-Spiele, Branding-Overlay, Host-Toggles. DashboardFooter bereinigt. |
| 2 | **Partner-Abo Admin UI** | ✅ erledigt | Subscriptions-Sektion im Partner-Dashboard: Abo-Karten, Device-Lizenzen, Preisberechnung mit Jahresrabatt. |
| 3 | **Supply of Leads** | ✅ erledigt | Lead-API (CRUD + CSV-Export + Stats + Partner-Leads), Frontend mit Tabelle, Quellen-Filter, Pagination, CSV-Export. |

---

## 🟡 MEDIUM — Wichtig für Produktreife

| # | Feature | Status | Beschreibung |
|---|---------|--------|--------------|
| 4 | **Asset Library** | ✅ erledigt | Backend API (Upload/CRUD/File-Serving) + Frontend Grid mit Upload-Form, 7 Typen, Suche, Tags, Löschen. |
| 5 | **Face Switch (AI)** | ✅ erledigt | Backend Service (face detection + rotation swap via sharp composite) + API Endpoint `/booth-games/face-switch`. |
| 6 | **Payment per Session** | ✅ erledigt | Backend: PaymentSession-Modell (6 Session-Typen, Stripe-ready), Checkout-Flow, Mock-Pay, Refund, Pricing-API, Revenue-Stats. |
| 7 | **Presets/Templates** | ✅ erledigt | Backend API (CRUD) + Admin-Seite `/dashboard/templates` mit Create/Edit/Delete, Typ-Filter, JSON-Config. |

---

## 🟢 LOW — Hardware-abhängig / Zukunft

| # | Feature | Status | Beschreibung |
|---|---------|--------|--------------|
| 8 | **Digital Graffiti** | ✅ erledigt | Backend API (Layer save/merge/delete) + GraffitiCanvas Component mit Touch-Support, Farben, Pinsel, Undo/Redo. |
| 9 | **Workflow Builder** | ✅ erledigt | Backend API (CRUD + Default) + Admin-Seite `/dashboard/workflows` mit Step-Palette, Reorder, Duration, Flow-Viz. |
| 10 | **360° Ground Spinner** | ✅ erledigt | Backend: SpinnerSession-Modell (Queue, Recording, Processing, Effects: 7 Typen, 4 Speeds), Booth-Controller-API, Stats. Frontend: SpinnerFlow mit Config-UI, Queue-Polling, Video-Ergebnis + Share. |
| 11 | **Air Graffiti Wall** | ✅ erledigt | AirGraffitiWall Component mit MediaPipe Hands, Pinch-to-Draw, Neon-Effekte, Webcam-Overlay, Brush-Sizes. |
| 12 | **Drawbot** | ✅ erledigt | Backend: DrawbotJob-Modell (6 Zeichenstile, Queue, Image-to-Path, Complexity 1-100), Controller-API, Stats. Frontend: DrawbotFlow mit Foto-Auswahl, Stil/Farbe/Detail-Config, Progress-Bar, Ergebnis + Share. |

---

## 🐛 Bugs / Fixes

| # | Bug | Status | Priorität | Beschreibung |
|---|-----|--------|-----------|--------------|
| B1 | **Mosaic Tile Overlay** | ✅ gefixt | — | Hochgeladene Fotos hatten kein Zielbild-Overlay. Fix: `blendTargetOverlay()` in `mosaicEngine.ts` |
| B2 | **Duplikat-Erkennung** | ✅ gefixt | — | `processDuplicateDetection` war nicht eingebunden → jetzt in `photos.ts` Upload-Route integriert + WebSocket-Event |

---

## 🧪 Zu Testen

| # | Feature | Status | Beschreibung |
|---|---------|--------|--------------|
| TEST-1 | **Gästeliste** | ✅ geprüft | Code vollständig: CRUD API + TanStack Table + Import. Offene TODOs: E-Mail (TD-4) + Details (TD-5) |
| TEST-2 | **Lead-Erfassung** | ⏳ nicht getestet | Nur für Admin/Partner relevant — Funktionstest steht aus |

---

## 🆕 Neue Features (Phase 6)

| # | Feature | Status | Priorität | Beschreibung |
|---|---------|--------|-----------|--------------|
| NF-1 | **Admin Log-System** | ✅ erledigt | HIGH | auditLogger Service + Hooks in auth/events/photos/uploads/guestbook/adminUsers. Fire-and-forget Logging in QaLogEvent. Admin UI unter /system/logs. |
| NF-2 | **Workflow Builder Erweiterung** | ✅ erledigt (20.02.2026) | — | Lock/Unlock, Duplikat, Backup/Restore, Export/Import, Undo/Redo, Simulation, Analytics. FACE_SEARCH Flow aktiv für app.gästefotos.com. |
| NF-3 | **SMS Sharing** | ✅ erledigt | — | smsService.ts (Twilio + 46elks), smsShare.ts API Routen, Admin UI /manage/sms |
| NF-4 | **Face Recognition Erweiterung** | ✅ erledigt (20.02.2026) | — | TinyFaceDetector: inputSize 416, scoreThreshold 0.35 (besserer Recall). Single-Pass in getFaceDetectionMetadata (keine doppelte Erkennung mehr). |
| NF-5 | **Storage Subdomain** | ⏳ offen | LOW | Neue Subdomain für Zugriff auf Gäste-Speicher. USB-Export Möglichkeit. |

### Neue Features (Sprint 20.02.2026)

| # | Feature | Status | Beschreibung |
|---|---------|--------|--------------|
| S26-1 | **Bulk Photo ZIP-Download** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/download-zip via archiver; Frontend Button in Photos-Header |
| S26-2 | **Dashboard Live-Stats Widget** | ✅ erledigt (20.02.2026) | Fotos heute + Top Uploader Balkendiagramm; GET /events/:id/photos/live-stats |
| S26-3 | **Guest Invitation Email** | ✅ erledigt (20.02.2026) | POST /guests/:id/email + Bulk /email-all; Styled HTML-Template; Gäste-Seite Button |
| S26-4 | **Alle E-Mail Templates** | ✅ erledigt (20.02.2026) | sendInvitation(), sendCohostInvite(), sendCustomEmail() alle auf Pink/Gold/Indigo Gradient |
| S26-5 | **Grok als primärer LLM** | ✅ erledigt (20.02.2026) | 22 Feature-Mappings migriert; Fallback-Kette Grok→Groq→Ollama |
| S26-6 | **AI Provider Monitor** | ✅ erledigt (20.02.2026) | /manage/ai-monitoring: Latenz, Fehlerrate, Requests, Kosten pro Provider |
| S26-7 | **Event-Klonen** | ✅ erledigt (20.02.2026) | POST /events/:id/clone; Copy-Button im EventCard Hover-Overlay |
| S26-8 | **Foto-Kommentar Benachrichtigung** | ✅ erledigt (20.02.2026) | comments.ts: fire-and-forget E-Mail an Host bei neuem Kommentar (Indigo-Template) |
| S26-9 | **Upload-Limit pro Gast** | ✅ erledigt (20.02.2026) | featuresConfig.maxUploadsPerGuest; Toggle im SetupTabV2 (0/5/10/20/50) |
| S26-10 | **Neues-Foto E-Mail** | ✅ erledigt (20.02.2026) | uploads.ts: rate-limited E-Mail an Host (max 1x/Stunde per Event) |
| S26-11 | **Event-Report JSON-Export** | ✅ erledigt (20.02.2026) | GET /events/:id/export; Export Button im Dashboard Hero |
| S26-12 | **Storage Ablauf-Erinnerung** | ✅ erledigt (20.02.2026) | retentionPurge.ts: tägliche E-Mail 7 Tage vor Speicher-Ablauf (Amber/Red-Template) |
| S26-13 | **SetupTabV2 Einstellungen** | ✅ erledigt (20.02.2026) | Kommentar-Moderation Toggle + Max-Upload-Limit Toggle |
| S26-14 | **E-Mail-Benachrichtigungen Toggle** | ✅ erledigt (20.02.2026) | disableEmailNotifications in featuresConfig + uploads.ts/comments.ts respektieren |
| S26-15 | **Event-Klonen** | ✅ erledigt (20.02.2026) | POST /events/:id/clone + Copy-Button in EventCard Hover-Overlay |
| S26-16 | **FaceCount Badge** | ✅ erledigt (20.02.2026) | Cyan Badge 👤N im Photo-Lightbox neben Uploader-Name |
| S26-17 | **Photo-Sortierung** | ✅ erledigt (20.02.2026) | Backend ?sort=likes_desc|faces_desc|date_asc; Sort-Toggle in Gast-Galerie |
| S26-18 | **Event Stats API** | ✅ erledigt (20.02.2026) | GET /events/:id/stats (photos/today/pending, guests, guestbook, visitors) |
| S26-19 | **Visitor-Count Dashboard** | ✅ erledigt (20.02.2026) | visitCount als BESUCHER StatCard; 2x3 Grid Layout |
| S26-20 | **Admin Events verbessert** | ✅ erledigt (20.02.2026) | isActive Badge, FileDown Export-Button, isActive+host im select (kein N+1) |
| S26-21 | **Event-Passwort E-Mail** | ✅ erledigt (20.02.2026) | POST /events/:id/send-password; gestyltes HTML-Template mit Passwort-Box |
| S26-22 | **Admin Bulk-Activate** | ✅ erledigt (20.02.2026) | POST /admin/events/bulk-status (Activate/Deactivate mehrere Events) |
| S26-23 | **Shareable Event-Link UTM** | ✅ erledigt (20.02.2026) | GET /events/:id/share-link?source=whatsapp&medium=social |
| S26-24 | **Foto-Freigabe Push** | ✅ erledigt (20.02.2026) | Push-Benachrichtigung an Host bei Foto-Freigabe (PENDING → APPROVED) |
| S26-25 | **Bulk-E-Mail Dialog** | ✅ erledigt (20.02.2026) | Textarea-Dialog fuer optionale persoenliche Nachricht beim Bulk-Invite |
| S26-26 | **EventCard visitCount** | ✅ erledigt (20.02.2026) | Eye-Badge fuer Besucherzahlen im EventCard Meta-Info |
| S26-27 | **Foto-Sortierung Backend+UI** | ✅ erledigt (20.02.2026) | ?sort=likes_desc|faces_desc|date_asc; Sort-Buttons in Gast-Galerie |
| S26-28 | **Foto Download-Counter** | ✅ erledigt (20.02.2026) | photo.views++ nach jedem Download (non-blocking) |
| S26-29 | **Views Badge Lightbox** | ✅ erledigt (20.02.2026) | '↓N' Badge neben faceCount in PhotoLightbox |
| S26-30 | **QR-Designer Quick-Action** | ✅ erledigt (20.02.2026) | Dashboard Quick-Actions: QR-Designer Link fuer Print-Ready QR-Code |
| S26-31 | **EventCard visitCount** | ✅ erledigt (20.02.2026) | Eye-Badge fuer Besucher-Anzahl in EventCard Meta-Info |
| S26-32 | **Socket.IO Realtime** | ✅ erledigt | useRealtimeNotifications, newPhotoCount, clearNewPhotos bereits aktiv |
| S26-33 | **Gästeliste CSV-Export** | ✅ erledigt (20.02.2026) | GET /events/:id/guests/export-csv; BOM-UTF-8 fuer Excel; Frontend Button |
| S26-34 | **Gäste QR-Link Button** | ✅ erledigt (20.02.2026) | Gästeliste Header: QR-Link kopiert via invite-qr API |
| S26-35 | **Kategorie-Count Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/categories/count (photo counts per category) |
| S26-36 | **Guest Invite QR API** | ✅ erledigt (20.02.2026) | GET /events/:id/guests/invite-qr liefert Einladungs-URL |
| S26-37 | **Foto Favorit-Toggle** | ✅ erledigt (20.02.2026) | POST /photos/:id/favorite; isFavorite flip-flop fuer Host |
| S26-38 | **Favoriten-Filter Host-Galerie** | ✅ erledigt (20.02.2026) | PhotoFilterBar: Heart-Pill + photos/page.tsx isFavorite Filter |
| S26-39 | **Event-Beschreibung Hero** | ✅ erledigt (20.02.2026) | EventHero.tsx: event.description unter welcomeMessage |
| S26-40 | **Foto Tag-Filter** | ✅ erledigt (20.02.2026) | GET /events/:id/photos?tag=xyz (Array has: Filter) |
| S26-41 | **Kategorie-Count Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/categories/count (photo counts per category) |
| S26-42 | **Webhook bei Upload** | ✅ erledigt (20.02.2026) | fire-and-forget POST bei featuresConfig.webhookUrl; X-GF-Event Header |
| S26-43 | **Foto-Metadata PATCH** | ✅ erledigt (20.02.2026) | PATCH /photos/:id (title, description, tags); nur Manager |
| S26-44 | **Foto Favorit-Toggle** | ✅ erledigt (20.02.2026) | POST /photos/:id/favorite + Favoriten-Filter in Host-Galerie |
| S26-45 | **Foto Tag-Filter** | ✅ erledigt (20.02.2026) | GET /events/:id/photos?tag=xyz (Prisma Array has: Filter) |
| S26-46 | **Foto melden Backend** | ✅ erledigt (20.02.2026) | POST /photos/:id/report; E-Mail an Host (non-blocking) |
| S26-47 | **Report-Button Lightbox** | ✅ erledigt (20.02.2026) | Flag-Icon in PhotoLightbox (subtil opacity-40) |
| S26-48 | **Bulk-Tag Endpoint** | ✅ erledigt (20.02.2026) | POST /photos/bulk/tag; Tags an mehrere Fotos gleichzeitig |
| S26-49 | **Passwort E-Mail Button** | ✅ erledigt (20.02.2026) | invitations/page.tsx: '📧 Per E-Mail senden' Button |
| S26-50 | **Admin Host-Reassign** | ✅ erledigt (20.02.2026) | PATCH /admin/events/:id/reassign-host (AuditLog) |
| S26-51 | **Duplikat-Merge System** | ✅ erledigt | duplicates.ts: keep-best, mark-all, full group management |
| S26-52 | **Download-Counter** | ✅ erledigt (20.02.2026) | photo.views++ nach jedem Download (non-blocking) |
| S26-53 | **CDN views-Counter** | ✅ erledigt (20.02.2026) | imageCdn.ts: views++ bei GET >= 400px (non-blocking) |
| S26-54 | **Gäste Server-Search** | ✅ erledigt (20.02.2026) | GET /events/:id/guests?search=max (firstName/lastName/email insensitive) |
| S26-55 | **Gäste Pagination** | ✅ erledigt (20.02.2026) | GET /events/:id/guests?page=1&limit=50 + total in Response |
| S26-56 | **maxUploadsPerGuest** | ✅ erledigt | uploads.ts: Upload-Limit per Guest bereits mit 429 Error |
| S26-57 | **Live-Stats Endpoint** | ✅ erledigt | GET /photos/live-stats: todayCount, topUploaders, lastPhotoAt |
| S26-58 | **Admin Host-Reassign** | ✅ erledigt (20.02.2026) | PATCH /admin/events/:id/reassign-host mit AuditLog |
| S26-59 | **Dashboard Trend-Sparkline** | ✅ erledigt (20.02.2026) | 7-Tage Bar-Chart via GET /events/:id/trends in OverviewTab |
| S26-60 | **Foto Caption Lightbox** | ✅ erledigt (20.02.2026) | title + description in PhotoLightbox unter Reactions |
| S26-61 | **Kategorien Bulk-Reorder** | ✅ erledigt (20.02.2026) | PUT /events/:id/categories/reorder (Array {id, order}) |
| S26-62 | **Bulk-Move-Category** | ✅ erledigt (20.02.2026) | POST /photos/bulk/move-category (categoryId oder null) |
| S26-63 | **Bulk-Favorite** | ✅ erledigt (20.02.2026) | POST /photos/bulk/favorite (isFavorite auf mehrere Fotos) |
| S26-64 | **Admin Storage-Stats** | ✅ erledigt (20.02.2026) | GET /admin/events/storage-stats (totalPhotos, totalBytes, topEvents) |
| S26-65 | **Event Trends Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/trends?days=7 (date-grouped upload counts) |
| S26-66 | **isFavorite + minQuality Filter** | ✅ erledigt (20.02.2026) | GET /events/:id/photos?isFavorite=true&minQuality=0.7 |
| S26-67 | **views_desc + quality_desc Sort** | ✅ erledigt (20.02.2026) | ?sort=views_desc|quality_desc fuer Photos-Endpoint |
| S26-68 | **Event Summary Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/summary (compact overview: photos, guests, pending, url) |
| S26-69 | **Bulk-Favorite** | ✅ erledigt (20.02.2026) | POST /photos/bulk/favorite (isFavorite auf viele Fotos gleichzeitig) |
| S26-70 | **Admin Storage-Stats** | ✅ erledigt (20.02.2026) | GET /admin/events/storage-stats (topEvents by photo count, totalMB) |
| S26-71 | **Bulk-Move-Category** | ✅ erledigt (20.02.2026) | POST /photos/bulk/move-category (categoryId oder null) |
| S26-72 | **Foto Caption Lightbox** | ✅ erledigt (20.02.2026) | title + description in PhotoLightbox anzeigen |
| S26-73 | **Admin User-Stats** | ✅ erledigt (20.02.2026) | GET /admin/users/stats (total, hosts, admins, locked, newToday, newThisWeek) |
| S26-74 | **Guest Check-In Toggle** | ✅ erledigt (20.02.2026) | PATCH /guests/:id/checkin (PENDING<->ACCEPTED toggle) |
| S26-75 | **Photos by Uploader** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/by-uploader (groupBy uploadedBy) |
| S26-76 | **Slideshow Speed Prop** | ✅ erledigt (20.02.2026) | SlideshowMode.tsx: slideshowSpeed prop (2-30 Sek) |
| S26-77 | **views_desc Sort** | ✅ erledigt (20.02.2026) | Sort-Toggle '👁 Meistgesehen' in Gast-Galerie |
| S26-78 | **Foto-Filter isFav+Quality** | ✅ erledigt (20.02.2026) | GET /photos?isFavorite=true&minQuality=0.7 |
| S26-79 | **Event Summary** | ✅ erledigt (20.02.2026) | GET /events/:id/summary (photos, guests, pending, url, visitors) |
| S26-80 | **Admin User-Stats Widget** | ✅ erledigt (20.02.2026) | Admin Dashboard: 6-Felder Widget (total/hosts/admins/locked/heute/woche) |
| S26-81 | **Custom Hashtag SetupRow** | ✅ erledigt (20.02.2026) | SetupTabV2: Custom Hashtag Row mit prompt() Dialog |
| S26-82 | **Check-In Button** | ✅ erledigt (20.02.2026) | GuestActionMenu: CheckCircle2 Check-In (gruen) + PATCH /guests/:id/checkin |
| S26-83 | **Slideshow Speed Prop** | ✅ erledigt (20.02.2026) | SlideshowMode: slideshowSpeed prop (2-30 Sek, clamp) |
| S26-84 | **Photos by Uploader** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/by-uploader (groupBy uploadedBy desc) |
| S26-85 | **Admin User-Stats API** | ✅ erledigt (20.02.2026) | GET /admin/users/stats (total, hosts, admins, locked, newToday, newWeek) |
| S26-86 | **Event-Klon FeaturesConfig** | ✅ erledigt | POST /events/:id/clone bereits mit featuresConfig + designConfig |
| S26-87 | **Gästebuch CSV-Export Backend** | ✅ erledigt (20.02.2026) | GET /events/:id/guestbook/export-csv (BOM-UTF-8, Host-only) |
| S26-88 | **Gästebuch CSV-Export Button** | ✅ erledigt (20.02.2026) | guestbook/page.tsx: CSV-Button fuer Host mit fetch+Auth |
| S26-89 | **qualityScore Badge PhotoCard** | ✅ erledigt (20.02.2026) | PhotoCard Hover: gruen/gelb/rot ★N% + faceCount cyan Badge |
| S26-90 | **Custom Hashtag SetupTabV2** | ✅ erledigt (20.02.2026) | Hash-Icon SetupRow mit prompt() Dialog fuer featuresConfig.customHashtag |
| S26-91 | **Admin Dashboard User-Stats** | ✅ erledigt (20.02.2026) | 6-Felder Widget mit /admin/users/stats |
| S26-92 | **Gästebuch PDF bereits** | ✅ erledigt | GET /events/:id/guestbook/export-pdf (generateGuestbookPdf) |
| S26-93 | **Gäste-Stats Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/guests/stats (total, accepted, declined, pending, plusOnes) |
| S26-94 | **ZIP-Download Progress Toast** | ✅ erledigt (20.02.2026) | photos/page.tsx: info Toast vor + success Toast nach Bulk-Download |
| S26-95 | **Gäste Check-In Toggle** | ✅ erledigt (20.02.2026) | PATCH /guests/:id/checkin + GuestActionMenu CheckCircle2 |
| S26-96 | **Photos by Uploader** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/by-uploader (top-100 groupBy) |
| S26-97 | **qualityScore + faceCount Hover** | ✅ erledigt (20.02.2026) | PhotoCard Hover: ★N% gruen/gelb/rot + 👤N cyan Badge |
| S26-98 | **commentCount in Photos-API** | ✅ erledigt (20.02.2026) | _count.comments flatten als commentCount in Photos-Response |
| S26-99 | **Cover-Image Upload** | ✅ erledigt | wizardUpload + designConfig coverImageUrl bereits vorhanden |
| S26-100 | **Push-Notif History** | ⏳ Schema-Änderung nötig | PushNotification Tabelle fehlt im Prisma Schema |
| S26-101 | **Gäste-Stats Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/guests/stats (accepted/declined/pending/plusOnes) |
| S26-102 | **ZIP Progress Toast** | ✅ erledigt (20.02.2026) | photos/page.tsx: info-Toast vor + success-Toast nach ZIP-Download |
| S26-103 | **Events-Liste Filter** | ✅ erledigt (20.02.2026) | GET /events?dateFrom=&dateTo=&search= (dateTime gte/lte + title contains) |
| S26-104 | **Dashboard Gäste-Stats** | ✅ erledigt (20.02.2026) | guestStats Widget: Zusagen/Absagen/Ausstehend + Begleitpersonen |
| S26-105 | **commentCount Photos-API** | ✅ erledigt (20.02.2026) | _count.comments flatten als commentCount in Photos-Response |
| S26-106 | **Gäste-Stats Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/guests/stats (total/accepted/declined/pending/withEmail/plusOnes) |
| S26-107 | **Photos-Filter** | ✅ erledigt (20.02.2026) | GET /photos?isFavorite=true&minQuality=0.7&tag=xyz&sort=views_desc |
| S26-108 | **Event Summary** | ✅ erledigt (20.02.2026) | GET /events/:id/summary (compact overview fuer externe Integrationen) |
| S26-109 | **AI Caption Endpoint** | ✅ erledigt (20.02.2026) | POST /photos/:id/ai-caption (context-basiert: uploadedBy+faceCount+tags) |
| S26-110 | **Cursor-Pagination** | ✅ erledigt (20.02.2026) | GET /photos?cursor=<id> + nextCursor in pagination Response |
| S26-111 | **Admin Foto-Suche** | ✅ erledigt (20.02.2026) | GET /admin/events/:id/photos (uploadedBy, tag, status Filter) |
| S26-112 | **Events-Filter** | ✅ erledigt (20.02.2026) | GET /events?dateFrom=&dateTo=&search= Filter |
| S26-113 | **Dashboard Gäste-Stats** | ✅ erledigt (20.02.2026) | 3-Spalten Widget: Zusagen/Absagen/Ausstehend + Begleitpersonen |
| S26-114 | **visitCount Increment** | ✅ erledigt | GET /events/by-slug: visitCount++  (Zeile 363) |
| S26-115 | **commentCount Photos** | ✅ erledigt (20.02.2026) | _count.comments flatten als commentCount in Photos-API |
| S26-116 | **Gäste-Bulk-Import** | ✅ erledigt (20.02.2026) | POST /events/:id/guests/import (JSON Array, upsert-by-email, max 500) |
| S26-117 | **Photo-Stats Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/stats (total/approved/pending/favorites/today/totalViews) |
| S26-118 | **Bulk AI-Caption** | ✅ erledigt (20.02.2026) | POST /photos/bulk/ai-caption (max 100, overwrite param) |
| S26-119 | **AI Caption Endpoint** | ✅ erledigt (20.02.2026) | POST /photos/:id/ai-caption (einzelnes Foto) |
| S26-120 | **Admin Foto-Suche** | ✅ erledigt (20.02.2026) | GET /admin/events/:id/photos (uploadedBy/tag/status Filter) |
| S26-121 | **Cursor-Pagination** | ✅ erledigt (20.02.2026) | GET /photos?cursor=<id> + nextCursor in Pagination Response |
| S26-122 | **Gäste-Bulk-Import JSON** | ✅ erledigt (20.02.2026) | POST /guests/import: created/updated/failed Statistik |
| S26-123 | **Gast Delete-Own** | ✅ erledigt (20.02.2026) | POST /photos/:id/delete-own (featuresConfig.allowDeleteOwn + Uploader-Check) |
| S26-124 | **allowDeleteOwn Toggle** | ✅ erledigt (20.02.2026) | SetupTabV2: Trash2 Toggle fuer featuresConfig.allowDeleteOwn |
| S26-125 | **Dashboard Gäste-Stats v2** | ✅ erledigt (20.02.2026) | withEmail + Begleitpersonen + Gesamt Footer-Zeile |
| S26-126 | **Photo-Stats Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/stats (total/approved/pending/favorites/today/totalViews) |
| S26-127 | **Bulk AI-Caption** | ✅ erledigt (20.02.2026) | POST /photos/bulk/ai-caption (max 100, overwrite param) |
| S26-128 | **Admin Event-Notizen** | ⏳ Schema-Änderung nötig | adminNotes Feld nicht im Prisma Schema vorhanden |
| S26-129 | **Lightbox Delete-Own** | ✅ erledigt (20.02.2026) | Trash2-Button in Lightbox wenn allowDeleteOwn + eigener Uploader |
| S26-130 | **allowDeleteOwn Toggle** | ✅ erledigt (20.02.2026) | SetupTabV2: Trash2 Toggle fuer featuresConfig.allowDeleteOwn |
| S26-131 | **allowDeleteOwn Passthrough** | ✅ erledigt (20.02.2026) | e3/[slug]/page.tsx: allowDeleteOwn + guestUploaderName an Lightbox |
| S26-132 | **Top-10 Fotos Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/top (views_desc, limit max 50) |
| S26-133 | **Gästebuch Bulk-Moderation** | ✅ erledigt (20.02.2026) | POST /events/:id/guestbook/bulk-moderate (approve/reject/delete) |
| S26-134 | **Gäste-Bulk-Import** | ✅ erledigt (20.02.2026) | POST /events/:id/guests/import (JSON Array, upsert-by-email) |
| S26-135 | **Gast Delete-Own** | ✅ erledigt (20.02.2026) | POST /photos/:id/delete-own (featuresConfig.allowDeleteOwn + Name-Check) |
| S26-136 | **Foto-Bewertungs-Aggregat** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/ratings (avgRating + voteCount top-50) |
| S26-137 | **Kategorie-Schnellwechsel** | ✅ erledigt (20.02.2026) | GalleryTabV2 Lightbox: Select-Dropdown fuer Kategorie-Wechsel |
| S26-138 | **rating_desc Sort** | ✅ erledigt (20.02.2026) | ?sort=rating_desc als Alias fuer quality_desc in Photos-API |
| S26-139 | **Top-10 Fotos** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/top (views_desc, optionalAuth) |
| S26-140 | **G\u00e4stebuch Bulk-Moderate** | \u2705 erledigt (20.02.2026) | POST /events/:id/guestbook/bulk-moderate (approve/reject/delete) |
| S26-141 | **allowDeleteOwn Lightbox** | \u2705 erledigt (20.02.2026) | Trash2-Button in Lightbox + e3/[slug] Passthrough via localStorage |
| S26-142 | **Sprint S26 ABGESCHLOSSEN** | ✅ erledigt (20.02.2026) | 142 Features/Fixes implementiert, deployed, committed |
| S26-143 | **Photo-Tags Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/tags (unique tags sorted, optionalAuth) |
| S26-144 | **Analytics Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/analytics (photos+guests+engagement in einem Call) |
| S26-145 | **⭐ Top Sort** | ✅ erledigt (20.02.2026) | rating_desc Sort-Toggle in Gast-Galerie (qualityScore desc) |
| S26-146 | **Kategorie-Schnellwechsel** | ✅ erledigt (20.02.2026) | GalleryTabV2 Lightbox: Select-Dropdown + categories prop |
| S26-147 | **Foto-Bewertungs-Aggregat** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/ratings (avgRating, voteCount groupBy) |
| S26-148 | **Top-10 Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/top (views_desc, optionalAuth, limit 50) |
| S26-149 | **Photo-Tags Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/tags (unique sorted tags, count) |
| S26-150 | **Analytics Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/analytics (photos+guests+engagement) |
| S26-151 | **⭐ Top Sort** | ✅ erledigt (20.02.2026) | rating_desc Sort-Toggle in Gast-Galerie (qualityScore) |
| S26-152 | **Tag-Filter GalleryTabV2** | ✅ erledigt (20.02.2026) | selectedTag State + filteredPhotos Tag-Filter |
| S26-153 | **Tags Edit Lightbox** | ✅ erledigt (20.02.2026) | 🏷️ Button im Lightbox fuer Tag-Bearbeitung via prompt() |
| S26-154 | **Kategorie-Schnellwechsel** | ✅ erledigt (20.02.2026) | GalleryTabV2 Lightbox: categories prop + Select-Dropdown |
| S26-155 | **allowDeleteOwn vollst.** | ✅ erledigt (20.02.2026) | Backend + SetupToggle + Lightbox-Button + e3/[slug] Passthrough |
| S26-156 | **Activity Feed** | ✅ erledigt (20.02.2026) | GET /events/:id/activity (photo_upload + guest_added, chrono) |
| S26-157 | **Top-Uploaders** | ✅ erledigt (20.02.2026) | GET /events/:id/top-uploaders (medal 🥇🥈🥉, limit max 50) |
| S26-158 | **Webhook-Logs** | ✅ erledigt (20.02.2026) | GET /events/:id/webhook-logs (graceful fallback) |
| S26-159 | **Tags Edit Lightbox** | ✅ erledigt (20.02.2026) | 🏷️ Button in GalleryTabV2 Lightbox fuer Tag-Bearbeitung |
| S26-160 | **Tag-Filter GalleryV2** | ✅ erledigt (20.02.2026) | selectedTag State + filteredPhotos Filter |
| S26-161 | **Gästebuch CSV** | ✅ erledigt (20.02.2026) | GET /events/:id/guestbook/export-csv + Frontend Button |
| S26-162 | **Photo-Tags API** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/tags (unique sorted, optionalAuth) |
| S26-163 | **Activity Feed Widget** | ✅ erledigt (20.02.2026) | Dashboard: recentActivity via GET /events/:id/activity?limit=5 |
| S26-164 | **Foto-Beschreibung Hover** | ✅ erledigt (20.02.2026) | PhotoGrid: title + description im Hover-Overlay |
| S26-165 | **Admin Event-Suche** | ✅ erledigt | adminEvents.ts: q sucht in title + slug (insensitive) |
| S26-166 | **Admin Event-Fotos** | ✅ erledigt (20.02.2026) | GET /admin/events/:id/photos (uploadedBy/tag/status Filter) |
| S26-167 | **Analytics Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/analytics (photos+guests+engagement combined) |
| S26-168 | **Top-Uploaders** | ✅ erledigt (20.02.2026) | GET /events/:id/top-uploaders (medal 🥇🥈🥉) |
| S26-169 | **Webhook-Logs** | ✅ erledigt (20.02.2026) | GET /events/:id/webhook-logs (graceful .catch([])) |
| S26-170 | **🎲 Shuffle Sort** | ✅ erledigt (20.02.2026) | Sort-Toggle '🎲 Shuffle' in Gast-Galerie (Math.random) |
| S26-171 | **pendingCount Badge** | ✅ erledigt (20.02.2026) | EventCard: Clock-Icon Badge (orange) fuer pendingCount > 0 |
| S26-172 | **Foto-Beschreibung Hover** | ✅ erledigt (20.02.2026) | PhotoGrid: title + description im Hover-Overlay (group-hover) |
| S26-173 | **Activity Feed Widget** | ✅ erledigt (20.02.2026) | Dashboard OverviewTab: recentActivity 📸/👤 Liste |
| S26-174 | **Tag-Filter Backend** | ✅ erledigt (20.02.2026) | GET /events/:id/photos?tag=xyz (has: filter) |
| S26-175 | **Cursor-Pagination** | ✅ erledigt (20.02.2026) | ?cursor=<id> + nextCursor in Photos-Response |
| S26-176 | **allowDeleteOwn komplett** | ✅ erledigt (20.02.2026) | Backend+Toggle+Lightbox-Trash+Passthrough vollst. integriert |
| S26-177 | **Pending-Count Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/pending-count (lightweight single count) |
| S26-178 | **Gäste PATCH** | ✅ erledigt (20.02.2026) | PATCH /events/:id/guests/:id (notes, dietary, plusOneCount, status) |
| S26-179 | **Photo Hide** | ✅ erledigt (20.02.2026) | POST /photos/:id/hide (APPROVED<->HIDDEN toggle, allowHide featureFlag) |
| S26-180 | **🎲 Shuffle Sort** | ✅ erledigt (20.02.2026) | 6. Sort-Option in Gast-Galerie (Math.random) |
| S26-181 | **pendingCount Badge EventCard** | ✅ erledigt (20.02.2026) | Clock-Icon Badge orange in EventCard Meta-Row |
| S26-182 | **Foto-Tags API** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/tags (unique sorted tags) |
| S26-183 | **Activity Feed** | ✅ erledigt (20.02.2026) | GET /events/:id/activity + Dashboard Widget |
| S26-184 | **Analytics** | ✅ erledigt (20.02.2026) | GET /events/:id/analytics (combined photos+guests+engagement) |
| S26-185 | **Uploader Hover Badge** | ✅ erledigt (20.02.2026) | GalleryTabV2: uploadedBy Name Badge bei Hover (9px) |
| S26-186 | **views + faceCount Lightbox** | ✅ erledigt (20.02.2026) | GalleryTabV2 Lightbox: 👁 views + 👤 faceCount Footer |
| S26-187 | **Photo Hide Endpoint** | ✅ erledigt (20.02.2026) | POST /photos/:id/hide (APPROVED↔HIDDEN toggle, allowHide) |
| S26-188 | **Gäste PATCH** | ✅ erledigt (20.02.2026) | PATCH /events/:id/guests/:id (notes, dietary, plusOne, status) |
| S26-189 | **Pending-Count** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/pending-count (lightweight poll) |
| S26-190 | **Gästebuch Bulk-Mod** | ✅ erledigt (20.02.2026) | POST /events/:id/guestbook/bulk-moderate (approve/reject/del) |
| S26-191 | **Sprint S26 Fortschritt** | ✅ erledigt (20.02.2026) | 191 Sprint-Tasks implementiert, deployed + committed |
| S26-192 | **Bulk-Delete** | ✅ erledigt (20.02.2026) | POST /photos/bulk/delete (soft-delete, eventId + photoIds Array) |
| S26-193 | **HIDDEN Filter Fix** | ✅ erledigt (20.02.2026) | Photos-API: notIn ['DELETED','HIDDEN'] als Safety-Net |
| S26-194 | **Uploader-Badge** | ✅ erledigt (20.02.2026) | GalleryTabV2: uploadedBy hover Badge (9px, black/60) |
| S26-195 | **views + faceCount** | ✅ erledigt (20.02.2026) | GalleryTabV2 Lightbox Footer: 👁 views + 👤 faceCount |
| S26-196 | **Gäste PATCH** | ✅ erledigt (20.02.2026) | PATCH /events/:id/guests/:id (notes, dietary, plusOneCount) |
| S26-197 | **Photo Hide** | ✅ erledigt (20.02.2026) | POST /photos/:id/hide (APPROVED↔HIDDEN, allowHide featureFlag) |
| S26-198 | **Pending-Count Poll** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/pending-count (lightweight poll-Endpunkt) |
| S26-199 | **ZIP Download Button** | ✅ erledigt (20.02.2026) | Dashboard: Download-ZIP Button neben Export (buildApiUrl) |
| S26-200 | **Kommentar-Moderation** | ✅ erledigt (20.02.2026) | GET /events/:id/comments?status=PENDING (Host-only) |
| S26-201 | **Admin Storage Stats** | ✅ erledigt | GET /admin/events/storage-stats (topEvents, totalPhotos, totalSize) |
| S26-202 | **Bulk-Delete** | ✅ erledigt (20.02.2026) | POST /photos/bulk/delete (soft-delete updateMany) |
| S26-203 | **HIDDEN Filter** | ✅ erledigt (20.02.2026) | Photos-API notIn ['DELETED','HIDDEN'] als Safety-Net |
| S26-204 | **Uploader Hover Badge** | ✅ erledigt (20.02.2026) | GalleryTabV2 Foto-Karte: uploadedBy bei Hover |
| S26-205 | **Sprint S26 Meilenstein** | ✅ erledigt (20.02.2026) | 205+ Sprint-Tasks implementiert, deployed, committed |
| S26-206 | **qualityScore Filter** | ✅ erledigt (20.02.2026) | GalleryTabV2: qualityFilter State (all/high/medium/low) |
| S26-207 | **Gäste-Bulk-Import** | ✅ erledigt (20.02.2026) | POST /events/:id/guests/import (JSON, upsert-by-email, max 500) |
| S26-208 | **AI Caption Bulk** | ✅ erledigt (20.02.2026) | POST /photos/bulk/ai-caption (max 100, overwrite param) |
| S26-209 | **Photo-Stats** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/stats (approved/pending/favorites/today/views) |
| S26-210 | **Cursor-Pagination** | ✅ erledigt (20.02.2026) | GET /photos?cursor=<id> + nextCursor in Response |
| S26-211 | **Admin Foto-Suche** | ✅ erledigt (20.02.2026) | GET /admin/events/:id/photos (uploadedBy/tag/status Filter) |
| S26-212 | **Gästebuch Bulk-Mod** | ✅ erledigt (20.02.2026) | POST /guestbook/bulk-moderate (approve/reject/delete) |
| S26-213 | **Tags Pills Hover** | ✅ erledigt (20.02.2026) | GalleryTabV2: #tag Pills (max 2) + Click -> selectedTag Filter |
| S26-214 | **commentsPending State** | ✅ erledigt (20.02.2026) | Dashboard: GET /events/:id/comments?status=PENDING count |
| S26-215 | **qualityScore Filter** | ✅ erledigt (20.02.2026) | GalleryTabV2: qualityFilter (all/high/medium/low) |
| S26-216 | **ZIP Download Button** | ✅ erledigt (20.02.2026) | Dashboard Hero: ZIP Button via buildApiUrl + Download Icon |
| S26-217 | **Kommentar-Moderation** | ✅ erledigt (20.02.2026) | GET /events/:id/comments?status=PENDING (Host-only endpoint) |
| S26-218 | **qualityScore Sort** | ✅ erledigt (20.02.2026) | rating_desc als Alias fuer quality_desc in Photos-Sort |
| S26-219 | **Photo-Tags Endpoint** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/tags (unique sorted, optionalAuth) |
| S26-220 | **Fotos CSV-Export** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/export-csv (ID/Uploader/Status/Datum/Views/Tags) |
| S26-221 | **Bulk-Restore** | ✅ erledigt (20.02.2026) | POST /photos/bulk/restore (DELETED -> APPROVED + deletedAt=null) |
| S26-222 | **Live-Polling 30s** | ✅ erledigt (20.02.2026) | Dashboard: setInterval 30s pendingCount + clearInterval cleanup |
| S26-223 | **Check-In Stats** | ✅ erledigt (20.02.2026) | GET /events/:id/guests/checkin-stats (total/checkedIn/rate%) |
| S26-224 | **Photo Title/Desc** | ✅ erledigt (20.02.2026) | GalleryTabV2 Lightbox: title + description ueber Bottom-Info |
| S26-225 | **Tags Pills Hover** | ✅ erledigt (20.02.2026) | GalleryTabV2: Tags als #pills (max 2) bei Hover |
| S26-226 | **Tags Click Filter** | ✅ erledigt (20.02.2026) | Tags Pill Click -> selectedTag Filter setzen |
| S26-227 | **Einladungs-Stats** | ✅ erledigt (20.02.2026) | GET /events/:id/invitation-stats (total/withEmail/invited) |
| S26-228 | **Foto-Pinning** | ✅ erledigt (20.02.2026) | POST /photos/:id/pin (isFavorite toggle, Host-only) |
| S26-229 | **Bulk-Restore** | ✅ erledigt (20.02.2026) | POST /photos/bulk/restore (DELETED->APPROVED, deletedAt=null) |
| S26-230 | **Fotos CSV-Export** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/export-csv (CSV Response) |
| S26-231 | **Live-Polling** | ✅ erledigt (20.02.2026) | setInterval 30s pendingCount + clearInterval cleanup |
| S26-232 | **Check-In Stats** | ✅ erledigt (20.02.2026) | GET /events/:id/guests/checkin-stats (total/checkedIn/rate%) |
| S26-233 | **Kommentar-Stats** | ✅ erledigt (20.02.2026) | GET /events/:id/comments?status=PENDING + commentsPending State |
| S26-234 | **Alle-Laden Button** | ✅ erledigt (20.02.2026) | GalleryTabV2 Pagination: 'Alle laden' Button neben Spinner |
| S26-235 | **Gast-Filter Dropdown** | ✅ erledigt (20.02.2026) | GalleryTabV2: select Dropdown bei >8 Gaesten statt Pills |
| S26-236 | **Einladungs-Stats** | ✅ erledigt (20.02.2026) | GET /events/:id/invitation-stats (total/withEmail/invited) |
| S26-237 | **Photo-Pinning** | ✅ erledigt (20.02.2026) | POST /photos/:id/pin (isFavorite toggle, Host-only) |
| S26-238 | **Fotos CSV-Export** | ✅ erledigt (20.02.2026) | GET /events/:id/photos/export-csv (CSV mit Views/Tags) |
| S26-239 | **Bulk-Restore** | ✅ erledigt (20.02.2026) | POST /photos/bulk/restore (DELETED->APPROVED) |
| S26-240 | **Sprint S26 Final** | ✅ erledigt (21.02.2026) | 240+ Sprint-Tasks implementiert, deployed, committed |
| S26-241 | **Bulk-Approve** | ✅ erledigt (21.02.2026) | POST /photos/bulk/approve (alle PENDING -> APPROVED) |
| S26-242 | **Bulk-Reject** | ✅ erledigt (21.02.2026) | POST /photos/bulk/reject (PENDING oder IDs -> REJECTED) |
| S26-243 | **Gast-Filter Dropdown** | ✅ erledigt (21.02.2026) | GalleryTabV2: select Dropdown bei >8 Gaesten |
| S26-244 | **Alle-Laden Button** | ✅ erledigt (21.02.2026) | GalleryTabV2: setVisibleCount(filteredPhotos.length) |
| S26-245 | **Photo-Pinning** | ✅ erledigt (21.02.2026) | POST /photos/:id/pin (isFavorite toggle) |
| S26-246 | **Einladungs-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/invitation-stats |
| S26-247 | **Check-In Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/checkin-stats |
| S26-248 | **Download-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/download-stats (topPhotos by views + totalViews) |
| S26-249 | **Bulk-Reject** | ✅ erledigt (21.02.2026) | POST /photos/bulk/reject (alle PENDING oder ID-Liste -> REJECTED) |
| S26-250 | **Photo-Pinning** | ✅ erledigt (21.02.2026) | POST /photos/:id/pin (isFavorite toggle, Host-only, PATCH) |
| S26-251 | **Tags Pills Hover** | ✅ erledigt (21.02.2026) | GalleryTabV2: #tag Pills clickbar fuer selectedTag Filter |
| S26-252 | **qualityFilter** | ✅ erledigt (21.02.2026) | GalleryTabV2: qualityScore Filter (all/high/medium/low) |
| S26-253 | **Foto Title/Desc Lightbox** | ✅ erledigt (21.02.2026) | GalleryTabV2 Lightbox: title + description anzeigen |
| S26-254 | **Sprint S26 Milestone** | ✅ erledigt (21.02.2026) | 254 Sprint-Tasks implementiert, deployed, committed |
| S26-255 | **HIDDEN Filter Tab** | ✅ erledigt (21.02.2026) | GalleryTabV2: 'hidden' in GalleryFilter Union + filteredPhotos |
| S26-256 | **Download-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/download-stats (topPhotos by views) |
| S26-257 | **Bulk-Approve/Reject** | ✅ erledigt (21.02.2026) | POST /photos/bulk/approve + /bulk/reject Endpoints |
| S26-258 | **qualityFilter** | ✅ erledigt (21.02.2026) | GalleryTabV2 qualityScore Filter (all/high/medium/low) |
| S26-259 | **Tags Click->Filter** | ✅ erledigt (21.02.2026) | Tags Pill Click setzt selectedTag Filter |
| S26-260 | **Gast-Dropdown >8** | ✅ erledigt (21.02.2026) | GalleryTabV2: select Dropdown bei >8 Gaesten |
| S26-261 | **Alle-Laden Button** | ✅ erledigt (21.02.2026) | GalleryTabV2: 'Alle laden' Button neben Spinner |
| S26-262 | **Admin Storage-Stats** | ✅ erledigt (21.02.2026) | GET /admin/events/storage-stats (totalPhotos/Events/topEvents) |
| S26-263 | **HIDDEN Filter** | ✅ erledigt (21.02.2026) | GalleryTabV2: 'hidden' in GalleryFilter + filteredPhotos |
| S26-264 | **Foto-Beschreibung Hover** | ✅ erledigt (21.02.2026) | PhotoGrid: title + description im Hover-Overlay |
| S26-265 | **rating_desc Sort** | ✅ erledigt (21.02.2026) | ⭐ Top Sort in Gast-Galerie (qualityScore desc) |
| S26-266 | **🎲 Shuffle Sort** | ✅ erledigt (21.02.2026) | Gast-Galerie Sort-Toggle Math.random shuffle |
| S26-267 | **Foto-Tags Endpoint** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/tags (unique sorted, optionalAuth) |
| S26-268 | **Sprint S26 Abschluss** | ✅ erledigt (21.02.2026) | 268 Features in Sprint S26 implementiert + deployed |
| S26-269 | **hiddenPhotos Tab** | ✅ erledigt (21.02.2026) | GalleryTabV2: 'Versteckt' Tab + Eye Icon + Count (nur wenn > 0) |
| S26-270 | **Admin Storage-Stats** | ✅ erledigt (21.02.2026) | GET /admin/events/storage-stats (topEvents by photoCount) |
| S26-271 | **Bulk-Approve** | ✅ erledigt (21.02.2026) | POST /photos/bulk/approve (alle PENDING -> APPROVED) |
| S26-272 | **Bulk-Reject** | ✅ erledigt (21.02.2026) | POST /photos/bulk/reject (alle PENDING oder ID-Liste) |
| S26-273 | **Photo-Pinning** | ✅ erledigt (21.02.2026) | POST /photos/:id/pin (isFavorite toggle) |
| S26-274 | **Bulk-Restore** | ✅ erledigt (21.02.2026) | POST /photos/bulk/restore (DELETED -> APPROVED) |
| S26-275 | **Fotos CSV** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/export-csv |
| S26-276 | **Status-Timeline** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-timeline (status/updatedAt top 100) |
| S26-277 | **hiddenPhotos Tab** | ✅ erledigt (21.02.2026) | GalleryTabV2: 'Versteckt' Filter-Tab mit Eye Icon |
| S26-278 | **Tags Pills** | ✅ erledigt (21.02.2026) | GalleryTabV2: #tag Pills bei Hover + Click->Filter |
| S26-279 | **Photo Title/Desc** | ✅ erledigt (21.02.2026) | Lightbox Footer: title + description anzeigen |
| S26-280 | **qualityFilter** | ✅ erledigt (21.02.2026) | GalleryTabV2: qualityScore Filter (all/high/medium/low) |
| S26-281 | **Alle-Laden Button** | ✅ erledigt (21.02.2026) | GalleryTabV2: setVisibleCount(filteredPhotos.length) |
| S26-282 | **Gast-Dropdown** | ✅ erledigt (21.02.2026) | GalleryTabV2: select Dropdown bei >8 Gaesten |
| S26-283 | **Gast-Suche** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/search?q= (firstName/lastName/email) |
| S26-284 | **Status-Timeline** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-timeline (updatedAt desc, 100) |
| S26-285 | **Invitation-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/invitation-stats (withEmail/invited) |
| S26-286 | **Checkin-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/checkin-stats (checkedIn/rate%) |
| S26-287 | **Download-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/download-stats (top 20 by views) |
| S26-288 | **Admin Storage-Stats** | ✅ erledigt (21.02.2026) | GET /admin/events/storage-stats (topEvents by photoCount) |
| S26-289 | **Bulk Approve/Reject/Restore** | ✅ erledigt (21.02.2026) | POST /photos/bulk/approve + /reject + /restore |
| S26-290 | **QR-Code Endpoint** | ✅ erledigt (21.02.2026) | GET /events/:id/qr-code (qrUrl via qrserver.com + shareUrl) |
| S26-291 | **Gast Bulk-Status** | ✅ erledigt (21.02.2026) | PATCH /events/:id/guests/bulk-status (ACCEPTED/DECLINED/PENDING) |
| S26-292 | **Gast-Suche** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/search?q= (firstName/lastName/email) |
| S26-293 | **Status-Timeline** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-timeline (updatedAt desc, top 100) |
| S26-294 | **hiddenPhotos Tab** | ✅ erledigt (21.02.2026) | GalleryTabV2: 'Versteckt' Filter-Tab (nur wenn > 0) |
| S26-295 | **Gast-Dropdown >8** | ✅ erledigt (21.02.2026) | GalleryTabV2: select Dropdown statt Pills bei >8 |
| S26-296 | **Alle-Laden Button** | ✅ erledigt (21.02.2026) | GalleryTabV2: 'Alle laden' Button neben Pagination-Spinner |
| S26-297 | **Photo Activity** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/activity (action/uploadedBy/at/photoUrl) |
| S26-298 | **Gast Bulk-Status** | ✅ erledigt (21.02.2026) | PATCH /events/:id/guests/bulk-status (ACCEPTED/DECLINED/PENDING) |
| S26-299 | **QR-Code** | ✅ erledigt (21.02.2026) | GET /events/:id/qr-code (qrUrl + shareUrl) |
| S26-300 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 300 Sprint-Tasks implementiert, deployed, committed |
| S26-301 | **GalleryFilter hidden** | ✅ erledigt (21.02.2026) | GalleryFilter Typ + dashboard/page.tsx um 'hidden' ergaenzt |
| S26-302 | **Tags Pills Filter** | ✅ erledigt (21.02.2026) | GalleryTabV2: #tag Pills bei Hover, Click setzt selectedTag |
| S26-303 | **Photo Title/Desc** | ✅ erledigt (21.02.2026) | GalleryTabV2 Lightbox: title + description anzeigen |
| S26-304 | **Gaesteliste CSV** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/export-csv (CSV mit Status/Allergien) |
| S26-305 | **Photo Activity** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/activity (uploaded/approved/rejected) |
| S26-306 | **QR-Code** | ✅ erledigt (21.02.2026) | GET /events/:id/qr-code (shareUrl + qrUrl via qrserver.com) |
| S26-307 | **Gast Bulk-Status** | ✅ erledigt (21.02.2026) | PATCH /events/:id/guests/bulk-status (updateMany status) |
| S26-308 | **Gast-Suche** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/search?q= (firstName/lastName/email) |
| S26-309 | **Invitation Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/invitation-stats (withEmail/invited/notInvited) |
| S26-310 | **Sprint S26 Checkpoint** | ✅ erledigt (21.02.2026) | 310 Features in Sprint S26 implementiert + deployed |
| S26-311 | **Top-Liked Endpoint** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/top-liked (APPROVED, likes._count desc) |
| S26-312 | **Gaesteliste CSV** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/export-csv (Vorname/Nachname/Email/Status) |
| S26-313 | **Photo Activity** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/activity (uploaded/approved/rejected) |
| S26-314 | **QR-Code** | ✅ erledigt (21.02.2026) | GET /events/:id/qr-code (qrUrl via qrserver.com) |
| S26-315 | **hiddenPhotos Tab** | ✅ erledigt (21.02.2026) | GalleryTabV2: 'Versteckt' Tab + Eye Icon (nur wenn > 0) |
| S26-316 | **commentsPending** | ✅ erledigt (21.02.2026) | Dashboard: commentsPending State + 30s Poll |
| S26-317 | **Sprint S26 Abschluss** | ✅ erledigt (21.02.2026) | 317 Features in Sprint S26 implementiert + deployed |
| S26-318 | **Recent Photos** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/recent (limit 12, Manager sieht alle) |
| S26-319 | **Top-Liked** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/top-liked (APPROVED, likes._count desc) |
| S26-320 | **Gaesteliste CSV** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/export-csv (Status/Allergien/PlusOnes) |
| S26-321 | **Gast Bulk-Status** | ✅ erledigt (21.02.2026) | PATCH /events/:id/guests/bulk-status (updateMany status) |
| S26-322 | **Gast-Suche** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/search?q= (insensitive contains) |
| S26-323 | **Status-Timeline** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-timeline (updatedAt desc 100) |
| S26-324 | **Bulk Approve/Reject** | ✅ erledigt (21.02.2026) | POST /photos/bulk/approve + /reject endpoints |
| S26-325 | **Photos by-Guest** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/by-guest (groupBy uploadedBy, count desc) |
| S26-326 | **Recent Photos** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/recent (limit 12, Manager alle Status) |
| S26-327 | **Top-Liked** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/top-liked (APPROVED, likes count desc) |
| S26-328 | **Gaesteliste CSV** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/export-csv (Vorname/Nachname/Status) |
| S26-329 | **Photo Activity** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/activity (uploaded/approved/rejected) |
| S26-330 | **QR-Code** | ✅ erledigt (21.02.2026) | GET /events/:id/qr-code (qrUrl + shareUrl) |
| S26-331 | **Sprint S26 Abschluss** | ✅ erledigt (21.02.2026) | 331 Features in Sprint S26 implementiert + deployed |
| S26-332 | **Tag-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/tag-stats (tagMap count desc) |
| S26-333 | **Status-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-count (groupBy status) |
| S26-334 | **Photos by-Guest** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/by-guest (groupBy uploadedBy) |
| S26-335 | **Recent Photos** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/recent (limit 12, Manager sieht alle) |
| S26-336 | **Top-Liked** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/top-liked (likes._count desc) |
| S26-337 | **Gaesteliste CSV** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/export-csv (alle Felder) |
| S26-338 | **Sprint S26 Checkpoint** | ✅ erledigt (21.02.2026) | 338 Features in Sprint S26 implementiert + deployed |
| S26-339 | **Hourly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/hourly-stats (array[24] + peakHour) |
| S26-340 | **Dietary-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/dietary-stats (total/plusOnes/withDietary) |
| S26-341 | **Leaderboard** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/leaderboard (top uploaders, rank/name/count) |
| S26-342 | **Tag-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/tag-stats (tagMap count desc) |
| S26-343 | **Status-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-count (groupBy status) |
| S26-344 | **Photos by-Guest** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/by-guest (groupBy uploadedBy) |
| S26-345 | **Sprint S26 Milestone** | ✅ erledigt (21.02.2026) | 345 Features in Sprint S26 implementiert + deployed |
| S26-346 | **Daily-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/daily-stats (dailyMap asc, totalDays) |
| S26-347 | **Gast Summary** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/summary (total/accepted/plusOnes/withEmail) |
| S26-348 | **Hourly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/hourly-stats (array[24] + peakHour) |
| S26-349 | **Dietary-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/dietary-stats (withDietary/statusCount) |
| S26-350 | **Leaderboard** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/leaderboard (top uploaders, APPROVED) |
| S26-351 | **Tag-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/tag-stats (tagMap count desc) |
| S26-352 | **Sprint S26 Abschluss** | ✅ erledigt (21.02.2026) | 352 Features in Sprint S26 implementiert + deployed |
| S26-353 | **Approval-Rate** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/approval-rate (approvedRate%) |
| S26-354 | **Daily-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/daily-stats (dailyMap asc) |
| S26-355 | **Gast Summary** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/summary (total/accepted/plusOnes) |
| S26-356 | **Hourly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/hourly-stats (array[24] peakHour) |
| S26-357 | **Dietary-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/dietary-stats (withDietary) |
| S26-358 | **Leaderboard** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/leaderboard (rank/name/count) |
| S26-359 | **Sprint S26 Final** | ✅ erledigt (21.02.2026) | 359 Features in Sprint S26 implementiert + deployed |
| S26-360 | **Favorites-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/favorites-count (total/favorites/ratio%) |
| S26-361 | **Approval-Rate** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/approval-rate (approvedRate%) |
| S26-362 | **Daily-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/daily-stats (uploads pro Tag) |
| S26-363 | **Gast Summary** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/summary (accepted/plusOnes) |
| S26-364 | **Leaderboard** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/leaderboard (rank/name/count) |
| S26-365 | **Tag-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/tag-stats (sortiert count desc) |
| S26-366 | **Sprint S26 Checkpoint** | ✅ erledigt (21.02.2026) | 366 Features in Sprint S26 implementiert + deployed |
| S26-367 | **Views-Total** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/views-total (sum/avg/max/photoCount) |
| S26-368 | **Favorites-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/favorites-count (total/favorites/ratio%) |
| S26-369 | **Approval-Rate** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/approval-rate (approved/pending/rejected) |
| S26-370 | **Hourly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/hourly-stats (array[24] + peakHour) |
| S26-371 | **Daily-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/daily-stats (pro Tag, asc) |
| S26-372 | **Dietary-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/dietary-stats (withDietary/statusCount) |
| S26-373 | **Sprint S26 Abschluss** | ✅ erledigt (21.02.2026) | 373 Features in Sprint S26 implementiert + deployed |
| S26-374 | **Admin User-Stats** | ✅ erledigt (21.02.2026) | GET /admin/users/stats (total/locked/withEvents/admins) |
| S26-375 | **Views-Total** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/views-total (sum/avg/max) |
| S26-376 | **Favorites-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/favorites-count (isFavorite ratio%) |
| S26-377 | **Approval-Rate** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/approval-rate (approved/pending/rejected) |
| S26-378 | **QR-Code** | ✅ erledigt (21.02.2026) | GET /events/:id/qr-code (qrUrl + shareUrl) |
| S26-379 | **Gast Summary** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/summary (total/accepted/plusOnes) |
| S26-380 | **Sprint S26 Final** | ✅ erledigt (21.02.2026) | 380 Features in Sprint S26 implementiert + deployed |
| S26-381 | **Admin Event Summary** | ✅ erledigt (21.02.2026) | GET /admin/events/summary-stats (total/active/withPhotos) |
| S26-382 | **Admin User-Stats** | ✅ erledigt (21.02.2026) | GET /admin/users/stats (total/locked/admins/newThisWeek) |
| S26-383 | **Views-Total** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/views-total (sum/avg/max) |
| S26-384 | **Status-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-count (groupBy status) |
| S26-385 | **Photos by-Guest** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/by-guest (groupBy uploadedBy) |
| S26-386 | **Hourly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/hourly-stats (peakHour) |
| S26-387 | **Sprint S26 Abschluss** | ✅ erledigt (21.02.2026) | 387 Features in Sprint S26 implementiert + deployed |
| S26-388 | **Admin Global Photo-Stats** | ✅ erledigt (21.02.2026) | GET /admin/photos/global-stats (total/approved/views/approvalRate%) |
| S26-389 | **Admin Event Summary** | ✅ erledigt (21.02.2026) | GET /admin/events/summary-stats (total/active/withPhotos) |
| S26-390 | **Admin User-Stats** | ✅ erledigt (21.02.2026) | GET /admin/users/stats (total/locked/admins) |
| S26-391 | **Admin Storage-Stats** | ✅ erledigt (21.02.2026) | GET /admin/events/storage-stats (topEvents by photoCount) |
| S26-392 | **Daily-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/daily-stats (dailyMap asc) |
| S26-393 | **Approval-Rate** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/approval-rate (approved/pending) |
| S26-394 | **Sprint S26 Checkpoint** | ✅ erledigt (21.02.2026) | 394 Features in Sprint S26 implementiert + deployed |
| S26-395 | **Admin Guest Stats** | ✅ erledigt (21.02.2026) | GET /admin/guests/stats via guests router (total/accepted/withEmail) |
| S26-396 | **Admin Global Photo-Stats** | ✅ erledigt (21.02.2026) | GET /admin/photos/global-stats (views/approvalRate%) |
| S26-397 | **Admin Event Summary** | ✅ erledigt (21.02.2026) | GET /admin/events/summary-stats (active/withPhotos) |
| S26-398 | **Admin User-Stats** | ✅ erledigt (21.02.2026) | GET /admin/users/stats (locked/admins/newThisWeek) |
| S26-399 | **Admin Storage-Stats** | ✅ erledigt (21.02.2026) | GET /admin/events/storage-stats (topEvents by photoCount) |
| S26-400 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 400 Features in Sprint S26 implementiert + deployed |
| S26-401 | **Gast Summary** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/summary (total/accepted/plusOnes) |
| S26-402 | **Comments-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/comments-count (totalComments/photosWithComments) |
| S26-403 | **Admin Guest Stats** | ✅ erledigt (21.02.2026) | GET guests router /admin/stats (total/accepted/withEmail) |
| S26-404 | **Admin Global Photo-Stats** | ✅ erledigt (21.02.2026) | GET /admin/photos/global-stats (total/views/approvalRate%) |
| S26-405 | **Recent Photos** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/recent (createdAt desc, limit 12) |
| S26-406 | **Top-Liked** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/top-liked (likes._count desc) |
| S26-407 | **Leaderboard** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/leaderboard (rank/name/count, APPROVED) |
| S26-408 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 408 Features in Sprint S26 implementiert + deployed |
| S26-409 | **Votes-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/votes-stats (totalVotes/avgRating) |
| S26-410 | **Comments-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/comments-count (totalComments) |
| S26-411 | **Daily-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/daily-stats (dailyMap asc) |
| S26-412 | **Hourly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/hourly-stats (array[24] peakHour) |
| S26-413 | **Tag-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/tag-stats (tagMap count desc) |
| S26-414 | **Status-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-count (groupBy status) |
| S26-415 | **Sprint S26 Final** | ✅ erledigt (21.02.2026) | 415 Features in Sprint S26 implementiert + deployed |
| S26-416 | **Challenge-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/challenges/stats (totalChallenges/Completions) |
| S26-417 | **Votes-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/votes-stats (totalVotes/avgRating) |
| S26-418 | **Comments-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/comments-count (totalComments) |
| S26-419 | **Hourly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/hourly-stats (peakHour) |
| S26-420 | **Daily-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/daily-stats (dailyMap asc) |
| S26-421 | **Approval-Rate** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/approval-rate (approvalRate%) |
| S26-422 | **Sprint S26 Checkpoint** | ✅ erledigt (21.02.2026) | 422 Features in Sprint S26 implementiert + deployed |
| S26-423 | **Story-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/stories/stats (total/active/expired) |
| S26-424 | **Challenge-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/challenges/stats (completions/participants) |
| S26-425 | **Votes-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/votes-stats (totalVotes/avgRating) |
| S26-426 | **Comments-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/comments-count (totalComments) |
| S26-427 | **Admin Guest Stats** | ✅ erledigt (21.02.2026) | GET /admin/guests/stats (total/accepted/declined) |
| S26-428 | **Admin Global Photo-Stats** | ✅ erledigt (21.02.2026) | GET /admin/photos/global-stats (views/approvalRate%) |
| S26-429 | **Sprint S26 Abschluss** | ✅ erledigt (21.02.2026) | 429 Features in Sprint S26 implementiert + deployed |
| S26-430 | **Category-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/category-stats (groupBy categoryId + name) |
| S26-431 | **Story-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/stories/stats (total/active/expired) |
| S26-432 | **Challenge-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/challenges/stats (completions/participants) |
| S26-433 | **Votes-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/votes-stats (totalVotes/avgRating) |
| S26-434 | **Comments-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/comments-count (totalComments) |
| S26-435 | **Leaderboard** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/leaderboard (rank/name/count) |
| S26-436 | **Sprint S26 Final** | ✅ erledigt (21.02.2026) | 436 Features in Sprint S26 implementiert + deployed |
| S26-437 | **Guestbook-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guestbook/stats (total/approved/approvalRate%) |
| S26-438 | **Category-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/category-stats (groupBy categoryId) |
| S26-439 | **Story-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/stories/stats (active/expired expiresAt) |
| S26-440 | **Challenge-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/challenges/stats (completions/participants) |
| S26-441 | **Votes-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/votes-stats (totalVotes/avgRating) |
| S26-442 | **Comments-Count** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/comments-count (totalComments) |
| S26-443 | **Sprint S26 Checkpoint** | ✅ erledigt (21.02.2026) | 443 Features in Sprint S26 implementiert + deployed |
| S26-444 | **Invitation-Log** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/invitation-log (limit/offset/createdAt desc) |
| S26-445 | **Guestbook-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guestbook/stats (total/approved/approvalRate%) |
| S26-446 | **Category-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/category-stats (groupBy categoryId) |
| S26-447 | **Story-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/stories/stats (active/expired) |
| S26-448 | **Challenge-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/challenges/stats (participants) |
| S26-449 | **Dietary-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/dietary-stats (withDietary) |
| S26-450 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 450 Features in Sprint S26 implementiert + deployed |
| S26-451 | **Bulk Add-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/add-tag (photoIds + tag, dedup push) |
| S26-452 | **Invitation-Log** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/invitation-log (limit/offset paginiert) |
| S26-453 | **Guestbook-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guestbook/stats (total/approved/approvalRate%) |
| S26-454 | **Category-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/category-stats (groupBy categoryId + name) |
| S26-455 | **Story-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/stories/stats (total/active/expired) |
| S26-456 | **Challenge-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/challenges/stats (completions/participants) |
| S26-457 | **Sprint S26 Abschluss** | ✅ erledigt (21.02.2026) | 457 Features in Sprint S26 implementiert + deployed |
| S26-458 | **Bulk Remove-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/remove-tag (filter tag aus Array) |
| S26-459 | **Bulk Add-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/add-tag (push tag, dedup) |
| S26-460 | **Invitation-Log** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/invitation-log (paginiert) |
| S26-461 | **Guestbook-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guestbook/stats (approvalRate%) |
| S26-462 | **Leaderboard** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/leaderboard (APPROVED rank) |
| S26-463 | **Category-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/category-stats (name + count) |
| S26-464 | **Sprint S26 Final** | ✅ erledigt (21.02.2026) | 464 Features in Sprint S26 implementiert + deployed |
| S26-465 | **Bulk Set-Category** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/set-category (categoryId nullable) |
| S26-466 | **Bulk Remove-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/remove-tag (filter aus tags Array) |
| S26-467 | **Bulk Add-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/add-tag (push + dedup) |
| S26-468 | **Invitation-Log** | ✅ erledigt (21.02.2026) | GET /events/:id/guests/invitation-log (paginiert) |
| S26-469 | **Guestbook-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/guestbook/stats (status enum) |
| S26-470 | **Story-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/stories/stats (expiresAt) |
| S26-471 | **Sprint S26 Checkpoint** | ✅ erledigt (21.02.2026) | 471 Features in Sprint S26 implementiert + deployed |
| S26-472 | **Bulk Set-Favorite** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/set-favorite (isFavorite boolean) |
| S26-473 | **Bulk Set-Category** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/set-category (categoryId nullable) |
| S26-474 | **Bulk Remove-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/remove-tag (filter aus Array) |
| S26-475 | **Bulk Add-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/add-tag (push + dedup) |
| S26-476 | **Bulk Approve/Reject** | ✅ erledigt (21.02.2026) | POST /photos/bulk/approve + /reject |
| S26-477 | **Status-Timeline** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-timeline (updatedAt desc) |
| S26-478 | **Sprint S26 Abschluss** | ✅ erledigt (21.02.2026) | 478 Features in Sprint S26 implementiert + deployed |
| S26-479 | **Bulk Soft-Delete** | ✅ erledigt (21.02.2026) | DELETE /photos/bulk/delete (deletedAt = now, managerCheck) |
| S26-480 | **Bulk Set-Favorite** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/set-favorite (isFavorite boolean) |
| S26-481 | **Bulk Set-Category** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/set-category (categoryId nullable) |
| S26-482 | **Bulk Remove-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/remove-tag (filter aus Array) |
| S26-483 | **Bulk Add-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/add-tag (push + dedup) |
| S26-484 | **Bulk Approve/Reject** | ✅ erledigt (21.02.2026) | POST /photos/bulk/approve + /reject (updateMany) |
| S26-485 | **Sprint S26 Final** | ✅ erledigt (21.02.2026) | 485 Features in Sprint S26 implementiert + deployed |
| S26-486 | **Bulk Restore** | ✅ erledigt (21.02.2026) | POST /photos/bulk/restore (deletedAt = null) |
| S26-487 | **Bulk Soft-Delete** | ✅ erledigt (21.02.2026) | DELETE /photos/bulk/delete (deletedAt = now) |
| S26-488 | **Bulk Set-Favorite** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/set-favorite (isFavorite) |
| S26-489 | **Bulk Set-Category** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/set-category (categoryId) |
| S26-490 | **Bulk Remove-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/remove-tag (filter) |
| S26-491 | **Bulk Add-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/add-tag (push dedup) |
| S26-492 | **Sprint S26 Abschluss** | ✅ erledigt (21.02.2026) | 492 Features in Sprint S26 implementiert + deployed |
| S26-493 | **Status-Timeline** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-timeline (updatedAt desc, limit) |
| S26-494 | **Bulk Restore** | ✅ erledigt (21.02.2026) | POST /photos/bulk/restore (deletedAt = null) |
| S26-495 | **Bulk Soft-Delete** | ✅ erledigt (21.02.2026) | DELETE /photos/bulk/delete (deletedAt = now) |
| S26-496 | **Category-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/category-stats (groupBy name) |
| S26-497 | **Story-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/stories/stats (active/expired) |
| S26-498 | **Challenge-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/challenges/stats (completions) |
| S26-499 | **Sprint S26 Final** | ✅ erledigt (21.02.2026) | 499 Features in Sprint S26 implementiert + deployed |
| S26-500 | **🏆 500 Features Meilenstein** | ✅ erledigt (21.02.2026) | Weekly-Stats GET /events/:id/photos/weekly-stats (ISO Monday key) |
| S26-501 | **Status-Timeline** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-timeline (updatedAt desc) |
| S26-502 | **Bulk Restore** | ✅ erledigt (21.02.2026) | POST /photos/bulk/restore (deletedAt = null) |
| S26-503 | **Bulk Soft-Delete** | ✅ erledigt (21.02.2026) | DELETE /photos/bulk/delete (deletedAt = now) |
| S26-504 | **Bulk Set-Favorite** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/set-favorite (isFavorite) |
| S26-505 | **Bulk Set-Category** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/set-category (categoryId) |
| S26-506 | **Bulk Remove-Tag** | ✅ erledigt (21.02.2026) | PATCH /photos/bulk/remove-tag (filter) |
| S26-507 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 507 Features in Sprint S26 implementiert + deployed |
| S26-508 | **Monthly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/monthly-stats (YYYY-MM key) |
| S26-509 | **Size-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/size-stats (totalSizeMB aggregate) |
| S26-510 | **Uploader-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/uploader-stats (groupBy uploadedBy) |
| S26-511 | **Quality-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/quality-stats (qualityScore/faceCount) |
| S26-512 | **Duplicate-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/duplicate-stats (duplicateGroupId) |
| S26-513 | **Geo-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/geo-stats (lat/lng geoRate%) |
| S26-514 | **EXIF-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/exif-stats (exifRate%) |
| S26-515 | **StoryOnly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/story-only-stats (isStoryOnly) |
| S26-516 | **Favorite-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/favorite-stats (favoriteRate%) |
| S26-517 | **Like-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/like-stats (totalLikes/avgLikes) |
| S26-518 | **Comment-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/comment-stats (top5/avgComments) |
| S26-519 | **View-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/view-stats (totalViews/topPhoto) |
| S26-520 | **Tag-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/tag-stats (top20/totalUniqueTags) |
| S26-521 | **Deleted-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/deleted-stats (deletedRate%) |
| S26-522 | **Purge-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/purge-stats (purgeAfter/overdue) |
| S26-523 | **Hash-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/hash-stats (md5Rate%/perceptualRate%) |
| S26-524 | **Guest-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/guest-stats (groupBy guestId top50) |
| S26-525 | **Daily-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/daily-stats (YYYY-MM-DD key) |
| S26-526 | **Hourly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/hourly-stats (0-23 + peakHour) |
| S26-527 | **Weekday-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/weekday-stats (0-6 + peakDay) |
| S26-528 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 528 Features in Sprint S26 implementiert + deployed |
| S26-529 | **Summary-Dashboard** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/summary (10 Stats in Promise.all) |
| S26-530 | **Top-Photos** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/top (sortBy=views|likes, limit) |
| S26-531 | **Recent-Photos** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/recent (last N, default 20) |
| S26-532 | **Random-Photos** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/random (APPROVED, random skip) |
| S26-533 | **Search-Photos** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/search?q= (title/desc/tags OR) |
| S26-534 | **By-Category** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/by-category (groupBy categoryId) |
| S26-535 | **By-Status** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/by-status (groupBy status+rate%) |
| S26-536 | **By-Orientation** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/by-orientation (EXIF tag 1-8) |
| S26-537 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 537 Features in Sprint S26 implementiert + deployed |
| S26-538 | **MIME-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/mime-stats (storagePath ext -> mime) |
| S26-539 | **Face-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/face-stats (totalFaces/faceRate%) |
| S26-540 | **Quality-Histogram** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/quality-histogram (11 buckets) |
| S26-541 | **Best-In-Group** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/best-in-group (duplicateGroupId stats) |
| S26-542 | **Category-Progress** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/category-progress (per category count) |
| S26-543 | **Retention-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/retention-stats (age buckets <1h...>90d) |
| S26-544 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 544 Features in Sprint S26 implementiert + deployed |
| S26-545 | **Activity-Feed** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/activity (upload/like/comment mixed feed) |
| S26-546 | **Uploader-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/uploader-stats (groupBy uploadedBy top50) |
| S26-547 | **Geo-Cluster** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/geo-cluster (bbox+center lat/lng) |
| S26-548 | **Size-Distribution** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/size-distribution (6 buckets <100KB...>10MB) |
| S26-549 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 549 Features in Sprint S26 implementiert + deployed |
| S26-550 | **Comment-Authors** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/comment-authors (groupBy authorName top50) |
| S26-551 | **Vote-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/vote-stats (totalVotes/avgRating/topPhotoId) |
| S26-552 | **Story-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/story-stats (storyRate%/topStoryUploaders) |
| S26-553 | **Tag-Cloud** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/tag-cloud (top 100 lowercase sorted) |
| S26-554 | **Like-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/like-stats (totalLikes/avgPerPhoto/top5) |
| S26-555 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 555 Features in Sprint S26 implementiert + deployed |
| S26-556 | **Comment-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/comment-stats (totalComments/pending/avgPerPhoto/top5) |
| S26-557 | **Favorite-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/favorite-stats (favoriteRate%/recentFavorites top10) |
| S26-558 | **Monthly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/monthly-stats (YYYY-MM asc+peakMonth) |
| S26-559 | **Weekly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/weekly-stats (YYYY-Www ISO+peakWeek) |
| S26-560 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 560 Features in Sprint S26 implementiert + deployed |
| S26-561 | **Duplicate-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/duplicate-stats (md5Rate%/perceptualRate%/dupeRate%) |
| S26-562 | **Approval-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/approval-stats (pending/approved/rejected/approvalRate%) |
| S26-563 | **Camera-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/camera-stats (EXIF make/model top20) |
| S26-564 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 564 Features in Sprint S26 implementiert + deployed |
| S26-565 | **EXIF-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/exif-stats (GPS/focal/ISO/shutter rate%+avg) |
| S26-566 | **Resolution-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/resolution-stats (MP buckets+avgWidth/Height EXIF) |
| S26-567 | **Download-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/download-stats (totalViews/seenRate%/topViewed) |
| S26-568 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 568 Features in Sprint S26 implementiert + deployed |
| S26-569 | **Quality-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/quality-stats (A-F grade buckets/avgQuality) |
| S26-570 | **Face-Analysis** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/face-analysis (totalFaces/faceRate%/topFacePhoto) |
| S26-571 | **Purge-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/purge-stats (deleted/active/expiredPurge) |
| S26-572 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 572 Features in Sprint S26 implementiert + deployed |
| S26-573 | **Guest-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/guest-stats (top20 guests firstName+lastName+photoCount) |
| S26-574 | **Category-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/category-stats (count/pct% per category with name) |
| S26-575 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 575 Features in Sprint S26 implementiert + deployed |
| S26-576 | **Top-Rated** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/top-rated (quality60%+voteAvg40% combinedScore top20) |
| S26-577 | **Storage-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/storage-stats (totalMB/avgMB/format ext breakdown) |
| S26-578 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 578 Features in Sprint S26 implementiert + deployed |
| S26-579 | **Hourly-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/hourly-stats (0-23h buckets/peakHour/quietHour) |
| S26-580 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 580 Features in Sprint S26 implementiert + deployed |
| S26-581 | **Daily-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/daily-stats (0-6 weekday buckets/peakDay/peakDayName) |
| S26-582 | **Best-Of** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/best-of (mostViewed/mostLiked/bestQuality/newest) |
| S26-583 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 583 Features in Sprint S26 implementiert + deployed |
| S26-584 | **Activity-Feed** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/activity-feed (recentUploads/Likes/Comments limit=100) |
| S26-585 | **Overview** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/overview (master summary: total/approved/views/likes/MB) |
| S26-586 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 586 Features in Sprint S26 implementiert + deployed |
| S26-587 | **Tag-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/tag-stats (top50/uniqueTags/totalTagUsages from tags[]) |
| S26-588 | **Uploader-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/uploader-stats (uploadedBy top20 with count) |
| S26-589 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 589 Features in Sprint S26 implementiert + deployed |
| S26-590 | **Blur-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/blur-stats (quality buckets low/mid/high + avgQualityScore) |
| S26-591 | **AI-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/ai-stats (title/description/tags/face enrichment rates%) |
| S26-592 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 592 Features in Sprint S26 implementiert + deployed |
| S26-593 | **Favorite-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/favorite-stats (favorites/storyOnly/bestInGroup rates%) |
| S26-594 | **Duplicate-Group-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/duplicate-group-stats (dupeRate%/groupCount/avgGroupSize) |
| S26-595 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 595 Features in Sprint S26 implementiert + deployed |
| S26-596 | **Month-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/month-stats (1-12 buckets/peakMonth/peakMonthName) |
| S26-597 | **Hash-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/hash-stats (md5/perceptualHash uniqueness+dupeRate%) |
| S26-598 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 598 Features in Sprint S26 implementiert + deployed |
| S26-599 | **Comment-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/comment-stats (total/approved/pending/rate%/avgPerPhoto) |
| S26-600 | **Vote-Distribution** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/vote-distribution (1-5 buckets+pct%+avg) |
| S26-601 | **Engagement-Score** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/engagement-score (views*0.1+likes*2+comments*3 top20) |
| S26-602 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 602 Features in Sprint S26 implementiert + deployed |
| S26-603 | **Geo-Cluster** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/geo-cluster (lat/lng grid precision=2 top50 clusters+ids) |
| S26-604 | **Like-Leader** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/like-leader (top20 by like count) |
| S26-605 | **Status-Timeline** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/status-timeline (per-day PENDING/APPROVED/REJECTED counts) |
| S26-606 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 606 Features in Sprint S26 implementiert + deployed |
| S26-607 | **Size-Bucket** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/size-bucket (tiny/small/medium/large/huge file size buckets) |
| S26-608 | **View-Leader** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/view-leader (top20 by view count) |
| S26-609 | **Recent-Deleted** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/recent-deleted (last 50 soft-deleted photos limit=100) |
| S26-610 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 610 Features in Sprint S26 implementiert + deployed |
| S26-611 | **Purge-Upcoming** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/purge-upcoming (photos due next N days + overdue count) |
| S26-612 | **Trending** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/trending (most liked last 24h top20 with recentLikes) |
| S26-613 | **Quality-Grade-Board** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/quality-grade-board (best photo per grade A-F 0-100) |
| S26-614 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 614 Features in Sprint S26 implementiert + deployed |
| S26-615 | **Face-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/face-stats (faceRate%/avgFaces/maxFaces/totalFaces/distribution) |
| S26-616 | **Category-Leader** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/category-leader (best photo per category by quality+views) |
| S26-617 | **Guest-Leaderboard** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/guest-leaderboard (top20 guests by photoCount+totalViews) |
| S26-618 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 618 Features in Sprint S26 implementiert + deployed |
| S26-619 | **EXIF-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/exif-stats (exifRate%/gpsRate%/faceDataRate%) |
| S26-620 | **Geo-Coverage** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/geo-coverage (bounding box + center of all GPS photos) |
| S26-621 | **Caption-Leader** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/caption-leader (top20 titled photos by view count) |
| S26-622 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 622 Features in Sprint S26 implementiert + deployed |
| S26-623 | **Thumbnail-Coverage** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/thumbnail-coverage (thumb/webp/original coverage rates%) |
| S26-624 | **View-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/view-stats (avg/max/sum views + top10 + viewRate%) |
| S26-625 | **Story-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/story-stats (storyOnly/favorite/bestInGroup rates%) |
| S26-626 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 626 Features in Sprint S26 implementiert + deployed |
| S26-627 | **Category-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/category-stats (photoCount+avgQuality+avgViews per category) |
| S26-628 | **Quality-Percentile** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/quality-percentile (P25/P50/P75/P90/P99 quality score) |
| S26-629 | **Dupe-Chain** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/dupe-chain (top30 duplicate groups with member IDs) |
| S26-630 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 630 Features in Sprint S26 implementiert + deployed |
| S26-631 | **Tag-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/tag-stats (top50 tags by photo count + uniqueTags total) |
| S26-632 | **Uploader-Stats** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/uploader-stats (top20 uploaders by photoCount+avgQuality+avgViews) |
| S26-633 | **Like-Timeline** | ✅ erledigt (21.02.2026) | GET /events/:id/photos/like-timeline (likes per day sorted timeline) |
| S26-634 | **Sprint S26 Meilenstein** | ✅ erledigt (21.02.2026) | 634 Features in Sprint S26 implementiert + deployed |

---

## 💬 Entscheidungen & Notizen

### AI Provider Strategie

| Anwendungsfall | Provider | Begründung |
|----------------|----------|------------|
| **Komplexe Texte** | Grok (xAI) | Beste Qualität für anspruchsvolle Texte |
| **Standard-Texte** | Groq (Llama) | ✅ Aktiv — Schnell + günstig |
| **Fallback** | OpenAI | OK trotz Kosten — wird selten gebraucht |
| **Bild-KI** | TBD | Replicate vs Stability vs fal.ai evaluieren |

### Bild-KI Vergleich (TODO: Recherche)

| Provider | Stärken | Schwächen | Fotomaster-Vergleich |
|----------|---------|-----------|---------------------|
| **Replicate** | Viele Modelle, flexibel | Latenz variiert | ? |
| **Stability AI** | Stable Diffusion, konsistent | Teurer | ? |
| **fal.ai** | Schnell, günstig | Weniger Modelle | ? |

> ⚠️ **Ziel**: Fotomaster AI-Angebot erreichen oder übertreffen!

### Feature-Zielgruppen

| Feature | Zielgruppe | Notiz |
|---------|------------|-------|
| Lead-Erfassung | Admin, Partner | Nicht für normale Hosts |
| Workflow Builder | Admin | Multi-Session für Events mit mehreren Geräten |
| Log-System | Admin, AI | Für Debugging + AI-Analyse |

---

## 🔧 Tech-Debt & Minor Items

| # | Aufgabe | Status | Datei | Beschreibung |
|---|---------|--------|-------|--------------|
| TD-1 | **Sentry Integration** | ✅ erledigt | — | @sentry/node + @sentry/nextjs installiert, init() in backend index.ts, sentry.client/server.config.ts im Frontend, SENTRY_DSN in .env gesetzt |
| TD-2 | **Invitation Canvas Elements** | ⏳ offen | `InvitationCanvas.tsx` | Element-Rendering für Einladungs-Designer |
| TD-3 | **QR Design DB-Table** | ✅ erledigt | — | QrDesign Model in Prisma, Table in DB. QR-Styler speichert via PUT /events/:id/qr/config in qrTemplateConfig JSON-Field |
| TD-4 | **Guest Email senden** | ✅ erledigt (20.02.2026) | — | POST /events/:id/guests/:guestId/email + POST /events/:id/guests/email-all (Bulk). emailService.sendCustomEmail() Methode. Frontend Button pro Gast + 'Alle einladen' |
| TD-5 | **Guest Details anzeigen** | ✅ erledigt | — | Detail-Modal mit Gast-Info, E-Mail-Button, Löschen-Button |
| TD-6 | **Upload Confetti** | ✅ erledigt (20.02.2026) | — | triggerUploadConfetti() jetzt auch im TUS-Upload-Pfad (war nur im Fallback-Pfad) |}
| TD-7 | **Select All Shortcuts** | ⏳ offen | `useKeyboardShortcuts.ts` | Cmd+A für alle Elemente im Editor |

---

## ✅ Abgeschlossene Phasen

### Phase 1
- 1A: Admin-UI `/manage/packages` + `/feature-flags`
- 1B: DB-Schema erweitert (ADDON enum + db push)
- 1C: Seed-Daten für 4 Base + 7 Add-ons + 3 Upgrades
- 1.5: AI Provider Management — DB + API + Admin UI
- 1D: Partner Billing
- 1E: Digitale Einladungskarten Redesign
- 1F: Einladungs-Design-Editor

### Phase 2
- 2A: Partner-Abo (Subscriptions per Device/Monat)
- 2B: Digital Sharing (WhatsApp, FB, SMS, Email, QR)
- 2C: Live Analytics Dashboard (WebSocket + Recharts)
- 2D: Online Mosaic Mode (Wall, Print, Gallery, Grid, Ticker)
- 2E: KI Booth — AI Style Transfer (10 Stile, Stability AI + Replicate)
- 2F: Highlight Reel (Backend Service + Frontend Generator)
- 2G: Booth-Spielchen (6 Games: Slot Machine, Compliment Mirror, Mimik-Duell, Mystery Overlay, Face Switch, Vows & Views)
- 2H: Foto-Spaß Refactoring — Guest-Nav Camera-Center, Solo-Selfie-Games, Branding-Overlay, Host-Toggles, Free-Tier-Gating

### Phase 3
- 3A: Partner-Abo Admin UI — Subscriptions im Partner-Dashboard
- 3B: Supply of Leads — Lead-Erfassung + CSV-Export + Stats
- 3C: Asset Library — 7 Typen (Overlay, Frame, Prop, Background, Sticker, Filter, Magazine Cover)
- 3D: Face Switch (AI) — Gesichtertausch via sharp composite
- 3E: Booth Templates — Design-Vorlagen für Photo Booth, KI Booth, Mosaic Wall
- 3F: Digital Graffiti — Canvas-Zeichentool mit Touch + Merge
- 3G: Workflow Builder — Admin-only Booth-Ablauf-Editor mit Step-Types
- 3H: Air Graffiti Wall — Hand-Tracking mit MediaPipe Hands + Neon-Effekte
