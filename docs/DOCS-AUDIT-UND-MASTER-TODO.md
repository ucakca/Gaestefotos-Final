# Docs Audit & Master-TODO — gästefotos.com

> Stand: 27. Februar 2026
> Zweck: Alle 58 aktiven MD-Dateien analysiert, Duplikate identifiziert, Status geprüft, Gesamt-TODO erstellt.

---

## 1. Themen-Cluster (58 aktive MD-Dateien)

### Cluster A: ÜBERSICHT & STRATEGIE (6 Dateien)

| Datei | Zeilen | Inhalt | Status |
|---|---|---|---|
| `MASTER-KONZEPT.md` | 826 | **Zentrales Dokument** — alle Entscheidungen, Architektur, Verbindungen | ⚠️ Stand Feb 2026, fehlt: Booth-Experience, Async Delivery, neue Routes |
| `INDEX.md` | 96 | Docs-Index, Einstiegspunkt | ⚠️ Veraltet — neue Docs fehlen |
| `README_DOCS.md` | 117 | Dokumentations-Übersicht | ⚠️ Veraltet — Stand Jan 2026 |
| `FEATURES.md` | 109 | Feature-Kurzübersicht (Rollen, Core, Tech) | ✅ Okay, aber minimalistisch |
| `FEATURES-GUIDE.md` | 533 | Ausführlicher Feature-Guide | ✅ Referenz, Stand Feb 2026 |
| `SALES-FEATURE-LISTE.md` | 306 | Vertriebsliste für Sales | ✅ Referenz |

**→ PROBLEM:** `INDEX.md`, `README_DOCS.md` und `MASTER-KONZEPT.md` sind alle "Einstiegspunkte" — **3 Dateien für denselben Zweck**. Und `FEATURES.md` vs `FEATURES-GUIDE.md` vs `SALES-FEATURE-LISTE.md` beschreiben Features 3x.

**→ AKTION:** `INDEX.md` und `README_DOCS.md` in `MASTER-KONZEPT.md` integrieren. `FEATURES.md` archivieren (zu dünn, `FEATURES-GUIDE.md` ist besser).

---

### Cluster B: AI & KI (6 Dateien)

| Datei | Zeilen | Inhalt | Status |
|---|---|---|---|
| `AI-STRATEGIE.md` | 236 | AI-Provider-Strategie, Kosten, Architektur | ⚠️ Stand **Juli 2025** — massiv veraltet! |
| `AI-OFFLINE-STRATEGIE.md` | 287 | Offline-AI Cache-System | ⚠️ Stand **Juli 2025** — veraltet |
| `AI-FEATURE-GATING-KONZEPT.md` | 282 | Feature Gating, Credits, Provider-Mapping | ✅ Feb 2026, aktuell |
| `AI-EFFEKTE-KATALOG.md` | 232 | Alle AI-Effekte (30 implementiert, Sprint 1-7) | ✅ Feb 2026, aktuell |
| `COMPETITOR-AI-BOOTH-ANALYSIS.md` | 222 | Wettbewerbsanalyse AI-Booths | ✅ Referenz |
| `FOTOMASTER-GAP-ANALYSE.md` | 288 | Gap-Analyse vs Fotomaster Cloud | ✅ Referenz |

**→ PROBLEM:** `AI-STRATEGIE.md` und `AI-OFFLINE-STRATEGIE.md` sind von **Juli 2025** — vor der gesamten AI-Implementierung. Seitdem hat sich alles geändert (14 Provider, 50+ Features, FAL.ai als Primär-Provider). `PHOTO-BOOTH-PLATFORM-PLAN.md` hat eine aktuellere AI-Sektion (6.1-6.7).

**→ AKTION:** `AI-STRATEGIE.md` und `AI-OFFLINE-STRATEGIE.md` → `archive/`. Die aktuelle AI-Strategie steht bereits in `PHOTO-BOOTH-PLATFORM-PLAN.md` Sektion 6 und `AI-EFFEKTE-KATALOG.md`.

---

### Cluster C: BOOTH & HARDWARE (4 Dateien)

