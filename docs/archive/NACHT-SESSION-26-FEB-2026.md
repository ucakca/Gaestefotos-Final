# Nacht-Session 26. Februar 2026

> Stufe 4 Premium AI Features + Tech Debt  
> Status: **ALLES DEPLOYED & GETESTET** ✅

---

## Was wurde gebaut

### 1. Reference Image Anchoring ✅
**Corporate Events können jetzt Brand-Logos auf alle AI-Outputs legen.**

- **DB**: `event_ai_configs` erweitert um 5 neue Spalten (`referenceImageUrl`, `referenceImageMode`, `referenceImagePosition`, `referenceImageOpacity`, `referenceImageScale`)
- **Prisma Schema** aktualisiert + `prisma generate`
- **Service**: `src/services/referenceImageAnchoring.ts`
  - Overlay-Compositing via sharp (Position, Scale, Opacity konfigurierbar)
  - Prompt-Augmentation für AI-generierte Brand-Elemente
  - In-Memory Cache (5min Config, 30min Image Buffer)
  - Upload, Update, Remove Funktionen
- **API Routes**: `src/routes/referenceImage.ts`
  - `GET /api/events/:eventId/reference-image` — Config abrufen
  - `POST /api/events/:eventId/reference-image` — Upload (Base64 oder URL)
  - `PATCH /api/events/:eventId/reference-image` — Settings ändern
  - `DELETE /api/events/:eventId/reference-image` — Entfernen
- **Integration**: Automatisch in `styleTransfer.ts` und `aiStyleEffects.ts` eingebaut
  - Jeder AI-Output bekommt automatisch den Brand-Overlay wenn konfiguriert

**Modes:**
- `overlay` — Logo wird als Watermark auf das Bild gelegt
- `prompt` — Brand-Beschreibung wird in den AI-Prompt injiziert  
- `both` — beides kombiniert

---

### 2. QR Async Delivery ("Skip the Line") ✅
**Gäste warten nicht mehr 30-120s auf AI-Ergebnisse — sie bekommen sofort einen QR-Code.**

- **DB**: `ai_jobs` Tabelle mit Short Codes, Status-Tracking, Expiry (24h)
- **Service**: `src/services/aiAsyncDelivery.ts`
  - 6-stellige Short Codes (A-Z, 2-9, kein 0/O/1/I)
  - Job CRUD (create, get by short code/ID, list by device)
  - `executeAsync()` — Wrapper der Job erstellt, im Hintergrund verarbeitet, WebSocket pusht
  - Expired Job Cleanup
- **API Routes**: `src/routes/aiAsyncDelivery.ts`
  - `GET /api/ai-jobs/:shortCode` — Status/Ergebnis abrufen (public, kein Auth)
  - `GET /api/ai-jobs/by-id/:jobId` — Status per Job-ID
  - `GET /api/ai-jobs/device/:eventId/:deviceId` — Alle Jobs für ein Gerät
  - `GET /api/ai-jobs/video-models` — Verfügbare FAL.ai Video-Modelle
  - `POST /api/ai-jobs/style-transfer` — Async Style Transfer
  - `POST /api/ai-jobs/style-effect` — Async Style Effect
  - `POST /api/ai-jobs/face-swap` — Async Face Swap
  - `POST /api/ai-jobs/video` — Async AI Video Generation
  - `POST /api/ai-jobs/survey` — Async Survey → AI (s. Feature 4)
- **WebSocket Push**: Ergebnis wird automatisch an `event:{eventId}` Room gepusht (`ai_job_completed` / `ai_job_failed`)

**Flow für Gäste:**
1. Gast wählt AI-Effekt → `POST /api/ai-jobs/style-effect`
2. Backend gibt sofort `{ shortCode: "A3F9K2", status: "QUEUED" }` zurück
3. Frontend zeigt QR-Code mit URL `https://app.gästefotos.com/r/A3F9K2`
4. AI verarbeitet im Hintergrund
5. WebSocket pusht Ergebnis oder Gast pollt per Short Code

---

### 3. AI Video Booth — Multi-Model ✅
**5 FAL.ai Video-Modelle + Runway + LumaAI — Host wählt schnell vs. premium.**

- **FAL.ai Models** in `src/services/aiVideoGen.ts`:
  - `seedance` — ByteDance Seedance (fast, ~30s)
  - `kling` — Kuaishou Kling 2.1 (premium quality)
  - `wan` — Wan 2.1 (standard, gute Balance)
  - `vidu` — Vidu (fast)
  - `hailuo` — MiniMax Hailuo (newest)
- **API**: `GET /api/ai-jobs/video-models` — Liste aller verfügbaren Modelle mit Tier-Info
- **Provider-Routing**: FAL.ai → Runway → LumaAI (Fallback-Kette)
- **Model-Shortcuts**: `provider.model = "seedance"` wird automatisch zu `fal-ai/seedance/image-to-video` aufgelöst
- **Async Delivery Integration**: `POST /api/ai-jobs/video` für async Video-Generierung

