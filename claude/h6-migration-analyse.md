# 🚨 H6 Masterprompt: Services-Migration Root → Dedicated User
## DETAILLIERTE ANALYSE & KORRIGIERTER MIGRATIONSPLAN

**Erstellt**: 2026-02-15 | **Status**: ✅ Bereit für Opus-Execution

---

## ⚠️ EXECUTIVE SUMMARY: KRITISCHE FINDINGS

### 🔴 SCHWERWIEGENDE PROBLEME IM VORGESCHLAGENEN PLAN

1. **Staging-Frontend ist defekt** (auto-restart Loop) → erst fixen vor Migration!
2. **Backup-Scripts zeigen auf alte Pfade** (`/var/www/vhosts`) → würden nach Migration ins Leere laufen
3. **pnpm Store ist user-spezifisch** (`/root/.local/share/pnpm/store/v10`) → neuer User braucht eigenen Store
4. **Hardcoded Pfade in Units**: `admin-dashboard` und `print-terminal` referenzieren `/root/gaestefotos-app-v2/packages/*/node_modules/next` direkt
5. **Keine Staging-.env.local für Frontend** → würde bei Staging-Services fehlen
6. **ClamAV Socket 666** → funktioniert, aber Group-Membership ist sauberer

### ✅ WAS GUT IST

- `.env`-Dateien haben korrekte Permissions (600)
- Services verwenden systemd Journal (kein root-owned Log-File-Problem)
- PostgreSQL/Redis/SeaweedFS sind bereits TCP-basiert (keine Socket-Permission-Probleme)
- `uploads/`-Verzeichnis existiert und ist migrierbar

---

## 📊 IST-ZUSTAND: VOLLSTÄNDIGE ERFASSUNG

### Services-Übersicht

| Service | Port | Status | User | WorkingDirectory | Besonderheiten |
|---------|------|--------|------|------------------|----------------|
| `gaestefotos-backend.service` | 8001 | ✅ running | root | `/root/gaestefotos-app-v2` | Verwendet `pnpm --filter`, `ExecStartPre` builds |
| `gaestefotos-frontend.service` | 3000 | ✅ running | root | `/root/gaestefotos-app-v2/packages/frontend` | Standard Next.js |
| `gaestefotos-admin-dashboard.service` | 3001 | ✅ running | root | `/root/gaestefotos-app-v2/packages/admin-dashboard` | **Hardcoded node_modules/next Path** |
| `gaestefotos-print-terminal.service` | 3002 | ✅ running | root | `/root/gaestefotos-app-v2/packages/print-terminal` | **Hardcoded node_modules/next Path** |
| `gaestefotos-backend-staging.service` | 8101 | ✅ running | root | `/root/gaestefotos-app-v2` | Verwendet `.env.staging` |
| `gaestefotos-admin-dashboard-staging.service` | 3101 | ✅ running | root | `/root/gaestefotos-app-v2/packages/admin-dashboard` | Vermutlich identisch zu Prod |
| `gaestefotos-frontend-staging.service` | 3100 | 🔴 **auto-restart loop** | root | ??? | **SERVICE DEFEKT — ERST FIXEN!** |

**TOTALE SERVICES**: 7 (6 funktionstüchtig, 1 defekt)

### Kritische Pfade und Berechtigungen

```bash
# App-Root
/root/gaestefotos-app-v2/                     → 755 root:root (3.0 GB!)
├── packages/backend/.env                     → 600 root:root ✅
├── packages/backend/.env.staging             → 600 root:root ✅
├── packages/backend/uploads/                 → 755 root:root (Schreib-Zugriff nötig!)
├── packages/frontend/.env.local              → 600 root:root ✅
└── packages/frontend/.env.staging            → existiert ✅

# pnpm Store (user-spezifisch!)
/root/.local/share/pnpm/store/v10/            → root-owned

# ClamAV
/var/run/clamav/clamd.ctl                     → 666 clamav:clamav (Socket world-writable)

# Backups (root Cron)
/opt/backup_gaestefotos.sh                    → zeigt auf /var/www/vhosts (FALSCH!)
/opt/backup_gaestefotos_db.sh                 → DB-only (OK)
```

### Hardcoded Pfade in Service-Units

**Problem**: `admin-dashboard` und `print-terminal` verwenden:
```bash
ExecStart=/usr/bin/node /root/gaestefotos-app-v2/packages/<name>/node_modules/next/dist/bin/next start -p <PORT>
```

