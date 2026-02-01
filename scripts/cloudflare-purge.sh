#!/bin/bash
# Cloudflare Cache Purge Script
# Usage: ./cloudflare-purge.sh [all|urls]
# 
# Environment variables required:
#   CLOUDFLARE_ZONE_ID - Zone ID from Cloudflare dashboard
#   CLOUDFLARE_API_TOKEN - API Token with Cache Purge permissions
#
# To get these:
# 1. Zone ID: Cloudflare Dashboard > Your domain > Overview > API section (right sidebar)
# 2. API Token: Cloudflare Dashboard > My Profile > API Tokens > Create Token > "Edit zone" template

set -e

# Load environment variables if .env exists
if [ -f "/root/gaestefotos-app-v2/.env" ]; then
    export $(grep -v '^#' /root/gaestefotos-app-v2/.env | xargs)
fi

# Also check backend .env
if [ -f "/root/gaestefotos-app-v2/packages/backend/.env" ]; then
    export $(grep -v '^#' /root/gaestefotos-app-v2/packages/backend/.env | xargs)
fi

# Check required variables
if [ -z "$CLOUDFLARE_ZONE_ID" ]; then
    echo "Error: CLOUDFLARE_ZONE_ID not set"
    echo "Add to .env: CLOUDFLARE_ZONE_ID=your_zone_id"
    exit 1
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "Error: CLOUDFLARE_API_TOKEN not set"
    echo "Add to .env: CLOUDFLARE_API_TOKEN=your_api_token"
    exit 1
fi

MODE="${1:-all}"
ZONE_ID="$CLOUDFLARE_ZONE_ID"
API_TOKEN="$CLOUDFLARE_API_TOKEN"

echo "🌐 Cloudflare Cache Purge"
echo "========================"
echo "Zone ID: ${ZONE_ID:0:8}..."
echo "Mode: $MODE"
echo ""

if [ "$MODE" = "all" ]; then
    echo "⚠️  Purging ALL cached files..."
    
    RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{"purge_everything":true}')
    
    SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true' || true)
    
    if [ -n "$SUCCESS" ]; then
        echo "✅ Cache purged successfully!"
    else
        echo "❌ Cache purge failed!"
        echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
        exit 1
    fi

elif [ "$MODE" = "urls" ]; then
    # Purge specific URLs (useful for targeted cache clearing)
    URLS=(
        "https://app.xn--gstefotos-q9a.com/"
        "https://app.xn--gstefotos-q9a.com/_next/static/*"
        "https://app.gaestefotos.com/"
        "https://app.gaestefotos.com/_next/static/*"
    )
    
    echo "🎯 Purging specific URLs..."
    
    # Build JSON array
    URL_JSON=$(printf '%s\n' "${URLS[@]}" | jq -R . | jq -s .)
    
    RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        --data "{\"files\":$URL_JSON}")
    
    SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true' || true)
    
    if [ -n "$SUCCESS" ]; then
        echo "✅ URLs purged successfully!"
    else
        echo "❌ URL purge failed!"
        echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
        exit 1
    fi

else
    echo "Usage: $0 [all|urls]"
    echo "  all  - Purge entire cache (default)"
    echo "  urls - Purge specific static asset URLs"
    exit 1
fi

echo ""
echo "Done! Cache changes may take up to 30 seconds to propagate."
