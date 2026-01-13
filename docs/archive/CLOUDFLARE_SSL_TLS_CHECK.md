# Cloudflare SSL/TLS Einstellungen prüfen

## Einstellungen, die den 308-Redirect verursachen könnten

Gehe zu: **Cloudflare Dashboard → SSL/TLS → Overview**

### 1. SSL/TLS Verschlüsselungsmodus

**Prüfe den aktuellen Modus:**
- ✅ **"Flexible"** - OK für Socket.IO
- ✅ **"Full"** - OK für Socket.IO
- ✅ **"Full (strict)"** - OK für Socket.IO
- ⚠️ **"Off"** - Kann Probleme verursachen

**Empfehlung:** "Full" oder "Full (strict)" verwenden

### 2. Always Use HTTPS

**Wichtig:** Diese Einstellung kann den 308-Redirect verursachen!

**Wo finden:**
- SSL/TLS → Edge Certificates → "Always Use HTTPS"

**Was prüfen:**
- Ist "Always Use HTTPS" aktiviert?
- Falls ja, könnte dies den Redirect für `/socket.io` verursachen

**Lösung:**
- Die Page Rule mit "Cache Level: Bypass" sollte eigentlich Priorität haben
- Falls nicht, versuche "Always Use HTTPS" temporär zu deaktivieren und teste erneut

### 3. Automatic HTTPS Rewrites

**Wo finden:**
- SSL/TLS → Edge Certificates → "Automatic HTTPS Rewrites"

**Was prüfen:**
- Ist diese Option aktiviert?
- Sie könnte HTTP-zu-HTTPS-Rewrites verursachen

**Empfehlung:** Normalerweise OK, sollte Socket.IO nicht beeinträchtigen

### 4. Opportunistic Encryption

**Wo finden:**
- SSL/TLS → Edge Certificates → "Opportunistic Encryption"

**Was prüfen:**
- Normalerweise nicht problematisch für Socket.IO

### 5. Minimum TLS Version

**Wo finden:**
- SSL/TLS → Edge Certificates → "Minimum TLS Version"

**Was prüfen:**
- Sollte auf TLS 1.2 oder höher stehen
- Socket.IO sollte damit funktionieren

## Was du prüfen solltest

1. **"Always Use HTTPS"** - Das ist wahrscheinlich die Ursache!
   - Falls aktiviert, könnte es den 308-Redirect verursachen
   - Die Page Rule sollte eigentlich Priorität haben, aber manchmal funktioniert das nicht

2. **Page Rule Reihenfolge**
   - Stelle sicher, dass die Socket.IO-Regel **ganz oben** steht
   - Vor allen anderen Regeln, die HTTPS-Redirects verursachen könnten

3. **Test nach Änderungen**
   ```bash
   cd /root/gaestefotos-app-v2
   ./test-socketio-connection.sh
   ```

## Alternative Lösung

Falls "Always Use HTTPS" den Redirect verursacht und die Page Rule nicht hilft:

1. **Deaktiviere "Always Use HTTPS" temporär**
2. **Teste ob Socket.IO funktioniert**
3. Falls ja, dann ist "Always Use HTTPS" die Ursache
4. **Aktiviere "Always Use HTTPS" wieder**
5. **Versuche eine andere Lösung** (z.B. Socket.IO über `/api/ws` routen)

## Nächste Schritte

1. Prüfe die SSL/TLS-Einstellungen (besonders "Always Use HTTPS")
2. Teile mir mit, was du findest
3. Dann können wir die beste Lösung implementieren

