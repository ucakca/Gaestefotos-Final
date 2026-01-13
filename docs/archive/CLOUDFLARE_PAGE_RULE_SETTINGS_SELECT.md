# Cloudflare Page Rule Einstellungen für /ws

## Empfohlene Einstellungen

Füge diese Einstellungen zur `/ws` Page Rule hinzu:

### 1. Browserintegritätsprüfung: **Aus**
- **Warum:** Kann helfen, wenn Security-Features den Redirect verursachen
- **Wie:** Wähle "Browserintegritätsprüfung" → Setze auf "Aus"

### 2. Cache Deception Armor: **Aus** (falls verfügbar)
- **Warum:** Kann bei WebSocket-Verbindungen Probleme verursachen
- **Wie:** Wähle "Cache Deception Armor" → Setze auf "Aus"

### 3. Edge-Cache-TTL: **Umgehen** (falls verfügbar)
- **Warum:** Stellt sicher, dass nichts gecacht wird
- **Wie:** Wähle "Edge-Cache-TTL" → Setze auf "Umgehen" oder "0"

## Aktuelle Konfiguration sollte sein:

**URL Pattern:** `app.gästefotos.com/ws*`

**Settings:**
1. ✅ Cache Level: `Bypass` (bereits vorhanden)
2. ⚠️ Browserintegritätsprüfung: `Aus` (neu hinzufügen)
3. ⚠️ Cache Deception Armor: `Aus` (neu hinzufügen, falls verfügbar)

## Wichtig

**"Immer HTTPS verwenden"** kann nicht direkt in der Page Rule deaktiviert werden. Das ist eine globale Einstellung. Die Page Rule sollte eigentlich Priorität haben, aber manchmal funktioniert das nicht.

## Falls es weiterhin nicht funktioniert

Falls der 308-Redirect weiterhin besteht, auch mit diesen Einstellungen, dann müssen wir eine andere Lösung finden:

**Option 1:** "Immer HTTPS verwenden" temporär global deaktivieren (nicht empfohlen)

**Option 2:** Socket.IO über einen anderen Mechanismus routen

**Option 3:** Cloudflare Support kontaktieren

