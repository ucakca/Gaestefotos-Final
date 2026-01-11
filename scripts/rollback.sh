#!/usr/bin/env bash
#
# Git Rollback Script for gästefotos.com
# 
# Usage:
#   ./rollback.sh                    # Rollback to previous commit (HEAD~1)
#   ./rollback.sh <commit-hash>      # Rollback to specific commit
#   ./rollback.sh --list             # List last 10 commits
#   ./rollback.sh --status           # Show current deployment status
#
# This script performs a safe rollback:
# 1. Stops all services
# 2. Saves current commit hash for potential recovery
# 3. Resets to target commit
# 4. Rebuilds all packages
# 5. Applies database migrations (if any)
# 6. Starts all services
# 7. Runs smoke tests
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Service configuration (defaults for production)
BACKEND_SERVICE="${BACKEND_SERVICE:-gaestefotos-backend.service}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-gaestefotos-frontend.service}"
DASH_SERVICE="${DASH_SERVICE:-gaestefotos-admin-dashboard.service}"

# Staging overrides
if [[ "${STAGING:-}" == "true" ]]; then
  BACKEND_SERVICE="${BACKEND_SERVICE:-gaestefotos-backend-staging.service}"
  FRONTEND_SERVICE="${FRONTEND_SERVICE:-gaestefotos-frontend-staging.service}"
  DASH_SERVICE="${DASH_SERVICE:-gaestefotos-admin-dashboard-staging.service}"
fi

# Rollback history file
ROLLBACK_HISTORY="$REPO_ROOT/.rollback-history"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Check for root/sudo
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    log_error "Must be root or have sudo available to manage systemd services."
    exit 1
  fi
fi

# Check requirements
check_requirements() {
  if ! command -v systemctl >/dev/null 2>&1; then
    log_error "systemctl not found. This script is intended for systemd-based deployments."
    exit 1
  fi
  if ! command -v pnpm >/dev/null 2>&1; then
    log_error "pnpm not found."
    exit 1
  fi
  if ! command -v git >/dev/null 2>&1; then
    log_error "git not found."
    exit 1
  fi
}

# List recent commits
list_commits() {
  log_info "Last 10 commits:"
  echo ""
  cd "$REPO_ROOT"
  git log --oneline -10 --decorate
  echo ""
  log_info "Current HEAD: $(git rev-parse HEAD)"
}

# Show deployment status
show_status() {
  log_info "Deployment Status"
  echo ""
  echo "Current commit: $(git -C "$REPO_ROOT" rev-parse HEAD)"
  echo "Current branch: $(git -C "$REPO_ROOT" branch --show-current)"
  echo ""
  echo "Services:"
  $SUDO systemctl --no-pager status "$BACKEND_SERVICE" 2>/dev/null | head -3 || echo "  Backend: not running"
  $SUDO systemctl --no-pager status "$FRONTEND_SERVICE" 2>/dev/null | head -3 || echo "  Frontend: not running"
  $SUDO systemctl --no-pager status "$DASH_SERVICE" 2>/dev/null | head -3 || echo "  Dashboard: not running"
  echo ""
  if [ -f "$ROLLBACK_HISTORY" ]; then
    echo "Last rollback: $(tail -1 "$ROLLBACK_HISTORY")"
  fi
}

# Stop all services
stop_services() {
  log_info "Stopping services..."
  $SUDO systemctl stop "$BACKEND_SERVICE" 2>/dev/null || true
  $SUDO systemctl stop "$FRONTEND_SERVICE" 2>/dev/null || true
  $SUDO systemctl stop "$DASH_SERVICE" 2>/dev/null || true
}

# Start all services
start_services() {
  log_info "Starting services..."
  $SUDO systemctl start "$BACKEND_SERVICE"
  $SUDO systemctl start "$FRONTEND_SERVICE"
  $SUDO systemctl start "$DASH_SERVICE"
}

# Wait for HTTP endpoint
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