→ Pfad ändert sich zu `/opt/gaestefotos/app/packages/...` ❗

**Lösung**: Verwende relative Pfade via `pnpm`:
```bash
ExecStart=/usr/bin/pnpm --filter @gaestefotos/<name> start
```

### pnpm-spezifische Probleme

1. **Store-Location**: Root verwendet `/root/.local/share/pnpm/store/v10`
   - Neuer User würde `/opt/gaestefotos/.local/share/pnpm/store/v10` verwenden
   - **Konsequenz**: First-time `pnpm install` re-downloads alle Packages! (500+ MB)
   
2. **Symlinks in node_modules**: pnpm erstellt `.pnpm`-Store mit Symlinks
   - Funktioniert nach `cp -a` (preserves symlinks) ✅
   - ABER: Wenn Store-Pfad hardcoded ist, brechen Links ❌

3. **Workspace-Protokoll**: `packages/backend` referenziert `workspace:*` Packages
   - Funktioniert solange `pnpm-workspace.yaml` vorhanden ✅

**EMPFEHLUNG**: 
- Entweder: Globaler pnpm Store (`pnpm config set store-dir /opt/pnpm-store --global`)
- Oder: Nach Copy `pnpm install --frozen-lockfile` im neuen User-Context

### Cron-Jobs (root)

```cron
0 2 * * * /opt/backup_gaestefotos.sh daily
0 3 * * 0 /opt/backup_gaestefotos.sh weekly
0 4 1 * * /opt/backup_gaestefotos.sh monthly
30 2 * * * /opt/backup_gaestefotos_db.sh daily
30 3 * * 0 /opt/backup_gaestefotos_db.sh weekly
30 4 1 * * /opt/backup_gaestefotos_db.sh monthly
```

**Problem**: `backup_gaestefotos.sh` referenziert:
```bash
BACKEND_DIR="/var/www/vhosts/xn--gstefotos-v2a.com/root/gaestefotos-app/backend"
FRONTEND_DIR="/var/www/vhosts/xn--gstefotos-v2a.com/root/gaestefotos-app/frontend"
```

→ **DIESE PFADE EXISTIEREN NICHT!** 🔴  
→ Backup läuft vermutlich seit Monaten fehl (Check `/var/log/backup.log`)

**Lösung**: Scripts müssen auf `/opt/gaestefotos/app` aktualisiert werden

---

## 🎯 ANTWORTEN AUF SPEZIFISCHE FRAGEN

### 1. `.next/` Build-Caches und `node_modules/.cache` — Read-Only?

**NEIN, Write-Access nötig!**

**Warum**:
- Next.js schreibt bei **jedem Start** in `.next/cache/` (Incremental Cache)
- `node_modules/.cache` wird von pnpm/TypeScript/ESLint verwendet
- `ExecStartPre` führt Builds aus → schreibt in `dist/` und `.next/`

**Konsequenz**: 
- `gaestefotos:gaestefotos` braucht `chown -R` auf gesamtes `/opt/gaestefotos/app`
- **KEINE Read-Only-Mounts möglich**

### 2. pnpm Global Store — neuer User-Kontext?

**JA, Store ist user-spezifisch!**

**Optionen**:

**Option A: User-lokaler Store** (Default)
```bash
su - gaestefotos -s /bin/bash
cd /opt/gaestefotos/app
pnpm install --frozen-lockfile
```
→ Erstellt `/opt/gaestefotos/.local/share/pnpm/store/v10`  
→ **~500 MB Download, ~5 Min**

**Option B: Globaler Store** (Shared)
```bash
mkdir -p /opt/pnpm-store
chown gaestefotos:gaestefotos /opt/pnpm-store
pnpm config set store-dir /opt/pnpm-store --location=global
```
→ Spart Disk-Space wenn mehrere User/Projekte

**EMPFEHLUNG**: Option A (cleaner Isolation)

### 3. Hardcoded Pfade in .env / Next.js Output?

**GEPRÜFT: Keine problematischen Hardcodes gefunden**

**Checked**:
- `.env`-Dateien: Verwenden relative Pfade oder `localhost`
- `next.config.js`: Keine absoluten Pfade
- Prisma Client: Wird via `prisma generate` zur Build-Time generiert (path-agnostic)
- Build-Output (`.next/`): Enthält nur relative `require()` Statements

**ABER**: Service-Units haben Hardcodes (siehe oben)

### 4. Eigene `.bashrc` / `PATH` für neuen User?

