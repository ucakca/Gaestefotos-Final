# Cloudflare Page Rule Verifizierung

## Problem
Die Page Rule für `/api/ws` wurde erstellt, aber es gibt immer noch einen 404.

## Prüfungen

### 1. Page Rule Reihenfolge
**Wichtig:** Die `/api/ws` Regel muss **ganz oben** stehen (Position 1)!

**Aktuelle Reihenfolge sollte sein:**
1. `app.gästefotos.com/api/ws*` - Cache Level: Bypass
2. `gästefotos.com/wp-json/*` - Browserintegritätsprüfung: Aus, Cache-Level: Standard

Falls die `/api/ws` Regel nicht oben steht:
- Ziehe sie nach oben (drag & drop)
- Speichere die Änderungen

### 2. Page Rule Einstellungen prüfen

**URL Pattern muss exakt sein:**
```
app.gästefotos.com/api/ws*
```

**Settings müssen sein:**
- ✅ Cache Level: `Bypass`

**Optional (falls es weiterhin nicht funktioniert):**
- ⚠️ Disable Security: `ON`
- ⚠️ Disable Performance: `ON`

### 3. Propagierung warten

Cloudflare Page Rules können 2-5 Minuten brauchen, bis sie vollständig aktiv sind.

**Test nach Wartezeit:**
```bash
cd /root/gaestefotos-app-v2
./test-socketio-api-ws.sh
```

### 4. Cloudflare Cache leeren

Falls es weiterhin nicht funktioniert:
1. Gehe zu Cloudflare Dashboard → Caching → Configuration
2. Klicke auf "Purge Everything"
3. Warte 1-2 Minuten
4. Teste erneut

### 5. Alternative: Transform Rules prüfen

Falls Page Rules nicht funktionieren:
1. Gehe zu Rules → Transform Rules
2. Prüfe, ob es eine Regel gibt, die `/api/ws` blockiert
3. Deaktiviere sie temporär oder passe sie an

## Testen

Nach jeder Änderung:
```bash
cd /root/gaestefotos-app-v2
./test-socketio-api-ws.sh
```

**Erwartetes Ergebnis:**
- HTTP Status: `200` oder `400` (vom Backend)
- **NICHT** `404` oder `308`
- Response: Socket.IO JSON mit `sid`, `upgrades`, etc.

