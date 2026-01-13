# 🔧 ERR_CONNECTION_REFUSED - Fehlerbehebung

## Problem
**Fehler:** `ERR_CONNECTION_REFUSED`  
**Bedeutung:** Der Browser kann keine Verbindung zum Server herstellen

## Status-Check

✅ **Services laufen:**
- Apache: ✅ aktiv
- Nginx: ✅ aktiv (Reverse Proxy)
- PHP-FPM: ✅ aktiv
- Ports 80/443: ✅ offen
- **Webmail-Service (7080/7081): ✅ aktiv**

✅ **Verbindungstest:**
- `curl` kann sich verbinden → Server ist erreichbar
- SSL-Zertifikat: ✅ gültig
- Firewall: ✅ inaktiv
- **Upstream Webmail-Service: ✅ erreichbar**

## Wichtige Erkenntnis

Die Nginx-Konfiguration zeigt:
- Webmail leitet auf `127.0.0.1:7080` (HTTP) und `127.0.0.1:7081` (HTTPS) weiter
- Nginx hört auf `65.109.71.182:443` (spezifische IP)
- **Webmail-Service läuft und ist erreichbar**

**ERR_CONNECTION_REFUSED** deutet daher auf ein **Browser- oder DNS-Problem** hin.

## Mögliche Ursachen

### 1. Browser-spezifisches Problem
- Browser-Cache
- DNS-Cache
- Proxy-Einstellungen

### 2. Nginx-Konfiguration
- Webmail-Subdomain nicht korrekt konfiguriert
- Upstream-Server nicht erreichbar

### 3. Plesk-Konfiguration
- Domain/Subdomain nicht aktiviert
- PHP-Handler nicht korrekt

## Lösungsansätze

### 1. Browser-Cache leeren

**Chrome/Edge:**
- `Ctrl+Shift+Delete` → Cache leeren
- Oder: `Ctrl+F5` (Hard Refresh)

**Firefox:**
- `Ctrl+Shift+Delete` → Cache leeren
- Oder: `Ctrl+F5`

**Safari:**
- `Cmd+Option+E` (Cache leeren)
- Oder: `Cmd+Shift+R`

### 2. DNS-Cache leeren

**Windows:**
```cmd
ipconfig /flushdns
```

**macOS/Linux:**
```bash
sudo dscacheutil -flushcache  # macOS
sudo systemd-resolve --flush-caches  # Linux (systemd)
```

### 3. Nginx neu laden

```bash
# Nginx-Konfiguration testen
sudo nginx -t

# Nginx neu laden
sudo systemctl reload nginx

# Falls nötig, neu starten
sudo systemctl restart nginx
```

### 4. Plesk Webmail-Konfiguration prüfen

1. **Plesk Panel öffnen:** `https://[SERVER-IP]:8443`
2. **Domain auswählen:** `brandboost.at`
3. **Mail → Webmail:**
   - Prüfe, ob Webmail aktiviert ist
   - Prüfe Webmail-URL
   - Falls nötig, neu installieren

### 5. Nginx-Konfiguration prüfen

```bash
# Prüfe Webmail-Konfiguration
cat /etc/nginx/plesk.conf.d/webmails/brandboost.at_webmail.conf

# Prüfe Domain-Konfiguration
cat /etc/nginx/plesk.conf.d/vhosts/brandboost.at.conf | grep -A 10 webmail
```

### 6. Alternative Zugriffswege testen

```bash
# Direkt per IP testen (falls DNS-Problem)
curl -I https://65.109.71.182/ -H "Host: webmail.brandboost.at"

# HTTP testen (falls SSL-Problem)
curl -I http://webmail.brandboost.at/
```

### 7. Logs prüfen

```bash
# Nginx Error-Logs
tail -50 /var/log/nginx/error.log

# Nginx Access-Logs
tail -50 /var/log/nginx/access.log | grep webmail

# Plesk-Logs
tail -50 /var/log/plesk/httpsd_access_log | grep webmail
```

### 8. Service-Neustart (Komplett)

```bash
# Alle relevanten Services neu starten
sudo systemctl restart nginx
sudo systemctl restart apache2
sudo systemctl restart plesk-php83-fpm
```

## Diagnose-Schritte

### Schritt 1: Verbindungstest

```bash
# Von Server aus
curl -I https://webmail.brandboost.at/

# Von lokalem Rechner aus
curl -I https://webmail.brandboost.at/
```

### Schritt 2: DNS-Auflösung prüfen

```bash
# DNS-Auflösung testen
nslookup webmail.brandboost.at
dig webmail.brandboost.at

# Sollte zeigen: 65.109.71.182
```

### Schritt 3: Port-Verfügbarkeit prüfen

```bash
# Port 443 testen
telnet webmail.brandboost.at 443
# oder
nc -zv webmail.brandboost.at 443
```

### Schritt 4: Browser-Konsole prüfen

1. Browser öffnen
2. `F12` (Entwicklertools)
3. **Console** Tab → Fehler prüfen
4. **Network** Tab → Request-Details prüfen

## Häufige Fehlerquellen

### Problem: Browser zeigt ERR_CONNECTION_REFUSED, aber curl funktioniert

**Lösung:**
- Browser-Cache leeren
- DNS-Cache leeren
- Anderen Browser testen
- Inkognito/Private Mode testen

### Problem: Nginx-Konfiguration fehlt

**Lösung:**
```bash
# Plesk Webmail neu konfigurieren
/usr/local/psa/bin/domain --update brandboost.at -webmail true
```

### Problem: SSL-Zertifikat-Problem

**Lösung:**
- Plesk Panel → Domain → SSL/TLS
- Zertifikat prüfen/erneuern

## Schnelllösung

1. ✅ **Browser-Cache leeren** (`Ctrl+F5` oder `Ctrl+Shift+Delete`)
2. ✅ **DNS-Cache leeren** (siehe oben)
3. ✅ **Nginx neu laden** (`sudo systemctl reload nginx`)
4. ✅ **Webmail erneut aufrufen**
5. ✅ **Alternative:** Direkt per IP testen: `https://65.109.71.182` (mit Host-Header)

### Nginx neu laden (falls nötig)

```bash
# Nginx-Konfiguration testen
sudo nginx -t

# Nginx neu laden (ohne Downtime)
sudo systemctl reload nginx

# Falls nötig, neu starten
sudo systemctl restart nginx
```

## Erweiterte Diagnose

Falls das Problem weiterhin besteht, sammle folgende Informationen:

```bash
# System-Status
systemctl status nginx apache2 plesk-php83-fpm

# Port-Status
ss -tlnp | grep -E ":80|:443"

# Nginx-Konfiguration
nginx -t
cat /etc/nginx/plesk.conf.d/webmails/brandboost.at_webmail.conf

# Logs
tail -50 /var/log/nginx/error.log
tail -50 /var/log/nginx/access.log | grep webmail
```

## Nächste Schritte

1. ✅ Browser-Cache leeren
2. ✅ DNS-Cache leeren
3. ✅ Nginx neu laden
4. ✅ Webmail erneut testen
5. ✅ Falls weiterhin Fehler: Plesk Panel prüfen
6. ✅ Logs analysieren

