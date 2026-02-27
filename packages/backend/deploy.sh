#!/bin/bash
# ─── Backend Deploy Script ─────────────────────────────────────────────────
# Compiles TypeScript src/ → dist/, syncs to production, restarts service.
#
# Usage:
#   ./deploy.sh          # Full: compile + sync + restart
#   ./deploy.sh --build  # Only compile (no deploy)
#   ./deploy.sh --sync   # Only sync dist/ to prod + restart (skip compile)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROD_BACKEND="/opt/gaestefotos/app/packages/backend"
SERVICE_NAME="gaestefotos-backend"

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*" >&2; }

do_build() {
  log "Compiling TypeScript..."
  cd "$SCRIPT_DIR"
  npx tsc 2>&1
  ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
  if [ "$ERRORS" -gt 0 ]; then
    err "TypeScript has $ERRORS error(s). Aborting."
    npx tsc --noEmit 2>&1 | grep "error TS" | head -20
    exit 1
  fi
  log "Build OK — $(find dist -name '*.js' | wc -l) JS files"
}

do_sync() {
  [ ! -d "$PROD_BACKEND" ] && err "Prod path missing" && exit 1
  log "Syncing dist/ → production..."
  rsync -a --delete "$SCRIPT_DIR/dist/" "$PROD_BACKEND/dist/"
  chown -R gaestefotos:gaestefotos "$PROD_BACKEND/dist/"
  log "Sync done"
}

do_restart() {
  log "Restarting $SERVICE_NAME..."
  systemctl restart "$SERVICE_NAME"
  sleep 2
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    log "Service running ✓"
  else
    err "Service failed!"
    journalctl -u "$SERVICE_NAME" --since "10 sec ago" --no-pager | tail -10
    exit 1
  fi
}

case "${1:-full}" in
  --build) do_build ;;
  --sync)  do_sync; do_restart ;;
  *)       do_build; do_sync; do_restart; log "Deploy complete!" ;;
esac
