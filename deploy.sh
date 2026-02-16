#!/bin/bash
# ─── gästefotos.com Deploy Script ───────────────────────────────────────────
# Synchronisiert Code von /root/gaestefotos-app-v2 → /opt/gaestefotos/app
# und startet die betroffenen Services neu.
#
# Usage:
#   ./deploy.sh              # Deploy all (backend + frontend + admin-dashboard)
#   ./deploy.sh backend      # Deploy only backend
#   ./deploy.sh frontend     # Deploy only frontend
#   ./deploy.sh admin        # Deploy only admin-dashboard
#   ./deploy.sh print        # Deploy only print-terminal
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SRC="/root/gaestefotos-app-v2"
DEST="/opt/gaestefotos/app"
USER="gaestefotos"
GROUP="gaestefotos"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err()  { echo -e "${RED}[error]${NC} $1"; exit 1; }

# ─── Sync source → dest (excludes heavy dirs that get rebuilt) ───
sync_code() {
  log "Syncing $SRC → $DEST ..."
  rsync -a --delete \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.pnpm-store' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='*.log' \
    "$SRC/" "$DEST/"

  # Fix ownership
  chown -R "$USER:$GROUP" "$DEST"
  chmod 600 "$DEST/packages/backend/.env" 2>/dev/null || true
  chmod 600 "$DEST/packages/backend/.env.staging" 2>/dev/null || true
  chmod 600 "$DEST/packages/frontend/.env.local" 2>/dev/null || true
  chmod 600 "$DEST/packages/frontend/.env.staging" 2>/dev/null || true
  log "Sync complete"

  log "Installing dependencies..."
  su -s /bin/bash -c "cd $DEST && CI=true /usr/bin/pnpm install 2>&1" "$USER"
  log "Generating Prisma client..."
  su -s /bin/bash -c "cd $DEST && /usr/bin/pnpm --filter @gaestefotos/backend exec prisma generate 2>&1" "$USER"
  log "Dependencies installed"
}

# ─── Build + restart a specific service ───
deploy_backend() {
  log "Building backend..."
  su -s /bin/bash -c "cd $DEST && /usr/bin/pnpm --filter @gaestefotos/shared build" "$USER"
  su -s /bin/bash -c "cd $DEST && /usr/bin/pnpm --filter @gaestefotos/backend exec prisma generate" "$USER"
  su -s /bin/bash -c "cd $DEST && /usr/bin/pnpm --filter @gaestefotos/backend build" "$USER"
  log "Restarting backend..."
  systemctl restart gaestefotos-backend.service
  sleep 3
  if systemctl is-active --quiet gaestefotos-backend.service; then
    log "Backend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8001/api/health)"
  else
    err "Backend failed to start! Check: journalctl -u gaestefotos-backend -n 30"
  fi
}

deploy_frontend() {
  log "Building frontend..."
  su -s /bin/bash -c "cd $DEST/packages/frontend && rm -rf .next && /usr/bin/pnpm run build" "$USER"
  log "Restarting frontend..."
  systemctl restart gaestefotos-frontend.service
  sleep 5
  if systemctl is-active --quiet gaestefotos-frontend.service; then
    log "Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000)"
  else
    err "Frontend failed to start! Check: journalctl -u gaestefotos-frontend -n 30"
  fi
}

deploy_admin() {
  log "Building admin-dashboard..."
  su -s /bin/bash -c "cd $DEST && /usr/bin/pnpm --filter @gaestefotos/shared build" "$USER"
  su -s /bin/bash -c "cd $DEST/packages/admin-dashboard && rm -rf .next && /usr/bin/pnpm run build" "$USER"
  log "Restarting admin-dashboard..."
  systemctl restart gaestefotos-admin-dashboard.service
  sleep 3
  if systemctl is-active --quiet gaestefotos-admin-dashboard.service; then
    log "Admin Dashboard: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001)"
  else
    err "Admin Dashboard failed to start! Check: journalctl -u gaestefotos-admin-dashboard -n 30"
  fi
}

deploy_print() {
  log "Building print-terminal..."
  su -s /bin/bash -c "cd $DEST/packages/print-terminal && rm -rf .next && /usr/bin/pnpm run build" "$USER"
  log "Restarting print-terminal..."
  systemctl restart gaestefotos-print-terminal.service
  sleep 3
  if systemctl is-active --quiet gaestefotos-print-terminal.service; then
    log "Print Terminal: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3002)"
  else
    err "Print Terminal failed to start! Check: journalctl -u gaestefotos-print-terminal -n 30"
  fi
}

# ─── Main ───
TARGET="${1:-all}"

log "Deploy target: $TARGET"
log "$(date '+%Y-%m-%d %H:%M:%S')"

sync_code

case "$TARGET" in
  backend)
    deploy_backend
    ;;
  frontend)
    deploy_frontend
    ;;
  admin|admin-dashboard)
    deploy_admin
    ;;
  print|print-terminal)
    deploy_print
    ;;
  all)
    deploy_backend
    deploy_admin
    deploy_frontend
    deploy_print
    ;;
  *)
    err "Unknown target: $TARGET (use: backend, frontend, admin, print, all)"
    ;;
esac

log "Deploy complete! 🚀"
