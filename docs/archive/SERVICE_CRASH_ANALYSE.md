# 🔍 Service-Absturz Analyse

**Datum:** 2025-12-06  
**Problem:** Services stürzen ab oder können nicht starten

---

## 🐛 Identifizierte Probleme

### 1. **EADDRINUSE Fehler - Port bereits belegt**

**Fehler:**
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:8001
```

**Ursache:**
- Mehrere Backend-Instanzen laufen gleichzeitig
- Port 8001 ist bereits belegt
- Neue Instanzen können nicht starten

**Betroffene Prozesse:**
- Mehrere `tsx watch src/index.ts` Prozesse
- systemd Service versucht zu starten, aber Port ist belegt
- Manuelle Starts überlappen sich

---

### 2. **Mehrfache Prozesse**

**Backend-Prozesse:**
- Prozess 493524: `tsx watch src/index.ts` (läuft seit Dec05)
- Prozess 688287: Node.js Backend (läuft seit 08:50)
- Prozess 699906: `tsx watch src/index.ts` (neu gestartet 09:20)
- Prozess 700084: `tsx watch src/index.ts` (neu gestartet 09:21)

**Frontend-Prozesse:**
- Prozess 513452: `next dev` (läuft seit Dec05)
- Prozess 677861: `next-server` auf Port 3000 (läuft seit 08:39)
- Prozess 700180: `next dev` (neu gestartet 09:21)
- Prozess 700197: `next-server` auf Port 3001 (läuft seit 09:21)

---

### 3. **systemd Service Konflikt**

**Problem:**
- systemd Service `gaestefotos-backend.service` versucht, das Backend zu starten
- Aber der Port ist bereits von einem manuell gestarteten Prozess belegt
- Service schlägt fehl und versucht automatisch neu zu starten
- Erstellt weitere doppelte Prozesse

---

## ✅ Lösungsvorschläge

### Lösung 1: Alle Prozesse beenden und sauber neu starten

```bash
# Alle Backend-Prozesse beenden
pkill -f "tsx.*backend"
pkill -f "node.*index.ts"
pkill -f "node.*8001"

# Alle Frontend-Prozesse beenden
pkill -f "next.*dev"
pkill -f "next-server"

# Warten
sleep 2

# Ports prüfen
lsof -i :8001
lsof -i :3000
lsof -i :3001

# Sauber neu starten
cd /root/gaestefotos-app-v2/packages/backend
pnpm dev > /tmp/backend.log 2>&1 &

cd /root/gaestefotos-app-v2/packages/frontend
pnpm dev > /tmp/frontend.log 2>&1 &
```

### Lösung 2: systemd Service deaktivieren (wenn manuell gestartet)

```bash
# Service stoppen
systemctl stop gaestefotos-backend.service

# Service deaktivieren (startet nicht automatisch)
systemctl disable gaestefotos-backend.service

# Status prüfen
systemctl status gaestefotos-backend.service
```

### Lösung 3: Port-Konflikt prüfen vor Start

```bash
# Prüfe ob Port belegt ist
if lsof -i :8001 > /dev/null 2>&1; then
    echo "Port 8001 ist belegt!"
    lsof -i :8001
    exit 1
fi
```

---

## 🔧 Empfohlene Lösung

**Für Entwicklung:**
1. Alle doppelten Prozesse beenden
2. systemd Service deaktivieren (wenn manuell entwickelt wird)
3. Services manuell starten

**Für Produktion:**
1. systemd Service verwenden
2. Manuelle Starts vermeiden
3. Service richtig konfigurieren

---

## 📊 System-Ressourcen

**Memory:** ✅ Ausreichend (125GB total, 8.1GB verwendet)  
**Disk:** ✅ Ausreichend (2TB total, 34GB verwendet)  
**CPU:** ✅ Keine Überlastung

**Fazit:** Keine Ressourcen-Probleme, nur Prozess-Konflikte!

---

## 🚀 Nächste Schritte

1. ✅ Alle doppelten Prozesse identifiziert
2. ⏳ Prozesse beenden
3. ⏳ Sauber neu starten
4. ⏳ systemd Service konfigurieren
