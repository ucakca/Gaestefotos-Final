#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-gaestefotos-backend.service}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_DIR="$REPO_ROOT/packages/backend"

if ! command -v systemctl >/dev/null 2>&1; then
  echo "ERROR: systemctl not found. This script is intended for systemd-based production deploys." >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERROR: pnpm not found." >&2
  exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
  echo "ERROR: backend directory not found: $BACKEND_DIR" >&2
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
    echo "ERROR: Deploy failed. Attempting to start service again: $SERVICE_NAME" >&2
    $SUDO systemctl start "$SERVICE_NAME" || true
    echo "Service status:" >&2
    $SUDO systemctl --no-pager --full status "$SERVICE_NAME" || true
  fi
}
trap on_error ERR

echo "Deploying backend (systemd) using mandatory order: stop → build → start"
echo "Service: $SERVICE_NAME"
echo "Repo:    $REPO_ROOT"
echo ""

echo "1/3 Stopping service..."
$SUDO systemctl stop "$SERVICE_NAME"
STOPPED=1

echo "2/3 Building backend (pnpm build)..."
pnpm -C "$BACKEND_DIR" build

echo "3/3 Starting service..."
$SUDO systemctl start "$SERVICE_NAME"
STOPPED=0

echo ""
echo "Done. Service status:"
$SUDO systemctl --no-pager --full status "$SERVICE_NAME" || true
