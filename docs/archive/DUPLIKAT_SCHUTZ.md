# 🔒 Duplikat-Schutz für Services

**Datum:** 2025-12-06  
**Problem:** Mehrere Instanzen derselben Services liefen gleichzeitig und blockierten sich gegenseitig

---

## 🐛 Problem

- Mehrere Backend-Instanzen liefen gleichzeitig auf Port 8001
- Mehrere Frontend-Instanzen liefen gleichzeitig
- Port-Konflikte führten zu `EADDRINUSE` Fehlern
- systemd Service + manuelle Starts = Konflikte

---

## ✅ Lösung: PID-File Management

### Implementierte Schutzmaßnahmen

1. **PID-Files** (Process ID Files)
   - Speichern die Prozess-IDs in `.pids/backend.pid` und `.pids/frontend.pid`
   - Prüfung vor dem Start: Läuft bereits eine Instanz?
   - Automatisches Stoppen alter Instanzen

2. **Port-Prüfung**
   - Prüft ob Port belegt ist, bevor gestartet wird
   - Beendet blockierende Prozesse automatisch

3. **Prozess-Validierung**
   - Prüft ob gespeicherte PID noch läuft
   - Entfernt alte/ungültige PID-Dateien

4. **Fallback-Mechanismus**
   - Stoppt alle Prozesse die noch laufen könnten
   - Verhindert "Zombie"-Prozesse

---

## 📝 Verwendung

### Services starten
```bash
cd /root/gaestefotos-app-v2
./start_services.sh
```

**Was passiert:**
1. Prüft ob bereits Instanzen laufen (PID-Files)
2. Stoppt alte Instanzen automatisch
3. Prüft ob Ports frei sind
4. Startet Services und speichert PIDs
5. Führt Health Checks durch

### Services stoppen
```bash
./stop_services.sh
```

**Was passiert:**
1. Liest PID-Files
2. Stoppt Prozesse sauber
3. Fallback: Stoppt alle verbleibenden Prozesse
4. Räumt PID-Files auf

### Status prüfen
```bash
./check_services.sh
```

**Zeigt:**
- Welche Services laufen
- PID-Status
- Port-Status
- Warnung bei mehrfachen Instanzen

---

## 🔧 Technische Details

### PID-File Struktur
```
.pids/
├── backend.pid   # Enthält Backend Prozess-ID
└── frontend.pid  # Enthält Frontend Prozess-ID
```

### Schutz-Mechanismen

1. **Vor dem Start:**
   ```bash
   - Prüfe PID-File → Läuft Prozess?
   - Prüfe Port → Ist Port frei?
   - Stoppe alte Instanzen wenn nötig
   ```

2. **Beim Start:**
   ```bash
   - Starte Service im Hintergrund
   - Speichere PID in Datei
   - Prüfe ob Prozess wirklich läuft
   ```

3. **Beim Stoppen:**
   ```bash
   - Lese PID aus Datei
   - Stoppe Prozess
   - Entferne PID-Datei
   - Fallback: Stoppe alle Prozesse
   ```

---

## 🚫 Verhinderte Probleme

✅ **Keine doppelten Instanzen mehr**
- System prüft vor jedem Start
- Alte Instanzen werden automatisch gestoppt

✅ **Keine Port-Konflikte mehr**
- Port wird vor Start geprüft
- Blockierende Prozesse werden beendet

✅ **Sauberes Process Management**
- PID-Files für Tracking
- Automatische Bereinigung

✅ **Keine Zombie-Prozesse**
- Fallback stoppt alle verbleibenden Prozesse
- Alte PID-Dateien werden entfernt

---

## 📊 Beispiel-Ablauf

### Szenario: Service bereits läuft

```bash
$ ./start_services.sh
=== GÄSTEFOTOS V2 - SERVICE START ===

1. Prüfe auf laufende Instanzen...
⚠️  Backend läuft bereits (PID: 12345), stoppe...
✅ Backend gestoppt

2. Prüfe Ports...
✅ Port 8001 ist frei

3. Starte Backend...
Backend gestartet (PID: 67890)
✅ Backend läuft (PID: 67890)
```

### Szenario: Port belegt

```bash
$ ./start_services.sh
2. Prüfe Ports...
❌ Port 8001 ist belegt!
Belegende Prozesse:
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    12345 root   45u  IPv4 123456      0t0  TCP *:8001 (LISTEN)
⚠️  Versuche Port 8001 freizugeben...
✅ Port 8001 ist frei
```

---

## 🔍 Troubleshooting

### Problem: PID-Datei existiert, aber Prozess läuft nicht

**Lösung:**
```bash
./stop_services.sh  # Räumt alte PID-Dateien auf
```

### Problem: Mehrere Instanzen laufen trotzdem

**Lösung:**
```bash
./stop_services.sh  # Stoppt alle (inkl. Fallback)
./start_services.sh # Startet sauber neu
```

### Problem: Port ist belegt

**Lösung:**
```bash
./stop_services.sh  # Beendet alle Prozesse
# Oder manuell:
lsof -i :8001
kill <PID>
```

---

## ✅ Vorteile

1. **Automatisch:** Keine manuelle Prozess-Verwaltung nötig
2. **Sicher:** Verhindert doppelte Instanzen
3. **Robust:** Fallback-Mechanismen für Edge Cases
4. **Übersichtlich:** Status-Check zeigt alles auf einen Blick
5. **Wartbar:** Einfache Scripts, leicht zu erweitern

---

**Das System verhindert jetzt zuverlässig doppelte Instanzen!** 🔒
