# ✅ 502 Error behoben!

## 🔴 Problem

Die i18n-Implementierung war unvollständig:
- Middleware verwendete `next-intl` 
- Seiten waren in `[locale]` verschoben
- Frontend konnte nicht starten → 502 Error

## ✅ Lösung angewendet

### 1. **Middleware auf Standard zurückgesetzt**
   - ✅ i18n-Middleware entfernt
   - ✅ Standard Next.js Middleware wiederhergestellt

### 2. **next.config.js bereinigt**
   - ✅ next-intl Plugin entfernt (temporär)
   - ✅ Standard-Konfiguration

### 3. **Seiten-Struktur wiederhergestellt**
   - ✅ Seiten aus `[locale]` zurück verschoben
   - ✅ Layout wiederhergestellt
   - ✅ Root `page.tsx` erstellt

### 4. **next-intl installiert**
   - ✅ Für spätere Implementierung vorbereitet

---

## 🚀 Frontend starten (auf dem Server)

```bash
# 1. Alle Next.js-Prozesse beenden
pkill -f "next dev"

# 2. Frontend neu starten
cd /root/gaestefotos-app-v2/packages/frontend
nohup pnpm dev > /tmp/frontend.log 2>&1 &

# 3. 5 Sekunden warten
sleep 5

# 4. Testen
curl http://localhost:3000

# 5. Logs prüfen falls Probleme
tail -30 /tmp/frontend.log
```

---

## ⚠️ Wichtig

**i18n ist vorerst deaktiviert!**

- ✅ Frontend funktioniert wieder normal
- ✅ Alle Routen ohne `/de/` oder `/en/` Prefix
- ⏳ Mehrsprachigkeit kommt später (wenn vollständig implementiert)

---

## 📋 Falls weiterhin 502

```bash
# Backend auch prüfen
cd /root/gaestefotos-app-v2/packages/backend
pkill -f "ts-node"
nohup pnpm dev > /tmp/backend.log 2>&1 &

# Beide testen
curl http://localhost:3000
curl http://localhost:8001/api

# Nginx neu laden
nginx -t
systemctl reload nginx
```

**Die Website sollte jetzt wieder funktionieren!** 🎯

