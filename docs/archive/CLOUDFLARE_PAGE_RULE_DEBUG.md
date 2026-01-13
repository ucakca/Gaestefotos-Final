# Cloudflare Page Rule Debugging

## Status
- ✅ **Lokal funktioniert es**: Nginx leitet korrekt weiter, Backend antwortet mit Socket.IO JSON
- ❌ **Über Cloudflare**: 404 - Die Anfrage erreicht Nginx nicht

## Problem
Die Page Rule für `/api/ws` funktioniert nicht. Cloudflare gibt einen 404 zurück, bevor die Anfrage Nginx erreicht.

## Mögliche Ursachen

### 1. Page Rule Reihenfolge
**Wichtig:** Die `/api/ws` Regel muss **ganz oben** stehen!

**Prüfe:**
- Ist `app.gästefotos.com/api/ws*` auf Position 1?
- Steht sie vor der `wp-json` Regel?

### 2. Page Rule URL Pattern
**Muss exakt sein:**
```
app.gästefotos.com/api/ws*
```

**NICHT:**
- `*app.gästefotos.com/api/ws*` (mit * am Anfang)
- `app.gästefotos.com/api/ws/*` (mit / am Ende)
- `*/api/ws*` (ohne Domain)

### 3. Page Rule Einstellungen
**Müssen sein:**
- ✅ Cache Level: `Bypass`

**Optional (falls es weiterhin nicht funktioniert):**
- ⚠️ Disable Security: `ON`
- ⚠️ Disable Performance: `ON`

### 4. Andere Regeln
**Prüfe:**
- Gibt es andere Page Rules, die `/api` betreffen?
- Gibt es Transform Rules, die `/api/ws` blockieren?
- Gibt es Firewall Rules, die `/api/ws` blockieren?

### 5. Cloudflare Cache
**Versuche:**
1. Gehe zu Caching → Configuration
2. Klicke auf "Purge Everything"
3. Warte 1-2 Minuten
4. Teste erneut

## Alternative Lösung

Falls die Page Rule weiterhin nicht funktioniert, können wir Socket.IO über einen anderen Pfad routen, der definitiv nicht von Cloudflare blockiert wird:

**Option 1:** `/ws` (direkt, ohne /api)
**Option 2:** `/socket` (einfacher Pfad)

Diese würden erfordern:
- Nginx-Konfiguration anpassen
- Frontend WebSocket-URL anpassen
- Neue Page Rule erstellen

## Nächste Schritte

1. **Prüfe die Page Rule:**
   - Ist sie auf Position 1?
   - Ist das URL Pattern exakt `app.gästefotos.com/api/ws*`?
   - Ist "Cache Level: Bypass" aktiviert?

2. **Falls korrekt, warte noch 2-3 Minuten** und teste erneut

3. **Falls es weiterhin nicht funktioniert:**
   - Prüfe andere Regeln (Transform Rules, Firewall Rules)
   - Oder implementiere eine alternative Lösung