| Datei | Zeilen | Inhalt | Status |
|---|---|---|---|
| `PHOTO-BOOTH-PLATFORM-PLAN.md` | 835 | **Mega-Dokument**: Booth-Architektur, Hardware, AI, Spiele, Phasen 1-8 | ✅ Feb 2026 |
| `BOOTH-EXPERIENCE-KONZEPT.md` | 528 | Avatar-Assistent, Spiele-Katalog, Async Delivery Flow | ✅ Feb 2026 (NEU) |
| `CUPS-DRUCKER-RECHERCHE.md` | 261 | Drucker-Setup CUPS + DNP | ✅ Abgeschlossen |
| `RUNPOD-COMFYUI-PLAN.md` | 356 | RunPod + ComfyUI für Cloud-AI | ⚠️ Geplant, noch nicht umgesetzt |

**→ PROBLEM:** `PHOTO-BOOTH-PLATFORM-PLAN.md` enthält AI-Strategie (Sektion 6), Spiele (Sektion 1.4), Drucker (Sektion 4.3-4.4), Offline (Sektion 3) — es ist ein Mega-Dokument das mit `BOOTH-EXPERIENCE-KONZEPT.md`, `AI-EFFEKTE-KATALOG.md` und `CUPS-DRUCKER-RECHERCHE.md` überlappt.

**→ AKTION:** Kein Split nötig — `PHOTO-BOOTH-PLATFORM-PLAN.md` ist das Booth-Master-Dokument. `BOOTH-EXPERIENCE-KONZEPT.md` ergänzt es (Avatar + neuer Flow). Querverweis ergänzen.

---

### Cluster D: ADMIN DASHBOARD (4 Dateien)

| Datei | Zeilen | Inhalt | Status |
|---|---|---|---|
| `ADMIN_DASHBOARD.md` | 380 | Technische Doku (Seiten, APIs, Permissions) | ⚠️ Stand Jan 2026, neue Seiten fehlen |
| `ADMIN_DASHBOARD_LAIEN.md` | 261 | Laien-Anleitung fürs Dashboard | ⚠️ Stand Jan 2026 |
| `ADMIN-DASHBOARD-AUDIT.md` | 106 | Audit-Ergebnis (19.02.2026) | ✅ Abgeschlossen |
| `ADMIN-DASHBOARD-DEEP-AUDIT.md` | 198 | Deep Functional Audit | ✅ Abgeschlossen |

**→ PROBLEM:** 4 Dateien zum selben Thema. Die Audits sind fertig und haben keine offenen Punkte. `ADMIN_DASHBOARD.md` und `ADMIN_DASHBOARD_LAIEN.md` sind veraltet.

**→ AKTION:** `ADMIN-DASHBOARD-AUDIT.md` und `ADMIN-DASHBOARD-DEEP-AUDIT.md` → `archive/` (erledigt). `ADMIN_DASHBOARD.md` updaten mit neuen Seiten (AI Jobs, AI Surfaces, Video Models, CDN Browser, Survey Prompts, Reference Images). `ADMIN_DASHBOARD_LAIEN.md` entsprechend aktualisieren.

---

### Cluster E: AUDITS & SECURITY (6 Dateien)

| Datei | Zeilen | Inhalt | Status |
|---|---|---|---|
| `AUDIT-360-GRAD.md` | 516 | 5-Phasen Elite-Audit | ✅ Abgeschlossen |
| `AUDIT-CROSSCHECK.md` | 394 | 3-Modell Gegenprüfung | ✅ Abgeschlossen |
| `AUDIT-MASTER-PLAN.md` | 166 | Konsolidierte Audit-Findings | ✅ Abgeschlossen |
| `AUDIT-STATUS-2026-02-18.md` | 211 | Re-Evaluation aller Audit-Punkte | ✅ Abgeschlossen |
| `SECURITY-AUDIT-PHASE3.md` | 129 | Security Audit Phase 3 | ✅ Abgeschlossen |
| `SECURITY-BADGES.md` | 94 | Security-Badges Recherche | ✅ Referenz |

**→ PROBLEM:** 4 Audit-Dateien, alle abgeschlossen, kein offener Punkt. Nehmen Platz in der aktiven Docs-Liste ein.

**→ AKTION:** Alle 4 Audit-Dateien + `SECURITY-AUDIT-PHASE3.md` → `archive/`. `SECURITY-BADGES.md` kann bleiben (Referenz). `AUDIT-STATUS-2026-02-18.md` ist der finale Stand — als einzige behalten oder ebenfalls archivieren.

