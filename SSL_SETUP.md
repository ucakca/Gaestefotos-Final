# ✅ SSL Setup für app.gästefotos.com

## 🔒 Was wurde konfiguriert:

### 1. Nginx Reverse Proxy:
- ✅ Frontend (Next.js) auf Port 3000
- ✅ Backend API auf Port 8001
- ✅ WebSocket Support für `/socket.io`
- ✅ Health Check unter `/health`

### 2. SSL Zertifikat:
- ✅ Plesk verwaltet SSL-Zertifikat
- ✅ Pfad: `/opt/psa/var/certificates/scf5knujem5he0u1yZuLON`
- ✅ HTTP zu HTTPS Redirect aktiv

### 3. Domain:
- ✅ `app.gästefotos.com` (Punycode: `app.xn--gstefotos-v2a.com`)
- ✅ IPv4 und IPv6 Support

### 4. Konfiguration:
- ✅ Plesk vhost Datei angepasst
- ✅ Separate Include-Datei für Proxy-Settings

---

## 📝 Wichtige Dateien:

1. **Plesk vhost**: `/etc/nginx/plesk.conf.d/vhosts/app.xn--gstefotos-v2a.com.conf`
2. **Proxy Include**: `/etc/nginx/plesk.conf.d/vhosts/app.xn--gstefotos-v2a.com.include.conf`

---

## ⚠️ Wichtiger Hinweis:

**Plesk generiert die vhost Datei automatisch!** 

Falls Plesk die Datei neu generiert, müssen die Proxy-Einstellungen erneut hinzugefügt werden. Alternativ kann man die Proxy-Einstellungen über das Plesk Panel (Domain → Apache & nginx Settings) konfigurieren.

---

## 🧪 Testen:

```bash
# Health Check
curl -k https://app.gästefotos.com/health

# API Test
curl -k https://app.gästefotos.com/api

# Frontend
curl -k https://app.gästefotos.com/
```

---

## ✅ Status:

- ✅ SSL konfiguriert
- ✅ Reverse Proxy aktiv
- ✅ Domain erreichbar
- ⚠️ Plesk kann Konfiguration überschreiben

**Die App sollte jetzt über https://app.gästefotos.com erreichbar sein!** 🔒

