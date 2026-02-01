# Manuelle QA-Checkliste - Post-Deployment

**Version:** Next.js 16.1.2 Update  
**Datum:** 15.01.2026  
**Tester:** _______________  
**Umgebung:** Production (app.gästefotos.com)

---

## 🎯 Checkliste-Übersicht

- [ ] **1. Frontend (Gast-Perspektive)** - 15 Checks
- [ ] **2. Frontend (Host-Perspektive)** - 20 Checks  
- [ ] **3. Admin-Dashboard** - 12 Checks
- [ ] **4. Backend API** - 8 Checks
- [ ] **5. Security & Performance** - 10 Checks
- [ ] **6. Mobile/Cross-Browser** - 6 Checks

**Gesamt:** 71 Test-Cases

---

## 1. Frontend - Gast-Perspektive (Öffentlich)

### 1.1 Landing & Navigation
- [ ] **Startseite laden** (https://app.gästefotos.com)
  - [ ] Seite lädt ohne Fehler
  - [ ] Keine Console Errors (F12 öffnen)
  - [ ] Layout ist korrekt (kein Versatz, keine überlappenden Elemente)
  - [ ] Navigation funktioniert (Header, Footer)

- [ ] **Rechtliche Seiten**
  - [ ] `/impressum` lädt korrekt
  - [ ] `/datenschutz` lädt korrekt
  - [ ] `/agb` lädt korrekt
  - [ ] Alle Links funktionieren

### 1.2 Event-Zugang (Gast)
- [ ] **Event über Shortlink öffnen** (`/s/[code]` oder `/s2/[code]`)
  - [ ] Shortlink-Redirect funktioniert
  - [ ] Weiterleitung zur Event-Seite erfolgreich
  - [ ] Keine 404 Fehler

- [ ] **Event-Galerie** (`/e/[slug]` oder `/e2/[slug]`)
  - [ ] Event-Header wird angezeigt (Titel, Datum, Location)
  - [ ] Fotos laden korrekt (Grid-Layout)
  - [ ] Lazy Loading funktioniert (beim Scrollen)
  - [ ] **StoryViewer** öffnet beim Klick auf Story
    - [ ] Stories durchblättern funktioniert
    - [ ] Schließen-Button funktioniert
    - [ ] Keine Memory-Leaks (nach Durchsehen von 10+ Stories)

- [ ] **FaceSearch** (Gesichtssuche)
  - [ ] Upload eines Profilbildes funktioniert
  - [ ] Suche startet und zeigt Ergebnisse
  - [ ] Ähnliche Fotos werden angezeigt
  - [ ] Performance ist akzeptabel (<5s)

### 1.3 Foto-Interaktionen (Gast)
- [ ] **Foto-Details öffnen**
  - [ ] Fullscreen-View funktioniert
  - [ ] Zoom funktioniert
  - [ ] Navigation (Prev/Next) funktioniert
  - [ ] Schließen funktioniert

- [ ] **Foto-Upload** (als Gast)
  - [ ] Upload-Button sichtbar
  - [ ] File-Picker öffnet
  - [ ] Upload startet (Progress-Bar sichtbar)
  - [ ] Upload schließt erfolgreich ab
  - [ ] Foto erscheint in Galerie

- [ ] **Foto-Likes**
  - [ ] Like-Button funktioniert
  - [ ] Like-Count aktualisiert sich
  - [ ] Unlike funktioniert

---

## 2. Frontend - Host-Perspektive (Authenticated)

### 2.1 Authentication
- [ ] **Login** (`/login`)
  - [ ] Login-Formular anzeigen
  - [ ] Mit gültigen Credentials einloggen
  - [ ] Redirect zu `/dashboard` nach Login
  - [ ] Session bleibt erhalten (Page-Reload)

- [ ] **Logout**
  - [ ] Logout-Button funktioniert
  - [ ] Redirect zu Landing-Page
  - [ ] Session wird gelöscht

### 2.2 Dashboard (`/dashboard`)
- [ ] **Dashboard lädt korrekt**
  - [ ] Übersicht aller Events
  - [ ] Event-Cards zeigen korrekte Infos (Titel, Foto-Count, Datum)
  - [ ] "Neues Event erstellen" Button funktioniert

### 2.3 Event-Management (`/events/[id]/dashboard`)
- [ ] **Event-Dashboard öffnen**
  - [ ] Dashboard lädt ohne Errors
  - [ ] **QRDesignerPanel** lädt (Lazy Loading)
    - [ ] QR-Code wird generiert
    - [ ] QR-Design ändern funktioniert
    - [ ] Export als PDF funktioniert
  - [ ] Statistiken werden angezeigt
  - [ ] Upload-Aktivität wird angezeigt

- [ ] **Event bearbeiten** (`/events/[id]/edit`)
  - [ ] Formular lädt mit aktuellen Daten
  - [ ] Änderungen speichern funktioniert
  - [ ] Cover-Bild Upload funktioniert
  - [ ] Validierung funktioniert (z.B. Titel erforderlich)

### 2.4 Foto-Management (`/events/[id]/photos`)
- [ ] **Foto-Verwaltung**
  - [ ] Alle Event-Fotos werden geladen
  - [ ] **PhotoEditor** öffnet beim Edit-Klick (Lazy Loading)
    - [ ] Foto-Rotation funktioniert
    - [ ] Crop funktioniert
    - [ ] Filter funktionieren
    - [ ] Speichern funktioniert
  - [ ] Foto-Löschen funktioniert (mit Confirmation)
  - [ ] Bulk-Selection funktioniert
  - [ ] Download-Funktion funktioniert

### 2.5 Kategorien (`/events/[id]/categories`)
- [ ] **Kategorie-Management**
  - [ ] Kategorien werden angezeigt
  - [ ] Neue Kategorie erstellen funktioniert
  - [ ] Kategorie bearbeiten funktioniert
  - [ ] Kategorie löschen funktioniert
  - [ ] Fotos zu Kategorie hinzufügen funktioniert
  - [ ] Smart-Album funktioniert (automatische Zuordnung)

### 2.6 Statistiken (`/events/[id]/statistics`)
- [ ] **Statistik-Seite**
  - [ ] Seite lädt ohne Errors
  - [ ] **Recharts** lädt (Lazy Loading)
    - [ ] Upload-Verlauf Chart anzeigen
    - [ ] Like-Statistik Chart anzeigen
    - [ ] Gäste-Aktivität Chart anzeigen
  - [ ] Daten sind korrekt (keine 0-Werte wenn Daten vorhanden)

### 2.7 Einladungen (`/events/[id]/invitations`)
- [ ] **Einladungs-Management**
  - [ ] Einladungs-Templates laden
  - [ ] Preview funktioniert
  - [ ] Neues Template erstellen funktioniert
  - [ ] Template bearbeiten funktioniert
  - [ ] QR-Code im Template wird angezeigt

### 2.8 Gästebuch (`/events/[id]/guestbook`)
- [ ] **Gästebuch-Verwaltung**
  - [ ] Einträge werden angezeigt
  - [ ] Neue Einträge erscheinen (Real-Time)
  - [ ] Einträge löschen funktioniert
  - [ ] Einträge moderieren funktioniert

### 2.9 Challenges (`/events/[id]/challenges`)
- [ ] **Challenge-System**
  - [ ] Challenges werden angezeigt
  - [ ] Challenge erstellen funktioniert
  - [ ] Challenge bearbeiten funktioniert
  - [ ] Challenge-Fortschritt wird angezeigt

### 2.10 QR-Design (`/events/[id]/qr-styler`)
- [ ] **QR-Code Designer**
  - [ ] Designer lädt korrekt
  - [ ] Vorlagen funktionieren
  - [ ] Custom-Design erstellen funktioniert
  - [ ] Export funktioniert (PNG, SVG, PDF)

---

## 3. Admin-Dashboard (Super-Admin)

### 3.1 Admin-Login
- [ ] **Admin-Dashboard Zugang**
  - [ ] Login mit Admin-Credentials (`/admin/login` oder separate URL)
  - [ ] Dashboard lädt (`/admin/dashboard`)
  - [ ] Keine TypeScript/Build Errors in Console

### 3.2 System-Übersicht (`/admin/dashboard`)
- [ ] **Dashboard-Metriken**
  - [ ] User-Count anzeigen
  - [ ] Event-Count anzeigen
  - [ ] Photo-Count anzeigen
  - [ ] Storage-Usage anzeigen
  - [ ] Charts rendern korrekt

### 3.3 User-Management (`/admin/users`)
- [ ] **User-Verwaltung**
  - [ ] User-Liste lädt
  - [ ] Suchen funktioniert
  - [ ] User-Details öffnen
  - [ ] User bearbeiten funktioniert
  - [ ] User-Rolle ändern funktioniert

### 3.4 Event-Management (`/admin/events`)
- [ ] **Event-Übersicht**
  - [ ] Alle Events werden angezeigt
  - [ ] Filtern funktioniert
  - [ ] Event-Details öffnen (`/admin/events/[id]`)
  - [ ] Event löschen funktioniert

### 3.5 System-Settings
- [ ] **Maintenance Mode** (`/admin/maintenance`)
  - [ ] Maintenance Mode aktivieren funktioniert
  - [ ] Frontend zeigt Maintenance-Meldung
  - [ ] Maintenance Mode deaktivieren funktioniert

- [ ] **CMS-Sync** (`/admin/cms`)
  - [ ] Sync-Button funktioniert
  - [ ] Status wird angezeigt
  - [ ] Logs werden angezeigt

---

## 4. Backend API (Health-Checks)

### 4.1 Public Endpoints
- [ ] **GET /api/health**
  ```bash
  curl https://app.gästefotos.com/api/health
  ```
  - [ ] Response: `{"status":"healthy","version":"2.0.0"}`
  - [ ] Status Code: 200

- [ ] **GET /api/maintenance**
  ```bash
  curl https://app.gästefotos.com/api/maintenance
  ```
  - [ ] Response: `{"enabled":false,"message":null}`
  - [ ] Status Code: 200

### 4.2 Protected Endpoints (Auth erforderlich)
- [ ] **POST /api/auth/login**
  - [ ] Login mit korrekten Credentials → 200 + Token
  - [ ] Login mit falschen Credentials → 401
  - [ ] Rate-Limiting greift nach 5 Fehlversuchen → 429

- [ ] **GET /api/events**
  - [ ] Mit Token → 200 + Event-Liste
  - [ ] Ohne Token → 401

### 4.3 Upload-Endpoints
- [ ] **POST /api/events/[id]/photos/upload**
  - [ ] Upload mit gültigem Token funktioniert
  - [ ] Upload ohne Token wird abgelehnt (401)
  - [ ] File-Type-Validation funktioniert (nur Images)
  - [ ] File-Size-Limit wird durchgesetzt

### 4.4 WebSocket/Real-Time
- [ ] **Socket.io Connection**
  - [ ] Browser-Console: Keine WebSocket Errors
  - [ ] Real-Time Updates funktionieren (z.B. neue Fotos)

---

## 5. Security & Performance

### 5.1 Security Headers
- [ ] **HTTP Headers prüfen**
  ```bash
  curl -I https://app.gästefotos.com
  ```
  - [ ] `x-frame-options: SAMEORIGIN` vorhanden
  - [ ] `x-content-type-options: nosniff` vorhanden
  - [ ] `strict-transport-security` vorhanden (HSTS)
  - [ ] `x-powered-by` NICHT vorhanden (oder nicht "Express")

### 5.2 HTTPS & Certificates
- [ ] **SSL-Zertifikat**
  - [ ] Gültig (kein Browser-Warning)
  - [ ] Cloudflare aktiv
  - [ ] HTTPS-Redirect funktioniert (http → https)

### 5.3 Performance
- [ ] **Page Load Times**
  - [ ] Startseite lädt in <2s
  - [ ] Event-Galerie lädt in <3s
  - [ ] Dashboard lädt in <3s

- [ ] **Bundle Sizes (Browser DevTools → Network)**
  - [ ] Keine einzelnen Chunks >1 MB
  - [ ] Lazy Loading funktioniert (Chunks laden on-demand)

### 5.4 Rate Limiting
- [ ] **API Rate-Limits**
  - [ ] Login: Max 5 Versuche/Minute
  - [ ] Upload: Max 10 Uploads/Minute (Gast)
  - [ ] Rate-Limit Response: 429 + Retry-After Header

### 5.5 Error Handling
- [ ] **404-Seite**
  - [ ] Ungültige URL → Custom 404
  - [ ] Design ist konsistent

- [ ] **500-Fehler**
  - [ ] Keine 500-Errors in Production sichtbar
  - [ ] Fallback-UI wird angezeigt

---

## 6. Mobile & Cross-Browser

### 6.1 Mobile (Smartphone)
- [ ] **iOS Safari**
  - [ ] Layout responsive
  - [ ] Touch-Gesten funktionieren
  - [ ] Foto-Upload funktioniert
  - [ ] Keine Layout-Bugs

- [ ] **Android Chrome**
  - [ ] Layout responsive
  - [ ] Touch-Gesten funktionieren
  - [ ] Foto-Upload funktioniert
  - [ ] Keine Layout-Bugs

### 6.2 Desktop Browser
- [ ] **Chrome/Edge (latest)**
  - [ ] Alle Features funktionieren
  - [ ] Keine Console Errors

- [ ] **Firefox (latest)**
  - [ ] Alle Features funktionieren
  - [ ] Keine Console Errors

- [ ] **Safari (macOS)**
  - [ ] Alle Features funktionieren
  - [ ] Keine Console Errors

### 6.3 Responsive Design
- [ ] **Breakpoints testen**
  - [ ] Mobile (<768px)
  - [ ] Tablet (768px-1024px)
  - [ ] Desktop (>1024px)
  - [ ] Keine horizontalen Scrollbars (außer gewollt)

---

## 7. Regression Tests (Kritische Bugs)

### 7.1 Next.js 16 Breaking Changes
- [ ] **headers() async Fix**
  - [ ] Shortlink-Redirect (`/s2/[code]`) funktioniert
  - [ ] Keine "Property 'get' does not exist" Errors

- [ ] **Middleware Deprecation**
  - [ ] Middleware funktioniert trotz Warning
  - [ ] Keine Routing-Probleme

### 7.2 Bekannte Issues (falls vorhanden)
- [ ] **_[Liste bekannter Issues einfügen]_**
  - [ ] Issue #1: ...
  - [ ] Issue #2: ...

---

## 8. Final Sign-Off

### 8.1 Production Readiness
- [ ] **Alle kritischen Test-Cases bestanden**
  - [ ] 0 Blocker-Bugs gefunden
  - [ ] 0 Critical-Bugs gefunden
  - [ ] High-Priority Bugs: ___ (Liste anhängen)
  - [ ] Medium/Low-Priority Bugs: ___ (Liste anhängen)

### 8.2 Dokumentation
- [ ] **Release Notes aktualisiert**
- [ ] **System-Audit dokumentiert** (`docs/SYSTEM_AUDIT_2026-01-15.md`)
- [ ] **Dependency-Updates dokumentiert** (`docs/DEPENDENCY_UPDATES_2026-01-15.md`)

### 8.3 Monitoring
- [ ] **Logs prüfen** (erste 24h nach Deployment)
  ```bash
  journalctl -u gaestefotos-frontend.service -f
  journalctl -u gaestefotos-backend.service -f
  ```
- [ ] **Sentry/Error-Tracking** prüfen (falls aktiv)
- [ ] **Performance-Monitoring** aktiv

---

## Sign-Off

**Tester:** _______________  
**Datum:** _______________  
**Ergebnis:** ☐ PASSED | ☐ PASSED WITH ISSUES | ☐ FAILED

**Notizen:**
```
[Platz für Anmerkungen, gefundene Bugs, etc.]
```

---

## Hilfreiche Test-Commands

### Browser Console Checks
```javascript
// Check für Memory Leaks
performance.memory.usedJSHeapSize / 1024 / 1024 + ' MB'

// Check für Console Errors
console.error = (function() {
  var error = console.error;
  return function(exception) {
    alert('ERROR: ' + exception);
    error.apply(console, arguments);
  };
})();
```

### API Testing
```bash
# Health Check
curl https://app.gästefotos.com/api/health | jq .

# Response Time Test
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://app.gästefotos.com

# Header Check
curl -I https://app.gästefotos.com | grep -E "x-|strict-transport"
```

### Performance Audit
```bash
# Lighthouse CI (wenn installiert)
lighthouse https://app.gästefotos.com --output html --output-path ./report.html

# Bundle Analyzer
cd packages/frontend && ANALYZE=true pnpm build
```

---

**Version:** 1.0  
**Letzte Aktualisierung:** 15.01.2026, 19:40 CET  
**Nächstes Update:** Nach nächstem Major Release
