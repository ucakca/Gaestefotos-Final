# Phase 2: Logik-Audit & Feature-Ideen – Gaestefotos-App

**Fokus:** Foto-Upload-Zyklus, API-Datenfluss, State-Management, Logikfehler, Optimierungen und Feature-Vorschläge.

---

## 1. Foto-Upload-Zyklus – Übersicht

Es gibt **zwei getrennte Upload-Pfade**:

| Aspekt | **TUS (Resumable)** | **Multer (FormData POST)** |
|--------|----------------------|----------------------------|
| **Endpoint** | `POST /api/uploads` (TUS-Protocol) | `POST /api/events/:eventId/photos/upload` |
| **Frontend-Nutzung** | Nur `UploadButton.tsx` (primär, dann Fallback) | Alle anderen: PhotoUpload, HostPhotoUpload, ChallengeCompletion, Live-Camera, E3, InstagramUploadButton, EventHeader; Offline-Queue |
| **Auth/Event-Check** | **Keine** – Server vertraut nur Metadata (`eventId`, `uploadedBy`, `categoryId`) | Optional Auth + `requireEventAccess` + `enforceEventUploadAllowed` |
| **Rate-Limiting** | **Keines** auf `/api/uploads` | `attachEventUploadRateLimits`, `photoUploadIpLimiter`, `photoUploadEventLimiter` |
| **Nachbearbeitung** | Minimal (nur Speicher + DB + WebSocket) | Voll: Smart-Category, Moderation-Status, Face, Duplicate, Push, E-Mail, Mosaic, Achievements |

---

## 2. Kritische Logik- und Sicherheitslücken

### 2.1 TUS: Keine Event- und Zugriffskontrolle (kritisch)

- **Ort:** `packages/backend/src/routes/uploads.ts` – `processCompletedUpload()`.
- **Problem:** `eventId` kommt nur aus TUS-Metadata. Es wird **nicht** geprüft:
  - ob das Event existiert, aktiv und nicht gelöscht ist;
  - ob Uploads erlaubt sind (`allowUploads`);
  - ob das Event-Datum im Upload-Fenster liegt (`isWithinEventDateWindow`);
  - ob die Speicherperiode abgelaufen ist (`getEventStorageEndsAt`);
  - ob der Aufrufer (Cookie/Token) Zugriff auf das Event hat.
- **Risiko:** Jeder, der die API erreicht, kann mit beliebigem `eventId` in der Metadata Fotos/Videos in fremde Events hochladen (sofern Speicherlimit des Events nicht überschritten ist).
- **Empfehlung (Phase 3 abdeckend):**
  - In `processCompletedUpload` vor dem Verarbeiten: Event laden, existent/aktiv prüfen, `allowUploads`, Datum-Fenster, Speicher-Ende prüfen.
  - Zusätzlich: **Upload-Token** einführen: Frontend holt vor TUS-Start einen kurzfristigen Token (z. B. `POST /api/events/:eventId/upload-token`), der eventId und Ablauf enthält und signiert ist; TUS-Metadata enthält diesen Token; Backend validiert ihn in `onUploadFinish` und lehnt ohne gültigen Token ab.
  - Optional: TUS-Route mit Auth-Middleware und Event-Zugriff prüfen (wenn TUS-Client Credentials mitsendet).

### 2.2 TUS: Kein Rate-Limiting

- **Ort:** `index.ts` – `app.use('/api/uploads', uploadsRoutes)` ohne Limiter.
- **Problem:** TUS-Uploads sind nicht durch `uploadLimiter` oder Event-/IP-Limits geschützt → Risiko für Ressourcenerschöpfung und Missbrauch.
- **Empfehlung:** Rate-Limiter für `/api/uploads` einführen (z. B. pro IP und/oder pro eventId aus Metadata nach erstem Chunk).

### 2.3 TUS vs. Multer: Unterschiedliches Verhalten (Logik-Inkonsistenz)

Für **TUS-uploads** fehlen im Backend:

- **Moderation-Status:** TUS setzt immer `status: 'PENDING'`. Multer setzt `APPROVED` wenn `!moderationRequired || isManager`. → Bei deaktivierter Moderation erscheinen TUS-Fotos trotzdem als „Ausstehend“.
- **Smart Category:** Kein `selectSmartCategoryId`; nur `categoryId` aus Metadata oder `null`.
- **CapturedAt:** Kein `extractCapturedAtFromImage` (EXIF-Datum).
- **Face Detection:** Kein `getFaceDetectionMetadata` / kein Update von `faceCount`/`faceData`.
- **Duplicate Detection:** Kein `processDuplicateDetection`.
- **Push / E-Mail:** Kein `sendPushToEvent`, `notifyEventHost`, keine E-Mail an Host.
- **Mosaic:** Kein automatisches Platzieren auf der Mosaic-Wall.
- **Achievements:** Kein `checkAchievements`.

