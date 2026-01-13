# Cloudflare Page Rule Fix für Socket.IO

## Problem
Die Page Rule für `app.gästefotos.com/socket.io*` funktioniert nicht, und es gibt auch Anfragen an `app.xn--gstefotos-v2a.com`.

## Lösung: Zwei Page Rules erstellen

### Regel 1: app.gästefotos.com
**URL Pattern:**
```
app.gästefotos.com/socket.io*
```

**Settings:**
- Cache Level: `Bypass`

### Regel 2: app.xn--gstefotos-v2a.com (Punycode)
**URL Pattern:**
```
app.xn--gstefotos-v2a.com/socket.io*
```

**Settings:**
- Cache Level: `Bypass`

## Alternative: Eine Regel mit Wildcard

Falls Cloudflare Wildcards für Subdomains unterstützt, kannst du versuchen:

**URL Pattern:**
```
*.gästefotos.com/socket.io*
```

oder

```
*.xn--gstefotos-v2a.com/socket.io*
```

**Settings:**
- Cache Level: `Bypass`

## Reihenfolge

Stelle sicher, dass beide Socket.IO-Regeln **ganz oben** in der Liste stehen, vor der `wp-json`-Regel.

## Testen

Nach dem Erstellen der zweiten Regel, warte 2-3 Minuten und teste:

```bash
cd /root/gaestefotos-app-v2
./test-socketio-connection.sh
```

## Falls es weiterhin nicht funktioniert

Es könnte sein, dass eine andere Cloudflare-Einstellung den Redirect verursacht:

1. **Security Settings**: Prüfe ob "Browser Integrity Check" oder andere Security-Features aktiviert sind
2. **SSL/TLS Settings**: Prüfe ob "Always Use HTTPS" oder Redirects aktiviert sind
3. **Page Rules Reihenfolge**: Stelle sicher, dass keine andere Regel `/socket.io` betrifft

