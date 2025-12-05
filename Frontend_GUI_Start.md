# 🖥️ Frontend GUI starten

## Problem:
Die API (Port 8001) gibt nur JSON zurück - keine grafische Oberfläche.

## Lösung:
Das Frontend muss gestartet werden, um die GUI zu erhalten.

---

## 🚀 Frontend starten:

### Manuell:
```bash
cd /root/gaestefotos-app-v2/packages/frontend
pnpm dev
```

### Als Background-Service:
```bash
cd /root/gaestefotos-app-v2/packages/frontend
pnpm dev > /tmp/frontend.log 2>&1 &
```

---

## 🌐 Zugriff:

### Frontend (GUI):
- **Lokal**: http://localhost:3000
- **Extern**: http://65.109.71.182:3000

### Backend (API - nur JSON):
- **API Root**: http://65.109.71.182:8001/api
- **Health**: http://65.109.71.182:8001/health

---

## 📋 Was ist was:

- **Port 8001** = Backend API (JSON)
- **Port 3000** = Frontend GUI (HTML/React)

---

## ✅ Nach Frontend-Start:

1. Gehe zu: **http://65.109.71.182:3000**
2. Registriere einen Account oder Login
3. Erstelle Events über die GUI

**Das Frontend ist die grafische Benutzeroberfläche!** 🎨

