#!/usr/bin/env bash
set -euo pipefail

BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-gaestefotos-backend-staging.service}"
DASH_SERVICE_NAME="${DASH_SERVICE_NAME:-gaestefotos-admin-dashboard-staging.service}"

STAGING_ENV_FILE_BACKEND="${STAGING_ENV_FILE_BACKEND:-/root/gaestefotos-app-v2/packages/backend/.env.staging}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v systemctl >/dev/null 2>&1; then
  echo "ERROR: systemctl not found. This script is intended for systemd-based staging deploys." >&2
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
    echo "ERROR: Staging deploy failed. Attempting to start services again..." >&2
    $SUDO systemctl start "$BACKEND_SERVICE_NAME" || true
    $SUDO systemctl start "$DASH_SERVICE_NAME" || true
    echo "Backend status:" >&2
    $SUDO systemctl --no-pager --full status "$BACKEND_SERVICE_NAME" || true
    echo "Dashboard status:" >&2
    $SUDO systemctl --no-pager --full status "$DASH_SERVICE_NAME" || true
  fi
}
trap on_error ERR

echo "Deploying staging using mandatory order: stop → migrate → build → start → smoke"
echo "Backend:  $BACKEND_SERVICE_NAME"
echo "Dash:     $DASH_SERVICE_NAME"
echo "Repo:     $REPO_ROOT"
echo ""

echo "1/5 Stopping staging services..."
$SUDO systemctl stop "$BACKEND_SERVICE_NAME" || true
$SUDO systemctl stop "$DASH_SERVICE_NAME" || true
STOPPED=1

echo "2/5 Applying Prisma migrations on staging DB..."
if [ ! -f "$STAGING_ENV_FILE_BACKEND" ]; then
  echo "ERROR: staging env file missing: $STAGING_ENV_FILE_BACKEND" >&2
  exit 1
fi

DATABASE_URL_STAGING="$(ENV_FILE="$STAGING_ENV_FILE_BACKEND" python3 - <<'PY'
import os
from pathlib import Path

env_file = os.environ.get('ENV_FILE')
raw = Path(env_file).read_text(encoding='utf-8', errors='ignore').splitlines()
db_url = None
for line in raw:
    s = line.strip()
    if not s or s.startswith('#'):
        continue
    if s.startswith('DATABASE_URL='):
        db_url = s.split('=', 1)[1]
        break
if not db_url:
    raise SystemExit('DATABASE_URL missing in env file')
print(db_url)
PY
)"

(cd "$REPO_ROOT/packages/backend" && DATABASE_URL="$DATABASE_URL_STAGING" pnpm exec prisma migrate deploy --schema prisma/schema.prisma)

echo "3/5 Building packages..."
# Keep build scope minimal but safe.
pnpm --filter @gaestefotos/shared build
pnpm --filter @gaestefotos/backend build
pnpm --filter @gaestefotos/admin-dashboard build

echo "4/5 Starting staging services..."
$SUDO systemctl start "$BACKEND_SERVICE_NAME"
$SUDO systemctl start "$DASH_SERVICE_NAME"
STOPPED=0

wait_http() {
  local url="$1"
  local tries="${2:-30}"
  local sleep_s="${3:-2}"
  local i=1
  while [ "$i" -le "$tries" ]; do
    if curl -sS -m 2 -o /dev/null "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_s"
    i=$((i+1))
  done
  return 1
}

echo "Waiting for services to become ready..."
wait_http "http://127.0.0.1:8101/api/health" 40 2
wait_http "http://127.0.0.1:3101/" 40 2

echo "5/5 Smoke checks (staging URLs)..."
APP_URL="${APP_URL:-https://staging.app.xn--gstefotos-v2a.com}"
DASH_URL="${DASH_URL:-https://staging.dash.xn--gstefotos-v2a.com}"
APP_URL="$APP_URL" DASH_URL="$DASH_URL" bash "$REPO_ROOT/scripts/prelaunch-smoke.sh"

echo ""
echo "Done."
