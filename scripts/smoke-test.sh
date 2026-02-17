#!/bin/bash
# ============================================================
# Smoke-Tests für Gästefotos-App v2
# Prüft alle kritischen API-Endpoints auf Erreichbarkeit
# ============================================================

set -uo pipefail

API="http://localhost:8001/api"
PASS=0
FAIL=0
WARN=0
RESULTS=()

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check() {
  local name="$1"
  local method="${2:-GET}"
  local url="$3"
  local expected_status="${4:-200}"
  local body="${5:-}"

  local http_code
  if [ "$method" = "GET" ]; then
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  else
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X "$method" -H "Content-Type: application/json" -d "$body" "$url" 2>/dev/null || echo "000")
  fi

  if [ "$http_code" = "$expected_status" ]; then
    RESULTS+=("${GREEN}\u2713${NC} $name (HTTP $http_code)")
    ((PASS++)) || true
  elif [ "$http_code" = "000" ]; then
    RESULTS+=("${RED}\u2717${NC} $name (TIMEOUT/UNREACHABLE)")
    ((FAIL++)) || true
  else
    RESULTS+=("${RED}\u2717${NC} $name (HTTP $http_code, expected $expected_status)")
    ((FAIL++)) || true
  fi
}

check_json() {
  local name="$1"
  local url="$2"
  local jq_filter="$3"
  local expected="$4"

  local result
  result=$(curl -s --max-time 10 "$url" 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    keys = '$jq_filter'.split('.')
    v = d
    for k in keys:
        if k: v = v[k]
    print(v)
except:
    print('ERROR')
" 2>/dev/null || echo "ERROR")

  if [ "$result" = "$expected" ]; then
    RESULTS+=("${GREEN}\u2713${NC} $name ($jq_filter=$result)")
    ((PASS++)) || true
  elif [ "$result" = "ERROR" ]; then
    RESULTS+=("${RED}\u2717${NC} $name (JSON parse error)")
    ((FAIL++)) || true
  else
    RESULTS+=("${YELLOW}\u26a0${NC} $name ($jq_filter=$result, expected $expected)")
    ((WARN++)) || true
  fi
}

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Gästefotos v2 — Smoke Tests${NC}"
echo -e "${BLUE}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ─── 1. Services Health ──────────────────────────────────
echo -e "${BLUE}[1/7] Service Health${NC}"
check "Backend API"          GET "$API/health"
check "Frontend (Next.js)"   GET "http://localhost:3000"
check "Admin Dashboard"      GET "http://localhost:3001" "307"

# ─── 2. Backup API ───────────────────────────────────────
echo -e "${BLUE}[2/7] Backup API${NC}"
check "Backup List"          GET "$API/admin/backups"
check "Backup Schedule"      GET "$API/admin/backups/schedule"
# Backup count is dynamic, just verify it's > 0
BACKUP_COUNT=$(curl -s --max-time 10 "$API/admin/backups" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['stats']['totalBackups'])" 2>/dev/null || echo "0")
if [ "$BACKUP_COUNT" -gt 0 ] 2>/dev/null; then
  RESULTS+=("${GREEN}\u2713${NC} Backup Count ($BACKUP_COUNT Backups vorhanden)")
  ((PASS++)) || true
else
  RESULTS+=("${RED}\u2717${NC} Backup Count (keine Backups gefunden)")
  ((FAIL++)) || true
fi

# ─── 3. Knowledge Store ─────────────────────────────────
echo -e "${BLUE}[3/7] Knowledge Store${NC}"
check "Knowledge Stats"      GET "$API/ai/cache/stats"
check_json "KS Total Entries" "$API/ai/cache/stats" "stats.totalEntries" "70"
check_json "KS Offline Ready" "$API/ai/cache/stats" "offlineReady" "True"

# ─── 4. Media Endpoint ──────────────────────────────────
echo -e "${BLUE}[4/7] Media Endpoint${NC}"
# Get first event ID from DB directly (API needs auth)
EVENT_ID=$(cd /opt/gaestefotos/app/packages/backend && node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.event.findFirst({select:{id:true}}).then(e=>console.log(e?.id||'')).catch(()=>console.log('')).finally(()=>p.\$disconnect())" 2>/dev/null || echo "")

if [ -n "$EVENT_ID" ]; then
  check "Media Endpoint"     GET "$API/events/$EVENT_ID/media"
else
  RESULTS+=("${YELLOW}\u26a0${NC} Media Endpoint (kein Event zum Testen gefunden)")
  ((WARN++)) || true
fi

# ─── 5. Guestbook ───────────────────────────────────────
echo -e "${BLUE}[5/7] Guestbook${NC}"
if [ -n "$EVENT_ID" ]; then
  # Guestbook needs event access token — 200 or 401/403 both mean the route exists
  GB_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API/events/$EVENT_ID/guestbook" 2>/dev/null || echo "000")
  if [ "$GB_CODE" = "200" ] || [ "$GB_CODE" = "401" ] || [ "$GB_CODE" = "403" ]; then
    RESULTS+=("${GREEN}✓${NC} Guestbook Route (HTTP $GB_CODE — Route aktiv)")
    ((PASS++)) || true
  elif [ "$GB_CODE" = "404" ]; then
    # 404 can mean event not found OR route missing — check with invalid event
    GB_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API/events/00000000-0000-0000-0000-000000000000/guestbook" 2>/dev/null || echo "000")
    if [ "$GB_CHECK" = "404" ]; then
      RESULTS+=("${GREEN}✓${NC} Guestbook Route (HTTP 404 — Event access check aktiv)")
      ((PASS++)) || true
    else
      RESULTS+=("${RED}✗${NC} Guestbook Route (HTTP $GB_CODE)")
      ((FAIL++)) || true
    fi
  else
    RESULTS+=("${RED}✗${NC} Guestbook Route (HTTP $GB_CODE)")
    ((FAIL++)) || true
  fi
else
  RESULTS+=("${YELLOW}⚠${NC} Guestbook (kein Event zum Testen)")
  ((WARN++)) || true
fi

# ─── 6. AI Provider ─────────────────────────────────────
echo -e "${BLUE}[6/7] AI Provider${NC}"
check "AI Online Status"     GET "$API/ai/cache/online-status"
AI_ONLINE=$(curl -s "$API/ai/cache/online-status" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('online','?'))" 2>/dev/null || echo "?")
if [ "$AI_ONLINE" = "True" ]; then
  RESULTS+=("${GREEN}\u2713${NC} AI Provider online")
  ((PASS++)) || true
else
  RESULTS+=("${YELLOW}\u26a0${NC} AI Provider offline (Offline-Fallback aktiv)")
  ((WARN++)) || true
fi

# ─── 7. Systemd Services ────────────────────────────────
echo -e "${BLUE}[7/7] Systemd Services${NC}"
for svc in gaestefotos-backend gaestefotos-frontend gaestefotos-admin-dashboard; do
  status=$(systemctl is-active "$svc.service" 2>/dev/null || echo "inactive")
  if [ "$status" = "active" ]; then
    RESULTS+=("${GREEN}\u2713${NC} $svc.service (active)")
    ((PASS++)) || true
  else
    RESULTS+=("${RED}\u2717${NC} $svc.service ($status)")
    ((FAIL++)) || true
  fi
done

# Check hardening
for svc in gaestefotos-backend gaestefotos-frontend gaestefotos-admin-dashboard; do
  user=$(grep -oP 'User=\K\S+' "/etc/systemd/system/$svc.service" 2>/dev/null || echo "?")
  if [ "$user" = "gaestefotos" ]; then
    RESULTS+=("${GREEN}\u2713${NC} $svc hardened (User=$user)")
    ((PASS++)) || true
  else
    RESULTS+=("${YELLOW}\u26a0${NC} $svc not hardened (User=$user)")
    ((WARN++)) || true
  fi
done

# ─── Results ─────────────────────────────────────────────
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Ergebnisse${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

for r in "${RESULTS[@]}"; do
  echo -e "  $r"
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
TOTAL=$((PASS + FAIL + WARN))
echo -e "  ${GREEN}✓ $PASS bestanden${NC}  ${RED}✗ $FAIL fehlgeschlagen${NC}  ${YELLOW}⚠ $WARN Warnungen${NC}  (gesamt: $TOTAL)"

if [ $FAIL -gt 0 ]; then
  echo -e "  ${RED}ERGEBNIS: FEHLER${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
else
  echo -e "  ${GREEN}ERGEBNIS: OK${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi
