# 🔧 502 Error Fix - app.gästefotos.com

**Datum:** 2025-12-06  
**Problem:** 502 Bad Gateway auf app.gästefotos.com

---

## 🐛 Identifizierte Probleme

### 1. Backend lief nicht
- **Problem:** Port 8001 war nicht belegt
- **Ursache:** Services waren nicht gestartet
- **Lösung:** Services mit `./start_services.sh` gestartet

### 2. Nginx-Konfiguration nicht aktiviert
- **Problem:** `/etc/nginx/sites-available/gaestefotos-v2.conf` existierte, war aber nicht in `sites-enabled`
- **Lösung:** Symbolischen Link erstellt und Nginx neu geladen

### 3. Nginx Server-Name Konflikte
- **Problem:** Mehrere Nginx-Konfigurationen für die gleiche Domain
- **Warnung:** `conflicting server name "app.gästefotos.com"`
- **Ursache:** Plesk-Konfiguration und manuelle Konfiguration überschneiden sich

---

## ✅ Durchgeführte Fixes

1. ✅ **Backend gestartet**
   ```bash
   ./start_services.sh
   ```

2. ✅ **Frontend gestartet**
   - Läuft auf Port 3000

3. ✅ **Nginx-Konfiguration aktiviert**
   ```bash
   ln -s /etc/nginx/sites-available/gaestefotos-v2.conf /etc/nginx/sites-enabled/
   nginx -t
   systemctl reload nginx
   ```

---

## ⚠️ Verbleibende Probleme

### Nginx Server-Name Konflikte

Es gibt mehrere Konfigurationen für `app.gästefotos.com`:
- `/etc/nginx/sites-available/gaestefotos-v2.conf` (manuell)
- `/etc/nginx/plesk.conf.d/ip_default/xn--gstefotos-v2a.com.conf` (Plesk)

**Lösung:** Eine der Konfigurationen sollte deaktiviert werden, oder beide sollten konsolidiert werden.

---

## 🔍 Aktuelle Status

- ✅ Backend läuft auf Port 8001
- ✅ Frontend läuft auf Port 3000
- ✅ Nginx-Konfiguration aktiviert
- ⚠️ Server-Name Konflikte vorhanden

---

## 📝 Nächste Schritte

1. Prüfe welche Nginx-Konfiguration tatsächlich verwendet wird
2. Deaktiviere oder konsolidiere doppelte Konfigurationen
3. Teste Domain erneut

---

## 🔧 Nginx-Konfiguration

**Aktive Konfiguration:** `/etc/nginx/sites-enabled/gaestefotos-v2.conf`

**Proxy-Einstellungen:**
- Frontend: `proxy_pass http://localhost:3000`
- Backend API: `proxy_pass http://localhost:8001`
- Health: `proxy_pass http://localhost:8001`
- WebSocket: `proxy_pass http://localhost:8001`
