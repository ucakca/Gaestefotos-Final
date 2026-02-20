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
