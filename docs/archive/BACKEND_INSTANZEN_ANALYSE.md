# 🔍 Analyse: Mehrfache Backend-Instanzen

**Datum:** 09.12.2025 20:30  
**Problem:** 3x tsx watch Prozesse laufen parallel

---

## 📊 ERKANNTE PROZESSE

### Aktive Backend-Prozesse:

1. **PID 749422** (Parent)
   - **Start:** 06.12.2025 (vor 3 Tagen, 9 Stunden)
   - **PPID:** 1 (init/root - Waisenkind-Prozess)
   - **Command:** `node /usr/bin/pnpm dev`
   - **Child:** PID 749434 → PID 749435 (tsx watch)
   - **Status:** ⚠️ Läuft, aber kein Server auf Port 8001

2. **PID 1136367** (Parent)
   - **Start:** 07.12.2025 (vor 1 Tag, 22 Stunden)
   - **PPID:** 1136366 (unbekannter Parent-Prozess)
   - **Command:** `node /usr/bin/pnpm dev`
   - **Child:** PID 1136396 → PID 1136397 (tsx watch)
   - **Status:** ⚠️ Läuft, aber kein Server auf Port 8001

3. **PID 1136855** (Parent)
   - **Start:** 07.12.2025 (vor 1 Tag, 22 Stunden)
   - **PPID:** 1136854 (unbekannter Parent-Prozess)
   - **Command:** `node /usr/bin/pnpm dev`
   - **Child:** PID 1136867 → PID 1136868 (tsx watch)
   - **Child-Child:** PID 1772861 (Node-Server auf Port 8001) ✅
   - **Status:** ✅ **DIESER PROZESS HÖRT AUF PORT 8001**

---

## 🔍 URSACHEN-ANALYSE

### 1. **Manuelle Starts ohne Bereinigung**
- **Beweis:** Bash-History zeigt `nohup pnpm dev > /tmp/backend.log 2>&1 &`
- **Problem:** Mehrfach wurde `pnpm dev` manuell gestartet, ohne vorherige Prozesse zu beenden
- **Folge:** Alte Prozesse laufen weiter im Hintergrund

### 2. **Systemd Service wurde deaktiviert**
- **Status:** `gaestefotos-backend.service` ist `inactive (dead)` und `disabled`
- **Letzte Aktivität:** 06.12.2025 09:22:31 (gestoppt)
- **Grund für Stopp:** Port 8001 war bereits belegt (EADDRINUSE)
- **Problem:** Service wurde deaktiviert, aber manuelle Prozesse laufen weiter

### 3. **Port-Konflikt**
- **Aktuell:** Nur PID 1772861 (Child von 1136868) hört auf Port 8001
- **Versuchte Starts:** Die anderen 2 Prozesse versuchten auch Port 8001 zu binden
- **Ergebnis:** EADDRINUSE Fehler in systemd Logs (06.12. 09:20:57)

### 4. **Fehlende Prozess-Verwaltung**
- **PID-Dateien:** `.pids/backend.pid` existiert, zeigt auf PID 749422 (alte Instanz)
- **Problem:** PID-Datei wird nicht aktualisiert, wenn neue Prozesse gestartet werden
- **Folge:** `start_services.sh` erkennt alte Prozesse nicht korrekt

---

## 📋 PROZESS-HIERARCHIE

```
PID 749422 (node /usr/bin/pnpm dev) [3 Tage alt]
  └─ PID 749434 (sh -c tsx watch src/index.ts)
      └─ PID 749435 (tsx watch) [kein Server auf Port 8001]

PID 1136367 (node /usr/bin/pnpm dev) [1 Tag alt]
  └─ PID 1136396 (sh -c tsx watch src/index.ts)
      └─ PID 1136397 (tsx watch) [kein Server auf Port 8001]

PID 1136855 (node /usr/bin/pnpm dev) [1 Tag alt] ✅ AKTIV
  └─ PID 1136867 (sh -c tsx watch src/index.ts)
      └─ PID 1136868 (tsx watch)
          └─ PID 1772861 (node --require tsx) [hört auf Port 8001] ✅
```

---

## 🎯 WARUM PASSIERT DAS?

### Hauptursachen:

1. **Keine zentrale Prozess-Verwaltung**
   - Systemd Service ist deaktiviert
   - Manuelle Starts ohne Koordination
   - Keine Prüfung auf laufende Instanzen vor Start

2. **Mehrfache Start-Methoden**
   - `start_services.sh` (mit PID-Management)
   - `start-backend.sh` (ohne PID-Management)
   - `RESTART_SERVICES.sh` (mit nohup, ohne Prüfung)
   - Manuelle `pnpm dev` Aufrufe
   - Systemd Service (deaktiviert)

3. **Fehlende Bereinigung**
   - Alte Prozesse werden nicht beendet
   - PID-Dateien werden nicht aktualisiert
   - Keine automatische Bereinigung bei Neustart

4. **Port-Binding ohne Prüfung**
   - `tsx watch` versucht immer Port 8001 zu binden
   - Wenn Port belegt ist, schlägt der Prozess fehl, läuft aber weiter
   - Keine Fehlerbehandlung für Port-Konflikte

