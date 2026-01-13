# 🔐 Test-Login-Informationen

**Datum:** 2025-12-06  
**Stand:** Aktuelle Test-Accounts aus der Datenbank

---

## 📋 Verfügbare Test-Accounts

### Account 1 (Empfohlen)
**Email:** `admin@test.com`  
**Passwort:** `admin123`  
**Erstellt:** 2025-12-05

### Account 2
**Email:** `test@test.com`  
**Passwort:** `test123` (vermutlich)  
**Erstellt:** 2025-12-06

### Account 3
**Email:** `test@example.com`  
**Passwort:** `test123` (vermutlich)  
**Erstellt:** 2025-12-05

---

## 🚀 Login-URLs

### Lokal (Entwicklung)
- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8001`

### Produktion
- **Frontend:** `https://app.gästefotos.com` oder `http://65.109.71.182:3000`
- **Backend API:** `https://app.gästefotos.com/api` oder `http://65.109.71.182:8001`

---

## ✅ Login testen

### Über die Web-Oberfläche

1. Öffne `http://localhost:3000` (oder Produktions-URL)
2. Klicke auf **"Anmelden"** oder **"Login"**
3. Gib die Test-Credentials ein:
   - **Email:** `admin@test.com`
   - **Passwort:** `admin123`
4. Klicke auf **"Anmelden"**

### Über die API (curl)

```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

**Erfolgreiche Antwort:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@test.com",
    "name": "..."
  }
}
```

---

## 🔑 Neuen Test-User erstellen

### Über die Web-Oberfläche

1. Öffne die Registrierungsseite
2. Fülle das Formular aus:
   - **Name**: Test User
   - **Email**: neue-email@example.com
   - **Passwort**: test123
3. Klicke auf **"Registrieren"**

### Über die API

```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "neue-email@example.com",
    "password": "test123",
    "name": "Test User"
  }'
```

---

## 🔍 Alle User in Datenbank anzeigen

```bash
cd /root/gaestefotos-app-v2/packages/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({ 
  orderBy: { createdAt: 'desc' },
  select: { email: true, createdAt: true }
}).then(users => {
  console.log('Verfügbare User:');
  users.forEach(u => console.log(\`  - \${u.email} (erstellt: \${u.createdAt})\`));
  prisma.\$disconnect();
});
"
```

---

## 📝 Wichtige Hinweise

1. **Standard-Passwörter:**
   - `admin123` für `admin@test.com`
   - `test123` für andere Test-Accounts

2. **Neue User:** Können über die Registrierungsseite erstellt werden

3. **Datenbank:** User werden in PostgreSQL gespeichert
   - Datenbank: `gaestefotos_v2`
   - Tabelle: `User`

4. **Token:** Nach erfolgreichem Login erhältst du ein JWT-Token für API-Aufrufe

---

## ⚠️ Falls Login nicht funktioniert

1. **Prüfe ob Services laufen:**
   ```bash
   cd /root/gaestefotos-app-v2
   ./check_services.sh
   ```

2. **Erstelle neuen Test-User:**
   ```bash
   curl -X POST http://localhost:8001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "test123",
       "name": "Test User"
     }'
   ```

3. **Prüfe Backend-Logs:**
   ```bash
   tail -f /tmp/backend.log
   ```

---

## ✅ Empfohlene Test-Credentials

**Für schnelle Tests:**
- **Email:** `admin@test.com`
- **Passwort:** `admin123`

Diese Credentials sind in der LOGIN_FIX.md dokumentiert und sollten funktionieren.
