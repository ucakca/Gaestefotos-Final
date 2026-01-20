# 🔥 Firewall & External Access Fix

## ✅ Was wurde geändert:

1. **Server hört jetzt auf 0.0.0.0**
   - Vorher: `localhost` (nur lokal erreichbar)
   - Jetzt: `0.0.0.0` (von überall erreichbar)

2. **CORS konfiguriert**
   - Erlaubt externe Zugriffe
   - Frontend URLs konfiguriert

3. **Port 8001 ist in iptables geöffnet**
   - Regel vorhanden: `ACCEPT tcp dpt:8001`

---

## 🌐 Externe Zugriff:

### API Endpoints:
- **Health Check**: http://65.109.71.182:8001/health
- **API Base**: http://65.109.71.182:8001/api

### Frontend URL anpassen (falls nötig):
Backend `.env`:
```env
FRONTEND_URL=http://65.109.71.182:3000,https://app.gästefotos.com
```

---

## 🔧 Plesk Firewall (falls noch Probleme):

Falls Port 8001 nicht erreichbar ist, in Plesk:
1. **Tools & Settings** → **Firewall**
2. **Port 8001 TCP** hinzufügen
3. Regel speichern

Oder per Kommandozeile:
```bash
# Plesk Firewall Rule hinzufügen (falls verfügbar)
# Oder direkt iptables:
iptables -I INPUT -p tcp --dport 8001 -j ACCEPT
iptables-save > /etc/iptables/rules.v4
```

---

## ✅ Status:

- ✅ Server hört auf 0.0.0.0:8001
- ✅ CORS konfiguriert
- ✅ iptables Regel vorhanden
- ✅ Server neu gestartet

**Jetzt sollte http://65.109.71.182:8001/api erreichbar sein!** 🎉

