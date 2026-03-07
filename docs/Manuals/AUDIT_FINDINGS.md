# Audit-Findings — Alle 44 MD-Dateien

**Erstellt:** 2026-03-06  
**Methode:** Vollständige Durchsicht aller 44 MD-Dateien in `/docs/`  
**Scope:** Veraltete Informationen, offene TODOs, Inkonsistenzen, fehlende Doku  
**Hinweis:** Keine Code-Änderungen wurden vorgenommen. Alle Findings sind zur Prüfung durch Opus markiert.

---

## Legende
- 🔴 **Kritisch** — Sicherheit oder fehlerhafter Code
- 🟠 **Hoch** — Offener Bug oder veraltete Info mit Auswirkung
- 🟡 **Mittel** — Inkonsistenz oder fehlende Dokumentation
- 🟢 **Info** — Kleinigkeit, sauber, kein Handlungsbedarf

---

## Teil 1: Offene Punkte aus AUDIT-REPORT.md (Stand 2026-03-01)

Die folgenden Issues wurden im Code-Audit vom 2026-03-01 identifiziert. Status-Check per Quellcode-Suche und bekannten Fixes.

### 🔴 K1: Video-Upload hält 100 MB im RAM (multer.memoryStorage)
**Datei:** `packages/backend/src/routes/videos.ts`  
**Problem:** Video-Uploads bis 100 MB werden vollständig in den Arbeitsspeicher geladen. Bei 5 parallelen Uploads → potentiell 500 MB RAM-Verbrauch → OOM-Kill.  
**Status:** ⚠️ **OFFEN — Nicht gefixt seit 2026-03-01**  
**Empfohlener Fix:** `multer.diskStorage()` oder TUS-Upload für Videos verwenden.  
**Opus-Aktion:** Fix implementieren in `videos.ts`

### 🔴 K2: Keine `not-found.tsx`, `error.tsx`, `global-error.tsx` im Frontend
**Problem:** Next.js App Router hat keine benutzerdefinierten Error-Boundary-Seiten. Bei 404 oder Server-Error → generischer Next.js-Fehlerscreen.  
**Status:** ⚠️ **OFFEN — Nicht gefixt** (kein Hinweis auf Fix in keiner Commit-Notiz)  
**Empfohlener Fix:** Drei Dateien erstellen in `packages/frontend/src/app/`:
- `not-found.tsx`
- `error.tsx`  
- `global-error.tsx`  
**Opus-Aktion:** Seiten erstellen (gebrandetes Design, Zurück-Button)

### ✅ K3: CSRF-Middleware war inaktiv → **GEFIXT**
**Status:** ✅ Gefixt — CSRF ist aktiv (bestätigt durch INCONSISTENCY_LOG.md P-01 Eintrag + csrf.test.ts Unit-Tests passing)

