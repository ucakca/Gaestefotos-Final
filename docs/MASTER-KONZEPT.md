# gästefotos.com — Master-Konzept (Single Source of Truth)

> Stand: 19. Februar 2026
> Zweck: **Zentrales Dokument** — alle Entscheidungen, Verbindungen, Architekturen und offene Punkte an EINEM Ort.
> Regel: Wenn etwas hier nicht steht oder hier nicht verlinkt ist, existiert es nicht.

---

## Inhaltsverzeichnis

1. [Produkt-Übersicht](#1-produkt-übersicht)
2. [Rollen-System](#2-rollen-system)
3. [System-Architektur & Verbindungen](#3-system-architektur--verbindungen)
4. [Paket- & Preisstrategie](#4-paket--preisstrategie)
5. [AI-System (Features, Gating, Energie)](#5-ai-system)
6. [Event-Briefing & Kunden-Kommunikation](#6-event-briefing--kunden-kommunikation)
7. [Foto-Qualität & Moderation](#7-foto-qualität--moderation)
8. [WooCommerce-Integration](#8-woocommerce-integration)
9. [Partner-System](#9-partner-system)
10. [Photo Booth Platform](#10-photo-booth-platform)
11. [Workflow Builder](#11-workflow-builder)
12. [Entscheidungs-Register](#12-entscheidungs-register)
13. [Sprint-Status & Roadmap](#13-sprint-status--roadmap)
14. [Dokument-Index (alle MD-Files)](#14-dokument-index)

---

## 1. Produkt-Übersicht

**gästefotos.com** ist eine All-in-One Foto-Event-Plattform:

- **B2C**: Hosts buchen Pakete (Free/Basic/Smart/Premium) + Addons
- **B2B**: Partner arbeiten unter gästefotos.com Branding (Tupperware-Modell)
- **Hardware**: Photo Booth, Mirror Booth, KI Booth, Drawbot, Mosaic Wall, 360° Spinner
- **AI**: 14 LLM-Spiele, 14 Bild/Video/GIF-Effekte, 24 Kunststile
- **Kern-USP**: Smartphone + Booth = ein Stream. Face Search für alle. AI-Erlebnisse.

### Subdomains / Frontends

| Subdomain | Zweck | Tech | Code-Pfad |
|-----------|-------|------|-----------|
| **app.gästefotos.com** | Gäste-App (Event-Galerie, Upload, AI-Features) | Next.js 14 | `packages/frontend/` |
| **dash.gästefotos.com** | Host-Dashboard + Admin-Dashboard | Next.js 14 (gleiche Codebase) | `packages/frontend/` |
| **api.gästefotos.com** | Backend API | Express + Prisma | `packages/backend/` |
| **gästefotos.com** | Marketing-Website + WooCommerce Shop | WordPress | extern (Plesk) |
| **Booth-App** | Electron Booth-Software (offline-fähig) | Electron + Next.js | `packages/booth-app/` |
| **Print-Terminal** | Druckstation für Mosaic/Photo Booth | Electron | `packages/print-terminal/` |

### Verbindungen zwischen Frontends

```
gästefotos.com (WordPress/WooCommerce)
    │
    │ Webhook (order.paid)
    ▼
api.gästefotos.com (Backend)
    │
    ├── serves → app.gästefotos.com (Gäste sehen Event, laden Fotos hoch, nutzen AI)
    ├── serves → dash.gästefotos.com (Host verwaltet Event, Admin verwaltet System)
    ├── serves → Booth-App (Electron, offline-fähig, synced wenn online)
    └── serves → Print-Terminal (Druckaufträge)
    
Socket.IO: Echtzeit zwischen allen Clients (Galerie-Updates, Mosaic, Analytics)
```

---

## 2. Rollen-System

### Aktuelle Rollen im Code

| Rolle | Prisma `User.role` | Beschreibung | Kann was? |
|-------|-------------------|--------------|-----------|
| **ADMIN** | `ADMIN` | Systemadministrator (du) | Alles. Pakete, Partner, Events, AI-Config, Feature-Flags, Impersonation |
| **PARTNER** | `PARTNER` | Partner-Mitarbeiter (automatisch upgraded von HOST) | Eigene Events verwalten, Hardware, Team, Billing |
| **HOST** | `HOST` | Endkunde / Event-Ersteller | Eigenes Event verwalten, Galerie moderieren, Gäste einladen |
| **Gast** | — (kein User-Account) | Anonymer Event-Teilnehmer | Fotos/Videos hochladen, AI nutzen, Gästebuch schreiben |

### Partner-Unter-Rollen (PartnerMemberRole)

| Rolle | Prisma `PartnerMemberRole` | Beschreibung |
|-------|---------------------------|--------------|
| **OWNER** | `OWNER` | Voller Zugriff + Billing |
| **MANAGER** | `MANAGER` | Events + Hardware verwalten |
| **OPERATOR** | `OPERATOR` | Vor-Ort-Betrieb (Booth-Setup, QR-Scan) |

### SOLL-Zustand (geplant)

| Rolle | Beschreibung | AI-Config? | Event-Briefing? | Booth-Setup? |
|-------|-------------|------------|-----------------|--------------|
| **Admin** | System-Admin | Ja (alles) | Ja (alles) | Ja |
| **Partner (OWNER)** | Partner-Chef | Ja (eigene Events) | Ja (prüft + finalisiert) | Ja |
| **Partner (MANAGER)** | Partner-Manager | Ja (zugewiesene Events) | Ja (prüft) | Ja |
| **Partner (OPERATOR)** | Techniker vor Ort | Nein | Nein | Ja (QR-Scan) |
| **Host** | Endkunde | Nein (nur Briefing ausfüllen) | Ja (ausfüllen) | Nein |
| **Gast** | Event-Teilnehmer | Nein | Nein | Nein |

### Berechtigungs-Matrix (AI-Features)

| Aktion | Admin | Partner (OWNER/MANAGER) | Host | Gast |
|--------|-------|------------------------|------|------|
| AI-Features pro Paket definieren | ✅ | ❌ | ❌ | ❌ |
| AI-Features pro Event konfigurieren | ✅ | ✅ (eigene Events) | ❌ | ❌ |
| Event-Briefing ausfüllen | ✅ | ✅ | ✅ | ❌ |
| Custom Prompts bearbeiten | ✅ | ✅ | ❌ | ❌ |
| AI-Features nutzen | ✅ | ✅ | ✅ | ✅ (mit Energie) |
| Energie-Config pro Event ändern | ✅ | ✅ | ❌ | ❌ |
| Internes Cost-Dashboard sehen | ✅ | ❌ | ❌ | ❌ |

### Code-Referenzen (Rollen)

- **User Model**: `packages/backend/prisma/schema.prisma` → `model User` (role: ADMIN | PARTNER | HOST)
- **Auth Middleware**: `packages/backend/src/middleware/auth.ts` → `requireRole()`
- **Partner Model**: `packages/backend/prisma/schema.prisma` → `model Partner`, `model PartnerMember`
- **Partner Routes**: `packages/backend/src/routes/partners.ts` (CRUD, Members, Hardware, Billing, Stats)
- **Gast-Zugriff**: Cookie-basiert (`hasEventAccess()`), kein JWT nötig

---

## 3. System-Architektur & Verbindungen

### Backend Entry Point

`packages/backend/src/index.ts` — Alle Route-Mounts:

| Mount-Pfad | Route-Datei | Beschreibung |
|-----------|-------------|--------------|
| `/api/auth` | `routes/auth.ts` | Login, Register, Password Reset, WordPress SSO |
| `/api/events` | `routes/events.ts` | Event CRUD, Slug-Lookup, Storage, Traffic |
| `/api/events` | `routes/eventQr.ts` | QR-Config, Export (PNG/PDF) |
| `/api/events` | `routes/eventDesign.ts` | Cover-Image Upload, Design-Config |
| `/api/events` | `routes/eventAiConfig.ts` | **AI-Feature Gating API** (Sprint 7) |
| `/api/events` | `routes/cohosts.ts` | Co-Host Management |
| `/api/photos` | `routes/photos.ts` | Upload, Moderation, Download, Bulk |
| `/api/videos` | `routes/videos.ts` | Video Upload, Streaming, Download |
| `/api/guests` | `routes/guests.ts` | Gästeliste |
| `/api/categories` | `routes/categories.ts` | Album/Kategorie Management |
| `/api/stories` | `routes/stories.ts` | Stories (Instagram-Style) |
| `/api/statistics` | `routes/statistics.ts` | Event-Analytics |
| `/api/booth-games` | `routes/boothGames.ts` | **AI-Spiele + Effekte (14+14)** |
| `/api/partners` | `routes/partners.ts` | Partner CRUD, Members, Hardware, Billing |
| `/api/ai` | `routes/aiRoutes.ts` | AI Chat, Style Transfer, Provider Management |
| `/api/webhooks/woocommerce` | `routes/woocommerceWebhooks.ts` | WooCommerce Order Webhook |
| `/api/admin/*` | `routes/admin*.ts` | Admin-Endpoints (Feature-Flags, Logs, CMS, etc.) |

### Kern-Services (Backend)

| Service | Datei | Beschreibung |
|---------|-------|--------------|
| **Feature Gate** | `services/featureGate.ts` | Paket-basiertes Feature-Gating (22 Flags + 7 Limits) |
| **AI Feature Gate** | `services/aiFeatureGate.ts` | 3-Level AI-Gating (Paket ∩ Event ∩ Device) |
| **AI Feature Registry** | `services/aiFeatureRegistry.ts` | Zentrale Registry aller 33+ AI-Features |
| **AI Execution** | `services/aiExecution.ts` | Provider-Auflösung, Credit-Check, Logging |
| **AI Style Effects** | `services/aiStyleEffects.ts` | Image-to-Image Effekte (Stability, Replicate, Sharp) |
| **Package Limits** | `services/packageLimits.ts` | Effektives Paket für Event berechnen (Base + Addons) |
| **Audit Logger** | `services/auditLogger.ts` | Alle Aktionen loggen (Fire-and-Forget) |

### Frontend-Architektur (Next.js 14 App Router)

| Route | Datei | Beschreibung | Wer sieht es? |
|-------|-------|-------------|---------------|
| `/e3/[slug]` | `app/events/[id]/` | Gäste-Event-Seite (Galerie, Upload, AI) | Gast |
| `/events/[id]/dashboard` | `app/events/[id]/dashboard/` | Host-Dashboard | Host, Admin |
| `/events/[id]/ki-booth` | `app/events/[id]/ki-booth/` | KI-Kunst Seite | Gast |
| `/events/[id]/booth-games` | `app/events/[id]/booth-games/` | Foto-Spiele Seite | Gast |
| `/live/[slug]/wall` | `app/live/[slug]/wall/` | Live Wall (Beamer/TV) | Öffentlich |
| `/admin/*` | `app/admin/` | Admin-Dashboard | Admin |
| `/admin/feature-flags` | `app/admin/feature-flags/` | Feature-Flags Management | Admin |

### Gast-facing AI-Modals (3 Modals in BottomNav)

| Modal | Datei | Features |
|-------|-------|----------|
| **AiGamesModal** | `components/ai/AiGamesModal.tsx` | 14 LLM-Spiele |
| **AiEffectsModal** | `components/ai/AiEffectsModal.tsx` | 14 Bild/Video/GIF-Effekte |
| **StyleTransferModal** | `components/ai/StyleTransferModal.tsx` | 24 Kunststile |

### Echtzeit (Socket.IO)

```
Server: packages/backend/src/index.ts
Client: packages/frontend/src/lib/websocket.ts
Hook:   packages/frontend/src/hooks/useEventRealtime.ts

Events:
  photo_uploaded  → Galerie-Update
  photo_approved  → Live Wall Update
  Room: event:<eventId>
```

---

## 4. Paket- & Preisstrategie

> Detail-Dokument: `docs/PRICING-STRATEGY.md`

### Basis-Pakete (Endkunde, pro Event)

| | **Free** | **Basic (49€)** | **Smart (99€)** | **Premium (199€)** |
|---|---|---|---|---|
| Fotos | 50 | ∞ | ∞ | ∞ |
| Galerie-Laufzeit | 7 Tage | 30 Tage | 90 Tage | 180 Tage |
| Face Search | ✅ | ✅ | ✅ | ✅ |
| Gästebuch | ❌ | ✅ | ✅ | ✅ |
| Video Upload | ❌ | ❌ | ✅ | ✅ |
| Live Wall | ❌ | ❌ | ✅ | ✅ |
| Co-Hosts | 0 | 1 | 3 | 10 |
| AI-Energie (Start) | 5 ⚡ | 10 ⚡ | 10 ⚡ | 20 ⚡ |
| AI-Energie (Rewards) | Standard | Standard | 1.5x | 2x |
| AI-Energie (Costs) | Standard | Standard | Standard | 0.5x |
| Werbefrei | ❌ | ❌ | ❌ | ✅ |

### Add-ons (inkl. Smart-Paket gratis)

| Add-on | Preis | Was enthalten |
|--------|-------|--------------|
| Mosaic Wall Digital | 199€ | Smart + digitale Mosaikwand |
| Mosaic Wall + Print | 599€ | Smart + Drucker + Banner + Wand |
| Photo Booth | 449€ | Smart + Booth-Hardware + Drucker |
| Mirror Booth | 549€ | Smart + Mirror-Hardware + Touch |
| KI Booth | 599€ | Smart + AI-Setup + Style-Transfer |
| Drawbot | 990€ | Smart + Roboterarm + Branding |
| Highlight Reel | 49€ | Auto-generiertes Event-Video |
| **Custom AI-Theme** | **49€** | Custom Prompt Engineering + Preview + Freigabe |

### Feature-Flags System

> Detail-Dokument: `docs/FEATURE_FLAGS.md`

- 22 Boolean-Flags + 7 numerische Limits pro `PackageDefinition`
- 6 neue AI-Kategorie-Flags: `allowAiGames`, `allowAiImageEffects`, `allowAiGifVideo`, `allowAiAdvanced`, `allowAiHostTools`, `allowAiStyleTransfer`
- Admin-Dashboard: `/admin/feature-flags` → Toggle per Klick
- Code: `packages/backend/src/routes/adminFeatureFlags.ts`
- Gate-Service: `packages/backend/src/services/featureGate.ts`

---

## 5. AI-System

### 5.1 AI-Feature Registry (33+ Features)

> Detail-Katalog: `docs/AI-EFFEKTE-KATALOG.md`

**14 LLM-Spiele** (Kategorie: `games`):
Compliment Mirror, Fortune Teller, AI Roast, Caption Generator, Persona Quiz, Wedding Speech, Story Generator, Celebrity Lookalike, AI Bingo, AI DJ, Meme Generator, Superlatives, Photo Critic, Couple Match

**14 Image/Video/GIF-Effekte** (Kategorien: `imageEffects`, `gifVideo`, `advanced`):
Oldify, Cartoon, Style Pop, Face Swap, BG Removal, GIF Morph, Aging GIF, AI Video, Trading Card, Time Machine, Pet Me, Yearbook, Emoji Me, Miniature

**24 Kunststile** (Kategorie: `styleTransfer`):
Van Gogh, Monet, Picasso, Warhol, Banksy, Klimt, Mondrian, Hokusai, Da Vinci, Frida Kahlo, etc.

**Code**: `packages/backend/src/services/aiFeatureRegistry.ts`

### 5.2 AI Feature Gating (3-Level Access Control)

> Detail-Dokument: `docs/AI-FEATURE-GATING-KONZEPT.md`

```
Level 1: PAKET (PackageDefinition)
  → 6 AI-Kategorie-Flags bestimmen was grundsätzlich verfügbar ist

Level 2: EVENT-CONFIG (EventAiConfig)
  → disabledFeatures[], boothPreset, welcomeMessage
  → Admin/Partner kann Features pro Event deaktivieren

Level 3: GERÄTE-KONTEXT (DeviceType)
  → guest_app, photo_booth, mirror_booth, ki_booth, admin_dashboard
  → Nicht jedes Feature läuft auf jedem Gerät
```

**Gate-Funktion**: `getAiFeatureGate(eventId, deviceType)` → gibt zurück welche Features erlaubt sind
**Code**: `packages/backend/src/services/aiFeatureGate.ts`
**API**: `GET /api/events/:id/ai-features?device=X`, `GET/PUT /api/events/:id/ai-config`

### 5.3 AI-Energie-System (ENTSCHIEDEN)

**Kernprinzip**: Einmalige Belohnungen pro Aktivitätstyp — KEIN "pro Upload" Refill.

#### Energie-Quellen (einmalig pro Aktivitätstyp)

| Aktivität | Standard ⚡ | Einmalig? |
|-----------|-----------|-----------|
| Event beitreten | +10 | Ja (einmal) |
| Erstes Foto hochladen | +5 | Ja (einmal) |
| Gästebuch-Eintrag | +3 | Ja (einmal) |
| Challenge abschließen | +3 | Ja (pro Challenge) |
| Umfrage teilnehmen | +2 | Ja (pro Umfrage) |
| Foto teilen (Social) | +2 | Ja (einmal) |

#### Energie-Verbrauch

| AI-Feature | Standard ⚡ |
|------------|-----------|
| LLM-Spiel | -1 |
| Image-Effekt | -2 |
| Style Transfer | -2 |
| Face Swap | -3 |
| GIF (Morph, Aging) | -3 |
| AI Video | -5 |
| Trading Card | -2 |

#### Admin-Konfigurierbarkeit (pro Event in dash.gästefotos.com)

Alles konfigurierbar — **nichts hardcoded**:
- Startguthaben pro Gast
- Belohnungen pro Aktivitätstyp
- Verbrauch pro AI-Feature-Typ
- Paket-Defaults (Free=sparsam, Premium=großzügig)
- Soft-Limit: Cooldown bei 0⚡ statt Blockade (kein Paywall-Gefühl!)

#### Gast-Identifikation

- **Device-Fingerprint + LocalStorage UUID** (Standard)
- Optional: Name + Selfie → Gast-Profil (Face-Recognition Synergie)
- Energie an Device-ID gebunden
- Anti-Gaming: Einmalige Rewards = kein Spam-Anreiz

#### UX (nur in AI-Sektion sichtbar — Option 1)

```
⚡ AI-Energie
████████████░░░░░  65%

📸 Nimm am Event teil um AI-Energie aufzuladen!
```

**Kein Paywall-Gefühl.** Kein "Credits kaufen". Energie ist im Paket inkludiert und wird durch Teilnahme aufgeladen.

### 5.4 Internes Cost-Monitoring (Admin-only)

- Tatsächliche API-Kosten pro Event in Euro (nie dem Kunden sichtbar!)
- Alert bei > X€ API-Kosten pro Event
- Monatliches Cost-Dashboard
- Safety-Net: Bei extremem Missbrauch kann Admin Energie-Config anpassen

### 5.5 Custom Prompts als Addon (49€ via WooCommerce)

**Flow**:
1. Kunde bucht "Custom AI-Theme" Addon auf gästefotos.com (WooCommerce, 49€)
2. WooCommerce Webhook → Backend → EventEntitlement erstellt
3. Briefing-Formular zeigt "Custom Prompt" Sektion
4. Admin/Partner erstellt Prompt → testet mit Preview → schickt Screenshot an Kunden
5. Kunde bestätigt → Prompt wird in EventAiConfig gespeichert
6. Event-Tag: Prompt wird automatisch verwendet

**Drei Ebenen der Prompt-Anpassung**:
- **Auto-Prompts** (Standard, kostenlos): Event-Keywords werden in Base-Prompt injiziert
- **Full Prompt Edit** (Admin/Partner): Kompletter Prompt-Editor mit Variablen-Vorschau
- **Preview** (Admin/Partner): Test-Bild hochladen → AI-Ergebnis sehen → Freigabe

### 5.6 Konkurrenz-Vergleich AI

> Detail-Dokument: `docs/COMPETITOR-AI-BOOTH-ANALYSIS.md`

| Anbieter | Modell | Unsere Differenzierung |
|----------|--------|----------------------|
| **Snappic** | Credits ($0.10/Stück, 1-6 pro Bild) | Energie statt Credits, kein Kaufzwang |
| **Fotomaster** | Cloud-Abo (Pay-as-you-go) | Smartphone+Booth=1 Stream |
| **Noonah** | Agency (alles in-house, 2-10K€/Event) | Self-Service + automatisierte Prompts |
| **Booth.Events** | Credits ($8/100) | Gamifizierte Energie statt Credits |

### 5.7 Prompt Research & Reverse-Engineering Toolkit (Admin-only)

> Strategie: Eigenes Tooling statt Competitor-Lizenzen ($0.02/Bild vs $49-149/mo)

#### IST-Stand (was existiert)

| Komponente | Status | Ort |
|------------|--------|-----|
| Prompt Studio (Editor + Live-Preview + Versionierung + Seeding) | ✅ | `/manage/prompt-templates` |
| Feature Registry (21 Feature-Mappings, Provider-Zuordnung) | ✅ | `/manage/ai-features` |
| AI Provider (8 Provider konfiguriert) | ✅ | `/manage/ai-providers` |
| 40 Prompts in DB (18 Style-Transfer + 3 LLM-Games + 7 Suggest + 12 System) | ✅ | DB |
| 24 Style-Transfer-Stile (hardcoded + DB-Override) | ✅ | `AI_STYLES` + DB |

#### Was FEHLT → 6 geplante Features

**Feature 1: Image-to-Prompt Analyzer (img2prompt)** — HIGH Priority

Bild hochladen → KI analysiert → gibt wahrscheinlichen Prompt zurück.

| Methode | Provider | Kosten | Qualität |
|---------|----------|--------|----------|
| CLIP Interrogator | Replicate | ~$0.02 | Sehr detailliert (CLIP+BLIP) |
| GPT-4 Vision / Claude Vision | OpenAI/Anthropic | ~$0.01 | Bester natürlichsprachiger Output |
| **Empfohlen: CLIP + LLM** | Replicate + Groq | ~$0.03 | CLIP-Tags + LLM-Synthese = bestes Ergebnis |

Flow: CLIP Interrogator → technische Tags → Groq LLM formuliert optimierten Prompt → User übernimmt in Prompt Studio.

**Feature 2: EXIF / Metadata Reader** — HIGH Priority

Bild hochladen → alle Metadaten extrahieren (inkl. AI-Generierungsparameter).

| Feld | Quelle | Inhalt |
|------|--------|--------|
| `parameters` | PNG tEXt Chunk | SD-Prompt, Negative Prompt, Steps, CFG, Seed, Model |
| `UserComment` | EXIF | Prompt (manche Tools) |
| `Software` | EXIF | "Stable Diffusion", "ComfyUI", "Midjourney" |
| `PNG:Comment` | PNG | ComfyUI Workflow JSON |

Technisch: `sharp.metadata()` (haben wir) + PNG-Chunk-Parser. Kosten: **$0** (rein lokal).

**Feature 3: Prompt Communities / Öffentliche Quellen** — MEDIUM Priority

Kuratierte Linksammlung direkt im Dashboard:

| Quelle | URL | Typ |
|--------|-----|-----|
| Lexica.art | lexica.art | Prompt-Suchmaschine (SD) |
| PromptHero | prompthero.com | Kuratierte Prompts nach Modell |
| CivitAI | civitai.com | Community-Prompts + Ergebnisbilder |
| OpenArt | openart.ai | Visueller Prompt-Browser |
| Replicate Explore | replicate.com/explore | Offizielle Beispiel-Prompts |
| Stability AI Docs | platform.stability.ai/docs | SDXL-Referenz-Prompts |
| Midjourney Prompt Guide | docs.midjourney.com | Stilbegriffe & Syntax |
| Hugging Face | huggingface.co/models | Model Cards mit Prompts |

**Feature 4: Best-Prompt-Analyse (Qualitäts-Bewertung)** — MEDIUM Priority

Bestehende Prompts analysieren und optimieren via LLM:
- Strukturelle Qualität (Subject → Medium → Style → Quality → Negative)
- Keyword-Coverage (fehlen Quality-Booster?)
- Negative-Prompt-Qualität (Anti-Patterns abgedeckt?)
- Score (1-10) + Verbesserungsvorschläge + optimierte Version
- Integration ins bestehende Live-Preview-Panel

**Feature 5: Prompt-freie Effekte — Dokumentation** — LOW Priority

| Effekt | Technik | Prompt nötig? |
|--------|---------|---------------|
| Face Swap | InsightFace/ReActor | ❌ Nein (Bild→Bild) |
| BG Removal | remove.bg / RMBG-2.0 | ❌ Nein (Segmentation) |
| Face Search | face-api.js | ❌ Nein (Embedding-Vergleich) |
| GIF Assembly | Sharp + gifenc | ❌ Nein (Frame-Encoding) |
| Highlight Reel | ffmpeg | ❌ Nein (Foto→Video) |
| Trading Card | Canvas + LLM | ⚠️ Teilweise (LLM nur für Stats) |
| Oldify / Cartoon / Style Transfer | SDXL img2img | ✅ Ja |
| AI Video | Runway/LumaAI | ✅ Ja |
| LLM Games (14 Spiele) | Groq/Grok | ✅ Ja |

**Wichtig**: ActivationKing Face Swap Collections (Viking, Careers, LinkedIn) = **Template-Bilder** (Asset-Strategie), NICHT Prompts.

**Feature 6: Prompt-Optimierungs-Patterns** — Referenz-Material

Universelle Qualitäts-Booster: `masterpiece, best quality, highly detailed, sharp focus, 8k uhd, professional`

Universelle Negative Prompts: `deformed, blurry, bad anatomy, disfigured, poorly drawn face, mutation, extra limb, ugly, watermark`

Face-Preservation: `same person, preserve facial features, maintain likeness, identity preservation`

Style-Patterns: Fotorealismus (`DSLR, 35mm, bokeh`), Anime (`cel shading, studio ghibli`), Oil Painting (`impasto, brushstrokes`), Cyberpunk (`neon, holographic`)

#### Dashboard-Integration

Neue Seite: `/manage/prompt-analyzer` mit:
- **Tab 1**: Image-to-Prompt (Bild hochladen → CLIP + LLM → Ergebnis → "In Prompt Studio übernehmen")
- **Tab 2**: EXIF/Metadata Reader (Bild hochladen → Metadaten-Tree)
- **Tab 3**: Prompt-Qualitäts-Check (Prompt einfügen → LLM-Analyse → Score + Optimierung)
- **Sidebar**: Community-Links + Patterns Cheat-Sheet

#### Kosten-Analyse

| Analyse-Typ | Kosten pro Bild |
|-------------|----------------|
| CLIP Interrogator (Replicate) | ~$0.02 |
| LLM-Synthese (Groq) | ~$0.001 |
| EXIF Reader (lokal) | $0 |
| **Gesamt pro Konkurrenzbild** | **~$0.02** |

→ 1000x billiger als eine ActivationKing-Lizenz, analysiert ALLE Konkurrenten statt nur einen.

---

## 6. Event-Briefing & Kunden-Kommunikation

### Event-Briefing Formular (ENTSCHIEDEN)

Host/Kunde füllt einfaches Briefing aus (2 Minuten):

- Event-Typ (Hochzeit/Firmenevent/Geburtstag/...)
- Event-Name + Datum
- Branding (Logo, Firmenfarbe, Fußzeile auf Fotos)
- Stimmung/Thema (optional: Superhelden, Retro, Elegant, ...)
- Deaktivierte Features (z.B. AI Roast für Firmenevents)
- Eingesetzte Geräte (Gäste-App, Photo Booth, Mirror Booth, ...)

### Briefing ↔ Event Synchronisation

```
Szenario A: Kunde hat bereits Event
  → Briefing zieht Event-Daten (Titel, Datum, Typ)
  → Ergänzt nur fehlende Infos

Szenario B: Kunde füllt Briefing ZUERST aus
  → System erstellt automatisch Event
  → Briefing-Daten fließen ins Event + EventAiConfig

Szenario C: Kunde bucht Addon
  → Addon-spezifisches Briefing wird freigeschaltet
  → z.B. Mosaic-Template: Selbst gestalten ODER Design-Service
```

### Briefing per WooCommerce-Webhook

```
WooCommerce Buchung → Webhook → Backend
  → Event erstellen (falls nicht vorhanden)
  → Addon-Entitlement aktivieren
  → Briefing-Link per E-Mail an Kunden
  → Briefing zeigt nur relevante Felder (je nach Addons)
```

---

## 7. Foto-Qualität & Moderation

### Qualitäts-Gate (automatisch, immer aktiv)

| Check | Was es prüft | Aktion |
|-------|-------------|--------|
| **Blur-Score** | Ist das Foto scharf genug? | < Threshold → markiert |
| **Min-Resolution** | Mindestens 640x480? | Zu klein → abgelehnt |
| **Duplicate-Hash** | Perceptual Hash — Duplikat? | Duplikat → kein Upload / kein Energie-Bonus |
| **Dark/Bright** | Komplett schwarz/weiß? | Extremwerte → markiert |

### Duplicate Detection (MUSS für Wall UND Energie)

- Perceptual Hashing (pHash) bei jedem Upload
- Duplikat-Erkennung: gleiche/ähnliche Bilder werden erkannt
- Auf Event-Wall: Duplikate werden nicht angezeigt
- Für AI-Energie: Duplikat-Upload gibt keinen Bonus
- **Code (existiert bereits)**: `processDuplicateDetection` in `photos.ts`

### Moderation (optional, Host-aktiviert)

- Host kann "Moderation" aktivieren → Fotos warten auf Freigabe
- NSFW-Check (optional, automatisch)
- Host sieht pending Fotos im Dashboard

---

## 8. WooCommerce-Integration

> Detail-Dokument: `docs/woocommerce-setup.md`

### Status: IMPLEMENTIERT ✅ (noch nicht produktiv getestet)

**Code**: `packages/backend/src/routes/woocommerceWebhooks.ts` (590 Zeilen)

### Flow

```
1. Kunde kauft auf gästefotos.com (WooCommerce)
2. WooCommerce sendet Webhook (order.updated, status=processing/completed)
3. Backend verifiziert HMAC-Signatur
4. SKUs werden gegen PackageDefinition gematcht
5. Zwei Pfade:
   a. Mit eventCode → bestehendes Event upgraden
   b. Ohne eventCode → neues Event erstellen
6. EventEntitlement wird erstellt (ACTIVE)
7. Addon-Entitlements werden separat erstellt
```

### Was noch fehlt

- [ ] Briefing-E-Mail nach erfolgreicher Buchung
- [ ] EventAiConfig automatisch aus Paket-Defaults erstellen
- [ ] Produktiv-Test mit echter WooCommerce-Bestellung
- [ ] Custom AI-Theme Addon in WooCommerce anlegen (SKU: `addon-custom-ai-theme`)

---

## 9. Partner-System

### Status: IMPLEMENTIERT ✅

**Schema**: `Partner`, `PartnerMember`, `PartnerHardware`, `BillingPeriod`, `PartnerSubscription`
**Code**: `packages/backend/src/routes/partners.ts`

### Partner-Tiers

| Tier | Beschreibung |
|------|-------------|
| **BRANDED** | Arbeitet unter gästefotos.com Branding |
| **WHITE_LABEL** | Eigenes Branding, Custom Domain |

### Partner-Features

- Partner-Dashboard mit Event-Übersicht
- Hardware-Verwaltung (Geräte registrieren, Status, Zuweisung)
- Team-Mitglieder einladen & verwalten (OWNER, MANAGER, OPERATOR)
- Abrechnungsübersicht & Rechnungshistorie
- Eigenes Branding (Logo, Farben) auf Events
- Automatisches Smart-Paket für alle Partner-Events

### Was noch fehlt

- [x] AI-Config-Zugriff für Partner (Sprint 13 ✅ — GET/PUT ai-config, briefing, finalize via `/api/partner/`)
- [x] Partner-Briefing-Flow (Sprint 13 ✅ — Partner kann Briefing einsehen, bearbeiten, finalisieren)
- [ ] Partner-Dashboard **Frontend** für AI-Konfiguration (Backend fertig, UI fehlt)

---

## 10. Photo Booth Platform

> Detail-Dokument: `docs/PHOTO-BOOTH-PLATFORM-PLAN.md`

### Kernentscheidungen (ALLE getroffen ✅)

| Entscheidung | Wert |
|-------------|------|
| **OS** | Linux (Ubuntu Minimal) |
| **Framework** | Electron |
| **DSLR** | Canon EOS R100 (gPhoto2-kompatibel) |
| **Drucker** | DNP DS620A (CUPS + Gutenprint, Tier 1) |
| **Druckmedium** | Nespresso-Modell (exklusiv von gästefotos.com, QR-Provisioning) |

### Booth-Geräte (DeviceType)

| DeviceType | Beschreibung | AI-Features |
|-----------|-------------|-------------|
| `guest_app` | Smartphone der Gäste | Alle (mit Energie) |
| `photo_booth` | Photo Booth (DSLR + Touch) | Effekte, Spiele |
| `mirror_booth` | Mirror Booth (Spiegel + Touch) | Effekte, Spiele |
| `ki_booth` | KI Booth (AI-fokussiert) | Alle AI-Features |
| `admin_dashboard` | Admin/Host Dashboard | Preview, Config |

### QR-Code System

- **Event laden**: QR → öffnet Event auf Gäste-App
- **Booth-Setup**: QR → konfiguriert Booth mit Event-Settings
- **Druckmedium**: QR → aktiviert Drucker-Profil (HMAC-signiert)
- **Partner-Dashboard**: QR → öffnet Partner-Bereich

---

## 11. Workflow Builder

> Detail-Analyse: `claude/workflow-builder-audit.md`

### Kernkonzept

- **ALLE Flows** müssen über den Workflow Builder definierbar sein
- System-Workflows sind standardmäßig gesperrt (🔒)
- Entsperrfunktion für Admins
- Versionierung mit Backup/Restore

### Betroffene Flows

| Flow | Gerät | Status |
|------|-------|--------|
| Photo Booth Flow | Booth-Hardware | Schema + API ✅, Frontend ⏳ |
| Mirror Booth Flow | Mirror-Hardware | Schema + API ✅, Frontend ⏳ |
| KI Booth Flow | KI-Hardware | Schema + API ✅, Frontend ⏳ |
| Upload-Flow | App + Booth | Funktioniert, Workflow-Integration ⏳ |
| Face-Search-Flow | App | Funktioniert, Workflow-Fallback ✅ |
| Mosaic-Flow | Display + Print | Schema ✅, Frontend ⏳ |
| Gästebuch-Flow | App | Funktioniert |

### Code

- Backend: `packages/backend/src/routes/workflows.ts` (CRUD + Default)
- Frontend: `packages/frontend/src/app/admin/dashboard/workflows/` (Step-Palette, Reorder)
- Runtime: `packages/frontend/src/components/workflow-runtime/`

---

## 12. Entscheidungs-Register

Alle getroffenen Entscheidungen an einem Ort:

| # | Entscheidung | Datum | Status |
|---|-------------|-------|--------|
| E1 | AI-Energie statt Credits (sichtbar für Gäste, gamifiziert) | 19.02.2026 | ✅ ENTSCHIEDEN |
| E2 | Energie-Refill: einmalig pro Aktivitätstyp (nicht pro Upload) | 19.02.2026 | ✅ ENTSCHIEDEN |
| E3 | Gast-ID: Device-Fingerprint + LocalStorage + optional Profil | 19.02.2026 | ✅ ENTSCHIEDEN |
| E4 | Host füllt Briefing aus, Admin/Partner konfiguriert AI | 19.02.2026 | ✅ ENTSCHIEDEN |
| E5 | Briefing ↔ Event bidirektional sync | 19.02.2026 | ✅ ENTSCHIEDEN |
| E6 | Custom Prompts = 49€ WooCommerce Addon | 19.02.2026 | ✅ ENTSCHIEDEN |
| E7 | Alle Zahlungen über WooCommerce | 19.02.2026 | ✅ ENTSCHIEDEN |
| E8 | Kein Paywall-Gefühl (Cooldown statt Block) | 19.02.2026 | ✅ ENTSCHIEDEN |
| E9 | Internes Cost-Cap (Admin-only Dashboard) | 19.02.2026 | ✅ ENTSCHIEDEN |
| E10 | Overlays/Branding pro Event (Logo + Footer + Rahmen) | 19.02.2026 | ✅ ENTSCHIEDEN |
| E11 | Foto-Qualität: Blur + Duplicate + Min-Resolution immer aktiv | 19.02.2026 | ✅ ENTSCHIEDEN |
| E12 | Energiebalken nur in AI-Sektion sichtbar (Option 1) | 19.02.2026 | ✅ ENTSCHIEDEN |
| E13 | Premium ≠ ∞ — mehr Start + höhere Rewards + niedrigere Costs | 19.02.2026 | ✅ ENTSCHIEDEN |
| E14 | Alle Energie-Werte konfigurierbar pro Event im Dashboard | 19.02.2026 | ✅ ENTSCHIEDEN |
| E15 | Rollen: Admin, Partner (OWNER/MANAGER/OPERATOR), Host, Gast | 19.02.2026 | ✅ ENTSCHIEDEN |
| E16 | Mosaic-Template: Kunde wählt (selbst gestalten ODER Service) | 19.02.2026 | ✅ ENTSCHIEDEN |
| E17 | Prompt-Service als Dienstleistung verkaufbar | 19.02.2026 | ✅ ENTSCHIEDEN |
| E18 | Booth-OS: Linux (Ubuntu Minimal) | Feb 2026 | ✅ ENTSCHIEDEN |
| E19 | Nespresso-Modell für Druckmedium | Feb 2026 | ✅ ENTSCHIEDEN |
| E20 | QR-Provisioning für Drucker + Booth + Events | Feb 2026 | ✅ ENTSCHIEDEN |
| E21 | Hidden Config (Drucker-Einstellungen nicht in Booth-UI) | Feb 2026 | ✅ ENTSCHIEDEN |
| E22 | Partner-Modell: Tupperware (alle unter gästefotos.com Branding) | Feb 2026 | ✅ ENTSCHIEDEN |
| E23 | Face Search kostenlos für alle (USP) | Feb 2026 | ✅ ENTSCHIEDEN |
| E24 | Smart-Paket gratis bei jedem Hardware-Addon | Feb 2026 | ✅ ENTSCHIEDEN |
| E25 | Prompt Research Toolkit statt Competitor-Lizenzen ($0.02/Bild) | 19.02.2026 | ✅ ENTSCHIEDEN |

---

## 13. Sprint-Status & Roadmap

### Abgeschlossene Sprints

| Sprint | Inhalt | Status |
|--------|--------|--------|
| **Phase 1-3** | Core Platform (Upload, Galerie, Auth, QR, Sharing, Co-Hosts, Analytics, Mosaic, KI-Kunst, Workflow Builder, Graffiti, Drawbot, 360° Spinner) | ✅ DONE |
| **Phase 4** | Dashboard Redesign, Event Wall, Gamification, Hardware Inventar | ✅ DONE |
| **Sprint 1-4** | 10 AI-Effekte + 10 AI-Spiele + 24 Stile implementiert | ✅ DONE |
| **Sprint 5** | Time Machine, Pet Me, Yearbook, Celebrity Lookalike, AI Bingo, AI DJ | ✅ DONE |
| **Sprint 6** | Emoji Me, Miniature, Meme Generator, Superlatives, Photo Critic, Couple Match | ✅ DONE |
| **Sprint 7** | AI Feature Gating (3-Level Backend: Prisma + Services + API) | ✅ DONE |

### Nächste Sprints (Reihenfolge nach Diskussion)

| Sprint | Inhalt | Priorität | Abhängigkeiten |
|--------|--------|-----------|---------------|
| **Sprint 8** | Energie-System Backend (EventAiConfig erweitern, Gast-Energy-Tracking) | ✅ DONE | Sprint 7 |
| **Sprint 9** | Frontend-Gating (EnergyBar, EnergyCostBadge, Energy-Error-Handling in AI-Modals) | ✅ DONE | Sprint 8 |
| **Sprint 10** | Event-Briefing System (Prisma Model, CRUD API, Host-Formular, Dashboard-Link, Finalize→AiConfig Sync) | ✅ DONE | WooCommerce |
| **Sprint 11** | Custom Prompts (eventPromptContext Service, enrichSystemPrompt in 11 LLM-Endpoints, Briefing→AiConfig Sync) | ✅ DONE | Sprint 10 |
| **Sprint 12** | QR-Code Booth-Setup (POST /booth/setup, GET /booth/config/:eventId, POST /booth/heartbeat) | ✅ DONE | Booth-App |
| **Sprint 13** | Partner AI-Config Zugriff (GET/PUT ai-config, briefing, finalize via /api/partner/) | ✅ DONE | Sprint 9 |
| **Sprint 14** | Cost-Monitoring API (summary, timeline, top-events, alerts via /api/admin/cost-monitoring/) | ✅ DONE | Sprint 8 |
| **Sprint 15** | Foto-Qualitäts-Gate (photoQualityGate Service: Blur-Detection, Resolution-Check, Duplicate-Detection, Upload-Hook) | ✅ DONE | — |
| **Sprint 16** | Prompt Analyzer Backend (img2prompt CLIP+LLM, EXIF/Metadata Reader, Quality-Check, Resources, Patterns — 5 Admin-Endpoints) | ✅ DONE | Sprint 11 |
| **Sprint 17** | Prompt Analyzer Frontend (Dashboard Page /manage/prompt-analyzer: img2prompt, EXIF Reader, Quality-Check, Resources+Patterns, Sidebar-Nav) | ✅ DONE | Sprint 16 |
| **Sprint 18** | Workflow Executor Upgrade (10 ausführbare Step-Types: AI_MODIFY, AI_BG_REMOVAL, QUALITY_GATE, ADD_TAG, MOVE_TO_ALBUM, WEBHOOK, PRINT_JOB, DELAY, CONDITION branching + 4 neue Builder-Palette Steps) | ✅ DONE | Sprint 15 |
| **Sprint 19** | AI Cost Monitoring Dashboard (Frontend: Summary, Timeline-Chart, Provider-Breakdown, Feature-Ranking, Top-Events, Alerts + Sidebar-Link) | ✅ DONE | Sprint 14 |

---

## 14. Dokument-Index (alle MD-Files)

### Aktive Dokumente (aktuell + relevant)

| Datei | Beschreibung | Zuletzt aktualisiert |
|-------|-------------|---------------------|
| `docs/MASTER-KONZEPT.md` | **DIESES DOKUMENT** — Single Source of Truth | 19.02.2026 |
| `docs/AI-EFFEKTE-KATALOG.md` | Katalog aller AI-Features (14+14+24) | 19.02.2026 |
| `docs/AI-FEATURE-GATING-KONZEPT.md` | AI Gating Architektur (3-Level) | 19.02.2026 |
| `docs/AI-STRATEGIE.md` | AI Provider-Strategie (Groq, Grok, OpenAI) | Feb 2026 |
| `docs/AI-OFFLINE-STRATEGIE.md` | Offline-Strategie für AI-Features | Feb 2026 |
| `docs/COMPETITOR-AI-BOOTH-ANALYSIS.md` | Konkurrenz-Analyse (Snappic, Fotomaster, Noonah) | 19.02.2026 |
| `docs/API_MAP.md` | Backend-Endpoints + Code-Pfade | Feb 2026 |
| `docs/AUTH_FLOWS.md` | Login, Password Reset, WordPress SSO, 2FA | Feb 2026 |
| `docs/DB_FIELD_MEANINGS.md` | Datenmodell + Feld-Bedeutungen | Feb 2026 |
| `docs/FEATURE_FLAGS.md` | Feature-Flag-System (22 Flags) | Feb 2026 |
| `docs/FEATURES.md` | Feature-Übersicht (Core + Tech + UI) | Feb 2026 |
| `docs/PRICING-STRATEGY.md` | Paket- & Preisstrategie | Feb 2026 |
| `docs/PHOTO-BOOTH-PLATFORM-PLAN.md` | Booth-Architektur + Kernentscheidungen | Feb 2026 |
| `docs/CUPS-DRUCKER-RECHERCHE.md` | Drucker-Setup (CUPS + DNP DS620A) | Feb 2026 |
| `docs/woocommerce-setup.md` | WooCommerce-Integration Anleitung | Feb 2026 |
| `docs/DEPLOYMENT.md` | Deploy-Anleitung (Backend + Frontend) | Feb 2026 |
| `docs/TODO.md` | Sprint-Übersicht + offene Aufgaben | Feb 2026 |
| `docs/BUGS.md` | Bug-Tracker | Feb 2026 |

### Referenz-Dokumente (nützlich, aber nicht primär)

| Datei | Beschreibung |
|-------|-------------|
| `docs/FEATURES-GUIDE.md` | Ausführlicher Feature-Guide |
| `docs/SALES-FEATURE-LISTE.md` | Feature-Liste für Vertrieb |
| `docs/FOTOMASTER-GAP-ANALYSE.md` | Gap-Analyse vs Fotomaster |
| `docs/MOSAIC_WALL_KONZEPT.md` | Mosaic-Wall Architektur |
| `docs/LIVE_WALL_FEATURE.md` | Live-Wall Feature-Spec |
| `docs/TUS_ARCHITECTURE.md` | TUS Upload-Architektur |
| `docs/COHOSTS.md` | Co-Host System |
| `docs/STORIES.md` | Stories Feature |
| `docs/QR_TEMPLATES.md` | QR-Template-System |
| `docs/STORAGE_AND_BLUR_POLICY.md` | Storage/Blur/Lock Policies |
| `docs/EVENT_FEATURES_CONFIG.md` | Event FeaturesConfig (Guest UX Flags) |
| `docs/EVENT_DESIGNCONFIG_AND_QR_TEMPLATE_CONFIG.md` | Design + QR Template Config |
| `docs/THEME_TOKENS_AND_ADMIN_SETTINGS.md` | Theme-System |
| `docs/GIT_POLICY.md` | Git Ignore/Hook Regeln |

### Booth-Dokumente

| Datei | Beschreibung |
|-------|-------------|
| `photo-booth/README.md` | Booth-App Übersicht |
| `photo-booth/FOTO_MASTER_ANALYSE.md` | Fotomaster Hardware-Analyse |
| `photo-booth/INTERAKTIVES_BOOTH_KONZEPT.md` | Interaktives Booth-Konzept (Spiele, Flows) |
| `photo-booth/OFFLINE_BETRIEB_ANALYSE.md` | Offline-Betrieb Analyse |
| `photo-booth/WETTBEWERBSANALYSE_FIESTAPICS.md` | Wettbewerbsanalyse FiestaPics |

### Ops-Dokumente

| Datei | Beschreibung |
|-------|-------------|
| `docs/ops/DEPLOY_AND_ROLLBACK.md` | Deploy & Rollback Runbook |
| `docs/ops/BACKUPS_AND_RESTORE.md` | Backup & Restore |
| `docs/ops/MONITORING_AND_ALERTING.md` | Monitoring Setup |
| `docs/ops/TWO_FACTOR_KEY_ROTATION.md` | 2FA Key Rotation |
| `docs/ops/FACE_SEARCH_CONSENT_ROLLOUT.md` | Face Search DSGVO Rollout |

### Archiv (historisch, nicht mehr primär relevant)

| Ordner | Beschreibung |
|--------|-------------|
| `claude/` | 40+ Dateien — alte Claude/Opus Analyse-Reports, Audits, TODOs. **Historisch wertvoll, aber nicht aktiv.** |
| `docs/archive/` | 80+ Dateien — alte Fix-Protokolle, Bug-Reports, Migration-Logs. **Nur bei Bedarf lesen.** |

### Bot-Knowledge (AI Chat FAQ)

| Ordner | Beschreibung |
|--------|-------------|
| `docs/bot-knowledge/faq/` | FAQ für AI-Chat (Alben, Fotos, Gäste, QR-Code) |
| `docs/bot-knowledge/features/` | Feature-Beschreibungen für AI-Chat |
| `docs/bot-knowledge/troubleshooting/` | Troubleshooting für AI-Chat |

---

## Regeln für dieses Dokument

1. **Jede Entscheidung** wird im Entscheidungs-Register (#12) eingetragen
2. **Jede neue Datei** wird im Dokument-Index (#14) eingetragen
3. **Jede Architektur-Änderung** wird in den relevanten Sektionen aktualisiert
4. **Sprint-Abschluss** → Sprint-Status (#13) aktualisieren
5. **Neue Features** → Verbindungen in Sektion 3 aktualisieren
6. **Dieses Dokument ist die ERSTE Anlaufstelle** — wenn etwas hier nicht steht, existiert es nicht.
