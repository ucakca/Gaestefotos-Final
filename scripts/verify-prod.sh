#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-https://app.xn--gstefotos-v2a.com}"
ENV_FILE="${ENV_FILE:-/root/gaestefotos-app-v2/packages/backend/.env}"

color() {
  local code="$1"; shift
  printf "\033[%sm%s\033[0m" "$code" "$*"
}

headline() {
  echo
  echo "==== $* ===="
}

ok() { echo "$(color 32 OK)   $*"; }
fail() { echo "$(color 31 FAIL) $*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Missing required command: $1"
    exit 1
  fi
}

require_cmd curl
require_cmd psql

if [[ ! -f "$ENV_FILE" ]]; then
  fail "ENV_FILE not found: $ENV_FILE"
  exit 1
fi

DB_URL=$(grep -E '^DATABASE_URL=' -m1 "$ENV_FILE" | sed -E 's/^DATABASE_URL=//')
if [[ -z "$DB_URL" ]]; then
  fail "DATABASE_URL not found in $ENV_FILE"
  exit 1
fi

headline "Environment"
echo "APP_URL=$APP_URL"
echo "ENV_FILE=$ENV_FILE"
echo -n "DATABASE_URL="
echo "$DB_URL" | sed -E 's#(postgresql://)[^@]+@#\1***@#'

db_query() {
  psql "$DB_URL" -v ON_ERROR_STOP=1 -Atc "$1"
}

headline "API Health"
CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$APP_URL/api/health" || true)
if [[ "$CODE" == "200" ]]; then
  ok "$APP_URL/api/health (HTTP $CODE)"
else
  fail "$APP_URL/api/health (HTTP $CODE)"
  exit 1
fi

headline "DB Connectivity"
if db_query "select 1" >/dev/null; then
  ok "psql connection ok"
else
  fail "psql connection failed"
  exit 1
fi

headline "DB Schema: invitation_templates columns"
COLS=$(db_query "select column_name from information_schema.columns where table_schema='public' and table_name='invitation_templates' order by ordinal_position;")
for c in id name config isActive createdAt updatedAt slug title description html text; do
  if echo "$COLS" | grep -qx "$c"; then
    ok "invitation_templates.$c"
  else
    fail "invitation_templates.$c missing"
    exit 1
  fi
done

headline "DB Schema: legacy nullability check"
NAME_NULLABLE=$(db_query "select is_nullable from information_schema.columns where table_schema='public' and table_name='invitation_templates' and column_name='name';")
if [[ "$NAME_NULLABLE" == "YES" ]]; then
  ok "invitation_templates.name is nullable"
else
  fail "invitation_templates.name is NOT NULL (will break Prisma create)"
  exit 1
fi

headline "DB Schema: impersonation_audit_logs table"
HAS_AUDIT=$(db_query "select count(*) from pg_tables where schemaname='public' and tablename='impersonation_audit_logs';")
if [[ "$HAS_AUDIT" == "1" ]]; then
  ok "impersonation_audit_logs table exists"
else
  fail "impersonation_audit_logs table missing"
  exit 1
fi

headline "DB Prisma migrations present"
for m in 20260108223600_invitation_templates_v2_columns 20260108223500_impersonation_audit_logs; do
  COUNT=$(db_query "select count(*) from _prisma_migrations where migration_name='${m}';")
  if [[ "$COUNT" == "1" ]]; then
    ok "$m"
  else
    fail "$m missing in _prisma_migrations"
    exit 1
  fi
done

echo
ok "verify-prod complete"
