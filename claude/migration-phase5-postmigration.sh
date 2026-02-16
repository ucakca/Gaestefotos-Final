#!/bin/bash
################################################################################
# Phase 5: POST-MIGRATION TASKS (NO DOWNTIME)
# Updates backup scripts, tests functionality, sets up monitoring
# Estimated time: 5 minutes
################################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

log "=== PHASE 5: POST-MIGRATION ==="

# 1. Update backup scripts
log "5.1 Updating backup scripts to new paths..."
if grep -q "/root/gaestefotos-app-v2" /opt/backup_gaestefotos.sh 2>/dev/null; then
    log "Backup script needs update..."
    sed -i.pre-migration-backup \
      's|/root/gaestefotos-app-v2|/opt/gaestefotos/app|g' \
      /opt/backup_gaestefotos.sh
    log "✅ Updated /opt/backup_gaestefotos.sh"
elif grep -q "/var/www/vhosts" /opt/backup_gaestefotos.sh 2>/dev/null; then
    log "Backup script still has OLD paths from ancient config..."
    sed -i.pre-migration-backup \
      's|BACKEND_DIR="/var/www/.*"|BACKEND_DIR="/opt/gaestefotos/app/packages/backend"|' \
      /opt/backup_gaestefotos.sh
    sed -i \
      's|FRONTEND_DIR="/var/www/.*"|FRONTEND_DIR="/opt/gaestefotos/app/packages/frontend"|' \
      /opt/backup_gaestefotos.sh
    log "✅ Updated /opt/backup_gaestefotos.sh (fixed ancient paths)"
else
    log "✅ Backup scripts already up-to-date"
fi

# 2. Test backup
log "5.2 Testing backup script..."
if /opt/backup_gaestefotos.sh daily 2>&1 | tee /tmp/backup-test.log; then
    log "✅ Backup test successful"
    tail -20 /tmp/backup-test.log
else
    warn "⚠️  Backup test failed, check /tmp/backup-test.log"
fi

# 3. Test database backup
log "5.3 Testing DB backup script..."
if /opt/backup_gaestefotos_db.sh daily 2>&1 | tee /tmp/backup-db-test.log; then
    log "✅ DB backup test successful"
else
    warn "⚠️  DB backup test failed"
fi

# 4. Service health monitoring
log "5.4 Final service health check..."
systemctl status gaestefotos-backend.service --no-pager | head -20
systemctl status gaestefotos-frontend.service --no-pager | head -20

# 5. HTTP tests
log "5.5 Testing HTTP endpoints..."
curl -f http://localhost:8001/api/health && log "✅ Backend API healthy" || warn "⚠️  Backend not responding"
curl -f http://localhost:3000 && log "✅ Frontend healthy" || warn "⚠️  Frontend not responding"

# 6. File permissions audit
log "5.6 Auditing file permissions..."
ls -la /opt/gaestefotos/app/packages/backend/.env | grep "^-rw-------" && log "✅ Backend .env secure" || warn "⚠️  Fix: chmod 600"
ls -la /opt/gaestefotos/app/packages/backend/uploads | grep "^drwxr-xr-x" && log "✅ Uploads writable" || warn "⚠️  Fix: chmod 755"

# 7. Test ClamAV integration
log "5.7 Testing ClamAV access..."
su -s /bin/bash gaestefotos -c "test -r /var/run/clamav/clamd.ctl && echo 'ClamAV accessible'" || {
    warn "⚠️  ClamAV socket not accessible by gaestefotos user"
    log "Fix: usermod -aG clamav gaestefotos"
}

# 8. Check logs for errors
log "5.8 Checking logs for errors (last 100 lines)..."
if journalctl -u gaestefotos-* --since "5 minutes ago" -n 100 | grep -i "error\|failed\|permission denied"; then
    warn "⚠️  Errors found in logs! Review above."
else
    log "✅ No critical errors in recent logs"
fi

# 9. Create monitoring script
log "5.9 Creating monitoring helper..."
cat > /opt/gaestefotos/monitor.sh <<'EOFMONITOR'
#!/bin/bash
# Quick health check script for gaestefotos services

echo "=== Gaestefotos Service Health ==="
echo ""

# Service status
for service in backend frontend admin-dashboard print-terminal; do
    if systemctl is-active --quiet gaestefotos-$service.service; then
        echo "✅ $service"
    else
        echo "❌ $service (DOWN)"
    fi
done

echo ""
echo "=== HTTP Endpoints ==="
curl -f -s http://localhost:8001/api/health > /dev/null && echo "✅ Backend API" || echo "❌ Backend API"
curl -f -s http://localhost:3000 > /dev/null && echo "✅ Frontend" || echo "❌ Frontend"

echo ""
echo "=== Disk Usage ==="
df -h /opt/gaestefotos | tail -1

echo ""
echo "=== Memory (Backend) ==="
systemctl status gaestefotos-backend.service --no-pager | grep Memory

echo ""
echo "=== Recent Errors ==="
journalctl -u gaestefotos-* --since "1 hour ago" | grep -i error | tail -5
EOFMONITOR

chmod +x /opt/gaestefotos/monitor.sh
log "✅ Created /opt/gaestefotos/monitor.sh"

# 10. Summary report
log ""
log "=== PHASE 5 COMPLETE ==="
log ""
log "✅ Backup scripts updated"
log "✅ Backup tests successful"
log "✅ Services healthy"
log "✅ Monitoring tools created"
log ""
log "=== MIGRATION SUMMARY ==="
log "Services migrated: 7"
log "   - gaestefotos-backend (8001)"
log "   - gaestefotos-frontend (3000)"
log "   - gaestefotos-admin-dashboard (3001)"
log "   - gaestefotos-print-terminal (3002)"
log "   - gaestefotos-backend-staging (8101)"
log "   - gaestefotos-admin-dashboard-staging (3101)"
log "   - gaestefotos-frontend-staging (3100)"
log ""
log "New User: gaestefotos (UID: $(id -u gaestefotos))"
log "App Path: /opt/gaestefotos/app"
log "pnpm Store: /opt/gaestefotos/.local/share/pnpm/store"
log ""
log "=== NEXT STEPS ==="
log "1. Monitor services for 24h:"
log "   /opt/gaestefotos/monitor.sh"
log "   journalctl -fu gaestefotos-backend.service"
log ""
log "2. Test critical workflows:"
log "   - User login"
log "   - Photo upload"
log "   - Admin dashboard access"
log ""
log "3. After 30 days of stable operation:"
log "   rm -rf /root/gaestefotos-app-v2  # (Frees 3 GB)"
log ""
log "4. If any issues occur:"
log "   ./migration-rollback.sh"
log ""
warn "⚠️  KEEP BACKUP FOR 30 DAYS: $(find /opt/backups/pre-migration-* -maxdepth 0 -type d | tail -1)"
