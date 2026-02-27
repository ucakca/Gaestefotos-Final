# H6 Masterprompt: Services von root auf dedizierten User migrieren

> **Kopiere diesen Prompt komplett in eine neue Sonnet-Session zur Analyse.**
> **Opus führt die Migration dann aus.**

---

## KONTEXT

Ich betreibe **gästefotos.com** — eine SaaS Foto-Sharing-Plattform (Next.js Frontend + Express Backend + PostgreSQL + Redis + SeaweedFS).

Alle 6 systemd-Services laufen aktuell als `User=root`. Das ist ein Sicherheitsrisiko (Privilege Escalation, Blast Radius bei Kompromittierung). Ich möchte sie auf einen dedizierten `gaestefotos`-User migrieren.

## IST-ZUSTAND

### Services (alle `User=root`):

| Service | Port | Typ | Unit-Datei |
|---------|------|-----|------------|
| gaestefotos-backend | 8001 | Express/Node.js | /etc/systemd/system/gaestefotos-backend.service |
| gaestefotos-frontend | 3000 | Next.js | /etc/systemd/system/gaestefotos-frontend.service |
| gaestefotos-admin-dashboard | 3001 | Next.js | /etc/systemd/system/gaestefotos-admin-dashboard.service |
| gaestefotos-print-terminal | 3002 | Next.js | /etc/systemd/system/gaestefotos-print-terminal.service |
| gaestefotos-backend-staging | 8101 | Express/Node.js | /etc/systemd/system/gaestefotos-backend-staging.service |
| gaestefotos-admin-dashboard-staging | 3101 | Next.js | /etc/systemd/system/gaestefotos-admin-dashboard-staging.service |

### Projekt-Verzeichnis:
- **Pfad**: `/root/gaestefotos-app-v2/` (liegt im root Home!)
- **pnpm Workspace** mit Packages: `backend`, `frontend`, `admin-dashboard`, `print-terminal`, `shared`
- **node_modules**: Via pnpm (symlinked, `.pnpm-store` global)

### Abhängigkeiten:
- **PostgreSQL 16** (localhost:5432) — TCP-Verbindung, kein root nötig
- **Redis 7** (localhost:6379) — TCP, kein root nötig
- **SeaweedFS** (localhost:8333) — HTTP API für File-Storage, kein root nötig
- **ClamAV Daemon** (Unix Socket `/var/run/clamav/clamd.ctl`) — braucht Gruppe `clamav`
- **Plesk Obsidian** — Webserver-Management (Nginx als Reverse Proxy)
- `.env` Dateien: `chmod 600 root:root` in `packages/backend/.env` und `packages/frontend/.env.local`
- **Cron Jobs**: Backup-Scripts unter `/opt/backup_gaestefotos*.sh`
- **Let's Encrypt**: SSL über Plesk verwaltet
- **pnpm** global installiert unter `/usr/bin/pnpm`
- **Node.js 22** unter `/usr/bin/node`

### Nginx Reverse Proxy (via Plesk):
- `app.xn--gstefotos-v2a.com` → `localhost:3000` (Frontend)
- `api.xn--gstefotos-v2a.com` → `localhost:8001` (Backend)
- Admin-Dashboard intern auf Port 3001

## AUFGABE FÜR SONNET

Bitte analysiere den folgenden Migrationsplan und identifiziere:

1. **Fehlende Schritte** — was wurde übersehen?
2. **Reihenfolge-Fehler** — was muss vor was passieren?
3. **Permission-Probleme** — welche Dateien/Sockets/Ports brauchen spezielle Rechte?
4. **Rollback-Strategie** — wie machen wir alles rückgängig wenn es schiefgeht?
5. **Plesk-Kompatibilität** — bricht Plesk wenn Services nicht als root laufen?
6. **pnpm-Probleme** — pnpm Store, Symlinks, postinstall Scripts unter neuem User?
7. **Downtime-Minimierung** — wie können wir die Downtime auf <5 Minuten begrenzen?

### VORGESCHLAGENER PLAN (zu prüfen):

```
Phase 1: Vorbereitung (kein Downtime)
1. useradd --system --shell /usr/sbin/nologin --home-dir /opt/gaestefotos gaestefotos
2. mkdir -p /opt/gaestefotos
3. cp -a /root/gaestefotos-app-v2 /opt/gaestefotos/app   (NICHT mv — root behält Backup)
4. chown -R gaestefotos:gaestefotos /opt/gaestefotos/app
5. chmod 600 /opt/gaestefotos/app/packages/backend/.env
6. chmod 600 /opt/gaestefotos/app/packages/frontend/.env.local
7. usermod -aG clamav gaestefotos  (für ClamAV Socket)

Phase 2: systemd Units vorbereiten (kein Downtime)
1. Für jede Unit: Backup erstellen (cp gaestefotos-*.service gaestefotos-*.service.bak)
2. Neue Units schreiben mit:
   - User=gaestefotos
   - Group=gaestefotos
   - WorkingDirectory=/opt/gaestefotos/app
   - Alle ExecStart-Pfade anpassen
   - Hardening: NoNewPrivileges=true, ProtectSystem=strict, ProtectHome=true,
     ReadWritePaths=/opt/gaestefotos/app /tmp, PrivateTmp=true

Phase 3: Migration (mit kurzer Downtime)
1. Vollständiges Backup: pg_dump + tar der App
2. Alle Services stoppen
3. systemctl daemon-reload
4. Alle Services starten
5. Health-Checks: curl localhost:8001/api/health, curl localhost:3000
6. Wenn fehlerhaft: Rollback (alte Unit-Dateien wiederherstellen)
```

### SPEZIFISCHE FRAGEN:

1. `/root/gaestefotos-app-v2` enthält `.next/` Build-Caches und `node_modules/.cache` — braucht der neue User Write-Access darauf oder reicht Read-Only?
2. pnpm global store (`~/.local/share/pnpm/store/v3/`) — muss der für den neuen User konfiguriert werden?
3. Gibt es Probleme wenn der Pfad sich von `/root/...` zu `/opt/...` ändert? (z.B. hardcoded Pfade in .env, compiled Next.js Output, etc.)
4. Soll der neue User eine eigene `.bashrc` / `PATH` haben für Node.js/pnpm?
5. Wie verhält sich `ProtectHome=true` wenn die App unter `/opt/` liegt?
6. Kann der `gaestefotos`-User Cron-Jobs für Backups ausführen, oder brauchen die weiterhin root?
7. Was passiert mit `git` — brauche ich Git-Zugriff unter dem neuen User für Deployments?

### OUTPUT ERWARTET:

Bitte liefere:
- **Korrigierten Migrationsplan** (Schritt für Schritt, copy-paste-ready)
- **Rollback-Script** (bash, das alles rückgängig macht)
- **Test-Checkliste** (was nach Migration geprüft werden muss)
- **Risiko-Matrix** (was kann schiefgehen + Wahrscheinlichkeit + Impact)
- **Empfehlung**: Symlink vs. Kopie vs. Move

---

> **WICHTIG**: Vor dem Ausführen wird ein Full-Backup erstellt (DB + App + Units).
> **WICHTIG**: Die Ausführung übernimmt Opus in einer separaten Session.
> **WICHTIG**: Server ist ein Hetzner VPS mit Plesk Obsidian, Ubuntu 22.04 LTS.
