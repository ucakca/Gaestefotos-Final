#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/root/gaestefotos-app-v2/packages/backend/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gaestefotos/db}"
KEEP="${KEEP:-30}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ENV_FILE not found: $ENV_FILE" >&2
  exit 1
fi

readarray -t parts <<<"$(ENV_FILE="$ENV_FILE" python3 - <<'PY'
import os
from urllib.parse import urlparse, unquote
from pathlib import Path

env_file = os.environ.get('ENV_FILE')
if not env_file:
    raise SystemExit('ENV_FILE missing')

raw = Path(env_file).read_text(encoding='utf-8', errors='ignore').splitlines()
db_url = None
for line in raw:
    s = line.strip()
    if not s or s.startswith('#'):
        continue
    if s.startswith('DATABASE_URL='):
        db_url = s.split('=', 1)[1]
        break

if not db_url:
    raise SystemExit('DATABASE_URL missing')

p = urlparse(db_url)
if p.scheme not in ('postgres', 'postgresql'):
    raise SystemExit(f'Unsupported scheme: {p.scheme}')

print(unquote(p.username or ''))
print(unquote(p.password or ''))
print(p.hostname or 'localhost')
print(str(p.port or 5432))
print((p.path or '').lstrip('/'))
PY
 )"

PGUSER_="${parts[0]}"
PGPASS_="${parts[1]}"
PGHOST_="${parts[2]}"
PGPORT_="${parts[3]}"
PGDB_="${parts[4]}"

mkdir -p "$BACKUP_DIR"

TS="$(date -u +%Y%m%d_%H%M%S)"
OUT="$BACKUP_DIR/gaestefotos_v2_prod_${TS}.dump"

export PGPASSWORD="$PGPASS_"
pg_dump -Fc -h "$PGHOST_" -p "$PGPORT_" -U "$PGUSER_" -d "$PGDB_" -f "$OUT"
unset PGPASSWORD

echo "OK: $OUT"

ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
