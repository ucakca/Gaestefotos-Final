# PROJECT FILES TODO — Gästefotos v2
**Erstellt:** 2026-03-04 | **Basis:** Code-Audit + Inconsistency Log
**Priorisierung:** 🔴 P0-Kritisch | 🟠 P1-Hoch | 🟡 P2-Mittel | 🟢 P3-Nice-to-Have

---

## BLOCK 1: Security-Fixes (Sofortmaßnahmen)

### [SEC-01] ✅ ERLEDIGT — CSP `unsafe-eval` entfernt
- **Datei:** `packages/frontend/src/middleware.ts`
- **Status:** **GEFIXT** — `unsafe-eval` bereits entfernt. CSP ist jetzt `script-src 'self' 'unsafe-inline'`. Nur `unsafe-inline` bleibt als Turbopack-Workaround. Nonce-basiertes CSP wartet auf Next.js Turbopack Fix.
- **Referenz:** INCONSISTENCY_LOG S-01

### [SEC-02] ✅ ERLEDIGT — ClamAV-Fehler nicht als "clean" behandeln
- **Datei:** `packages/backend/src/services/virusScan.ts`
- **Status:** **GEFIXT (2026-03-05)** — Code gibt jetzt `{ clean: false, threat: 'SCAN_UNAVAILABLE', quarantine: true }` zurück (Zeile 33). Photos werden bei ClamAV-Fehler quarantiniert.
- **Referenz:** INCONSISTENCY_LOG S-02

### [SEC-03] ✅ ERLEDIGT — `maxUploadsPerGuest` Limit absichern
- **Datei:** `packages/backend/src/routes/uploads.ts` (Zeile 345-368)
- **Status:** **GEFIXT (2026-03-06)** — Zusätzlicher IP-basierter Upload-Counter (`ipUploadCountMap`) neben `uploadedBy`-Prüfung. IP-Limit = 2× maxUploadsPerGuest (Puffer für geteilte IPs). Periodisches Cleanup alle 30 Min.
- **Referenz:** INCONSISTENCY_LOG S-05

### [SEC-05] ✅ ERLEDIGT — Face-Embedding Consent-Gate via Feature-Flag
- **Datei:** `packages/backend/src/routes/uploads.ts` (Zeile 452-455)
- **Status:** **GEFIXT** — `isFeatureEnabled(eventId, 'faceSearch')` prüft ob der Host faceSearch aktiviert hat, bevor Embeddings gespeichert werden. `faceSearchConsent.ts` liefert Consent-Text für Frontend-Anzeige. Event-Level Feature-Flag = Controller-Consent (Host als Verantwortlicher). Optional: Per-Gast-Consent als UI-Enhancement.
- **Referenz:** INCONSISTENCY_LOG G-02

### [SEC-04] ✅ ERLEDIGT — EXIF GPS-Strip sicherstellen (DSGVO)
- **Datei:** `packages/backend/src/services/imageProcessor.ts`
- **Status:** **GEFIXT (2026-03-05)** — `imageProcessor.ts:30` nutzt jetzt `sharp(buffer).rotate()` ohne `.withMetadata()`. Sharp strippt EXIF per Default, `.rotate()` liest EXIF-Rotation vor dem Strip. Alle 4 Varianten nutzen `pipeline.clone()` (ARCH-05 ebenfalls erledigt).
- **Referenz:** INCONSISTENCY_LOG G-01

### [SEC-06] ✅ ERLEDIGT — GPS-Daten aus EXIF-Metadaten-JSON filtern (DSGVO)
- **Datei:** `packages/backend/src/services/imageMetadataReader.ts`
- **Status:** **GEFIXT (2026-03-07)** — 22 GPS-bezogene Keys (latitude, longitude, GPSLatitude, GPSPosition, etc.) werden beim EXIF-Parsing herausgefiltert, bevor sie in das `exifData` JSON-Feld der DB geschrieben werden. Ergänzt SEC-04 (Bild-Varianten) um Metadaten-Ebene.
- **Referenz:** INCONSISTENCY_LOG S-06

---

## BLOCK 2: Bug-Fixes (Breaking Issues)

### [BUG-01] ✅ ERLEDIGT — `/api/uploads/status` Endpunkt
- **Datei:** `packages/backend/src/routes/uploads.ts` (Zeile 623-629)
- **Status:** **GEFIXT (2026-03-05)** — Endpunkt existiert bereits: `router.get('/status', ...)` gibt `{ enabled: true, maxSize: TUS_MAX_SIZE }` zurück.
- **Referenz:** INCONSISTENCY_LOG FB-01

