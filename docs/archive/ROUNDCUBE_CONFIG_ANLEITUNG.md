# Roundcube-Konfiguration - Anleitung

## Aktuelle Konfiguration

Die aktuelle Roundcube-Konfiguration verwendet:
- **IMAP Server:** `localhost:143`
- **SMTP Server:** `localhost:587`

## Was in der interaktiven Konfiguration eingeben

Wenn `dpkg-reconfigure roundcube-core` nach dem IMAP-Server fragt:

```
localhost:143
```

**Erklärung:**
- `localhost` = Der IMAP-Server läuft auf demselben Server
- `:143` = Standard IMAP-Port (nicht verschlüsselt)
- Alternative mit SSL: `ssl://localhost:993` (falls SSL aktiviert)

## Nach der Konfiguration

Nachdem die Konfiguration abgeschlossen ist:

```bash
# Services neu starten
sudo systemctl restart apache2
sudo systemctl restart plesk-php83-fpm
sudo systemctl reload nginx

# Webmail testen
curl -I https://webmail.brandboost.at/
```

## Falls die Konfiguration hängt

Falls die interaktive Konfiguration hängt oder Probleme macht:

1. **Abbrechen:** `Ctrl+C`
2. **Manuell konfigurieren:**
   ```bash
   # Konfiguration direkt bearbeiten
   sudo nano /etc/roundcube/config.inc.php
   
   # Sicherstellen, dass folgende Zeilen vorhanden sind:
   $config['imap_host'] = ["localhost:143"];
   $config['smtp_host'] = 'localhost:587';
   ```

3. **Services neu starten:**
   ```bash
   sudo systemctl restart apache2
   sudo systemctl restart plesk-php83-fpm
   ```

## Wichtige Hinweise

- ✅ **E-Mails bleiben erhalten:** Die Konfiguration ändert nur die Webmail-Einstellungen
- ✅ **Dovecot läuft weiter:** E-Mails werden weiterhin von Dovecot verwaltet
- ✅ **Keine Datenbank-Löschung:** Die Roundcube-Datenbank bleibt erhalten


