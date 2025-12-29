# Admin-Dashboard Subdomain-Konfiguration
# 
# Diese Datei enthält Anweisungen für die Einrichtung der Subdomain
# dash.gästefotos.com für das Admin-Dashboard

## Option 1: Über Plesk (Empfohlen)

1. In Plesk einloggen
2. Domain "gästefotos.com" auswählen
3. "Subdomains" → "Subdomain hinzufügen"
4. Subdomain: "dash"
5. Dokumentenverzeichnis: (kann leer bleiben, wird über Nginx gehandhabt)
6. SSL-Zertifikat zuweisen
7. Nach Erstellung: Nginx-Konfiguration anpassen (siehe nginx.conf.example)

## Option 2: Manuell (Nur wenn Plesk nicht verfügbar)

1. DNS-Eintrag erstellen:
   - Typ: A oder CNAME
   - Name: dash
   - Wert: Server-IP oder Hauptdomain

2. Nginx-Konfiguration erstellen:
   - Datei: /etc/nginx/plesk.conf.d/ip_default/dash.xn--gstefotos-v2a.com.conf
   - Inhalt: Siehe nginx.conf.example

3. SSL-Zertifikat konfigurieren:
   - Über Plesk oder Let's Encrypt

4. Nginx neu laden:
   ```bash
   nginx -t
   systemctl reload nginx
   ```

## DNS-Konfiguration

### Für gästefotos.com:
- Typ: A oder CNAME
- Name: dash
- Wert: [Server-IP] oder [Hauptdomain]

### Für xn--gstefotos-v2a.com (Punycode):
- Typ: A oder CNAME  
- Name: dash
- Wert: [Server-IP] oder [Hauptdomain]

## Port-Konfiguration

- **Admin-Dashboard:** Port 3001
- **Backend API:** Port 8001 (bestehend)
- **Frontend:** Port 3000 (bestehend)

## Testen

Nach der Konfiguration:
1. DNS-Propagierung abwarten (kann einige Minuten dauern)
2. Testen: `curl -I https://dash.gästefotos.com`
3. Im Browser öffnen: `https://dash.gästefotos.com`

