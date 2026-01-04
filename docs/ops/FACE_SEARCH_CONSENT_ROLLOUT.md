# Face Search Consent (Art. 9) – Rollout

## Ziel

- Explizite Einwilligung (Art. 9 DSGVO) für Face Search serverseitig erfassen.
- Widerruf serverseitig erfassen.
- Audit-Trail für Accept/Revoke.
- Retention/TTL Cleanup für Consent-Records.

## Bestandteile

- DB Models (Prisma Migration):
  - `FaceSearchConsent`
  - `FaceSearchConsentAuditLog`
- Backend Feature Flags:
  - `FACE_SEARCH_DB_CONSENT_ENABLED=true` (DB-backed Consent aktiv)
  - `FACE_SEARCH_CONSENT_RETENTION_ENABLED=true` (Cleanup Worker aktiv)

## Deploy Reihenfolge (empfohlen)

### Schritt 1: Migration vorbereiten (Code bereits im Repo)

- Migration liegt unter:
  - `packages/backend/prisma/migrations/20260104092118_face_search_consent_audit`

### Schritt 2: Backup / Safety

- Vor Apply: DB Backup/Snapshot erstellen (siehe `docs/ops/BACKUPS_AND_RESTORE.md`).

### Schritt 3: Migration anwenden

- Auf dem Server (Backend Package):
  - `pnpm -C packages/backend exec prisma migrate deploy`

Wichtig: `migrate deploy` ist für Production.

### Schritt 4: Backend Deploy

- Backend neu deployen (stop → build → start).

### Schritt 5: Feature Flags aktivieren

- Backend ENV setzen:
  - `FACE_SEARCH_DB_CONSENT_ENABLED=true`
  - optional:
    - `FACE_SEARCH_CONSENT_RETENTION_ENABLED=true`
    - `FACE_SEARCH_CONSENT_RETENTION_INTERVAL_MS=3600000`
    - `FACE_SEARCH_CONSENT_RETENTION_BATCH_SIZE=500`
    - `FACE_SEARCH_CONSENT_REVOKED_GRACE_DAYS=7`

### Schritt 6: (Ganz am Schluss) Tests

- Consent accept/revoke im UI prüfen.
- Ohne Consent muss FaceSearch `403` liefern.
- Mit Consent muss FaceSearch funktionieren.

## Rollback

- Flags zurück auf `false`/entfernen.
- Backend redeployen.
- DB Migration rollback ist i.d.R. nicht trivial; lieber forward-fix.