---

### Cluster F: PLANUNG & TODOS (5 Dateien)

| Datei | Zeilen | Inhalt | Status |
|---|---|---|---|
| `TODO.md` | 63 | Aktuelle Aufgaben-Übersicht | ⚠️ Unvollständig — fehlt: Booth-Experience, Avatar, Async Delivery |
| `PHASE4-PLANUNG.md` | 332 | Dashboard Redesign & Event Wall | ✅ Abgeschlossen |
| `KIMI-AUFGABEN-QUEUE.md` | 266 | Kimi-spezifische Aufgaben-Queue | ✅ Abgeschlossen |
| `TASK-SPLIT-OPUS-KIMI.md` | 80 | Opus vs Kimi Aufgabenverteilung | ✅ Abgeschlossen (historisch) |
| `NACHT-SESSION-26-FEB-2026.md` | 162 | Session-Protokoll 26.02.2026 | ✅ Protokoll |

**→ PROBLEM:** `KIMI-AUFGABEN-QUEUE.md` und `TASK-SPLIT-OPUS-KIMI.md` sind Bot-spezifische historische Dokumente — nicht mehr relevant. `PHASE4-PLANUNG.md` ist abgeschlossen. `TODO.md` ist die einzige aktive TODO-Datei, aber unvollständig.

**→ AKTION:** `KIMI-AUFGABEN-QUEUE.md`, `TASK-SPLIT-OPUS-KIMI.md`, `PHASE4-PLANUNG.md` → `archive/`. `TODO.md` komplett neu schreiben mit aktuellem Stand. `NACHT-SESSION-26-FEB-2026.md` → `archive/` (Protokoll, einmalig).

---

### Cluster G: FEATURE-SPEZIFIKATIONEN (10 Dateien)

| Datei | Zeilen | Inhalt | Status |
|---|---|---|---|
| `MOSAIC_WALL_KONZEPT.md` | 367 | Mosaic Wall Architektur | ⚠️ 27 offene Punkte |
| `MOSAIC-UX-REDESIGN.md` | 75 | Mosaic UX Redesign-Vorschlag | ⚠️ Nur Konzept, überlappt mit Mosaic-Konzept |
| `LIVE_WALL_FEATURE.md` | 235 | Live Wall Feature-Spec | ⚠️ 13 offene Punkte |
| `WORKFLOW-BUILDER-REDESIGN.md` | 242 | Workflow Builder Redesign | ⚠️ 21 offene Punkte |
| `QR_TEMPLATES.md` | 244 | QR-Template SVG System | ✅ Referenz |
| `COHOSTS.md` | 120 | Co-Host System | ✅ Referenz |
| `STORIES.md` | 107 | Stories Feature | ✅ Referenz |
| `DATERANGEFILTER_FEATURE.md` | 347 | DateRange Filter | ✅ Abgeschlossen |
| `PRICING-STRATEGY.md` | 171 | Paket-/Preisstrategie | ✅ Finalisiert |
| `woocommerce-setup.md` | 187 | WooCommerce Integration | ⚠️ 8 offene Punkte |

**→ PROBLEM:** `MOSAIC_WALL_KONZEPT.md` + `MOSAIC-UX-REDESIGN.md` = 2 Dateien zum selben Feature. `DATERANGEFILTER_FEATURE.md` ist 347 Zeilen für ein erledigtes Feature.

**→ AKTION:** `MOSAIC-UX-REDESIGN.md` in `MOSAIC_WALL_KONZEPT.md` integrieren. `DATERANGEFILTER_FEATURE.md` → `archive/` (erledigt).

---

### Cluster H: TECHNISCHE REFERENZ (10 Dateien)

