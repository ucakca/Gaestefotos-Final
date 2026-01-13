# ✅ Firewall & Server Status - FINAL

## Status:

### ✅ Server:
- **Läuft als systemd Service**: `gaestefotos-backend`
- **Port**: 8001 auf 0.0.0.0
- **Status**: Aktiv und stabil

### ✅ Firewall:
- **iptables Regel**: Port 8001 ist ALLOW
- **INPUT Policy**: DROP (aber ACCEPT-Regel für 8001 ist Oben)
- **Regel Position**: Ganz oben in der Chain (sollte funktionieren)

---

## ⚠️ Problem:

**INPUT Policy ist DROP!** Das bedeutet:
- Die erste ACCEPT-Regel für Port 8001 sollte greifen
- ABER: Die Regel muss VOR anderen Blocking-Regeln stehen

**Aktuelle Position:**
```
Chain INPUT (policy DROP)
  31  1959 ACCEPT  tcp -- * * 0.0.0.0/0  0.0.0.0/0  tcp dpt:8001  ← Diese Regel ist ERSTE!
  ... weitere Regeln ...
```

Das sollte funktionieren! Die ACCEPT-Regel steht ganz oben.

---

## 🔍 Test:

```bash
# Von extern
curl http://65.109.71.182:8001/health

# Sollte funktionieren, da:
# 1. Server läuft ✅
# 2. Port ist geöffnet ✅  
# 3. iptables Regel ist oben ✅
```

---

## 📋 Falls es immer noch nicht funktioniert:

### In Plesk Web-Interface:
1. **Tools & Settings** → **Firewall**
2. Prüfe ob Port 8001 explizit erlaubt ist
3. Falls nicht: **Add Custom Rule** → Port 8001 TCP Allow

### Alternative:
Die Plesk Firewall könnte die iptables-Regeln überschreiben. In diesem Fall muss die Regel in Plesk selbst gesetzt werden.

---

## ✅ Service-Verwaltung:

```bash
# Status
systemctl status gaestefotos-backend

# Neustart
systemctl restart gaestefotos-backend

# Logs
journalctl -u gaestefotos-backend -f

# Stop
systemctl stop gaestefotos-backend
```

**Server läuft jetzt stabil als systemd Service!** 🎉

