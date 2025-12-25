#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids-services"
mkdir -p "$PID_DIR"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
FRONTEND_PORT_FILE="$PID_DIR/frontend.port"

BASE_PORT="${BASE_PORT:-3002}"

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

echo "=== local frontend start ==="

stop_if_running "$FRONTEND_PID_FILE" "Frontend"

# use a fixed dedicated port to keep reverse-proxy stable
FRONTEND_PORT="$BASE_PORT"
if ! check_port "$FRONTEND_PORT"; then
  echo "Trying to free port $FRONTEND_PORT"
  fuser -k ${FRONTEND_PORT}/tcp >/dev/null 2>&1 || true
  sleep 2
  if ! check_port "$FRONTEND_PORT"; then
    echo "❌ Frontend port $FRONTEND_PORT is occupied. Free it or change BASE_PORT in start-local-frontend.sh"
    exit 1
  fi
fi

echo "$FRONTEND_PORT" > "$FRONTEND_PORT_FILE"

# IMPORTANT: when running multiple Next.js instances from the same codebase,
# they must not share the same distDir (.next). Otherwise one build overwrites
# the other's assets causing ChunkLoadError/MIME issues.
export NEXT_DIST_DIR="${NEXT_DIST_DIR:-.next-${FRONTEND_PORT}}"

cd "$SCRIPT_DIR/packages/frontend"

pnpm build > /tmp/frontend-local-build.log 2>&1

PORT=$FRONTEND_PORT pnpm start > /tmp/frontend-local.log 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

echo "Frontend (local) started PID: $FRONTEND_PID"
echo "Frontend (local) port: $FRONTEND_PORT"
echo "Logs: tail -f /tmp/frontend-local.log"
