# 📊 Admin-Dashboard Plan - dash.gästefotos.com

**Datum:** 2025-12-12  
**Status:** 🎯 Planungsphase  
**Ziel:** Admin-Dashboard für System-Überwachung und Verwaltung

---

## 🎯 Konzept

Ein separates Admin-Dashboard unter `dash.gästefotos.com` für:
- System-Überwachung
- Server-Status
- Anwendungs-Metriken
- Benutzer-Verwaltung
- Event-Übersicht
- Performance-Monitoring

---

## ✨ Features

### 📈 System-Übersicht (Dashboard Home)

#### Server-Status
- [ ] **Services Status**
  - Nginx (uptime, status)
  - Apache (uptime, status)
  - PHP-FPM (uptime, status)
  - Backend API (Port 8001, health check)
  - Frontend (Port 3000, health check)
  - PostgreSQL (connection status)
  - Redis (connection status)
  - SeaweedFS (connection status)

- [ ] **Server-Ressourcen**
  - CPU-Auslastung
  - RAM-Auslastung
  - Disk-Space (gesamt, verwendet, verfügbar)
  - Network I/O
  - Load Average

- [ ] **System-Informationen**
  - Server-Uptime
  - OS-Version
  - Node.js Version
  - PostgreSQL Version
  - Letzte Updates

#### Anwendungs-Metriken
- [ ] **Event-Statistiken**
  - Gesamtanzahl Events
  - Aktive Events
  - Events heute/ diese Woche/ diesen Monat
  - Events nach Status

- [ ] **Foto-Statistiken**
  - Gesamtanzahl Fotos
  - Fotos heute/ diese Woche/ diesen Monat
  - Fotos nach Status (approved, pending, rejected)
  - Durchschnittliche Fotos pro Event
  - Storage-Verbrauch (GB)

- [ ] **Benutzer-Statistiken**
  - Gesamtanzahl Benutzer
  - Neue Benutzer heute/ diese Woche/ diesen Monat
  - Aktive Benutzer (letzte 30 Tage)
  - Benutzer nach Rolle

- [ ] **Performance-Metriken**
  - API Response Times (durchschnittlich, p95, p99)
  - API Request Count (heute, diese Woche)
  - Error Rate
  - Upload Success Rate
  - Database Query Performance

### 🔍 Monitoring & Logs

- [ ] **Error Logs**
  - Letzte Fehler (Backend, Frontend, Server)
  - Error Rate Trend
  - Kritische Fehler
  - Fehler nach Typ

- [ ] **Access Logs**
  - API Requests (Top Endpoints)
  - Traffic-Statistiken
  - Geografische Verteilung
  - User Agents

- [ ] **System Logs**
  - Nginx Logs (letzte Einträge)
  - Apache Logs (letzte Einträge)
  - PHP-FPM Logs
  - Application Logs

### 👥 Benutzer-Verwaltung

- [ ] **Benutzer-Liste**
  - Alle Benutzer anzeigen
  - Suche & Filter
  - Sortierung
  - Pagination

- [ ] **Benutzer-Details**
  - Profil-Informationen
  - Events (erstellt, teilgenommen)
  - Aktivitäts-Historie
  - Letzte Anmeldung

- [ ] **Benutzer-Aktionen**
  - Benutzer aktivieren/deaktivieren
  - Rolle ändern
  - Passwort zurücksetzen
  - Benutzer löschen

### 📅 Event-Verwaltung

- [ ] **Event-Übersicht**
  - Alle Events anzeigen
  - Filter (Status, Datum, Host)
  - Sortierung
  - Bulk-Aktionen

- [ ] **Event-Details**
  - Event-Informationen
  - Fotos (Anzahl, Status)
  - Gäste (Anzahl, Status)
  - Statistiken
  - Aktivitäts-Log

- [ ] **Event-Aktionen**
  - Event bearbeiten
  - Event löschen
  - Event deaktivieren
  - Event-Statistiken exportieren

### 🔧 System-Verwaltung

- [ ] **Konfiguration**
  - Umgebungsvariablen anzeigen (maskiert)
  - Feature Flags
  - System-Einstellungen

- [ ] **Wartung**
  - Cache leeren (Redis, Application)
  - Logs rotieren
  - Database optimieren
  - Storage aufräumen

- [ ] **Backups**
  - Backup-Status
  - Backup erstellen
  - Backup wiederherstellen
  - Backup-Historie

### 📊 Reports & Analytics

