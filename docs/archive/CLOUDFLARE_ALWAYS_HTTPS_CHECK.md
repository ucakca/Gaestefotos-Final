# Cloudflare "Always Use HTTPS" prüfen

## Wo finden

1. Gehe zu: **SSL/TLS** → **Edge Certificates**
2. Scrolle nach unten zu **"Always Use HTTPS"**
3. Prüfe ob der Schalter **aktiviert** (ON) oder **deaktiviert** (OFF) ist

## Was bedeutet "Always Use HTTPS"

Diese Einstellung leitet alle HTTP-Anfragen automatisch zu HTTPS um. Das kann auch Socket.IO-Anfragen betreffen und den 308-Redirect verursachen.

## Was du prüfen solltest

**Ist "Always Use HTTPS" aktiviert?**
- ✅ **AUS (OFF)**: Dann ist das nicht die Ursache
- ⚠️ **AN (ON)**: Das könnte der Grund für den 308-Redirect sein

## Falls "Always Use HTTPS" aktiviert ist

Die Page Rule mit "Cache Level: Bypass" sollte eigentlich Priorität haben, aber manchmal funktioniert das nicht.

**Option 1: Temporär deaktivieren und testen**
1. Deaktiviere "Always Use HTTPS" temporär
2. Warte 1-2 Minuten
3. Teste die Socket.IO-Verbindung
4. Falls es funktioniert, dann war das die Ursache

**Option 2: Alternative Lösung implementieren**
Falls "Always Use HTTPS" aktiviert bleiben muss, können wir Socket.IO über einen anderen Pfad routen (z.B. `/api/ws`), der nicht von "Always Use HTTPS" betroffen ist.

## Weitere mögliche Ursachen

Falls "Always Use HTTPS" nicht aktiviert ist, könnte es sein:

1. **Andere Page Rules** - Prüfe ob es andere Regeln gibt, die `/socket.io` betreffen
2. **Transform Rules** - Prüfe Rules → Transform Rules
3. **Cloudflare Cache** - Versuche den Cache zu leeren
4. **Propagierung** - Warte noch 2-3 Minuten, falls die Page Rule gerade erstellt wurde

## Nächste Schritte

1. Prüfe ob "Always Use HTTPS" aktiviert ist
2. Teile mir das Ergebnis mit
3. Dann können wir die beste Lösung implementieren

