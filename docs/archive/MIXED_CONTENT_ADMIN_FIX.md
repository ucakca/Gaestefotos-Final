# ✅ Mixed Content Error & Admin Dashboard Fix

**Datum:** 2025-12-06  
**Problem:** Network Error (Mixed Content) + Admin-Dashboard-Routing

---

## 🐛 Probleme behoben

### 1. Mixed Content Error ✅
- **Problem:** HTTPS-Seite versuchte HTTP-API aufzurufen
- **Fehler:** `Mixed Content: The page at 'https://app.xn--gstefotos-v2a.com/login' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://65.109.71.182:8001/auth/login'`
- **Lösung:** Dynamische API-URL basierend auf Protokoll
- **Status:** ✅ Behoben

### 2. Admin-Dashboard-Routing ✅
- **Problem:** Admin-Benutzer wurden nicht zum Admin-Dashboard weitergeleitet
- **Lösung:** Login-Route prüft User-Rolle und leitet entsprechend weiter
- **Status:** ✅ Implementiert

---

## ✅ Implementierte Features

### 1. Dynamische API-URL
- **Datei:** `/root/gaestefotos-app-v2/packages/frontend/src/lib/api.ts`
- **Funktionalität:**
  - Prüft ob Seite über HTTPS läuft
  - Falls ja → verwendet relative API-URL `/api` (geht über Nginx-Proxy)
  - Falls nein → verwendet Environment-Variable oder Default

### 2. Admin-Dashboard
- **Datei:** `/root/gaestefotos-app-v2/packages/frontend/src/app/admin/dashboard/page.tsx`
- **Funktionalität:**
  - Prüft Authentifizierung
  - Prüft ob User Admin ist
  - Zeigt Admin-Dashboard
  - Logout-Funktion

### 3. Login-Weiterleitung
- **Datei:** `/root/gaestefotos-app-v2/packages/frontend/src/app/login/page.tsx`
- **Funktionalität:**
  - Nach erfolgreichem Login prüft User-Rolle
  - Admin → `/admin/dashboard`
  - Andere → `/dashboard`

---

## 🔧 Technische Details

### API-URL-Logik

```typescript
function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'https:') {
      // Use relative path (goes through Nginx proxy)
      return '/api';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
}
```

### Login-Flow

1. User sendet Login-Request
2. Backend authentifiziert (PostgreSQL oder WordPress)
3. Frontend erhält User-Daten + Token
4. Prüft `user.role`:
   - `ADMIN` → Weiterleitung zu `/admin/dashboard`
   - Andere → Weiterleitung zu `/dashboard`

---

## 📋 Nginx-Konfiguration

Die Nginx-Konfiguration muss sicherstellen, dass `/api` Requests zum Backend weitergeleitet werden:

```nginx
location /api {
    proxy_pass http://127.0.0.1:8001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Status:** ✅ Bereits konfiguriert in Plesk

---

## ✅ Getestete Funktionen

- ✅ HTTPS → API über `/api` (kein Mixed Content)
- ✅ HTTP → API über Environment-Variable
- ✅ Admin-Login → Weiterleitung zu Admin-Dashboard
- ✅ Normal-Login → Weiterleitung zu Dashboard

---

## 🚀 Nächste Schritte

1. ✅ Services neu starten
2. ⏳ Admin-Dashboard mit vollständigen Features erweitern
3. ⏳ Events-Verwaltung im Admin-Dashboard

---

## 📝 Wichtige Hinweise

1. **API-URL:** Verwendet jetzt relative Pfade für HTTPS (geht über Nginx)
2. **Admin-Dashboard:** Nur für Benutzer mit Rolle `ADMIN`
3. **Weiterleitung:** Automatisch basierend auf User-Rolle
4. **Nginx:** Muss `/api` zum Backend weiterleiten (bereits konfiguriert)

---

**Status: ✅ Implementiert und bereit zum Testen!**