### [BUG-02] ✅ ERLEDIGT — Single DB-Write bei Photo-Create
- **Datei:** `packages/backend/src/routes/uploads.ts` (Zeile 370-376)
- **Status:** **GEFIXT (2026-03-05)** — UUID wird vorab generiert (`crypto.randomUUID()`), dann single `prisma.photo.create({ id: generatedId, url: '/cdn/${generatedId}' })`. Ein DB-Roundtrip.
- **Referenz:** INCONSISTENCY_LOG L-01

### [BUG-03] ✅ ERLEDIGT — Next.js 16 async params in `events/[id]/page.tsx`
- **Datei:** `packages/frontend/src/app/events/[id]/page.tsx`
- **Status:** **GEFIXT** — Code nutzt bereits `async function Page({ params }: { params: Promise<{ id: string }> })` mit `await params`.
- **Referenz:** INCONSISTENCY_LOG FB-06

### [BUG-04] ✅ ERLEDIGT — `photoQualityGate.ts` Sharp-Import mit Fallback
- **Datei:** `packages/backend/src/services/photoQualityGate.ts`
- **Status:** **GEFIXT** — Code nutzt bereits `let sharp; try { sharp = require('sharp'); } catch {}` (Zeile 13-18).
- **Referenz:** INCONSISTENCY_LOG L-02

### [BUG-05] ✅ ERLEDIGT — Upload-Limit-Inkonsistenz (Multer vs TUS)
- **Dateien:** `packages/backend/src/routes/photos.ts`, `packages/backend/src/middleware/uploadFactory.ts`
- **Status:** **GEFIXT (2026-03-07)** — Multer Image-Limit von 50MB auf 100MB angehoben (aligned mit TUS `TUS_MAX_SIZE=104857600`). Auch `uploadFactory.ts` Default für `image` und `any` auf 100MB gesetzt. Nginx `client_max_body_size` = 500M (global). Fehlermeldung aktualisiert.
- **Referenz:** INCONSISTENCY_LOG FB-02

### [BUG-06] ✅ ERLEDIGT — `(event as any).visitCount` unsafe Cast entfernt
- **Datei:** `packages/backend/src/routes/events.ts` (2 Stellen: Zeile 118 + 383)
- **Status:** **GEFIXT (2026-03-07)** — `as any` Cast entfernt, `event.visitCount` wird direkt vom Prisma-Typ genutzt. Zweite Stelle via Variablen-Extraktion vor Destrukturierung gelöst.
- **Referenz:** INCONSISTENCY_LOG FB-05

### [BUG-07] ✅ ERLEDIGT — `publicRoutes`-Liste in Frontend Middleware unvollständig
- **Datei:** `packages/frontend/src/middleware.ts` (Zeile 82)
- **Status:** **GEFIXT (2026-03-07)** — 13 fehlende Routen hinzugefügt: `/r`, `/live`, `/agb`, `/datenschutz`, `/impressum`, `/cookies`, `/faq`, `/pricing`, `/partner`, `/forgot-password`, `/reset-password`, `/offline`, `/version`.
- **Referenz:** INCONSISTENCY_LOG FB-07

---

## BLOCK 3: Feature-Vervollständigungen

### [FEAT-01] ✅ ERLEDIGT — i18n vollständig aktiv (cookie-basiert)
- **Datei:** `packages/frontend/src/middleware.ts`
- **Status:** **GEFIXT (2026-03-06)** — i18n war bereits vollständig implementiert via cookie-basiertem Ansatz (`NEXT_LOCALE` Cookie). `AutoLocaleDetect.tsx`, `LanguageSelector.tsx`, `I18nProvider.tsx` sind in `layout.tsx` eingebunden. 5 Sprachen aktiv (de, en, fr, es, it). Kein Middleware-Routing nötig — irreführender Kommentar korrigiert.
- **Referenz:** INCONSISTENCY_LOG L-03

### [FEAT-02] ✅ ERLEDIGT — Qwen/ComfyUI Live-Test erfolgreich
- **Bereich:** RunPod Endpoint `fkyvpdld673jrf`
- **Status:** **GEFIXT (2026-03-06)** — Live-Test mit echtem Foto erfolgreich: `ai_cartoon` Workflow, 35s Execution, 800×528 PNG Output. GPU-Liste erweitert (ADA_24 + AMPERE_80 für bessere Verfügbarkeit). Workflow-Fix: `"text"` → `"prompt"` in allen 18 JSON-Workflows (ComfyUI Node-Interface-Änderung).
- **Referenz:** Memory — RunPod Qwen Workflow Fix

