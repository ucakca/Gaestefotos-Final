# Security Audit Phase 3 — Report

**Datum**: 2026-02-18  
**Scope**: Backend API (`packages/backend/src/routes/`)  
**Methode**: Statische Code-Analyse aller Route-Dateien

---

## Kritische Findings (GEFIXT)

### 1. Admin-Routes ohne `requireRole('ADMIN')` — 5 Dateien

**Schwere**: KRITISCH  
**Problem**: 5 Admin-Route-Dateien hatten `authMiddleware` aber KEIN `requireRole('ADMIN')`. Jeder eingeloggte User (auch Gäste/Hosts) konnte Admin-Funktionen aufrufen.

| Datei | Betroffen | Fix |
|---|---|---|
| `adminBackups.ts` | **ZERO Auth** — Shell-Befehle, Datei-Download/Delete ohne jegliche Authentifizierung | `router.use(authMiddleware, requireRole('ADMIN'))` |
| `adminCredits.ts` | Credits verwalten, hinzufügen, Settings ändern | `router.use(authMiddleware, requireRole('ADMIN'))` |
| `adminFeatureFlags.ts` | Package-Definitionen erstellen/ändern/löschen | `router.use(authMiddleware, requireRole('ADMIN'))` |
| `adminAiProviders.ts` | AI-Provider-Config + API-Keys ändern (hatte eigene `requireAdmin` Funktion, aber nicht auf Router-Level) | `router.use(authMiddleware, requireRole('ADMIN'))` |
| `adminPromptTemplates.ts` | Prompt-Templates erstellen/ändern/löschen (hatte eigene `requireAdmin` Funktion) | `router.use(authMiddleware, requireRole('ADMIN'))` |

### 2. Path Traversal in `adminBackups.ts`

**Schwere**: HOCH  
**Problem**: Download/Delete/Verify-Endpoints dekodierten Base64-Pfade und prüften `startsWith(BACKUP_DIR)` — aber ohne `path.resolve()`. Ein Pfad wie `/opt/backups/gaestefotos/../../etc/passwd` hätte den Check bestanden.  
**Fix**: `path.resolve()` vor dem `startsWith`-Check eingefügt.

---

## Audit-Ergebnisse (kein Fix nötig)

### SQL Injection
- **Status**: ✅ SICHER
- Alle Raw-Queries verwenden `Prisma.sql` (parameterisiert) oder `$queryRawUnsafe` mit positionellen Parametern (`$1`, `$2`)
- Nur `faceSearchPgvector.ts` nutzt `$queryRawUnsafe` — alle Aufrufe mit Positionsparametern
- Keine String-Interpolation in SQL-Queries gefunden

### XSS / Input-Sanitization
- **Status**: ✅ GRUNDSCHUTZ VORHANDEN
- `express-mongo-sanitize` aktiv in `index.ts`
- `helmet` aktiv mit Security-Headers
- Neues `utils/sanitize.ts` Utility erstellt für zukünftige Nutzung
- Prisma escapiert Daten automatisch in parametrisierten Queries
- Frontend: React escapiert JSX automatisch (kein `dangerouslySetInnerHTML`)

### CSRF
- **Status**: ⚠️ MIDDLEWARE EXISTIERT, ABER NICHT AKTIVIERT
- `middleware/csrf.ts` ist vollständig implementiert (Redis-backed, Token-basiert)
- NICHT in `index.ts` eingebunden
- **Risiko**: Niedrig, da API JWT-basiert ist (nicht Cookie-basiert für Auth). CSRF ist primär relevant für Cookie-basierte Sessions
- **Empfehlung**: Für zusätzliche Defense-in-Depth bei kritischen Admin-Endpoints aktivieren

### Rate-Limiting
- **Status**: ✅ AKTIV
- Globaler `apiLimiter` auf `/api` aktiv (2000 req/15min)
- Spezifische Limiter: `authLimiter`, `uploadLimiter`, `passwordLimiter`, `smsLimiter`, `paymentLimiter`, `leadLimiter`, `aiFeatureLimiter`, `pushSubscribeLimiter`, `analyticsLimiter`
- TUS-Upload hat eigenen `tusCreateLimiter` (30/min)

### TUS-Upload Security
- **Status**: ✅ BEREITS GESICHERT
- `validateTusRequest()` prüft: eventId, Event-Existenz, JWT-Auth, Event-Access-Cookie
- Rate-Limiter aktiv
- Storage-Limit-Check (`assertUploadWithinLimit`)

### JWT / Auth
- **Status**: ✅ ROBUST
- `jwtKeys.ts` mit Key-Rotation-Support
- `verifyJwt` mit Fallback auf `JWT_SECRET_PREVIOUS`
- Account-Lockout nach Failed-Logins
- Password-History verhindert Wiederverwendung

---

## Dependency Vulnerabilities

| Package | Severity | Issue | Fix |
|---|---|---|---|
| `nodemailer` ≤7.0.10 | HIGH | DoS via addressparser recursion | Update auf ≥7.0.11 (Major-Version!) |
| `fast-xml-parser` via @aws-sdk | HIGH | DoS via entity expansion in DOCTYPE | Transitiv via @types/nodemailer → @aws-sdk. Update @aws-sdk |

**Gesamt**: 35 Vulnerabilities (3 low, 17 moderate, 15 high)  
**Empfehlung**: `nodemailer` auf v7 updaten (Breaking Changes prüfen), @aws-sdk aktualisieren

---

## Zusammenfassung

| Kategorie | Status |
|---|---|
| **Auth/Authorization** | ✅ Gefixt — alle Admin-Routes haben jetzt `requireRole('ADMIN')` |
| **SQL Injection** | ✅ Sicher — parametrisierte Queries |
| **XSS** | ✅ Grundschutz (helmet, mongoSanitize, React escaping) |
| **CSRF** | ⚠️ Middleware existiert, nicht aktiviert (niedriges Risiko bei JWT-Auth) |
| **Path Traversal** | ✅ Gefixt — `path.resolve()` vor Pfad-Checks |
| **Rate Limiting** | ✅ Aktiv auf allen kritischen Endpoints |
| **TUS Upload** | ✅ Auth + Event-Validation + Rate-Limiting |
| **Dependencies** | ⚠️ 2 High-Severity (nodemailer, fast-xml-parser) — Update pending |
