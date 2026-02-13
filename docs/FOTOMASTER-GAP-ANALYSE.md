# Fotomaster Cloud vs. gästefotos.com — Gap-Analyse

> Stand: 13. Februar 2026 (aktualisiert)
> Quelle: https://cloud.fotomaster.com/en#pricing (i18n-Keys + Feature-Analyse)

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Bei uns vorhanden |
| ⚠️ | Teilweise vorhanden / anders gelöst |
| ❌ | Fehlt komplett |
| 🔵 | Fotomaster-exklusiv (Hardware-Software-Bundle) |

---

## 1. AI-Features (GRÖSSTE LÜCKE)

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **AI Face Switch (Faceswap)** | ✅ Cloud-basiert | ✅ `faceSwitch.ts` + `/api/booth-games/face-switch` | 🔴 Hoch |
| **AI Background Removal** | ✅ Cloud-basiert | ✅ `bgRemoval.ts` + `/api/booth-games/bg-removal` | 🔴 Hoch |
| **AI Draw Me** (Zeichnung → Kunst) | ✅ | ⚠️ via Style Effects (Style Transfer) | 🟡 Mittel |
| **AI Line 2 Life** (Strichzeichnung → Foto) | ✅ | ⚠️ via Style Effects | 🟡 Mittel |
| **AI Oldify** (Alterungs-Effekt) | ✅ | ✅ `aiStyleEffects.ts` (`ai_oldify`) | 🟡 Mittel |
| **AI Style Pop** (stilisierte Portraits) | ✅ | ✅ `aiStyleEffects.ts` (`ai_style_pop`) | 🟡 Mittel |
| **AI Modify** (GPT-Image basiert) | ✅ | ⚠️ via AI Provider System (OpenAI) | 🟡 Mittel |
| **AI Cartoons** | ✅ | ✅ `aiStyleEffects.ts` (`ai_cartoon`) | 🟡 Mittel |
| **AI Group Headshots** | ✅ | ❌ | 🟢 Niedrig |
| **Age & Gender Detection** | ✅ | ❌ | 🟢 Niedrig |
| **Face Attributes Detection** | ✅ | ❌ | 🟢 Niedrig |

### Status: ✅ Umgesetzt
- AI-Provider-System: `/manage/ai-providers` (inkl. Grok-Provider)
- Backend-Services: `faceSwitch.ts`, `bgRemoval.ts`, `aiStyleEffects.ts`
- API-Endpoints: `/api/booth-games/face-switch`, `/api/booth-games/bg-removal`, `/api/booth-games/style-effect`
- AI-Execution-Service: `aiExecution.ts` mit Provider-Resolution + Credit-Verbrauch
- Credit-System integriert (siehe Punkt 6)

---

## 2. SMS Sharing

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **SMS via Cloud** (eingebaut) | ✅ | ✅ `smsService.ts` + Twilio API | 🔴 Hoch |
| **SMS via Twilio** (BYOA) | ✅ | ✅ Eigene Twilio-Credentials konfigurierbar | 🟡 Mittel |
| **Virtual Phone Numbers** | ✅ (kaufbar) | ❌ | 🟡 Mittel |
| **SMS Templates** | ✅ | ⚠️ Default-Template konfigurierbar | 🟡 Mittel |
| **10DLC Campaign** | ✅ | ❌ | 🟢 Niedrig |
| **Inbound SMS** | ✅ | ❌ | 🟢 Niedrig |

### Status: ✅ Umgesetzt
- Backend: `smsService.ts` (Twilio REST API), `smsShare.ts` (API-Routen)
- DB: `SmsMessage` Modell mit Status-Tracking (PENDING/SENT/DELIVERED/FAILED)
- Admin-UI: `/manage/sms` mit Logs, Statistiken und Twilio-Konfiguration
- API: `/api/sms/send`, `/api/sms/admin/logs`, `/api/sms/admin/stats`, `/api/sms/admin/config`
- E-Mail Sharing: ✅ (Foto per E-Mail teilen, `email.ts`)
- WhatsApp Sharing: ⚠️ (Link-Sharing)
- QR-Code Sharing: ✅

---