| Datei | Zeilen | Inhalt | Status |
|---|---|---|---|
| `AUTH_FLOWS.md` | 494 | Auth-System komplett | ✅ Referenz |
| `API_MAP.md` | 382 | API-Endpoint-Übersicht | ⚠️ Neue Endpoints fehlen |
| `DB_FIELD_MEANINGS.md` | 421 | Datenmodell-Dokumentation | ✅ Referenz |
| `DB_ISOLATION.md` | 89 | Staging vs Production DB | ✅ Referenz |
| `FEATURE_FLAGS.md` | 456 | Feature-Flag-System | ✅ Referenz |
| `EVENT_FEATURES_CONFIG.md` | 173 | Event Feature Config | ✅ Referenz |
| `EVENT_DESIGNCONFIG_AND_QR_TEMPLATE_CONFIG.md` | 150 | Design + QR Config | ✅ Referenz |
| `THEME_TOKENS_AND_ADMIN_SETTINGS.md` | 127 | Theme-System | ✅ Referenz |
| `TUS_ARCHITECTURE.md` | 391 | TUS Upload-Architektur | ✅ Referenz |
| `STORAGE_AND_BLUR_POLICY.md` | 66 | Storage/Blur Policies | ✅ Referenz |

**→ STATUS:** Alle sind Referenz-Dokumente, kein Handlungsbedarf. `API_MAP.md` sollte mit neuen Endpoints aktualisiert werden.

---

### Cluster I: OPS & DEPLOYMENT (5 Dateien)

| Datei | Zeilen | Inhalt | Status |
|---|---|---|---|
| `DEPLOYMENT.md` | 288 | Deploy-Anleitung | ⚠️ Veraltet — `deploy.sh` existiert jetzt |
| `DEPLOYMENT-HINWEIS.md` | 76 | Hinweis: 2 Verzeichnisse | ✅ Wichtig, kurz |
| `GIT_POLICY.md` | 76 | Git Regeln | ✅ Referenz |
| `TEST_GUIDE.md` | 189 | Test-Anleitung | ✅ Referenz |
| `BUGS.md` | 294 | Bug-Tracker | ⚠️ 15 offene Bugs |

**→ AKTION:** `DEPLOYMENT.md` updaten mit neuem `deploy.sh` Flow.

---

### Cluster J: SONSTIGES (2 Dateien)

| Datei | Zeilen | Inhalt | Status |
|---|---|---|---|
| `H6-MASTERPROMPT.md` | 115 | Prompt für Migration root→dedizierter User | ✅ Abgeschlossen |
| `H6-NON-ROOT-MIGRATION-PLAN.md` | 144 | Migration durchgeführt 16.02.2026 | ✅ Abgeschlossen |

**→ AKTION:** Beide → `archive/` (einmalige Migration, erledigt).

---

## 2. Duplikate & Überlappungen

| Thema | Betroffene Dateien | Empfehlung |
|---|---|---|
| **Einstiegspunkt / Index** | `MASTER-KONZEPT.md`, `INDEX.md`, `README_DOCS.md` | `INDEX.md` + `README_DOCS.md` → archivieren, `MASTER-KONZEPT.md` ist SSoT |
| **AI-Strategie** | `AI-STRATEGIE.md`, `AI-OFFLINE-STRATEGIE.md`, `PHOTO-BOOTH-PLATFORM-PLAN.md` §6, `AI-FEATURE-GATING-KONZEPT.md` | Alte 2 archivieren, aktuelle Info ist in Booth-Plan + Gating-Konzept |
| **Feature-Listen** | `FEATURES.md`, `FEATURES-GUIDE.md`, `SALES-FEATURE-LISTE.md` | `FEATURES.md` archivieren (zu dünn) |
| **Admin Dashboard** | 4 Dateien | 2 Audits archivieren, 2 Doku-Dateien updaten |
| **Audits** | 4 Audit-Dateien + Security | Alle archivieren (abgeschlossen) |
| **Mosaic** | `MOSAIC_WALL_KONZEPT.md`, `MOSAIC-UX-REDESIGN.md` | UX-Redesign in Konzept integrieren |
| **Planung/TODOs** | `TODO.md`, `PHASE4-PLANUNG.md`, `KIMI-AUFGABEN-QUEUE.md`, `TASK-SPLIT-OPUS-KIMI.md` | 3 archivieren, `TODO.md` neu schreiben |
| **Booth-Spiele** | `PHOTO-BOOTH-PLATFORM-PLAN.md` §1.4, `BOOTH-EXPERIENCE-KONZEPT.md` §3 | Querverweis, kein Duplikat (ergänzen sich) |

---

## 3. Archivierungs-Empfehlung

### → `archive/` verschieben (17 Dateien):

