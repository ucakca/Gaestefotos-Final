# Database Isolation - Staging vs. Production

**Erstellt:** 2026-01-10  
**Status:** Konfiguriert

---

## Übersicht

Die Anwendung verwendet separate PostgreSQL-Datenbanken für Produktion und Staging, um vollständige Isolation zu gewährleisten.

## Datenbank-Konfiguration

| Umgebung   | Datenbank-Name          | Env-Datei              |
|------------|-------------------------|------------------------|
| Production | `gaestefotos_v2`        | `.env`                 |
| Staging    | `gaestefotos_v2_staging`| `.env.staging`         |

## Environment Files

### Production (`packages/backend/.env`)
```
DATABASE_URL=postgresql://gaestefotos:***@localhost:5432/gaestefotos_v2
```

### Staging (`packages/backend/.env.staging`)
```
DATABASE_URL=postgresql://gaestefotos:***@localhost:5432/gaestefotos_v2_staging
```

## Service-Konfiguration

Die Services verwenden unterschiedliche Ports:

| Service    | Production | Staging |
|------------|------------|---------|
| Backend    | 8100       | 8101    |
| Frontend   | 3000       | 3002    |
| Dashboard  | 3100       | 3101    |

## Migrations

### Production
```bash
cd packages/backend
pnpm exec prisma migrate deploy
```

### Staging
```bash
cd packages/backend
DATABASE_URL="postgresql://gaestefotos:***@localhost:5432/gaestefotos_v2_staging" \
  pnpm exec prisma migrate deploy
```

Oder mit dem Deploy-Skript:
```bash
./scripts/deploy-staging.sh
```

## Setup-Skript

Das Skript `scripts/setup-staging-db.sh` erstellt die Staging-Datenbank:

```bash
./scripts/setup-staging-db.sh        # Setup
./scripts/setup-staging-db.sh verify # Nur verifizieren
```

## Sicherheit

- **Keine Cross-Contamination:** Staging-Daten beeinflussen niemals Produktion
- **Separate Credentials:** Unterschiedliche Passwörter möglich (empfohlen)
- **Migration-Safety:** Migrations werden separat auf jede DB angewendet

## Troubleshooting

### Staging-DB existiert nicht
```bash
sudo -u postgres createdb -O gaestefotos gaestefotos_v2_staging
cd packages/backend
DATABASE_URL="..." pnpm exec prisma migrate deploy
```

### Schema-Drift
```bash
DATABASE_URL="..." pnpm exec prisma migrate reset --force
# ACHTUNG: Löscht alle Daten!
```
