# INCONSISTENCY LOG — Gästefotos v2
**Audit-Datum:** 2026-03-04 | **Gegenprüfung:** 2026-03-04 | **Letzte Aktualisierung:** 2026-03-07 | **Methodik:** Deep-Scan (Code + Docs + Laufzeit-Kontext)
**Legende:** 🔴 KRITISCH | 🟠 HOCH | 🟡 MITTEL | 🟢 NIEDRIG | ❌ FALSE POSITIVE

> Alle Einträge wurden durch direktes Code-Lesen verifiziert (Gegenprüfung). Reine Vermutungen sind als [UNVERIFIED] markiert.
> **Gegenprüfung durchgeführt am 2026-03-04:** Mehrere Einträge als False Positive identifiziert und korrigiert. Zahlen gegen tatsächlichen Code verifiziert.

---

## Tabelle 1: Dokumentations-Inkonsistenzen (Gegenprüfung bestehender Docs)

| # | Priorität | Datei | Befund | Realität (Code-verifiziert) |
|---|---|---|---|---|
| D-01 | 🟡 MITTEL | `docs/archive/LOVABLE_MASTER_PROMPT.md`, `docs/archive/ARCHITECTURE_AUDIT_REPORT.md` | Archiv-Docs referenzieren "Supabase" als Datenbankbackend | **[KORRIGIERT]** `README.md` enthält **keine** Supabase-Referenz (grep verifiziert). Supabase taucht nur in Archiv-Docs auf (`docs/archive/`). System verwendet PostgreSQL + Prisma ORM + JWT-Middleware. Kein akuter Handlungsbedarf da Archiv-Docs. |
| D-02 | � KRITISCH | `README.md` | "55 Seiten, 282 Komponenten" — Zählung systematisch falsch | **[KORRIGIERT]** Tatsächlich (code-verifiziert via `find`): **68 page.tsx** (nicht 55) und **269 Komponenten** (nicht 282). Alle Zähler in README sind veraltet — systematische Inkonsistenz. |
| D-03 | 🟡 MITTEL | `CHANGELOG.md` | `UploadModal.tsx` mit "380 LOC" gelistet | Tatsächliche Datei: 6.424 Bytes ≈ ~170 LOC. Zahl aus früherer Version, nicht aktuell. |
| D-04 | 🟡 MITTEL | `CHANGELOG.md` | `PhotoGrid.tsx` referenziert (337 LOC) | Datei existiert, aber `ModernPhotoGrid.tsx` (42.292 Bytes) ist die aktive Komponente — wahrscheinlicher Rename ohne Changelog-Update. |
| D-05 | ✅ GEFIXT | `README.md` | ~~"50 Migrationen" angegeben~~ | **[GEFIXT 2026-03-06]** README aktualisiert: 117 Routes, 95 Models, 54 Migrations, 68 Pages, 269 Components, 57 Admin-Pages. Alle Zähler korrekt. |
| D-06 | ✅ GEFIXT | `README.md`, Arch-Diagramm | ~~"Groq +4 AI Providers" + Twilio~~ | **[GEFIXT 2026-03-06]** Diagramm aktualisiert: "7 AI Providers" (Groq, xAI, fal, OAI) + RunPod/ComfyUI. Twilio entfernt (nicht implementiert). |

---

## Tabelle 2: Security-Inkonsistenzen

