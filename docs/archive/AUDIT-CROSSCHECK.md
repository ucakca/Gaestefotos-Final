# Gegenprüfung: 3-Modell-Audit-Vergleich
> Erstellt: Konsolidierte Faktenprüfung aller Audit-Dokumente
> Quellen:
> - **Cascade** → `docs/AUDIT-360-GRAD.md` (Code-First, 5 Phasen)
> - **GPT 5.2** → `claude/PHASE_2_LOGIK_AUDIT.md`, `claude/FINAL-TODO-ALLE-AUFGABEN.md`, etc.
> - **Sonnet 4.5** → Worktree `3636d54e/docs/AUDIT-REPORT-360.md` (1059 Zeilen)

---

# TEIL A: Falsche Findings in GPT 5.2 Analysen (claude/*.md)

### ❌ FALSCH: "TUS-Upload hat KEINE Auth/Rate-Limiting" (FINAL-TODO #1)
**Behauptung**: `/api/uploads` ist komplett offen, jeder kann hochladen.
**Realität**: `uploads.ts:42-118` enthält `validateTusRequest()` mit:
- Event-Existenz + isActive Check (Zeile 68-75)
- JWT-Auth via Cookie oder Authorization Header (Zeile 83-98)
- Admin/Host Bypass (Zeile 101-103)
- Event-Access-Cookie für Gäste (Zeile 106-108)
- EventMember-Check für eingeloggte User (Zeile 111-116)
- `tusCreateLimiter` (30/min) auf POST (Zeile 31-36, 373-374)

**Urteil**: ✅ **BEREITS GESICHERT**. Kein Action-Item nötig.

### ❌ FALSCH: "API Rate-Limiter ist auskommentiert" (FINAL-TODO #2)
**Behauptung**: Globaler Limiter in `index.ts` Zeile ~150 ist auskommentiert.
**Realität**: `index.ts:342` → `app.use('/api', apiLimiter);` ist AKTIV.

**Urteil**: ✅ **BEREITS AKTIV**. Kein Action-Item nötig.

### ❌ FALSCH: "Virus-Scan ist STUB" (PHASE_3_SECURITY_AUDIT Finding 4.1)
**Behauptung**: `virusScan.ts` markiert alles als CLEAN ohne echten Scan.
**Realität**: ClamAV 1.4.3 wurde in Security Audit Phase E (15.02.2026) installiert. `virusScan.ts` nutzt echtes `clamdscan` via Unix Socket. Infizierte Dateien werden auto-gelöscht.

**Urteil**: ✅ **BEREITS BEHOBEN**. Kein Action-Item nötig.

### ❌ FALSCH: "Upload-Confetti deaktiviert" (PHASE_2 Bug 4)
**Behauptung**: `triggerUploadConfetti()` ist auskommentiert.
**Realität**: Wurde in Session TD-6 re-enabled.

**Urteil**: ✅ **BEREITS BEHOBEN**. Kein Action-Item nötig.

### ❌ FALSCH: "QR Design Table Missing" (PHASE_2 Bug 1)
**Behauptung**: `qrDesign` Table fehlt im Schema.
**Realität**: QrDesign Model + real Prisma upsert wurde in Session TD-3 implementiert.

**Urteil**: ✅ **BEREITS BEHOBEN**. Kein Action-Item nötig.

### ⚠️ TEILWEISE FALSCH: "Post-Processing ist BLOCKING" (PHASE_2 Problem 1)
**Behauptung**: Face Detection, Duplicate Detection etc. blockieren die Response.
**Realität**: In `photos.ts:538-585` sind Face Detection UND Duplicate Detection als `(async () => { ... })()` — **fire-and-forget, non-blocking**. Mosaic-Placement ist ebenfalls `.then().catch()`. Die Response (`res.status(201)`) wird SOFORT nach dem DB-Insert gesendet (Zeile 607).
**Was STIMMT**: `imageProcessor.processImage()` (Zeile 387) und die 3 Storage-Uploads (Zeile 422-426) BLOCKIEREN die Response. Das sind ~1-3 Sekunden.

**Urteil**: ⚠️ Image-Processing blockiert (~1-3s), aber Post-Processing ist bereits async.

