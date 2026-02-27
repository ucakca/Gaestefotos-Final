#!/bin/bash
# ─── Backend Deploy Script ─────────────────────────────────────────────────
# Full build pipeline: type-check → compile → sync src+dist+prisma → restart
#
# Usage:
#   ./deploy.sh              # Full deploy (build + sync + restart + verify)
#   ./deploy.sh --build      # Only compile (no deploy)
#   ./deploy.sh --sync       # Only sync + restart (skip compile)
#   ./deploy.sh --check      # Only type-check (no build/deploy)
#   ./deploy.sh --status     # Show sync status between repo and production
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROD_BACKEND="/opt/gaestefotos/app/packages/backend"
PROD_DASHBOARD="/opt/gaestefotos/app/packages/admin-dashboard"
SERVICE_BACKEND="gaestefotos-backend"
SERVICE_DASHBOARD="gaestefotos-admin-dashboard"
HEALTH_URL="http://localhost:8001/api/health"

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*" >&2; }
info() { echo -e "${BLUE}[deploy]${NC} $*"; }

# ─── Type Check ────────────────────────────────────────────────────────────
do_check() {
  log "Type-checking TypeScript..."
  cd "$SCRIPT_DIR"
  ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
  if [ "$ERRORS" -gt 0 ]; then
    err "TypeScript has $ERRORS error(s):"
    npx tsc --noEmit 2>&1 | grep "error TS" | head -20
    return 1
  fi
  log "Type-check OK ✓"
}

# ─── Build ─────────────────────────────────────────────────────────────────
do_build() {
  do_check || exit 1
  log "Compiling TypeScript src/ → dist/..."
  cd "$SCRIPT_DIR"
  npx tsc
  local js_count
  js_count=$(find dist -name '*.js' | wc -l)
  log "Build OK — $js_count JS files in dist/"
}

# ─── Sync to Production ───────────────────────────────────────────────────
do_sync() {
  [ ! -d "$PROD_BACKEND" ] && err "Production path $PROD_BACKEND not found" && exit 1

  log "Syncing to production..."

  # 1. Sync src/ (needed for future tsc runs in production)
  rsync -a --delete \
    --exclude='node_modules' \
    --exclude='__tests__' \
    "$SCRIPT_DIR/src/" "$PROD_BACKEND/src/"
  info "  src/ synced"

  # 2. Sync dist/ (compiled JS — what actually runs)
  rsync -a --delete "$SCRIPT_DIR/dist/" "$PROD_BACKEND/dist/"
  info "  dist/ synced"

  # 3. Sync prisma schema (if changed)
  if ! diff -q "$SCRIPT_DIR/prisma/schema.prisma" "$PROD_BACKEND/prisma/schema.prisma" > /dev/null 2>&1; then
    cp "$SCRIPT_DIR/prisma/schema.prisma" "$PROD_BACKEND/prisma/schema.prisma"
    warn "  prisma/schema.prisma changed — regenerating client..."
    cd "$PROD_BACKEND" && npx prisma generate 2>&1 | tail -3
    info "  Prisma client regenerated"
  else
    info "  prisma/schema.prisma unchanged"
  fi

  # 4. Fix ownership
  chown -R gaestefotos:gaestefotos "$PROD_BACKEND/src/" "$PROD_BACKEND/dist/"
  log "Sync complete"
}

# ─── Restart Backend ───────────────────────────────────────────────────────
do_restart() {
  log "Restarting $SERVICE_BACKEND..."
  systemctl restart "$SERVICE_BACKEND"
  sleep 3
  if systemctl is-active --quiet "$SERVICE_BACKEND"; then
    log "Service running ✓"
  else
    err "Service failed to start!"
    journalctl -u "$SERVICE_BACKEND" --since "15 sec ago" --no-pager | tail -15
    exit 1
  fi
}

# ─── Health Verify ─────────────────────────────────────────────────────────
do_verify() {
  log "Verifying health endpoint..."
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    log "Health check passed ✓ (HTTP $code)"
  else
    err "Health check FAILED (HTTP $code)"
    warn "Check logs: journalctl -u $SERVICE_BACKEND -f"
    exit 1
  fi
}

# ─── Status: show diff between repo and production ─────────────────────────
do_status() {
  info "Comparing repo ↔ production..."
  local diffs=0
  local missing_prod=0

  # Check backend src files
  for f in $(find "$SCRIPT_DIR/src" -name '*.ts' ! -path '*__tests__*' | sed "s|$SCRIPT_DIR/src/||" | sort); do
    local repo_f="$SCRIPT_DIR/src/$f"
    local prod_f="$PROD_BACKEND/src/$f"
    if [ ! -f "$prod_f" ]; then
      echo -e "  ${RED}✗ MISSING${NC}  src/$f"
      missing_prod=$((missing_prod+1))
    elif ! diff -q "$repo_f" "$prod_f" > /dev/null 2>&1; then
      local lines
      lines=$(diff "$repo_f" "$prod_f" | grep "^[<>]" | wc -l)
      echo -e "  ${YELLOW}⚠ DIFF${NC}     src/$f ($lines lines)"
      diffs=$((diffs+1))
    fi
  done

  # Check prisma schema
  if ! diff -q "$SCRIPT_DIR/prisma/schema.prisma" "$PROD_BACKEND/prisma/schema.prisma" > /dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠ DIFF${NC}     prisma/schema.prisma"
    diffs=$((diffs+1))
  fi

  if [ "$diffs" -eq 0 ] && [ "$missing_prod" -eq 0 ]; then
    log "All files in sync ✓"
  else
    warn "$diffs file(s) differ, $missing_prod file(s) missing in production"
    info "Run: ./deploy.sh  to sync everything"
  fi
}

# ─── Main ──────────────────────────────────────────────────────────────────
case "${1:-full}" in
  --check)  do_check ;;
  --build)  do_build ;;
  --sync)   do_sync; do_restart; do_verify ;;
  --status) do_status ;;
  full|*)
    log "═══ Full Backend Deploy ═══"
    do_build
    do_sync
    do_restart
    do_verify
    log "═══ Deploy complete! ═══"
    ;;
esac
