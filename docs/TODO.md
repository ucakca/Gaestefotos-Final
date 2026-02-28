# gästefotos.com — Master-TODO

> Stand: 28. Februar 2026
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
| Wizard-Fixes | 5 Bugs gefixt: Zeitplan, Wizard-Reihenfolge, Auto-Entitlement, Wizard-Neustart, Dashboard-Link | 28.02.2026 |
| T3 App-Bugs | ARCH-001/002 erledigt, Design-Seite→Redirect, dead code entfernt (designPresets.ts, useOfflineGallery.ts), BUGS.md 100% ✅ | 28.02.2026 |
| T4 WooCommerce (Backend) | eventCode-Generierung, WOOCOMMERCE_WEBHOOK_SECRET, 21 Events gefixt | 28.02.2026 |
| T6 RunPod (Vorbereitung) | AiJob Prisma Model + DB-Tabelle, runpodService.ts, aiJobWorker.ts, API Routes | 28.02.2026 |
| T8 Result Page | /r/:shortCode Frontend + Backend (Polling, Download, Share, Branding) | 28.02.2026 |

---

## 🔴 PRIORITÄT 1 — SOFORT

### A) App & Platform (app.gästefotos.com)

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T1 | **User-Testing ALLE Features** | — | ⏳ | Alle 30 AI-Effekte, 14 LLM-Spiele, Face Search, Live Wall, Einladungen, QR-Styler, Galerie, Upload auf app/dash.gästefotos.com testen |
| T2 | **AI Quality Bugs (6 kritisch)** | `PHOTO-BOOTH-PLATFORM-PLAN.md` §11.2 | ⏳ | A1: Face Swap sharp→fal.ai, A2: Face Detection Model-Check, A3: ArcFace 512-dim, A4: Identity Preservation, A5: Stability v1 deprecieren, A6: Replicate Steps erhöhen |
| T3 | **Offene App-Bugs (3)** | `BUGS.md` | ✅ | ARCH-001: doppelte Funktionen eliminieren, ARCH-002: Design-Seite modernisieren/redirect, Unused Code entfernen |
| T4 | **WooCommerce offene Punkte (8)** | `woocommerce-setup.md` | ✅ | Webhook-URL Alias, SKU-Sync, eventCode-Flow, Briefing-Email, Fehlerhandling, Admin Logs — alle 8 Punkte erledigt (WordPress-Seite: Produkte anlegen + Webhook konfigurieren noch offen) |
| T5 | **Docs Updates** | `MASTER-KONZEPT.md`, `API_MAP.md`, `DEPLOYMENT.md` | ⏳ | Neue Routes + Booth-Experience verlinken + deploy.sh + archivierte Docs-Referenzen aktualisieren |

### B) KI-Infrastruktur

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T6 | **RunPod + ComfyUI Setup** | `RUNPOD-COMFYUI-PLAN.md` | ⏳ | ~~Account~~, Docker Image, Serverless Worker, FAL.ai Anbindung — Backend-Code vorbereitet (AiJob Model, Worker, Routes) |
| T7 | **FAL.ai Endpoint-Testing** | `AI-EFFEKTE-KATALOG.md` | ⏳ | Echte API-Calls testen: Face Swap (fal-ai/inswapper), Video (Kling/Seedance), Style Transfer |

### C) Async Delivery (App + Booth)

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T8 | **`/r/:shortCode` Ergebnis-Seite** | `BOOTH-EXPERIENCE-KONZEPT.md` §4 | ✅ | Frontend-Seite: Polling, Download (gästefotos.com-branded), Share — Google Review noch offen |

## 🟡 PRIORITÄT 2 — WICHTIG

