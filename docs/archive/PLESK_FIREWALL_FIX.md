# 🔥 Plesk Firewall Fix für Port 8001

## Problem:
- Server läuft lokal ✅
- iptables Regel vorhanden ✅
- Aber externer Zugriff wird blockiert ❌

## Lösung:

### Option 1: Plesk Web-Interface
1. Gehe zu **Tools & Settings** → **Firewall**
2. Klicke auf **Add Custom Rule**
3. Trage ein:
   - **Port**: 8001
   - **Protocol**: TCP
   - **Action**: Allow
   - **Comment**: Gästefotos API
4. Speichern

### Option 2: Per Kommandozeile
Falls Plesk Firewall direkt konfigurierbar ist:
```bash
# Plesk Firewall Regeln prüfen
plesk bin firewall -l

# Firewall Regel hinzufügen (falls möglich)
# Dies variiert je nach Plesk Version
```

### Option 3: iptables direkt (bereits gemacht)
```bash
iptables -I INPUT -p tcp --dport 8001 -j ACCEPT
iptables-save > /etc/iptables/rules.v4
```

---

## Systemd Service Status:

Der Backend-Service läuft jetzt als systemd Service:
```bash
# Status prüfen
systemctl status gaestefotos-backend

# Logs ansehen
journalctl -u gaestefotos-backend -f

# Neustart
systemctl restart gaestefotos-backend
```

---

## Test:
```bash
# Von extern
curl http://65.109.71.182:8001/health

# Sollte zurückgeben:
{"status":"healthy","version":"2.0.0"}
```

**Wichtig:** Die Plesk Firewall könnte iptables-Regeln überschreiben. Prüfe daher die Plesk Firewall-Konfiguration im Web-Interface!

