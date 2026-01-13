# Session: Login-Problem Fix (09.12.2025)

## Problem
Login funktionierte nicht - Browser lud alte kompilierte JavaScript-Datei (`index-Dq7vNCNN.js`) mit alter Login-Logik.

## Root Cause
1. **Alte Datei existierte noch**: `/var/www/vhosts/xn--gstefotos-v2a.com/app.xn--gstefotos-v2a.com/assets/index-Dq7vNCNN.js`
2. **Plesk-Konfiguration überschrieb Custom-Config**: Die Plesk-Konfiguration hatte `location /` mit `root /var/www/...`, wodurch statische Dateien aus diesem Verzeichnis geladen wurden statt von Next.js
3. **Nginx Routing**: `/_next/static/` Dateien wurden nicht korrekt an Next.js weitergeleitet

## Lösung

### 1. Alte Dateien gelöscht
```bash
rm -f /var/www/vhosts/xn--gstefotos-v2a.com/app.xn--gstefotos-v2a.com/assets/index-Dq7vNCNN.js
rm -rf /var/www/vhosts/xn--gstefotos-v2a.com/app.xn--gstefotos-v2a.com/assets/
```

### 2. Plesk-Konfiguration aktualisiert
**Datei**: `/var/www/vhosts/system/app.xn--gstefotos-v2a.com/conf/vhost_nginx.conf`

**Änderungen**:
- `location /` leitet jetzt an `http://localhost:3000` weiter (statt statische Dateien aus `/var/www/...` zu laden)
- `location /_next/static/` hinzugefügt - leitet an Next.js weiter
- `location /_next/static/media/` hinzugefügt - für Fonts und andere Media-Dateien
- `location /assets/` hinzugefügt - leitet an Next.js weiter (override für alte statische Dateien)

**Wichtig**: Locations müssen in richtiger Reihenfolge sein (spezifische vor allgemeine):
1. `/api` (Backend)
2. `/_next/static/media/` (spezifisch)
3. `/_next/static/` (spezifisch)
4. `/assets/` (spezifisch)
5. `/` (allgemein - muss zuletzt kommen)

### 3. Frontend-Code aktualisiert
**Dateien**:
- `packages/frontend/src/app/login/page.tsx` - Verwendet jetzt `useAuthStore`
- `packages/frontend/src/lib/auth.ts` - Korrigiert für explizite Response-Struktur
- `packages/frontend/src/store/authStore.ts` - Login-Logik implementiert

**Änderungen**:
- Login-Seite verwendet `useAuthStore.login()` statt direkter API-Calls
- `authApi.login()` validiert explizit Token in Response
- Alle Redirects gehen zu `/dashboard` (keine separaten Admin-Routes mehr)

### 4. Nginx Cache-Bypass
- `/_next/static/` hat jetzt `Cache-Control: no-cache` Header
- Query-Parameter werden korrekt weitergeleitet

## Geänderte Dateien

### Nginx-Konfiguration
- `/var/www/vhosts/system/app.xn--gstefotos-v2a.com/conf/vhost_nginx.conf`
- `/etc/nginx/sites-enabled/gaestefotos-v2.conf` (bereits vorher angepasst)

### Frontend
- `packages/frontend/src/app/login/page.tsx`
- `packages/frontend/src/lib/auth.ts`
- `packages/frontend/src/store/authStore.ts`
- `packages/frontend/src/app/events/[id]/photos/page.tsx` - Info-Banner für Event-Modi hinzugefügt

### i18n (TypeScript-Fehler behoben)
- `packages/frontend/i18n/config.ts` - RequestConfig Import und locale Handling

### Weitere TypeScript-Fehler behoben
- `packages/frontend/src/app/admin/dashboard/page.tsx` - Role-Vergleich korrigiert
- `packages/frontend/src/app/events/[id]/guests/page.tsx` - Guest.email entfernt
- `packages/frontend/src/app/events/[id]/photos/page.tsx` - Photo-Status-Vergleiche korrigiert (PENDING → pending)

## Status

### ✅ Erledigt
- [x] Login-Problem identifiziert und gelöst
- [x] Alte Dateien gelöscht
- [x] Plesk-Konfiguration aktualisiert
- [x] Nginx Proxy-Weiterleitung konfiguriert
- [x] Frontend-Code aktualisiert (useAuthStore)
- [x] TypeScript-Fehler behoben
- [x] Services laufen korrekt
- [x] Info-Banner für Event-Modi in Photo-Liste implementiert

### ⏳ Offen (für später)
- [x] Frontend: Info-Banner bei aktivem Modus in Photo-Liste (TODO #5) ✅ **FERTIG**
- [ ] Weitere Features aus dem Plan implementieren

## Services Status

### Frontend
- **Port**: 3000
- **Status**: ✅ Läuft (Next.js Dev-Modus)
- **Log**: `/tmp/frontend-new.log`

### Backend
- **Port**: 8001
- **Status**: ✅ Läuft (Node.js)
- **Log**: Backend-Logs

### Nginx
- **Status**: ✅ Konfiguriert und neu geladen
- **Config**: `/var/www/vhosts/system/app.xn--gstefotos-v2a.com/conf/vhost_nginx.conf`

## Test-URLs

- **Login**: https://app.xn--gstefotos-v2a.com/login
- **Dashboard**: https://app.xn--gstefotos-v2a.com/dashboard
- **API**: https://app.xn--gstefotos-v2a.com/api/auth/login

## Wichtige Erkenntnisse

1. **Plesk-Konfiguration überschreibt Custom-Config**: Die Plesk-generierte `vhost_nginx.conf` hat Vorrang vor der Custom-Config in `/etc/nginx/sites-enabled/`

2. **Location-Reihenfolge ist kritisch**: Spezifische Locations müssen vor allgemeinen kommen, sonst wird die falsche Location matched

3. **Next.js Dev-Modus**: Dateien werden dynamisch generiert mit Query-Parametern (`?v=timestamp`). Nginx muss diese korrekt weiterleiten.

4. **Cloudflare Cache**: Auch nach Cache-Purge können Dateien noch gecached sein. Development Mode hilft temporär.

## Nächste Schritte

1. ✅ Frontend: Info-Banner bei aktivem Modus in Photo-Liste implementiert
2. Weitere Features aus dem Plan implementieren
3. Production-Build testen (falls nötig)

## Implementiert: Info-Banner für Event-Modi

**Datei**: `packages/frontend/src/app/events/[id]/photos/page.tsx`

**Features**:
- Banner wird angezeigt, wenn Event-Modus nicht "STANDARD" ist
- Drei Modi werden unterstützt:
  - **MODERATION**: Blaues Banner mit Shield-Icon - "Alle Fotos müssen vor der Veröffentlichung freigegeben werden"
  - **COLLECT**: Grünes Banner mit Camera-Icon - "Fotos werden automatisch gesammelt und sind sofort sichtbar"
  - **VIEW_ONLY**: Graues Banner mit EyeOff-Icon - "Fotos können nur angesehen werden. Uploads sind deaktiviert"
- Banner erscheint direkt unter dem Titel, vor den Filtern
- Animation mit Framer Motion für sanftes Einblenden

## Notizen

- Login funktioniert jetzt mit `test@example.com` / `test123`
- Alle WordPress-User können sich anmelden (WordPress-Passwort-Verifizierung implementiert)
- Role-Checking funktioniert (ADMIN, SUPERADMIN, GUEST)


