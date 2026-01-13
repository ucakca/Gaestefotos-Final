# 🚀 Webmail Internal Server Error - Schnelllösung

## Problem
**URL:** `https://webmail.brandboost.at/?_task=mail&_mbox=INBOX`  
**Fehler:** HTTP 500 Internal Server Error  
**Server:** Plesk mit Apache + PHP-FPM

## Sofortmaßnahmen (in dieser Reihenfolge)

### 1. PHP-FPM Services neu starten

```bash
# Beide PHP-FPM Services neu starten
sudo systemctl restart plesk-php83-fpm
sudo systemctl restart php8.3-fpm
```

### 2. Apache neu starten

```bash
sudo systemctl restart apache2
```

### 3. Services prüfen

```bash
# Prüfe, ob alle Services laufen
systemctl status plesk-php83-fpm
systemctl status php8.3-fpm
systemctl status apache2
```

### 4. Webmail erneut aufrufen

Nach dem Neustart der Services sollte die Webmail-Seite wieder funktionieren.

## Falls das Problem weiterhin besteht

### Option A: Über Plesk Panel

1. Öffne Plesk Panel: `https://[SERVER-IP]:8443`
2. Gehe zu **Domains** → `brandboost.at` (oder `webmail.brandboost.at`)
3. **PHP-Einstellungen** prüfen:
   - PHP-Version: 8.3
   - PHP-FPM aktiviert
4. **Mail** → **Webmail**:
   - Prüfe, ob Roundcube installiert ist
   - Falls nötig, neu installieren

### Option B: Logs prüfen

```bash
# Domain-spezifische Error-Logs
tail -50 /var/www/vhosts/brandboost.at/logs/error_log

# PHP-FPM Logs
tail -50 /var/log/plesk-php83-fpm/error.log

# Apache Error-Logs
tail -50 /var/log/apache2/error.log | grep -i webmail
```

### Option C: PHP-Handler ändern (Plesk)

Falls FastCGI weiterhin Probleme macht:

1. Plesk Panel → Domain → **PHP-Einstellungen**
2. **PHP-Handler** ändern:
   - Von: `FastCGI application` 
   - Zu: `Apache module` (mod_php) oder `FPM application served by Apache`
3. **Anwenden**

## Häufige Ursachen

1. ✅ **PHP-FPM Service abgestürzt** → Lösung: Service neu starten
2. ✅ **FastCGI-Verbindungsproblem** → Lösung: Services neu starten
3. ✅ **PHP-Fehler in Webmail** → Lösung: Logs prüfen
4. ✅ **Berechtigungsprobleme** → Lösung: Plesk prüft automatisch
5. ✅ **Speicher voll** → Lösung: `df -h` prüfen

## Nächste Schritte

1. ✅ Services neu starten (siehe oben)
2. ✅ Webmail erneut testen
3. ✅ Falls weiterhin Fehler: Plesk Panel prüfen
4. ✅ Logs analysieren (siehe WEBMAIL_ERROR_FIX.md)

## Vollständige Dokumentation

Für detaillierte Fehlerbehebung siehe: `WEBMAIL_ERROR_FIX.md`


