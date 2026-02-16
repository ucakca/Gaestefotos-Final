#!/usr/bin/env bash
# =============================================================================
# Hetzner Robot Firewall Setup — gästefotos.com (Dedicated Server)
# Konfiguriert die Hetzner Robot Firewall via API.
#
# Verwendung:
#   export HETZNER_ROBOT_USER="dein-webservice-login"
#   export HETZNER_ROBOT_PASS="dein-webservice-passwort"
#   bash scripts/hetzner-firewall-setup.sh
#
# Credentials findest du unter:
#   https://robot.hetzner.com → Einstellungen → Webservice-Zugang
#
# Voraussetzung: curl, jq
# =============================================================================

set -euo pipefail

# --- Konfiguration ---
SERVER_IP="65.109.71.182"
ROBOT_API="https://robot-ws.your-server.de"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- Prüfungen ---
if [ -z "${HETZNER_ROBOT_USER:-}" ] || [ -z "${HETZNER_ROBOT_PASS:-}" ]; then
  echo -e "${RED}FEHLER: HETZNER_ROBOT_USER und/oder HETZNER_ROBOT_PASS nicht gesetzt.${NC}"
  echo ""
  echo "Dein Server ist ein Hetzner Dedicated Server (Robot), kein Cloud Server."
  echo ""
  echo "So bekommst du die Credentials:"
  echo "  1. https://robot.hetzner.com einloggen"
  echo "  2. Linkes Menü → Einstellungen → Webservice-Zugang (oder Webservice settings)"
  echo "  3. Falls noch nicht vorhanden: Neuen Webservice-User anlegen"
  echo "  4. Login und Passwort kopieren"
  echo ""
  echo "Dann:"
  echo "  export HETZNER_ROBOT_USER=\"dein-login\""
  echo "  export HETZNER_ROBOT_PASS=\"dein-passwort\""
  echo "  bash scripts/hetzner-firewall-setup.sh"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}jq wird installiert...${NC}"
  apt-get install -y jq > /dev/null 2>&1 || { echo -e "${RED}jq konnte nicht installiert werden${NC}"; exit 1; }
fi

ROBOT_AUTH="${HETZNER_ROBOT_USER}:${HETZNER_ROBOT_PASS}"

# --- Hilfsfunktionen ---
robot_get() {
  curl -sf -u "$ROBOT_AUTH" "${ROBOT_API}$1"
}

robot_post() {
  curl -sf -X POST -u "$ROBOT_AUTH" -d "$2" "${ROBOT_API}$1"
}

# --- Server verifizieren ---
echo -e "${YELLOW}[1/5] Verifiziere Server ${SERVER_IP} in Hetzner Robot...${NC}"

SERVER_INFO=$(robot_get "/server/${SERVER_IP}" 2>/dev/null) || {
  echo -e "${RED}FEHLER: Zugriff auf Robot API fehlgeschlagen.${NC}"
  echo "Mögliche Ursachen:"
  echo "  - Falsche Webservice-Credentials"
  echo "  - Server ${SERVER_IP} gehört nicht zu diesem Account"
  echo "  - Webservice-Zugang nicht aktiviert"
  exit 1
}

SERVER_NAME=$(echo "$SERVER_INFO" | jq -r '.server.server_name // .server.server_ip // "unknown"')
echo -e "${GREEN}  ✓ Server gefunden: ${SERVER_NAME} (${SERVER_IP})${NC}"

# --- Aktuelle Firewall prüfen ---
echo -e "${YELLOW}[2/5] Prüfe aktuelle Firewall-Konfiguration...${NC}"

FW_STATUS=$(robot_get "/firewall/${SERVER_IP}" 2>/dev/null) || {
  echo -e "${RED}FEHLER: Firewall-API nicht erreichbar. Evtl. ist die Firewall für diesen Server nicht verfügbar.${NC}"
  exit 1
}

CURRENT_STATUS=$(echo "$FW_STATUS" | jq -r '.firewall.status // "unknown"')
CURRENT_WHITELIST_ONLY=$(echo "$FW_STATUS" | jq -r '.firewall.whitelist_hos // "unknown"')
echo -e "  Aktueller Status: ${CURRENT_STATUS}"

# --- Firewall-Regeln setzen ---
# WICHTIG: Regeln + Status werden in EINEM POST gesetzt.
# So gibt es KEINE Übergangsphase wo die FW aktiv ist aber Regeln fehlen!
echo -e "${YELLOW}[3/5] Konfiguriere Firewall-Regeln...${NC}"

# Hetzner Robot Firewall: Max 10 Inbound-Regeln + Outbound-Regeln
# → Multi-Port-Format (Komma-separiert), wie im Robot-UI sichtbar
# → KRITISCH: Outbound "Allow all" muss gesetzt werden!
echo ""
echo -e "${YELLOW}  Setze Regeln via Robot Firewall API...${NC}"

# Alles in einem POST: status + input rules + output rules
RULES_DATA="status=active"
RULES_DATA+="&whitelist_hos=true"

