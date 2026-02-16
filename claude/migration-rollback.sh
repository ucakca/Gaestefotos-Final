#!/bin/bash
################################################################################
# ROLLBACK SCRIPT - EMERGENCY USE ONLY
# Restores services to run as root with old configuration
# Use this if migration fails or services don't start properly
################################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

log "=== ROLLBACK SCRIPT ==="
log ""
warn "⚠️  ⚠️  ⚠️  THIS WILL RESTORE SERVICES TO ROOT USER ⚠️  ⚠️  ⚠️"
log ""
log "This script will:"
log "  1. Stop all gaestefotos services"
log "  2. Restore old systemd units (User=root)"
log "  3. Reload systemd daemon"
log "  4. Restart services with old configuration"
log ""
read -p "Are you sure you want to rollback? (type 'yes' to confirm): " -r
if [[ ! $REPLY == "yes" ]]; then
    log "Rollback cancelled."
    exit 0
fi

START_TIME=$(date +%s)

# 1. Stop all services
log "1. Stopping all services..."
systemctl stop gaestefotos-backend.service 2>/dev/null || true
systemctl stop gaestefotos-frontend.service 2>/dev/null || true
systemctl stop gaestefotos-admin-dashboard.service 2>/dev/null || true
systemctl stop gaestefotos-print-terminal.service 2>/dev/null || true
systemctl stop gaestefotos-backend-staging.service 2>/dev/null || true
systemctl stop gaestefotos-admin-dashboard-staging.service 2>/dev/null || true
systemctl stop gaestefotos-frontend-staging.service 2>/dev/null || true
log "✅ Services stopped"

# 2. Find backup units
log "2. Finding backup systemd units..."
cd /etc/systemd/system
BACKUP_UNITS=$(ls gaestefotos-*.service.root-backup-* 2>/dev/null | head -7)

if [ -z "$BACKUP_UNITS" ]; then
    error "❌ No backup units found!"
    log "Cannot rollback without backups."
    log "Check /etc/systemd/system/ for .root-backup-* files"
    exit 1
fi

log "Found backups:"
echo "$BACKUP_UNITS" | while read unit; do
    log "  - $unit"
done

# 3. Restore old units
log "3. Restoring old systemd units..."
for backup in gaestefotos-*.service.root-backup-*; do
    original="${backup%.root-backup-*}"
    if [ -f "$backup" ]; then
        log "  Restoring $original from $backup"
        cp "$backup" "$original"
    fi
done
log "✅ Units restored"

# 4. Reload systemd
log "4. Reloading systemd daemon..."
systemctl daemon-reload
log "✅ systemd reloaded"

# 5. Start services with old config
log "5. Starting services (User=root, old paths)..."
systemctl start gaestefotos-backend.service &
systemctl start gaestefotos-frontend.service &
systemctl start gaestefotos-admin-dashboard.service &
systemctl start gaestefotos-print-terminal.service &
systemctl start gaestefotos-backend-staging.service &
systemctl start gaestefotos-admin-dashboard-staging.service &
# Skip staging frontend if it was broken before
# systemctl start gaestefotos-frontend-staging.service &
wait

log "✅ Services started"

# 6. Wait for boot
log "6. Waiting 10 seconds for services to initialize..."
sleep 10

# 7. Health checks
log "7. Running health checks..."

SUCCESS=0
FAILED=0

check_service() {
    local SERVICE=$1
    if systemctl is-active --quiet "$SERVICE"; then
        log "  ✅ $SERVICE is running"
        ((SUCCESS++))
        return 0
    else
        error "  ❌ $SERVICE FAILED"
        ((FAILED++))
        return 1
    fi
}

check_service "gaestefotos-backend.service"
check_service "gaestefotos-frontend.service"
check_service "gaestefotos-admin-dashboard.service"
check_service "gaestefotos-print-terminal.service"

# HTTP checks
log "8. HTTP health checks..."
HTTP_OK=0
curl -f -s -m 5 http://localhost:8001/api/health > /dev/null && {
    log "  ✅ Backend API responding"
    ((HTTP_OK++))
} || warn "  ⚠️  Backend not responding"

curl -f -s -m 5 http://localhost:3000 > /dev/null && {
    log "  ✅ Frontend responding"
    ((HTTP_OK++))
} || warn "  ⚠️  Frontend not responding"

# 9. Summary
END_TIME=$(date +%s)
ROLLBACK_TIME=$((END_TIME - START_TIME))

log ""
log "=== ROLLBACK COMPLETE ==="
log "✅ Services restored: $SUCCESS"
log "❌ Services failed: $FAILED"
log "✅ HTTP checks passed: $HTTP_OK/2"
log "⏱️  Rollback time: ${ROLLBACK_TIME}s"
log ""

if [ $FAILED -eq 0 ]; then
    log "✅ ROLLBACK SUCCESSFUL"
    log ""
    log "Services are now running as root again:"
    systemctl status gaestefotos-backend.service --no-pager | grep -E "(Loaded|Active|Main PID)"
    log ""
    log "Next steps:"
    log "1. Investigate why migration failed"
    log "2. Check logs: journalctl -u gaestefotos-* -n 200"
    log "3. Fix issues and retry migration"
else
    error "❌ ROLLBACK FAILED"
    log ""
    log "Services did not start properly even after rollback!"
    log ""
    log "EMERGENCY RECOVERY:"
    log "1. Check service status: systemctl status gaestefotos-*"
    log "2. Check logs: journalctl -xe"
    log "3. Try manual start: systemctl start gaestefotos-backend.service"
    log "4. If all else fails, restore from full backup:"
    log "   Find: /opt/backups/pre-migration-*"
    log "   Run: /opt/backups/pre-migration-*/RESTORE.sh"
fi

log ""
log "=== CLEANUP NOTES ==="
log "The new app copy still exists at: /opt/gaestefotos/"
log "You can remove it after confirming rollback works:"
log "  rm -rf /opt/gaestefotos"
log ""
log "The gaestefotos user still exists:"
log "  userdel -r gaestefotos  # (removes user and home)"
