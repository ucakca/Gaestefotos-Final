#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-gaestefotos-frontend.service}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

FRONTEND_DIR="$REPO_ROOT/packages/frontend"

if ! command -v systemctl >/dev/null 2>&1; then
  echo "ERROR: systemctl not found. This script is intended for systemd-based production deploys." >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERROR: pnpm not found." >&2
  exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "ERROR: frontend directory not found: $FRONTEND_DIR" >&2
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

echo "Deploying frontend (systemd) using mandatory order: stop → build:prod → start"
echo "Service: $SERVICE_NAME"
echo "Repo:    $REPO_ROOT"
echo ""

echo "1/3 Stopping service..."
$SUDO systemctl stop "$SERVICE_NAME"

echo "2/3 Building frontend (pnpm build:prod)..."
pnpm -C "$FRONTEND_DIR" build:prod

echo "3/3 Starting service..."
$SUDO systemctl start "$SERVICE_NAME"

echo ""
echo "Done. Service status:"
$SUDO systemctl --no-pager --full status "$SERVICE_NAME" || true
