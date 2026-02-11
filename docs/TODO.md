# gästefotos.com — Offene Aufgaben

> Stand: 11.02.2026 — Phase 1 + Phase 2 abgeschlossen

---

## 🔴 HIGH — Sofort umsetzbar, Business-relevant

| # | Feature | Status | Beschreibung |
|---|---------|--------|--------------|
| 1 | **Booth-Games & KI Booth Navigation** | ⏳ offen | Seiten existieren (`/events/[id]/booth-games`, `/ki-booth`, `/live-analytics`), aber Links fehlen im Host-Dashboard-Menü. Quick Win. |
| 2 | **Partner-Abo Admin UI** | ⏳ offen | API steht komplett (`/api/partners/:id/subscriptions`), Admin-Dashboard braucht UI zur Abo-Verwaltung. Blockiert Partner-Onboarding. |
| 3 | **Supply of Leads** | ⏳ offen | Lead-Erfassung bei Events + CRM-Export für Partner. Kern-Differenzierung zur Konkurrenz. |

---

## 🟡 MEDIUM — Wichtig für Produktreife

| # | Feature | Status | Beschreibung |
|---|---------|--------|--------------|
| 4 | **Asset Library** | ⏳ offen | Overlays, Rahmen, Props für Booth & Mosaic. Macht KI Booth und Mystery Overlay erst richtig nutzbar. |
| 5 | **Face Switch (AI)** | ⏳ offen | KI-basiertes Gesichtertauschen im Booth. Backend-Placeholder existiert, KI-Logik fehlt (face-api.js Erweiterung). |
| 6 | **Payment per Session** | ⏳ offen | B2C-Monetarisierung pro Booth-Einsatz. Sinnvoll erst wenn Hardware da. |
| 7 | **Presets/Templates** | ⏳ offen | Booth-Design-Vorlagen zum Auswählen → schnelleres Event-Setup für Partner. |

---

## 🟢 LOW — Hardware-abhängig / Zukunft

| # | Feature | Status | Beschreibung |
|---|---------|--------|--------------|
| 8 | **Digital Graffiti** | ⏳ offen | Touchscreen-Malen nach Foto am Booth. Braucht spezielle Hardware. |
| 9 | **Workflow Builder** | ⏳ offen | Admin-only Booth-Ablauf-Editor. Nützlich aber nicht kundenrelevant. |
| 10 | **360° Ground Spinner** | ⏳ offen | Hardware-Integration. Hardware muss erst existieren. |
| 11 | **Air Graffiti Wall** | ⏳ offen | Hardware + Software, sehr aufwändig. |
| 12 | **Drawbot** | ⏳ offen | Hardware + Robotik-Steuerung, größtes Projekt. |

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
