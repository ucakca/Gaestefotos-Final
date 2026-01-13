# Cloudflare Page Rule für Socket.IO

## Problem
Cloudflare sendet einen 308-Redirect für `/socket.io/*` Anfragen, der zu einer HTML-Seite führt statt zu Socket.IO. Dies verhindert, dass WebSocket-Verbindungen funktionieren.

## Lösung: Cloudflare Page Rule erstellen

### Schritt 1: Cloudflare Dashboard öffnen
1. Gehe zu [dash.cloudflare.com](https://dash.cloudflare.com)
2. Wähle die Domain `app.gästefotos.com` oder `app.xn--gstefotos-v2a.com` aus

### Schritt 2: Page Rules öffnen
1. Klicke im linken Menü auf **"Rules"** → **"Page Rules"**
2. Klicke auf **"Create Page Rule"**

### Schritt 3: Page Rule konfigurieren

**URL Pattern:**
```
app.gästefotos.com/socket.io*
```
oder
```
app.xn--gstefotos-v2a.com/socket.io*
```

**Wichtig:** Kein `*` am Anfang! Das `*` am Anfang verursacht DNS-Warnungen. Nur am Ende für den Pfad.

**Settings (in dieser Reihenfolge):**

1. **Cache Level**: `Bypass` 
   - Deaktiviert das Caching für Socket.IO-Anfragen

2. **Disable Security** (optional, nur wenn nötig)
   - Deaktiviert Cloudflare-Sicherheitsfunktionen für diesen Pfad
   - Kann helfen, wenn der Redirect durch Security-Features verursacht wird

3. **Disable Performance** (optional)
   - Deaktiviert Performance-Optimierungen, die WebSocket-Verbindungen stören könnten

### Schritt 4: Page Rule speichern
1. Klicke auf **"Save and Deploy"**
2. Die Regel wird sofort aktiviert (Propagierung kann einige Minuten dauern)

## Alternative: Transform Rules (empfohlen für neue Accounts)

Falls Page Rules nicht verfügbar sind (kostenlose Cloudflare-Pläne haben limitierte Page Rules), verwende **Transform Rules**:

1. Gehe zu **"Rules"** → **"Transform Rules"** → **"URL Rewrite"**
2. Erstelle eine Regel:
   - **Name**: `Socket.IO Passthrough`
   - **When**: `http.request.uri.path matches "/socket.io*"`
   - **Then**: `Set static` → `Original URL`

## Testen der Page Rule

Nach dem Erstellen der Regel, teste die Verbindung:

```bash
curl -I "https://app.xn--gstefotos-v2a.com/socket.io/?EIO=4&transport=polling"
```

**Erwartetes Ergebnis:**
- Status Code: `200` oder `400` (vom Backend)
- **NICHT** `308` (Redirect)
- Response sollte Socket.IO JSON enthalten (nicht HTML)

## Wichtige Hinweise

1. **Reihenfolge der Page Rules**: Page Rules werden von oben nach unten ausgewertet. Stelle sicher, dass die Socket.IO-Regel **vor** anderen allgemeinen Regeln steht.

2. **Wildcards**: Der `*` Platzhalter matcht alle Unterpfade von `/socket.io`, z.B.:
   - `/socket.io/?EIO=4&transport=polling`
   - `/socket.io/?EIO=4&transport=websocket`
   - `/socket.io/socket.io.js` (falls vorhanden)

3. **Propagierung**: Änderungen können 1-5 Minuten dauern, bis sie vollständig aktiv sind.

4. **Monitoring**: Prüfe die Cloudflare-Logs, um zu sehen, ob die Regel korrekt angewendet wird.

## Troubleshooting

Falls die Page Rule nicht funktioniert:

1. **Prüfe die Reihenfolge**: Stelle sicher, dass die Socket.IO-Regel **oben** in der Liste steht
2. **Prüfe die URL-Pattern**: Teste mit verschiedenen Varianten:
   - `app.gästefotos.com/socket.io*` (empfohlen)
   - `app.xn--gstefotos-v2a.com/socket.io*` (für Punycode-Domain)
   - `app.gästefotos.com/socket.io/*` (alternative Schreibweise)
3. **Prüfe Cloudflare-Logs**: Gehe zu **Analytics** → **Logs**, um zu sehen, welche Regeln angewendet werden
4. **Deaktiviere andere Regeln**: Teste, ob andere Page Rules den Redirect verursachen

## Nginx-Konfiguration (bereits korrekt)

Die Nginx-Konfiguration ist bereits korrekt eingerichtet:
- Socket.IO-Location ist vor `location /` platziert
- WebSocket-Header sind korrekt gesetzt
- Proxy-Pass leitet korrekt an Backend weiter

Das Problem liegt ausschließlich bei Cloudflare, nicht bei Nginx.

