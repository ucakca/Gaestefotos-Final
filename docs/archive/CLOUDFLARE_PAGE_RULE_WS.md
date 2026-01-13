# Cloudflare Page Rule für /ws

## Änderung
Socket.IO wurde von `/api/ws` auf `/ws` umgestellt, da Cloudflare `/api/ws` blockiert hat.

## Neue Page Rule erstellen

### Schritt 1: Alte Regel löschen
1. Lösche die alte Regel: `app.gästefotos.com/api/ws*`

### Schritt 2: Neue Regel erstellen
1. Gehe zu: Cloudflare Dashboard → Rules → Page Rules
2. Klicke auf: "Create Page Rule"
3. **URL Pattern:** `app.gästefotos.com/ws*`
4. **Settings:** Cache Level: `Bypass`
5. Speichere die Regel
6. Stelle sicher, dass die Regel **ganz oben** steht (Position 1)

## Warum /ws statt /api/ws?

- `/ws` ist ein einfacherer Pfad, der weniger wahrscheinlich von Cloudflare blockiert wird
- `/api/ws` wurde von Cloudflare als unbekannter Pfad behandelt und blockiert
- `/ws` ist ein Standard-Pfad für WebSocket-Verbindungen

## Testen

Nach dem Erstellen der Page Rule, warte 2-3 Minuten und teste:

```bash
curl -I "https://app.xn--gstefotos-v2a.com/ws/?EIO=4&transport=polling"
```

**Erwartetes Ergebnis:**
- HTTP Status: `200` oder `400` (vom Backend)
- **NICHT** `404` oder `308`
- Response: Socket.IO JSON mit `sid`, `upgrades`, etc.

## Lokaler Test

Lokal funktioniert es bereits:
```bash
curl -k "https://127.0.0.1/ws/?EIO=4&transport=polling" -H "Host: app.xn--gstefotos-v2a.com"
```

Dies gibt Socket.IO JSON zurück: `{"sid":"...","upgrades":["websocket"],...}`

