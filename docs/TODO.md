# gästefotos.com — Aufgaben-Übersicht

> Stand: 22.02.2026

---

## ✅ Abgeschlossen

| Phase | Features | Zeitraum |
|-------|----------|----------|
| Phase 1–3 | Booth-Games, Partner-Abo, Leads, Asset Library, Face Switch, Payment, Presets, Graffiti, Workflow Builder, 360° Spinner, Air Graffiti, Drawbot | bis 02/2026 |
| Phase 4 | Dashboard Redesign, Event Wall, Gamification, KI-Kunst Flow, Hardware Inventar | 02/2026 |
| Phase 5 | AI Provider Setup (Groq/Grok/OpenAI/fal.ai/Replicate), AI Cache, BG Removal, Style Transfer (16 Stile), Ollama | 02/2026 |
| Sprint S26 | 400+ Features/Fixes: Bulk-Ops, CSV-Export, Stats-Endpoints, Gästeliste, Leaderboard, QR-Codes, Live-Polling, etc. | 20-21.02.2026 |
| Bug-Fixes | photo.url relativ→storagePath (6 Services), CDN public access, Face Swap const→let, Trend Monitor apiKey decrypt, AiResultShare auth token | 22.02.2026 |
| AI UI | Face Swap Templates (25 Portraits, CRUD, Admin+Guest UI), AI Test Lab Upload Fix, Action-Buttons sichtbar, Delete für alle Templates | 22.02.2026 |

## 🔴 Offen — HIGH

| # | Feature | Beschreibung |
|---|---------|--------------|
| 1 | **TypeScript Build-Pipeline** | `src/` → `dist/` automatisch kompilieren (aktuell manuelle dist-Edits) |
| 2 | **Dev↔Prod Sync** | `/root/gaestefotos-app-v2/` (Dev) ↔ `/opt/gaestefotos/app/` (Prod) automatisieren |
| 3 | **User-Testing** | Vollständiger Test aller AI-Features auf app/dash.gästefotos.com |

## 🟡 Offen — MEDIUM

| # | Feature | Beschreibung |
|---|---------|--------------|
| 4 | **Multi-Person Group Transform** | Gruppen-Foto Face Swap mit mehreren Personen |
| 5 | **Processing-Animationen** | Engaging Animationen während AI-Verarbeitung |
| 6 | **StyleTransfer dist Fix** | `dist/services/styleTransfer.js` preprocessImage Syntax-Fehler |

## 🟢 Offen — LOW

| # | Feature | Beschreibung |
|---|---------|--------------|
| 7 | **Instagram/Facebook Graph API** | Host Business-Account Integration |
| 8 | **Unsplash/Pexels API** | Dynamische Template-Bilder |
| 9 | **Host Logo Overlay** | Premium: eigenes Logo als Branding-Overlay |

---

## Architektur

| Aspekt | Details |
|--------|---------|
| **Monorepo** | pnpm workspaces: frontend, backend, admin-dashboard, print-terminal |
| **Backend** | Express + Prisma + Socket.IO, Port 8001 |
| **Frontend** | Next.js, Port 3000 (app.gästefotos.com) |
| **Admin** | Next.js, Port 3001 (dash.gästefotos.com) |
| **Storage** | SeaweedFS (selbst-gehostet) |
| **AI** | 14 Provider (Grok, Groq, OpenAI, fal.ai, Replicate, etc.), 50 Feature-Mappings |
| **Prod-Pfad** | `/opt/gaestefotos/app/` |
| **Dev-Pfad** | `/root/gaestefotos-app-v2/` |
| **Deploy** | `rsync src → prod` + `next build` + `systemctl restart` |
