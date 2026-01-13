# ✅ Prozess-Absturz Problem behoben

**Datum:** 2025-12-06  
**Problem:** Backend-Prozesse stürzten ständig ab

---

## 🐛 Problem identifiziert

### Hauptursache
**Fehler:** `Error: Cannot find module 'wordpress-hash-node'`

**Ursache:** 
- Die Datei `wordpress.ts` hatte noch einen Import von `wordpress-hash-node`
- Das Paket wurde entfernt, aber der Import blieb bestehen
- Bei jedem Neustart (z.B. durch `tsx watch`) stürzte der Prozess ab

### Weitere Probleme
1. **Mehrere Prozess-Instanzen:** Mehrere Backend/Frontend-Prozesse liefen gleichzeitig
2. **Port-Konflikte:** `EADDRINUSE` Fehler durch doppelte Prozesse
3. **systemd-Konflikte:** systemd-Service versuchte Prozesse zu starten, während manuelle Prozesse liefen

---

## ✅ Lösungen implementiert

### 1. Fehlerhaften Import entfernt
- **Datei:** `/root/gaestefotos-app-v2/packages/backend/src/config/wordpress.ts`
- **Aktion:** Import von `wordpress-hash-node` entfernt
- **Status:** ✅ Behoben

### 2. Prozess-Bereinigung
- Alle laufenden Prozesse gestoppt
- Ports freigegeben
- PID-Dateien aktualisiert

### 3. Service-Management
- `stop_services.sh` stoppt alle Prozesse sauber
- `start_services.sh` startet Services mit Duplikat-Schutz
- PID-Dateien werden verwaltet

---

## 🔧 Technische Details

### Fehlerhafter Code (vorher)
```typescript
import { check } from 'wordpress-hash-node';  // ❌ Paket existiert nicht
```

### Korrigierter Code (nachher)
```typescript
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';  // ✅ Node.js built-in
```

---

## 📋 Präventionsmaßnahmen

1. **Import-Prüfung:** Vor dem Entfernen von Paketen alle Imports prüfen
2. **Service-Management:** Immer `stop_services.sh` vor `start_services.sh` verwenden
3. **Port-Prüfung:** `check_services.sh` regelmäßig ausführen
4. **Logs überwachen:** `tail -f /tmp/backend.log` für Fehler prüfen

---

## ✅ Status

- ✅ Fehlerhafter Import entfernt
- ✅ Services neu gestartet
- ✅ Backend läuft stabil
- ✅ Frontend läuft stabil

---

**Status: ✅ Problem behoben!**