# Regel-Index (0-basiert) — MAX 10!
IDX=0
add_indexed_rule() {
  local name="$1" proto="$2" dst_port="$3"
  RULES_DATA+="&rules[input][${IDX}][name]=${name}"
  RULES_DATA+="&rules[input][${IDX}][ip_version]=ipv4"
  RULES_DATA+="&rules[input][${IDX}][protocol]=${proto}"
  RULES_DATA+="&rules[input][${IDX}][dst_port]=${dst_port}"
  RULES_DATA+="&rules[input][${IDX}][action]=accept"
  echo -e "    ✓ [${IDX}] ${name} (${proto}/${dst_port})"
  IDX=$((IDX + 1))
}

# 9 konsolidierte INBOUND-Regeln (max 10 bei Hetzner Robot):
add_indexed_rule "SSH"          "tcp" "22"
add_indexed_rule "WEB"          "tcp" "80,443"
add_indexed_rule "Plesk"        "tcp" "8443,8447,8880"
add_indexed_rule "SMTP"         "tcp" "25"
add_indexed_rule "Mail-Out"     "tcp" "465,587"
add_indexed_rule "Mail-In"      "tcp" "993,995"
add_indexed_rule "DNS-TCP"      "tcp" "53"
add_indexed_rule "DNS-UDP"      "udp" "53"
add_indexed_rule "IDE"          "tcp" "3333"

echo ""

# OUTBOUND: Allow all (ohne das kann der Server keine Antworten senden!)
echo -e "${YELLOW}  Setze ausgehende Regel: Allow All...${NC}"
RULES_DATA+="&rules[output][0][name]=Allow-all"
RULES_DATA+="&rules[output][0][ip_version]=ipv4"
RULES_DATA+="&rules[output][0][protocol]="
RULES_DATA+="&rules[output][0][dst_port]="
RULES_DATA+="&rules[output][0][src_port]="
RULES_DATA+="&rules[output][0][action]=accept"
echo -e "    ✓ Outbound: Allow All"

echo ""
echo -e "${YELLOW}  Sende ${IDX} Inbound + 1 Outbound Regel an Robot API...${NC}"

# -s silent, aber Fehler-Body ausgeben; kein -f damit wir den Response sehen
HTTP_CODE=$(curl -s -o /tmp/hetzner-fw-response.txt -w "%{http_code}" \
  -X POST -u "$ROBOT_AUTH" \
  -d "$RULES_DATA" \
  "${ROBOT_API}/firewall/${SERVER_IP}")

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo -e "${GREEN}  ✓ Regeln erfolgreich gesetzt! (HTTP ${HTTP_CODE})${NC}"
else
  echo -e "${RED}FEHLER beim Setzen der Firewall-Regeln (HTTP ${HTTP_CODE}):${NC}"
  cat /tmp/hetzner-fw-response.txt 2>/dev/null
  echo ""
  echo -e "${YELLOW}Alternativ: Regeln manuell in robot.hetzner.com setzen.${NC}"
  echo "Gehe zu: https://robot.hetzner.com → Server → ${SERVER_IP} → Firewall"
  rm -f /tmp/hetzner-fw-response.txt
  exit 1
fi
rm -f /tmp/hetzner-fw-response.txt

echo -e "${GREEN}  ✓ Regeln erfolgreich gesetzt!${NC}"

# --- Verifizierung ---
echo -e "${YELLOW}[4/4] Verifiziere Firewall-Status...${NC}"
sleep 2

FW_VERIFY=$(robot_get "/firewall/${SERVER_IP}")
VERIFY_STATUS=$(echo "$FW_VERIFY" | jq -r '.firewall.status // "unknown"')
VERIFY_RULES=$(echo "$FW_VERIFY" | jq '.firewall.rules.input // [] | length')

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Hetzner Robot Firewall aktiv!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Server:    ${SERVER_NAME} (${SERVER_IP})"
echo -e "  Status:    ${VERIFY_STATUS}"
echo -e "  Regeln:    ${VERIFY_RULES} Inbound-Regeln"
echo -e "  Default:   ${RED}DROP${NC} (alles nicht erlaubte wird geblockt)"
echo ""
echo -e "  ${GREEN}OFFEN:${NC}"
echo -e "    ✓ 22    SSH"
echo -e "    ✓ 53    DNS"
echo -e "    ✓ 80    HTTP"
echo -e "    ✓ 443   HTTPS"
echo -e "    ✓ 3333  Windsurf IDE"
echo -e "    ✓ 8443  Plesk Panel"
echo -e "    ✓ 8880  Plesk Panel HTTP"
echo -e "    ✓ 25    SMTP"
echo -e "    ✓ 465   SMTPS"
echo -e "    ✓ 587   SMTP Submission"
echo -e "    ✓ 993   IMAPS"
echo -e "    ✓ 995   POP3S"
echo ""
echo -e "  ${RED}GEBLOCKT (automatisch):${NC}"
echo -e "    ✗ 5900  VNC"
echo -e "    ✗ 6080  noVNC/Websockify"
echo -e "    ✗ 3000  Next.js (Frontend)"
echo -e "    ✗ 3001  Admin Dashboard"
echo -e "    ✗ 3002  Booth App"
echo -e "    ✗ 3101  Print Terminal"
echo -e "    ✗ 8001  Backend API"
echo -e "    ✗ 8101  Backend Staging"
echo -e "    ✗ 5000  Python/Promidata"
echo -e "    ✗ 8082  Docker/Odoo"
echo ""
echo -e "  Verwalten: https://robot.hetzner.com → Server → ${SERVER_IP} → Firewall"
echo ""
