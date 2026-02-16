#!/bin/bash
################################################################################
# Phase 4: MIGRATION (⏱️ DOWNTIME: 2-3 minutes)
# Stops old services, reloads systemd, starts new services
# THIS IS THE CRITICAL PHASE - HAVE ROLLBACK SCRIPT READY!
################################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

log "=== PHASE 4: MIGRATION (DOWNTIME STARTS NOW) ==="
log ""
warn "⚠️  DOWNTIME WINDOW STARTED AT: $(date)"
log ""
read -p "Press ENTER to stop services and begin migration..." -r

START_TIME=$(date +%s)

# 1. Stop all services
log "4.1 Stopping all services..."
systemctl stop gaestefotos-backend.service &
systemctl stop gaestefotos-frontend.service &
systemctl stop gaestefotos-admin-dashboard.service &
systemctl stop gaestefotos-print-terminal.service &
systemctl stop gaestefotos-backend-staging.service &
systemctl stop gaestefotos-admin-dashboard-staging.service &
systemctl stop gaestefotos-frontend-staging.service &
wait

log "✅ All services stopped at: $(date)"

# 2. Reload systemd (picks up new unit files)
log "4.2 Reloading systemd daemon..."
systemctl daemon-reload

# 3. Start services (parallel for speed!)
log "4.3 Starting services with new configuration..."
systemctl start gaestefotos-backend.service &
PID_BACKEND=$!
systemctl start gaestefotos-frontend.service &
PID_FRONTEND=$!
systemctl start gaestefotos-admin-dashboard.service &
PID_ADMIN=$!
systemctl start gaestefotos-print-terminal.service &
PID_PRINT=$!
systemctl start gaestefotos-backend-staging.service &
PID_BACKEND_STAGING=$!
systemctl start gaestefotos-admin-dashboard-staging.service &
PID_ADMIN_STAGING=$!
systemctl start gaestefotos-frontend-staging.service &
PID_FRONTEND_STAGING=$!

wait

log "✅ All services started at: $(date)"

# 4. Wait for services to initialize
log "4.4 Waiting 10 seconds for services to boot..."
sleep 10

# 5. Check service status
log "4.5 Checking service status..."
SUCCESS=0
FAILED=0

check_service() {
    local SERVICE=$1
    if systemctl is-active --quiet "$SERVICE"; then
        log "  ✅ $SERVICE is running"
        ((SUCCESS++))
    else
        error "  ❌ $SERVICE FAILED"
        ((FAILED++))
    fi
}

check_service "gaestefotos-backend.service"
check_service "gaestefotos-frontend.service"
check_service "gaestefotos-admin-dashboard.service"
check_service "gaestefotos-print-terminal.service"
check_service "gaestefotos-backend-staging.service"
check_service "gaestefotos-admin-dashboard-staging.service"
check_service "gaestefotos-frontend-staging.service"

# 6. HTTP Health Checks
log "4.6 Running HTTP health checks..."

check_http() {
    local URL=$1
    local NAME=$2
    if curl -f -s -m 5 "$URL" > /dev/null 2>&1; then
        log "  ✅ $NAME ($URL) is responding"
        return 0
    else
        warn "  ⚠️  $NAME ($URL) not responding yet"
        return 1
    fi
}

HTTP_SUCCESS=0
check_http "http://localhost:8001/api/health" "Backend API" && ((HTTP_SUCCESS++)) || true
check_http "http://localhost:3000" "Frontend" && ((HTTP_SUCCESS++)) || true
check_http "http://localhost:3001" "Admin Dashboard" && ((HTTP_SUCCESS++)) || true
check_http "http://localhost:3002" "Print Terminal" && ((HTTP_SUCCESS++)) || true

# 7. Summary
END_TIME=$(date +%s)
DOWNTIME=$((END_TIME - START_TIME))

log ""
log "=== PHASE 4 COMPLETE ==="
log "✅ Services started: $SUCCESS/7"
log "❌ Services failed: $FAILED/7"
log "✅ HTTP checks passed: $HTTP_SUCCESS/4"
log "⏱️  Total downtime: ${DOWNTIME}s"
log ""
warn "⚠️  DOWNTIME WINDOW ENDED AT: $(date)"
log ""

if [ $FAILED -gt 0 ]; then
    error "❌ MIGRATION FAILED - Some services did not start!"
    log "Run rollback script immediately: ./migration-rollback.sh"
    exit 1
fi

if [ $HTTP_SUCCESS -lt 3 ]; then
    warn "⚠️  WARNING: Some HTTP health checks failed"
    log "Check logs: journalctl -u gaestefotos-* -n 100"
    log "If services don't recover in 2 minutes, run: ./migration-rollback.sh"
fi

log "✅ MIGRATION SUCCESSFUL!"
log ""
log "NEXT STEPS:"
log "1. Monitor logs: journalctl -fu gaestefotos-backend.service"
log "2. Test critical functions (login, upload, etc.)"
log "3. Run Phase 5: ./migration-phase5-postmigration.sh"
log "4. If anything breaks: ./migration-rollback.sh"
