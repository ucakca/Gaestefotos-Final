#!/bin/bash
# ============================================================
# Gästefotos v2 — System Monitoring & Alerting
# Prüft Services, Disk-Space, Backups und sendet Alerts
# ============================================================

ALERT_EMAIL="alerts@gästefotos.com"
HOSTNAME=$(hostname)
API="http://localhost:8001/api"
LOG_FILE="/var/log/gaestefotos-monitoring.log"
STATE_DIR="/var/lib/gaestefotos-monitoring"
DISK_WARN_PERCENT=80
DISK_CRIT_PERCENT=90
BACKUP_MAX_AGE_HOURS=48

mkdir -p "$STATE_DIR"

# ─── Helpers ─────────────────────────────────────────────

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_alert() {
  local subject="$1"
  local body="$2"
  local alert_id="$3"
  local cooldown="${4:-3600}" # default 1h cooldown

  # Cooldown: don't send same alert within cooldown period
  local state_file="$STATE_DIR/alert_${alert_id}"
  if [ -f "$state_file" ]; then
    local last_sent=$(cat "$state_file")
    local now=$(date +%s)
    local diff=$((now - last_sent))
    if [ "$diff" -lt "$cooldown" ]; then
      log "ALERT SUPPRESSED (cooldown ${diff}s < ${cooldown}s): $subject"
      return
    fi
  fi

  echo "$body" | mail -s "[Gästefotos Alert] $subject" "$ALERT_EMAIL" 2>/dev/null
  if [ $? -eq 0 ]; then
    date +%s > "$state_file"
    log "ALERT SENT: $subject -> $ALERT_EMAIL"
  else
    log "ALERT SEND FAILED: $subject"
  fi
}

resolve_alert() {
  local alert_id="$1"
  local subject="$2"
  local state_file="$STATE_DIR/alert_${alert_id}"

  if [ -f "$state_file" ]; then
    rm -f "$state_file"
    echo "Problem behoben: $subject" | mail -s "[Gästefotos OK] $subject" "$ALERT_EMAIL" 2>/dev/null
    log "ALERT RESOLVED: $subject"
  fi
}

ALERTS=0
WARNINGS=0
CHECKS=0

# ─── 1. Service Health ───────────────────────────────────

check_service() {
  local name="$1"
  local svc="$2"
  CHECKS=$((CHECKS + 1))

  local status=$(systemctl is-active "$svc" 2>/dev/null || echo "inactive")
  if [ "$status" != "active" ]; then
    ALERTS=$((ALERTS + 1))
    log "CRITICAL: $name ($svc) is $status"

    # Try auto-restart
    systemctl restart "$svc" 2>/dev/null
    sleep 3
    local new_status=$(systemctl is-active "$svc" 2>/dev/null || echo "inactive")

    if [ "$new_status" = "active" ]; then
      send_alert "$name war down — automatisch neu gestartet" \
        "Service: $svc\nServer: $HOSTNAME\nStatus vorher: $status\nStatus jetzt: $new_status\nZeit: $(date)\n\nDer Service wurde automatisch neu gestartet." \
        "svc_${svc}" 1800
    else
      send_alert "KRITISCH: $name ist down!" \
        "Service: $svc\nServer: $HOSTNAME\nStatus: $new_status\nZeit: $(date)\n\nDer Service konnte NICHT automatisch neu gestartet werden.\nBitte sofort prüfen!" \
        "svc_${svc}" 900
    fi
  else
    resolve_alert "svc_${svc}" "$name läuft wieder"
  fi
}

check_service "Backend API"       "gaestefotos-backend.service"
check_service "Frontend"          "gaestefotos-frontend.service"
check_service "Admin Dashboard"   "gaestefotos-admin-dashboard.service"

# ─── 2. API Health Check ─────────────────────────────────

CHECKS=$((CHECKS + 1))
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  ALERTS=$((ALERTS + 1))
  log "CRITICAL: Backend API health check failed (HTTP $HTTP_CODE)"
  send_alert "Backend API antwortet nicht (HTTP $HTTP_CODE)" \
    "Endpoint: $API/health\nHTTP Status: $HTTP_CODE\nServer: $HOSTNAME\nZeit: $(date)\n\nDie Backend-API ist nicht erreichbar." \
    "api_health" 900