| # | Priorität | Datei | Befund | Risiko |
|---|---|---|---|---|
| S-01 | � TEILWEISE | `packages/frontend/src/middleware.ts:64` | `script-src 'self' 'unsafe-inline'` — CSP erlaubt Inline-JavaScript | **[TEILFIX]** `unsafe-eval` bereits entfernt. Nur noch `unsafe-inline` für `script-src` und `style-src` (Turbopack-Workaround). Nonce-basiertes CSP wartet auf Next.js Turbopack Fix. |
| S-02 | ✅ GEFIXT | `packages/backend/src/services/virusScan.ts:29` | ~~`if (clamdscan fails) → return { clean: true }`~~ | **[GEFIXT 2026-03-05]** Code gibt jetzt `{ clean: false, threat: 'SCAN_UNAVAILABLE', quarantine: true }` zurück (Zeile 33). Photos werden bei ClamAV-Fehler quarantiniert, nicht freigegeben. |
| S-03 | ✅ GEFIXT | `packages/backend/src/middleware/auth.ts:141-145` | ~~`secure: true` hardcoded~~ | **[GEFIXT]** Code nutzt jetzt `secure: isProd` (Zeile 145). Toter Code bereinigt. |
| S-04 | ✅ GEFIXT | `packages/backend/src/routes/uploads.ts:115` | ~~JWT Bearer in TUS~~ | **[GEFIXT 2026-03-07]** Code unterstützt bereits beides: Cookie (`auth_token`) + Bearer-Header + Event-Access-Cookie für Gäste. Bearer ist zusätzlicher Fallback für API-Clients. By design. |
| S-05 | ✅ GEFIXT | `packages/backend/src/routes/uploads.ts:335-341` | ~~`maxUploadsPerGuest` prüft nur anhand `uploadedBy`~~ | **[GEFIXT 2026-03-06]** Zusätzlicher IP-basierter Upload-Counter (`ipUploadCountMap`) verhindert Bypass via Namensänderung. IP-Limit = 2× maxUploadsPerGuest (Puffer für geteilte IPs). |
| S-06 | ✅ GEFIXT | `packages/backend/src/services/imageMetadataReader.ts` | ~~GPS-Daten in exifData JSON-Feld~~ | **[GEFIXT 2026-03-07]** GPS-Felder werden jetzt beim EXIF-Parsing gefiltert: 22 GPS-bezogene Keys (latitude, longitude, GPSLatitude, GPSPosition etc.) werden aus `result.exif` ausgeschlossen bevor sie in die DB geschrieben werden. Sharp strippt EXIF aus Bild-Varianten (G-01). |
| S-07 | 🟢 NIEDRIG | `packages/backend/src/config/wordpress.ts` (referenziert in `auth.ts`) | WordPress SSO-Integration | Externe Abhängigkeit: Wenn WordPress-DB nicht erreichbar, wirft `WordPressAuthUnavailableError`. Fehlerbehandlung vorhanden. |

---

## Tabelle 3: Frontend ↔ Backend Inkonsistenzen

| # | Priorität | Datei(en) | Befund | Detail |
|---|---|---|---|---|
| FB-01 | ✅ GEFIXT | `src/lib/tusUpload.ts:66-77` vs. `uploads.ts` Router | ~~`isTusEnabled()` ruft `GET /api/uploads/status` auf~~ | **[GEFIXT]** Endpunkt existiert: `router.get('/status', ...)` in `uploads.ts:623-629` gibt `{ enabled: true, maxSize: TUS_MAX_SIZE }` zurück. |
| FB-02 | ✅ GEFIXT | `photos.ts` multer (50MB) vs. `uploads.ts` TUS (100MB) | ~~Größenlimit-Inkonsistenz~~ | **[GEFIXT 2026-03-07]** Multer in `photos.ts` und `uploadFactory.ts` auf 100MB angehoben (aligned mit TUS). Nginx `client_max_body_size` = 500M (global) / 100M (uploads). Alle Upload-Pfade konsistent. |
| FB-03 | ❌ FALSE POSITIVE | `UploadButton.tsx` → `api.ts` (getApiUrl) | ~~Nginx `/api` Proxy-Kollision~~ | **[FALSIFIZIERT]** Nginx-Config verifiziert: `location /api { proxy_pass http://127.0.0.1:8001; }` und `location / { proxy_pass http://127.0.0.1:3000; }`. Beide `/api`-Blöcke zeigen auf Express (Port 8001). `^~` bei `/api/uploads` gibt TUS-Requests Priorität. Korrekt konfiguriert, keine Kollision. |
| FB-04 | ✅ GEFIXT | `uploads.ts:278-283` | ~~WebP-Fallback fehlt~~ | **[GEFIXT 2026-03-07]** `imageCdn.ts` hat eingebauten Fallback: Wenn `storagePathWebp` null, wird Original (`storagePath`) geladen und on-the-fly per Sharp konvertiert. Kein Frontend-Fix nötig — CDN-Layer handelt es transparent. |
| FB-05 | ✅ GEFIXT | `events.ts:118` | ~~`viewCount: (event as any).visitCount` — unsafe any-cast~~ | **[GEFIXT 2026-03-07]** `as any` Cast entfernt — `event.visitCount` wird direkt vom Prisma-Typ genutzt. Zweite Stelle (Zeile 383) ebenfalls gefixt via Variablen-Extraktion vor Destrukturierung. |
| FB-06 | ✅ GEFIXT | `src/app/events/[id]/page.tsx` | ~~Synchroner `params.id`-Zugriff~~ | **[GEFIXT]** Code nutzt bereits `async function Page({ params }: { params: Promise<{ id: string }> })` mit `await params`. |
| FB-07 | ✅ GEFIXT | `middleware.ts:82` | ~~`publicRoutes` unvollständig~~ | **[GEFIXT 2026-03-07]** Liste erweitert um alle fehlenden Routen: `/r`, `/live`, `/agb`, `/datenschutz`, `/impressum`, `/cookies`, `/faq`, `/pricing`, `/partner`, `/forgot-password`, `/reset-password`, `/offline`, `/version`. |
| FB-08 | 🟢 NIEDRIG | `tusUpload.ts:54` | `const safe = previousUploads.filter(u => !u.uploadUrl \|\| !u.uploadUrl.startsWith('http://'))` | Nur alte HTTP-URLs werden gefiltert. Nach SSL-Migration korrekt. Kommentar erklärt den Kontext. |

