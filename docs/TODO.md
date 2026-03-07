# gästefotos.com — Master-TODO

> Stand: 7. März 2026
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
| T7 FAL.ai E2E | Alle AI-Features getestet + gefixt: LLM (8/8), Style Transfer, Face Swap, Video (wan-i2v), BG Removal | 01.03.2026 |
| T2 AI Quality | A1-A6 alle erledigt: Face Switch→fal.ai ✅, Model-Check ✅, ArcFace 512-dim ✅, InstantID ✅, Stability v1 deprecated, Replicate Steps 35 | 01.03.2026 |
| Infra Fixes | 12 Bug-Fixes: .env Keys, camelCase SQL, jsonb cast, DONE enum, fal.ai Queue-URLs, wan-i2v Modell, /v1.0 doppelt, isAiOnline, Email DB-Init, eventRecap kind, gzip | 01.03.2026 |
| Security Audit | FIX-1: AI-Job deviceId Filter, FIX-2: CSRF für alle /api Routes, FIX-3: IP-basiertes Upload-Limit, Quick-Wins (8 Items) | 05-06.03.2026 |
| ARCH Fixes | RunPod Service-Layer vereinheitlicht (shared extractOutputBuffer, Double-Submit-Bug gefixt), Qwen Workflow-Fix (text→prompt), 27 Unit-Tests, Upload-Limit-Anzeige für Gäste | 06.03.2026 |
| Optimierungen | photoStats.ts Refactor (-1022 Zeilen via Helper), pipelineRunner.ts atomare DB-Updates, ADMIN_2FA_REQUIRED=true, Alter RunPod-Endpoint gelöscht | 07.03.2026 |
| Inkonsistenz-Fixes | Multer 50→100MB (FB-02), visitCount `as any` entfernt (FB-05), publicRoutes vervollständigt (FB-07), GPS-EXIF-Filter DSGVO (S-06) | 07.03.2026 |
| Performance | P-03 Double-Event-Load eliminiert (validatedEventCache), P-05 Blur 512px by design bestätigt | 07.03.2026 |
| UX-Verbesserungen | UX-02 Upload-CTA im EventHero (5 Sprachen), UX-04 KI-Effekte-CTA-Banner auf Galerie, Upload-Limit-Bypass-Tests (6/6) | 07.03.2026 |
| Prod-Tests | 8/8 Services active, HTTP 200, CSRF ✅, Rate-Limit ✅, Auth 401 ✅, WooCommerce 403 ✅, RunPod 3 Worker, SSL valid, 206/206 Tests | 07.03.2026 |
| Services | Backend ✅, WebSocket ✅, Redis ✅, Ollama ✅, SMTP/Postfix ✅, Knowledge Store (114 Einträge geseedet) | 01.03.2026 |
| T9-T13 | SMS (Code ready, Twilio unconfigured), Email Share ✅, Gallery Embed ✅, ZIP Download ✅, Lead Collection 5 Endpoints ✅ | 01.03.2026 |
| T5+T14+T15 | Docs Update (MASTER-KONZEPT, API_MAP), Live Wall (+Content-Filter, Stats, Konfetti), Workflow Builder (Execution Log, 4-Tab-System) | 01.03.2026 |

---

## 🔴 PRIORITÄT 1 — SOFORT

### A) App & Platform (app.gästefotos.com)

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T1 | **User-Testing ALLE Features** | — | ⏳ | Alle 30 AI-Effekte, 14 LLM-Spiele, Face Search, Live Wall, Einladungen, QR-Styler, Galerie, Upload auf app/dash.gästefotos.com testen |
| T2 | **AI Quality Bugs (6 kritisch)** | `PHOTO-BOOTH-PLATFORM-PLAN.md` §11.2 | ✅ | A1-A6 alle erledigt (01.03.2026) |
| T3 | **Offene App-Bugs (3)** | `BUGS.md` | ✅ | ARCH-001: doppelte Funktionen eliminieren, ARCH-002: Design-Seite modernisieren/redirect, Unused Code entfernen |
| T4 | **WooCommerce offene Punkte (8)** | `woocommerce-setup.md` | ✅ | Backend + WordPress komplett: 14 Produkte mit SKUs, Webhook, eventCode Checkout-Feld, Admin Woo Inbox |
| T5 | **Docs Updates** | `MASTER-KONZEPT.md`, `API_MAP.md`, `DEPLOYMENT.md` | ✅ | MASTER-KONZEPT aktualisiert (neue Routes, Services, Sprint 22, WooCommerce Status), API_MAP 90+ Routes, Doc-Index Daten (01.03.2026) |

### B) KI-Infrastruktur

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T6 | **RunPod + ComfyUI Setup** | `RUNPOD-COMFYUI-PLAN.md` | ✅ | Endpoint `fkyvpdld673jrf` (EU A6000), Qwen Image Edit Model, 18 Workflows, Live-Test erfolgreich (35s, 800×528 PNG) |
| T7 | **FAL.ai Endpoint-Testing** | `AI-EFFEKTE-KATALOG.md` | ✅ | LLM 8/8, Style Transfer, Face Swap, Video (wan-i2v), BG Removal — alle E2E getestet (01.03.2026) |

### C) Async Delivery (App + Booth)

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T8 | **`/r/:shortCode` Ergebnis-Seite** | `BOOTH-EXPERIENCE-KONZEPT.md` §4 | ✅ | Frontend-Seite: Polling, Download (gästefotos.com-branded), Share — Google Review noch offen |

## 🟡 PRIORITÄT 2 — WICHTIG

