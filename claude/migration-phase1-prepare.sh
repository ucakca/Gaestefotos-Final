#!/bin/bash
################################################################################
# Phase 1: PREPARATION (NO DOWNTIME)
# Creates user, copies app, sets permissions, installs dependencies
# Estimated time: 5-7 minutes
################################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

log "=== PHASE 1: PREPARATION ==="

# 1. Create system user
log "1.1 Creating gaestefotos system user..."
if id -u gaestefotos >/dev/null 2>&1; then
    warn "User gaestefotos already exists, skipping..."
else
    useradd --system \
      --shell /usr/sbin/nologin \
      --home-dir /opt/gaestefotos \
      --create-home \
      --comment "Gaestefotos SaaS Application User" \
      gaestefotos
    log "✅ User created"
fi

# 2. Add to ClamAV group
log "1.2 Adding to ClamAV group..."
usermod -aG clamav gaestefotos

# 3. Test ClamAV access
log "1.3 Testing ClamAV socket access..."
if su -s /bin/bash gaestefotos -c "test -r /var/run/clamav/clamd.ctl"; then
    log "✅ ClamAV socket accessible"
else
    error "ClamAV socket not accessible! Check permissions."
fi

# 4. Create directories
log "1.4 Creating directories..."
mkdir -p /opt/gaestefotos/app
mkdir -p /opt/gaestefotos/logs

# 5. Copy application (preserves symlinks!)
log "1.5 Copying application (3 GB, ~2 minutes)..."
if [ -d /opt/gaestefotos/app/packages ]; then
    warn "App already exists in /opt/gaestefotos/app, skipping copy..."
else
    time rsync -aH --info=progress2 \
      /root/gaestefotos-app-v2/ \
      /opt/gaestefotos/app/
    log "✅ App copied"
fi

# 6. Set ownership
log "1.6 Setting ownership..."
chown -R gaestefotos:gaestefotos /opt/gaestefotos/

# 7. Secure sensitive files
log "1.7 Securing sensitive files..."
chmod 600 /opt/gaestefotos/app/packages/backend/.env
chmod 600 /opt/gaestefotos/app/packages/backend/.env.staging
chmod 600 /opt/gaestefotos/app/packages/frontend/.env.local
[ -f /opt/gaestefotos/app/packages/frontend/.env.staging ] && chmod 600 /opt/gaestefotos/app/packages/frontend/.env.staging
log "✅ Permissions set"

# 8. Ensure uploads directory is writable
log "1.8 Setting uploads permissions..."
chmod 755 /opt/gaestefotos/app/packages/backend/uploads
find /opt/gaestefotos/app/packages/backend/uploads -type d -exec chmod 755 {} \;

# 9. pnpm install as new user
log "1.9 Installing dependencies (pnpm install, ~3-5 minutes)..."
log "This creates a new pnpm store at /opt/gaestefotos/.local/share/pnpm/store"

su -s /bin/bash gaestefotos << 'EOFSU'
cd /opt/gaestefotos/app
export HOME=/opt/gaestefotos
/usr/bin/pnpm install --frozen-lockfile
EOFSU

log "✅ Dependencies installed"

# 10. Pre-build (saves time during service start)
log "1.10 Pre-building packages..."
su -s /bin/bash gaestefotos << 'EOFSU'
cd /opt/gaestefotos/app
export HOME=/opt/gaestefotos
/usr/bin/pnpm --filter @gaestefotos/shared build
/usr/bin/pnpm --filter @gaestefotos/backend exec prisma generate
/usr/bin/pnpm --filter @gaestefotos/backend build
/usr/bin/pnpm --filter @gaestefotos/frontend build
/usr/bin/pnpm --filter @gaestefotos/admin-dashboard build
/usr/bin/pnpm --filter @gaestefotos/print-terminal build
EOFSU

log "✅ Pre-build complete"

# 11. Verify
log "1.11 Verification..."
ls -la /opt/gaestefotos/app/packages/backend/dist/ | head -5
ls -la /opt/gaestefotos/app/packages/frontend/.next/ | head -5

log ""
log "=== PHASE 1 COMPLETE ==="
log "✅ User created: gaestefotos"
log "✅ App copied to: /opt/gaestefotos/app"
log "✅ Dependencies installed"
log "✅ Pre-build complete"
log ""
log "NEXT STEP: Run migration-phase2-systemd.sh"
