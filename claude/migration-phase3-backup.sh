#!/bin/bash
################################################################################
# Phase 3: FULL BACKUP (NO DOWNTIME)
# Creates complete backup: DB, App, Units, Cron
# Estimated time: 3-5 minutes (depending on DB size)
################################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

BACKUP_DIR="/opt/backups/pre-migration-$(date +%Y%m%d_%H%M%S)"

log "=== PHASE 3: FULL BACKUP ==="
log "Backup location: $BACKUP_DIR"

# 1. Create backup directory
mkdir -p "$BACKUP_DIR"

# 2. PostgreSQL full dump
log "3.1 Backing up PostgreSQL (all databases)..."
if sudo -u postgres pg_dumpall > "$BACKUP_DIR/postgresql_all.sql"; then
    log "✅ PostgreSQL backup: $(du -h "$BACKUP_DIR/postgresql_all.sql" | cut -f1)"
else
    error "PostgreSQL backup failed!"
fi

# 3. App code (root version)
log "3.2 Backing up application code..."
if tar czf "$BACKUP_DIR/app-root.tar.gz" -C /root gaestefotos-app-v2; then
    log "✅ App backup: $(du -h "$BACKUP_DIR/app-root.tar.gz" | cut -f1)"
else
    error "App backup failed!"
fi

# 4. systemd units (old versions)
log "3.3 Backing up systemd units..."
cp /etc/systemd/system/gaestefotos-*.service.root-backup-* "$BACKUP_DIR/" 2>/dev/null || {
    warn "No root-backup units found, copying current units..."
    cp /etc/systemd/system/gaestefotos-*.service "$BACKUP_DIR/"
}
log "✅ Units backed up"

# 5. Cron
log "3.4 Backing up cron jobs..."
crontab -l > "$BACKUP_DIR/root-crontab.txt" 2>/dev/null || {
    warn "No crontab for root"
    touch "$BACKUP_DIR/root-crontab.txt"
}

# 6. Nginx (Plesk)
log "3.5 Backing up Nginx configuration..."
if tar czf "$BACKUP_DIR/plesk-nginx.tar.gz" /etc/nginx/ 2>/dev/null; then
    log "✅ Nginx backup: $(du -h "$BACKUP_DIR/plesk-nginx.tar.gz" | cut -f1)"
else
    warn "Nginx backup failed (non-critical)"
fi

# 7. Backup scripts
log "3.6 Backing up backup scripts..."
cp /opt/backup_gaestefotos*.sh "$BACKUP_DIR/" 2>/dev/null || warn "Backup scripts not found"

# 8. Service status snapshot
log "3.7 Saving service status..."
systemctl status gaestefotos-* --no-pager > "$BACKUP_DIR/service-status.txt" 2>&1

# 9. Environment info
log "3.8 Saving environment info..."
{
    echo "=== SYSTEM INFO ==="
    uname -a
    echo ""
    echo "=== DISK USAGE ==="
    df -h
    echo ""
    echo "=== MEMORY ==="
    free -h
    echo ""
    echo "=== NODE VERSION ==="
    node --version
    echo ""
    echo "=== PNPM VERSION ==="
    pnpm --version
    echo ""
    echo "=== RUNNING SERVICES ==="
    systemctl list-units 'gaestefotos-*' --no-pager
} > "$BACKUP_DIR/environment.txt"

# 10. Create restore script
log "3.9 Creating restore script..."
cat > "$BACKUP_DIR/RESTORE.sh" <<'EOFRESTORESCRIPT'
#!/bin/bash
# EMERGENCY RESTORE SCRIPT
# Use this if migration fails catastrophically

set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== RESTORING FROM BACKUP ==="
echo "Location: $BACKUP_DIR"
echo ""
read -p "⚠️  This will RESTORE PostgreSQL and App to pre-migration state. Continue? (yes/NO) " -r
if [[ ! $REPLY == "yes" ]]; then
    echo "Aborted."
    exit 1
fi

# Restore PostgreSQL
echo "Restoring PostgreSQL..."
sudo -u postgres psql < "$BACKUP_DIR/postgresql_all.sql"

# Restore App
echo "Restoring App to /root/gaestefotos-app-v2..."
if [ -d /root/gaestefotos-app-v2 ]; then
    mv /root/gaestefotos-app-v2 /root/gaestefotos-app-v2.broken-$(date +%s)
fi
tar xzf "$BACKUP_DIR/app-root.tar.gz" -C /root/

# Restore systemd units
echo "Restoring systemd units..."
cp "$BACKUP_DIR"/gaestefotos-*.service /etc/systemd/system/
systemctl daemon-reload

# Restart services
echo "Restarting services..."
systemctl restart gaestefotos-backend.service
systemctl restart gaestefotos-frontend.service
systemctl restart gaestefotos-admin-dashboard.service
systemctl restart gaestefotos-print-terminal.service

echo "✅ Restore complete!"
echo "Check services: systemctl status gaestefotos-*"
EOFRESTORESCRIPT

chmod +x "$BACKUP_DIR/RESTORE.sh"

# 11. Summary
log ""
log "=== PHASE 3 COMPLETE ==="
log "✅ Backup created: $BACKUP_DIR"
log ""
ls -lh "$BACKUP_DIR/"
log ""
log "Backup contents:"
log "  - postgresql_all.sql       (Full DB dump)"
log "  - app-root.tar.gz          (App code)"
log "  - gaestefotos-*.service    (systemd units)"
log "  - root-crontab.txt         (Cron jobs)"
log "  - plesk-nginx.tar.gz       (Nginx config)"
log "  - service-status.txt       (Pre-migration status)"
log "  - environment.txt          (System info)"
log "  - RESTORE.sh               (Emergency restore script)"
log ""
log "⚠️  IMPORTANT: Keep this backup for at least 30 days!"
log ""
log "NEXT STEP: Run migration-phase4-migrate.sh (DOWNTIME STARTS)"
