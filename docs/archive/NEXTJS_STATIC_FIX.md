# Next.js Static Files Fix - 14.12.2025

## ✅ BEHOBENES PROBLEM

### **400 Bad Request / MIME Type Error für Next.js Static Chunks**
**Problem:** 
```
GET https://app.xn--gstefotos-v2a.com/_next/static/chunks/app/e/%5Bslug%5D/page-1097eae4f959f730.js 400 (Bad Request)
Refused to execute script because its MIME type ('text/html') is not executable
```

**Root Cause:**
1. **Nginx `proxy_pass` Konfiguration:** Die `proxy_pass` Direktive mit trailing slash (`/_next/static/`) entfernt den URL-Pfad, was zu falschen Requests führt
2. **URL-Encoding:** Next.js verwendet URL-encoded Pfade (`%5Bslug%5D` für `[slug]`), die korrekt weitergeleitet werden müssen
3. **Build-Hash-Änderung:** Nach einem neuen Build hat Next.js eine neue Hash-Datei erstellt (`page-c335834118674ebf.js` statt `page-1097eae4f959f730.js`)

**Fix:**
1. **Nginx `proxy_pass` korrigiert:**
   - **Vorher:** `proxy_pass http://127.0.0.1:3000/_next/static/;` (trailing slash entfernt Pfad)
   - **Nachher:** `proxy_pass http://127.0.0.1:3000;` (ohne trailing slash, behält vollständigen Pfad)

2. **Cache-Header angepasst:**
   - Static Files sollten gecacht werden (`Cache-Control: public, max-age=31536000, immutable`)
   - Nur HTML-Seiten sollten nicht gecacht werden

**Geänderte Datei:**
- `/etc/nginx/sites-available/gaestefotos-v2.conf` - Zeile 109-119

**Vorher:**
```nginx
location /_next/static/ {
    proxy_pass http://127.0.0.1:3000/_next/static/;
    # ...
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

**Nachher:**
```nginx
location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    # ...
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

---

## 🔧 TECHNISCHE DETAILS

### Warum `proxy_pass` ohne trailing slash?
- **Mit trailing slash:** Nginx entfernt den matched location prefix (`/_next/static/`) und sendet nur den Rest
- **Ohne trailing slash:** Nginx behält den vollständigen Pfad und leitet ihn korrekt weiter

### URL-Encoding
- Next.js verwendet `[slug]` in Pfaden, die als `%5Bslug%5D` URL-encoded werden
- Nginx muss diese korrekt an Next.js weiterleiten

### Build-Hashes
- Next.js erstellt bei jedem Build neue Hash-Dateien für Cache-Busting
- Alte Hash-Dateien existieren nicht mehr
- Browser-Cache sollte geleert werden, um neue Dateien zu laden

---

## 📋 GETESTET

**Nginx-Konfiguration:**
```bash
nginx -t
# ✅ Syntax OK
```

**Frontend-Service:**
```bash
systemctl restart gaestefotos-frontend
# ✅ Service neu gestartet
```

**Nginx neu geladen:**
```bash
systemctl reload nginx
# ✅ Nginx neu geladen
```

---

## 🚀 DEPLOYMENT

**Status:** ✅ Nginx-Konfiguration korrigiert und neu geladen

**Bitte testen:**
1. Browser-Cache leeren (Hard Reload: Ctrl+Shift+R oder Cmd+Shift+R)
2. Seite neu laden
3. Keine 400/MIME Type Fehler mehr in der Console

**Falls weiterhin Fehler:**
- Prüfen, ob der Frontend-Service läuft: `systemctl status gaestefotos-frontend`
- Prüfen, ob die neue Hash-Datei existiert: `ls -la packages/frontend/.next/static/chunks/app/e/\[slug\]/`
- Browser-Cache komplett leeren

