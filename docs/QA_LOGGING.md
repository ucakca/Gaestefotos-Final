# QA Logging (UI/Debug) + Datenschutz

Dieses Dokument beschreibt das QA-Logging-System (Events aus Frontend/Backend) mit zwei Stufen:

- IMPORTANT: wird immer gespeichert
- DEBUG: wird nur gespeichert, wenn Debug-Logging aktiv ist (zeitlich begrenzt)

## Laiensicher (Kurzfassung)

### Wofür gibt es das?

Wenn in der App etwas „komisch“ wirkt (z.B. Upload bricht ab, Login spinnt, Buttons reagieren nicht), kann man Debug-Logging kurz aktivieren. Dann sehen wir im Admin Dashboard eine zeitliche Liste von Ereignissen und können schneller nachvollziehen, was passiert ist.

### Was wird geloggt?

- Wichtige technische Ereignisse (IMPORTANT), z.B. API-Fehler (401/403/429/5xx) und System-/Fehlerzustände.
- Optional (DEBUG, nur wenn aktiv): zusätzliche Navigations-/QA-Events (z.B. Seitenaufrufe), um reproduzierbare Bug-Reports zu erleichtern.

### Was wird NICHT geloggt?

- Keine Passwort-Inhalte.
- Keine Fotos/Datei-Inhalte.
- Keine kompletten Request/Response-Bodies „blind“.

### Datenschutz / Minimierung

- Es werden nur die minimal notwendigen Daten für Fehleranalyse gespeichert.
- DEBUG ist standardmäßig aus und zeitlich begrenzt aktivierbar.
- Logs sind ein internes QA/Support-Werkzeug (Admin-only).

## Technische Doku

### Datenmodell (Prisma)

- Enum: `QaLogLevel`
  - `IMPORTANT`
  - `DEBUG`

- Model: `QaLogEvent`
  - `id` (string/uuid)
  - `createdAt` (timestamp)
  - `level` (`QaLogLevel`)
  - `type` (string; z.B. `api_error`, `page_view`, `click`)
  - `message` (string)
  - `path` (optional string; Browser-Path)
  - `method` (optional string; HTTP method)
  - `data` (optional JSON; strukturierte Zusatzdaten)

Hinweis: `data` darf keine sensiblen Inhalte enthalten (siehe Privacy/Guidelines unten).

### Backend Endpoints

- Public ingest/config:
  - `POST /api/qa-logs`
    - Speichert ein Event.
    - IMPORTANT wird immer gespeichert.
    - DEBUG wird nur gespeichert, wenn Debug-Logging aktiv ist.
  - `GET /api/qa-logs/config`
    - Liefert, ob Debug-Logging aktiv ist (mit Ablaufzeitpunkt).

- Admin:
  - `GET /api/admin/qa-logs/config`
  - `POST /api/admin/qa-logs/config`
    - Setzt Debug-Logging aktiv/inaktiv und Ablaufzeit.
  - `GET /api/admin/qa-logs/events`
    - Query/Filter/Pagination für Events.

### Frontend (App) Instrumentation

- Utility: `packages/frontend/src/lib/qaLog.ts`
  - `qaLog({ level, type, message, data, path, method })`
  - `isQaDebugEnabled()` cached die Debug-Config kurzzeitig.

- Axios Interceptor: `packages/frontend/src/lib/api.ts`
  - Loggt wichtige API-Fehler als `IMPORTANT` (`api_error`), um reale Probleme schnell sichtbar zu machen.

- Route Tracking (nur DEBUG): `packages/frontend/src/components/AppLayout.tsx`
  - Loggt `page_view` Events bei Route-Wechsel, aber nur wenn Debug aktiv ist.

### Admin Dashboard

- Logs UI: `packages/admin-dashboard/src/app/logs/page.tsx`
  - Live-Ansicht der letzten Events
  - Filter (Level/Type/Text)
  - Debug-Logging Toggle mit Duration (zeitlich begrenzt)

## Privacy / Security Guidelines (verbindlich)

### Minimierungsprinzip

- `message` kurz halten (z.B. „Upload failed“, „API 500 on /api/photos/upload“).
- `data` nur mit technisch relevanten, nicht-sensiblen Feldern befüllen.

### Nicht loggen

- Passwörter, Tokens, Auth-Cookies.
- Vollständige Email-Adressen, Telefonnummern, private Inhalte.
- Foto-/Datei-Bytes, EXIF-Daten, komplette Upload-Payloads.

### Erlaubt / empfohlen (Beispiele)

- Statuscodes, Pfade/Endpoints, Request-Methode
- Allgemeine Fehlermeldungen (ohne Secrets)
- IDs/UUIDs, sofern sie keine Personen direkt identifizieren

### Zugriff

- Zugriff auf Logs nur über Admin-Endpunkte (Admin role).

### Aufbewahrung / Löschung

- Aktuell: Logs werden in der DB gespeichert.
- Retention Policy (automatisch):
  - DEBUG: wird nach 7 Tagen gelöscht
  - IMPORTANT: wird nach 30 oder 90 Tagen gelöscht (Server-Konfiguration)

## Typische Event-Typen

- `api_error` (IMPORTANT)
- `page_view` (DEBUG)
- optional weitere QA-Events, sofern sie dem Minimierungsprinzip entsprechen
