# Socket.IO Subdomain Setup (ws.gästefotos.com)

## Was wurde implementiert

### 1. Nginx-Konfiguration
- Neue Konfiguration: `/etc/nginx/sites-available/gaestefotos-ws.conf`
- Subdomain: `ws.gästefotos.com` und `ws.xn--gstefotos-v2a.com`
- Route: `/socket.io` → Backend Port 8001
- WebSocket-Header korrekt konfiguriert

### 2. Frontend-Änderungen
- WebSocket-URL verwendet jetzt `ws.gästefotos.com` statt `/ws` Pfad
- Automatische Hostname-Erkennung: `app.gästefotos.com` → `ws.gästefotos.com`

### 3. Cloudflare "Always Use HTTPS"
- ✅ Wieder aktiviert (Sicherheit)

## Nächste Schritte

### 1. DNS-Eintrag erstellen

**In Cloudflare Dashboard:**
1. Gehe zu: DNS → Records
2. Klicke auf "Add record"
3. Konfiguration:
   - **Type:** A oder CNAME
   - **Name:** `ws`
   - **IPv4 address:** (gleiche IP wie `app.gästefotos.com`)
   - **Proxy status:** Proxied (orange Wolke) ✅
   - **TTL:** Auto
4. Speichere den Eintrag

### 2. Cloudflare-Einstellungen für Subdomain

**Für `ws.gästefotos.com` in Cloudflare:**
1. Gehe zu: SSL/TLS → Edge Certificates
2. Scrolle zu "Always Use HTTPS"
3. Setze auf "Off" (nur für diese Subdomain)
4. Oder erstelle eine Page Rule:
   - URL Pattern: `ws.gästefotos.com/socket.io*`
   - Settings: Cache Level: Bypass, Browser Integrity Check: Off

### 3. Nginx aktivieren

```bash
# Symlink erstellen
ln -s /etc/nginx/sites-available/gaestefotos-ws.conf /etc/nginx/sites-enabled/gaestefotos-ws.conf

# Nginx testen
nginx -t

# Nginx neu laden
systemctl reload nginx
```

### 4. SSL-Zertifikat

Das SSL-Zertifikat sollte automatisch von Plesk verwaltet werden. Falls nicht:
- Plesk → Domains → ws.gästefotos.com → SSL/TLS
- Zertifikat installieren oder Let's Encrypt verwenden

### 5. Frontend neu starten

```bash
systemctl restart gaestefotos-frontend.service
```

## Testen

Nach dem Setup:

```bash
# Teste die Subdomain direkt
curl -I "https://ws.gästefotos.com/socket.io/?EIO=4&transport=polling"

# Sollte Socket.IO JSON zurückgeben (kein 308 Redirect)
```

## Vorteile

- ✅ Hauptdomain bleibt sicher ("Always Use HTTPS" aktiv)
- ✅ Socket.IO funktioniert über separate Subdomain
- ✅ Keine Business-Plan erforderlich
- ✅ Separate Cloudflare-Einstellungen möglich

## Troubleshooting

Falls es nicht funktioniert:
1. Prüfe DNS-Propagierung: `dig ws.gästefotos.com`
2. Prüfe Nginx-Logs: `tail -f /var/log/nginx/error.log`
3. Prüfe SSL-Zertifikat: `openssl s_client -connect ws.gästefotos.com:443`