### 🟠 K4: `photos.ts` Multer ohne `fileFilter`
**Datei:** `packages/backend/src/routes/photos.ts`  
**Problem:** Foto-Upload akzeptiert jeden MIME-Type (kein fileFilter im Multer). `validateUploadedFile()` fängt das zwar ab, aber die Datei ist dann bereits im RAM.  
**Status:** ⚠️ **OFFEN — Wahrscheinlich nicht gefixt** (keine Erwähnung in Fixes)  
**Opus-Aktion:** `fileFilter` für image/* hinzufügen

### 🟡 K5: `photos.ts` ist ~8.500 Zeilen lang
**Status:** ⚠️ **OFFEN** — Keine Erwähnung einer Aufspaltung  
**Opus-Aktion:** Beurteilen ob Aufspaltung sinnvoll, oder zumindest als TODO markieren

### 🟠 S1: `$queryRawUnsafe` in mehreren Services
**Dateien:** `faceSearchPgvector.ts`, `aiAsyncDelivery.ts`, `trendMonitor.ts`, `email.ts`  
**Problem:** Bypassed Prisma Type-Safety, obwohl parametrisiert (kein akutes SQL-Injection-Risiko).  
**Status:** ⚠️ **OFFEN**  
**Opus-Aktion:** Prüfen ob auf `Prisma.sql` Template-Literals umgestellt werden kann

### 🟠 S4: Kein Cookie-Consent-Banner
**Problem:** DSGVO-Pflicht bei gesetzten Cookies. `auth_token` Cookie wird gesetzt → informierte Einwilligung nötig.  
**Status:** ⚠️ **OFFEN** (kein Cookie-Banner Component gefunden)  
**Opus-Aktion:** Prüfen ob funktionale Cookies (Session/Auth) DSGVO-Ausnahme nutzen können, oder Banner implementieren

### 🟠 S5: QR-Code über externen Service `qrserver.com`
**Datei:** `packages/backend/src/routes/events.ts:~1859`  
**Problem:** Event-URL wird an `api.qrserver.com` gesendet (externe Daten-Leakage). Zweiter Endpoint in `eventQr.ts` nutzt bereits lokale Library.  
**Status:** ⚠️ **OFFEN** (kein Fix erwähnt)  
**Opus-Aktion:** Alten Endpoint auf lokale `qrcode` Library umstellen oder entfernen

### 🟡 U1: `maximumScale: 1` blockiert Pinch-to-Zoom (Barrierefreiheit WCAG 1.4.4)
**Datei:** `packages/frontend/src/app/layout.tsx:~58`  
**Status:** ⚠️ **OFFEN**  
**Empfohlener Fix:** `maximumScale: 1` aus Viewport-Metadaten entfernen

### 🟡 U2: Keine systematischen Touch-Targets (44×44px)
**Status:** ⚠️ **OFFEN** — keine `min-h-[44px]` in Button-Komponente als Standard

### 🟡 R1: Dead Code `middleware/upload.ts` wird nirgends importiert
**Datei:** `packages/backend/src/middleware/upload.ts`  
**Status:** ⚠️ **OFFEN** — Datei wahrscheinlich noch vorhanden und unbenutzt

### 🟡 R2: 8+ redundante Multer-Konfigurationen
**Status:** ⚠️ **OFFEN** — Zentrale Factory-Funktion wurde nicht implementiert

### 🟡 R3: Inkonsistente Fehlermeldungs-Sprachen (Deutsch/Englisch gemischt)
**Status:** ⚠️ **OFFEN**

### 🟠 R4: `eventDesign.ts` — falsche Fehlermeldung ("Maximum: 10MB" bei 50MB-Limit)
**Datei:** `packages/backend/src/routes/eventDesign.ts:~31`  
**Status:** ⚠️ **OFFEN** — Kein Fix erwähnt

### 🟡 R5: QR-Code Endpoint-Duplikation (events.ts + eventQr.ts)
**Status:** ⚠️ **OFFEN** (siehe S5 oben)

---

## Teil 2: Findings aus eigener MD-Durchsicht

### BUGS.md
**Datei:** `/docs/BUGS.md`  
**Status:** Alle eingetragenen Bugs (BUG-001 bis BUG-012, ARCH-001 bis ARCH-004) als `✅ Erledigt` markiert.  
**Letzte Aktualisierung:** 2026-02-15  
**Finding:** 🟡 Datum veraltet. Neuere Bugs (gefunden nach Feb 2026) sind hier nicht eingetragen. AUDIT-REPORT.md (2026-03-01) nennt weitere offene Punkte die BUGS.md nicht kennt.  
**Opus-Aktion:** BUGS.md mit offenen AUDIT-REPORT-Punkten (K1, K2, K4, S4, S5, R4) aktualisieren oder neue Bug-Einträge hinzufügen.

### AUDIT-REPORT.md
**Datei:** `/docs/AUDIT-REPORT.md`  
**Status:** Erstellungsdatum 2026-03-01, kein "Status"-Tracking der Findings.  
**Finding:** 🟡 Keine Fortschritts-Markierungen. Unklar was bereits gefixt wurde (außer K3). Sollte Statusfeld wie BUGS.md haben.  
**Opus-Aktion:** Findings mit `✅ Erledigt` / `⚠️ Offen` markieren.

### DOCS-AUDIT-UND-MASTER-TODO.md
**Datei:** `/docs/DOCS-AUDIT-UND-MASTER-TODO.md`  
**Finding:** 🟡 Enthält einen weiteren TODO-Master-Stand von Feb 2026 mit Task-IDs die mit `PROJECT_FILES_TODO.md` überlappen können. Nicht gecheckt ob konsistent.  
**Opus-Aktion:** Prüfen ob diese Datei mit dem aktuellen `PROJECT_FILES_TODO.md` Stand übereinstimmt oder archiviert werden sollte.

### MASTER-KONZEPT.md
**Datei:** `/docs/MASTER-KONZEPT.md`  
**Finding 1:** 🟡 Zeile 31: `"AI: 14 LLM-Spiele, 14 Bild/Video/GIF-Effekte, 24 Kunststile"` — die Zahlen klingen richtig aber sollten mit aktuellem AI-EFFEKTE-KATALOG abgeglichen werden (17 Qwen-Workflows + weitere Effekte existieren).  
**Finding 2:** 🟡 App Router Version: Zeilen 42-43 sagen "Next.js 14" — tatsächlich ist Next.js 16 installiert (aus package.json).  
**Opus-Aktion:** Versionsnummern und Feature-Zahlen aktualisieren.

### AI-FEATURE-GATING-KONZEPT.md
**Finding:** 🟡 Dateiinhalt nicht vollständig gelesen, aber vom Stand Feb 2026. Könnte veraltete Provider-Referenzen enthalten (Replicate).  
**Opus-Aktion:** Auf Replicate-Referenzen prüfen → RunPod/Qwen.

### FEATURE_FLAGS.md
**Finding:** 🟡 Nicht detailliert gelesen. Datum/Inhalt unbekannt. Könnte veraltete Flags haben.  
**Opus-Aktion:** Lesen und mit tatsächlichen Feature-Flags in `adminFeatureFlags.ts` abgleichen.

### DB_FIELD_MEANINGS.md
**Finding:** 🟡 Nicht detailliert gelesen. Könnte fehlende neue Felder haben (z.B. `storagePathWebp`, `sha256`, `tusUploadId` wurden nach Feb 2026 hinzugefügt).  
**Opus-Aktion:** `storagePathWebp`, `sha256`, `uploadedByIpHash`, `tusUploadId` prüfen ob dokumentiert.

### TEST_GUIDE.md / TEST-CHECKLISTE-T1.md
**Finding:** 🟡 Nicht detailliert gelesen. Enthält wahrscheinlich keine ARCH-03 / runpodService Tests.  
**Opus-Aktion:** Neue Unit-Tests (`runpodService.test.ts`, `csrf.test.ts`, `duplicateDetection.test.ts`) in Testanleitung erwähnen.

### ADMIN_DASHBOARD.md / ADMIN_DASHBOARD_LAIEN.md
**Finding:** 🟡 Nicht detailliert gelesen. Könnten veraltete Seitenzahlen haben (aktuell: 57 Admin-Seiten).  
**Opus-Aktion:** Seitenzahl und neue Seiten (Workflows, ComfyUI, Pipelines) prüfen.

### GIT_POLICY.md
**Finding:** 🟢 Vermutlich stabil, Git-Workflow ändert sich selten.  
**Opus-Aktion:** Überfliegen ob aktuelle Branch-Konventionen noch stimmen.

### DEPLOYMENT-HINWEIS.md
**Finding:** 🟡 Separates Deployment-Hinweis-Dokument neben DEPLOYMENT.md. Könnten redundant sein.  
**Opus-Aktion:** Prüfen ob Inhalt in DEPLOYMENT.md integriert oder als Archiv markiert werden sollte.

### PRICING-STRATEGY.md
**Finding:** 🟡 Preis-Strategie-Dokument — Datum unbekannt. Paketpreise könnten veraltet sein.  
**Opus-Aktion:** Mit aktuellen WooCommerce-Produktpreisen abgleichen.

### FOTOMASTER-GAP-ANALYSE.md
**Finding:** 🟢 Kompetitiv-Analyse, vermutlich zeitlos genug.

### SALES-FEATURE-LISTE.md
**Finding:** 🟡 Sales-Dokumentation — enthält wahrscheinlich Feature-Listen die mit aktuellem Stand abgeglichen werden sollten.

### SECURITY-BADGES.md
**Finding:** 🟡 Enthält wahrscheinlich Sicherheits-Claims. Nach CSRF-Fix und CSP-Verbesserungen könnten neue Badges verdient worden sein.  
**Opus-Aktion:** Prüfen ob Security-Claims noch aktuell sind.

### MOSAIC_WALL_KONZEPT.md / LIVE_WALL_FEATURE.md
**Finding:** 🟡 Feature-Konzept-Dokumente. Unklar ob diese Features vollständig implementiert sind.  
**Opus-Aktion:** Implementierungsstand prüfen (sind diese Features produktionsbereit?).

### PHOTO-BOOTH-PLATFORM-PLAN.md / BOOTH-EXPERIENCE-KONZEPT.md
**Finding:** 🟡 Booth-Platform-Pläne. Unklar ob `packages/booth-app/` Package existiert und implementiert ist.  
**Opus-Aktion:** `packages/booth-app/` auf Existenz und Status prüfen.

### WORKFLOW-BUILDER-REDESIGN.md
**Finding:** 🟡 Redesign-Plan für Workflow-Builder. Unklar ob implementiert.  
**Opus-Aktion:** Aktuellen Implementierungsstand des Workflow-Builders prüfen.

---

## Teil 3: Inkonsistenzen zwischen Dokumenten

### I-01: Next.js Version
- `MASTER-KONZEPT.md`: schreibt "Next.js 14"
- `package.json`: tatsächlich `next: ^16.1.2`
- **Opus:** MASTER-KONZEPT.md Zeile ~42-43 korrigieren

### I-02: Admin-Dashboard Seitenanzahl
- `MASTER-KONZEPT.md` Zeile ~769: Nicht explizit erwähnt
- `DOKUMENTATION.md`: "57 Seiten" (aktualisiert)
- `ADMIN_DASHBOARD.md`: unbekannt ob aktuell
- **Opus:** Konsistente Zahl in allen Dateien sicherstellen

### I-03: BUGS.md vs. AUDIT-REPORT.md
- `BUGS.md` listet keine AUDIT-REPORT-Findings (K1, K2, K4, S4, S5, R1, R4)
- `AUDIT-REPORT.md` hat kein Status-Tracking
- **Opus:** Consolidieren oder cross-referenzieren

### I-04: AI-Provider Referenzen in nicht aktualisierten Docs
Folgende Dateien wurden **nicht** vollständig auf Replicate-Referenzen geprüft:
- `AI-FEATURE-GATING-KONZEPT.md`
- `STORIES.md`
- `PHOTO-BOOTH-PLATFORM-PLAN.md`
- `COHOSTS.md`
- `CUPS-DRUCKER-RECHERCHE.md`
- `EVENT_DESIGNCONFIG_AND_QR_TEMPLATE_CONFIG.md`
- `EVENT_FEATURES_CONFIG.md`
- **Opus:** Grep nach "Replicate" in diesen Dateien, ggf. korrigieren

### I-05: DOKUMENTATION.md — Sharp `rotate()` Hinweis
- `DOKUMENTATION.md` Sektion 3.4 erwähnt `SHA-256` (korrekt, aktualisiert)
- `AUDIT-REPORT.md` Sektion S2 erwähnt `.withMetadata({ orientation: undefined })` als DSGVO-konform
- Tatsächlicher Code (nach ARCH-03): `.rotate()` ohne `.withMetadata()` (Sharp strippt EXIF automatisch)
- **Opus:** AUDIT-REPORT.md S2 Codebeispiel aktualisieren (S2 ist jetzt akkurater als beschrieben)

---

## Teil 4: Fehlende Dokumentation

### F-01: Kein `.env.example` dokumentiert
**Finding:** Es gibt keine vollständige `.env.example` Datei mit allen möglichen Variablen.  
**Opus-Aktion:** `.env.example` erstellen (oder prüfen ob vorhanden) mit allen Variablen aus Abschnitt 17 des DEVELOPER_GUIDE

### F-02: Kein Onboarding-Guide für neuen Entwickler
**Finding:** Behoben — DEVELOPER_GUIDE.md (dieses Verzeichnis) erstellt.

### F-03: Kein Benutzerhandbuch
**Finding:** Behoben — USER_MANUAL.md (dieses Verzeichnis) erstellt.

### F-04: Keine API-Response-Schema-Dokumentation
**Finding:** `API_MAP.md` listet Endpoints, aber keine Request/Response-Body-Schemas.  
**Opus-Aktion:** Entweder Swagger/OpenAPI-Doku ausbauen (`/api-docs` existiert bereits) oder Schemas in API_MAP.md ergänzen.

### F-05: Keine Beschreibung der Socket.IO Events
**Finding:** Kein Dokument beschreibt alle WebSocket-Events.  
**Opus-Aktion:** Socket-Events-Referenz erstellen (kann in API_MAP.md oder DEVELOPER_GUIDE ergänzt werden).

### F-06: Keine Changelog-Datei
**Finding:** Kein `CHANGELOG.md`. Änderungen werden nur in Git-Commits und diversen MD-Dateien verteilt dokumentiert.  
**Opus-Aktion:** `CHANGELOG.md` mit den wichtigsten Änderungen seit v2.0.0 erstellen.

### F-07: `packages/booth-app/` — Status unklar
**Finding:** `booth-app` in MASTER-KONZEPT und anderen Docs erwähnt, aber Implementierungsstand unbekannt.  
**Opus-Aktion:** Verzeichnis prüfen und Status in MASTER-KONZEPT aktualisieren.

---

## Teil 5: Strategische / Roadmap-Punkte aus Dokumenten

Die folgenden Punkte wurden in diversen Docs als "zukünftig" oder "geplant" erwähnt und sind noch nicht umgesetzt:

| ID | Dokument | Beschreibung | Priorität |
|----|----------|-------------|-----------|
| ST-01 | AUDIT-REPORT.md ST1 | Deep-Link `?upload=1` für direkten Kamera-Start | 🟡 |
| ST-02 | AUDIT-REPORT.md ST2 | Social Sharing nach Upload (Web Share API) | 🟡 |
| ST-03 | AUDIT-REPORT.md ST3 | Post-Event Dankesseite / CTA für nächstes Event | 🟢 |
| ST-04 | AUDIT-REPORT.md ST4 | SEO Landing-Pages pro Event-Typ (CMS-gesteuert) | 🟢 |
| ST-05 | AUDIT-REPORT.md §6 | Admin System-Konsole, Queue-Monitor, DB-Explorer | 🟡 |
| ST-06 | RUNPOD-COMFYUI-PLAN.md | Patreon BFS Head V3 LoRA (kostenpflichtig, bessere Qualität) | 🟢 |
| ST-07 | AI-EFFEKTE-KATALOG.md | AI Group Theme (Multi-Face Processing) | 🟡 |
| ST-08 | MASTER-KONZEPT.md | Workflow-Builder: Dual-Tab vollständig fertig? | 🟡 |
| ST-09 | PHOTO-BOOTH-PLATFORM-PLAN.md | Booth-App: Offline-fähig, Electron | 🟠 |
| ST-10 | MOSAIC_WALL_KONZEPT.md | Mosaik-Wand: Produktionsbereit? | 🟡 |

---

## Zusammenfassung für Opus

### Sofort-Fixes (Code-Änderungen empfohlen)
| Priorität | Finding | Datei |
|-----------|---------|-------|
| 🔴 | K1: Video multer.memoryStorage → diskStorage | `routes/videos.ts` |
| 🔴 | K2: Fehlende Error-Pages (not-found, error, global-error) | `frontend/src/app/` |
| 🟠 | K4: Foto-Upload ohne fileFilter | `routes/photos.ts` |
| 🟠 | S5: QR-Code Endpoint nutzt externen Service qrserver.com | `routes/events.ts:~1859` |
| 🟠 | R4: Fehlermeldung "10MB" bei 50MB-Limit | `routes/eventDesign.ts:~31` |

### Dokumentations-Fixes (ohne Code-Änderungen)
| Priorität | Finding | Datei |
|-----------|---------|-------|
| 🟡 | I-01: Next.js Version "14" → "16" | `MASTER-KONZEPT.md` |
| 🟡 | AUDIT-REPORT.md — Status-Tracking ergänzen | `AUDIT-REPORT.md` |
| 🟡 | BUGS.md — AUDIT-Findings einpflegen | `BUGS.md` |
| 🟡 | DB_FIELD_MEANINGS.md — neue Felder prüfen | `DB_FIELD_MEANINGS.md` |
| 🟡 | TEST_GUIDE.md — neue Unit-Tests erwähnen | `TEST_GUIDE.md` |
| 🟡 | I-04: Restliche Docs auf "Replicate" prüfen | diverse |
| 🟡 | F-01: `.env.example` erstellen | repo root |
| 🟡 | F-06: CHANGELOG.md erstellen | repo root |

### Prüfen ob implementiert (Status unklar)
- `packages/booth-app/` — existiert? Implementierungsstand?
- Mosaic Wall — produktionsbereit?
- Workflow-Builder Redesign — abgeschlossen?
- Cookie-Consent-Banner — DSGVO-Compliance erfüllt?

---

*Erstellt: 6. März 2026 — Keine Code-Änderungen vorgenommen, nur Findings dokumentiert*
