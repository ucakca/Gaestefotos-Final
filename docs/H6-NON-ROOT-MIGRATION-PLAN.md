# H6: Services nicht als root — Migrationsplan

> Erstellt: 15.02.2026 — **DURCHGEFÜHRT: 16.02.2026 01:00 Uhr**
> Status: **✅ ABGESCHLOSSEN** — Alle 4 Prod-Services laufen als `gaestefotos` User

---

## Ist-Zustand

Alle 6 Services laufen als `User=root`:

| Service | Port | ExecStart |
|---------|------|-----------|
| gaestefotos-backend | 8001 | pnpm --filter @gaestefotos/backend start |
| gaestefotos-frontend | 3000 | next start -p 3000 |
| gaestefotos-admin-dashboard | 3001 | next start -p 3001 |
| gaestefotos-print-terminal | 3002 | next start -p 3002 |
| gaestefotos-backend-staging | 8101 | pnpm --filter @gaestefotos/backend start |
| gaestefotos-admin-dashboard-staging | 3101 | next start -p 3101 |

### Abhängigkeiten die root-Zugriff brauchen könnten:
- `.env` Dateien: `chmod 600 root:root` → muss für neuen User lesbar sein
- `/root/gaestefotos-app-v2/` → Home-Verzeichnis von root
- PostgreSQL (localhost:5432) → Verbindung über TCP, kein root nötig
- Redis (localhost:6379) → TCP, kein root nötig
- SeaweedFS/MinIO (localhost:8333/9001) → TCP, kein root nötig
- ClamAV Socket (`/var/run/clamav/clamd.ctl`) → Gruppe `clamav` nötig
- `/tmp/` für Temp-Dateien → sollte funktionieren

---

## Migrationsschritte

### Phase 1: Vorbereitung (kein Downtime)

```bash
# 1. Dedicated User erstellen
useradd --system --shell /usr/sbin/nologin --home-dir /opt/gaestefotos gaestefotos

# 2. Projekt kopieren/verschieben
# OPTION A: Symlink (schneller, aber /root bleibt)
ln -s /root/gaestefotos-app-v2 /opt/gaestefotos/app
# OPTION B: Verschieben (sauberer, aber bricht bestehende Pfade)
mv /root/gaestefotos-app-v2 /opt/gaestefotos/app

# 3. Permissions setzen
chown -R gaestefotos:gaestefotos /opt/gaestefotos/app
chmod 600 /opt/gaestefotos/app/packages/backend/.env
chmod 600 /opt/gaestefotos/app/packages/frontend/.env.local

# 4. ClamAV-Zugriff
usermod -aG clamav gaestefotos
```

### Phase 2: systemd Units anpassen

Für jede Unit-Datei (`/etc/systemd/system/gaestefotos-*.service`):

```ini
[Service]
User=gaestefotos
Group=gaestefotos
WorkingDirectory=/opt/gaestefotos/app

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gaestefotos/app /tmp
PrivateTmp=true
```

### Phase 3: Migration (mit Downtime)

```bash
# 1. Alle Services stoppen
systemctl stop gaestefotos-backend gaestefotos-frontend gaestefotos-admin-dashboard gaestefotos-print-terminal
systemctl stop gaestefotos-backend-staging gaestefotos-admin-dashboard-staging

# 2. Units aktualisieren
systemctl daemon-reload

# 3. Services starten
systemctl start gaestefotos-backend gaestefotos-frontend gaestefotos-admin-dashboard gaestefotos-print-terminal

# 4. Prüfen
systemctl status gaestefotos-backend gaestefotos-frontend
curl -s http://localhost:8001/api/health | jq .
curl -s http://localhost:3000 | head -5
```

---

## Risiken & Mitigierung

| Risiko | Mitigierung |
|--------|-------------|
| File Permissions falsch → Services starten nicht | Vorher: `su - gaestefotos -s /bin/bash -c "node -e 'console.log(1)'"` testen |
| .env nicht lesbar | `chown gaestefotos:gaestefotos` auf alle .env Dateien |
| node_modules symlinks brechen | `chown -R` rekursiv, nicht nur top-level |
| ClamAV Socket nicht erreichbar | `usermod -aG clamav gaestefotos` |
| Pfade in systemd Units falsch | Alle WorkingDirectory/ExecStart Pfade prüfen |
| Plesk-Integration bricht | Plesk hat eigene Service-Management — testen! |

---

## Ergebnis der Migration

### Durchführung: 16.02.2026, 01:00–01:40 Uhr

| Service | Status | User | HTTP |
|---------|--------|------|------|
| gaestefotos-backend | active | gaestefotos | 200 |
| gaestefotos-frontend | active | gaestefotos | 200 |
| gaestefotos-admin-dashboard | active | gaestefotos | 307 |
| gaestefotos-print-terminal | active | gaestefotos | 200 |

### Hardening aktiv:
- `NoNewPrivileges=true`
- `ProtectSystem=strict`
- `ProtectHome=true`
- `PrivateTmp=true`

### Probleme & Lösungen:
1. **Frontend Drop-in Override** (`override.conf`) hatte alten `/root/...` ExecStart → ExecStart aus Override entfernt
2. **pnpm Symlinks** konnten alte Pfade nicht auflösen → ExecStart auf direkten `node`-Binary-Pfad umgestellt
3. **Port 3000 EADDRINUSE** durch Zombie-Prozesse → `fuser -k 3000/tcp`
4. **`.next` Build-Cache** musste unter neuem Pfad neu gebaut werden

### Deploy-Workflow (nach Migration):
```bash
# IDE Workspace: /root/gaestefotos-app-v2 (hier wird entwickelt)
# Prod Runtime:  /opt/gaestefotos/app (hier laufen Services)
# Deploy:
./deploy.sh           # Alles deployen
./deploy.sh backend   # Nur Backend
./deploy.sh admin     # Nur Admin-Dashboard
```

### Backup: `/opt/backups/h6-pre-migration/`

---

*Erstellt: 15.02.2026 — Durchgeführt: 16.02.2026 — Cascade*