| Datei | Grund |
|---|---|
| `INDEX.md` | Durch `MASTER-KONZEPT.md` ersetzt |
| `README_DOCS.md` | Durch `MASTER-KONZEPT.md` ersetzt |
| `FEATURES.md` | Durch `FEATURES-GUIDE.md` ersetzt |
| `AI-STRATEGIE.md` | Juli 2025, komplett überholt |
| `AI-OFFLINE-STRATEGIE.md` | Juli 2025, komplett überholt |
| `ADMIN-DASHBOARD-AUDIT.md` | Abgeschlossen, 0 offene Punkte |
| `ADMIN-DASHBOARD-DEEP-AUDIT.md` | Abgeschlossen, 0 offene Punkte |
| `AUDIT-360-GRAD.md` | Abgeschlossen |
| `AUDIT-CROSSCHECK.md` | Abgeschlossen |
| `AUDIT-MASTER-PLAN.md` | Abgeschlossen |
| `AUDIT-STATUS-2026-02-18.md` | Abgeschlossen (finaler Stand) |
| `SECURITY-AUDIT-PHASE3.md` | Abgeschlossen |
| `PHASE4-PLANUNG.md` | Abgeschlossen |
| `KIMI-AUFGABEN-QUEUE.md` | Bot-spezifisch, erledigt |
| `TASK-SPLIT-OPUS-KIMI.md` | Bot-spezifisch, erledigt |
| `H6-MASTERPROMPT.md` | Einmalige Migration, erledigt |
| `H6-NON-ROOT-MIGRATION-PLAN.md` | Einmalige Migration, erledigt |
| `DATERANGEFILTER_FEATURE.md` | Feature komplett implementiert |
| `MOSAIC-UX-REDESIGN.md` | In `MOSAIC_WALL_KONZEPT.md` integrieren |
| `NACHT-SESSION-26-FEB-2026.md` | Einmaliges Protokoll |

**Ergebnis: 58 → ~38 aktive Dateien** (viel übersichtlicher)

---

## 4. Update-Bedarf (aktive Dateien)

| Datei | Was fehlt / veraltet |
|---|---|
| `MASTER-KONZEPT.md` | Booth-Experience-Konzept verlinken, Async Delivery, neue Routes (6 gemountet), TODO aktualisieren |
| `TODO.md` | Komplett neu schreiben (siehe Sektion 5) |
| `ADMIN_DASHBOARD.md` | 6 neue Seiten dokumentieren |
| `ADMIN_DASHBOARD_LAIEN.md` | Neue Seiten erklären |
| `API_MAP.md` | 6 neue Route-Gruppen (adminCdn, aiAsyncDelivery, aiSurveyPrompt, faceOff, faceSwapTemplates, referenceImage) |
| `DEPLOYMENT.md` | Neuen `deploy.sh` Flow dokumentieren |
| `AI-EFFEKTE-KATALOG.md` | Sprint 7 Status updaten |

---

## 5. MASTER-TODO (priorisiert)

### 🔴 PRIORITÄT 1 — SOFORT (Kern-Infrastruktur)

| # | Task | Dokument | Status | Beschreibung |
|---|---|---|---|---|
| T1 | **Docs aufräumen** | dieses Dokument | 🔄 in Arbeit | 17+ Dateien archivieren, Updates durchführen |
| T2 | **User-Testing AI-Features** | `TODO.md` | ⏳ Offen | Alle 30 AI-Effekte + 14 Spiele auf app/dash testen |
| T3 | **RunPod + ComfyUI Setup** | `RUNPOD-COMFYUI-PLAN.md` | ⏳ Offen | Account, Docker Image, Serverless Worker, FAL.ai Anbindung |
| T4 | **`/r/:shortCode` Ergebnis-Seite** | `BOOTH-EXPERIENCE-KONZEPT.md` §4 | ⏳ Offen | Frontend-Seite für Async Delivery (QR-Code Ziel) |

### 🟡 PRIORITÄT 2 — WICHTIG (Produkt-Features)

