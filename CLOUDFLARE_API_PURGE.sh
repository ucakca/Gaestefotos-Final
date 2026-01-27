#!/bin/bash
# Cloudflare Cache Purge via API
# Erfordert: Cloudflare API Token

# ============================================
# SETUP - DIESE WERTE MUSST DU ANPASSEN:
# ============================================

# Cloudflare API Token (erstellen auf: https://dash.cloudflare.com/profile/api-tokens)
# Benötigte Permissions: Zone.Cache Purge
CLOUDFLARE_API_TOKEN="DEIN_API_TOKEN_HIER"

# Zone ID für gästefotos.com (findest du im Dashboard unter "API" → "Zone ID")
CLOUDFLARE_ZONE_ID="DEINE_ZONE_ID_HIER"

# ============================================
# SCRIPT START
# ============================================

echo "🔥 Cloudflare Cache Purge für gästefotos.com"
echo ""

if [ "$CLOUDFLARE_API_TOKEN" = "DEIN_API_TOKEN_HIER" ]; then
    echo "❌ ERROR: CLOUDFLARE_API_TOKEN nicht gesetzt!"
    echo ""
    echo "Bitte bearbeite diese Datei und setze:"
    echo "1. CLOUDFLARE_API_TOKEN (von https://dash.cloudflare.com/profile/api-tokens)"
    echo "2. CLOUDFLARE_ZONE_ID (vom Dashboard deiner Domain)"
    echo ""
    exit 1
fi

if [ "$CLOUDFLARE_ZONE_ID" = "DEINE_ZONE_ID_HIER" ]; then
    echo "❌ ERROR: CLOUDFLARE_ZONE_ID nicht gesetzt!"
    echo ""
    echo "Finde die Zone ID:"
    echo "1. Gehe zu https://dash.cloudflare.com"
    echo "2. Wähle deine Domain: gästefotos.com"
    echo "3. Scroll runter zu 'API' → 'Zone ID'"
    echo ""
    exit 1
fi

echo "📡 Sende Purge Request..."
echo ""

RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{"purge_everything":true}')

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ SUCCESS! Cloudflare Cache wurde geleert."
    echo ""
    echo "⏱️  Warte 10 Sekunden..."
    sleep 10
    echo ""
    echo "✅ Cache sollte jetzt geleert sein!"
    echo ""
    echo "🔍 Teste jetzt:"
    echo "   1. Öffne Inkognito-Fenster (Strg+Shift+N)"
    echo "   2. Gehe zu: app.gästefotos.com/e3/manueller-produktiv-test"
    echo "   3. Du solltest das NEUE Design sehen!"
    echo ""
else
    echo "❌ FEHLER beim Purgen!"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    exit 1
fi