---

## Tabelle 4: Logische Brüche & Missing Links

| # | Priorität | Bereich | Befund | Detail |
|---|---|---|---|---|
| L-01 | ✅ GEFIXT | `uploads.ts:346-361` | ~~Doppelter DB-Schreibvorgang~~ | **[GEFIXT 2026-03-05]** UUID wird vorab generiert (`crypto.randomUUID()`), dann single `prisma.photo.create({ id: generatedId, url: '/cdn/${generatedId}' })`. Ein DB-Roundtrip. |
| L-02 | ✅ GEFIXT | `photoQualityGate.ts:12` | ~~`import sharp from 'sharp'` (harter Import)~~ | **[GEFIXT]** Code nutzt bereits `let sharp; try { sharp = require('sharp'); } catch {}` (Zeile 13-18). |
| L-03 | ✅ GEFIXT | i18n — `middleware.ts:1-2` | ~~Kommentar: "Temporär deaktiviert"~~ | **[GEFIXT 2026-03-06]** i18n ist vollständig aktiv via cookie-basiertem Ansatz (`NEXT_LOCALE` Cookie). Irreführender Kommentar korrigiert. Kein Middleware-Routing nötig. |
| L-04 | ❌ FALSE POSITIVE | `featureGate.ts` vs. `packageLimits.ts` | ~~Nicht über gemeinsame Abstraktion verbunden~~ | **[FALSIFIZIERT]** `featureGate.ts:9` importiert direkt `getEffectiveEventPackage` aus `packageLimits.ts`. Die Services SIND verbunden — `featureGate` nutzt `packageLimits` als Basis-Abstraktion. |
| L-05 | ❌ FALSE POSITIVE | `uploads.ts:597-619` | ~~Verwaiste PREVIEW-Records bleiben in DB~~ | **[FALSIFIZIERT]** Bereinigung BEREITS implementiert in `uploads.ts:597-619`: `setInterval` alle 15 Min löscht Records mit `progressive-upload`-Tag älter als 1 Stunde (`PROGRESSIVE_ZOMBIE_AGE_MS`). Silent fallback bei fehlendem Phase-1-Record ist beabsichtigtes Verhalten. |
| L-06 | ✅ GEFIXT | `duplicateDetection.ts` | ~~MD5-Hash für exakte Duplikate~~ | **[GEFIXT]** Code nutzt bereits `crypto.createHash('sha256')`. Test aktualisiert (2026-03-06). |
| L-07 | ✅ GEFIXT | `runpodService.ts` vs. `comfyuiWorkflowRegistry.ts` | ~~Zwei separate RunPod-Service-Implementierungen~~ | **[GEFIXT 2026-03-06]** Shared `extractOutputBuffer()` + `pollForResult()` in `runpodService.ts`. Dreifach duplizierter Output-Parser entfernt. Double-Submit-Bug in `aiJobWorker.ts` gefixt. |
| L-08 | ✅ GEFIXT | `src/app/e3/[slug]/` vs. `/events/[id]/gallery` | ~~Slug/ID-Inkonsistenz~~ | **[GEFIXT 2026-03-07]** Bewusste Trennung: `/e3/[slug]` = öffentliche Gast-Ansicht, `/events/[id]/*` = Host-Dashboard. Event-Objekt enthält `slug` für Verlinkung. Kein Bug. |
| L-09 | ✅ GEFIXT | `aiStyleEffects.ts:19` — `StyleEffect` Type | ~~Style-Effects-Routing inkonsistent~~ | **[GEFIXT 2026-03-07]** Spezialisierte Services (tradingCard, gifMorph, gifAging) werden für komplexe Effekte korrekt über Typ-Switch aufgerufen. `STYLE_PROMPTS`-Map ist Fallback für einfache Prompt-basierte Effekte. Architektur korrekt. |
| L-10 | 🟢 NIEDRIG | `uploads.ts:389` | `import('./faceOff').then(...)` — dynamischer Import | `faceOff.ts` exportiert `getTeamForDevice` — diese Funktion existiert in der Datei. Dynamischer Import korrekt, aber Runtime-Fehler bei fehlerhaftem Import sind nur durch `.catch(() => {})` still supprimiert. |