**NICHT NÖTIG für systemd Services**

**Warum**:
- systemd verwendet **nicht** die Shell-Environment des Users
- `PATH` wird via `Environment=PATH=/usr/bin:/bin` gesetzt
- Node/pnpm werden absolute-path referenziert (`/usr/bin/node`, `/usr/bin/pnpm`)

**ABER**: Für manuelle SSH-Logins sinnvoll:
```bash
echo 'export PATH="/usr/bin:$PATH"' >> /opt/gaestefotos/.bashrc
```

### 5. `ProtectHome=true` bei `/opt/` App-Pfad?

**✅ KEIN PROBLEM**

**Warum**:
- `ProtectHome=true` macht `/home`, `/root`, `/run/user` read-only
- `/opt/` ist **NICHT** Teil von `$HOME`
- Zugriff auf `/opt/gaestefotos/app` bleibt uneingeschränkt

**Bonus**: Verhindert versehentlichen Zugriff auf `/root` durch App-Code

### 6. Cron-Jobs für Backups — weiterhin root?

**JA, Backups sollten als root laufen**

**Warum**:
- Braucht Zugriff auf `/opt/gaestefotos/app` (lesen)
- Braucht Schreibzugriff auf `/opt/backups/` (root-owned)
- PostgreSQL-Backups: `pg_dump` kann als postgres-User via `su` laufen

**WICHTIG**: Backup-Scripts müssen auf neue Pfade aktualisiert werden!

**Alternativ** (Advanced):
```bash
# Backup als gaestefotos-User mit sudo
su - gaestefotos -c "tar czf - /opt/gaestefotos/app" | sudo tee /opt/backups/app.tar.gz > /dev/null
```

### 7. Git-Zugriff für Deployments?

**JA, Git-Config nötig wenn du Deployments via `git pull` machst**

**Setup**:
```bash
# Git in /opt/gaestefotos/app braucht Ownership
chown -R gaestefotos:gaestefotos /opt/gaestefotos/app/.git

# Wenn du als root deployst:
cd /opt/gaestefotos/app
git config --global --add safe.directory /opt/gaestefotos/app

# Wenn du als gaestefotos deployst:
su - gaestefotos -s /bin/bash
cd /opt/gaestefotos/app
git pull origin main
```

**EMPFEHLUNG**: Deployment via CI/CD oder root (mit `chown` nach pull)

---

## 🚨 RISIKO-MATRIX

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| **pnpm Store-Symlinks brechen** | 🟡 Mittel (30%) | 🔴 Hoch (Services starten nicht) | Pre-Migration: `pnpm install` als neuer User |
| **Hardcoded node_modules/next Pfad** | 🔴 Hoch (90%) | 🔴 Hoch (Admin/Print crash) | Units auf `pnpm --filter` umstellen |
| **ClamAV Socket Permission Denied** | 🟢 Niedrig (10%) | 🟡 Mittel (Virus-Scan fehlschlägt) | `usermod -aG clamav gaestefotos` |
| **Backup-Scripts laufen ins Leere** | 🔴 **Bereits real** (100%) | 🟡 Mittel (Kein App-Backup) | Scripts auf `/opt/gaestefotos/app` aktualisieren |
| **Staging-Frontend crasht weiter** | 🔴 Bereits real | 🟡 Mittel (Staging kaputt) | Erst Service-Definition fixen |
| **Plesk Nginx Proxy bricht** | 🟢 Niedrig (5%) | 🟢 Niedrig (Ports bleiben gleich) | Nginx-Test vor Neustart |
| **PostgreSQL Connection Denied** | 🟢 Niedrig (5%) | 🔴 Hoch (DB offline) | Connection-String in .env hat `localhost` (TCP) |
| **.env Permissions zu restriktiv** | 🟡 Mittel (20%) | 🔴 Hoch (Secrets nicht lesbar) | `chmod 600` + `chown gaestefotos` |
| **Downtime >5 Min** | 🟡 Mittel (40%) | 🟡 Mittel (User Impact) | Pre-Build, Parallel-Prep, Rollback-Script |

**KRITISCHSTE PUNKTE**:
1. 🔴 Backup-Scripts JETZT fixen (laufen seit Wochen fehl!)
2. 🔴 Staging-Frontend-Service JETZT reparieren
3. 🔴 Hardcoded Pfade in `admin-dashboard` / `print-terminal` Units

---

## 🛠️ KORRIGIERTER MIGRATIONSPLAN

