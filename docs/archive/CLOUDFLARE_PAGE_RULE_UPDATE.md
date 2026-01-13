# Cloudflare Page Rule Update für /api/ws

## Problem
Socket.IO wurde auf `/api/ws` umgestellt, um "Always Use HTTPS" zu umgehen. Aber Cloudflare gibt einen 404 für `/api/ws`.

## Lösung: Page Rule aktualisieren

### Option 1: Bestehende Regel erweitern (empfohlen)

**Aktuelle Regel:**
- URL Pattern: `app.gästefotos.com/socket.io*`
- Settings: Cache Level: `Bypass`

**Neue Regel hinzufügen:**
- URL Pattern: `app.gästefotos.com/api/ws*`
- Settings: Cache Level: `Bypass`

### Option 2: Eine Regel für beide Pfade

**URL Pattern:**
```
app.gästefotos.com/*socket.io*
```
oder
```
app.gästefotos.com/api/ws*
```

**Settings:**
- Cache Level: `Bypass`

## Schritte

1. Gehe zu Cloudflare Dashboard → Rules → Page Rules
2. Klicke auf "Create Page Rule"
3. URL Pattern: `app.gästefotos.com/api/ws*`
4. Settings: Cache Level: `Bypass`
5. Speichere die Regel
6. Stelle sicher, dass die Regel **oben** in der Liste steht

## Testen

Nach dem Erstellen der Regel, warte 2-3 Minuten und teste:

```bash
curl -I "https://app.xn--gstefotos-v2a.com/api/ws/?EIO=4&transport=polling"
```

**Erwartetes Ergebnis:**
- HTTP Status: `200` oder `400` (vom Backend)
- **NICHT** `404` oder `308`
- Response sollte Socket.IO JSON enthalten

