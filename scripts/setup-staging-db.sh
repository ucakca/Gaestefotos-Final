#!/usr/bin/env bash
#
# Setup Staging Database for gästefotos.com
#
# This script creates a separate staging database to ensure
# complete isolation between production and staging environments.
#
# Prerequisites:
# - PostgreSQL installed and running
# - gaestefotos user exists
#
# Usage:
#   ./setup-staging-db.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Database configuration
DB_USER="${DB_USER:-gaestefotos}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
STAGING_DB_NAME="${STAGING_DB_NAME:-gaestefotos_v2_staging}"
PROD_DB_NAME="${PROD_DB_NAME:-gaestefotos_v2}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Check if running as postgres or with sudo
check_postgres_access() {
  if [ "$(id -u)" -eq 0 ]; then
    return 0
  fi
  if command -v sudo >/dev/null 2>&1; then
    return 0
  fi
  log_error "Must be root or have sudo to manage PostgreSQL"
  exit 1
}

# Check if database exists
db_exists() {
  local db_name="$1"
  sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$db_name"
}

# Create staging database
create_staging_db() {
  log_info "Creating staging database: $STAGING_DB_NAME"
  
  if db_exists "$STAGING_DB_NAME"; then
    log_warn "Database $STAGING_DB_NAME already exists"
    return 0
  fi
  
  sudo -u postgres createdb -O "$DB_USER" "$STAGING_DB_NAME"
  log_info "Database $STAGING_DB_NAME created successfully"
}

# Apply migrations to staging database
apply_migrations() {
  log_info "Applying migrations to staging database..."
  
  local staging_env_file="$REPO_ROOT/packages/backend/.env.staging"
  
  if [ ! -f "$staging_env_file" ]; then
    log_error "Staging env file not found: $staging_env_file"
    exit 1
  fi
  
  # Extract DATABASE_URL from staging env file
  local staging_db_url
  staging_db_url=$(grep "^DATABASE_URL=" "$staging_env_file" | cut -d'=' -f2-)
  
  if [ -z "$staging_db_url" ]; then
    log_error "DATABASE_URL not found in $staging_env_file"
    exit 1
  fi
  
  log_info "Using DATABASE_URL: ${staging_db_url:0:50}..."
  
  cd "$REPO_ROOT/packages/backend"
  DATABASE_URL="$staging_db_url" pnpm exec prisma migrate deploy --schema prisma/schema.prisma
  
  log_info "Migrations applied successfully"
}

# Verify isolation
verify_isolation() {
  log_info "Verifying database isolation..."
  
  echo ""
  echo "Production database: $PROD_DB_NAME"
  echo "Staging database:    $STAGING_DB_NAME"
  echo ""
  
  if db_exists "$PROD_DB_NAME"; then
    log_info "✓ Production database exists"
  else
    log_warn "✗ Production database not found"
  fi
  
  if db_exists "$STAGING_DB_NAME"; then
    log_info "✓ Staging database exists"
  else
    log_warn "✗ Staging database not found"
  fi
  
  echo ""
  log_info "Environment files:"
  echo "  Production: packages/backend/.env (DATABASE_URL → $PROD_DB_NAME)"
  echo "  Staging:    packages/backend/.env.staging (DATABASE_URL → $STAGING_DB_NAME)"
}

# Main
main() {
  check_postgres_access
  
  case "${1:-setup}" in
    setup)
      create_staging_db
      apply_migrations
      verify_isolation
      ;;
    verify)
      verify_isolation
      ;;
    *)
      echo "Usage: $0 [setup|verify]"
      exit 1
      ;;
  esac
  
  log_info "Done!"
}

main "$@"