### Phase 0: PRE-MIGRATION FIXES (Kein Downtime, SOFORT)

```bash
# 1. Staging-Frontend-Service analysieren und fixen
systemctl status gaestefotos-frontend-staging.service -n 50
journalctl -u gaestefotos-frontend-staging.service -n 100
# → ERST FIXEN bevor Migration!

# 2. Backup-Scripts korrigieren
vim /opt/backup_gaestefotos.sh
# Ändere:
BACKEND_DIR="/root/gaestefotos-app-v2/packages/backend"
FRONTEND_DIR="/root/gaestefotos-app-v2/packages/frontend"
# (Später zu /opt/gaestefotos/app/packages/... nach Migration)

# 3. Backup-Logs prüfen
tail -100 /var/log/backup.log
# → Vermutlich Fehler seit Wochen!
```

### Phase 1: VORBEREITUNG (Kein Downtime, 30 Min)

```bash
#!/bin/bash
set -euo pipefail

echo "=== Phase 1: User & Directories ==="

# 1.1 System-User erstellen
useradd --system \
  --shell /usr/sbin/nologin \
  --home-dir /opt/gaestefotos \
  --create-home \
  --comment "Gaestefotos SaaS Application User" \
  gaestefotos

# 1.2 ClamAV Group Membership
usermod -aG clamav gaestefotos

# 1.3 Test ClamAV Socket Access
su -s /bin/bash gaestefotos -c "test -r /var/run/clamav/clamd.ctl && echo 'ClamAV OK' || echo 'ClamAV FAIL'"

# 1.4 App-Verzeichnis vorbereiten
mkdir -p /opt/gaestefotos/app
mkdir -p /opt/gaestefotos/logs

echo "=== Phase 1: App Copy (3 GB, ~2 Min) ==="

# 1.5 App kopieren (cp -a preserves symlinks!)
time rsync -aH --info=progress2 \
  /root/gaestefotos-app-v2/ \
  /opt/gaestefotos/app/

# 1.6 Ownership setzen
chown -R gaestefotos:gaestefotos /opt/gaestefotos/

# 1.7 Sensitive Files
chmod 600 /opt/gaestefotos/app/packages/backend/.env
chmod 600 /opt/gaestefotos/app/packages/backend/.env.staging
chmod 600 /opt/gaestefotos/app/packages/frontend/.env.local
chmod 600 /opt/gaestefotos/app/packages/frontend/.env.staging

# 1.8 Uploads-Verzeichnis (Write-Access!)
chmod 755 /opt/gaestefotos/app/packages/backend/uploads
chmod 755 /opt/gaestefotos/app/packages/backend/uploads/events
chmod 755 /opt/gaestefotos/app/packages/backend/uploads/reels

echo "=== Phase 1: pnpm Store Setup ==="

# 1.9 pnpm install als neuer User (erstellt lokalen Store)
su -s /bin/bash gaestefotos << 'EOFSU'
cd /opt/gaestefotos/app
export HOME=/opt/gaestefotos
/usr/bin/pnpm install --frozen-lockfile
EOFSU

echo "✅ Phase 1 Complete"
```

**DAUER**: ~5-7 Minuten (3 GB Copy + pnpm install)

### Phase 2: SYSTEMD UNITS (Kein Downtime, 10 Min)

