#!/usr/bin/env bash
set -euo pipefail

# Mandatory: backup → deploy prod services → smoke. Abort on smoke failure.

BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-/root/gaestefotos-app-v2/packages/backend/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gaestefotos/db}"
KEEP="${KEEP:-30}"

FRONTEND_SERVICE_NAME="${FRONTEND_SERVICE_NAME:-gaestefotos-frontend.service}"
DASH_SERVICE_NAME="${DASH_SERVICE_NAME:-gaestefotos-admin-dashboard.service}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-gaestefotos-backend.service}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v systemctl >/dev/null 2>&1; then
  echo "ERROR: systemctl not found. This script is intended for systemd-based production deploys." >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERROR: pnpm not found." >&2
  exit 1
fi

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    echo "ERROR: must be root or have sudo available to manage systemd services." >&2
    exit 1
  fi
fi

STOPPED=0
on_error() {
  if [ "$STOPPED" -eq 1 ]; then
    echo ""
    echo "ERROR: Promote failed. Attempting to start services again..." >&2
    $SUDO systemctl start "$BACKEND_SERVICE_NAME" || true
    $SUDO systemctl start "$FRONTEND_SERVICE_NAME" || true
    $SUDO systemctl start "$DASH_SERVICE_NAME" || true
    echo "Backend status:" >&2
    $SUDO systemctl --no-pager --full status "$BACKEND_SERVICE_NAME" || true
    echo "Frontend status:" >&2
    $SUDO systemctl --no-pager --full status "$FRONTEND_SERVICE_NAME" || true
    echo "Dashboard status:" >&2
    $SUDO systemctl --no-pager --full status "$DASH_SERVICE_NAME" || true
  fi
}
trap on_error ERR

echo "Promoting to production (single-server, systemd)"
echo "Repo: $REPO_ROOT"
echo ""

echo "1/4 DB backup (prod)..."
ENV_FILE="$BACKUP_ENV_FILE" BACKUP_DIR="$BACKUP_DIR" KEEP="$KEEP" bash "$REPO_ROOT/scripts/backup-db-prod.sh"

echo "2/4 Deploy services (prod)..."
# Order: frontend + dash first (Next.js asset consistency), then backend.
STOPPED=1
bash "$REPO_ROOT/scripts/deploy-frontend-prod.sh" "$FRONTEND_SERVICE_NAME"
bash "$REPO_ROOT/scripts/deploy-admin-dashboard-prod.sh" "$DASH_SERVICE_NAME"
bash "$REPO_ROOT/scripts/deploy-backend-prod.sh" "$BACKEND_SERVICE_NAME"
STOPPED=0

echo "3/4 Smoke checks (prod)..."
APP_URL="${APP_URL:-https://app.gästefotos.com}"
DASH_URL="${DASH_URL:-https://dash.xn--gstefotos-v2a.com}"
APP_URL="$APP_URL" DASH_URL="$DASH_URL" bash "$REPO_ROOT/scripts/prelaunch-smoke.sh"

echo "4/4 Done."
