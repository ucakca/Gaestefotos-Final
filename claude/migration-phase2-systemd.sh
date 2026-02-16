#!/bin/bash
################################################################################
# Phase 2: SYSTEMD UNITS (NO DOWNTIME)
# Backs up old units, creates new ones with security hardening
# Estimated time: 2 minutes
################################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

log "=== PHASE 2: SYSTEMD UNITS ==="

# 1. Backup old units
log "2.1 Backing up existing units..."
cd /etc/systemd/system
BACKUP_SUFFIX="root-backup-$(date +%Y%m%d_%H%M%S)"
for unit in gaestefotos-*.service; do
  [ -f "$unit" ] && cp "$unit" "$unit.$BACKUP_SUFFIX"
done
log "✅ Backed up to: /etc/systemd/system/*.$BACKUP_SUFFIX"

# 2. Create new units
log "2.2 Creating new systemd units..."

# 2.2.1 Backend Production
cat > /etc/systemd/system/gaestefotos-backend.service <<'EOF'
[Unit]
Description=Gästefotos V2 Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=gaestefotos
Group=gaestefotos
WorkingDirectory=/opt/gaestefotos/app

# Environment
Environment=NODE_ENV=production
Environment=HOME=/opt/gaestefotos
EnvironmentFile=/opt/gaestefotos/app/packages/backend/.env
Environment=WORDPRESS_URL=https://xn--gstefotos-v2a.com
Environment=CMS_ALLOWED_HOSTS=xn--gstefotos-v2a.com
Environment=CMS_MAX_HTML_BYTES=2097152
Environment="WORDPRESS_VERIFY_SECRET=:5%%4Dv-.3w&bULw~"
Environment=PORT=8001

# Security Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gaestefotos/app
ReadWritePaths=/tmp
PrivateTmp=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true

# Execution (no pre-build, already done in Phase 1)
ExecStart=/usr/bin/env PORT=8001 /usr/bin/pnpm --filter @gaestefotos/backend start

# Restart
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Resource Limits
MemoryMax=2G
TasksMax=512

[Install]
WantedBy=multi-user.target
EOF

# 2.2.2 Frontend Production
cat > /etc/systemd/system/gaestefotos-frontend.service <<'EOF'
[Unit]
Description=Gästefotos V2 Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=gaestefotos
Group=gaestefotos
WorkingDirectory=/opt/gaestefotos/app/packages/frontend

# Environment
Environment=NODE_ENV=production
Environment=HOME=/opt/gaestefotos
EnvironmentFile=/opt/gaestefotos/app/packages/frontend/.env.local

# Security Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gaestefotos/app
ReadWritePaths=/tmp
PrivateTmp=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true

# Execution
ExecStart=/usr/bin/pnpm --filter @gaestefotos/frontend start

# Restart
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Resource Limits
MemoryMax=2G
TasksMax=512

[Install]
WantedBy=multi-user.target
EOF

# 2.2.3 Admin Dashboard Production
cat > /etc/systemd/system/gaestefotos-admin-dashboard.service <<'EOF'
[Unit]
Description=Gästefotos Admin Dashboard (Next.js)
After=network.target

[Service]
Type=simple
User=gaestefotos
Group=gaestefotos
WorkingDirectory=/opt/gaestefotos/app/packages/admin-dashboard

# Environment
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=HOME=/opt/gaestefotos
Environment=NEXT_DIST_DIR=.next
Environment=NEXT_PUBLIC_API_URL=https://app.gästefotos.com/api

# Security Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gaestefotos/app
ReadWritePaths=/tmp
PrivateTmp=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true

# Execution
ExecStart=/usr/bin/pnpm --filter @gaestefotos/admin-dashboard start

# Restart
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Resource Limits
MemoryMax=2G
TasksMax=512

[Install]
WantedBy=multi-user.target
EOF

# 2.2.4 Print Terminal Production
cat > /etc/systemd/system/gaestefotos-print-terminal.service <<'EOF'
[Unit]
Description=Gästefotos Print Terminal (Next.js)
After=network.target

[Service]
Type=simple
User=gaestefotos
Group=gaestefotos
WorkingDirectory=/opt/gaestefotos/app/packages/print-terminal

# Environment
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=HOME=/opt/gaestefotos
Environment=NEXT_PUBLIC_API_URL=https://app.xn--gstefotos-v2a.com