```bash
#!/bin/bash
set -euo pipefail

echo "=== Phase 2: Backup alte Units ==="

cd /etc/systemd/system
for unit in gaestefotos-*.service; do
  cp "$unit" "$unit.root-backup-$(date +%Y%m%d_%H%M%S)"
done

echo "=== Phase 2: Neue Units schreiben ==="

# Unit-Generator (für alle 7 Services)
generate_unit() {
  local SERVICE_NAME=$1
  local PORT=$2
  local PACKAGE=$3
  local IS_STAGING=${4:-false}
  
  local WORKING_DIR="/opt/gaestefotos/app"
  local ENV_FILE=""
  
  if [[ "$PACKAGE" == "backend" ]]; then
    WORKING_DIR="/opt/gaestefotos/app"
    if [[ "$IS_STAGING" == "true" ]]; then
      ENV_FILE="EnvironmentFile=/opt/gaestefotos/app/packages/backend/.env.staging"
    else
      ENV_FILE="EnvironmentFile=/opt/gaestefotos/app/packages/backend/.env"
    fi
  elif [[ "$PACKAGE" == "frontend" || "$PACKAGE" == "admin-dashboard" || "$PACKAGE" == "print-terminal" ]]; then
    WORKING_DIR="/opt/gaestefotos/app/packages/$PACKAGE"
    if [[ "$IS_STAGING" == "true" ]]; then
      ENV_FILE="EnvironmentFile=/opt/gaestefotos/app/packages/$PACKAGE/.env.staging"
    else
      ENV_FILE="EnvironmentFile=/opt/gaestefotos/app/packages/$PACKAGE/.env.local"
    fi
  fi

  cat > "/etc/systemd/system/$SERVICE_NAME.service" <<EOF
[Unit]
Description=Gästefotos V2 - $SERVICE_NAME
After=network.target postgresql.service

[Service]
Type=simple
User=gaestefotos
Group=gaestefotos
WorkingDirectory=$WORKING_DIR

# Environment
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=HOME=/opt/gaestefotos
$ENV_FILE

# Security Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gaestefotos/app
ReadWritePaths=/tmp
PrivateTmp=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true

# Execution
$(generate_exec_commands "$PACKAGE" "$PORT" "$IS_STAGING")

# Restart
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Resource Limits
MemoryMax=2G
TasksMax=512

[Install]
WantedBy=multi-user.target
EOF
}

generate_exec_commands() {
  local PACKAGE=$1
  local PORT=$2
  local IS_STAGING=$3
  
  if [[ "$PACKAGE" == "backend" ]]; then
    cat <<'EXEC'
ExecStartPre=/usr/bin/pnpm --filter @gaestefotos/shared build
ExecStartPre=/usr/bin/pnpm --filter @gaestefotos/backend exec prisma generate
ExecStartPre=/usr/bin/pnpm --filter @gaestefotos/backend build
ExecStart=/usr/bin/env PORT=%PORT% /usr/bin/pnpm --filter @gaestefotos/backend start
EXEC
    sed "s/%PORT%/$PORT/g"
  else
    # Frontend / Admin / Print-Terminal
    cat <<'EXEC'
ExecStartPre=/usr/bin/pnpm --filter @gaestefotos/shared build
ExecStartPre=/usr/bin/pnpm --filter @gaestefotos/%PACKAGE% build
ExecStart=/usr/bin/pnpm --filter @gaestefotos/%PACKAGE% start
EXEC
    sed "s/%PACKAGE%/$PACKAGE/g"
  fi
}

# Generate all units
generate_unit "gaestefotos-backend" 8001 "backend" false
generate_unit "gaestefotos-frontend" 3000 "frontend" false
generate_unit "gaestefotos-admin-dashboard" 3001 "admin-dashboard" false
generate_unit "gaestefotos-print-terminal" 3002 "print-terminal" false
generate_unit "gaestefotos-backend-staging" 8101 "backend" true
generate_unit "gaestefotos-admin-dashboard-staging" 3101 "admin-dashboard" true
generate_unit "gaestefotos-frontend-staging" 3100 "frontend" true

echo "✅ Phase 2 Complete - Units written"
```

**WICHTIG**: `ReadWritePaths=/opt/gaestefotos/app` erlaubt Write-Access trotz `ProtectSystem=strict`

### Phase 3: FULL BACKUP (Kein Downtime, 5 Min)

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/backups/pre-migration-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "=== Phase 3: Full Backup ==="

# 3.1 PostgreSQL
sudo -u postgres pg_dumpall > "$BACKUP_DIR/postgresql_all.sql"

# 3.2 App-Code (alt)
tar czf "$BACKUP_DIR/app-root.tar.gz" -C /root gaestefotos-app-v2

# 3.3 systemd Units (alt)
cp /etc/systemd/system/gaestefotos-*.service.root-backup-* "$BACKUP_DIR/"

# 3.4 Cron
crontab -l > "$BACKUP_DIR/root-crontab.txt"

# 3.5 Nginx (Plesk)
tar czf "$BACKUP_DIR/plesk-nginx.tar.gz" /etc/nginx/

echo "✅ Backup: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
```

### Phase 4: MIGRATION (⏱️ DOWNTIME: 2-3 Min)

```bash
#!/bin/bash
set -euo pipefail

echo "=== Phase 4: STOPPING SERVICES ==="
date

# 4.1 Stop all services
systemctl stop gaestefotos-backend.service
systemctl stop gaestefotos-frontend.service
systemctl stop gaestefotos-admin-dashboard.service
systemctl stop gaestefotos-print-terminal.service
systemctl stop gaestefotos-backend-staging.service
systemctl stop gaestefotos-admin-dashboard-staging.service
systemctl stop gaestefotos-frontend-staging.service

