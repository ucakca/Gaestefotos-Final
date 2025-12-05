# 🚀 Setup-Status - Gästefotos V2

## ✅ Erfolgreich abgeschlossen:

1. ✅ **Projekt-Struktur** - Alle Dateien erstellt
2. ✅ **Dependencies** - 675 Pakete installiert
3. ✅ **Shared Package** - TypeScript kompiliert
4. ✅ **Prisma Client** - Generiert
5. ✅ **.env Dateien** - Erstellt (Backend + Frontend)
6. ✅ **pnpm-workspace.yaml** - Erstellt
7. ✅ **Sharp** - Installiert für Image Processing

---

## ⚠️ Noch zu erledigen:

### 1. PostgreSQL Konfiguration

**Problem:** PostgreSQL Authentifizierung fehlgeschlagen

**Lösung Optionen:**

#### Option A: PostgreSQL User/Passwort anpassen
```bash
# 1. Passwort für postgres User setzen:
sudo -u postgres psql
ALTER USER postgres PASSWORD 'dein_passwort';

# 2. .env anpassen:
# DATABASE_URL=postgresql://postgres:dein_passwort@localhost:5432/gaestefotos_v2
```

#### Option B: Neue Datenbank mit anderem User erstellen
```bash
# 1. Neuen User erstellen:
sudo -u postgres psql
CREATE USER gaestefotos WITH PASSWORD 'sicheres_passwort';
CREATE DATABASE gaestefotos_v2 OWNER gaestefotos;
GRANT ALL PRIVILEGES ON DATABASE gaestefotos_v2 TO gaestefotos;

# 2. .env anpassen:
# DATABASE_URL=postgresql://gaestefotos:sicheres_passwort@localhost:5432/gaestefotos_v2
```

#### Option C: PostgreSQL ohne Passwort konfigurieren (nur Development!)
```bash
# pg_hba.conf anpassen (nur für lokale Entwicklung!)
# /etc/postgresql/16/main/pg_hba.conf
# Ändern: md5 -> trust für local connections
```

---

### 2. Database Migration ausführen

**Nach PostgreSQL Setup:**
```bash
cd /root/gaestefotos-app-v2/packages/backend
pnpm prisma migrate dev --name init
```

---

### 3. SeaweedFS Verbindung testen

**Prüfen ob SeaweedFS läuft:**
```bash
# Prüfen ob SeaweedFS auf Port 8333 läuft:
curl http://localhost:8333/

# Oder S3 API testen:
# Die .env sollte bereits konfiguriert sein
```

---

### 4. Development Server starten

**Backend:**
```bash
cd /root/gaestefotos-app-v2/packages/backend
pnpm dev
# Läuft auf http://localhost:8001
```

**Frontend:**
```bash
cd /root/gaestefotos-app-v2/packages/frontend
pnpm dev
# Läuft auf http://localhost:3000
```

**Oder beide gleichzeitig:**
```bash
cd /root/gaestefotos-app-v2
pnpm dev
```

---

## 📋 Checkliste:

- [x] Dependencies installiert
- [x] Shared Package gebaut
- [x] Prisma Client generiert
- [x] .env Dateien erstellt
- [ ] PostgreSQL konfiguriert & Datenbank erstellt
- [ ] Database Migration ausgeführt
- [ ] SeaweedFS Verbindung getestet
- [ ] Backend Server gestartet
- [ ] Frontend Server gestartet

---

## 🔧 Aktuelle Konfiguration:

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gaestefotos_v2
SEAWEEDFS_ENDPOINT=localhost:8333
JWT_SECRET=902a2ba14515aaf830d9a90e21ada3ff12371666de653cebaf92352482bb297f
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_WS_URL=http://localhost:8001
```

---

## 📝 Nächste Schritte:

1. **PostgreSQL Credentials anpassen** (siehe oben)
2. **Database Migration ausführen**
3. **Server starten** und testen
4. **Superadmin erstellen** via `/api/auth/register`

---

**Status: BEREIT - Nur PostgreSQL Setup fehlt!** 🎯