- [ ] **Reports**
  - Tägliche Reports
  - Wöchentliche Reports
  - Monatliche Reports
  - Custom Reports

- [ ] **Analytics**
  - Nutzungs-Trends
  - Wachstums-Metriken
  - Conversion-Raten
  - Retention-Raten

---

## 🛠️ Technische Umsetzung

### Option 1: Separate Next.js App (Empfohlen)

**Vorteile:**
- ✅ Separate Codebase (keine Vermischung mit User-Dashboard)
- ✅ Eigene Authentifizierung
- ✅ Unabhängige Deployment
- ✅ Bessere Sicherheit (separate Route)

**Struktur:**
```
gaestefotos-app-v2/
├── packages/
│   ├── admin-dashboard/     # Neue App
│   │   ├── src/
│   │   │   └── app/
│   │   │       ├── dashboard/
│   │   │       ├── users/
│   │   │       ├── events/
│   │   │       ├── system/
│   │   │       └── logs/
│   │   └── package.json
```

### Option 2: Erweitern des bestehenden Frontends

**Vorteile:**
- ✅ Code-Sharing
- ✅ Einfacheres Deployment
- ✅ Gemeinsame Komponenten

**Nachteile:**
- ⚠️ Vermischung von User- und Admin-Features
- ⚠️ Komplexere Route-Struktur

### Option 3: Separate Admin-Route im Frontend

**Vorteile:**
- ✅ Code-Sharing
- ✅ Einfacheres Deployment
- ✅ Gemeinsame API

**Nachteile:**
- ⚠️ Vermischung von User- und Admin-Features
- ⚠️ Komplexere Route-Struktur

---

## 🔐 Authentifizierung & Sicherheit

### Admin-Authentifizierung
- [ ] **Separate Admin-Authentifizierung**
  - Admin-Login-Seite
  - JWT-Token mit Admin-Rolle
  - Session-Management

- [ ] **Zugriffskontrolle**
  - Role-Based Access Control (RBAC)
  - Superadmin vs. Admin
  - Feature-spezifische Berechtigungen

- [ ] **Sicherheits-Features**
  - Two-Factor Authentication (2FA)
  - IP-Whitelist (optional)
  - Rate Limiting
  - Audit Log

### API-Sicherheit
- [ ] **Admin-API-Endpoints**
  - Separate Route: `/api/admin/*`
  - Admin-Middleware
  - Rate Limiting
  - Request Validation

---

## 📡 Backend-Erweiterungen

### Neue API-Endpoints

#### System-Status
```typescript
GET /api/admin/system/status
GET /api/admin/system/resources
GET /api/admin/system/services
GET /api/admin/system/info
```

#### Monitoring
```typescript
GET /api/admin/monitoring/metrics
GET /api/admin/monitoring/logs
GET /api/admin/monitoring/errors
GET /api/admin/monitoring/performance
```

#### Benutzer-Verwaltung
```typescript
GET /api/admin/users
GET /api/admin/users/:id
PUT /api/admin/users/:id
DELETE /api/admin/users/:id
POST /api/admin/users/:id/reset-password
```

#### Event-Verwaltung
```typescript
GET /api/admin/events
GET /api/admin/events/:id
PUT /api/admin/events/:id
DELETE /api/admin/events/:id
```

#### System-Verwaltung
```typescript
POST /api/admin/system/cache/clear
POST /api/admin/system/logs/rotate
POST /api/admin/system/database/optimize
POST /api/admin/system/storage/cleanup
```

---

## 🎨 UI/UX Design

### Design-System
- [ ] **Konsistentes Design**
  - Gleiche Farbpalette wie Haupt-App
  - Dark Mode Support
  - Responsive Design

- [ ] **Komponenten**
  - Dashboard Cards
  - Charts (Recharts)
  - Tables (sortierbar, filterbar)
  - Modals
  - Notifications

### Layout
- [ ] **Navigation**
  - Sidebar Navigation
  - Breadcrumbs
  - Quick Actions
  - Search

- [ ] **Dashboard Home**
  - Overview Cards
  - Charts (Trends, Verteilung)
  - Recent Activity
  - Alerts & Notifications

---

## 📦 Dependencies

