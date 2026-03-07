#!/bin/bash
# ─── Workflow Sync Script für ComfyUI GPU Pod ────────────────────────────
# Synchronisiert Workflow-JSONs zwischen dem gästefotos Backend und dem Pod.
#
# Dieses Script wird auf dem GPU Pod ausgeführt um:
#   pull  → Alle Workflows vom Backend in den ComfyUI Ordner laden
#   push  → Bearbeiteten Workflow zurück zum Backend hochladen
#   list  → Verfügbare Workflows auflisten
#
# Setup: Beim Pod-Start einmal ausführen:
#   curl -sL https://raw.githubusercontent.com/.../workflow-sync.sh | bash -s pull
#
# Oder manuell:
#   bash workflow-sync.sh pull           # Alle Workflows holen
#   bash workflow-sync.sh push cartoon   # Bearbeiteten Workflow hochladen
#   bash workflow-sync.sh list           # Verfügbare Effects auflisten
# ──────────────────────────────────────────────────────────────────────────

# ─── Configuration ───────────────────────────────────────────────────────
BACKEND_URL="${BACKEND_URL:-https://api.xn--gstefotos-v2a.com}"
SYNC_KEY="${WORKFLOW_SYNC_KEY:-}"
WORKFLOW_DIR="/comfyui/user/default/workflows/gaestefotos"

# ─── Colors ──────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─── Functions ───────────────────────────────────────────────────────────

list_workflows() {
    echo -e "${BLUE}📋 Verfügbare Workflows auf dem Backend:${NC}"
    RESPONSE=$(curl -sf "${BACKEND_URL}/api/workflow-sync" \
        -H "x-sync-key: ${SYNC_KEY}" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Backend nicht erreichbar. Prüfe BACKEND_URL und WORKFLOW_API_KEY.${NC}"
        exit 1
    fi
    
    echo "$RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
workflows = data.get('workflows', data) if isinstance(data, dict) else data
if isinstance(workflows, list):
    for w in workflows:
        name = w.get('effect', w.get('name', '?'))
        nodes = w.get('nodeCount', '?')
        print(f'  ✅ {name} ({nodes} nodes)')
else:
    print('  (Unbekanntes Format)')
" 2>/dev/null || echo "$RESPONSE"
}

pull_workflows() {
    echo -e "${BLUE}⬇️  Lade Workflows vom Backend...${NC}"
    mkdir -p "$WORKFLOW_DIR"
    
    # Get list of available workflows
    EFFECTS=$(curl -sf "${BACKEND_URL}/api/workflow-sync" \
        -H "x-sync-key: ${SYNC_KEY}" 2>/dev/null | \
        python3 -c "
import json, sys
data = json.load(sys.stdin)
workflows = data.get('workflows', data) if isinstance(data, dict) else data
if isinstance(workflows, list):
    for w in workflows:
        print(w.get('effect', w.get('name', '')))
" 2>/dev/null)
    
    if [ -z "$EFFECTS" ]; then
        echo -e "${RED}❌ Keine Workflows gefunden oder Backend nicht erreichbar.${NC}"
        exit 1
    fi
    
    COUNT=0
    for EFFECT in $EFFECTS; do
        RESPONSE=$(curl -sf "${BACKEND_URL}/api/workflow-sync/${EFFECT}" \
            -H "x-sync-key: ${SYNC_KEY}" 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$RESPONSE" ]; then
            # Extract just the workflow JSON
            echo "$RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
workflow = data.get('workflow', data)
print(json.dumps(workflow, indent=2))
" > "${WORKFLOW_DIR}/${EFFECT}.json" 2>/dev/null
            
            echo -e "  ${GREEN}✅ ${EFFECT}.json${NC}"
            COUNT=$((COUNT + 1))
        else
            echo -e "  ${RED}⚠️  ${EFFECT} — Fehler beim Download${NC}"
        fi
    done
    
    echo ""
    echo -e "${GREEN}📁 ${COUNT} Workflows gespeichert in: ${WORKFLOW_DIR}/${NC}"
    echo -e "${BLUE}💡 In ComfyUI: Load → Datei aus ${WORKFLOW_DIR}/ öffnen${NC}"
}

push_workflow() {
    EFFECT="$1"
    if [ -z "$EFFECT" ]; then
        echo -e "${RED}❌ Usage: bash workflow-sync.sh push <effect_name>${NC}"
        echo "   Beispiel: bash workflow-sync.sh push ai_cartoon"
        exit 1
    fi
    
    FILE="${WORKFLOW_DIR}/${EFFECT}.json"
    if [ ! -f "$FILE" ]; then
        echo -e "${RED}❌ Datei nicht gefunden: ${FILE}${NC}"
        echo "   Verfügbare Dateien:"
        ls "${WORKFLOW_DIR}/"*.json 2>/dev/null | while read f; do
            echo "   - $(basename $f .json)"
        done
        exit 1
    fi
    
    echo -e "${BLUE}⬆️  Lade ${EFFECT}.json zum Backend hoch...${NC}"
    
    RESPONSE=$(curl -sf -X PUT "${BACKEND_URL}/api/workflow-sync/${EFFECT}" \
        -H "x-sync-key: ${SYNC_KEY}" \
        -H "Content-Type: application/json" \
        -d @"$FILE" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${EFFECT} erfolgreich hochgeladen!${NC}"
        echo -e "${BLUE}💡 Der neue Workflow ist sofort aktiv — kein Rebuild nötig.${NC}"
    else
        echo -e "${RED}❌ Upload fehlgeschlagen. Response: ${RESPONSE}${NC}"
    fi
}

# ─── Main ────────────────────────────────────────────────────────────────

case "${1:-help}" in
    pull)
        pull_workflows
        ;;
    push)
        push_workflow "$2"
        ;;
    list)
        list_workflows
        ;;
    *)
        echo "Usage: bash workflow-sync.sh <command>"
        echo ""
        echo "Commands:"
        echo "  list          Verfügbare Workflows auflisten"
        echo "  pull          Alle Workflows vom Backend laden"
        echo "  push <name>   Bearbeiteten Workflow zurück hochladen"
        echo ""
        echo "Environment:"
        echo "  BACKEND_URL        Backend API URL (default: https://api.xn--gstefotos-v2a.com)"
        echo "  WORKFLOW_SYNC_KEY  Sync API Key (set in backend .env)"
        ;;
esac