## 3. Email Template Builder

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **Visueller Email-Builder** | ✅ Drag & Drop | ❌ | 🔴 Hoch |
| **White-Label E-Mails** | ✅ | ❌ | 🟡 Mittel |
| **E-Mail From/Reply-To** | ✅ konfigurierbar | ❌ | 🟡 Mittel |
| **E-Mail Sharing** (Foto per Mail) | ✅ | ✅ `email.ts` + `EmailShareLog` | 🔴 Hoch |
| **E-Mail History** | ✅ | ✅ `EmailShareLog` Modell mit Status-Tracking | 🟡 Mittel |

### Status: ⚠️ Teilweise umgesetzt
- ✅ E-Mail Foto-Sharing: Gast gibt E-Mail ein → erhält Foto-Link per Mail (`email.ts`)
- ✅ E-Mail History: `EmailShareLog` Modell mit Status (PENDING/SENT/DELIVERED/OPENED/BOUNCED/FAILED)
- ✅ E-Mail Templates: Admin-seitig (`/manage/email-templates`)
- ❌ Visueller Drag & Drop Builder noch nicht umgesetzt (Phase 4)

---

## 4. Gallery / Sharing Features

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **Online Gallery** (public/private) | ✅ | ✅ Event-Seite | — |
| **Gallery Passwort** | ✅ | ✅ Event-Passwort | — |
| **Gallery QR-Code** | ✅ | ✅ | — |
| **Gallery Embed Code** | ✅ (iframe) | ✅ `galleryEmbed.ts` + Admin-UI `/manage/embed` | 🟡 Mittel |
| **Gallery Custom Domain** | ✅ White Label | ⚠️ Partner White-Label | — |
| **Slideshow Mode** | ✅ (FMSlide) | ✅ `slideshow.ts` + Admin-UI `/manage/slideshow` | 🟡 Mittel |
| **Media Moderation** | ✅ | ✅ (`moderationRequired`) | — |
| **Download All** (ZIP) | ✅ | ✅ `downloads.ts` (Stream-basierter ZIP) | 🟡 Mittel |
| **Gallery Social Buttons** | ✅ | ❌ | 🟢 Niedrig |

### Was wir besser haben
- ✅ Mosaic Wall (Live-Ansicht mit WebSocket) — Fotomaster hat ähnlich, aber wir haben Print-Terminal
- ✅ Gästebuch (Audio + Photo + Text) — Fotomaster hat das nicht
- ✅ Stories — Fotomaster hat das nicht
- ✅ Face Search — Fotomaster hat Face Detection, aber kein Gast-basiertes Face Search
- ✅ Einladungskarten — Fotomaster hat keine digitalen Einladungen

---

## 5. White Label (erweitert)

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **White Label Domain** | ✅ Custom Domains | ⚠️ Partner-Konzept | — |
| **White Label E-Mail** | ✅ Custom From/Reply | ❌ | 🟡 Mittel |
| **White Label Gallery** | ✅ | ⚠️ Partner Branding | — |
| **White Label Meta/SEO** | ✅ | ❌ | 🟡 Mittel |
| **White Label Thumbnail** | ✅ | ❌ | 🟢 Niedrig |

### Was wir haben
- Partner-System mit Branded/White-Label Tiers ✅
- Logo + Farben konfigurierbar ✅
- Kein Custom-Domain-Routing (nur Konzept)

---

## 6. Credit-System / Pay-per-Use

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **Credit Balance** | ✅ | ✅ `CreditBalance` Modell + Admin-UI `/manage/credits` | 🔴 Hoch |
| **Buy Credits** | ✅ | ✅ `/api/admin/credits` (manuell + API) | 🔴 Hoch |
| **Auto-Recharge** | ✅ (ab <$10) | ❌ | 🟡 Mittel |
| **Credit Cost per AI Feature** | ✅ | ✅ `aiExecution.ts` — Credits pro AI-Call | 🔴 Hoch |
| **Sign-Up Credit Bonus** | ✅ | ❌ | 🟡 Mittel |

