# Deployment-Hinweis: Zwei Verzeichnisse

> **WICHTIG:** Es gibt zwei separate Verzeichnisse für die App!

## Verzeichnisse

| Verzeichnis | Zweck |
|-------------|-------|
| `/root/gaestefotos-app-v2/` | **Entwicklung** — hier arbeitet Windsurf/Cascade |
| `/opt/gaestefotos/app/` | **Produktion** — hier laufen die systemd Services |

## Warum zwei Verzeichnisse?

- Die systemd Services laufen als User `gaestefotos` (nicht root)
- Das Produktionsverzeichnis hat restriktive Berechtigungen
- Entwicklung passiert in `/root/` mit vollen Rechten

## Nach Code-Änderungen: Deployment

Nach Änderungen in `/root/gaestefotos-app-v2/` müssen diese nach `/opt/gaestefotos/app/` synchronisiert werden:

### Frontend (Admin Dashboard)
```bash
# 1. Build in Entwicklungsverzeichnis
cd /root/gaestefotos-app-v2/packages/admin-dashboard
rm -rf .next
npm run build

# 2. Sync nach Produktion
rsync -av --delete /root/gaestefotos-app-v2/packages/admin-dashboard/src/ /opt/gaestefotos/app/packages/admin-dashboard/src/
rsync -av /root/gaestefotos-app-v2/packages/admin-dashboard/.next/ /opt/gaestefotos/app/packages/admin-dashboard/.next/

# 3. Service neu starten
sudo systemctl restart gaestefotos-admin-dashboard.service
```

### Backend
```bash
# 1. Sync nach Produktion
rsync -av --delete /root/gaestefotos-app-v2/packages/backend/src/ /opt/gaestefotos/app/packages/backend/src/
rsync -av /root/gaestefotos-app-v2/packages/backend/dist/ /opt/gaestefotos/app/packages/backend/dist/

# 2. Service neu starten
sudo systemctl restart gaestefotos-backend.service
```

### Frontend (Guest App)
```bash
rsync -av --delete /root/gaestefotos-app-v2/packages/frontend/src/ /opt/gaestefotos/app/packages/frontend/src/
rsync -av /root/gaestefotos-app-v2/packages/frontend/.next/ /opt/gaestefotos/app/packages/frontend/.next/
sudo systemctl restart gaestefotos-frontend.service
```

## Schnell-Befehl (alles auf einmal)

```bash
# Sync ALL packages nach Produktion
rsync -av --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  /root/gaestefotos-app-v2/ /opt/gaestefotos/app/

# Alle Services neu starten
sudo systemctl restart gaestefotos-backend.service gaestefotos-frontend.service gaestefotos-admin-dashboard.service
```

## TODO: Aufräumen

In Zukunft sollte das Setup vereinfacht werden:
- Option A: Symlink `/opt/gaestefotos/app` → `/root/gaestefotos-app-v2`
- Option B: Services direkt aus `/root/gaestefotos-app-v2` laufen lassen
- Option C: CI/CD Pipeline die automatisch deployed

---

*Stand: 19. Februar 2026*
