# ⚡ Schnell-Fix für 502 Error

## 🔴 Problem

502 Bad Gateway = Frontend oder Backend läuft nicht!

## ✅ Lösung (auf dem Server ausführen)

```bash
# 1. Alle Node-Prozesse prüfen/stoppen
pkill -f "next dev"
pkill -f "ts-node"

# 2. Frontend starten
cd /root/gaestefotos-app-v2/packages/frontend
nohup pnpm dev > /tmp/frontend.log 2>&1 &

# 3. Backend starten (falls nötig)
cd /root/gaestefotos-app-v2/packages/backend
nohup pnpm dev > /tmp/backend.log 2>&1 &

# 4. 5 Sekunden warten
sleep 5

# 5. Testen
curl http://localhost:3000
curl http://localhost:8001/api

# 6. Logs prüfen falls noch Probleme
tail -20 /tmp/frontend.log
tail -20 /tmp/backend.log
```

## 🚨 Falls das nicht funktioniert:

### Problem könnte sein: i18n-Struktur
Die neue `[locale]` Struktur benötigt eine angepasste Route-Struktur.

### Temporärer Workaround:
Falls die i18n-Struktur Probleme verursacht, können wir sie vorübergehend deaktivieren.

**Bitte führe zuerst die obigen Befehle aus und teile die Ausgabe!** 📋

