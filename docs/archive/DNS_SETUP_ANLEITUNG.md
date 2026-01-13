# DNS-Eintrag für ws.gästefotos.com erstellen

## Schritt-für-Schritt Anleitung

### 1. Cloudflare Dashboard öffnen
1. Gehe zu: https://dash.cloudflare.com
2. Wähle die Zone: `gästefotos.com`

### 2. DNS-Eintrag erstellen
1. Klicke auf: **DNS** → **Records**
2. Klicke auf: **Add record** (grüner Button)

### 3. Konfiguration

**Falls app.gästefotos.com ein A-Record ist:**
- **Type:** `A`
- **Name:** `ws`
- **IPv4 address:** (gleiche IP wie `app.gästefotos.com`)
- **Proxy status:** ✅ **Proxied** (orange Wolke) - WICHTIG!
- **TTL:** Auto
- **Comment:** (optional) "Socket.IO WebSocket Subdomain"

**Falls app.gästefotos.com ein CNAME ist:**
- **Type:** `CNAME`
- **Name:** `ws`
- **Target:** (gleicher Target wie `app.gästefotos.com`)
- **Proxy status:** ✅ **Proxied** (orange Wolke) - WICHTIG!
- **TTL:** Auto

### 4. Speichern
- Klicke auf **Save**

### 5. Warten auf DNS-Propagierung
- DNS-Propagierung dauert normalerweise 1-5 Minuten
- Cloudflare zeigt den Status an

### 6. Testen

Nach der Propagierung:
```bash
# Prüfe DNS
dig +short ws.gästefotos.com A

# Teste Subdomain
curl -I "https://ws.gästefotos.com/socket.io/?EIO=4&transport=polling"
```

## Wichtig

- **Proxy status muss "Proxied" sein** (orange Wolke) ✅
- Sonst funktioniert Cloudflare nicht
- Gleiche IP/Target wie `app.gästefotos.com` verwenden

## Nach dem DNS-Eintrag

1. Warte 1-5 Minuten auf Propagierung
2. Dann können wir die Cloudflare-Einstellungen für die Subdomain anpassen
3. Dann testen wir Socket.IO

