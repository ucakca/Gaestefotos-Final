# 🚀 Gaestefotos Service Migration: Root → Dedicated User

**Status**: ✅ **READY FOR EXECUTION**  
**Target Server**: Hetzner VPS / Ubuntu 22.04 / Plesk Obsidian  
**Estimated Total Time**: 15-20 Minuten  
**Downtime**: 2-3 Minuten (Phase 4 only)

---

## 📋 QUICK START GUIDE

### VORBEREITUNG (durch dich / Sonnet)

1. **Vollständige Analyse lesen**:
   ```bash
   cat h6-migration-analyse.md
   ```

2. **Pre-Flight Check ausführen**:
   ```bash
   ./migration-phase0-preflight.sh
   ```
   ⚠️ **Behebe ALLE Probleme bevor du weiter machst!**

---

### EXECUTION (durch Opus 4.6)

**Ausführungsreihenfolge (sequenziell, NICHT parallel!)**:

```bash
# Phase 0: Pre-Flight Checks (2 Min, kein Downtime)
./migration-phase0-preflight.sh

# Phase 1: Vorbereitung (5-7 Min, kein Downtime)
./migration-phase1-prepare.sh

# Phase 2: systemd Units erstellen (2 Min, kein Downtime)
./migration-phase2-systemd.sh

# Phase 3: Full Backup (3-5 Min, kein Downtime)
./migration-phase3-backup.sh

# Phase 4: MIGRATION (2-3 Min, ⚠️ DOWNTIME STARTS HERE!)
./migration-phase4-migrate.sh

# Phase 5: Post-Migration (5 Min, kein Downtime)
./migration-phase5-postmigration.sh
```

**Im Fehlerfall**:
```bash
./migration-rollback.sh
```

---

## 📁 DATEIEN ÜBERSICHT

| Datei | Zweck | Execution | Downtime |
|-------|-------|-----------|----------|
| `h6-migration-analyse.md` | 📊 Vollständige Analyse | READ ONLY | - |
| `migration-phase0-preflight.sh` | ✅ Pre-Flight Checks | Sonnet / Opus | Nein |
| `migration-phase1-prepare.sh` | 🏗️ User, Copy, Install | Opus | Nein |
| `migration-phase2-systemd.sh` | ⚙️ systemd Units | Opus | Nein |
| `migration-phase3-backup.sh` | 💾 Full Backup | Opus | Nein |
| `migration-phase4-migrate.sh` | 🚀 MIGRATION | Opus | **JA** (2-3 Min) |
| `migration-phase5-postmigration.sh` | ✨ Cleanup & Test | Opus | Nein |
| `migration-rollback.sh` | ⏮️ Rollback to root | Emergency | JA (2-3 Min) |

---

## 🎯 WAS WIRD GEÄNDERT?

### Vorher (IST)
```
User: root
Path: /root/gaestefotos-app-v2/
pnpm Store: /root/.local/share/pnpm/store/v10/
Services: 7x User=root
Hardcoded Pfade: /root/... in Units
```

### Nachher (SOLL)
```
User: gaestefotos (system user, UID >100)
Path: /opt/gaestefotos/app/
pnpm Store: /opt/gaestefotos/.local/share/pnpm/store/v10/
Services: 7x User=gaestefotos, Group=gaestefotos
Dynamische Pfade: pnpm --filter in Units
Security: NoNewPrivileges, ProtectHome, ProtectSystem
```

---

## 🔴 KRITISCHE FINDINGS (aus Analyse)

### VOR MIGRATION ZWINGEND FIXEN:

1. **Staging-Frontend Service ist defekt** (auto-restart loop)
   ```bash
   systemctl status gaestefotos-frontend-staging.service
   journalctl -u gaestefotos-frontend-staging.service -n 100
   ```

2. **Backup-Scripts zeigen auf alte Pfade**
   ```bash
   grep "DIR=" /opt/backup_gaestefotos.sh
   # Erwartet: /root/gaestefotos-app-v2
   # Vermutlich: /var/www/vhosts/... (FALSCH!)
   ```

3. **Backup-Logs prüfen** (Backups laufen vermutlich fehl)
   ```bash
   tail -100 /var/log/backup.log
   ```

---

## ⚠️ WICHTIGE HINWEISE

### Timing
- **Beste Zeit**: Wartungsfenster (z.B. Sonntag 02:00 Uhr, low traffic)
- **Nicht während**: Events mit Live-Uploads!

### Disk Space
- **Benötigt**: ~6 GB (3 GB App-Copy + 3 GB Buffer)
- **Prüfen**: `df -h /opt`

### Backup
- Full Backup wird in Phase 3 erstellt
- **Location**: `/opt/backups/pre-migration-YYYYMMDD_HHMMSS/`
- **Aufbewahren**: Mindestens 30 Tage!

### Rollback
- Jederzeit möglich via `./migration-rollback.sh`
- Stellt Services auf `User=root` zurück
- Downtime: Weitere 2-3 Minuten

---

## ✅ SUCCESS CRITERIA

Nach erfolgreicher Migration:

- [ ] Alle 7 Services sind `active (running)`
- [ ] Backend API: `curl http://localhost:8001/api/health` → 200 OK
- [ ] Frontend: `curl http://localhost:3000` → 200 OK
- [ ] Keine Permission-Denied Errors in Logs
- [ ] User Login funktioniert
- [ ] Foto-Upload funktioniert
- [ ] Backup-Script läuft erfolgreich
- [ ] Downtime war <5 Minuten

---

## 📞 SUPPORT / TROUBLESHOOTING