### A) App & Platform

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T9 | **SMS Sharing testen + konfigurieren** | `FEATURES-GUIDE.md` §7 | ⚠️ | Twilio-Config, Logs, Stats — Code existiert, ungetestet |
| T10 | **E-Mail Sharing testen + konfigurieren** | `FEATURES-GUIDE.md` §8 | ⚠️ | SendGrid/Postmark Config — Code existiert, ungetestet |
| T11 | **Gallery Embed + Slideshow testen** | `FEATURES-GUIDE.md` §9-10 | ⚠️ | Embed-Code, Slideshow-Mode — Code existiert, ungetestet |
| T12 | **Bulk ZIP Download testen** | `FEATURES-GUIDE.md` §11 | ⚠️ | Stream-basierter ZIP — Code existiert, ungetestet |
| T13 | **Lead Collection testen** | `FEATURES-GUIDE.md` §12 | ⚠️ | DSGVO-Consent, CSV-Export — Code existiert, ungetestet |
| T14 | **Live Wall Erweiterungen (13)** | `LIVE_WALL_FEATURE.md` | ⚠️ | Filter, Slideshow-Mode, Themed Overlays, Admin-Control |
| T15 | **Workflow Builder Redesign (21 offen)** | `WORKFLOW-BUILDER-REDESIGN.md` | ⚠️ | 22/38 Steps nicht ausführbar, Dual-Tab UX, Simulation |

### B) Delivery + Marketing

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T16 | **E-Mail/WhatsApp Delivery + DSGVO** | `BOOTH-EXPERIENCE-KONZEPT.md` §4.2 | ⏳ | Transactional E-Mail, WhatsApp/SMS für AI-Ergebnisse, DSGVO Opt-in |
| T17 | **Google Review Integration** | `BOOTH-EXPERIENCE-KONZEPT.md` §7 | ⏳ | Rating → bei 4-5★ Google, bei 1-3★ internes Feedback |

## 🟢 PRIORITÄT 3 — MITTELFRISTIG

### A) Mosaic Wall (App-Feature)

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T18 | **Mosaic Wall Implementierung (27 offen)** | `MOSAIC_WALL_KONZEPT.md` | ⚠️ | Datenmodell existiert, Frontend+Backend+Live-Display+Print fehlt |

### B) Booth-Ökosystem

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T19 | **KI-Avatar MVP (Sophie/Viktor)** | `BOOTH-EXPERIENCE-KONZEPT.md` §2 | ⏳ | Clip-Bibliothek, State Machine, LLM Text-Bubbles, Gestik (kein Audio) |
| T20 | **Mini-Spiele (Basis: 4)** | `BOOTH-EXPERIENCE-KONZEPT.md` §3 | ⏳ | 3-Schichten: Game Engine + Game UI + Avatar Clips |
| T21 | **Booth Foundation (Offline-First)** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 1 | ⏳ | Electron, workflow-runtime, Booth-API-Key, Offline-Queue |
| T22 | **Hardware-Integration Linux** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 2 | ⏳ | gPhoto2 + Canon, CUPS + DNP, Kiosk-Modus |

### C) AI Erweiterungen

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T23 | **Multi-Person Group Transform** | — | ⏳ | Gruppen-Foto Face Swap mit mehreren Gesichtern |
| T24 | **QR Async Delivery Backend** | `PHOTO-BOOTH-PLATFORM-PLAN.md` §11.3 B2 | ⏳ | AI-Request → ShortCode → QR → Ergebnis in Galerie wenn fertig |

## 🔵 PRIORITÄT 4 — LANGFRISTIG

### A) App

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T25 | **Instagram/Facebook Graph API** | — | ⏳ | Host Business-Account Integration |
| T26 | **Host Self-Service AI-Konfigurator** | `PHOTO-BOOTH-PLATFORM-PLAN.md` §11.3 B1b | ⏳ | Host konfiguriert AI selbst (ohne Admin) |
| T27 | **Security-Badges (SOC2, etc.)** | `SECURITY-BADGES.md` | ⏳ | Zertifizierungen |

### B) Booth

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T28 | **Avatar-Galerie + Persönlichkeits-Slider** | `BOOTH-EXPERIENCE-KONZEPT.md` §2.2-2.3 | ⏳ | 7+ Avatare, Custom, Slider |
| T29 | **Avatar Upgrade (Echtzeit Lip-Sync)** | `BOOTH-EXPERIENCE-KONZEPT.md` §2.5 | ⏳ | LivePortrait/SadTalker, Emotion Recognition |
| T30 | **Booth-Hotspot + Provisioning** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 3 | ⏳ | hostapd, Captive Portal |
| T31 | **360° Spinner + Drawbot Hardware** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 6 | ⏳ | GoPro-Steuerung, Plotter |
| T32 | **Remote Management + Analytics** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 7 | ⏳ | Config Push, Session-Analytics |

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
