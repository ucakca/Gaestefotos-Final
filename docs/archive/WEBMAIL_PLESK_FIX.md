# 🔧 Webmail-Weiterleitung auf Plesk beheben

## Problem

**webmail.brandboost.at** leitet auf **https://localhost:8443/smb/webmail/list** weiter.

Das bedeutet, dass Plesk die Webmail-Konfiguration als "nicht konfiguriert" erkennt.

## Lösung: Webmail über Plesk Panel aktivieren

### Schritt 1: Plesk Panel öffnen

1. Öffne: `https://[SERVER-IP]:8443`
2. Mit Administrator-Account einloggen

### Schritt 2: Webmail aktivieren

1. **Domain auswählen:** `brandboost.at`
2. **Mail → Webmail:**
   - Prüfe, ob Webmail aktiviert ist
   - Falls nicht aktiviert: **Webmail aktivieren**
   - **Webmail-Typ auswählen:** Roundcube
   - **Anwenden**

### Schritt 3: Webmail-URL prüfen

Nach der Aktivierung sollte die Webmail-URL sein:
- `https://webmail.brandboost.at/`

NICHT: `https://localhost:8443/smb/webmail/list`

## Alternative: Über Plesk CLI

Falls der Zugriff über das Panel nicht möglich ist:

```bash
# Webmail-Status prüfen
/usr/local/psa/bin/domain -l brandboost.at | grep webmail

# Webmail aktivieren (falls deaktiviert)
# Dies muss normalerweise über das Plesk Panel gemacht werden
```

## Was passiert, wenn Webmail nicht aktiviert ist?

Wenn Plesk Webmail als nicht aktiviert erkennt:
- Die Webmail-URL leitet auf die Plesk-Verwaltungsseite weiter
- Oder zeigt eine Fehlerseite mit Link zu Plesk
- Die Apache-Konfiguration existiert, aber Plesk zeigt eine Fehlerseite

## Nach der Aktivierung

Nachdem Webmail über Plesk aktiviert wurde:

1. **Services neu starten:**
   ```bash
   sudo systemctl restart apache2
   sudo systemctl restart plesk-php83-fpm
   sudo systemctl reload nginx
   ```

2. **Webmail testen:**
   ```bash
   curl -I https://webmail.brandboost.at/
   ```

3. **Im Browser testen:**
   - `https://webmail.brandboost.at/`
   - Sollte die Roundcube-Login-Seite zeigen

## Wichtige Hinweise

- ✅ **E-Mails bleiben erhalten:** Die Aktivierung ändert nur die Webmail-Konfiguration
- ✅ **Dovecot läuft weiter:** E-Mails werden weiterhin von Dovecot verwaltet
- ✅ **Keine Datenverluste:** Nur die Webmail-Konfiguration wird aktualisiert

## Falls das Problem weiterhin besteht

1. **Plesk Panel → Domain → Mail → Webmail:**
   - Webmail deaktivieren
   - Webmail aktivieren
   - Roundcube auswählen

2. **Plesk Panel → Domain → PHP-Einstellungen:**
   - PHP-Version: 8.3
   - PHP-FPM aktiviert

3. **Logs prüfen:**
   ```bash
   tail -50 /var/log/apache2/error.log
   tail -50 /var/log/plesk-php83-fpm/error.log
   ```