### ⚠️ TEILWEISE FALSCH: "Upload-Fenster zu restriktiv ±1 Tag" (PHASE_2 Problem 4)
**Behauptung**: Hardcoded ±1 Tag.
**Realität**: `photos.ts:91-93` zeigt `uploadToleranceDays` ist bereits aus `featuresConfig` konfigurierbar mit Default 1.

**Urteil**: ⚠️ Bereits konfigurierbar, aber Default könnte höher sein (3 statt 1).

---

# TEIL B: Falsche Findings in Sonnet 4.5 Audit (AUDIT-REPORT-360.md)

### ❌ FALSCH: "L2: Face Detection WASM Memory Leak — WASM lädt pro Request neu" (BUG-3)
**Behauptung**: `faceRecognition.ts:34` — TensorFlow.js WASM-Backend lädt WebAssembly pro Request neu. Memory-Leak bei 1000 Uploads/Tag.
**Realität**: `faceRecognition.ts:12-17` hat **bereits Singleton-Pattern**:
```typescript
if (faceapi === false) return false;  // Already failed
if (faceapi !== null) return true;    // Already loaded ← SINGLETON!
```
Die Funktion `loadFaceApiModules()` wird nur 1× ausgeführt. Bei jedem weiteren Call → sofortiger Return. Kein Memory Leak.

**Urteil**: ✅ **BEREITS SINGLETON**. Kein Bug.

### ❌ FALSCH: "L5: Smart Album Chain — Redundante Queries bei manueller Kategorie"
**Behauptung**: Bei gesetzter `categoryId` werden trotzdem beide Smart-Album-Funktionen aufgerufen.
**Realität**: `uploads.ts:222-235` zeigt korrekte Logik:
```
Zeile 223: let resolvedCategoryId = categoryId || null;
Zeile 224: if (!resolvedCategoryId) { ... }       ← Übersprungen wenn categoryId gesetzt
Zeile 231: if (!resolvedCategoryId && !categoryId) ← Übersprungen wenn categoryId gesetzt
```
Wenn `categoryId` übergeben wird, wird KEINE Smart-Album-Funktion aufgerufen.

**Urteil**: ✅ **LOGIK IST KORREKT**. Kein Bug.

### ❌ FALSCH: "Zero TODOs/FIXMEs — Keine grep-Treffer"
**Behauptung**: "Keine grep-Treffer für TODO/FIXME/HACK/DEPRECATED. Sauberer Code ohne technische Schulden-Marker."
**Realität**: `videos.ts` enthält 2 TODO-Matches. Grep-Suche bestätigt dies.

**Urteil**: ❌ **Falsch.** Mindestens 2 TODOs im Backend.

### ❌ FALSCH: "DB2: Prisma Default Pool = unbegrenzt"
**Behauptung**: "Prisma Default Pool = unbegrenzt → Bei Traffic-Spike → DB-Overload."
**Realität**: Prisma Default Connection Pool ist `num_cpus × 2 + 1` (dokumentiert). Auf dem Ryzen 9 5950X = ~33. **Nicht unbegrenzt.**

**Urteil**: ❌ **Falsch.** Prisma hat sinnvolle Defaults. Kein akutes Risiko.

### ⚠️ IRREFÜHREND: "Console.log 42 Vorkommen im Production-Backend"
**Behauptung**: 42 console.log/error im Backend → "Production-Backend sollte strukturiertes Logging nutzen."
**Realität**: Grep zeigt 42 Matches in **5 Dateien**:
- `scripts/rerender-mosaic-tiles.ts` — 16 (Script, kein Runtime-Code)
- `scripts/test-blend.ts` — 13 (Script)
- `scripts/update-overlay-and-rerender.ts` — 9 (Script)
- `routes/printService.ts` — 3 (Runtime)
- `routes/events.ts` — 1 (Runtime)

**38/42 (90%) sind in Scripts**, nicht im Production Runtime. Nur **4 console.log** in tatsächlichem Runtime-Code.

**Urteil**: ⚠️ **Irreführend.** 4 console.log im Runtime sind Minor, kein "strukturelles Problem".

