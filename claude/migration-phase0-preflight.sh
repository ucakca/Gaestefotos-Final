#!/bin/bash
################################################################################
# Phase 0: PRE-MIGRATION FIXES & ANALYSIS
# MUST BE RUN FIRST - Fixes critical issues before migration
################################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

log "=== PHASE 0: PRE-FLIGHT CHECKS & FIXES ==="

# 1. Check Staging Frontend Service
log "1. Analyzing Staging Frontend Service..."
if systemctl is-active --quiet gaestefotos-frontend-staging.service; then
    warn "Staging Frontend is running, but may be in restart loop"
else
    error "Staging Frontend is not running!"
fi

log "Last 50 lines of staging frontend logs:"
journalctl -u gaestefotos-frontend-staging.service -n 50 --no-pager

log ""
read -p "⚠️  Has staging frontend been fixed? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "Please fix staging frontend before continuing!"
    exit 1
fi

# 2. Check Backup Scripts
log "2. Analyzing Backup Scripts..."
if ! grep -q "/root/gaestefotos-app-v2" /opt/backup_gaestefotos.sh; then
    error "Backup script still points to old paths!"
    grep "DIR=" /opt/backup_gaestefotos.sh
    
    log "Suggested fix:"
    echo "  sed -i.bak \\"
    echo "    's|BACKEND_DIR=\"/var/www/.*\"|BACKEND_DIR=\"/root/gaestefotos-app-v2/packages/backend\"|' \\"
    echo "    /opt/backup_gaestefotos.sh"
    
    read -p "Apply fix now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sed -i.bak \
          's|BACKEND_DIR="/var/www/.*"|BACKEND_DIR="/root/gaestefotos-app-v2/packages/backend"|' \
          /opt/backup_gaestefotos.sh
        sed -i.bak \
          's|FRONTEND_DIR="/var/www/.*"|FRONTEND_DIR="/root/gaestefotos-app-v2/packages/frontend"|' \
          /opt/backup_gaestefotos.sh
        log "✅ Backup scripts fixed!"
    fi
fi

# 3. Check backup logs
log "3. Checking backup history..."
if [ -f /var/log/backup.log ]; then
    log "Last 20 lines of backup.log:"
    tail -20 /var/log/backup.log
else
    warn "No backup.log found"
fi

# 4. Disk Space Check
log "4. Checking disk space..."
df -h /root /opt
DISK_FREE=$(df /opt | tail -1 | awk '{print $4}' | sed 's/G//')
if (( $(echo "$DISK_FREE < 10" | bc -l) )); then
    error "Less than 10 GB free on /opt! Migration requires ~6 GB (3 GB app + 3 GB buffer)"
    exit 1
fi
log "✅ Sufficient disk space"

# 5. Check running processes
log "5. Checking running services..."
systemctl status gaestefotos-* --no-pager | grep -E "(Loaded|Active)" | head -20

# 6. Check ClamAV
log "6. Checking ClamAV socket..."
if [ -S /var/run/clamav/clamd.ctl ]; then
    log "✅ ClamAV socket exists"
    stat -c '%a %U:%G' /var/run/clamav/clamd.ctl
else
    error "ClamAV socket not found!"
fi

# 7. Check pnpm
log "7. Checking pnpm..."
which pnpm node
pnpm store path
log "✅ pnpm installed"

# 8. Summary
log ""
log "=== PHASE 0 SUMMARY ==="
log "✅ Pre-flight checks completed"
log ""
log "NEXT STEPS:"
log "1. Ensure staging frontend is fixed"
log "2. Run full backup (migration-phase3-backup.sh)"
log "3. Run Phase 1 (migration-phase1-prepare.sh)"
log ""
warn "Do NOT proceed with migration until all issues are resolved!"
