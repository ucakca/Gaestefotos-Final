#!/bin/bash
# Install/update gästefotos systemd service files
# Run as root: sudo bash systemd/install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SYSTEMD_DIR="/etc/systemd/system"
USER="gaestefotos"
GROUP="gaestefotos"
APP_DIR="/opt/gaestefotos/app"
STORAGE_DIR="/opt/gaestefotos/storage"

echo "=== Gästefotos Systemd Service Installer ==="

# Create dedicated user if not exists
if ! id "$USER" &>/dev/null; then
  echo "Creating user $USER..."
  useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$USER"
fi

# Ensure directories exist with correct ownership
for dir in "$APP_DIR" "$STORAGE_DIR" "$APP_DIR/packages/backend/uploads" "$APP_DIR/packages/backend/tmp"; do
  mkdir -p "$dir"
  chown -R "$USER:$GROUP" "$dir"
done

# Copy service files
for svc in "$SCRIPT_DIR"/*.service; do
  name="$(basename "$svc")"
  echo "Installing $name..."
  cp "$svc" "$SYSTEMD_DIR/$name"
  chmod 644 "$SYSTEMD_DIR/$name"
done

# Reload systemd
systemctl daemon-reload

echo ""
echo "Services installed. Enable & start with:"
echo "  systemctl enable --now gaestefotos-backend"
echo "  systemctl enable --now gaestefotos-frontend"
echo "  systemctl enable --now gaestefotos-admin-dashboard"
echo "  systemctl enable --now gaestefotos-print-terminal"
echo ""
echo "Check status: systemctl status gaestefotos-backend"
echo "View logs:    journalctl -u gaestefotos-backend -f"
