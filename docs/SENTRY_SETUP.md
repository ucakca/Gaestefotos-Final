# Sentry Error Tracking Setup

**Erstellt:** 2026-01-10  
**Status:** Setup-Anleitung

---

## Übersicht

Sentry trackt Backend-Fehler automatisch. Der Backend-Code ist bereits vorbereitet, es fehlt nur noch der DSN.

## 1. Sentry Account erstellen

1. Gehe zu [sentry.io](https://sentry.io)
2. Erstelle kostenlosen Account (oder Login)
3. Erstelle neues Projekt:
   - Platform: **Node.js**
   - Name: **gaestefotos-backend**

## 2. DSN kopieren

Nach Projekt-Erstellung:
1. Gehe zu **Settings → Projects → gaestefotos-backend → Client Keys (DSN)**
2. Kopiere den **DSN** (Format: `https://xxx@oXXX.ingest.sentry.io/XXX`)

## 3. DSN in Environment Files setzen

### Production
```bash
nano /root/gaestefotos-app-v2/packages/backend/.env
```

Füge hinzu:
```bash
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX
```

### Staging
```bash
nano /root/gaestefotos-app-v2/packages/backend/.env.staging
```

Füge hinzu (gleicher DSN oder separates Sentry-Projekt):
```bash
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX
```

## 4. Services neu starten

### Production
```bash
systemctl restart gaestefotos-backend.service
```

### Staging
```bash
systemctl restart gaestefotos-backend-staging.service
```

## 5. Verifizierung

Prüfe Logs:
```bash
journalctl -u gaestefotos-backend.service -n 50 | grep -i sentry
```

Teste Error-Tracking (optional):
```bash
curl -X POST https://app.gästefotos.com/api/test-error
```

## Was wird getrackt?

- ✅ Uncaught Exceptions
- ✅ Unhandled Promise Rejections
- ✅ API Errors (mit Request-ID)
- ✅ Environment: production/staging
- ✅ Request Context (URL, Method, Headers)

## Frontend Sentry (Optional)

Für Client-Side Error Tracking:

```bash
cd packages/frontend
pnpm add @sentry/nextjs
```

Dann `sentry.client.config.ts` und `sentry.server.config.ts` erstellen.

## Kosten

- Free Tier: 5.000 Events/Monat
- Bei Überschreitung: automatisches Rate-Limiting
