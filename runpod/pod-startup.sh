#!/bin/bash
# ─── ComfyUI Editor Pod — Startup Script ─────────────────────────────────
# Dieses Script wird beim Pod-Start ausgeführt und:
#   1. Installiert benötigte Custom Nodes
#   2. Lädt die Workflow-JSONs vom Backend Server
#   3. Startet ComfyUI
#
# RunPod Pod Setup:
#   Template: RunPod ComfyUI (oder custom mit Qwen-Modellen)
#   Docker Image: brandboost/gaestefotos-comfyui-worker:latest
#   GPU: RTX 4090 (24GB) oder A6000 (48GB)
#   Volume: Optional — /workspace (persistent storage)
#   Env Vars: WORKFLOW_API_KEY=<admin-jwt-token>
#
# Oder als "Docker Command" im Pod-Setup:
#   bash -c "curl -sL https://your-server/pod-startup.sh | bash"
# ──────────────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════"
echo "  gästefotos.com — ComfyUI Editor Setup"
echo "═══════════════════════════════════════════"

# ─── 1. Sync Workflows from Backend ─────────────────────────────────────
BACKEND_URL="${BACKEND_URL:-https://api.xn--gstefotos-v2a.com}"
WORKFLOW_DIR="/comfyui/user/default/workflows/gaestefotos"
mkdir -p "$WORKFLOW_DIR"

echo ""
echo "📥 Lade Workflows vom Backend (${BACKEND_URL})..."

# Download workflow-sync script
curl -sf -o /tmp/workflow-sync.sh \
    "https://raw.githubusercontent.com/brandboost/gaestefotos-app-v2/main/runpod/workflow-sync.sh" 2>/dev/null || true

# List of all effects — download each directly
EFFECTS="ai_cartoon ai_oldify ai_style_pop neon_noir anime watercolor oil_painting sketch renaissance comic_book pixel_art yearbook emoji_me pet_me miniature trading_card time_machine face_swap"

COUNT=0
for EFFECT in $EFFECTS; do
    if [ -n "$WORKFLOW_API_KEY" ]; then
        # Authenticated: use admin API
        curl -sf "${BACKEND_URL}/api/admin/workflows/${EFFECT}" \
            -H "Authorization: Bearer ${WORKFLOW_API_KEY}" \
            -o "${WORKFLOW_DIR}/${EFFECT}.json" 2>/dev/null && COUNT=$((COUNT + 1))
    else
        # Unauthenticated: try public endpoint
        curl -sf "${BACKEND_URL}/api/workflows/${EFFECT}/download" \
            -o "${WORKFLOW_DIR}/${EFFECT}.json" 2>/dev/null && COUNT=$((COUNT + 1))
    fi
done

echo "✅ ${COUNT} Workflows geladen → ${WORKFLOW_DIR}/"
echo ""
echo "💡 In ComfyUI: Menu → Load Workflow → gaestefotos/ Ordner"
echo "💡 Nach Bearbeitung: Menu → Save Workflow (API Format)"
echo ""
echo "═══════════════════════════════════════════"
echo "  Setup fertig! ComfyUI startet..."
echo "═══════════════════════════════════════════"
