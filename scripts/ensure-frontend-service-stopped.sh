#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-gaestefotos-frontend.service}"

# If systemctl isn't available (e.g. dev environment / containers), do nothing.
if ! command -v systemctl >/dev/null 2>&1; then
  exit 0
fi

# If the service doesn't exist on this machine, do nothing.
if ! systemctl list-unit-files --type=service --no-legend 2>/dev/null | awk '{print $1}' | grep -Fxq "$SERVICE_NAME"; then
  exit 0
fi

ACTIVE_STATE="$(systemctl is-active "$SERVICE_NAME" 2>/dev/null || true)"

if [ "$ACTIVE_STATE" = "active" ] || [ "$ACTIVE_STATE" = "activating" ]; then
  echo "ERROR: Refusing to build while $SERVICE_NAME is running (state: $ACTIVE_STATE)." >&2
  echo "Mandatory production deploy order: systemctl stop → pnpm build:prod → systemctl start" >&2
  echo "Use: bash ./scripts/deploy-frontend-prod.sh" >&2
  exit 1
fi
