#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids-services"
mkdir -p "$PID_DIR"
BACKEND_PID_FILE="$PID_DIR/backend.pid"

BACKEND_PORT="8002"

is_running() {
  local pid_file=$1
  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    if ps -p "$pid" > /dev/null 2>&1; then
      return 0
    else
      rm -f "$pid_file"
      return 1
    fi
  fi
  return 1
}

check_port() {
  local port=$1
  if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE ":${port}$"; then
    echo "Port $port is in use"
    ss -ltnp 2>/dev/null | grep -E ":${port}\\b" || true
    return 1
  fi
  return 0
}

stop_if_running() {
  local pid_file=$1
  local service_name=$2
  if is_running "$pid_file"; then
    local pid
    pid=$(cat "$pid_file")
    echo "$service_name already running (PID: $pid) - stopping"
    kill "$pid" 2>/dev/null || true
    sleep 2
    if ps -p "$pid" > /dev/null 2>&1; then
      kill -9 "$pid" 2>/dev/null || true
      sleep 1
    fi
    rm -f "$pid_file"
  fi
}

echo "=== local backend start ==="

stop_if_running "$BACKEND_PID_FILE" "Backend"

if ! check_port "$BACKEND_PORT"; then
  echo "Trying to free port $BACKEND_PORT"
  fuser -k ${BACKEND_PORT}/tcp >/dev/null 2>&1 || true
  sleep 2
  check_port "$BACKEND_PORT" || exit 1
fi

# Load secrets (DB URL etc.) from credentials (NOT in repo)
if [ -f "$SCRIPT_DIR/credentials/postgres.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/credentials/postgres.env"
  set +a
fi

# Load optional WooCommerce secrets (NOT in repo)
if [ -f "$SCRIPT_DIR/credentials/woocommerce.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/credentials/woocommerce.env"
  set +a
fi

# Load optional WordPress DB/REST config (NOT in repo)
if [ -f "$SCRIPT_DIR/credentials/wordpress.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/credentials/wordpress.env"
  set +a
fi

export NODE_ENV=production
export PORT="$BACKEND_PORT"
export LOG_TO_CONSOLE=true

cd "$SCRIPT_DIR/packages/backend"

rm -rf dist

cd "$SCRIPT_DIR"
pnpm --filter @gaestefotos/shared build > /tmp/shared-build.log 2>&1
cd "$SCRIPT_DIR/packages/backend"

pnpm exec prisma generate > /tmp/backend-local-prisma-generate.log 2>&1

pnpm build > /tmp/backend-local-build.log 2>&1

# Resolve the compiled entrypoint (tsc output path can vary depending on rootDir/path mappings)
ENTRY=""
for candidate in \
  "dist/index.js" \
  "dist/src/index.js" \
  "dist/backend/index.js" \
  "dist/backend/src/index.js"; do
  if [ -f "$candidate" ]; then
    ENTRY="$candidate"
    break
  fi
done

if [ -z "$ENTRY" ]; then
  ENTRY=$(find dist -maxdepth 4 -type f -name 'index.js' 2>/dev/null | head -n 1 || true)
fi

if [ -z "$ENTRY" ] || [ ! -f "$ENTRY" ]; then
  echo "Build succeeded but no compiled entrypoint found under dist/" >> /tmp/backend-local-build.log
  exit 1
fi

if command -v stdbuf >/dev/null 2>&1; then
  stdbuf -oL -eL node "$ENTRY" >> /tmp/backend-local.log 2>&1 &
else
  node "$ENTRY" >> /tmp/backend-local.log 2>&1 &
fi
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"

echo "Backend (local) started PID: $BACKEND_PID"
echo "Logs: tail -f /tmp/backend-local.log"
