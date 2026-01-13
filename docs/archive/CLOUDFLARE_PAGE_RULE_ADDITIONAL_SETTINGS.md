# Zusätzliche Page Rule Einstellungen für Socket.IO

## Aktuelle Einstellung
- Cache Level: `Bypass` ✅

## Zusätzliche Einstellungen, die helfen könnten

Falls "Cache Level: Bypass" allein nicht funktioniert, füge diese Einstellungen hinzu:

### 1. Disable Security
**Was es tut:** Deaktiviert Cloudflare-Sicherheitsfunktionen für diesen Pfad
**Warum:** Kann helfen, wenn Security-Features den Redirect verursachen

**Hinzufügen:**
1. Klicke auf "+ Eine Einstellung hinzufügen"
2. Wähle "Disable Security"
3. Aktiviere es

### 2. Disable Performance
**Was es tut:** Deaktiviert Performance-Optimierungen
**Warum:** Manche Performance-Features können WebSocket-Verbindungen stören

**Hinzufügen:**
1. Klicke auf "+ Eine Einstellung hinzufügen"
2. Wähle "Disable Performance"
3. Aktiviere es

### 3. Cache Everything (NICHT empfohlen für Socket.IO)
**NICHT verwenden!** Socket.IO sollte nicht gecacht werden.

## Empfohlene Konfiguration

**URL Pattern:**
```
app.gästefotos.com/socket.io*
```

**Settings:**
1. ✅ Cache Level: `Bypass`
2. ⚠️ Disable Security: `ON` (optional, nur wenn nötig)
3. ⚠️ Disable Performance: `ON` (optional, nur wenn nötig)

## Testen

Nach dem Hinzufügen der zusätzlichen Einstellungen:
1. Speichere die Page Rule
2. Warte 2-3 Minuten
3. Teste:
   ```bash
   cd /root/gaestefotos-app-v2
   ./test-socketio-connection.sh
   ```

