# 📧 Email-Konfiguration für Gästefotos V2

## Überblick

Das Email-System verwendet Nodemailer für den Versand von Einladungen und Benachrichtigungen.

## Konfiguration

### Erforderliche Umgebungsvariablen

Füge folgende Variablen zur `.env` Datei im Backend-Ordner hinzu:

```env
# SMTP Konfiguration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@example.com
```

### Konfigurationsoptionen

- **SMTP_HOST**: Der SMTP-Server (z.B. `smtp.gmail.com`, `smtp.office365.com`)
- **SMTP_PORT**: Port des SMTP-Servers (587 für TLS, 465 für SSL, 25 für unverschlüsselt)
- **SMTP_SECURE**: `true` für SSL (Port 465), `false` für TLS (Port 587)
- **SMTP_USER**: Benutzername/Email für die SMTP-Authentifizierung
- **SMTP_PASSWORD**: Passwort für die SMTP-Authentifizierung
- **SMTP_FROM**: Absender-Email-Adresse (Standard: SMTP_USER)

## Beispiele für verschiedene Provider

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@gmail.com
```

**Hinweis:** Für Gmail benötigst du ein App-Passwort (nicht dein normales Passwort).

### Office 365 / Outlook
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@outlook.com
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM=noreply@yourdomain.com
```

## Testen der Email-Konfiguration

### Über die API

```bash
curl -X POST http://localhost:8001/api/email/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "text": "Dies ist eine Test-Email"
  }'
```

### Über das Frontend

Die Email-Funktionalität ist in folgenden Features integriert:
- Event-Einladungen versenden
- Bulk-Einladungen
- Photo-Benachrichtigungen

## Fehlerbehebung

### "Email-Konfiguration ungültig oder nicht konfiguriert"

Dieser Fehler tritt auf, wenn:
- SMTP_HOST nicht gesetzt ist
- SMTP_USER nicht gesetzt ist
- SMTP_PASSWORD nicht gesetzt ist

**Lösung:** Stelle sicher, dass alle erforderlichen Variablen in der `.env` Datei gesetzt sind.

### "Authentication failed"

- Prüfe Benutzername und Passwort
- Für Gmail: Verwende ein App-Passwort
- Prüfe, ob 2FA aktiviert ist (benötigt App-Passwort)

### "Connection timeout"

- Prüfe SMTP_HOST und SMTP_PORT
- Prüfe Firewall-Einstellungen
- Prüfe, ob der SMTP-Server erreichbar ist

## Status

**Aktueller Status:** Email-Service ist implementiert, benötigt SMTP-Konfiguration in `.env`

Die Email-Funktionalität wird automatisch aktiviert, sobald die SMTP-Variablen gesetzt sind.
