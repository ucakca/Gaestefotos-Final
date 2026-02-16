# Migration Todo-Liste

## ⏰ Status: BEREIT FÜR AUSFÜHRUNG

### 🔴 KRITISCHE PRE-FLIGHT TASKS (MUSS VOR MIGRATION!)

- [ ] Staging-Frontend-Service analysieren und fixen (auto-restart loop)
  ```bash
  systemctl status gaestefotos-frontend-staging.service -n 50
  journalctl -u gaestefotos-frontend-staging.service -n 100
  # Fix: TBD nach Log-Analyse
  ```

- [ ] Backup-Scripts auf korrekte Pfade prüfen und korrigieren
  ```bash
  grep "DIR=" /opt/backup_gaestefotos.sh
  # Soll: /root/gaestefotos-app-v2/packages/...
  # Ist vermutlich: /var/www/vhosts/... (FALSCH!)
  ```

- [ ] Backup-Logs prüfen (vermutlich seit Wochen fehlerhaft)
  ```bash
  tail -100 /var/log/backup.log
  ```

- [ ] Disk Space verifizieren (mind. 10 GB frei)
  ```bash
  df -h /opt
  ```

---

## 📋 PHASE 0: PRE-FLIGHT CHECKS (⏱️ 2 Min)

- [ ] Script ausführen: `./migration-phase0-preflight.sh`
- [ ] Alle Checks grün
- [ ] Staging-Frontend repariert bestätigt
- [ ] Backup-Scripts korrigiert bestätigt

---

## 📋 PHASE 1: VORBEREITUNG (⏱️ 5-7 Min, kein Downtime)

- [ ] Script ausführen: `./migration-phase1-prepare.sh`
- [ ] User `gaestefotos` erstellt
- [ ] ClamAV Group Membership gesetzt
- [ ] App nach `/opt/gaestefotos/app` kopiert (3 GB)
- [ ] Ownership `gaestefotos:gaestefotos` gesetzt
- [ ] `.env` Permissions (600) gesetzt
- [ ] pnpm install erfolgreich (neuer Store)
- [ ] Pre-Build erfolgreich (alle Packages)
- [ ] Verify: `ls -la /opt/gaestefotos/app/packages/backend/dist/`

---

## 📋 PHASE 2: SYSTEMD UNITS (⏱️ 2 Min, kein Downtime)

- [ ] Script ausführen: `./migration-phase2-systemd.sh`
- [ ] Alte Units gebackupt (`.root-backup-*` Suffix)
- [ ] 7 neue Units erstellt:
  - [ ] gaestefotos-backend.service
  - [ ] gaestefotos-frontend.service
  - [ ] gaestefotos-admin-dashboard.service
  - [ ] gaestefotos-print-terminal.service
  - [ ] gaestefotos-backend-staging.service
  - [ ] gaestefotos-admin-dashboard-staging.service
  - [ ] gaestefotos-frontend-staging.service
- [ ] Units mit `User=gaestefotos` verifiziert
- [ ] Security Hardening aktiviert (NoNewPrivileges, ProtectHome, etc.)
- [ ] Keine `systemd-analyze verify` Errors

---

## 📋 PHASE 3: FULL BACKUP (⏱️ 3-5 Min, kein Downtime)

- [ ] Script ausführen: `./migration-phase3-backup.sh`
- [ ] PostgreSQL Dump: `postgresql_all.sql`
- [ ] App Backup: `app-root.tar.gz`
- [ ] systemd Units gebackupt
- [ ] Crontab gebackupt
- [ ] Nginx Config gebackupt
- [ ] RESTORE.sh Script erstellt
- [ ] Backup-Location notiert: `/opt/backups/pre-migration-YYYYMMDD_HHMMSS/`

---

## 📋 PHASE 4: MIGRATION (⏱️ 2-3 Min, ⚠️ **DOWNTIME!**)

- [ ] **DOWNTIME WINDOW STARTET JETZT**
- [ ] Script ausführen: `./migration-phase4-migrate.sh`
- [ ] Alle 7 Services gestoppt
- [ ] `systemctl daemon-reload` erfolgreich
- [ ] Alle 7 Services mit neuer Config gestartet
- [ ] Services sind `active (running)`:
  - [ ] gaestefotos-backend.service
  - [ ] gaestefotos-frontend.service
  - [ ] gaestefotos-admin-dashboard.service
  - [ ] gaestefotos-print-terminal.service
  - [ ] gaestefotos-backend-staging.service
  - [ ] gaestefotos-admin-dashboard-staging.service
  - [ ] gaestefotos-frontend-staging.service