---

## ⚠️ AUSWIRKUNGEN

### Ressourcen-Verschwendung:
- **RAM:** ~450 MB pro Prozess (3x ~150 MB)
- **CPU:** Minimale Last, aber unnötige Prozesse
- **Ports:** Nur einer nutzt Port 8001, andere blockieren nichts

### Potenzielle Probleme:
- **Verwirrung:** Unklar, welche Instanz aktiv ist
- **Logs:** Mehrere Log-Streams, schwer zu verfolgen
- **Neustarts:** Unklar, welche Instanz neu gestartet werden soll
- **Updates:** Code-Änderungen werden in allen Instanzen geladen (unnötig)

### Aktueller Status:
- ✅ **System funktioniert:** Eine Instanz (PID 1772861) läuft korrekt
- ⚠️ **Ineffizient:** 2 zusätzliche Prozesse laufen ohne Nutzen
- ⚠️ **Wartung:** Schwer zu verwalten, welche Instanz aktiv ist

---

## 🔧 LÖSUNGSVORSCHLÄGE

### Option 1: Alle Prozesse beenden und sauber neu starten (EMPFOHLEN)

```bash
# 1. Alle Backend-Prozesse beenden
pkill -f "tsx watch"
pkill -f "pnpm dev"

# 2. Warten bis Port frei ist
sleep 3

# 3. Prüfen ob Port frei ist
lsof -i :8001 || echo "Port 8001 ist frei"

# 4. Sauber neu starten (nur eine Instanz)
cd /root/gaestefotos-app-v2/packages/backend
pnpm dev
```

### Option 2: Systemd Service aktivieren (PRODUKTION)

```bash
# 1. Alte Prozesse beenden
pkill -f "tsx watch"
pkill -f "pnpm dev"

# 2. Systemd Service aktivieren
systemctl enable gaestefotos-backend.service
systemctl start gaestefotos-backend.service

# 3. Status prüfen
systemctl status gaestefotos-backend.service
```

### Option 3: start_services.sh verwenden (ENTWICKLUNG)

```bash
# 1. Alte Prozesse beenden
./stop_services.sh

# 2. Sauber neu starten
./start_services.sh
```

### Option 4: Port-Prüfung vor Start hinzufügen

```bash
# In start-backend.sh oder package.json dev script:
if lsof -i :8001 > /dev/null 2>&1; then
  echo "Port 8001 ist belegt, beende alte Prozesse..."
  pkill -f "tsx watch"
  sleep 2
fi
```

---

## 📝 EMPFOHLENE MASSNAHMEN

### Sofort:
1. ✅ **Alte Prozesse beenden** (PID 749422, 1136367, 1136855)
2. ✅ **Nur eine Instanz laufen lassen** (die aktive auf Port 8001)
3. ✅ **PID-Dateien aktualisieren** (`.pids/backend.pid`)

### Kurzfristig:
1. **Einheitliche Start-Methode wählen:**
   - Entweder: Systemd Service (Production)
   - Oder: start_services.sh (Development)
   - Nicht: Mehrere Methoden gleichzeitig

2. **Port-Prüfung implementieren:**
   - Vor jedem Start prüfen, ob Port belegt ist
   - Alte Prozesse automatisch beenden

3. **PID-Management verbessern:**
   - PID-Dateien immer aktualisieren
   - Prüfung auf laufende Prozesse vor Start

### Langfristig:
1. **Systemd Service für Production**
2. **PM2 für Development** (bessere Prozess-Verwaltung)
3. **Monitoring** (Prozess-Status überwachen)

---

## 🔍 DIAGNOSE-BEFEHLE

### Aktuelle Prozesse anzeigen:
```bash
ps aux | grep -E "tsx watch|pnpm dev" | grep -v grep
```

### Port-Status prüfen:
```bash
lsof -i :8001
# oder
ss -tlnp | grep :8001
```

### Prozess-Hierarchie anzeigen:
```bash
ps -ef | grep -E "tsx|pnpm" | grep -v grep
```

### Systemd Service Status:
```bash
systemctl status gaestefotos-backend.service
```

### PID-Dateien prüfen:
```bash
cat /root/gaestefotos-app-v2/.pids/backend.pid
ps -p $(cat /root/gaestefotos-app-v2/.pids/backend.pid)
```

---

## ✅ ZUSAMMENFASSUNG

**Problem:** 3x Backend-Instanzen laufen parallel, nur eine nutzt Port 8001

**Ursache:** 
- Mehrfache manuelle Starts ohne Bereinigung
- Systemd Service deaktiviert
- Fehlende Port-Prüfung vor Start
- Keine zentrale Prozess-Verwaltung

**Lösung:**
- Alte Prozesse beenden
- Einheitliche Start-Methode wählen
- Port-Prüfung implementieren
- Systemd Service für Production aktivieren

**Status:** System funktioniert, aber ineffizient. Bereinigung empfohlen.

---

**Erstellt:** 09.12.2025 20:30  
**Von:** AI Assistant - Backend-Instanzen Analyse