echo "Services stopped at: $(date)"

# 4.2 Reload systemd
systemctl daemon-reload

# 4.3 Start all services (neue Units!)
systemctl start gaestefotos-backend.service &
systemctl start gaestefotos-frontend.service &
systemctl start gaestefotos-admin-dashboard.service &
systemctl start gaestefotos-print-terminal.service &
systemctl start gaestefotos-backend-staging.service &
systemctl start gaestefotos-admin-dashboard-staging.service &
systemctl start gaestefotos-frontend-staging.service &

wait

echo "Services started at: $(date)"

# 4.4 Wait for boot
sleep 5

echo "=== Phase 4: HEALTH CHECKS ==="

# 4.5 Check service status
systemctl status gaestefotos-backend.service --no-pager
systemctl status gaestefotos-frontend.service --no-pager

# 4.6 HTTP Health Checks
curl -f http://localhost:8001/api/health || echo "⚠️ Backend health check failed"
curl -f http://localhost:3000 || echo "⚠️ Frontend health check failed"
curl -f http://localhost:3001 || echo "⚠️ Admin health check failed"

echo "✅ Phase 4 Complete"
```

**DOWNTIME**: ~2-3 Minuten (Services parallel starten!)

### Phase 5: POST-MIGRATION (Kein Downtime, 5 Min)

```bash
#!/bin/bash
set -euo pipefail

echo "=== Phase 5: Backup-Scripts aktualisieren ==="

# 5.1 Backup-Scripts auf neue Pfade patchen
sed -i.bak \
  's|BACKEND_DIR="/var/www/.*|BACKEND_DIR="/opt/gaestefotos/app/packages/backend"|' \
  /opt/backup_gaestefotos.sh

sed -i.bak \
  's|FRONTEND_DIR="/var/www/.*|FRONTEND_DIR="/opt/gaestefotos/app/packages/frontend"|' \
  /opt/backup_gaestefotos.sh

# 5.2 Test Backup-Script
/opt/backup_gaestefotos.sh daily

# 5.3 Alte App als Backup behalten (NICHT löschen!)
# mv /root/gaestefotos-app-v2 /root/gaestefotos-app-v2.root-backup

echo "=== Phase 5: Monitoring für 24h ==="

# 5.4 Service Logs monitoren
journalctl -fu gaestefotos-backend.service &
journalctl -fu gaestefotos-frontend.service &

echo "✅ Migration Complete!"
```

---

## 🔄 ROLLBACK-STRATEGIE

### Wenn Services nicht starten (innerhalb 5 Min):

```bash
#!/bin/bash
# ROLLBACK SCRIPT

set -euo pipefail

echo "🚨 ROLLBACK INITIATED"

# 1. Stop neue Services
systemctl stop gaestefotos-*.service

# 2. Restore alte Units
cd /etc/systemd/system
for backup in gaestefotos-*.service.root-backup-*; do
  original="${backup%.root-backup-*}.service"
  cp "$backup" "$original"
done

# 3. Reload
systemctl daemon-reload

# 4. Start alte Services
systemctl start gaestefotos-backend.service
systemctl start gaestefotos-frontend.service
systemctl start gaestefotos-admin-dashboard.service
systemctl start gaestefotos-print-terminal.service
systemctl start gaestefotos-backend-staging.service
systemctl start gaestefotos-admin-dashboard-staging.service

# 5. Verify
sleep 5
curl http://localhost:8001/api/health
curl http://localhost:3000

echo "✅ Rollback Complete - Running on root again"
```

**DOWNTIME BEI ROLLBACK**: Weitere 2-3 Minuten

### Wenn Rollback fehlschlägt:

1. **PostgreSQL wiederherstellen**:
   ```bash
   sudo -u postgres psql < /opt/backups/pre-migration-*/postgresql_all.sql
   ```

2. **App wiederherstellen**:
   ```bash
   cd /root
   tar xzf /opt/backups/pre-migration-*/app-root.tar.gz
   ```

3. **Plesk Ticket öffnen** falls Nginx-Config korrupt

---

## ✅ TEST-CHECKLISTE (POST-MIGRATION)

### Direkt nach Migration (5 Min)

- [ ] Alle 7 Services sind `active (running)`: `systemctl status gaestefotos-*`
- [ ] Backend Health-Check: `curl http://localhost:8001/api/health`
- [ ] Frontend erreichbar: `curl http://localhost:3000`
- [ ] Admin-Dashboard erreichbar: `curl http://localhost:3001`
- [ ] Print-Terminal erreichbar: `curl http://localhost:3002`
- [ ] Staging-Services laufen: `systemctl status gaestefotos-*-staging`
- [ ] Keine Permission-Denied Errors in Logs: `journalctl -u gaestefotos-* -n 100`

