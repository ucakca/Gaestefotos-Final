# Sicherheitshinweis: "Always Use HTTPS" deaktiviert

## Aktueller Status
"Always Use HTTPS" wurde temporär deaktiviert, um Socket.IO zu testen.

## Sicherheitsaspekte

### Was bedeutet "Always Use HTTPS" deaktiviert?

**Funktioniert weiterhin:**
- ✅ HTTPS funktioniert normal (https://app.gästefotos.com)
- ✅ SSL/TLS Verschlüsselung ist aktiv
- ✅ Zertifikate sind gültig

**Was nicht mehr funktioniert:**
- ❌ Automatische Umleitung von HTTP zu HTTPS
- ❌ Benutzer können über HTTP zugreifen (unsicher)

### Sicherheitsrisiko

**Niedrig bis Mittel:**
- Die meisten Benutzer verwenden HTTPS direkt
- Moderne Browser warnen vor unsicheren Verbindungen
- Aber: Man-in-the-Middle Angriffe über HTTP sind möglich

## Lösungen

### Option 1: Nur für /ws deaktivieren (nicht möglich)
- Cloudflare erlaubt keine selektive Deaktivierung
- Entweder global an oder aus

### Option 2: Socket.IO über Subdomain
- Erstelle `ws.gästefotos.com`
- "Always Use HTTPS" nur für diese Subdomain deaktivieren
- Hauptdomain bleibt sicher

### Option 3: Socket.IO über anderen Mechanismus
- WebSocket direkt über Port (nicht über Cloudflare)
- Oder über einen anderen Service

### Option 4: Business-Plan kaufen
- Transform Rules mit "matches" Operator
- Könnte selektive Regeln ermöglichen

## Empfehlung

**Kurzfristig:**
- Teste ob Socket.IO funktioniert
- Wenn ja, können wir eine bessere Lösung finden

**Langfristig:**
- Option 2 (Subdomain) ist die beste Lösung ohne Business-Plan
- Oder "Always Use HTTPS" wieder aktivieren und eine andere Lösung finden

## Wieder aktivieren

Falls wir "Always Use HTTPS" wieder aktivieren müssen:

```bash
cd /root/gaestefotos-app-v2
source .cloudflare.env
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/9fc4b607fdf3ee4ef3d574fd2938e388/settings/always_use_https" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"on"}'
```

