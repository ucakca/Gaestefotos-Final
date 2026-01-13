# ✅ Webmail-Problem gelöst!

## Was wurde gemacht

1. ✅ **FastCGI → PHP-FPM umgestellt**
   - Apache-Konfiguration geändert: `/etc/apache2/plesk.conf.d/webmails/brandboost.at_webmail.conf`
   - Von `FCGIWrapper` zu `SetHandler proxy:unix:/var/www/vhosts/system/brandboost.at/php-fpm.sock`

2. ✅ **open_basedir erweitert**
   - PHP-FPM Pool-Konfiguration: `/opt/plesk/php/8.3/etc/php-fpm.d/brandboost.at.conf`
   - Hinzugefügt: `/usr/share/roundcubemail/`, `/usr/share/roundcube/`, `/etc/roundcube/`, `/var/lib/roundcube/`, `/var/log/roundcube/`

3. ✅ **Roundcube neu konfiguriert**
   - `dpkg-reconfigure roundcube-core` ausgeführt
   - Datenbank neu konfiguriert

## Status

**HTTP 200** - Webmail antwortet jetzt!

## Wichtige Dateien

- **Apache-Konfiguration:** `/etc/apache2/plesk.conf.d/webmails/brandboost.at_webmail.conf`
- **PHP-FPM Pool:** `/opt/plesk/php/8.3/etc/php-fpm.d/brandboost.at.conf`
- **Roundcube-Konfiguration:** `/etc/roundcube/config.inc.php`

## Hinweis

Die PHP-FPM Pool-Konfiguration wird von Plesk automatisch generiert. Falls Plesk die Konfiguration zurücksetzt, muss die `open_basedir`-Einstellung erneut angepasst werden.

## Nächste Schritte

1. **Webmail im Browser testen:** `https://webmail.brandboost.at/`
2. **Mit Test-Mail einloggen**
3. **Falls Probleme:** Logs prüfen (`/var/log/apache2/error.log`)