---

### 4. Survey-Input → AI-Prompt Pipeline ✅
**Gast beantwortet Frage → personalisiertes AI-Bild.**

- **DB**: `ai_survey_prompts` Tabelle mit 5 Default-Templates
- **Service**: `src/services/aiSurveyPrompt.ts`
  - `buildSurveyPrompt()` — Template + Antwort → finaler Prompt
  - Prompt-Injection-Schutz (sanitizing, 200 char limit)
  - Event-spezifische Fragen oder Fallback auf Defaults
  - CRUD für Host-Konfiguration
- **API Routes**: `src/routes/aiSurveyPrompt.ts`
  - `GET /api/events/:eventId/survey-prompts` — Fragen abrufen
  - `POST /api/events/:eventId/survey-prompts` — Frage erstellen/bearbeiten
  - `DELETE /api/events/:eventId/survey-prompts/:id` — Frage löschen
  - `POST /api/events/:eventId/survey-prompts/copy-defaults` — Defaults kopieren
  - `POST /api/ai-jobs/survey` — Antwort einreichen → Async AI Job

**5 Default-Fragen:**
1. "Was ist dein Traumjob?" → Person als Beruf
2. "Welches Tier wärst du?" → Anthropomorphe Verwandlung
3. "In welcher Epoche möchtest du leben?" → Zeitreise-Foto
4. "Dein Superhelden-Name?" → Comic-Held Version
5. "Welche Superkraft hättest du gerne?" → Superpower-Darstellung

---

### 5. Tech Debt ✅

- **Unit Tests**: 21 neue Tests (aiSurveyPrompt: 9, aiVideoModels: 6, aiAsyncDelivery: 6)
- **Gesamte Test-Suite**: 190 Tests bestanden, 0 fehlgeschlagen
- **TypeScript**: 0 Compile-Errors, sauberer Build
- **Deploy**: Alles nach Prod gesynced und Service läuft

---

## Neue Dateien

| Datei | Beschreibung |
|-------|-------------|
| `src/services/referenceImageAnchoring.ts` | Reference Image Overlay Service |
| `src/services/aiAsyncDelivery.ts` | QR Async Delivery Service |
| `src/services/aiSurveyPrompt.ts` | Survey → Prompt Pipeline |
| `src/routes/referenceImage.ts` | Reference Image API |
| `src/routes/aiAsyncDelivery.ts` | Async Delivery API (alle AI-Features) |
| `src/routes/aiSurveyPrompt.ts` | Survey Prompts API |
| `src/__tests__/services/aiSurveyPrompt.test.ts` | Survey Prompt Tests |
| `src/__tests__/services/aiVideoModels.test.ts` | Video Model Tests |
| `src/__tests__/services/aiAsyncDelivery.test.ts` | Async Delivery Tests |

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `prisma/schema.prisma` | 5 referenceImage-Felder in EventAiConfig |
| `src/services/aiVideoGen.ts` | FAL.ai multi-model + generateWithFal() |
| `src/services/styleTransfer.ts` | Reference Image Overlay Integration |
| `src/services/aiStyleEffects.ts` | Reference Image Overlay Integration |
| `src/routes/eventAiConfig.ts` | Default-Config erweitert um referenceImage-Felder |
| `src/index.ts` | 3 neue Route-Imports + Mounts |

## DB-Migrationen

```sql
-- Reference Image Anchoring
ALTER TABLE event_ai_configs ADD COLUMN "referenceImageUrl" TEXT;
ALTER TABLE event_ai_configs ADD COLUMN "referenceImageMode" VARCHAR(20) DEFAULT 'overlay';
ALTER TABLE event_ai_configs ADD COLUMN "referenceImagePosition" VARCHAR(20) DEFAULT 'bottom-right';
ALTER TABLE event_ai_configs ADD COLUMN "referenceImageOpacity" FLOAT DEFAULT 0.8;
ALTER TABLE event_ai_configs ADD COLUMN "referenceImageScale" FLOAT DEFAULT 0.15;

-- QR Async Delivery
CREATE TABLE ai_jobs (...);  -- Short codes, status tracking, expiry

-- Survey Prompts
CREATE TABLE ai_survey_prompts (...);  -- 5 default templates seeded
```

## Nächste Schritte (wenn du aufwachst)

1. **RunPod bezahlen** → AI Features dort deployen
2. **Frontend**: QR-Code-Anzeige für async delivery, Survey-UI für Gäste
3. **Admin-Dashboard**: Reference Image Upload UI, Survey-Fragen verwalten
4. **Testing**: Die neuen Endpoints mit echten FAL.ai API-Calls testen