| # | Task | Dokument | Status | Beschreibung |
|---|---|---|---|---|
| T5 | **E-Mail/WhatsApp Delivery** | `BOOTH-EXPERIENCE-KONZEPT.md` §4.2 | ⏳ Offen | Transactional E-Mail, WhatsApp/SMS, DSGVO Opt-in |
| T6 | **Google Review Integration** | `BOOTH-EXPERIENCE-KONZEPT.md` §7 | ⏳ Offen | Rating Prompt + Google Review Redirect |
| T7 | **WooCommerce offene Punkte** | `woocommerce-setup.md` | ⚠️ 8 offen | Webhook-Stabilität, Paket-Sync, Abo-Verlängerung |
| T8 | **Workflow Builder Redesign** | `WORKFLOW-BUILDER-REDESIGN.md` | ⚠️ 21 offen | Visual Editor, Simulation, bessere UX |
| T9 | **Offene Bugs** | `BUGS.md` | ⚠️ 15 offen | Bug-Fixes priorisieren und abarbeiten |
| T10 | **Live Wall offene Punkte** | `LIVE_WALL_FEATURE.md` | ⚠️ 13 offen | Fehler + fehlende Features |

### 🟢 PRIORITÄT 3 — MITTELFRISTIG (Booth-Ökosystem)

| # | Task | Dokument | Status | Beschreibung |
|---|---|---|---|---|
| T11 | **Avatar MVP** | `BOOTH-EXPERIENCE-KONZEPT.md` §2 | ⏳ Offen | Clip-Bibliothek, State Machine, LLM Text-Bubbles |
| T12 | **Mini-Spiele (4 Basis)** | `BOOTH-EXPERIENCE-KONZEPT.md` §3 | ⏳ Offen | Hütchenspiel, RPS, Mimik-Duell, Blind Mimicry |
| T13 | **Booth Foundation (Offline-First)** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 1 | ⏳ Offen | workflow-runtime Package, Booth-API-Key, Offline-Queue |
| T14 | **Hardware-Integration Linux** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 2 | ⏳ Offen | gPhoto2, CUPS, DNP, Kiosk-Modus |
| T15 | **Mosaic Wall offene Punkte** | `MOSAIC_WALL_KONZEPT.md` | ⚠️ 27 offen | Hardware + Software Tasks |

### 🔵 PRIORITÄT 4 — LANGFRISTIG (Skalierung)

| # | Task | Dokument | Status | Beschreibung |
|---|---|---|---|---|
| T16 | **Booth-Hotspot + Provisioning** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 3 | ⏳ Offen | hostapd, Captive Portal, QR-Provisioning |
| T17 | **Avatar Upgrade (Echtzeit)** | `BOOTH-EXPERIENCE-KONZEPT.md` §2.5 | ⏳ Offen | Lip-Sync, Emotion Recognition |
| T18 | **360° Spinner + Drawbot Hardware** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 6 | ⏳ Offen | GoPro-Steuerung, Plotter |
| T19 | **Remote Management** | `PHOTO-BOOTH-PLATFORM-PLAN.md` Phase 7 | ⏳ Offen | Config Push, Analytics, Drucker-Monitoring |
| T20 | **Multi-Person Group Transform** | `TODO.md` | ⏳ Offen | Gruppen-Foto AI mit mehreren Gesichtern |
| T21 | **Instagram/Facebook Graph API** | `TODO.md` | ⏳ Offen | Host Business-Account Integration |
| T22 | **Security-Badges (SOC2, etc.)** | `SECURITY-BADGES.md` | ⏳ Offen | Zertifizierungen recherchieren + planen |

---

## 6. Empfohlene Dokument-Struktur (nach Aufräumen)

