# 🔧 Webmail Problem - Finale Lösung

## Problem-Analyse

**Fehler:**
- HTTP 500 Internal Server Error
- FastCGI: "Connection reset by peer"
- "End of script output before headers: index.php"
- Roundcube-Konfiguration fehlt oder fehlerhaft

## Ursache

1. **FastCGI/PHP-FPM Problem:** PHP-FPM bricht die Verbindung ab
2. **Roundcube-Konfiguration:** `/usr/share/roundcubemail/config/config.inc.php` fehlt
3. **SNI-Problem:** Apache erkennt Hostname nicht richtig

## Lösung

### Option 1: Webmail über Plesk neu installieren (EMPFOHLEN)

1. **Plesk Panel öffnen:** `https://[SERVER-IP]:8443`
2. **Domain auswählen:** `brandboost.at`
3. **Mail → Webmail:**
   - Webmail deinstallieren (falls vorhanden)
   - Webmail neu installieren
   - Roundcube auswählen
4. **PHP-Einstellungen prüfen:**
   - PHP-Version: 8.3
   - PHP-FPM aktiviert

### Option 2: Roundcube manuell konfigurieren

```bash
# Prüfe Roundcube-Installation
ls -la /usr/share/roundcube/

# Erstelle Konfiguration (falls nicht vorhanden)
cp /usr/share/roundcube/config/config.inc.php.sample /usr/share/roundcube/config/config.inc.php

# Bearbeite Konfiguration
nano /usr/share/roundcube/config/config.inc.php
```

### Option 3: PHP-FPM neu starten und prüfen

```bash
# PHP-FPM neu starten
sudo systemctl restart plesk-php83-fpm
sudo systemctl restart php8.3-fpm

# Apache neu starten
sudo systemctl restart apache2

# Nginx neu laden
sudo systemctl reload nginx
```

### Option 4: FastCGI-Timeout erhöhen

Bearbeite `/etc/apache2/plesk.conf.d/webmails/brandboost.at_webmail.conf`:
```apache
FcgidIOTimeout 300
FcgidConnectTimeout 300
FcgidIdleTimeout 300
```

Dann Apache neu starten:
```bash
sudo systemctl restart apache2
```

## Schnelllösung (Alle Services neu starten)

```bash
# Alle relevanten Services neu starten
sudo systemctl restart plesk-php83-fpm
sudo systemctl restart php8.3-fpm
sudo systemctl restart apache2
sudo systemctl reload nginx

# Prüfe Status
systemctl status plesk-php83-fpm apache2 nginx
```

## Diagnose

### Logs prüfen

```bash
# Apache Error-Logs
tail -50 /var/log/apache2/error.log | grep -i "webmail\|fcgid\|php"

# PHP-FPM Logs
tail -50 /var/log/plesk-php83-fpm/error.log

# Roundcube Logs
tail -50 /var/log/roundcube/errors.log

# Nginx Logs
tail -50 /var/log/nginx/error.log
tail -50 /var/log/nginx/access.log | grep webmail
```

### PHP-FPM Status prüfen

```bash
# PHP-FPM Prozesse
ps aux | grep php-fpm

# PHP-FPM Socket
ls -la /var/run/plesk/plesk-php83-fpm.sock

# PHP-FPM Test
php-fpm8.3 -t
```

## Empfohlene Vorgehensweise

1. ✅ **Plesk Panel öffnen**
2. ✅ **Webmail über Plesk neu installieren** (sauberste Lösung)
3. ✅ **Services neu starten**
4. ✅ **Webmail testen**

Falls das nicht funktioniert:
- Logs analysieren
- PHP-FPM-Konfiguration prüfen
- FastCGI-Timeouts erhöhen

## Nächste Schritte

1. Webmail über Plesk neu installieren
2. Falls weiterhin Fehler: Logs analysieren
3. PHP-FPM-Konfiguration anpassen
4. FastCGI-Timeouts erhöhen


