# Lösung ohne kostenpflichtigen Plan

## Problem
- Transform Rules mit "matches" Operator benötigen Business-Plan
- Page Rules funktionieren nicht gegen "Always Use HTTPS"
- Kein kostenpflichtiger Plan gewünscht

## Lösungen

### Option 1: "Always Use HTTPS" temporär deaktivieren (einfachste Lösung)

**Vorteile:**
- Funktioniert sofort
- Keine zusätzlichen Kosten
- Socket.IO funktioniert dann

**Nachteile:**
- HTTP-Anfragen werden nicht automatisch zu HTTPS umgeleitet
- Weniger sicher (aber HTTPS funktioniert trotzdem, nur keine automatische Umleitung)

**Schritte:**
1. Gehe zu: SSL/TLS → Edge Certificates
2. Scrolle zu "Always Use HTTPS"
3. Setze auf "Off"
4. Warte 1-2 Minuten
5. Teste Socket.IO

### Option 2: Socket.IO über Subdomain routen

**Vorgehen:**
- Erstelle eine Subdomain wie `ws.gästefotos.com`
- Diese Subdomain kann separate Cloudflare-Einstellungen haben
- "Always Use HTTPS" kann für diese Subdomain deaktiviert werden

**Nachteile:**
- Erfordert DNS-Konfiguration
- Erfordert Nginx-Konfiguration für die Subdomain

### Option 3: Socket.IO über anderen Port (nicht empfohlen)

**Vorgehen:**
- Socket.IO über Port 8080 oder ähnlich routen
- Nicht über Cloudflare, direkt zum Server

**Nachteile:**
- Umgeht Cloudflare komplett
- Kein DDoS-Schutz
- Nicht empfohlen

## Empfehlung

**Option 1** ist die einfachste Lösung:
1. "Always Use HTTPS" temporär deaktivieren
2. Socket.IO testen
3. Falls es funktioniert, können wir später eine bessere Lösung finden

**Wichtig:** HTTPS funktioniert trotzdem! Nur die automatische Umleitung von HTTP zu HTTPS wird deaktiviert.