### ⚠️ WIDERSPRUCH: "Services laufen als Non-Root User (gaestefotos)" + "Systemd Hardening"
**Behauptung** (Sonnet Zeile 536-537): Services laufen als Non-Root User mit NoNewPrivileges, ProtectSystem.
**Widerspruch** (GPT FINAL-TODO #5): Root-zu-User-Migration "VORBEREITET, NICHT AUSGEFÜHRT".
**Memory** (Security Audit Phase E): "H6: Services still running as root — needs dedicated user + systemd hardening."

**Urteil**: ⚠️ **WIDERSPRÜCHLICH** zwischen den Audits. Muss auf dem Server verifiziert werden.

### ⚠️ ÜBERTRIEBEN: "S3: Missing HTTPS Enforcement — Cookies ohne secure Flag"
**Behauptung**: `secure: process.env.NODE_ENV === 'production'` kann in Prod deaktiviert sein → MitM möglich.
**Realität**: `NODE_ENV=production` ist via systemd/deploy.sh gesetzt. `isProd` prüft genau das. In Production sind Cookies **immer secure**. Risiko besteht NUR bei fehlkonfiguriertem Deployment — extrem unwahrscheinlich mit aktuellen systemd-Services.

**Urteil**: ⚠️ **Theoretisch korrekt, praktisch irrelevant.** `secure: true` hardcoden ist trotzdem Best Practice.

---

# TEIL C: Korrekte Sonnet-Findings (Bestätigt)

### ✅ BUG-1/L1: Storage Limit Race Condition — BESTÄTIGT (Alle 3 Audits)
Alle drei Modelle finden dasselbe Problem: `assertUploadWithinLimit()` → Delay → `prisma.photo.create()`. Kein Lock, kein Transaction. **Echter Bug bei Concurrent Uploads.**

### ✅ BUG-2/L3: Progressive Upload Orphan — BESTÄTIGT
`uploads.ts:248-260` macht `prisma.photo.update()` ohne Existenz-Check. Wenn Phase 1 fehlschlug → `RecordNotFound`. **Echter Bug.**

### ✅ BUG-4/S4: Timing Attack bei Login — BESTÄTIGT
`auth.ts:756`: `user ? await bcrypt.compare(...) : false` → ohne User wird bcrypt übersprungen → schnellere Response → User-Enumeration möglich. **Echtes Security-Finding.** Fix: Dummy-Hash-Compare.

### ✅ S2: Weak Password Policy — BESTÄTIGT
`auth.ts:367`: `z.string().min(8)` — keine Komplexitätsanforderungen. "12345678" ist valide. **Korrekt.**

### ✅ OPT-4/Progressive JPEG — BESTÄTIGT (Neues Finding!)
`imageProcessor.ts:41` zeigt `.jpeg({ quality: 85 })` **ohne `progressive: true`**. Progressive JPEG wäre ein **1-Zeilen-Fix** für ~40% schnelleres visuelles Laden. **Exzellenter Quick-Win.**

### ✅ DB1: Fehlende Composite Indexes — BESTÄTIGT
Sinnvolle Index-Vorschläge: `[eventId, status, createdAt]`, `[eventId, uploadedBy]`. Übereinstimmt mit GPT-Phase-2-Finding.

### ✅ SF2: Rate Limiting per User statt nur IP — BESTÄTIGT (Neues Finding!)
Bei Shared WiFi (z.B. Hochzeit mit 200 Gästen am selben Router) teilen sich alle 1 IP → Rate Limit greift zu schnell. **Guter Punkt.**

### ✅ BUG-6: Test Coverage 0.03% — BESTÄTIGT
48 Tests bei 148k LOC. Alle drei Audits stimmen überein: **Kritisch unzureichend.**

### ✅ L4: Inkonsistente Error-Handling TUS vs Multipart — BESTÄTIGT
TUS-Pfad wirft generisches `throw error`, Multipart-Pfad hat differenzierte HTTP-Responses. **Korrekt.**

---

# TEIL D: Nur in Sonnet — Neue Findings

| Finding | Quelle | Bewertung | Prio |
|---------|--------|-----------|------|
| **Progressive JPEG** (1-Zeilen-Fix) | OPT-4 | `.jpeg({ quality: 85, progressive: true })` — Zero-Cost UX-Win | **P0** |
| **Timing Attack Login** | S4/BUG-4 | bcrypt-Dummy-Hash bei nicht-existierendem User | **P1** |
| **Rate Limit per User statt IP** | SF2 | Shared WiFi bei Events = echtes Problem | **P1** |
| **Weak Password Policy** | S2 | Min 10 Zeichen + Komplexität | **P2** |
| **Batch WebSocket Emissions** | OPT-4 | Buffer 2s, 1000 Messages → 30 | **P2** |
| **Smart Album Redis Cache** | OPT-3 | Category-Queries cachen (100ms → 5ms) | **P3** |
| **CSP Nonce für Inline-Scripts** | SF1 | Per-Request Nonce für XSS-Prevention | **P3** |
| **Password History** (letzte 5) | S5 | Verhindert Wiederverwendung nach Breach | **P3** |
| **Nginx Config versionieren** | Struktur #9 | Deployment-Reproduzierbarkeit | **P2** |
| **.cursor Verzeichnis im Repo** | Struktur #3 | In `.gitignore` aufnehmen | **P0** |

---

## ✅ BESTÄTIGT — Korrekte Findings (Übereinstimmung aller Audits)

### Beide Audits bestätigen:

| Finding | GPT/Sonnet | Cascade | Status |
|---------|------------|---------|--------|
| **Race Condition Quota** | Problem 3: Concurrent Uploads | L3: Memory-Pressure + L5: Mosaic Lock | OFFEN |
| **N+1 / Nested JOINs** | Problem 2: challengeCompletions | Nicht separat gelistet | OFFEN (niedrig) |
| **Upload-Code Duplikation** | Erwähnt in Pipeline | L2: TUS vs Standard Pipeline | OFFEN |
| **Face Search O(n)** | Feature 5: Face-Grouping | L4: Lineare Scan-Komplexität | OFFEN |
| **BullMQ Job-Queue** | Problem 1: Job-Queue Vorschlag | T4: Bull/BullMQ | OFFEN (langfristig) |
| **PWA Offline-Support** | Feature 1: PWA | U4: Offline-Galerie | OFFEN |
| **WebP-Generierung** | Nicht erwähnt | T2: WebP/AVIF | OFFEN |
| **Dead Code** | Phase 1 Report | F1-F7: 17 Komponenten etc. | OFFEN |
| **God-Objects >1000 Zeilen** | Nicht erwähnt | F8: 9 Dateien >1000 Zeilen | OFFEN |
| **Co-Host Permissions untypisiert** | Finding 1.2: JSON ohne Zod | Nicht separat gelistet | OFFEN |
| **Root-Migration** | FINAL-TODO #5 | Nicht in Scope | USER-ENTSCHEIDUNG |
| **Services als root** | H6 Memory | Nicht in Scope | USER-ENTSCHEIDUNG |

---

## 🆕 NUR in GPT/Sonnet — Neue Findings

| Finding | Quelle | Bewertung | Priorität |
|---------|--------|-----------|-----------|
| **Soft-Delete ohne Grace Period** | Phase 2 Problem 5 | Guter Vorschlag. Event-Löschung ist sofort, kein 7-Tage-Recovery | MITTEL |
| **Package-Upgrade Entitlement-Duplikat** | Phase 2 Problem 6 | Valider Punkt. Alte Entitlements bleiben ACTIVE bei Upgrade | MITTEL |
| **sameSite: 'lax' → 'strict'** | Phase 3 Finding 1.1 | Korrekt, aber 'strict' bricht Cross-Origin-Flows (Invite-Links). PRÜFEN | NIEDRIG |
| **JWT Key Rotation** | Phase 3 Finding 2.2 | Sinnvoll für Production, aber kein akutes Risiko | NIEDRIG |
| **Composite Index [eventId, isStoryOnly, createdAt]** | Phase 2 Finding 1 | Guter Performance-Vorschlag | MITTEL |
| **Upload-Flow 8→2 Schritte** | UX_ANALYSE + UPLOAD_FLOW_EMPFEHLUNGEN | Kern-UX-Verbesserung. QuickUploadModal-Spec existiert | HOCH |
| **Trust Badges deployen** | FINAL-TODO #3 | Code fertig, nur Deploy fehlt | HOCH |

## 🆕 NUR in Cascade — Neue Findings

| Finding | Bewertung | Priorität |
|---------|-----------|-----------|
| **17 ungenutzte Frontend-Komponenten** (F1) | 135 KB Dead Code detailliert identifiziert | HOCH |
| **Doppelte Wizard-Systeme** (F2) | wizard/ vs setup-wizard/ | HOCH |
| **4 ungenutzte Hooks** (F3) | useBrowserLanguage, usePullToRefresh, etc. | MITTEL |
| **2 ungenutzte Backend-Services** (F4) | exifStrip, videoProcessor | MITTEL |
| **6 doppelte Upload-Komponenten** (F6) | 8 Varianten, 3+ redundant | HOCH |
| **5 doppelte Gallery-Komponenten** (F7) | ModernPhotoGrid + 4 Legacy | MITTEL |
| **9 God-Objects >1000 Zeilen** (F8) | events.ts: 2450 Zeilen! | MITTEL |
| **14 Seiten ohne Meta-Tags** (SEO) | login, register, agb, datenschutz, etc. | MITTEL |
| **3 `<img>` ohne alt-Attribut** | Accessibility | NIEDRIG |
| **Progressive Upload Zombie-Records** (L6) | Kein Cleanup für abgebrochene Progressive Uploads | NIEDRIG |
| **faceSearch nicht in ALWAYS_ENABLED** | Pricing-Bug: USP für alle Tiers | HOCH |
| **TUS Upload-Dir in API Response** (S4) | Server-Pfad-Leak | NIEDRIG |
| **SUPERADMIN im Code, nicht im Schema** (S2) | Inkonsistenz | NIEDRIG |
| **5× dangerouslySetInnerHTML** (XSS) | CMS-Content ohne Sanitization | MITTEL |

---

# KONSOLIDIERTE TODO-LISTE (3-Modell-Synthese, Priorisiert)

## 🔴 P0 — SOFORT (1-2 Tage) — Quick Wins

| # | Task | Quelle | Aufwand | Impact |
|---|------|--------|---------|--------|
| 1 | **Progressive JPEG aktivieren** — `.jpeg({ quality: 85, progressive: true })` | Sonnet OPT-4 | **1 Zeile** | 40% schnelleres visuelles Laden |
| 2 | **Dead Code löschen** — 17 Komponenten, 4 Hooks, 2 Services, Legacy Wizard | Cascade F1-F5 | 2h | Bundle-Größe, Wartbarkeit |
| 3 | **`faceSearch` in ALWAYS_ENABLED_FEATURES** | Cascade | 5min | Pricing-Bug, USP |
| 4 | **TUS Upload-Dir aus Status-Endpoint** | Cascade S4 | 5min | Security-Leak |
| 5 | **3× `<img>` ohne alt fixen** | Cascade | 15min | Accessibility |
| 6 | **Trust Badges deployen** (Code fertig!) | GPT FINAL-TODO #3 | 30min | Marketing/Conversion |
| 7 | **.cursor Verzeichnis in .gitignore** | Sonnet Struktur #3 | 1min | Repo-Hygiene |

## 🟡 P1 — KURZFRISTIG (1 Woche)

| # | Task | Quelle | Aufwand | Impact |
|---|------|--------|---------|--------|
| 8 | **Upload-Flow vereinfachen** (8→2-3 Schritte) | GPT UX-Analyse | 8-10h | 2× mehr Uploads |
| 9 | **Storage Limit Race Condition fixen** (Redis Lock oder Tx) | Alle 3 Audits | 4h | Finanzieller Bug |
| 10 | **Progressive Upload Fallback** (Existenz-Check vor Update) | Sonnet BUG-2 + Cascade L6 | 30min | Datenverlust-Bug |
| 11 | **Timing Attack Fix** (Dummy bcrypt bei unbekanntem User) | Sonnet S4/BUG-4 | 30min | User-Enumeration |
| 12 | **Shared processUploadedPhoto() Service** | Cascade L2 + Sonnet L4 | 4h | Konsistenz |
| 13 | ~~DOMPurify für CMS-Content~~ | ~~Cascade~~ | — | **GESTRICHEN: Bereits sanitized (DOMPurify)** |
| 14 | **Rate Limit per User statt nur IP** (keyGenerator) | Sonnet SF2 | 1h | Shared-WiFi-Events |
| 15 | **`secure: true` hardcoden** statt isProd (hochgestuft von P2) | Sonnet S3 + Opus-Review | 15min | Security Best Practice |
| 16 | **WebP als 4. Variante** in imageProcessor | Cascade T2 | 2h | 30-50% kleinere Bilder |
| 17 | **.env.example** für admin-dashboard, print-terminal, booth-app | Cascade F9 | 30min | Onboarding |

## 🟢 P2 — MITTELFRISTIG (2-4 Wochen)

| # | Task | Quelle | Aufwand | Impact |
|---|------|--------|---------|--------|
| 18 | **Composite DB-Indexes** [eventId, status, createdAt] etc. | GPT + Sonnet DB1 | 30min | 10× schnellere Queries |
| 19 | **Weak Password Policy** (min 10, Komplexität) — hochgestuft von P2 | Sonnet S2 + Opus-Review | 1h | Security |
| 20 | **Co-Host Permissions Zod-Validierung** | GPT Phase 3 | 2h | Type-Safety |
| 21 | **Event Soft-Delete mit 7-Tage Grace Period** | GPT Phase 2 | 4h | Datenverlust-Schutz |
| 22 | **Package-Upgrade: Alte Entitlements deaktivieren** | GPT Phase 2 | 2h | Business-Logic-Bug |
| 23 | **Backend Unit Tests aufbauen** (30+ Tests) | Cascade F11 + Sonnet BUG-6 | 16h | Qualitätssicherung |
| 24 | **events.ts in Sub-Router aufteilen** (2450→4 Dateien) | Cascade F8 | 4h | Wartbarkeit |
| 25 | **Batch WebSocket Emissions** (Buffer 2s) | Sonnet OPT-4 | 3h | 97% weniger Re-Renders |
| 26 | **Upload-Komponenten konsolidieren** (8→3) | Cascade F6 | 4h | Code-Hygiene |
| 27 | **Progressive-Upload Zombie-Cleanup Worker** | Cascade L6 | 2h | Daten-Hygiene |
| 28 | **Mosaic Placement Retry-Loop** | Cascade L5 | 2h | Race Condition Fix |
| 29 | **Nginx Config versionieren** (in Repo) | Sonnet Struktur #9 | 1h | Reproduzierbarkeit |
| 30 | **uploadToleranceDays Default: 1→3** | GPT Phase 2 | 5min | UX |
| 31 | **TUS Error-Handling** differenziert (wie Multipart) | Sonnet L4 | 2h | UX bei Fehlern |
| 32 | **Page-spezifische Meta-Tags** (nice-to-have, ~13 Seiten) — runtergestuft von P1 | Cascade (korrigiert) | 2h | SEO (Low, Root-Fallback existiert) |

## 🔵 P3 — LANGFRISTIG (Q3-Q4 2026)

| # | Task | Quelle | Aufwand | Impact |
|---|------|--------|---------|--------|
| 33 | **pgvector für Face Search** — nur bei n>5000 relevant (aktuell O(n) akzeptabel) | Cascade (korrigiert) | 8h | Skalierung (erst bei Wachstum) |
| 34 | **BullMQ Job-Queue** für async Processing | Alle 3 | 16h | Robustheit |
| 35 | **Image CDN (Imgproxy/Cloudflare)** | Cascade + Sonnet | 8h | Performance |
| 36 | **PWA Offline-Galerie** (Service Worker) | Alle 3 | 8h | UX bei schlechtem Empfang |
| 37 | **JWT Key Rotation** | GPT + Sonnet | 4h | Security |
| 38 | **Services als dedizierten User** (nicht root) — VERIFIZIEREN | GPT + Memory H6 | 4-6h | Security |
| 39 | **CSP Nonce für Inline-Scripts** | Sonnet SF1 | 4h | XSS-Prevention |
| 40 | **Password History** (letzte 5 Hashes) | Sonnet S5 | 4h | Security |
| 41 | **Smart Album Redis Cache** (Category-Queries) | Sonnet OPT-3 | 2h | Performance |
| 42 | **Shared Package erweitern** (Types/Validation) | Cascade F13 | 8h | DRY |

---

# TEIL E: Selbstkritik — Cascade-Fehler (via Opus-Findings Review)

> Quelle: `OPUS-FINDINGS-CRITICAL-REVIEW.md` (Sonnet 4.5 Post-Audit Validation)

### ❌ FALSCH: "5× dangerouslySetInnerHTML = XSS-Risiko" (Cascade S-Finding)
**Mein Claim**: 5× dangerouslySetInnerHTML ohne Sanitization → DOMPurify für CMS-Content nötig.
**Realität**: Tatsächlich **9× gefunden** (nicht 5), aber:
- **4× CMS-Seiten** (agb, datenschutz, impressum, faq): ALLE nutzen `sanitizeCmsHtml()` → DOMPurify. **BEREITS SANITIZED.**
- **1× Landing Page** (`page.tsx:642`): Statische Feature-Liste, kein User-Input.
- **4× Admin-Dashboard** (Email-Templates, QR-Templates, Invitation-Templates): Admin-Only, kein Public Exposure.

**Mein Fehler**: Ich habe das Pattern `dangerouslySetInnerHTML` gefunden, aber **nicht den Datenfluss verfolgt**. Die `sanitizeCmsHtml()`-Funktion importiert DOMPurify und sanitized allen CMS-Content korrekt.

**Urteil**: ❌ **FALSE POSITIVE.** 0/9 Vorkommen sind echte XSS-Vektoren. Severity: ~~MEDIUM~~ → **NEGLIGIBLE.**

### ⚠️ ÜBERTRIEBEN: "14 Seiten ohne Meta-Tags" (Cascade SEO-Finding)
**Mein Claim**: 14 Seiten ohne Meta-Tags → SEO-Lücke.
**Realität**:
- **32 Seiten** existieren (nicht 14 — falsch gezählt)
- **Root Layout** (`layout.tsx`) exportiert Default-Metadata (title, description, OG, Twitter) die an **alle Seiten vererbt** wird
- **`e3/[slug]/layout.tsx`** hat dynamische `generateMetadata()` für Event-Seiten
- Page-spezifische Metadata fehlen für ~13 öffentliche Seiten, aber Root-Fallback deckt Grundbedarf

**Mein Fehler**: Zählung war falsch, und ich habe das Next.js Layout-Metadata-Inheritance-System nicht berücksichtigt.

**Urteil**: ⚠️ **ÜBERTRIEBEN.** Severity: ~~MEDIUM~~ → **LOW.** Page-spezifische Meta wäre nice-to-have, nicht kritisch.

### ⚠️ ÜBERTRIEBEN: "Face Search O(n) — Performance-Problem" (Cascade L4)
**Mein Claim**: Face Search scannt linear alle Fotos → O(n) → pgvector nötig.
**Realität**:
- **n < 1000** für 99% der Events (Median ~200 Fotos)
- **Response Time < 2s** bei 500 Fotos
- O(n) ist **erwartetes Verhalten** für Vector-Similarity-Search bei dieser Größenordnung
- pgvector/FAISS würde 5-10× mehr Komplexität für <1% Performance-Gain bei n<1000 bringen

**Mein Fehler**: Ich habe eine theoretische Skalierungssorge als aktuelles Performance-Problem dargestellt.

**Urteil**: ⚠️ **ÜBERTRIEBEN.** Severity: ~~MEDIUM~~ → **NEGLIGIBLE** für aktuellen Use-Case. Erst relevant bei n>5000.

### Was ich UNTERSCHÄTZT habe:
- **HTTPS Cookie-Enforcement** (`secure: isProd`): Ich hatte es als P2/"praktisch irrelevant" eingestuft. Sonnet stuft es als P0 ein. Realität: Best Practice ist `secure: true` hardcoden.
- **Weak Password Policy**: War nur als P2 gelistet. Für eine Produktions-App mit Zahlungsdaten sollte das höher sein.

---

# 3-MODELL-VERGLEICH (Korrigiert)

## Fehler-Statistik

| Metrik | GPT 5.2 (claude/*.md) | Sonnet 4.5 (AUDIT-REPORT-360) | Cascade (AUDIT-360-GRAD) |
|--------|----------------------|-------------------------------|---------------------------|
| **Falsche Findings** | 5 | 4 | 1 (dangerouslySetInnerHTML) |
| **Übertriebene Findings** | 2 | 2 | 2 (Meta-Tags, Face Search O(n)) |
| **Korrekte Findings** | 12 | 15 | 22 |
| **Einzigartige Findings** | 7 | 10 | 11 |
| **Feature-Vorschläge** | 10 | 10 | 10 |

## Falsche Findings im Detail

### GPT 5.2 — 5 Fehler
1. TUS-Upload "hat keine Auth" → hat `validateTusRequest()` mit JWT/Cookie/EventMember
2. API Rate-Limiter "auskommentiert" → aktiv auf `index.ts:342`
3. Virus-Scan "ist STUB" → ClamAV 1.4.3 integriert
4. Upload-Confetti "deaktiviert" → re-enabled in TD-6
5. QR Design Table "fehlt" → implementiert in TD-3

### Sonnet 4.5 — 4 Fehler
1. Face Detection "WASM Memory Leak" → Singleton-Pattern existiert (`faceapi !== null`)
2. Smart Album "redundante Queries" → Conditional-Logik ist korrekt
3. "Zero TODOs" → `videos.ts` hat 2 TODOs
4. Prisma Pool "unbegrenzt" → Default ist `num_cpus × 2 + 1`

### Cascade — 1 Fehler, 2 Übertreibungen
1. dangerouslySetInnerHTML "XSS-Risiko" → alle 9 Vorkommen bereits sanitized (DOMPurify) oder admin-only
2. Meta-Tags "14 Seiten" → 32 Seiten existieren, Root-Layout vererbt Default-Metadata
3. Face Search "O(n) Performance-Problem" → bei n<1000 erwartbar und akzeptabel

## Qualitäts-Bewertung

| Kriterium | GPT 5.2 | Sonnet 4.5 | Cascade |
|-----------|---------|------------|----------|
| **Faktengenauigkeit** | 6/10 | 7/10 | 8/10 |
| **Tiefe der Analyse** | 7/10 | 8/10 | 9/10 |
| **Praxisrelevanz** | 8/10 | 9/10 | 8/10 |
| **UX-Insights** | 10/10 | 6/10 | 7/10 |
| **Security-Audit** | 4/10 (5 Fehler!) | 8/10 | 7/10 (1 False Positive) |
| **Quick-Win-Erkennung** | 7/10 | 9/10 (Prog. JPEG!) | 8/10 |
| **Context-Analyse** | 5/10 | 8/10 (DOMPurify erkannt!) | 6/10 (DOMPurify übersehen) |
| **Gesamt** | **6.7/10** | **7.9/10** | **7.6/10** |

## Stärken pro Modell

- **GPT 5.2**: Beste UX-Analyse (Upload-Flow 8→2 Schritte), Business-Logic-Findings (Entitlement-Bug, Soft-Delete)
- **Sonnet 4.5**: Bester Quick-Win (Progressive JPEG = 1 Zeile), Security-Findings (Timing Attack, Password Policy), Performance-Ideen (Batch WS, Redis Cache)
- **Cascade**: Detaillierteste Code-Analyse (Dead Code, God-Objects, Accessibility), aber 1 False Positive (dangerouslySetInnerHTML) wegen fehlender Datenfluss-Analyse

## Fazit

Die 3-Modell-Strategie + gegenseitige Rückprüfung hat sich bewährt: **42 Action-Items** aus der Synthese, davon **3 korrigiert** nach Opus-Review. Alle drei Modelle haben Fehler gemacht — GPT 5.2 die meisten (5), Sonnet 4.5 vier, Cascade drei (1 False Positive + 2 Übertreibungen). **Kein Modell war fehlerfrei.** Die Rückprüfung durch ein weiteres Modell hat 3 Cascade-Fehler aufgedeckt, die sonst in die TODO-Liste geflossen wären. **Lesson learned**: Auch Code-First-Audits brauchen Gegenprüfung — Pattern-Matching ohne Datenfluss-Analyse (dangerouslySetInnerHTML ohne DOMPurify-Check) produziert False Positives.
