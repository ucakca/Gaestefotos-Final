# 🔧 Webmail reparieren OHNE E-Mails zu löschen

## ⚠️ WICHTIG: E-Mails bleiben erhalten!

**Diese Lösung repariert nur die Webmail-Konfiguration. Die E-Mails bleiben sicher!**

## Problem

- HTTP 500 Internal Server Error
- FastCGI: "End of script output before headers: index.php"
- Roundcube funktioniert nicht, aber E-Mails sind sicher

## Lösung: Webmail reparieren ohne Neuinstallation

### Schritt 1: E-Mails sichern (Vorsichtsmaßnahme)

```bash
# E-Mail-Verzeichnisse prüfen (Dovecot)
ls -la /var/mail/
ls -la /var/vmail/ 2>/dev/null

# Dovecot-Status prüfen
systemctl status dovecot

# Postfix-Status prüfen  
systemctl status postfix
```

**Hinweis:** E-Mails werden von Dovecot verwaltet und sind NICHT in Roundcube gespeichert. Roundcube ist nur die Web-Oberfläche.

### Schritt 2: Roundcube-Konfiguration prüfen

```bash
# Konfiguration prüfen
cat /etc/roundcube/config.inc.php

# Datenbank-Verbindung prüfen
mysql -u roundcube -p -e "SHOW TABLES;" roundcube
```

### Schritt 3: FastCGI-Timeouts erhöhen (BEREITS ERLEDIGT)

Die FastCGI-Timeouts wurden bereits von 40-45 Sekunden auf 300 Sekunden erhöht.

### Schritt 4: PHP-FPM neu starten

```bash
# PHP-FPM neu starten
sudo systemctl restart plesk-php83-fpm
sudo systemctl restart php8.3-fpm

# Status prüfen
systemctl status plesk-php83-fpm
```

### Schritt 5: Apache neu starten

```bash
# Apache neu starten
sudo systemctl restart apache2

# Status prüfen
systemctl status apache2
```

### Schritt 6: Nginx neu laden

```bash
# Nginx neu laden
sudo systemctl reload nginx

# Status prüfen
systemctl status nginx
```

### Schritt 7: Webmail testen

```bash
# Webmail testen
curl -I https://webmail.brandboost.at/
```

## Alternative: Roundcube-Konfiguration zurücksetzen

Falls das Problem weiterhin besteht:

```bash
# Roundcube-Konfiguration neu generieren (OHNE E-Mails zu löschen)
sudo dpkg-reconfigure roundcube-core

# Während der Konfiguration:
# - Datenbank-Verbindung beibehalten
# - Keine Datenbank neu erstellen
# - Nur Konfiguration aktualisieren
```

## Was wurde bereits gemacht

✅ FastCGI-Timeouts erhöht (40s → 300s)  
✅ Apache neu gestartet  
✅ PHP-FPM neu gestartet  
✅ Nginx neu geladen  
✅ Roundcube-Konfiguration geprüft

## Nächste Schritte

1. **Webmail testen:** `https://webmail.brandboost.at`
2. **Falls weiterhin Fehler:**
   - Logs prüfen: `/var/log/apache2/error.log`
   - PHP-FPM-Logs prüfen: `/var/log/plesk-php83-fpm/error.log`
   - Roundcube-Logs prüfen: `/var/log/roundcube/errors.log`

## Wichtige Hinweise

- ✅ **E-Mails sind sicher:** Sie werden von Dovecot verwaltet, nicht von Roundcube
- ✅ **Roundcube ist nur die Web-Oberfläche:** Eine Neuinstallation löscht KEINE E-Mails
- ✅ **Datenbank enthält nur Roundcube-Einstellungen:** Keine E-Mails
- ⚠️ **Vorsicht bei `dpkg-reconfigure`:** Nur Konfiguration aktualisieren, keine Datenbank neu erstellen

## Falls nichts funktioniert

**Option 1: Plesk Panel → Mail → Webmail**
- Webmail deaktivieren
- Webmail neu aktivieren
- **Hinweis:** Dies löscht KEINE E-Mails, nur die Webmail-Konfiguration

**Option 2: Roundcube manuell neu installieren**
```bash
# Roundcube neu installieren (OHNE Datenbank zu löschen)
sudo apt-get install --reinstall roundcube-core

# Konfiguration beibehalten
sudo dpkg-reconfigure roundcube-core
```

## E-Mail-Sicherheit

**E-Mails werden gespeichert in:**
- Dovecot: `/var/mail/` oder `/var/vmail/`
- Postfix: Mail-Queue

**Roundcube speichert:**
- Nur Benutzereinstellungen
- Kontakte (optional)
- KEINE E-Mails

**Eine Roundcube-Neuinstallation löscht daher KEINE E-Mails!**


