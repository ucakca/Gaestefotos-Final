# Zusätzliche Page Rule Einstellungen für /ws

## Problem
Die Page Rule für `/ws` existiert, aber "Always Use HTTPS" verursacht weiterhin einen 308-Redirect.

## Lösung: Zusätzliche Einstellungen hinzufügen

### Aktuelle Einstellung
- Cache Level: `Bypass` ✅

### Zusätzliche Einstellungen hinzufügen

1. **Öffne die `/ws` Page Rule zum Bearbeiten**
2. Klicke auf "+ Eine Einstellung hinzufügen"
3. Füge diese Einstellungen hinzu:

#### 1. Disable Security
- **Was es tut:** Deaktiviert Cloudflare-Sicherheitsfunktionen für diesen Pfad
- **Warum:** Kann helfen, wenn Security-Features den Redirect verursachen
- **Einstellung:** `ON`

#### 2. Disable Performance
- **Was es tut:** Deaktiviert Performance-Optimierungen
- **Warum:** Manche Performance-Features können WebSocket-Verbindungen stören
- **Einstellung:** `ON`

### Finale Konfiguration

**URL Pattern:**
```
app.gästefotos.com/ws*
```

**Settings (in dieser Reihenfolge):**
1. ✅ Cache Level: `Bypass`
2. ⚠️ Disable Security: `ON` (neu hinzufügen)
3. ⚠️ Disable Performance: `ON` (neu hinzufügen)

## Testen

Nach dem Hinzufügen der zusätzlichen Einstellungen:
1. Speichere die Page Rule
2. Warte 2-3 Minuten auf Propagierung
3. Teste:
   ```bash
   cd /root/gaestefotos-app-v2
   ./test-socketio-ws.sh
   ```

## Falls es weiterhin nicht funktioniert

Falls "Always Use HTTPS" weiterhin den Redirect verursacht, auch mit allen Einstellungen, dann müssen wir eine andere Lösung finden:

**Option 1:** "Always Use HTTPS" temporär deaktivieren (nicht empfohlen, da Sicherheit wichtig ist)

**Option 2:** Socket.IO über einen anderen Mechanismus routen, der "Always Use HTTPS" umgeht

**Option 3:** Cloudflare Support kontaktieren, um zu prüfen, warum die Page Rule nicht funktioniert

