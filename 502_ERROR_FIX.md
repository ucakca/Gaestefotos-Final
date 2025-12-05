# 🔧 502 Bad Gateway - Fehlerbehebung

## 🔍 Mögliche Ursachen

Der 502 Fehler tritt auf, wenn Cloudflare/Nginx das Frontend/Backend nicht erreichen kann.

### **Problem 1: Frontend läuft nicht**
Die Next.js-App muss auf Port 3000 laufen.

### **Problem 2: i18n-Struktur Problem**
Die neue `[locale]` Struktur könnte Probleme verursachen, wenn die Middleware nicht richtig konfiguriert ist.

---

## ✅ Lösungsschritte

### **Schritt 1: Prüfen ob Frontend läuft**

```bash
# Auf dem Server einloggen
ssh root@65.109.71.182

# Prüfen ob Next.js läuft
ps aux | grep -E 'next|node' | grep -v grep

# Prüfen ob Port 3000 verwendet wird
netstat -tlnp | grep 3000

# Prüfen ob Frontend erreichbar ist
curl http://localhost:3000
```

### **Schritt 2: Frontend starten**

```bash
cd /root/gaestefotos-app-v2/packages/frontend

# Im Hintergrund starten
nohup pnpm dev > /tmp/frontend.log 2>&1 &

# Oder mit screen/tmux für dauerhaften Betrieb
screen -S frontend
cd /root/gaestefotos-app-v2/packages/frontend
pnpm dev
# Ctrl+A, dann D zum Detachen
```

### **Schritt 3: Backend prüfen**

```bash
# Prüfen ob Backend läuft
ps aux | grep node | grep backend

# Prüfen Port 8001
netstat -tlnp | grep 8001

# Backend testen
curl http://localhost:8001/api

# Backend starten falls nötig
cd /root/gaestefotos-app-v2/packages/backend
pnpm dev > /tmp/backend.log 2>&1 &
```

### **Schritt 4: Nginx-Konfiguration prüfen**

```bash
# Nginx-Config prüfen
cat /etc/nginx/plesk.conf.d/vhosts/app.xn--gstefotos-v2a.com.conf | grep -A 20 "location /"

# Nginx neu laden falls Config geändert wurde
nginx -t
systemctl reload nginx
```

### **Schritt 5: Logs prüfen**

```bash
# Frontend-Logs
tail -50 /tmp/frontend.log

# Backend-Logs
tail -50 /tmp/backend.log

# Nginx-Error-Logs
tail -50 /var/log/nginx/error.log
```

---

## 🚨 Schnell-Fix: Frontend neu starten

Falls das Problem durch die i18n-Änderungen verursacht wurde:

```bash
# Alle Next.js-Prozesse beenden
pkill -f "next dev"

# Frontend neu starten
cd /root/gaestefotos-app-v2/packages/frontend
pnpm dev > /tmp/frontend.log 2>&1 &

# Nach 5 Sekunden testen
sleep 5
curl http://localhost:3000
```

---

## 🔄 Systemd Service (Empfohlen)

Für dauerhaften Betrieb sollte ein Systemd-Service verwendet werden:

```bash
# Service-Datei erstellen/ändern
nano /etc/systemd/system/gaestefotos-frontend.service
```

Inhalt:
```ini
[Unit]
Description=Gästefotos V2 Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/gaestefotos-app-v2/packages/frontend
Environment=NODE_ENV=production
ExecStart=/usr/bin/pnpm dev
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Dann:
```bash
systemctl daemon-reload
systemctl enable gaestefotos-frontend
systemctl start gaestefotos-frontend
systemctl status gaestefotos-frontend
```

---

## 🎯 Nächste Schritte

1. **Prüfen**: Frontend und Backend laufen?
2. **Testen**: `curl http://localhost:3000` funktioniert?
3. **Logs**: Fehler in den Logs?
4. **Nginx**: Konfiguration korrekt?

**Falls weiterhin Probleme:** Bitte Logs teilen! 📋

