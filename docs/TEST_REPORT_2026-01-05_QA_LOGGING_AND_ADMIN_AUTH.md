# Test Report – QA Logging + Admin Auth (2026-01-05)

## Scope

- Admin Dashboard Login-Persistenz (kein erneutes Login bei Refresh)
- QA-Logging System (IMPORTANT immer, DEBUG nur wenn aktiv)
- Prod-Health / Deploy-Stand (Services + Artefakte)
- Admin-Dashboard Stabilität (Noise/Errors rund um Server Actions / `digest`)

## Umgebung

- Frontend App: `https://app.gästefotos.com`
- Admin Dashboard: `https://dash.gästefotos.com`
- Backend API (same-origin via Frontend): `https://app.gästefotos.com/api/*`

## Änderungen unter Test

### Admin Auth Persistence

- Fix: `ProtectedRoute` wartet auf Zustand-Rehydration (`hasHydrated`) bevor Redirect nach `/login` erfolgt.
- Store: `hasHydrated` + Recompute `isAuthenticated` aus `token` nach Persist-Rehydrate.

### QA Logging

- Backend:
  - DB: `QaLogEvent` + `QaLogLevel`
  - Public:
    - `GET /api/qa-logs/config`
    - `POST /api/qa-logs`
  - Admin:
    - `GET/POST /api/admin/qa-logs/config`
    - `GET /api/admin/qa-logs/events`
- Frontend:
  - `qaLog()` Utility + `isQaDebugEnabled()` (Config-Caching)
  - Axios Interceptor: `IMPORTANT api_error`
  - Debug `page_view` Logging in `AppLayout` (nur wenn Debug aktiv)
- Admin Dashboard:
  - `/logs` Viewer + Debug Toggle

## Testfälle & Ergebnisse

### A) Prod Smoke – Verfügbarkeit

- `GET https://app.gästefotos.com/` → PASS (HTTP 200)
- `GET https://app.gästefotos.com/api/health` → PASS (HTTP 200)
- `GET https://dash.gästefotos.com/` → PASS (HTTP 30x → login/dashboard flow)

### B) QA Logging – Config (Public)

- `GET https://app.gästefotos.com/api/qa-logs/config` → PASS (HTTP 200, JSON)

### C) QA Logging – Ingest (Public)

- `POST https://app.gästefotos.com/api/qa-logs` (IMPORTANT smoke event) → PASS (`{"ok":true}`)
- Sichtprüfung im Admin Dashboard `/logs`:
  - `IMPORTANT smoke_test` sichtbar → PASS
  - `DEBUG page_view` sichtbar (bei aktivem Debug) → PASS

### D) Admin Dashboard – Login Persistenz

- Login → navigate → Hard Refresh (`/dashboard`) → PASS (kein Redirect auf `/login`)
- Direktaufruf `/logs` nach Refresh → PASS

### E) Deploy/Build Konsistenz (Prod)

- Backend:
  - Journal: `Started` + `Server running` um `2026-01-05 20:15` → PASS
  - `packages/backend/dist/*` newest mtime ~ `2026-01-05 20:14:59` → PASS

- Admin Dashboard:
  - Deploy/Start: `2026-01-05 20:49` (nach zusätzlichem Hardening)
  - `.next/BUILD_ID` mtime ~ `2026-01-05 19:23` (vor letzter Hardening-Deploy; BUILD_ID rotiert je Build)

- Frontend:
  - Letzter Journal-Start: `2026-01-04 21:41` → OK (keine neuen Frontend-Changes erforderlich)

### F) Admin Dashboard – Noise/Errors (Server Actions / digest)

Beobachtung:
- Vor Hardening traten im Journal wiederholt auf:
  - `TypeError: Cannot read properties of null (reading 'digest')`
  - `Failed to find Server Action "x" ... request might be from an older or newer deployment`

Mitigations deployed:
- `next.config.js` Cache-Header:
  - `/_next/static/*`: long-term immutable
  - sonst: `no-store`
- `src/middleware.ts`: blockt POSTs mit `next-action` Header (Server Actions werden nicht genutzt)

Ergebnis:
- Nach Deploy (20:49) keine neuen `Failed to find Server Action` Logs bei Probe-Request (GET + simuliertes POST mit `next-action`).

## Ergebnis (Summary)

- Admin Login Persistenz: PASS
- QA Logging (Config + Ingest + UI): PASS
- Prod-Verfügbarkeit: PASS
- Admin Dashboard Hardening gegen stale Server-Action Requests: PASS

## Offene Punkte / Follow-Ups

- Optional: Frontend-Dashboard ebenfalls mit `no-store` Headern absichern, falls Cloudflare/Proxies HTML cachen.
- Optional: Retention/Cleanup Policy für `QaLogEvent` (z.B. DEBUG nach X Tagen löschen).
