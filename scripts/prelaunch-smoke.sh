#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-https://app.gästefotos.com}"
DASH_URL="${DASH_URL:-https://dash.gästefotos.com}"
API_HEALTH_URL="${API_HEALTH_URL:-${APP_URL}/api/health}"

color() {
  local code="$1"; shift
  printf "\033[%sm%s\033[0m" "$code" "$*"
}

headline() {
  echo
  echo "==== $* ===="
}

http_code() {
  curl -sS -o /dev/null -w "%{http_code}" "$1"
}

first_next_asset_path() {
  curl -sS "$1" | grep -oE '/_next/static/[^"\x27 ]+\.js' | head -n 1
}

check_url_200() {
  local url="$1"
  local code
  code=$(http_code "$url")
  if [[ "$code" == "200" ]]; then
    echo "$(color 32 OK)   $url (HTTP $code)"
  else
    echo "$(color 31 FAIL) $url (HTTP $code)"
    return 1
  fi
}

check_next_asset_200() {
  local base="$1"
  local asset
  asset=$(first_next_asset_path "$base" || true)
  if [[ -z "$asset" ]]; then
    echo "$(color 31 FAIL) Could not extract /_next/static asset from $base"
    return 1
  fi

  local code
  code=$(http_code "${base}${asset}")
  if [[ "$code" == "200" ]]; then
    echo "$(color 32 OK)   ${base}${asset} (HTTP $code)"
  else
    echo "$(color 31 FAIL) ${base}${asset} (HTTP $code)"
    return 1
  fi
}

headline "Frontend (Public)"
check_url_200 "$APP_URL/"
check_next_asset_200 "$APP_URL"

headline "Admin Dashboard"
check_url_200 "$DASH_URL/"
check_next_asset_200 "$DASH_URL"

headline "Backend Health"
check_url_200 "$API_HEALTH_URL"

headline "systemd (optional)"
if command -v systemctl >/dev/null 2>&1; then
  for svc in gaestefotos-backend.service gaestefotos-frontend.service gaestefotos-admin-dashboard.service; do
    if systemctl list-unit-files "$svc" >/dev/null 2>&1; then
      echo "-- $svc"
      systemctl --no-pager --full status "$svc" || true
    fi
  done
else
  echo "systemctl not available (skipping)"
fi

headline "Done"