# Security Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gaestefotos/app
ReadWritePaths=/tmp
PrivateTmp=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true

# Execution
ExecStart=/usr/bin/pnpm --filter @gaestefotos/print-terminal start

# Restart
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Resource Limits
MemoryMax=2G
TasksMax=512

[Install]
WantedBy=multi-user.target
EOF

# 2.2.5 Backend Staging
cat > /etc/systemd/system/gaestefotos-backend-staging.service <<'EOF'
[Unit]
Description=Gästefotos V2 Backend API (Staging)
After=network.target postgresql.service

[Service]
Type=simple
User=gaestefotos
Group=gaestefotos
WorkingDirectory=/opt/gaestefotos/app

# Environment
Environment=NODE_ENV=production
Environment=HOME=/opt/gaestefotos
EnvironmentFile=/opt/gaestefotos/app/packages/backend/.env.staging
Environment=WORDPRESS_URL=https://xn--gstefotos-v2a.com
Environment=CMS_ALLOWED_HOSTS=xn--gstefotos-v2a.com
Environment=CMS_MAX_HTML_BYTES=2097152
Environment="WORDPRESS_VERIFY_SECRET=:5%%4Dv-.3w&bULw~"
Environment=PORT=8101

# Security Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gaestefotos/app
ReadWritePaths=/tmp
PrivateTmp=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true

# Execution
ExecStart=/usr/bin/env PORT=8101 /usr/bin/pnpm --filter @gaestefotos/backend start

# Restart
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Resource Limits
MemoryMax=2G
TasksMax=512

[Install]
WantedBy=multi-user.target
EOF

# 2.2.6 Admin Dashboard Staging
cat > /etc/systemd/system/gaestefotos-admin-dashboard-staging.service <<'EOF'
[Unit]
Description=Gästefotos Admin Dashboard (Staging)
After=network.target

[Service]
Type=simple
User=gaestefotos
Group=gaestefotos
WorkingDirectory=/opt/gaestefotos/app/packages/admin-dashboard

# Environment
Environment=NODE_ENV=production
Environment=PORT=3101
Environment=HOME=/opt/gaestefotos
Environment=NEXT_DIST_DIR=.next
Environment=NEXT_PUBLIC_API_URL=https://app.gästefotos.com/api

# Security Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gaestefotos/app
ReadWritePaths=/tmp
PrivateTmp=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true

# Execution
ExecStart=/usr/bin/pnpm --filter @gaestefotos/admin-dashboard start

# Restart
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Resource Limits
MemoryMax=2G
TasksMax=512

[Install]
WantedBy=multi-user.target
EOF

# 2.2.7 Frontend Staging
cat > /etc/systemd/system/gaestefotos-frontend-staging.service <<'EOF'
[Unit]
Description=Gästefotos V2 Frontend (Next.js) - Staging
After=network.target

[Service]
Type=simple
User=gaestefotos
Group=gaestefotos
WorkingDirectory=/opt/gaestefotos/app/packages/frontend

# Environment
Environment=NODE_ENV=production
Environment=PORT=3100
Environment=HOME=/opt/gaestefotos
EnvironmentFile=/opt/gaestefotos/app/packages/frontend/.env.staging

# Security Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gaestefotos/app
ReadWritePaths=/tmp
PrivateTmp=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true

# Execution
ExecStart=/usr/bin/pnpm --filter @gaestefotos/frontend start

# Restart
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Resource Limits
MemoryMax=2G
TasksMax=512

[Install]
WantedBy=multi-user.target
EOF

log "✅ All 7 service units created"

# 3. Verify syntax
log "2.3 Verifying systemd syntax..."
for unit in gaestefotos-*.service; do
  systemd-analyze verify "$unit" 2>&1 | grep -v "Failed to create" || true
done

log ""
log "=== PHASE 2 COMPLETE ==="
log "✅ Old units backed up with suffix: .$BACKUP_SUFFIX"
log "✅ New units created with:"
log "   - User: gaestefotos"
log "   - WorkingDirectory: /opt/gaestefotos/app"
log "   - Security hardening enabled"
log "   - Fixed hardcoded node_modules paths"
log "   - No ExecStartPre (pre-built in Phase 1)"
log ""
log "NEXT STEP: Run migration-phase3-backup.sh"
