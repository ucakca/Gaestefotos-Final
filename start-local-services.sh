#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/start-local-backend.sh"
sleep 2
BASE_PORT=3002 "$SCRIPT_DIR/start-local-frontend.sh"

FRONTEND_PORT_FILE="$SCRIPT_DIR/.pids-services/frontend.port"
FRONTEND_PORT=""
if [ -f "$FRONTEND_PORT_FILE" ]; then
  FRONTEND_PORT=$(cat "$FRONTEND_PORT_FILE" 2>/dev/null || true)
fi

echo ""
echo "=== local services started ==="
echo "Backend:  http://localhost:8002"
if [ -n "$FRONTEND_PORT" ]; then
  echo "Frontend: http://localhost:$FRONTEND_PORT"
else
  echo "Frontend: (unknown port)"
fi
echo "Backend logs:  tail -f /tmp/backend-local.log"
echo "Frontend logs: tail -f /tmp/frontend-local.log"