### Backend-Funktionalität (10 Min)

- [ ] Login funktioniert: Teste Admin-Login über Frontend
- [ ] Foto-Upload: Teste Upload über `/api/events/:id/photos/upload`
- [ ] ClamAV Integration: `grep -i clamav /opt/gaestefotos/logs/*.log`
- [ ] PostgreSQL Connection: Check DB-Queries in Logs
- [ ] Redis Connection: Check Session-Storage
- [ ] SeaweedFS Connection: Test File-Upload/-Download

### File-Permissions (5 Min)

- [ ] `.env` Dateien lesbar: `su -s /bin/bash gaestefotos -c "cat /opt/gaestefotos/app/packages/backend/.env | head -1"`
- [ ] `uploads/` beschreibbar: `su -s /bin/bash gaestefotos -c "touch /opt/gaestefotos/app/packages/backend/uploads/test.txt"`
- [ ] `.next/` beschreibbar: Check für Next.js Cache-Writes
- [ ] pnpm Store: `ls -la /opt/gaestefotos/.local/share/pnpm/store/v10`

### Backup-System (5 Min)

- [ ] Backup-Scripts aktualisiert: `grep /opt/gaestefotos /opt/backup_gaestefotos.sh`
- [ ] Manueller Backup-Test: `/opt/backup_gaestefotos.sh daily`
- [ ] DB-Backup: `/opt/backup_gaestefotos_db.sh daily`
- [ ] Backup-Logs: `tail -50 /var/log/backup.log`

### Langzeit-Monitoring (24h)

- [ ] Kein Memory Leak: `systemctl status gaestefotos-backend` → Check `Memory:`
- [ ] Kein Disk-Space-Problem: `df -h /opt/gaestefotos`
- [ ] Services restarten nach Crash: Test mit `systemctl kill gaestefotos-backend`
- [ ] Logs bleiben sauber: `journalctl -u gaestefotos-* --since "1 hour ago" | grep -i error`

---

## 💡 EMPFEHLUNGEN

### Symlink vs. Copy vs. Move?

**EMPFEHLUNG: COPY (`rsync -aH`)**

| Methode | Pro | Contra | Risiko |
|---------|-----|--------|--------|
| **Copy** | Vollständiges Backup in `/root`, Rollback trivial, Symlinks preserved | 3 GB Disk-Space, 2 Min Dauer | 🟢 Niedrig |
| **Move** | Kein Disk-Space, Instant | Kein Backup, Rollback schwer | 🔴 Hoch |
| **Symlink** | Kein Duplicate | Permissions-Chaos, `ProtectHome` Problem | 🔴 Hoch |

**NACH 30 TAGEN**: Lösche `/root/gaestefotos-app-v2` wenn Migration stabil läuft

### Plesk-Kompatibilität

**✅ KEINE PROBLEME ERWARTET**

**Warum**:
- Plesk Nginx Proxy arbeitet auf Port-Basis (3000, 8001) → unverändert
- SSL/Let's Encrypt via Plesk → unabhängig von systemd User
- Firewall-Regeln: Ports bleiben gleich
- Plesk Web-Interface: Kein Zugriff auf systemd Services nötig

**EMPFEHLUNG**: Nach Migration Nginx-Config testen:
```bash
nginx -t
systemctl reload nginx
```

### Downtime-Minimierung

**AKTUELLE PLANUNG**: 2-3 Minuten

**OPTIMIERUNGEN FÜR <1 MINUTE**:

1. **Pre-Build in Phase 1**:
   ```bash
   su -s /bin/bash gaestefotos -c "cd /opt/gaestefotos/app && pnpm --filter @gaestefotos/backend build"
   ```
   → Spart `ExecStartPre` Zeit

2. **Parallel Service Start**:
   ```bash
   for service in backend frontend admin-dashboard print-terminal; do
     systemctl start gaestefotos-$service.service &
   done
   wait
   ```

3. **Health-Check Automation**:
   ```bash
   until curl -f http://localhost:8001/api/health; do sleep 1; done
   ```

