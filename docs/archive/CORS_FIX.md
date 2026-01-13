# 🔧 CORS-Fix für Network Error beim Anmelden

**Datum:** 2025-12-06  
**Problem:** Network Error beim Login aufgrund von CORS-Blockierung

## ✅ Behobene Probleme

### 1. Frontend API-URL korrigiert
**Vorher:**
```env
NEXT_PUBLIC_API_URL=https://app.xn--gstefotos-v2a.com/api
```

**Nachher:**
```env
NEXT_PUBLIC_API_URL=http://65.109.71.182:8001
```

**Datei:** `/root/gaestefotos-app-v2/packages/frontend/.env.local`

### 2. Backend CORS-Konfiguration erweitert
**Vorher:**
```env
FRONTEND_URL=https://app.xn--gstefotos-v2a.com,http://localhost:3000
```

**Nachher:**
```env
FRONTEND_URL=http://65.109.71.182:3000,http://localhost:3000,https://app.xn--gstefotos-v2a.com
```

**Datei:** `/root/gaestefotos-app-v2/packages/backend/.env`

## 🔄 Nächste Schritte

1. **Frontend neu laden**: Drücke F5 im Browser oder lade die Seite neu
2. **Backend neu starten** (falls nötig):
   ```bash
   cd /root/gaestefotos-app-v2/packages/backend
   pnpm dev
   ```

## ✅ Verifizierung

Der Login sollte jetzt funktionieren:
- ✅ API-URL zeigt auf lokales Backend
- ✅ CORS erlaubt Anfragen von `http://65.109.71.182:3000`
- ✅ Backend läuft auf Port 8001

## 🐛 Falls weiterhin Probleme auftreten

1. Prüfe Browser-Konsole (F12) für weitere Fehler
2. Prüfe Backend-Logs: `/tmp/backend.log`
3. Prüfe Frontend-Logs: `/tmp/frontend.log`
4. Stelle sicher, dass beide Services laufen:
   ```bash
   ps aux | grep -E "tsx|next"
   ```