```
docs/
├── MASTER-KONZEPT.md              ← SSoT, Einstiegspunkt
├── TODO.md                        ← Aktuelle Aufgaben (aus Sektion 5)
├── BUGS.md                        ← Aktive Bug-Liste
│
├── ─── Produkt ───
├── FEATURES-GUIDE.md              ← Feature-Guide
├── SALES-FEATURE-LISTE.md         ← Sales/Vertrieb
├── PRICING-STRATEGY.md            ← Pakete & Preise
├── woocommerce-setup.md           ← WooCommerce Setup
│
├── ─── AI ───
├── AI-EFFEKTE-KATALOG.md          ← Alle 30+ AI-Effekte
├── AI-FEATURE-GATING-KONZEPT.md   ← Gating, Credits, Provider
├── COMPETITOR-AI-BOOTH-ANALYSIS.md ← Wettbewerbsanalyse
├── FOTOMASTER-GAP-ANALYSE.md      ← Gap-Analyse
├── RUNPOD-COMFYUI-PLAN.md         ← Cloud-AI Infrastruktur
│
├── ─── Booth ───
├── PHOTO-BOOTH-PLATFORM-PLAN.md   ← Booth Master-Dokument
├── BOOTH-EXPERIENCE-KONZEPT.md    ← Avatar + Spiele + Async
├── CUPS-DRUCKER-RECHERCHE.md      ← Drucker-Setup
│
├── ─── Features ───
├── MOSAIC_WALL_KONZEPT.md         ← Mosaic Wall
├── LIVE_WALL_FEATURE.md           ← Live Wall
├── WORKFLOW-BUILDER-REDESIGN.md   ← Workflow Builder
├── QR_TEMPLATES.md                ← QR Templates
├── COHOSTS.md                     ← Co-Hosts
├── STORIES.md                     ← Stories
│
├── ─── Technisch ───
├── AUTH_FLOWS.md                  ← Auth-System
├── API_MAP.md                     ← API-Endpoints
├── DB_FIELD_MEANINGS.md           ← Datenmodell
├── DB_ISOLATION.md                ← DB Staging/Prod
├── FEATURE_FLAGS.md               ← Feature Flags
├── EVENT_FEATURES_CONFIG.md       ← Event Config
├── EVENT_DESIGNCONFIG_AND_QR_TEMPLATE_CONFIG.md
├── THEME_TOKENS_AND_ADMIN_SETTINGS.md
├── TUS_ARCHITECTURE.md            ← Upload-System
├── STORAGE_AND_BLUR_POLICY.md     ← Storage/Blur
│
├── ─── Admin ───
├── ADMIN_DASHBOARD.md             ← Dashboard-Doku
├── ADMIN_DASHBOARD_LAIEN.md       ← Laien-Anleitung
│
├── ─── Ops ───
├── DEPLOYMENT.md                  ← Deploy-Anleitung
├── DEPLOYMENT-HINWEIS.md          ← Wichtiger Hinweis
├── GIT_POLICY.md                  ← Git-Regeln
├── TEST_GUIDE.md                  ← Test-Guide
├── SECURITY-BADGES.md             ← Security Badges
│
├── ─── Aktuell ───
├── DOCS-AUDIT-UND-MASTER-TODO.md  ← Dieses Dokument
│
├── archive/                       ← 249 + 20 archivierte Dateien
├── ops/                           ← Ops Runbooks
└── bot-knowledge/                 ← AI-Chat FAQ
```

**Ergebnis: 38 aktive Dateien** statt 58 — klare Struktur, keine Duplikate.

---

## 7. Windsurf TODO Analyse

Die aktuelle Windsurf TODO-Liste enthält:

| ID | Inhalt | Status | Bewertung |
|---|---|---|---|
| `admin-mount-routes` | 7 fehlende Routes gemountet | ✅ Done | Korrekt |
| `booth-experience-doc` | Booth-Experience-Konzept erstellt | ✅ Done | Korrekt |
| `docs-audit` | Docs analysieren | 🔄 In Progress | Dieses Dokument |
| `docs-consolidate` | Duplikate bereinigen | ⏳ Pending | Nächster Schritt |
| `docs-master-todo` | Master-TODO erstellen | ⏳ Pending | Dieses Dokument (Sektion 5) |
| `build-result-page` | `/r/:shortCode` bauen | ⏳ Pending | Richtige Priorität |
| `build-avatar-mvp` | Avatar MVP | ⏳ Pending | Richtig, aber erst nach Foundation |
| `build-mini-games` | Mini-Spiele | ⏳ Pending | Richtig, aber erst nach Avatar |

**Bewertung:** Die Windsurf-TODO ist korrekt für die aktuelle Session, aber zu kurzsichtig. Sie enthält keine Einträge für:
- User-Testing (T2)
- RunPod Setup (T3)
- WooCommerce (T7)
- Offene Bugs (T9)
- Booth Foundation (T13)

Die Master-TODO (Sektion 5) ist die vollständige Übersicht.

---

> *Nächster Schritt: Archivierung durchführen + TODO.md neu schreiben*
