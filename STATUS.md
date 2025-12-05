# 📊 Projekt-Status - Gästefotos V2

**Stand:** $(date +"%d.%m.%Y %H:%M")

## ✅ Was funktioniert

### Backend
- ✅ Node.js/Express Backend läuft auf Port 8001
- ✅ PostgreSQL Datenbank verbunden
- ✅ Prisma ORM konfiguriert
- ✅ JWT Authentication
- ✅ SeaweedFS S3 API Integration
- ✅ Sharp Image Processing
- ✅ Socket.io WebSockets
- ✅ API Endpoints: `/api/auth/*`, `/api/events/*`, `/api/events/:eventId/photos/*`

### Frontend
- ✅ Next.js 14 Frontend läuft auf Port 3000
- ✅ Login-Seite funktioniert (Branding vorhanden)
- ✅ Register-Seite
- ✅ Dashboard
- ✅ Event Management (Erstellen, Bearbeiten, Anzeigen)
- ✅ Responsive Design
- ✅ Brand-Farben konsistent (#295B4D, #F9F5F2, #EAA48F)

### Infrastructure
- ✅ Nginx Reverse Proxy konfiguriert
- ✅ SSL über Cloudflare (app.xn--gstefotos-v2a.com)
- ✅ Domain auf Punycode umgestellt

## 🔧 Konfiguration

### Backend Start
```bash
cd /root/gaestefotos-app-v2/packages/backend
pnpm dev
```

### Frontend Start
```bash
cd /root/gaestefotos-app-v2/packages/frontend
pnpm dev
```

### Oder beide gleichzeitig (Monorepo Root):
```bash
cd /root/gaestefotos-app-v2
pnpm dev:backend &  # Im Hintergrund
pnpm dev:frontend   # Im Vordergrund
```

## 📁 Wichtige Dateien

### Konfiguration
- Backend `.env`: `/root/gaestefotos-app-v2/packages/backend/.env`
- Frontend `.env.local`: `/root/gaestefotos-app-v2/packages/frontend/.env.local`
- Nginx Config: `/etc/nginx/plesk.conf.d/vhosts/app.xn--gstefotos-v2a.com.conf`

### Hauptkomponenten
- Login: `packages/frontend/src/app/login/page.tsx`
- Dashboard: `packages/frontend/src/app/dashboard/page.tsx`
- Event Routes: `packages/backend/src/routes/events.ts`
- Auth Routes: `packages/backend/src/routes/auth.ts`

## 🔍 Bekannte Issues / Offene Punkte

1. **Weißer Bildschirm behoben** ✅
   - Problem war Framer Motion
   - Jetzt ohne Animations-Library

2. **Branding verbessert** ✅
   - Logo hinzugefügt
   - Schatten und Hover-Effekte

## 📝 Nächste Schritte

1. Photo Upload funktional testen
2. Guest Management UI testen
3. Live Wall (WebSocket) testen
4. QR-Code Scanner testen
5. Production Build erstellen
6. Systemd Services einrichten für Auto-Start

## 🔐 Credentials

**⚠️ WICHTIG:** Diese Datei sollte NICHT in Git committed werden!
Credentials sind in `.env` Dateien gespeichert.

## 💾 Git Commands

```bash
# Status prüfen
git status

# Alle Änderungen hinzufügen
git add .

# Commit erstellen
git commit -m "Feat: Login-Seite mit Branding, weißer Bildschirm behoben"

# Push (falls Remote konfiguriert)
git push
```

---

**Erstellt:** $(date +"%d.%m.%Y %H:%M")
**Von:** AI Assistant
