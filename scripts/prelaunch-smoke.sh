#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-https://app.gästefotos.com}"
DASH_URL="${DASH_URL:-https://dash.xn--gstefotos-v2a.com}"
API_HEALTH_URL="${API_HEALTH_URL:-${APP_URL}/api/health}"
ADMIN_AUTH_BASE_URL="${ADMIN_AUTH_BASE_URL:-$APP_URL}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
SKIP_ADMIN_AUTH="${SKIP_ADMIN_AUTH:-}"

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
  curl -sS "$1" \
    | tr '"' '\n' \
    | tr "'" '\n' \
    | grep -E '^/_next/static/.*\.js$' \
    | head -n 1
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

check_url_200_or_redirect() {
  local url="$1"
  local code
  code=$(http_code "$url")
  if [[ "$code" == "200" || "$code" == "301" || "$code" == "302" || "$code" == "303" || "$code" == "307" || "$code" == "308" ]]; then
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
check_url_200_or_redirect "$DASH_URL/"
check_next_asset_200 "$DASH_URL"

headline "Backend Health"
check_url_200 "$API_HEALTH_URL"

if [[ -z "$SKIP_ADMIN_AUTH" && -z "$ADMIN_EMAIL" && -z "$ADMIN_PASSWORD" && -t 0 ]]; then
  echo
  read -r -p "Run optional Admin Auth check? [y/N] " RUN_ADMIN_AUTH
  if [[ "$RUN_ADMIN_AUTH" == "y" || "$RUN_ADMIN_AUTH" == "Y" ]]; then
    read -r -p "ADMIN_EMAIL: " ADMIN_EMAIL
    read -r -s -p "ADMIN_PASSWORD: " ADMIN_PASSWORD
    echo
  fi
fi

if [[ -n "$ADMIN_EMAIL" && -n "$ADMIN_PASSWORD" ]]; then
  headline "Admin Auth (optional)"
  TOKEN_JSON=$(curl -sS -X POST "${ADMIN_AUTH_BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    --data "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")
  TOKEN=$(echo "$TOKEN_JSON" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

  if [[ -z "$TOKEN" ]]; then
    if echo "$TOKEN_JSON" | grep -q '"twoFactorSetupRequired":true'; then
      TWO_FACTOR_TOKEN=$(echo "$TOKEN_JSON" | sed -n 's/.*"twoFactorToken":"\([^"]*\)".*/\1/p')
      PURPOSE=$(echo "$TOKEN_JSON" | sed -n 's/.*"purpose":"\([^"]*\)".*/\1/p')
      if [[ -z "$TWO_FACTOR_TOKEN" ]]; then
        echo "$(color 31 FAIL) /api/auth/login returned twoFactorSetupRequired but no twoFactorToken"
        echo "$TOKEN_JSON" | head -c 500
        echo
        exit 1
      fi
      if [[ -n "$PURPOSE" && "$PURPOSE" != "2fa_setup" && "$PURPOSE" != "2fa" ]]; then
        echo "$(color 31 FAIL) /api/auth/login returned invalid purpose for 2FA flow"
        echo "$TOKEN_JSON" | head -c 500
        echo
        exit 1
      fi
      echo "$(color 32 OK)   /api/auth/login returned twoFactorSetupRequired (expected for ADMIN without 2FA enabled)"
    elif echo "$TOKEN_JSON" | grep -q '"twoFactorRequired":true'; then
      TWO_FACTOR_TOKEN=$(echo "$TOKEN_JSON" | sed -n 's/.*"twoFactorToken":"\([^"]*\)".*/\1/p')
      PURPOSE=$(echo "$TOKEN_JSON" | sed -n 's/.*"purpose":"\([^"]*\)".*/\1/p')
      if [[ -z "$TWO_FACTOR_TOKEN" ]]; then
        echo "$(color 31 FAIL) /api/auth/login returned twoFactorRequired but no twoFactorToken"
        echo "$TOKEN_JSON" | head -c 500
        echo
        exit 1
      fi
      if [[ -n "$PURPOSE" && "$PURPOSE" != "2fa_setup" && "$PURPOSE" != "2fa" ]]; then
        echo "$(color 31 FAIL) /api/auth/login returned invalid purpose for 2FA flow"
        echo "$TOKEN_JSON" | head -c 500
        echo
        exit 1
      fi
      echo "$(color 32 OK)   /api/auth/login returned twoFactorRequired (expected for ADMIN with 2FA enabled)"
    else
      echo "$(color 31 FAIL) Could not obtain admin token from ${DASH_URL}/api/auth/login"
      echo "$TOKEN_JSON" | head -c 500
      echo
      exit 1
    fi
  else
    ME_JSON=$(curl -sS -H "Authorization: Bearer ${TOKEN}" "${APP_URL}/api/auth/me")
    if echo "$ME_JSON" | grep -q '"role":"ADMIN"'; then
      echo "$(color 32 OK)   /api/auth/me returned ADMIN user"
    else
      echo "$(color 31 FAIL) /api/auth/me did not return ADMIN user"
      echo "$ME_JSON" | head -c 800
      echo
      exit 1
    fi
  fi
fi

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
