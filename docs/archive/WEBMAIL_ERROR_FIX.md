# 🔧 Webmail Internal Server Error - Fehlerbehebung

## Problem
**URL:** `https://webmail.brandboost.at/?_task=mail&_mbox=INBOX`  
**Fehler:** Internal Server Error (HTTP 500)  
**Server:** Apache mit FastCGI/PHP

## Analyse der Logs

Die Apache-Error-Logs zeigen folgende Fehler:
```
[fcgid:warn] (104)Connection reset by peer: mod_fcgid: error reading data from FastCGI server
[core:error] End of script output before headers: index.php
```

Dies deutet auf ein Problem mit der FastCGI/PHP-Verbindung hin.

## Mögliche Ursachen

1. **PHP-FPM Service läuft nicht**
2. **FastCGI-Konfiguration fehlerhaft**
3. **PHP-Fehler in der Webmail-Anwendung**
4. **Berechtigungsprobleme**
5. **Speicher-/Ressourcenprobleme**

## Lösungsansätze

### 1. PHP-FPM Status prüfen

```bash
# Prüfe PHP-FPM Status
systemctl status php8.3-fpm
# oder
service php8.3-fpm status

# Falls nicht aktiv, starte den Service
sudo systemctl start php8.3-fpm
sudo systemctl enable php8.3-fpm
```

### 2. Apache/FastCGI neu starten

```bash
# Apache neu starten
sudo systemctl restart apache2
# oder
sudo service apache2 restart

# PHP-FPM neu starten
sudo systemctl restart php8.3-fpm
```

### 3. PHP-Fehler-Logs prüfen

```bash
# Prüfe PHP-Fehler-Logs
tail -50 /var/log/php8.3-fpm.log
tail -50 /var/log/apache2/error.log

# Prüfe spezifische Webmail-Logs (falls vorhanden)
# Roundcube: /var/www/webmail/logs/errors
# Andere: /var/log/webmail/
```

### 4. FastCGI-Konfiguration prüfen

```bash
# Prüfe Apache FastCGI-Konfiguration
cat /etc/apache2/mods-enabled/fcgid.conf
cat /etc/apache2/sites-enabled/*webmail*

# Prüfe PHP-FPM Pool-Konfiguration
ls -la /etc/php/8.3/fpm/pool.d/
cat /etc/php/8.3/fpm/pool.d/www.conf | grep -E "listen|user|group"
```

### 5. Berechtigungen prüfen

```bash
# Prüfe Webmail-Verzeichnis-Berechtigungen
ls -la /var/www/webmail/  # oder wo auch immer webmail installiert ist

# Typische Berechtigungen:
# Verzeichnisse: 755
# Dateien: 644
# Besitzer: www-data:www-data (oder apache:apache)

# Falls nötig, korrigiere:
sudo chown -R www-data:www-data /var/www/webmail/
sudo find /var/www/webmail/ -type d -exec chmod 755 {} \;
sudo find /var/www/webmail/ -type f -exec chmod 644 {} \;
```

### 6. PHP-Konfiguration prüfen

```bash
# Prüfe PHP-Konfiguration
php -i | grep -E "error_reporting|display_errors|log_errors"

# Prüfe PHP-FPM-Konfiguration
php-fpm8.3 -t  # Test-Konfiguration
```

### 7. Speicher-/Ressourcen prüfen

```bash
# Prüfe verfügbaren Speicher
free -h
df -h

# Prüfe PHP-FPM-Prozesse
ps aux | grep php-fpm

# Prüfe Apache-Prozesse
ps aux | grep apache
```

### 8. Webmail-spezifische Prüfungen

#### Für Roundcube:

```bash
# Prüfe Roundcube-Konfiguration
cat /var/www/webmail/config/config.inc.php | grep -E "db_|imap_|smtp_"

# Prüfe Datenbankverbindung
# (falls Roundcube eine DB verwendet)
```

#### Für andere Webmail-Lösungen:

```bash
# Prüfe Webmail-Installationsverzeichnis
find /var/www -name "*webmail*" -o -name "*roundcube*" -o -name "*squirrelmail*"
```

### 9. Temporäre Fehleranzeige aktivieren

**WICHTIG:** Nur für Debugging, in Produktion deaktivieren!

