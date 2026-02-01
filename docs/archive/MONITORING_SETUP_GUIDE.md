# 🔍 Monitoring Setup Guide (5-10 Minuten)

**Status:** Backend Sentry-Integration bereit, nur Keys fehlen  
**Datum:** 2026-01-11

---

## 1. Sentry Error Tracking (5 Min) ✅ PRIORITÄT

### Account erstellen

1. Gehe zu: https://sentry.io/signup/
2. Registriere dich (GitHub/Google Login möglich)
3. Erstelle neues Projekt:
   - Platform: **Node.js**
   - Name: **gaestefotos-backend**

### DSN kopieren

Nach Projekt-Erstellung siehst du einen **DSN** (Data Source Name):

```
https://abc123def456@o123456.ingest.sentry.io/7890123
```

**Wichtig:** Diesen Key brauchst du für `.env` Files.

### DSN in .env einfügen

**Production (.env):**
```bash
cd /root/gaestefotos-app-v2/packages/backend
nano .env

# Suche nach dieser Zeile:
SENTRY_DSN=

# Ersetze durch:
SENTRY_DSN=https://dein_sentry_dsn_hier
```

**Staging (.env.staging):**
```bash
nano .env.staging

# Gleicher DSN oder separates Staging-Projekt
SENTRY_DSN=https://dein_sentry_dsn_hier
```

### Backend neu starten

```bash
systemctl restart gaestefotos-backend.service
systemctl restart gaestefotos-backend-staging.service

# Check Logs:
journalctl -u gaestefotos-backend.service -n 20 | grep -i sentry
# → [info]: Sentry initialized for error tracking
```

### Optional: Frontend Sentry (Client-side)

**Nur wenn du auch Browser-Errors tracken willst:**

```bash
cd /root/gaestefotos-app-v2/packages/frontend
nano .env.production

# Füge hinzu:
NEXT_PUBLIC_SENTRY_DSN=https://dein_frontend_sentry_dsn_hier
```

Dann Frontend neu deployen:
```bash
./scripts/deploy-frontend-prod.sh
```

---

## 2. UptimeRobot (5 Min) ✅ PRIORITÄT

### Account erstellen

1. Gehe zu: https://uptimerobot.com/signUp
2. Registriere dich (kostenloser Plan reicht)
3. Bestätige E-Mail

### Monitors einrichten

**Monitor 1: Production Frontend**
- Monitor Type: **HTTP(s)**
- Friendly Name: `Gästefotos Prod App`
- URL: `https://app.xn--gstefotos-v2a.com/api/health`
- Monitoring Interval: **5 minutes**
- Monitor Timeout: **30 seconds**

**Monitor 2: Production Dashboard**
- Monitor Type: **HTTP(s)**
- Friendly Name: `Gästefotos Prod Dashboard`
- URL: `https://dash.xn--gstefotos-v2a.com/`
- Monitoring Interval: **5 minutes**

**Monitor 3: Staging Frontend**
- Monitor Type: **HTTP(s)**
- Friendly Name: `Gästefotos Staging App`
- URL: `https://staging.app.xn--gstefotos-v2a.com/api/health`
- Monitoring Interval: **5 minutes**

**Monitor 4: Staging Dashboard**
- Monitor Type: **HTTP(s)**
- Friendly Name: `Gästefotos Staging Dashboard`
- URL: `https://staging.dash.xn--gstefotos-v2a.com/`
- Monitoring Interval: **5 minutes**

### Alert Contacts einrichten

1. Gehe zu: **My Settings** → **Alert Contacts**
2. Füge deine E-Mail hinzu
3. Optional: Slack/Discord Webhook

**Empfohlene Settings:**
- Alert me when: **Down**
- Alert me again every: **30 minutes**
- Send "up" notification: **Yes** ✅

---

## 3. Verifikation

### Sentry Test (Backend)

Erzeuge einen Test-Error:

```bash
curl -X POST https://app.xn--gstefotos-v2a.com/api/test-error
```

Dann auf Sentry Dashboard: **Issues** → Solltest du den Error sehen.

### UptimeRobot Test

Nach 5 Minuten sollten alle 4 Monitors **UP** sein (grüne Icons).

Bei Downtime: E-Mail innerhalb 2 Minuten.

---

## 4. Maintenance Checkliste

**Täglich:**
- [ ] UptimeRobot Dashboard checken (oder E-Mail bei Downtime)

**Bei Errors:**
- [ ] Sentry Dashboard → **Issues** → Neueste Errors
- [ ] Stack Trace analysieren
- [ ] Hotfix oder Rollback

**Wöchentlich:**
- [ ] Sentry Performance Review (wenn Performance SDK aktiviert)
- [ ] UptimeRobot Uptime Stats (Ziel: >99.5%)

---

## Quick Commands (Copy-Paste)

**Sentry DSN setzen (Production):**
```bash
cd /root/gaestefotos-app-v2/packages/backend
sed -i 's|^SENTRY_DSN=.*|SENTRY_DSN=https://YOUR_DSN_HERE|' .env
systemctl restart gaestefotos-backend.service
journalctl -u gaestefotos-backend.service -n 20 | grep -i sentry
```

**Sentry DSN setzen (Staging):**
```bash
sed -i 's|^SENTRY_DSN=.*|SENTRY_DSN=https://YOUR_DSN_HERE|' .env.staging
systemctl restart gaestefotos-backend-staging.service
journalctl -u gaestefotos-backend-staging.service -n 20 | grep -i sentry
```

**Status prüfen:**
```bash
echo "=== Sentry Status ===" && \
grep "^SENTRY_DSN=" /root/gaestefotos-app-v2/packages/backend/.env && \
systemctl status gaestefotos-backend.service --no-pager | grep -i active
```

---

## Troubleshooting

**Problem:** "Sentry initialized" erscheint nicht in Logs

**Lösung:**
```bash
# Check ob DSN gesetzt ist:
grep "SENTRY_DSN" /root/gaestefotos-app-v2/packages/backend/.env

# Restart Service:
systemctl restart gaestefotos-backend.service

# Logs live folgen:
journalctl -u gaestefotos-backend.service -f
```

**Problem:** UptimeRobot zeigt "Down"

**Lösung:**
```bash
# Health Check manuell testen:
curl -sS https://app.xn--gstefotos-v2a.com/api/health

# Service Status:
systemctl status gaestefotos-backend.service gaestefotos-frontend.service
```

---

**Monitoring Setup komplett nach diesen Schritten!** 🎯
