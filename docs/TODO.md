# gästefotos.com — Master-TODO

> Stand: 27. Februar 2026
> Quelle: Docs-Audit (`DOCS-AUDIT-UND-MASTER-TODO.md`) — alle 58 MD-Dateien analysiert, 20 archiviert, 38 aktiv.

---

## ✅ Abgeschlossen (Historie)

| Phase | Features | Zeitraum |
|-------|----------|----------|
| Phase 1–3 | Booth-Games, Partner-Abo, Leads, Asset Library, Face Switch, Payment, Presets, Graffiti, Workflow Builder, 360° Spinner, Air Graffiti, Drawbot | bis 02/2026 |
| Phase 4 | Dashboard Redesign, Event Wall, Gamification, KI-Kunst Flow, Hardware Inventar | 02/2026 |
| Phase 5 | AI Provider Setup (14 Provider), AI Cache, BG Removal, Style Transfer (16 Stile), Ollama, 30 AI-Effekte, 14 LLM-Spiele | 02/2026 |
| Sprint S26 | 400+ Features/Fixes: Bulk-Ops, CSV-Export, Stats, Gästeliste, Leaderboard, QR-Codes, Live-Polling | 20-21.02.2026 |
| Bug-Fixes | photo.url relativ→storagePath, CDN access, Face Swap, Trend Monitor, AiResultShare auth | 22.02.2026 |
| AI UI | Face Swap Templates (25 Portraits, CRUD), AI Test Lab, Action-Buttons, Delete Templates | 22.02.2026 |
| Sidebar | 3 KI-Gruppen, 5 neue Dashboard-Seiten (AI Jobs, Surfaces, Video Models, CDN, Face Swap) | 26.02.2026 |
| Infra | Repo↔Prod Sync (0 Diffs), Build-Pipeline (`deploy.sh`), 4× @ts-nocheck entfernt, 7 Routes gemountet | 27.02.2026 |
| Audits | 360°-Audit, Crosscheck, Security Phase 3 — alle abgeschlossen, archiviert | 02/2026 |
| Docs-Cleanup | 58→38 aktive Docs, 20 archiviert, Master-TODO erstellt | 27.02.2026 |

---

## 🔴 PRIORITÄT 1 — SOFORT

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T1 | **Docs Updates** | `MASTER-KONZEPT.md`, `API_MAP.md`, `DEPLOYMENT.md` | ⏳ | Neue Routes, Booth-Experience verlinken, deploy.sh dokumentieren |
| T2 | **User-Testing AI-Features** | — | ⏳ | Alle 30 AI-Effekte + 14 Spiele auf app/dash.gästefotos.com testen |
| T3 | **RunPod + ComfyUI Setup** | `RUNPOD-COMFYUI-PLAN.md` | ⏳ | Account, Docker Image, Serverless Worker, FAL.ai Anbindung |
| T4 | **`/r/:shortCode` Ergebnis-Seite** | `BOOTH-EXPERIENCE-KONZEPT.md` §4 | ⏳ | Frontend-Seite für Async Delivery (QR-Code Ziel, Polling, Download, Share) |

## 🟡 PRIORITÄT 2 — WICHTIG

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T5 | **E-Mail/WhatsApp Delivery + DSGVO** | `BOOTH-EXPERIENCE-KONZEPT.md` §4.2 | ⏳ | Transactional E-Mail, WhatsApp/SMS, DSGVO Opt-in Flow |
| T6 | **Google Review Integration** | `BOOTH-EXPERIENCE-KONZEPT.md` §7 | ⏳ | Rating → bei 4-5★ Google, bei 1-3★ internes Feedback |
| T7 | **WooCommerce offene Punkte (8)** | `woocommerce-setup.md` | ⚠️ | Webhook-Stabilität, Paket-Sync, Abo-Verlängerung |
| T8 | **Workflow Builder Redesign (21 offen)** | `WORKFLOW-BUILDER-REDESIGN.md` | ⚠️ | Visual Editor, Simulation, bessere UX |
| T9 | **Offene Bugs (15)** | `BUGS.md` | ⚠️ | Bug-Fixes priorisieren + abarbeiten |
| T10 | **Live Wall offene Punkte (13)** | `LIVE_WALL_FEATURE.md` | ⚠️ | Fehler + fehlende Features |