### Logs ansehen
```bash
# Alle Services
journalctl -u gaestefotos-* -n 100

# Nur Backend
journalctl -fu gaestefotos-backend.service

# Errors seit Migration
journalctl -u gaestefotos-* --since "30 minutes ago" | grep -i error
```

### Service Status
```bash
systemctl status gaestefotos-*
/opt/gaestefotos/monitor.sh  # (wird in Phase 5 erstellt)
```

### Permissions prüfen
```bash
ls -la /opt/gaestefotos/app/packages/backend/.env
ls -la /opt/gaestefotos/app/packages/backend/uploads
su -s /bin/bash gaestefotos -c "test -r /var/run/clamav/clamd.ctl && echo OK"
```

### Wenn Services nicht starten
```bash
# 1. Check Unit-Datei
cat /etc/systemd/system/gaestefotos-backend.service

# 2. Test als User
su -s /bin/bash gaestefotos
cd /opt/gaestefotos/app
/usr/bin/pnpm --filter @gaestefotos/backend start

# 3. Check Permissions
ls -la /opt/gaestefotos/app/packages/backend/dist/
```

---

## 🧪 POST-MIGRATION TESTS

### Funktional
1. Login als Admin
2. Event erstellen
3. Foto hochladen
4. Foto löschen
5. Admin-Dashboard öffnen
6. Print-Terminal öffnen

### Technisch
1. `curl http://localhost:8001/api/health`
2. `curl http://localhost:3000`
3. `/opt/backup_gaestefotos.sh daily`
4. `journalctl -u gaestefotos-* --since "1 hour ago" | grep -i error`

---

## 📈 TIMELINE

**Gesamt: ~15-20 Minuten**

```
Phase 0: Pre-Flight     [██░░░░░░░░] 2 Min  (kein Downtime)
Phase 1: Prepare        [████████░░] 7 Min  (kein Downtime)
Phase 2: systemd        [██░░░░░░░░] 2 Min  (kein Downtime)
Phase 3: Backup         [████░░░░░░] 4 Min  (kein Downtime)
Phase 4: MIGRATION      [███░░░░░░░] 3 Min  (⚠️ DOWNTIME!)
Phase 5: Post-Migration [█████░░░░░] 5 Min  (kein Downtime)
                        ─────────────────
                        Total: ~23 Min
                        Downtime: 2-3 Min
```

---

## 🔒 SECURITY IMPROVEMENTS

Die Migration verbessert die Security signifikant:

### Vorher
- ❌ Services laufen als `root` (UID 0)
- ❌ Voller Zugriff auf `/root/`, `/etc/`, `/var/`
- ❌ Keine systemd Security Features
- ❌ Privilege Escalation möglich

### Nachher
- ✅ Dedizierter System-User (non-login)
- ✅ `ProtectSystem=strict` (Read-Only System Paths)
- ✅ `ProtectHome=true` (Kein Zugriff auf /root, /home)
- ✅ `NoNewPrivileges=true` (Keine Privilege Escalation)
- ✅ `PrivateTmp=true` (Isoliertes /tmp)
- ✅ Resource Limits (MemoryMax=2G, TasksMax=512)

**Blast Radius bei Kompromittierung**: Hoch → Niedrig

---

## 📝 NOTES FOR OPUS

### Pre-Execution Checklist

Vor Ausführung ZWINGEND prüfen:

1. ✅ `h6-migration-analyse.md` vollständig gelesen
2. ✅ Staging-Frontend-Service ist gefixt (kein auto-restart)
3. ✅ Backup-Scripts zeigen auf `/root/gaestefotos-app-v2`
4. ✅ Disk-Space >10 GB auf `/opt`
5. ✅ Keine kritischen Events gerade live
6. ✅ Rollback-Script `migration-rollback.sh` ist bereit
7. ✅ Full-Backup existiert (nach Phase 3)

### Execution Mode

- **Sequential**: Phases MÜSSEN in Reihenfolge laufen!
- **No Parallel**: NICHT mehrere Scripts gleichzeitig!
- **Wait for Completion**: Jedes Script muss komplett durchlaufen
- **Check Logs**: Nach jedem Script Logs prüfen

### Communication

Bitte nach jeder Phase melden:

```
Phase X: ABGESCHLOSSEN
- Dauer: X Minuten
- Status: ✅ Erfolgreich / ❌ Fehler
- Logs: [relevante Zeilen]
- Next: Phase Y
```

### Rollback Trigger

Rollback sofort starten wenn:
- Services starten nicht in <2 Minuten
- >2 Services schlagen fehl
- Backend API antwortet nicht nach 3 Minuten
- Kritische Errors in Logs (Permission Denied, etc.)

---

## 🎉 FINAL NOTES

**Nach 30 Tagen stabiler Operation**:

```bash
# Alte App löschen (spart 3 GB)
rm -rf /root/gaestefotos-app-v2

# Alte Backups aufräumen
rm -rf /opt/backups/pre-migration-*

# Alte systemd Backup-Units löschen
rm /etc/systemd/system/gaestefotos-*.service.root-backup-*
```

**Continuous Monitoring**:

```bash
# Daily check
/opt/gaestefotos/monitor.sh

# Weekly
systemctl status gaestefotos-*
df -h /opt/gaestefotos
```

---

**Erstellt von**: Sonnet 4.5 (Analyse)  
**Für Execution durch**: Opus 4.6  
**Datum**: 2026-02-15  
**Version**: 1.0

**Bei Fragen**: Check `h6-migration-analyse.md` (vollständige Dokumentation)