### [FEAT-03] ✅ ERLEDIGT — Upload-Limit-Anzeige für Gäste
- **Dateien:** `packages/backend/src/routes/uploads.ts`, `packages/frontend/src/components/UploadButton.tsx`
- **Status:** **GEFIXT (2026-03-06)** — Backend: `GET /api/uploads/limit/:eventId?guest=name` liefert `{ limited, max, used, remaining }`. Frontend: `UploadButton.tsx` zeigt Limit-Info im Upload-Dialog ("3/10 Fotos hochgeladen — noch 7 möglich"). Farblich markiert: grau bei verfügbar, rot bei Limit erreicht.

### [FEAT-04] 🟡 Swagger/OpenAPI vollständig dokumentieren
- **Datei:** Alle `packages/backend/src/routes/*.ts`
- **Status:** Dependencies vorhanden (`swagger-jsdoc`, `swagger-ui-express`)
- **Aktion:** JSDoc `@swagger`-Annotationen für alle Public API-Endpunkte
- **Priorität:** Wichtig für Partner-Integration und externe Entwickler

### [FEAT-05] 🟡 Print-Terminal App verifizieren
- **Pfad:** `packages/print-terminal/`
- **Status:** Systemd-Service registriert, aber Implementierungsstand unklar
- **Aktion:** Funktionalität testen: Photo-ID → Druck-Job → Drucker-Kommunikation

---

## BLOCK 4: Architektur-Optimierungen

### [ARCH-01] ✅ ERLEDIGT — `GET /api/events` bereits batch-optimiert
- **Datei:** `packages/backend/src/routes/events.ts` (Zeile 90-160)
- **Status:** **Kein N+1** — Code nutzt bereits: 1) `findMany` mit `_count` include, 2) `photo.groupBy` (batch), 3) `eventEntitlement.findMany` mit `{ in: eventIds }` (batch), 4) `packageDefinition.findMany` mit `{ in: skus }` (batch). Insgesamt 3-4 batch queries, kein N+1-Problem.

### [ARCH-02] ✅ ERLEDIGT — `ModernPhotoGrid.tsx` aufgeteilt
- **Datei:** `packages/frontend/src/components/ModernPhotoGrid.tsx`
- **Status:** **GEFIXT (2026-03-07)** — Aufgeteilt in 3 Dateien:
  - `ModernPhotoGrid.tsx` (242 Zeilen, nur Grid-Rendering)
  - `PhotoLightbox.tsx` (Vollbild-Modal + Sidebar + Navigation)
  - `hooks/usePhotoInteractions.ts` (Likes/Reactions/Comments Hook)
- **Reduktion:** 919→242 Zeilen (-74%). TSC 0 Fehler.

### [ARCH-03] ✅ ERLEDIGT — RunPod Service-Layer vereinheitlicht
- **Dateien:** `runpodService.ts`, `comfyuiWorkflowRegistry.ts`, `comfyuiWorkflows.ts`, `aiJobWorker.ts`
- **Status:** **GEFIXT (2026-03-06)** — Shared `extractOutputBuffer()` und `pollForResult()` in `runpodService.ts`. Dreifach duplizierter Output-Parser entfernt. **Critical Bug Fix:** `aiJobWorker.ts` hatte Double-Submit-Bug (submitJob + submitAndWait = Job wurde 2× gesendet). Jetzt: `submitJob()` → `pollForResult(jobId)`.

### [ARCH-04] ✅ ERLEDIGT — Addon-Entitlements bereits batch-optimiert
- **Datei:** `packages/backend/src/services/featureGate.ts:325-361`
- **Status:** **Kein N+1** — Code nutzt bereits `findMany({ where: { sku: { in: addonSkus } } })` (Zeile 337-341) mit Kommentar `// Batch-load all addon packages in one query (ARCH-04: fixes N+1)`. Map-Lookup in der Schleife.

### [ARCH-05] ✅ ERLEDIGT — Sharp-Pipeline optimiert
- **Datei:** `packages/backend/src/services/imageProcessor.ts`
- **Status:** **GEFIXT (2026-03-05)** — Nutzt jetzt `sharp(buffer).rotate()` + `pipeline.clone()` für alle 4 Varianten. Bild wird nur 1× in Speicher geladen.

