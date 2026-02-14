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
| AI-5 | **AiFeatureMapping DB** | ⏳ offen | LOW | Feature→Provider Zuordnungen in Admin-Dashboard anlegen |

### AI Backend Erweiterungen

| # | Aufgabe | Status | Priorität | Beschreibung |
|---|---------|--------|-----------|--------------|
| AI-6 | **Warm-Up Endpoint** | ✅ erledigt | — | `POST /api/ai/cache/warm-up` implementiert |
| AI-7 | **Cache-Stats Endpoint** | ✅ erledigt | — | `GET /api/ai/cache/stats` + `/online-status` + `DELETE /cache` |
| AI-8 | **Ollama Integration** | ⏳ offen | LOW | Lokaler LLM-Fallback auf Server (Llama 3.1/3.3) |
| AI-9 | **Redis AOF Persistenz** | ⏳ offen | LOW | Redis-Config für persistenten AI-Cache |

### AI Admin Dashboard

| # | Aufgabe | Status | Priorität | Beschreibung |
|---|---------|--------|-----------|--------------|
| AI-10 | **Cache-Verwaltung UI** | ✅ erledigt | — | `/system/ai-cache` mit Stats, Warm-Up, Clear, Event-Type-Auswahl |
| AI-11 | **Provider-Monitoring** | ⏳ offen | LOW | API-Status, Latenz, Fehlerrate pro Provider |

### Bild-KI Features (Cloud-only)

| # | Aufgabe | Status | Priorität | Beschreibung |
|---|---------|--------|-----------|--------------|
| AI-12 | **Bild-KI Provider** | ⏳ offen | MEDIUM | Replicate, Stability AI, oder fal.ai evaluieren |
| AI-13 | **BG Removal** | ⏳ offen | MEDIUM | Hintergrund entfernen für Booth-Fotos |
| AI-14 | **AI Oldify/Cartoon** | ⏳ offen | LOW | Alterungs- und Cartoon-Effekte |
| AI-15 | **Style Transfer** | ⏳ offen | LOW | Erweiterte Kunststile (über aktuelle 10 hinaus) |

### Zusammenfassung AI

| Kategorie | Erledigt | Offen |
|-----------|----------|-------|
| Provider Setup | 2 | 3 |
| Backend | 2 | 2 |
| Admin UI | 1 | 1 |
| Bild-KI | 0 | 4 |
| **Gesamt** | **5** | **10** |

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
| NF-1 | **Admin Log-System** | ⏳ offen | HIGH | Umfangreiches Logging mit Filter-Funktion. Wichtig für Event-Debugging! Zeigt was passiert wenn Buttons gedrückt werden. Für AI-Analyse und Troubleshooting. |
| NF-2 | **Workflow Builder Erweiterung** | ⏳ offen | HIGH | Alle existierenden Workflows über Builder bearbeitbar. Fixe Workflows sperren mit Entsperr-Option. Multi-Session Support für Events mit mehreren Geräten. Auch für `app.gästefotos.com` aktiv. |
| NF-3 | **SMS Sharing** | ⏳ offen | MEDIUM | Noch zu besprechen: Wie funktioniert SMS-Versand? Gateway? Kosten? |
| NF-4 | **Face Recognition Erweiterung** | ⏳ offen | MEDIUM | Face-Api/DeepFace erweitern — bessere Genauigkeit, mehr Features |
| NF-5 | **Storage Subdomain** | ⏳ offen | LOW | Neue Subdomain für Zugriff auf Gäste-Speicher. USB-Export Möglichkeit. |

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
| TD-1 | **Sentry Integration** | ⏳ offen | `ErrorBoundary.tsx` | Production Error-Tracking einrichten |
| TD-2 | **Invitation Canvas Elements** | ⏳ offen | `InvitationCanvas.tsx` | Element-Rendering für Einladungs-Designer |
| TD-3 | **QR Design DB-Table** | ⏳ offen | `events.ts` | `qrDesign` Table fehlt im Schema, läuft auf Mock |
| TD-4 | **Guest Email senden** | ⏳ offen | `guests/page.tsx` | E-Mail-Funktion für Gäste implementieren |
| TD-5 | **Guest Details anzeigen** | ⏳ offen | `guests/page.tsx` | Detail-Modal für Gäste |
| TD-6 | **Upload Confetti** | ⏳ offen | `UploadButton.tsx` | Confetti-Animation bei Upload wieder aktivieren |
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
