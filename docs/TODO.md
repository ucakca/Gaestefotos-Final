# gästefotos.com — Offene Aufgaben

> Stand: 13.02.2026 — Phase 1 + Phase 2 + Phase 3 + Phase 4 abgeschlossen

---

## 🔴 Phase 4 — Dashboard Redesign & Event Wall

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

| # | Bug | Status | Beschreibung |
|---|-----|--------|--------------|
| B1 | **Mosaic Tile Overlay** | ✅ gefixt | Hochgeladene Fotos hatten kein Zielbild-Overlay. Fix: `blendTargetOverlay()` in `mosaicEngine.ts` — blendet den entsprechenden Target-Image-Abschnitt auf jedes Tile. |

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
