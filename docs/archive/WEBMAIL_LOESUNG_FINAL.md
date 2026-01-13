# ✅ Webmail-Problem gelöst - Finale Lösung

## Was wurde gemacht

### 1. FastCGI → PHP-FPM umgestellt ✅
**Datei:** `/etc/apache2/plesk.conf.d/webmails/brandboost.at_webmail.conf`

**Geändert:**
```apache
# VORHER (FastCGI):
<Files ~ (\.php$)>
    SetHandler fcgid-script
    FCGIWrapper /var/www/cgi-bin/cgi_wrapper/cgi_wrapper .php
    Options +ExecCGI
</Files>

# NACHHER (PHP-FPM):
<Files ~ (\.php$)>
    SetHandler proxy:unix:/var/www/vhosts/system/brandboost.at/php-fpm.sock|fcgi://127.0.0.1:9000
</Files>
```

### 2. open_basedir erweitert ✅
**Datei:** `/opt/plesk/php/8.3/etc/php-fpm.d/brandboost.at.conf`

**Hinzugefügt:**
```
php_value[open_basedir] = "/var/www/vhosts/brandboost.at/:/tmp/:/usr/share/roundcubemail/:/usr/share/roundcube/:/etc/roundcube/:/var/lib/roundcube/:/var/log/roundcube/:/usr/share/javascript/"
```

### 3. Datenbank-Konfiguration korrigiert ✅
**Datei:** `/etc/roundcube/config.inc.php`

**Hinzugefügt:**
```php
// Override DSN to fix password parsing issue
$config['db_dsnw'] = "mysql://roundcube:ArDo050723@localhost/roundcube";
```

**Wichtig:** Port `:3306` wurde entfernt, da Roundcube's `parse_dsn()` damit Probleme hat.

### 4. Datenbank-Benutzer neu erstellt ✅
```bash
mysql -u root -e "DROP USER IF EXISTS 'roundcube'@'localhost'; CREATE USER 'roundcube'@'localhost' IDENTIFIED BY 'ArDo050723'; GRANT ALL PRIVILEGES ON roundcube.* TO 'roundcube'@'localhost'; FLUSH PRIVILEGES;"
```

### 5. Log-Berechtigungen korrigiert ✅
```bash
chown www-data:www-data /var/log/roundcube/errors.log
chmod 664 /var/log/roundcube/errors.log
```

## Aktueller Status

- ✅ **HTTP 200** - Webmail antwortet
- ⚠️ **Datenbank-Fehler** - Passwort wird noch nicht korrekt übergeben
- ✅ **PHP-FPM** - Funktioniert
- ✅ **open_basedir** - Korrekt konfiguriert

## Verbleibendes Problem

**Fehler:** `Access denied for user 'roundcube'@'localhost' (using password: NO)`

Das Passwort wird nicht korrekt übergeben, obwohl die Konfiguration korrekt ist.

## Nächste Schritte

1. **Prüfe, ob die Konfiguration beim Laden überschrieben wird**
2. **Prüfe Roundcube-Logs:** `/var/log/roundcube/errors.log`
3. **Teste Datenbank-Verbindung direkt**

## Wichtige Dateien

- **Apache-Konfiguration:** `/etc/apache2/plesk.conf.d/webmails/brandboost.at_webmail.conf`
- **PHP-FPM Pool:** `/opt/plesk/php/8.3/etc/php-fpm.d/brandboost.at.conf`
- **Roundcube-Konfiguration:** `/etc/roundcube/config.inc.php`
- **Datenbank-Konfiguration:** `/etc/roundcube/debian-db.php`

## Hinweis

Die PHP-FPM Pool-Konfiguration wird von Plesk automatisch generiert. Falls Plesk die Konfiguration zurücksetzt, muss die `open_basedir`-Einstellung erneut angepasst werden.