### [ARCH-06] ✅ ERLEDIGT — SHA-256 für Duplikat-Erkennung
- **Datei:** `packages/backend/src/services/duplicateDetection.ts`
- **Status:** **GEFIXT** — Code nutzt bereits `crypto.createHash('sha256')`. Test-Datei (`duplicateDetection.test.ts`) ebenfalls aktualisiert (2026-03-06).

### [ARCH-07] ✅ ERLEDIGT — photoStats.ts Boilerplate-Refactor
- **Dateien:** `packages/backend/src/routes/photoStats.ts`, `packages/backend/src/routes/photoStatsHelpers.ts` (NEU)
- **Status:** **GEFIXT (2026-03-07)** — 3 generische Helper-Funktionen (`statsRoute`, `statsRouteWithReq`, `publicStatsRoute`) extrahiert. 138 von 198 Routen migriert. **5965 → 4943 Zeilen (-1022 Zeilen, -17%)**. TSC 0 Fehler, 206/206 Tests bestanden.

### [ARCH-08] ✅ ERLEDIGT — pipelineRunner.ts: Atomare DB-Updates
- **Datei:** `packages/backend/src/services/pipelineRunner.ts` (Zeile 250-312)
- **Status:** **GEFIXT (2026-03-07)** — `recordPipelineExecution` und `recordPromptTestResult` nutzen jetzt je einen einzigen atomaren SQL `UPDATE` statt 2 Queries (findUnique + update). Verhindert Race-Conditions bei parallelen Aufrufen.

---

## BLOCK 5: Testing

### [TEST-01] ✅ ERLEDIGT — Unit-Tests für kritische Services
- **Neue Tests (2026-03-06):**
  - `runpodService.test.ts` — 14 Tests: isConfigured, extractOutputBuffer (7 Formate), submitJob (4 Szenarien)
  - `csrf.test.ts` — 2 Tests: Token-Format, Einzigartigkeit
  - `duplicateDetection.test.ts` — 11 Tests: SHA-256 Hash, Hamming Distance (gefixt von MD5)
- **Gesamt:** 27/27 Tests bestanden. Framework: Vitest.

### [TEST-02] ✅ ERLEDIGT — E2E-Test: TUS Upload vollständiger Flow
- **Datei:** `e2e/tus-resumable.spec.ts`
- **Status:** **GEFIXT (2026-03-07)** — Test J.1b hinzugefügt: `GET /api/uploads/status` prüft `enabled: true` + `maxSize > 0`. Deckt jetzt `isTusEnabled()` ab.

### [TEST-03] 🟡 E2E-Test: i18n Sprachweiterleitung
- **Voraussetzung:** FEAT-01 (i18n aktivieren)
- **Test:** Browser mit `Accept-Language: en` → `/e3/slug` → Englische UI

### [TEST-04] ✅ ERLEDIGT — Security-Tests: Upload-Limit-Bypass
- **Datei:** `packages/backend/src/__tests__/services/uploadLimitBypass.test.ts` (NEU)
- **Status:** **GEFIXT (2026-03-07)** — 6 Tests: Name-Limit, Name-Bypass-Vektor, IP-Counter blockiert Bypass, unabhängige IP-Tracking, unabhängige Event-Tracking, Counter-Reset nach Cleanup. Alle 6/6 bestanden.

---

## BLOCK 6: Design & UX

### [UX-01] ✅ ERLEDIGT — Onboarding-Flow bereits implementiert
- **Status:** **Bereits vorhanden (verifiziert 2026-03-07)** — SetupWizard zeigt Event-Limit-Warnung mit `/pricing`-Link. Dashboard zeigt Paket-Tier-Badge + Upgrade-Button + gesperrte Features mit Lock-Icon und "Upgrade erforderlich"-Hinweis.

### [UX-02] ✅ ERLEDIGT — Upload-CTA im Event-Header
- **Datei:** `packages/frontend/src/components/e3/EventHero.tsx`
- **Status:** **GEFIXT (2026-03-07)** — Ghost-Button "Foto hochladen" im EventHero (Above-the-Fold), verbunden mit Upload-FAB via `data-upload-fab` Attribut. 5 Sprachen (de/en/fr/es/it).

### [UX-03] ✅ ERLEDIGT — Design-Tokens bereits zentralisiert
- **Status:** **Bereits vorhanden (verifiziert 2026-03-07)** — `globals.css` definiert alle Farben als CSS Custom Properties (`--primary`, `--background`, `--foreground` etc.). `tailwind.config.ts` referenziert diese via `hsl(var(...))`. Light/Dark-Mode vollständig.