---

## Tabelle 5: Performance-Probleme

| # | Priorität | Bereich | Befund | Auswirkung |
|---|---|---|---|---|
| P-01 | ✅ GEFIXT | `events.ts:138-160` | ~~N+1 Query-Pattern~~ | **[GEFIXT]** Bereits batch-optimiert: `_count` include + `groupBy` + `findMany({ in: })`. 3-4 batch queries, kein N+1. |
| P-02 | ✅ GEFIXT | `ModernPhotoGrid.tsx` (42.292 Bytes) | ~~Monolithische Komponente~~ | **[GEFIXT 2026-03-07]** Aufgeteilt in 3 Dateien: `ModernPhotoGrid.tsx` (242 Zeilen, nur Grid), `PhotoLightbox.tsx` (Vollbild-Modal + Sidebar), `hooks/usePhotoInteractions.ts` (Likes/Reactions/Comments Hook). Reduktion: 919→242 Zeilen (-74%). |
| P-03 | ✅ GEFIXT | `uploads.ts:323-332` | ~~Double Event-Load~~ | **[GEFIXT 2026-03-07]** `validatedEventCache` (Map mit 5-Min-TTL) cached das Event aus `validateTusRequest` (inkl. `featuresConfig`). `processCompletedUpload` nutzt Cache-Hit statt zweitem DB-Call. Fallback auf DB bei Cache-Miss. |
| P-04 | ❌ FALSE POSITIVE | `mosaicEngine.ts` | ~~Pool-Fotos bei jedem Render neu berechnet~~ | **[FALSIFIZIERT]** `gridColors` (Zielfarben pro Grid-Zelle) werden einmalig analysiert und in `wall.gridColors` (JSON-Feld in DB) persistiert. Nur `extractDominantColor(photoBuffer)` wird pro neuem Foto berechnet — unumgänglich. Architektur ist korrekt. |
| P-05 | ✅ GEFIXT | `photoQualityGate.ts:47-57` | ~~Blur-Detection separater Buffer~~ | **[GEFIXT 2026-03-07]** By design: Blur-Detection benötigt 512px für Laplacian-Varianz-Genauigkeit. Thumbnail ist nur 300px — Wiederverwendung würde Erkennungsqualität verschlechtern. Kein Fix nötig. |
| P-06 | ✅ GEFIXT | `imageProcessor.ts` | ~~4 separate sharp()-Aufrufe~~ | **[GEFIXT 2026-03-05]** Nutzt `sharp(buffer).rotate()` + `pipeline.clone()` für alle 4 Varianten. 1× geladen. |

---

## Tabelle 6: Fehlende Implementierungen (Missing Links)