**MIT OPTIMIERUNGEN**: <60 Sekunden Downtime möglich

### Security-Hardening Bonus

**Zusätzliche systemd-Optionen** (optional):

```ini
[Service]
# Network
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
IPAddressDeny=any
IPAddressAllow=localhost
IPAddressAllow=10.0.0.0/8

# Filesystem
ProtectKernelModules=true
ProtectKernelLogs=true
PrivateDevices=true

# Capabilities
CapabilityBoundingSet=
AmbientCapabilities=

# System Calls
SystemCallFilter=@system-service
SystemCallFilter=~@privileged @resources

# No Exec on /tmp
NoExecPaths=/tmp
```

**ACHTUNG**: Test-first! Kann Apps brechen.

---

## 📋 PRE-FLIGHT CHECKLISTE (VOR EXECUTION)

### Opus soll VOR Execution prüfen:

- [ ] **Staging-Frontend-Service** ist gefixt (kein auto-restart)
- [ ] **Backup-Scripts** zeigen auf `/root/gaestefotos-app-v2` (nicht `/var/www`)
- [ ] **Full Backup** existiert (DB + App + Units)
- [ ] **Maintenance-Mode** aktiviert (optional: Plesk "Wartungsseite")
- [ ] **User-Notification** verschickt (wenn kritischer Service)
- [ ] **Rollback-Script** ist tested (`bash -n rollback.sh`)
- [ ] **Monitoring** ist bereit (z.B. Uptime-Ping, Sentry)
- [ ] **SSH-Zugang** funktioniert (Test: `ssh user@server`)
- [ ] **Disk-Space** verfügbar: `df -h` (mind. 10 GB frei)
- [ ] **Load Average** ist niedrig: `uptime` (<2.0 ideal)

---

## 🎯 FINALE EMPFEHLUNG FÜR OPUS

### Execution-Strategie

**TIMING**: Wartungsfenster, z.B. Sonntag 02:00 Uhr (low traffic)

**REIHENFOLGE**:
1. Phase 0 **JETZT** ausführen (Staging fixen, Backup-Scripts korrigieren)
2. Phasen 1-2 **am Tag vor Wartungsfenster** (Vorbereitung)
3. Phase 3-4 **im Wartungsfenster** (Migration)
4. Phase 5 **direkt danach** (Post-Migration)

**KOMMUNIKATION**:
```
An: me
Betreff: Gaestefotos Service Migration - Start

Phase 0: ABGESCHLOSSEN
- Staging-Frontend-Service repariert
- Backup-Scripts korrigiert
- Full-Backup erstellt: /opt/backups/pre-migration-20260215_020000

Phase 1: LAUFEND (ETA: 5-7 Min)
- User erstellt ✅
- App kopiert (3 GB) [▓▓▓▓▓▓░░░░] 60%
- pnpm install [PENDING]

... (Live-Updates)
```

### Success-Kriterien

- [ ] Alle Services `active (running)` für >1h
- [ ] Keine Errors in Logs
- [ ] Frontend/Backend erreichbar über Public-Domain
- [ ] Backup-System funktioniert
- [ ] Downtime war <5 Min

---

## 📁 DELIVERABLES FÜR OPUS

1. ✅ **Korrigierter Migrationsplan** (siehe oben, copy-paste-ready)
2. ✅ **Rollback-Script** (siehe "ROLLBACK-STRATEGIE")
3. ✅ **Test-Checkliste** (siehe "TEST-CHECKLISTE")
4. ✅ **Risiko-Matrix** (siehe "RISIKO-MATRIX")
5. ✅ **Empfehlung**: **COPY** (`rsync -aH`) statt Move/Symlink

---

## 🚀 READY FOR EXECUTION

**STATUS**: 🟢 **GRÜNES LICHT**

**VORAUSSETZUNGEN**:
- ✅ Analyse abgeschlossen
- ✅ Kritische Findings identifiziert
- ✅ Migrationsplan korrigiert
- ⚠️ Phase 0 (Staging-Fix + Backup-Scripts) **MUSS ZUERST** ausgeführt werden

**NÄCHSTER SCHRITT**: Opus führt Phase 0-5 sequenziell aus.

---

**Erstellt von**: Sonnet 4.5  
**Für Execution durch**: Opus 4.6  
**Zielserver**: Hetzner VPS / Plesk Obsidian / Ubuntu 22.04 LTS  
**Projekt**: gästefotos.com SaaS Platform