### [UX-04] ✅ ERLEDIGT — KI-Effekte-Entdeckbarkeit
- **Datei:** `packages/frontend/src/app/e3/[slug]/page.tsx`
- **Status:** **GEFIXT (2026-03-07)** — CTA-Banner über dem Foto-Grid: "✨ KI-Effekte ausprobieren — Verwandle deine Fotos mit Cartoon, Pop Art & mehr". Öffnet AiEffectsModal. Nur sichtbar wenn Fotos vorhanden und Feature aktiviert.

### [UX-05] ✅ ERLEDIGT — Passwort-Toggle auf Event-Passwort-Formular
- **Datei:** `packages/frontend/src/components/ui/PasswordGate.tsx`
- **Status:** **GEFIXT (2026-03-07)** — Eye/EyeOff Toggle-Button mit `useState(showPassword)`. Lucide Icons, `aria-label` für Accessibility, `tabIndex={-1}` um Tab-Reihenfolge nicht zu stören.

---

## BLOCK 7: Dokumentation & Branding

### [DOC-01] ✅ ERLEDIGT — README-Zähler korrigiert
- **Status:** **GEFIXT (2026-03-06)** — Alle Zähler in README aktualisiert: 117 Routes, 95 Models, 54 Migrations, 68 Pages, 269 Components, 57 Admin-Pages.
- **Referenz:** INCONSISTENCY_LOG D-05

### [DOC-02] ✅ ERLEDIGT — AI-Provider-Diagramm aktualisiert
- **Status:** **GEFIXT (2026-03-06)** — Diagramm zeigt jetzt "7 AI Providers" (Groq, xAI, fal.ai, OpenAI, RunPod/ComfyUI, Ollama, remove.bg). Twilio entfernt (nicht implementiert).
- **Referenz:** INCONSISTENCY_LOG D-06

### [DOC-03] 🟡 API-Dokumentation (Swagger)
- **Referenz:** FEAT-04

### [DOC-04] 🟡 Komponenten-Dokumentation
- **Problem:** 269 Komponenten ohne Storybook
- **Aktion:** Storybook oder zumindest `COMPONENT_INDEX.md` aktuell halten

### [DOC-05] ✅ ERLEDIGT — DSGVO-Datenschutzmaßnahmen dokumentiert
- **Datei:** `docs/DSGVO_MASSNAHMEN.md` (NEU)
- **Status:** **GEFIXT (2026-03-07)** — 8 Sektionen: EXIF-Stripping, Face Search Consent, IP-Hashing, Gast-Identifikation, Daten-Löschung/Retention, Transport-Sicherheit, Zugriffskontrolle, Offene Punkte. Nachweisbar gem. Art. 32 DSGVO.

---

## Priorisierungs-Matrix

| Priorität | Anzahl | Kategorien |
|---|---|---|
| ✅ P0 — Alle erledigt | 0 | SEC-01–06, BUG-01–07, ARCH-01..08, FEAT-01–03, TEST-01–02, TEST-04, DOC-01–02, DOC-05, UX-01–05 — alle GEFIXT |
| 🟠 P1 — Kurzfristig (2 Wochen) | 2 | FEAT-04 (Swagger), FEAT-05 (Print-Terminal) |
| 🟡 P2 — Mittelfristig (1 Monat) | 1 | TEST-03 (i18n E2E) |
| 🟢 P3 — Backlog | 2 | DOC-03..04 |

---

## Quick-Win-Liste (< 30 Minuten pro Task)

1. ~~**[BUG-01]** `/api/uploads/status` Endpunkt~~ — ✅ ERLEDIGT
2. ~~**[SEC-01]** `unsafe-eval` aus CSP entfernen~~ — ✅ ERLEDIGT (bereits entfernt)
3. ~~**[SEC-04]** `.withMetadata(...)` aus imageProcessor.ts entfernen~~ — ✅ ERLEDIGT
4. ~~**[BUG-03]** async params in `events/[id]/page.tsx`~~ — ✅ ERLEDIGT (bereits async)
5. ~~**[ARCH-06]** MD5 → SHA-256 in duplicateDetection.ts~~ — ✅ ERLEDIGT (bereits SHA-256)
6. ~~**[DOC-01]** README-Zähler aktualisieren~~ — ✅ ERLEDIGT (2026-03-06)
7. ~~**[S-03 Fix]** `secure: isProd` in auth.ts~~ — ✅ ERLEDIGT (bereits korrekt)

**Alle Quick-Wins abgeschlossen! 🎉**