### A) App & Platform

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T9 | **SMS Sharing testen + konfigurieren** | `FEATURES-GUIDE.md` §7 | ⚠️ | Code implementiert + getestet, Twilio Credentials fehlen noch |
| T10 | **E-Mail Sharing testen + konfigurieren** | `FEATURES-GUIDE.md` §8 | ✅ | SMTP aus DB konfiguriert, Email Share API getestet (01.03.2026) |
| T11 | **Gallery Embed + Slideshow testen** | `FEATURES-GUIDE.md` §9-10 | ✅ | Embed API getestet, iframe + script + link Varianten (01.03.2026) |
| T12 | **Bulk ZIP Download testen** | `FEATURES-GUIDE.md` §11 | ✅ | ZIP Download (Einzel + Bulk + All) getestet, archiver streaming (01.03.2026) |
| T13 | **Lead Collection testen** | `FEATURES-GUIDE.md` §12 | ✅ | 5 Endpoints getestet: Create, List, Stats, CSV-Export, Partner-Leads — LeadSource enum (7 Werte), Dedup by email (01.03.2026) |
| T14 | **Live Wall Erweiterungen (13)** | `LIVE_WALL_FEATURE.md` | ✅ | **13/13 komplett**: Content-Filter, Stats Counter, Konfetti, 5 Animationstypen, Shuffle, Leaderboard, Ken Burns, Floating Hearts, Comments, **Themed Overlays** (6 Typen: Konfetti/Herzen/Schnee/Sterne/Blasen/Partikel), **Sound-Effekte** (Web Audio ding bei neuen Fotos), **Admin-Fernsteuerung** (WallAdminControl Panel via `?admin=1`, WebSocket Relay, Ankündigungs-Overlay) (02.03.2026) |
| T15 | **Workflow Builder Redesign (21 offen)** | `WORKFLOW-BUILDER-REDESIGN.md` | ✅ | Alle 5 Phasen erledigt: automationTypes (7 Triggers, 11 Actions), AutomationBuilder (513Z), 4-Tab-System (⚡Automationen + 🔧Booth + 🔗Event-Zuweisung + 📋Execution Log), Backend Execution Log Endpoint (01.03.2026) |

### B) Delivery + Marketing

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T16 | **E-Mail/WhatsApp Delivery + DSGVO** | `BOOTH-EXPERIENCE-KONZEPT.md` §4.2 | ✅ | DSGVO E-Mail Opt-in im QuickUploadModal (localStorage Persistenz), photoDelivery Worker (approved photos → E-Mail an opted-in Gäste), Unsubscribe Endpoint (GET /api/guests/:id/unsubscribe mit HTML-Bestätigung), AI Job Emails mit Unsubscribe-Link, emailOptIn/emailOptInAt in Guest Model (02.03.2026) |
| T17 | **Google Review Integration** | `BOOTH-EXPERIENCE-KONZEPT.md` §7 | ✅ | Prisma GuestFeedback Model, 4 Backend-Endpoints (POST feedback, PATCH google-sent, GET stats, GET list), Frontend Rating-Flow auf /r/:code (5-Phasen: idle→rating→feedback/google→thank-you), Admin Feedback Dashboard (/manage/feedback) mit Verteilung + Google-Konversion (01.03.2026) |

## 🟢 PRIORITÄT 3 — MITTELFRISTIG

### A) Mosaic Wall (App-Feature)

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T18 | **Mosaic Wall Implementierung** | `MOSAIC_WALL_KONZEPT.md` | ✅ | ~5000 Zeilen: Backend (27 Endpoints, 799Z Engine mit CIE2000 Delta-E), Frontend (MosaicGrid 540Z, Wizard 378Z, PrintStation 648Z, LiveDisplay 248Z, Gallery 348Z, Calculator 179Z, Ticker 98Z, PrintUpload 220Z), Alle 5 Phasen komplett (01.03.2026) |

### B) Booth-Ökosystem

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T19 | **KI-Avatar MVP (Sophie/Viktor)** | `BOOTH-EXPERIENCE-KONZEPT.md` §2 | ⏳ | Braucht Video-Clips + physische Booth — Konzept vorhanden |
| T20 | **Mini-Spiele (Basis: 4)** | `BOOTH-EXPERIENCE-KONZEPT.md` §3 | ⏳ | Braucht T19 Avatar — Konzept vorhanden |
| T21 | **Booth Foundation (Offline-First)** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 1 | ⚠️ ~80% | booth-app (1520Z), boothSetup (354Z), workflow-runtime (1069Z XState), boothGames (1384Z), uploadQueue (IndexedDB), OfflineQueueIndicator. Offen: Electron-Packaging, Auto-Update |
| T22 | **Hardware-Integration Linux** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 2 | ⚠️ | hardware.ts (281Z), print-terminal (865Z). Braucht physische Hardware für gPhoto2 + CUPS |

### C) AI Erweiterungen

| # | Task | Dokument | Status | Beschreibung |
|---|------|----------|--------|--------------|
| T23 | **Multi-Person Group Transform** | — | ⏳ | face_switch in aiFeatureRegistry registriert, braucht fal.ai Multi-Face Endpoint |
| T24 | **QR Async Delivery Backend** | `PHOTO-BOOTH-PLATFORM-PLAN.md` §11.3 B2 | ⚠️ ~90% | /r/:shortCode Frontend (327Z), aiJobs + aiAsyncDelivery Backend, Polling, Branded Download/Share. Offen: Push-Notification bei Fertigstellung |

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
| **AI** | 7 Provider (Grok/xAI, Groq, OpenAI, fal.ai, RunPod/ComfyUI, Ollama, remove.bg), 18 Qwen Workflows + fal.ai Fallback |
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