## 🟢 PRIORITÄT 3 — MITTELFRISTIG (Booth-Ökosystem)

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T11 | **KI-Avatar MVP** | `BOOTH-EXPERIENCE-KONZEPT.md` §2 | ⏳ | Clip-Bibliothek, State Machine, LLM Text-Bubbles, Gestik (kein Audio) |
| T12 | **Mini-Spiele (Basis: 4)** | `BOOTH-EXPERIENCE-KONZEPT.md` §3 | ⏳ | Hütchenspiel, RPS, Mimik-Duell, Blind Mimicry |
| T13 | **Booth Foundation (Offline-First)** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 1 | ⏳ | workflow-runtime, Booth-API-Key, Offline-Queue |
| T14 | **Hardware-Integration Linux** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 2 | ⏳ | gPhoto2 + Canon, CUPS + DNP, Kiosk-Modus |
| T15 | **Mosaic Wall offene Punkte (27)** | `MOSAIC_WALL_KONZEPT.md` | ⚠️ | Hardware + Software Tasks |
| T16 | **Multi-Person Group Transform** | — | ⏳ | Gruppen-Foto Face Swap mit mehreren Gesichtern |

## � PRIORITÄT 4 — LANGFRISTIG

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T17 | **Avatar-Galerie + Persönlichkeits-Slider** | `BOOTH-EXPERIENCE-KONZEPT.md` §2.2-2.3 | ⏳ | 7+ Avatare, Custom per Prompt, Slider (Humor/Flirt/Energie/etc.) |
| T18 | **Avatar Upgrade (Echtzeit Lip-Sync)** | `BOOTH-EXPERIENCE-KONZEPT.md` §2.5 | ⏳ | LivePortrait/SadTalker, Emotion Recognition |
| T19 | **Booth-Hotspot + Provisioning** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 3 | ⏳ | hostapd, Captive Portal, QR-Provisioning |
| T20 | **360° Spinner + Drawbot Hardware** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 6 | ⏳ | GoPro-Steuerung, Plotter-Integration |
| T21 | **Remote Management + Analytics** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 7 | ⏳ | Config Push, Session-Analytics, Drucker-Monitoring |
| T22 | **Instagram/Facebook Graph API** | — | ⏳ | Host Business-Account Integration |
| T23 | **Security-Badges (SOC2, etc.)** | `SECURITY-BADGES.md` | ⏳ | Zertifizierungen recherchieren |

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
| **Deploy** | `./deploy.sh backend` oder `./deploy.sh all` (type-check → build → sync → restart → verify) |
| **Docs** | 38 aktive + 269 archivierte MD-Dateien, SSoT = `MASTER-KONZEPT.md` |

---

## Dokument-Verzeichnis (38 aktive Dateien)

| Kategorie | Dateien |
|-----------|---------|
| **Übersicht** | `MASTER-KONZEPT.md`, `FEATURES-GUIDE.md`, `SALES-FEATURE-LISTE.md`, `PRICING-STRATEGY.md` |
| **AI** | `AI-EFFEKTE-KATALOG.md`, `AI-FEATURE-GATING-KONZEPT.md`, `COMPETITOR-AI-BOOTH-ANALYSIS.md`, `FOTOMASTER-GAP-ANALYSE.md`, `RUNPOD-COMFYUI-PLAN.md` |
| **Booth** | `PHOTO-BOOTH-PLATFORM-PLAN.md`, `BOOTH-EXPERIENCE-KONZEPT.md`, `CUPS-DRUCKER-RECHERCHE.md` |
| **Features** | `MOSAIC_WALL_KONZEPT.md`, `LIVE_WALL_FEATURE.md`, `WORKFLOW-BUILDER-REDESIGN.md`, `QR_TEMPLATES.md`, `COHOSTS.md`, `STORIES.md` |
| **Technisch** | `AUTH_FLOWS.md`, `API_MAP.md`, `DB_FIELD_MEANINGS.md`, `DB_ISOLATION.md`, `FEATURE_FLAGS.md`, `EVENT_FEATURES_CONFIG.md`, `EVENT_DESIGNCONFIG_AND_QR_TEMPLATE_CONFIG.md`, `THEME_TOKENS_AND_ADMIN_SETTINGS.md`, `TUS_ARCHITECTURE.md`, `STORAGE_AND_BLUR_POLICY.md` |
| **Admin** | `ADMIN_DASHBOARD.md`, `ADMIN_DASHBOARD_LAIEN.md` |
| **Ops** | `DEPLOYMENT.md`, `DEPLOYMENT-HINWEIS.md`, `GIT_POLICY.md`, `TEST_GUIDE.md`, `SECURITY-BADGES.md` |
| **Meta** | `TODO.md` (diese Datei), `DOCS-AUDIT-UND-MASTER-TODO.md`, `BUGS.md`, `woocommerce-setup.md` |
