# 🌐 Zugriffs-Anleitung

## 📍 Wichtiger Unterschied:

### Port 8001 = Backend API (nur JSON)
- **URL**: http://65.109.71.182:8001/api
- **Gibt zurück**: JSON-Daten
- **Keine GUI** - nur für API-Aufrufe

### Port 3000 = Frontend GUI (grafische Oberfläche)
- **URL**: http://65.109.71.182:3000
- **Gibt zurück**: HTML/React-Interface
- **Das ist die GUI!** 🎨

---

## 🖥️ Frontend GUI verwenden:

1. **Gehe zu**: http://65.109.71.182:3000
2. **Registrieren**: `/register`
   - Erstelle einen neuen Account
3. **Login**: `/login`
   - Melde dich an
4. **Dashboard**: `/dashboard`
   - Erstelle Events, verwalte Fotos, etc.

---

## 🔧 Service-Status:

- ✅ **Backend API**: Läuft auf Port 8001
- ✅ **Frontend GUI**: Läuft auf Port 3000
- ✅ **Firewall**: Port 3000 ist geöffnet

---

## 📋 Verfügbare Seiten:

- `/` - Home (Weiterleitung)
- `/login` - Login
- `/register` - Registrierung
- `/dashboard` - Event-Übersicht
- `/events/new` - Neues Event erstellen
- `/events/:id` - Event-Details
- `/e/:slug` - Öffentliche Event-Seite
- `/moderation` - Foto-Moderation

---

**Die GUI ist unter http://65.109.71.182:3000 erreichbar!** 🎉

