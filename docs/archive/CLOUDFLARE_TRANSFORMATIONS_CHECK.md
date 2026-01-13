# Cloudflare Verwaltete Transformationen

## Wichtig
Die "Verwalteten Transformationen" (Managed Transformations) sind normalerweise **NICHT** die Ursache für den 404-Fehler. Sie beeinflussen nur HTTP-Header, nicht die Routing-Logik.

## Was zu tun ist

### 1. Zuerst: Warte auf Page Rule Propagierung
- Warte **2-3 Minuten** nach dem Erstellen der Page Rule
- Teste dann erneut: `./test-socketio-api-ws.sh`

### 2. Falls es weiterhin nicht funktioniert

**Prüfe diese Einstellungen (falls nötig):**

#### HTTP-Anforderungsheader (Request Headers)
- **"True-Client-IP"-Header hinzufügen**: Kann helfen, wenn IP-basierte Blockierungen das Problem sind
- **Besucherstandort-Header hinzufügen**: Normalerweise nicht relevant

#### HTTP-Antwortheader (Response Headers)
- **Sicherheitsheader hinzufügen**: Normalerweise nicht relevant für Socket.IO
- **"X-Powered-by"-Header entfernen**: Normalerweise nicht relevant

## Wahrscheinlichere Ursachen

Falls der 404 weiterhin besteht, prüfe:

1. **Page Rule Reihenfolge**: Ist `/api/ws` Regel ganz oben?
2. **Page Rule Einstellungen**: Cache Level: Bypass aktiviert?
3. **Andere Page Rules**: Gibt es Regeln, die `/api` blockieren?
4. **Transform Rules**: Prüfe Rules → Transform Rules auf blockierende Regeln

## Testen

Nach dem Warten:
```bash
cd /root/gaestefotos-app-v2
./test-socketio-api-ws.sh
```

**Erwartetes Ergebnis:**
- HTTP Status: `200` oder `400` (vom Backend)
- **NICHT** `404` oder `308`
- Response: Socket.IO JSON