else
  resolve_alert "api_health" "Backend API erreichbar"
fi

# ─── 3. Disk Space ───────────────────────────────────────

CHECKS=$((CHECKS + 1))
DISK_USAGE=$(df / | awk 'NR==2 {gsub(/%/,""); print $5}')
if [ "$DISK_USAGE" -ge "$DISK_CRIT_PERCENT" ] 2>/dev/null; then
  ALERTS=$((ALERTS + 1))
  DISK_FREE=$(df -h / | awk 'NR==2 {print $4}')
  log "CRITICAL: Disk usage at ${DISK_USAGE}% (free: $DISK_FREE)"
  send_alert "KRITISCH: Festplatte ${DISK_USAGE}% voll!" \
    "Server: $HOSTNAME\nBelegung: ${DISK_USAGE}%\nFrei: $DISK_FREE\nZeit: $(date)\n\nBitte dringend Speicherplatz freigeben!" \
    "disk_critical" 3600
elif [ "$DISK_USAGE" -ge "$DISK_WARN_PERCENT" ] 2>/dev/null; then
  WARNINGS=$((WARNINGS + 1))
  DISK_FREE=$(df -h / | awk 'NR==2 {print $4}')
  log "WARNING: Disk usage at ${DISK_USAGE}% (free: $DISK_FREE)"
  send_alert "Festplatte ${DISK_USAGE}% voll" \
    "Server: $HOSTNAME\nBelegung: ${DISK_USAGE}%\nFrei: $DISK_FREE\nZeit: $(date)\n\nSpeicherplatz wird knapp." \
    "disk_warning" 86400
else
  resolve_alert "disk_critical" "Speicherplatz OK (${DISK_USAGE}%)"
  resolve_alert "disk_warning" "Speicherplatz OK (${DISK_USAGE}%)"
fi

# ─── 4. Backup Freshness ─────────────────────────────────

CHECKS=$((CHECKS + 1))
LATEST_BACKUP=""
LATEST_BACKUP_AGE=999999

