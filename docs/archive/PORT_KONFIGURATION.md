# 🔌 Port-Konfiguration - Gästefotos V2

**Stand:** 2025-12-06

---

## 📡 Aktive Ports

### Backend API
- **Port:** `8001`
- **Protokoll:** HTTP
- **Zugriff:** 
  - Lokal: `http://localhost:8001`
  - Extern: `http://65.109.71.182:8001`
- **Endpoints:**
  - Health: `http://localhost:8001/health`
  - API Root: `http://localhost:8001/api`
  - WebSocket: `ws://localhost:8001` (Socket.io)

### Frontend
- **Standard-Port:** `3000`
- **Fallback-Port:** `3001` (wenn 3000 belegt)
- **Protokoll:** HTTP
- **Zugriff:**
  - Lokal: `http://localhost:3000` oder `http://localhost:3001`
  - Extern: `http://65.109.71.182:3000` oder `http://65.109.71.182:3001`

---

## ⚙️ Konfiguration

### Backend Port

**Datei:** `/root/gaestefotos-app-v2/packages/backend/.env`

```env
PORT=8001
```

**Code:** `/root/gaestefotos-app-v2/packages/backend/src/index.ts`

```typescript
const PORT = process.env.PORT || 8001;
```

### Frontend Port

**Standard:** Next.js verwendet Port 3000 standardmäßig

**Ändern:**
```bash
cd packages/frontend
PORT=3001 pnpm dev
```

Oder in `package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p 3001"
  }
}
```

### Frontend API-URL

**Datei:** `/root/gaestefotos-app-v2/packages/frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://65.109.71.182:8001
NEXT_PUBLIC_WS_URL=http://65.109.71.182:8001
```

---

## 🌐 Externe Zugriffe

### Aktuelle Konfiguration

- **Backend:** `http://65.109.71.182:8001`
- **Frontend:** `http://65.109.71.182:3000` oder `http://65.109.71.182:3001`

### CORS-Konfiguration

**Backend:** `/root/gaestefotos-app-v2/packages/backend/.env`

```env
FRONTEND_URL=http://65.109.71.182:3000,http://localhost:3000,https://app.xn--gstefotos-v2a.com
```

**Code:** `/root/gaestefotos-app-v2/packages/backend/src/index.ts`

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## 🔍 Port-Prüfung

### Aktuelle Ports prüfen

```bash
# Alle Ports
netstat -tlnp | grep -E ":(3000|3001|8001)"
# oder
ss -tlnp | grep -E ":(3000|3001|8001)"

# Einzelne Ports
lsof -i :8001
lsof -i :3000
lsof -i :3001
```

### Port-Status mit Script

```bash
cd /root/gaestefotos-app-v2
./check_services.sh
```

---

## 📋 Port-Übersicht

| Service | Port | Protokoll | Zugriff |
|---------|------|-----------|---------|
| Backend API | 8001 | HTTP | `http://localhost:8001` |
| Backend WebSocket | 8001 | WebSocket | `ws://localhost:8001` |
| Frontend (Standard) | 3000 | HTTP | `http://localhost:3000` |
| Frontend (Fallback) | 3001 | HTTP | `http://localhost:3001` |

---

## 🔧 Port ändern

### Backend Port ändern

1. `.env` Datei bearbeiten:
```bash
cd /root/gaestefotos-app-v2/packages/backend
nano .env
# PORT=8002  # Neuer Port
```

2. CORS anpassen (falls nötig)

3. Backend neu starten

### Frontend Port ändern

1. Port beim Start angeben:
```bash
cd /root/gaestefotos-app-v2/packages/frontend
PORT=3002 pnpm dev
```

2. Oder `package.json` anpassen

---

## 🚨 Wichtige Hinweise

1. **Port 8001** ist für das Backend reserviert
2. **Port 3000** ist der Standard für Next.js Frontend
3. **Port 3001** wird automatisch verwendet, wenn 3000 belegt ist
4. **CORS** muss angepasst werden, wenn Ports geändert werden
5. **Firewall** muss Ports freigeben für externe Zugriffe

---

## ✅ Aktuelle Status

Prüfe mit:
```bash
./check_services.sh
```

Oder:
```bash
curl http://localhost:8001/health
curl http://localhost:3000
curl http://localhost:3001
```