# Build all packages
build_packages() {
  log_info "Building packages..."
  cd "$REPO_ROOT"
  pnpm --filter @gaestefotos/shared build
  pnpm --filter @gaestefotos/backend build
  pnpm --filter @gaestefotos/admin-dashboard build
  pnpm --filter @gaestefotos/frontend build
}

# Apply database migrations
apply_migrations() {
  log_info "Applying database migrations..."
  cd "$REPO_ROOT/packages/backend"
  pnpm exec prisma migrate deploy --schema prisma/schema.prisma
}

# Perform rollback
do_rollback() {
  local target_commit="$1"
  local current_commit
  
  cd "$REPO_ROOT"
  current_commit=$(git rev-parse HEAD)
  
  # Verify target commit exists
  if ! git cat-file -t "$target_commit" >/dev/null 2>&1; then
    log_error "Commit '$target_commit' not found"
    exit 1
  fi
  
  # Resolve to full hash
  target_commit=$(git rev-parse "$target_commit")
  
  if [ "$current_commit" == "$target_commit" ]; then
    log_warn "Already at target commit: $target_commit"
    exit 0
  fi
  
  log_info "Rolling back from $current_commit to $target_commit"
  
  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD --; then
    log_error "Uncommitted changes detected. Please commit or stash them first."
    exit 1
  fi
  
  # Save current state for recovery
  echo "$(date -Iseconds) | $current_commit -> $target_commit" >> "$ROLLBACK_HISTORY"
  
  # Stop services
  stop_services
  STOPPED=1
  
  # Reset to target commit
  log_info "Resetting to commit $target_commit..."
  git reset --hard "$target_commit"
  
  # Reinstall dependencies (in case package.json changed)
  log_info "Installing dependencies..."
  pnpm install --frozen-lockfile || pnpm install
  
  # Generate Prisma client
  log_info "Generating Prisma client..."
  cd "$REPO_ROOT/packages/backend"
  pnpm exec prisma generate
  
  # Apply migrations
  apply_migrations
  
  # Build packages
  build_packages
  
  # Start services
  start_services
  STOPPED=0
  
  # Wait for services
  log_info "Waiting for services to become ready..."
  if wait_http "http://127.0.0.1:8100/api/health" 40 2; then
    log_info "Backend is ready"
  else
    log_warn "Backend may not be ready"
  fi
  
  if wait_http "http://127.0.0.1:3000/" 40 2; then
    log_info "Frontend is ready"
  else
    log_warn "Frontend may not be ready"
  fi
  
  log_info "Rollback complete!"
  log_info "Rolled back from $current_commit to $target_commit"
}

# Error handler
STOPPED=0
on_error() {
  if [ "$STOPPED" -eq 1 ]; then
    log_error "Rollback failed. Attempting to restart services..."
    $SUDO systemctl start "$BACKEND_SERVICE" || true
    $SUDO systemctl start "$FRONTEND_SERVICE" || true
    $SUDO systemctl start "$DASH_SERVICE" || true
  fi
}
trap on_error ERR

# Main
check_requirements

case "${1:-}" in
  --list|-l)
    list_commits
    ;;
  --status|-s)
    show_status
    ;;
  --help|-h)
    echo "Usage: $0 [commit-hash|--list|--status|--help]"
    echo ""
    echo "Options:"
    echo "  <commit-hash>  Rollback to specific commit"
    echo "  --list, -l     List last 10 commits"
    echo "  --status, -s   Show current deployment status"
    echo "  --help, -h     Show this help"
    echo ""
    echo "Environment variables:"
    echo "  STAGING=true   Use staging service names"
    echo ""
    echo "Examples:"
    echo "  $0                    # Rollback to previous commit (HEAD~1)"
    echo "  $0 abc123             # Rollback to commit abc123"
    echo "  STAGING=true $0       # Rollback staging environment"
    ;;
  "")
    # No argument = rollback to HEAD~1
    log_info "No commit specified, rolling back to HEAD~1"
    do_rollback "HEAD~1"
    ;;
  *)
    do_rollback "$1"
    ;;
esac