```bash
# In PHP-Konfiguration (php.ini oder .htaccess)
display_errors = On
error_reporting = E_ALL

# Oder in .htaccess der Webmail-Installation:
php_flag display_errors on
php_value error_reporting E_ALL
```

### 10. Apache-Konfiguration testen

```bash
# Teste Apache-Konfiguration
apache2ctl configtest
# oder
apachectl -t

# Falls Fehler gefunden werden, korrigiere diese
```

## Sofortmaßnahmen

1. **PHP-FPM neu starten:**
   ```bash
   sudo systemctl restart php8.3-fpm
   ```

2. **Apache neu starten:**
   ```bash
   sudo systemctl restart apache2
   ```

3. **Beide Services neu starten:**
   ```bash
   sudo systemctl restart php8.3-fpm apache2
   ```

## Erweiterte Diagnose

### PHP-FPM Log-Level erhöhen

Bearbeite `/etc/php/8.3/fpm/php-fpm.conf`:
```ini
log_level = debug
```

Dann neu starten:
```bash
sudo systemctl restart php8.3-fpm
```

### Apache Debug-Modus

Aktiviere `LogLevel debug` in der Apache-Konfiguration für mehr Details.

### Test-Script erstellen

Erstelle eine `test.php` im Webmail-Verzeichnis:
```php
<?php
phpinfo();
?>
```

Rufe `https://webmail.brandboost.at/test.php` auf, um zu prüfen, ob PHP grundsätzlich funktioniert.

## Kontakt

Falls das Problem weiterhin besteht:
- Prüfe die vollständigen Error-Logs
- Kontaktiere den Server-Administrator
- Prüfe die Webmail-Dokumentation (Roundcube, etc.)

## Plesk-spezifische Lösungen

Da es sich um einen **Plesk-Server** handelt, gibt es zusätzliche Optionen:

### 1. Plesk PHP-FPM neu starten

```bash
# Plesk-spezifischer PHP-FPM Service
sudo systemctl restart plesk-php83-fpm

# Oder über Plesk CLI
/usr/local/psa/bin/php_handler --list
/usr/local/psa/bin/domain --update brandboost.at -php_handler_id native
```

### 2. Domain-Konfiguration in Plesk prüfen

1. **Plesk Panel öffnen:** `https://webmail.brandboost.at:8443` (oder Server-IP:8443)
2. **Domain auswählen:** `brandboost.at` oder `webmail.brandboost.at`
3. **PHP-Einstellungen prüfen:**
   - PHP-Version (sollte 8.3 sein)
   - PHP-FPM aktiviert
   - Error-Logging aktiviert

### 3. Webmail über Plesk neu installieren

Falls Roundcube über Plesk installiert wurde:
1. Plesk Panel → Domains → `brandboost.at`
2. Mail → Webmail
3. Prüfe, ob Roundcube installiert ist
4. Falls nötig, neu installieren

### 4. Plesk-Logs prüfen

```bash
# Plesk Panel Logs
tail -50 /var/log/plesk/panel.log

# Plesk PHP-FPM Logs
tail -50 /var/log/plesk-php83-fpm/error.log

# Domain-spezifische Logs
tail -50 /var/www/vhosts/brandboost.at/logs/error_log
```

### 5. Webmail-Verzeichnis finden (Plesk)

```bash
# Typische Plesk-Pfade:
/var/www/vhosts/brandboost.at/webmail/
/var/www/vhosts/brandboost.at/httpdocs/webmail/
/usr/share/psa-roundcube/
```

### 6. Plesk PHP-Handler ändern

Falls FastCGI Probleme macht, kann man auf mod_php umstellen:
1. Plesk Panel → Domain → PHP-Einstellungen
2. PHP-Handler ändern (z.B. von FastCGI zu mod_php)
3. **Hinweis:** mod_php ist weniger performant, aber stabiler

## Nächste Schritte

1. ✅ PHP-FPM Status prüfen und ggf. starten
2. ✅ Apache und PHP-FPM neu starten
3. ✅ Error-Logs auf spezifische Fehler prüfen
4. ✅ Berechtigungen prüfen
5. ✅ Webmail-Konfiguration prüfen
6. ✅ **Plesk Panel prüfen** (PHP-Einstellungen, Webmail-Installation)
7. ✅ **Domain-spezifische Logs prüfen** (`/var/www/vhosts/brandboost.at/logs/`)