- [ ] HTTP Health Checks:
  - [ ] Backend API: `curl http://localhost:8001/api/health` → 200 OK
  - [ ] Frontend: `curl http://localhost:3000` → 200 OK
  - [ ] Admin: `curl http://localhost:3001` → 200 OK
  - [ ] Print: `curl http://localhost:3002` → 200 OK
- [ ] Downtime war <5 Minuten
- [ ] **DOWNTIME WINDOW ENDET**

### ❌ Bei Fehlern:
- [ ] Sofort Rollback: `./migration-rollback.sh`

---

## 📋 PHASE 5: POST-MIGRATION (⏱️ 5 Min, kein Downtime)

- [ ] Script ausführen: `./migration-phase5-postmigration.sh`
- [ ] Backup-Scripts auf `/opt/gaestefotos/app` aktualisiert
- [ ] Backup-Test erfolgreich
- [ ] DB-Backup-Test erfolgreich
- [ ] Services laufen stabil
- [ ] HTTP Endpoints antworten
- [ ] File Permissions korrekt:
  - [ ] `.env` ist 600
  - [ ] `uploads/` ist 755
- [ ] ClamAV Socket accessible
- [ ] Keine kritischen Errors in Logs
- [ ] Monitoring-Script erstellt: `/opt/gaestefotos/monitor.sh`

---

## ✅ POST-MIGRATION TESTS (⏱️ 15 Min)

### Funktional
- [ ] Admin-Login funktioniert
- [ ] User-Login funktioniert
- [ ] Event erstellen
- [ ] Foto hochladen (via Frontend)
- [ ] Foto wird prozessiert (Thumbnail, EXIF, etc.)
- [ ] Foto löschen
- [ ] Admin-Dashboard öffnen und navigieren
- [ ] Print-Terminal öffnen
- [ ] Face-Search funktioniert (falls aktiviert)

### Technisch
- [ ] `journalctl -u gaestefotos-* --since "1 hour ago" | grep -i error` → Keine kritischen Errors
- [ ] `systemctl status gaestefotos-*` → Alle `active (running)`
- [ ] `/opt/gaestefotos/monitor.sh` → Alle grün
- [ ] Memory Usage normal (<2 GB per Service)
- [ ] Disk Space nicht dramatisch gestiegen
- [ ] Logs rotieren korrekt (systemd journal)

### Security
- [ ] Services laufen als `gaestefotos` User (nicht root)
  ```bash
  ps aux | grep 'node.*gaestefotos'
  ```
- [ ] ClamAV Virus-Scan funktioniert (Test-Upload mit EICAR-File)
- [ ] Rate Limiting funktioniert (Test mit vielen schnellen Requests)

---

## 📊 24H MONITORING (Tag nach Migration)

- [ ] Alle Services laufen noch (kein Crash)
- [ ] Kein Memory Leak erkennbar
- [ ] Backup-Cron läuft erfolgreich
- [ ] Keine ungewöhnlichen Errors in Logs
- [ ] Performance ist gleich oder besser
- [ ] User-Feedback: Keine Beschwerden

---

## 🧹 CLEANUP (Nach 30 Tagen stabiler Operation)

- [ ] Alte App löschen: `rm -rf /root/gaestefotos-app-v2` (3 GB frei)
- [ ] Alte Backups löschen: `rm -rf /opt/backups/pre-migration-*`
- [ ] Alte systemd Backups löschen: `rm /etc/systemd/system/gaestefotos-*.service.root-backup-*`
- [ ] Migration-Scripts archivieren oder löschen

---

## 🚨 ROLLBACK (Falls nötig)

- [ ] Script ausführen: `./migration-rollback.sh`
- [ ] Services wieder als `root`
- [ ] Alte Units wiederhergestellt
- [ ] Services starten erfolgreich
- [ ] HTTP Health Checks OK
- [ ] Migration-Fehler analysieren
- [ ] Fix implementieren
- [ ] Migration erneut versuchen

---

## 📝 LESSONS LEARNED (Nach Migration)

- Was lief gut?
- Was war schwierig?
- Was würde ich beim nächsten Mal anders machen?
- Dokumentation aktualisieren?

---

**Status**: ✅ Alle Tasks bereit  
**Letztes Update**: 2026-02-15  
**Nächster Schritt**: Phase 0 Pre-Flight Check