### Frontend
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "recharts": "^3.5.1",        // Charts
    "date-fns": "^2.30.0",        // Date formatting
    "react-table": "^7.8.0",      // Tables
    "react-hot-toast": "^2.4.1"   // Notifications
  }
}
```

### Backend
```json
{
  "dependencies": {
    "systeminformation": "^5.21.0",  // System info
    "node-cron": "^3.0.3"            // Scheduled tasks
  }
}
```

---

## 🚀 Deployment

### Subdomain-Konfiguration

#### DNS
- [ ] **DNS-Eintrag erstellen**
  - `dash.gästefotos.com` → Server-IP
  - Oder: `dash.xn--gstefotos-v2a.com`

#### Nginx-Konfiguration
```nginx
server {
    listen 443 ssl http2;
    server_name dash.gästefotos.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;  # Admin-Dashboard Port
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### Port-Konfiguration
- **Admin-Dashboard:** Port 3001 (separat vom Frontend)
- **Backend API:** Port 8001 (bestehend)
- **Frontend:** Port 3000 (bestehend)

---

## 📋 Implementierungs-Plan

### Phase 1: Grundlagen (Woche 1)
- [ ] Projekt-Struktur erstellen
- [ ] Admin-Dashboard App initialisieren
- [ ] Basis-Layout & Navigation
- [ ] Authentifizierung implementieren
- [ ] Subdomain-Konfiguration

### Phase 2: System-Status (Woche 2)
- [ ] System-Status API-Endpoints
- [ ] Server-Ressourcen Monitoring
- [ ] Services-Status Anzeige
- [ ] Dashboard Home Page

### Phase 3: Monitoring (Woche 3)
- [ ] Logs-Integration
- [ ] Error-Tracking
- [ ] Performance-Metriken
- [ ] Charts & Visualisierungen

### Phase 4: Verwaltung (Woche 4)
- [ ] Benutzer-Verwaltung
- [ ] Event-Verwaltung
- [ ] System-Verwaltung
- [ ] Reports & Analytics

### Phase 5: Polishing (Woche 5)
- [ ] UI/UX Verbesserungen
- [ ] Performance-Optimierungen
- [ ] Testing
- [ ] Dokumentation

---

## 🔄 Integration mit bestehender App

### API-Sharing
- [ ] **Gemeinsame API**
  - Bestehende Endpoints nutzen
  - Neue Admin-Endpoints hinzufügen
  - Middleware für Admin-Berechtigung

### Daten-Sharing
- [ ] **Gemeinsame Datenbank**
  - PostgreSQL (bestehend)
  - Prisma Schema erweitern (falls nötig)

### Code-Sharing
- [ ] **Shared Package**
  - Types & Interfaces
  - Utilities
  - API Client

---

## 📊 Metriken & KPIs

### Dashboard-Metriken
- **System Health Score** (0-100)
- **Uptime** (Prozent)
- **Error Rate** (Prozent)
- **Response Time** (ms)
- **Active Users** (Anzahl)
- **Storage Usage** (GB / Prozent)

### Alerts
- [ ] **Automatische Alerts**
  - Service Down
  - High Error Rate
  - High CPU/RAM Usage
  - Disk Space Low
  - Database Connection Issues

---

## 🎯 Nächste Schritte

### Sofort
1. ✅ Plan erstellt
2. ⚠️ Entscheidung: Separate App vs. Erweiterung
3. ⚠️ Subdomain-Konfiguration (DNS + Nginx)
4. ⚠️ Projekt-Struktur erstellen

### Kurzfristig
1. ⚠️ Basis-Layout & Navigation
2. ⚠️ Authentifizierung
3. ⚠️ System-Status API
4. ⚠️ Dashboard Home Page

### Mittelfristig
1. ⚠️ Monitoring & Logs
2. ⚠️ Benutzer-Verwaltung
3. ⚠️ Event-Verwaltung
4. ⚠️ Reports & Analytics

---

## 💡 Empfehlungen

### Technologie-Stack
- **Frontend:** Next.js 14 (App Router) - konsistent mit Haupt-App
- **Backend:** Express.js - bestehende API erweitern
- **Charts:** Recharts - bereits in Frontend verwendet
- **Styling:** Tailwind CSS - konsistent mit Haupt-App

### Architektur
- **Separate App** empfohlen für:
  - Bessere Sicherheit
  - Klare Trennung
  - Unabhängige Deployment
  - Einfacheres Maintenance

### Sicherheit
- **2FA** für Admin-Accounts
- **IP-Whitelist** (optional, für erhöhte Sicherheit)
- **Audit Log** für alle Admin-Aktionen
- **Rate Limiting** für Admin-API

---

**Erstellt am:** 2025-12-12  
**Status:** 🎯 Bereit für Implementierung