# Check app backups
for dir in /opt/backups/gaestefotos/daily /opt/backups/gaestefotos/weekly /opt/backups/gaestefotos/monthly /opt/backups/gaestefotos/manual; do
  if [ -d "$dir" ]; then
    NEWEST=$(find "$dir" -name "app_*.tar.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1)
    if [ -n "$NEWEST" ]; then
      TIMESTAMP=$(echo "$NEWEST" | awk '{print $1}' | cut -d. -f1)
      NOW=$(date +%s)
      AGE_HOURS=$(( (NOW - TIMESTAMP) / 3600 ))
      if [ "$AGE_HOURS" -lt "$LATEST_BACKUP_AGE" ]; then
        LATEST_BACKUP_AGE=$AGE_HOURS
        LATEST_BACKUP=$(echo "$NEWEST" | awk '{print $2}')
      fi
    fi
  fi
done

if [ "$LATEST_BACKUP_AGE" -gt "$BACKUP_MAX_AGE_HOURS" ]; then
  ALERTS=$((ALERTS + 1))
  log "WARNING: Latest app backup is ${LATEST_BACKUP_AGE}h old (max: ${BACKUP_MAX_AGE_HOURS}h)"
  send_alert "Backup veraltet! Letztes Backup vor ${LATEST_BACKUP_AGE}h" \
    "Server: $HOSTNAME\nLetztes Backup: $LATEST_BACKUP\nAlter: ${LATEST_BACKUP_AGE} Stunden\nMax erlaubt: ${BACKUP_MAX_AGE_HOURS} Stunden\nZeit: $(date)\n\nBitte Backup-System prüfen!" \
    "backup_stale" 43200
else
  resolve_alert "backup_stale" "Backup aktuell (${LATEST_BACKUP_AGE}h alt)"
  log "OK: Latest backup is ${LATEST_BACKUP_AGE}h old"
fi

# Check DB backups
CHECKS=$((CHECKS + 1))
LATEST_DB_AGE=999999
for dir in /opt/backups/gaestefotos/db/daily /opt/backups/gaestefotos/db/weekly /opt/backups/gaestefotos/db/monthly /opt/backups/gaestefotos/db/manual; do
  if [ -d "$dir" ]; then
    NEWEST_DB=$(find "$dir" -name "*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1)
    if [ -n "$NEWEST_DB" ]; then
      TIMESTAMP=$(echo "$NEWEST_DB" | awk '{print $1}' | cut -d. -f1)
      NOW=$(date +%s)
      AGE_HOURS=$(( (NOW - TIMESTAMP) / 3600 ))
      if [ "$AGE_HOURS" -lt "$LATEST_DB_AGE" ]; then
        LATEST_DB_AGE=$AGE_HOURS
      fi
    fi
  fi
done

if [ "$LATEST_DB_AGE" -gt "$BACKUP_MAX_AGE_HOURS" ]; then
  ALERTS=$((ALERTS + 1))
  log "WARNING: Latest DB backup is ${LATEST_DB_AGE}h old"
  send_alert "DB-Backup veraltet! Letztes vor ${LATEST_DB_AGE}h" \
    "Server: $HOSTNAME\nAlter: ${LATEST_DB_AGE} Stunden\nMax erlaubt: ${BACKUP_MAX_AGE_HOURS} Stunden\nZeit: $(date)" \
    "db_backup_stale" 43200
else
  resolve_alert "db_backup_stale" "DB-Backup aktuell"
  log "OK: Latest DB backup is ${LATEST_DB_AGE}h old"
fi

# ─── 5. PostgreSQL ───────────────────────────────────────

CHECKS=$((CHECKS + 1))
PG_STATUS=$(systemctl is-active postgresql 2>/dev/null || echo "inactive")
if [ "$PG_STATUS" != "active" ]; then
  ALERTS=$((ALERTS + 1))
  log "CRITICAL: PostgreSQL is $PG_STATUS"
  send_alert "KRITISCH: PostgreSQL ist down!" \
    "Service: postgresql\nServer: $HOSTNAME\nStatus: $PG_STATUS\nZeit: $(date)" \
    "postgresql" 900
else
  resolve_alert "postgresql" "PostgreSQL läuft wieder"
fi

# ─── 6. Redis ────────────────────────────────────────────

CHECKS=$((CHECKS + 1))
REDIS_PING=$(redis-cli ping 2>/dev/null || echo "FAIL")
if [ "$REDIS_PING" != "PONG" ]; then
  WARNINGS=$((WARNINGS + 1))
  log "WARNING: Redis not responding ($REDIS_PING)"
  send_alert "Redis antwortet nicht" \
    "Redis-CLI ping: $REDIS_PING\nServer: $HOSTNAME\nZeit: $(date)\n\nRedis-Cache ist nicht verfügbar. AI-Cache und Session-Store betroffen." \
    "redis" 3600
else
  resolve_alert "redis" "Redis erreichbar"
fi

# ─── 7. SSL Certificate Expiry ───────────────────────────

CHECKS=$((CHECKS + 1))
for domain in "gästefotos.com" "dash.gästefotos.com"; do
  PUNY=$(echo "$domain" | idn 2>/dev/null || echo "$domain")
  EXPIRY=$(echo | openssl s_client -servername "$PUNY" -connect "$PUNY:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$EXPIRY" ]; then
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
    NOW=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW) / 86400 ))
    if [ "$DAYS_LEFT" -lt 14 ]; then
      WARNINGS=$((WARNINGS + 1))
      log "WARNING: SSL cert for $domain expires in ${DAYS_LEFT} days"
      send_alert "SSL-Zertifikat für $domain läuft bald ab!" \
        "Domain: $domain\nAblauf: $EXPIRY\nTage verbleibend: $DAYS_LEFT\nServer: $HOSTNAME\nZeit: $(date)" \
        "ssl_${PUNY}" 86400
    else
      resolve_alert "ssl_${PUNY}" "SSL OK für $domain (${DAYS_LEFT} Tage)"
    fi
  fi
done

# ─── Summary ─────────────────────────────────────────────

log "Monitoring complete: $CHECKS checks, $ALERTS alerts, $WARNINGS warnings"

if [ $ALERTS -gt 0 ]; then
  exit 1
fi
exit 0
