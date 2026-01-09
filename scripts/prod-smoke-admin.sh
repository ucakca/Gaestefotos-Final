#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-https://app.xn--gstefotos-v2a.com}"
ENV_FILE="${ENV_FILE:-/root/gaestefotos-app-v2/packages/backend/.env}"

headline() { echo; echo "==== $* ===="; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: missing required command: $1" >&2
    exit 1
  fi
}

require_cmd curl
require_cmd psql
require_cmd node

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: ENV_FILE not found: $ENV_FILE" >&2
  exit 1
fi

DB_URL=$(grep -E '^DATABASE_URL=' -m1 "$ENV_FILE" | sed -E 's/^DATABASE_URL=//')
JWT_SECRET=$(grep -E '^JWT_SECRET=' -m1 "$ENV_FILE" | sed -E 's/^JWT_SECRET=//')

if [[ -z "$DB_URL" ]]; then
  echo "ERROR: DATABASE_URL missing in $ENV_FILE" >&2
  exit 1
fi
if [[ -z "$JWT_SECRET" ]]; then
  echo "ERROR: JWT_SECRET missing in $ENV_FILE" >&2
  exit 1
fi

headline "Resolve admin + target user"
ADMIN_ID=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -Atc "select id from users where role = 'ADMIN' order by \"createdAt\" asc limit 1;")
TARGET_ID=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -Atc "select id from users where role = 'HOST' order by \"createdAt\" asc limit 1;")

if [[ -z "$ADMIN_ID" ]]; then
  echo "ERROR: No ADMIN user found" >&2
  exit 1
fi
if [[ -z "$TARGET_ID" ]]; then
  echo "ERROR: No HOST user found" >&2
  exit 1
fi

echo "APP_URL=$APP_URL"
echo "ADMIN_ID=$ADMIN_ID"
echo "TARGET_ID=$TARGET_ID"

headline "Create admin JWT (15m)"
ADMIN_JWT=$(JWT_SECRET="$JWT_SECRET" ADMIN_ID="$ADMIN_ID" node <<'NODE'
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
const uid = process.env.ADMIN_ID;
if (!secret || !uid) process.exit(1);
process.stdout.write(jwt.sign({ userId: uid, role: 'ADMIN' }, secret, { expiresIn: '15m' }));
NODE
)

if [[ -z "$ADMIN_JWT" ]]; then
  echo "ERROR: Failed to create admin jwt" >&2
  exit 1
fi

echo "ADMIN_JWT=ok"

headline "Admin API smoke: invitation templates CRUD"
BASE="$APP_URL/api/admin/invitation-templates"
SLUG="prod-smoke-$(date +%s)"

CREATE_JSON=$(curl -sS -X POST "$BASE" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  --data "{\"slug\":\"$SLUG\",\"title\":\"Prod Smoke $SLUG\",\"description\":\"prod smoke\",\"html\":\"<p>hi</p>\",\"text\":\"hi\",\"isActive\":true}")

TEMPLATE_ID=$(printf '%s' "$CREATE_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);process.stdout.write(j.template?.id||'');}catch{process.stdout.write('');}})")

if [[ -z "$TEMPLATE_ID" ]]; then
  echo "ERROR: template create did not return id" >&2
  echo "$CREATE_JSON" >&2
  exit 1
fi

echo "CREATE ok id=$TEMPLATE_ID"

LIST_CODE=$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $ADMIN_JWT" \
  "$BASE")

echo "LIST HTTP $LIST_CODE"

UPDATE_CODE=$(curl -sS -o /dev/null -w '%{http_code}' \
  -X PUT "$BASE/$TEMPLATE_ID" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  --data "{\"title\":\"Prod Smoke Updated $SLUG\"}")

echo "UPDATE HTTP $UPDATE_CODE"

DELETE_CODE=$(curl -sS -o /dev/null -w '%{http_code}' \
  -X DELETE "$BASE/$TEMPLATE_ID" \
  -H "Authorization: Bearer $ADMIN_JWT")

echo "DELETE HTTP $DELETE_CODE"

if [[ "$LIST_CODE" != "200" || "$UPDATE_CODE" != "200" || "$DELETE_CODE" != "200" ]]; then
  echo "ERROR: Invitation templates CRUD unexpected status codes" >&2
  exit 1
fi

headline "Admin API smoke: impersonation token"
IMP_JSON=$(curl -sS -X POST "$APP_URL/api/admin/impersonation/token" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  --data "{\"userId\":\"$TARGET_ID\",\"reason\":\"prod smoke\",\"expiresInSeconds\":300}")

IMP_OK=$(printf '%s' "$IMP_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);process.stdout.write(j.token? 'ok':'');}catch{process.stdout.write('');}})")

if [[ -z "$IMP_OK" ]]; then
  echo "ERROR: impersonation token did not return token" >&2
  echo "$IMP_JSON" >&2
  exit 1
fi

echo "IMPERSONATION ok"

headline "Frontend log spot-check (server actions)"
if journalctl -u gaestefotos-frontend.service --since "10 minutes ago" --no-pager | grep -q "Failed to find Server Action"; then
  echo "ERROR: Found 'Failed to find Server Action' in frontend logs (last 10m)" >&2
  exit 1
fi

echo "No server action errors in last 10 minutes"

headline "Done"
