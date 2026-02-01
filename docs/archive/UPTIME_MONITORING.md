# Uptime Monitoring Setup

**Erstellt:** 2026-01-10  
**Status:** Setup-Anleitung

---

## Übersicht

Externe Health-Checks überwachen die Verfügbarkeit von Production und Staging.

## 1. UptimeRobot Account erstellen

1. Gehe zu [uptimerobot.com](https://uptimerobot.com)
2. Erstelle kostenlosen Account
3. Free Tier: 50 Monitors, 5-min Intervall

**Alternative:** StatusCake, Pingdom, oder DataDog Synthetics

## 2. Health-Check Monitors erstellen

### Production App
- **Monitor Type:** HTTP(s)
- **Friendly Name:** `gästefotos.com - App (Prod)`
- **URL:** `https://app.gästefotos.com/api/health`
- **Monitoring Interval:** 5 minutes
- **Expected Status:** 200

### Production Dashboard
- **Monitor Type:** HTTP(s)
- **Friendly Name:** `gästefotos.com - Dashboard (Prod)`
- **URL:** `https://dash.gästefotos.com/api/health`
- **Monitoring Interval:** 5 minutes
- **Expected Status:** 200

### Staging App
- **Monitor Type:** HTTP(s)
- **Friendly Name:** `gästefotos.com - App (Staging)`
- **URL:** `https://staging.app.gästefotos.com/api/health`
- **Monitoring Interval:** 5 minutes
- **Expected Status:** 200

### Staging Dashboard
- **Monitor Type:** HTTP(s)
- **Friendly Name:** `gästefotos.com - Dashboard (Staging)`
- **URL:** `https://staging.dash.gästefotos.com/api/health`
- **Monitoring Interval:** 5 minutes
- **Expected Status:** 200

## 3. Alert Contacts konfigurieren

1. Gehe zu **My Settings → Alert Contacts**
2. Füge E-Mail hinzu (kostenlos)
3. Optional: Slack, Telegram, Discord Webhook

### Empfohlene Alert-Einstellungen
- **Send Alert When:** Down
- **Re-Send Alert:** Every 30 minutes
- **Notify When Back Up:** Yes

## 4. Advanced: SSL Certificate Monitoring

UptimeRobot kann auch SSL-Ablaufdaten überwachen:
- **Monitor Type:** Keyword (not found)
- **Keyword:** `certificate has expired`
- Alert 7 Tage vor Ablauf

## 5. Health Endpoint Response

Alle Health Endpoints sollten zurückgeben:
```json
{
  "status": "healthy"
}
```

## 6. Troubleshooting

### Monitor zeigt "Down"
1. Prüfe manuell: `curl -I https://app.gästefotos.com/api/health`
2. Prüfe Service: `systemctl status gaestefotos-backend.service`
3. Prüfe Nginx: `systemctl status nginx`
4. Prüfe Logs: `journalctl -u gaestefotos-backend.service -n 100`

### Zu viele False Positives
- Erhöhe Monitoring Interval auf 10 min
- Aktiviere "Check from multiple locations"
- Setze höheres Timeout (30s statt 5s)

## Dashboard Integration

UptimeRobot bietet öffentliche Status-Seiten:
- `https://stats.uptimerobot.com/xxxxx`
- Kann in eigene Domain eingebettet werden

## Kosten

- **Free Tier:** 50 Monitors, 5-min Check, E-Mail Alerts
- **Paid:** Ab $7/Monat für 1-min Check und SMS

## Alternativen

| Service | Free Tier | Check Interval |
|---------|-----------|----------------|
| UptimeRobot | 50 Monitors | 5 min |
| StatusCake | 10 Monitors | 5 min |
| Pingdom | 1 Monitor | 1 min |
| BetterUptime | 10 Monitors | 3 min |
| HealthChecks.io | 20 Checks | 1 min |