### Status: ✅ Umgesetzt
- DB: `CreditBalance` + `CreditTransaction` Modelle in Prisma
- API: `/api/admin/credits` — Balance abfragen, Credits hinzufügen, Transaktionen auflisten, User-Credits verwalten
- Admin-UI: `/manage/credits` mit Guthaben-Übersicht, Transaktions-Historie, Credit-Vergabe
- AI-Integration: `aiExecution.ts` prüft + verbraucht Credits pro AI-Feature-Aufruf
- Noch offen: Auto-Recharge, Stripe/PayPal Self-Service, Sign-Up Bonus

---

## 7. Workflow Builder (Runtime)

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **AI Workflow Builder** | ✅ (visuell + Runtime) | ⚠️ Nur visuell, keine Runtime | 🔴 Hoch |
| **Workflow Steps ausführen** | ✅ | ❌ | 🔴 Hoch |
| **Survey in Workflows** | ✅ | ❌ | 🟡 Mittel |
| **Survey Analytics** | ✅ | ❌ | 🟡 Mittel |

### Status bei uns
- ✅ Visueller Workflow Builder (admin-dashboard, React Flow)
- ✅ DB-Modell + Event-Zuordnung
- ❌ **Keine Runtime** — Workflows werden nirgends ausgeführt
- ❌ Keine Booth-App die den Workflow Step-für-Step abarbeitet

---

## 8. Print & Hardware

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **Print Queue** | ✅ FMPrint | ⚠️ Mosaic Print-Terminal | — |
| **Print Mode** (Copies, Format) | ✅ | ⚠️ Nur Sticker-Druck | 🟡 Mittel |
| **License Management** | ✅ Per-Device | ❌ | 🟢 Niedrig |
| **Software Activation** | ✅ | ❌ | 🟢 Niedrig |
| **Monitoring Folder** | ✅ | ❌ | 🟢 Niedrig |

### Was wir haben
- ✅ Print-Terminal für Mosaic Sticker
- ✅ Partner-Hardware-Registrierung (PRINT_TERMINAL, PHOTO_BOOTH, DISPLAY)
- ❌ Kein allgemeiner Print-Service (10×15, Layouts, etc.)
- ❌ Keine Software-Lizenz-Verwaltung (brauchen wir auch nicht — wir sind Cloud-only)

---

## 9. Video & Animation

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **Video Creation/Output** | ✅ | ❌ | 🟡 Mittel |
| **Animation Creation** | ✅ (GIF, Boomerang) | ❌ | 🟡 Mittel |
| **Soundtrack** | ✅ | ❌ | 🟢 Niedrig |
| **Voice Creation** | ✅ | ❌ | 🟢 Niedrig |

### Was wir haben
- ✅ Video-Uploads (Gäste können Videos hochladen)
- ❌ Keine serverseitige Video-/GIF-Erstellung
- ❌ Keine Boomerang/Animation-Effekte

---

## 10. Analytics & Tracking

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **Analytics Dashboard** | ✅ | ⚠️ Basic Event-Stats | 🟡 Mittel |
| **Activity Log** | ✅ | ❌ | 🟡 Mittel |
| **Hourly View** | ✅ | ❌ | 🟢 Niedrig |
| **Media Views Tracking** | ✅ | ⚠️ Visit-Count | 🟢 Niedrig |

---

## 11. Selfie Wi-Fi

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **Selfie Wi-Fi** (direkte Übertragung) | ✅ | ❌ | 🟡 Mittel |
| **Selfie Wi-Fi Moderation** | ✅ | ❌ | 🟡 Mittel |
| **AI Headshots via Selfie Wi-Fi** | ✅ | ❌ | 🟢 Niedrig |

### Konzept
Gäste verbinden sich mit einem speziellen WiFi-Hotspot → Fotos werden automatisch in die Gallery übertragen, ohne App/Upload.

---

## 12. Lead Distribution / Kontakt-Sammlung

| Feature | Fotomaster | gästefotos.com | Priorität |
|---------|-----------|----------------|-----------|
| **Lead Distribution Platform** | ✅ | ❌ | 🟡 Mittel |
| **Contact Collection** | ✅ mit DSGVO | ❌ | 🟡 Mittel |
| **Marketing Consent** | ✅ | ❌ | 🟡 Mittel |
| **Data Controller Compliance** | ✅ | ❌ | 🟡 Mittel |