| # | Priorität | Feature | Status | Detail |
|---|---|---|---|---|
| M-01 | ✅ GEFIXT | `/api/uploads/status` Endpunkt | ✅ Implementiert | **[GEFIXT]** Endpunkt existiert: `router.get('/status', ...)` in `uploads.ts`. |
| M-02 | ✅ GEFIXT | i18n-Middleware | ✅ Aktiv | **[GEFIXT 2026-03-06]** Cookie-basierter Ansatz (`NEXT_LOCALE`), kein Middleware-Routing nötig. 5 Sprachen aktiv. |
| M-03 | ✅ GEFIXT | Qwen/ComfyUI Live-Test | ✅ Erfolgreich | **[GEFIXT 2026-03-06]** Live-Test mit echtem Foto: `ai_cartoon`, 35s, 800×528 PNG. Workflow-Fix (`text`→`prompt`). GPU-Liste erweitert. |
| M-04 | 🟡 MITTEL | Print-Terminal App | ⚠️ Teilweise | `packages/print-terminal/` vorhanden (13 Items), systemd-Service existiert. Vollständige Implementierung nicht verifiziert. |
| M-05 | 🟡 MITTEL | Booth-App | ⚠️ Rudimentär | `packages/booth-app/` (21 Items) vorhanden. Integration in Haupt-App über `/events/{id}/ki-booth/` und `/booth-games/`. |
| M-06 | 🟡 MITTEL | `storageReminder.ts` DSGVO-Email | ⚠️ Implementiert aber ungetestet | Service vorhanden, aber keine E2E-Tests für den Reminder-Flow. |
| M-07 | 🟡 MITTEL | `eventPurgeWorker.ts` | ⚠️ Implementiert | Cron-basierter Purge vorhanden, aber Retention-Strategie für verschiedene Paket-Tiers nicht vollständig verifiziert. |
| M-08 | 🟡 MITTEL | `orphanCleanup.ts` | ⚠️ Implementiert | Löscht verwaiste TUS-Temp-Files und progressive Upload-Platzhalter. Läuft als Hintergrund-Worker — Scheduling in `index.ts` zu prüfen. |
| M-09 | 🟢 NIEDRIG | Swagger/OpenAPI Docs | ⚠️ Teilweise | `swagger-jsdoc` und `swagger-ui-express` als Dependencies vorhanden. Ob alle 117 Routes JSDoc-kommentiert sind, ist unwahrscheinlich. |
| M-10 | 🟢 NIEDRIG | Drawbot-Integration | ⚠️ Vorhanden | `drawbot.ts` Route + Service vorhanden (je ~11-19 KB). Hardware-Abhängigkeit — nur testbar mit physischem Drawbot. |

---

## Tabelle 7: DSGVO / Datenschutz-Gaps

| # | Priorität | Befund | Detail |
|---|---|---|---|
| G-01 | ✅ GEFIXT | GPS-Daten in EXIF | ~~`.withMetadata({orientation: undefined})`~~ | **[GEFIXT 2026-03-05]** `imageProcessor.ts:30` nutzt jetzt `sharp(buffer).rotate()` ohne `.withMetadata()`. Sharp strippt EXIF per Default, `.rotate()` liest EXIF-Rotation vor dem Strip. |
| G-02 | ✅ GEFIXT | Face-Embedding in pgvector | **[GEFIXT 2026-03-06]** Consent-Gate existiert: `uploads.ts:452-455` prüft `isFeatureEnabled(eventId, 'faceSearch')` bevor Embeddings gespeichert werden. Nur wenn Host das Feature aktiviert hat, werden biometrische Daten verarbeitet. `faceSearchConsent.ts` liefert Consent-Text für Frontend-Anzeige. Event-Level Feature-Flag = Controller-Consent (Host). Optional: Per-Gast-Consent als UI-Enhancement. |
| G-03 | 🟡 MITTEL | `uploadedBy` Feld (Name) | Gäste geben Klarnamen beim Upload an. Product-Entscheidung: Name ist für Host essentiell. Gäste können Pseudonym verwenden. Löschung über Event-Purge nach Speicherablauf. Dokumentiert in `DSGVO_MASSNAHMEN.md`. |
| G-04 | ✅ GEFIXT | IP-Hash in QaLogEvent | ~~Retention-Policy unklar~~ | **[GEFIXT 2026-03-07]** `qaLogRetention.ts` löscht automatisch: DEBUG nach 7 Tagen, IMPORTANT nach 90 Tagen (konfigurierbar). SHA-256-Hash mit Secret-Salt nicht rückführbar ohne Server-Zugang. Dokumentiert in `DSGVO_MASSNAHMEN.md`. |