**Empfehlung:** Entweder:

- **Option A:** Nach dem Erstellen des Photo-Records im TUS-Pfad die gleichen Nachbearbeitungs-Schritte wie im Multer-Pfad aufrufen (Event + featuresConfig laden, Moderation-Status, Smart-Category, Face, Duplicate, Push, E-Mail, Mosaic, Achievements); oder
- **Option B:** TUS nur für „Roh-Upload“ nutzen und einen separaten Job/Webhook auslösen, der dieselbe Nachbearbeitungs-Pipeline wie Multer durchläuft.

---

## 3. API-Datenfluss (Foto-Upload)

### 3.1 Multer-Pfad (Referenz)

1. Client: `api.post('/events/:eventId/photos/upload', formData)` (mit Credentials).
2. Middleware: optionalAuth, requireEventAccess, enforceEventUploadAllowed, attachEventUploadRateLimits, photoUploadIpLimiter, photoUploadEventLimiter, upload.single('file'), validateUploadedFile('image').
3. Backend: Event laden, Kategorie (inkl. Smart), Bild verarbeiten (imageProcessor), Speicherlimit prüfen, Speicher hochladen, Photo anlegen, Moderation-Status, WebSocket, Face, Duplicate, Push, E-Mail, Mosaic, Achievements.
4. Response: 201 + Photo-Objekt.

### 3.2 TUS-Pfad

1. Client: `uploadWithTus(file, { eventId, uploadedBy, categoryId })` – keine expliziten Credentials im gefundenen Code (tus-js-client).
2. Backend: Keine Auth-Middleware; TUS-Server nimmt Upload an; `onUploadFinish` → `processCompletedUpload` mit Metadata.
3. Backend: eventId aus Metadata; bei Foto: imageProcessor, Speicherlimit, Speicher, Photo mit `status: 'PENDING'`, WebSocket; bei Video: direkt Speicher + Video-Record.
4. Kein HTTP-Response-Body mit Photo für den Client (nur TUS-Protokoll); Echtzeit über WebSocket.

### 3.3 Offline-Queue

- **Speicherung:** IndexedDB (`gaestefotos_upload_queue`), Endpoint z. B. `/events/:eventId/photos/upload`.
- **Verarbeitung:** `processUploadQueue` mit `fetch(endpoint, { method: 'POST', body: FormData, credentials: 'include' })` → immer Multer-Pfad, mit Auth/Cookie.
- **Konsistenz:** Queue ist konsistent mit Multer (Rate-Limits, Event-Checks, volle Nachbearbeitung). TUS wird in der Queue nicht verwendet.

---

## 4. State-Management (Upload)

- **uploadStore (Zustand):** `uploads[]` (id, filename, progress, status), `isUploading`, `totalProgress`. Wird im gefundenen Code nicht von `UploadButton` genutzt; UploadButton hält eigenen lokalen State (`files`, `pendingFiles`).
- **UploadButton:** Lokaler State für Dateien, Fortschritt, ETA, Fehler; nutzt `uploadWithTus` bzw. Fallback Multer, `enqueueUpload` bei Offline/Retry.
- **useUploadQueue:** IndexedDB-Queue, `queueCount`, `queueItems`, `processQueue`, `addToQueue`; reagiert auf Online und Service-Worker-Nachrichten.

**Empfehlung:** Klären, ob `uploadStore` noch für andere UI-Teile (z. B. globale Upload-Leiste) genutzt werden soll. Wenn nur UploadButton Uploads anzeigt, könnte man UploadButton-State und uploadStore zusammenführen oder uploadStore gezielt dort befüllen, um eine einzige Quelle für „laufende/erfolgreiche Uploads“ zu haben.

---

## 5. Weitere Logik-Details

### 5.1 GET Fotos – Paginierung

- `limit` max 200, Default ohne limit; `take: limitNum + 1` um `hasMore` zu ermitteln. Korrekt.

### 5.2 Foto-Datei ausliefern (`GET /api/photos/:photoId/file`)