### Konzept
Vor/nach dem Foto: Gast gibt Name + E-Mail ein → Host sammelt Leads für Marketing. Wichtig für B2B-Kunden (Messen, Brand Activations).

---

## Zusammenfassung: TOP 10 Features — Implementierungsstatus

| # | Feature | Status | Details |
|---|---------|--------|--------|
| 1 | **AI Face Switch / Background Removal** | ✅ Umgesetzt | `faceSwitch.ts`, `bgRemoval.ts`, `/api/booth-games/*` |
| 2 | **Credit-System** | ✅ Umgesetzt | `CreditBalance` + `CreditTransaction`, Admin-UI `/manage/credits` |
| 3 | **E-Mail Foto-Sharing** | ✅ Umgesetzt | `email.ts`, `EmailShareLog` Modell |
| 4 | **SMS Sharing** | ✅ Umgesetzt | `smsService.ts` (Twilio), Admin-UI `/manage/sms` |
| 5 | **Gallery Embed Code** | ✅ Umgesetzt | `galleryEmbed.ts`, Admin-UI `/manage/embed` |
| 6 | **Slideshow Mode** | ✅ Umgesetzt | `slideshow.ts`, Admin-UI `/manage/slideshow` |
| 7 | **AI Style Effects** (Oldify, Style Pop, Cartoon) | ✅ Umgesetzt | `aiStyleEffects.ts`, 6 Effekte verfügbar |
| 8 | **Download All (ZIP)** | ✅ Umgesetzt | `downloads.ts` (Stream-basierter ZIP-Export) |
| 9 | **Video/GIF/Boomerang-Erstellung** | 🟡 In Arbeit | Phase 4 — FFmpeg-basiert |
| 10 | **Lead Collection** | ✅ Umgesetzt | `leads.ts`, Frontend `/events/[id]/leads` |

---

## Was wir BESSER haben als Fotomaster

| Feature | gästefotos.com | Fotomaster |
|---------|---------------|-----------|
| **Mosaic Wall + Print Terminal** | ✅ Live WebSocket + Sticker-Druck | ⚠️ Ähnlich |
| **Gästebuch** (Audio + Foto + Text) | ✅ | ❌ |
| **Stories** | ✅ | ❌ |
| **Face Search** (Gast findet eigene Fotos) | ✅ | ❌ |
| **Digitale Einladungskarten** | ✅ Mit RSVP, Teilen, Kalender | ❌ |
| **Challenges / Foto-Spiele** | ✅ | ❌ |
| **Digital Graffiti** | ✅ Air Graffiti Wall | ✅ (als Software) |
| **Partner Billing** | ✅ Automatisierte Abrechnung | ❌ (nur Lizenz-basiert) |
| **Event-Passwort + Gästegruppen** | ✅ | ⚠️ Nur Gallery-Passwort |
| **WooCommerce Integration** | ✅ | ❌ |

---

## Implementierungs-Fortschritt

### Phase 1: Quick Wins ✅ ABGESCHLOSSEN
1. ✅ E-Mail Foto-Sharing (Gast → E-Mail → Foto-Link)
2. ✅ Gallery Embed Code (iframe + Script-Tag)
3. ✅ Download All als ZIP (Stream-basiert)
4. ✅ Slideshow Mode (Fullscreen Auto-Play)

### Phase 2: AI & Monetarisierung ✅ ABGESCHLOSSEN
5. ✅ Credit-System (DB-Modell, Admin-UI, AI-Integration)
6. ✅ AI Face Switch (Multi-Provider: Replicate, Stability, OpenAI)
7. ✅ AI Background Removal (Multi-Provider)
8. ✅ AI Style Effects (Cartoon, Oldify, Style Pop + 3 weitere)

### Phase 3: Kommunikation ✅ ABGESCHLOSSEN
9. ✅ SMS Sharing (Twilio + Admin-Dashboard)
10. ✅ Lead Collection (CRUD + CSV-Export + Stats)

### Phase 4: Advanced (noch offen)
11. 🟡 Video/GIF/Boomerang-Erstellung — IN ARBEIT
12. ❌ Visueller Email Template Builder
13. ❌ Workflow Runtime Engine
14. ❌ Selfie Wi-Fi Integration
