# 📊 Webmail-Status - Finale Zusammenfassung

## ✅ Was bereits gemacht wurde

1. ✅ **Roundcube neu installiert** (`apt-get install --reinstall roundcube-core`)
2. ✅ **Roundcube konfiguriert** (`dpkg-reconfigure roundcube-core`)
3. ✅ **IMAP-Host korrigiert** (`localhost:143` in `/etc/roundcube/config.inc.php`)
4. ✅ **FastCGI-Timeouts erhöht** (40s → 300s in `/etc/apache2/mods-enabled/fcgid.conf`)
5. ✅ **Services neu gestartet** (Apache, PHP-FPM, Nginx)
6. ✅ **Konfiguration geprüft** (Roundcube-Konfiguration ist korrekt)

## ⚠️ Aktuelles Problem

**HTTP 500 Internal Server Error** bleibt bestehen.

**Fehler in Logs:**
```
[fcgid:warn] (104)Connection reset by peer: mod_fcgid: error reading data from FastCGI server
[core:error] End of script output before headers: index.php
```

**Ursache:** FastCGI kann die PHP-Dateien nicht vollständig ausführen.

## 🔍 Diagnose

- ✅ **Roundcube-Konfiguration:** Korrekt (`localhost:143`, `localhost:587`)
- ✅ **PHP-FPM:** Läuft
- ✅ **Apache:** Läuft
- ✅ **Nginx:** Läuft
- ✅ **FastCGI-Wrapper:** Vorhanden (`/var/www/cgi-bin/cgi_wrapper/cgi_wrapper`)
- ⚠️ **FastCGI-Verbindung:** Wird abgebrochen

## 💡 Empfohlene Lösung

### Option 1: Über Plesk Panel (EMPFOHLEN)

1. **Plesk Panel öffnen:** `https://[SERVER-IP]:8443`
2. **Domain auswählen:** `brandboost.at`
3. **Mail → Webmail:**
   - Webmail deaktivieren
   - Webmail aktivieren
   - Roundcube auswählen
4. **PHP-Einstellungen prüfen:**
   - PHP-Version: 8.3
   - PHP-FPM aktiviert

**Vorteil:** Plesk verwaltet die Konfiguration automatisch und behebt Konflikte.

### Option 2: FastCGI auf PHP-FPM umstellen

Die Apache-Konfiguration verwendet FastCGI. Umstellung auf PHP-FPM könnte helfen:

```bash
# In Plesk Panel → Domain → PHP-Einstellungen
# PHP-Handler ändern von "FastCGI" zu "FPM application served by Apache"
```

### Option 3: Apache-Konfiguration manuell anpassen

Falls Plesk die Konfiguration nicht automatisch repariert, könnte man die Apache-Konfiguration für webmail.brandboost.at manuell anpassen, um PHP-FPM direkt zu verwenden statt FastCGI.

## 📝 Wichtige Hinweise

- ✅ **E-Mails sind sicher:** Dovecot läuft, E-Mails werden nicht gelöscht
- ✅ **Roundcube ist nur die Web-Oberfläche:** Eine Neuinstallation löscht KEINE E-Mails
- ✅ **Datenbank enthält nur Einstellungen:** Keine E-Mails in der Roundcube-Datenbank

## 🎯 Nächste Schritte

1. **Plesk Panel öffnen** und Webmail über Plesk neu konfigurieren
2. **Falls das nicht funktioniert:** PHP-Handler von FastCGI auf PHP-FPM ändern
3. **Falls weiterhin Fehler:** Logs analysieren (`/var/log/apache2/error.log`, `/var/log/plesk-php83-fpm/error.log`)

## 📋 Aktuelle Konfiguration

- **IMAP Server:** `localhost:143`
- **SMTP Server:** `localhost:587`
- **Roundcube Version:** 1.6.6
- **PHP Version:** 8.3.6
- **FastCGI Timeouts:** 300 Sekunden