- Optional Auth, Event-Zugriff, Host/Gast, Speicher-Ende, Status (Gäste nur APPROVED). Konsistent.

### 5.3 API-Base-URL Frontend

- `getApiUrl()`: Browser = relativ `/api` (Proxy) oder localhost:8001 im Dev; `withCredentials: true`. TUS verwendet fest `/api/uploads` – bei Proxy korrekt; Credentials müssen ggf. in tus-js-client gesetzt werden, falls später Auth bei TUS genutzt wird.

---

## 6. Code-Flow-Optimierungen

1. **TUS-Nachbearbeitung zentralisieren:** Eine gemeinsame Funktion `postProcessPhoto(photoId, eventId, processedOptimizedBuffer?, options)` die Moderation-Status, Smart-Category, Face, Duplicate, Push, E-Mail, Mosaic, Achievements abarbeitet; von Multer und von TUS (oder von einem TUS-Job) aufrufen.
2. **Event-Load einmal:** Im Multer-Handler wird das Event bereits in `enforceEventUploadAllowed` geladen (`gfEventForUpload`). Dieses Objekt für featuresConfig und Moderation-Status wiederverwenden statt erneut zu laden.
3. **Retry/Backoff im UploadButton:** Bereits vorhanden (getRetryDelay, MAX_RETRIES); optional Backoff auch bei 429 (Rate-Limit) mit längerem Delay.
4. **TUS credentials:** Wenn TUS später mit Auth/Token arbeitet: in tus-js-client `upload.options` prüfen und ggf. `credentials: 'include'` oder entsprechende Option setzen.

---

## 7. Feature-Vorschläge (priorisiert)

### Hoch (Sicherheit & Konsistenz)

- **TUS absichern:** Event-Validierung + Upload-Token (oder Auth) + Rate-Limiting (siehe oben).
- **TUS-Nachbearbeitung angleichen:** Gleiche Logik wie Multer (Moderation, Smart-Category, Face, Duplicate, Push, E-Mail, Mosaic, Achievements) entweder direkt in `processCompletedUpload` oder über gemeinsame Pipeline/Job.

### Mittel (UX & Robustheit)

- **Einheitliche Upload-Fortschritt-Anzeige:** uploadStore und UploadButton zusammenführen oder uploadStore als einzige Quelle für „aktive Uploads“ nutzen, damit z. B. eine globale Upload-Leiste oder ein Toast konsistent ist.
- **Upload-Token-Endpoint:** `POST /api/events/:eventId/upload-token` (mit Event-Zugriff), gibt kurzfristigen signierten Token für TUS-Metadata; verbessert Sicherheit und ermöglicht spätere Erweiterung (z. B. Kategorie im Token).
- **Bessere Fehlermeldungen bei TUS:** Wenn `processCompletedUpload` fehlschlägt (z. B. Speicherlimit), gibt es derzeit keine Möglichkeit, dem Client eine strukturierte Fehlermeldung zu geben (TUS-Protokoll). Optional: Speicher für „upload result“ pro uploadId und Endpoint `GET /api/uploads/:id/result` nach Abschluss, oder WebSocket-Event bei Fehler.

### Niedrig (Nice-to-have)

- **Bulk-Upload-Status:** Nach mehreren TUS-Uploads ein kurzes Summary (z. B. „5 Fotos hochgeladen, 1 fehlgeschlagen“) per WebSocket oder Polling.
- **Kategorie im TUS-Metadata:** Bereits vorhanden; beibehalten und mit Smart-Category ergänzen (wenn keine categoryId, dann Server-seitig Smart-Category wie bei Multer).
- **CapturedAt aus EXIF im TUS:** `extractCapturedAtFromImage` nach dem Verarbeiten aufrufen und in DB speichern (für Sortierung/Zeitfenster).

---

## 8. Kurzfassung für Phase 3 (Security) und Phase 5 (Roadmap)

- **Phase 3:** TUS-Validierung (Event, Token/Auth), TUS-Rate-Limiting, OWASP-relevante Punkte (unvalidierte Eingabe = eventId aus Metadata).
- **Phase 5:** Bugs: „TUS ohne Event-Check“, „TUS ohne Moderation/Smart-Category/Nachbearbeitung“; Features: „Upload-Token“, „TUS-Nachbearbeitung vereinheitlichen“, „Rate-Limit TUS“.

Dieser Bericht bildet die Grundlage für das Security-Hardening (Phase 3) und die finale Roadmap (Phase 5).
