# Offene Fragen & TODOs

**Für den User zum Review:**

## 1. Email SMTP Konfiguration
- **Frage:** Wo werden SMTP Credentials gespeichert?
- **Antwort:** In `.env` Datei im Backend-Ordner
- **Variablen:** SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
- **Status:** Service ist implementiert, muss nur konfiguriert werden

## 2. Foto-Bearbeitung (Rotation, Crop)
- **Frage:** Soll das implementiert werden?
- **Optionen:**
  - Server-seitig mit Sharp (besser für Performance)
  - Client-seitig mit Canvas API (schneller, aber größere Uploads)
- **Status:** Noch nicht implementiert, kann später ergänzt werden

## 3. PWA Features
- **Frage:** Welche Features sollen offline verfügbar sein?
- **Aktuell:** Basic Service Worker, manifest erstellt
- **Mögliche Erweiterungen:**
  - Offline-Galerie (Cache approved photos)
  - Offline-Upload-Queue
  - Push-Benachrichtigungen

## 4. White-Label Customization
- **Frage:** Soll White-Label Feature komplett implementiert werden?
- **Was fehlt:**
  - Logo-Upload UI
  - Farben-Anpassung UI
  - Custom Domain Setup (Nginx Config)
- **Storage:** Logos können in SeaweedFS gespeichert werden

## 5. Custom Domains
- **Frage:** Sollen Events eigene Subdomains bekommen können?
- **Beispiel:** `event-slug.app.gästefotos.com`
- **Benötigt:** Nginx Config Generator, DNS Setup

## 6. Testing
- **Frage:** Sollen automatische Tests erstellt werden?
- **Optionen:**
  - Unit Tests (Jest)
  - Integration Tests
  - E2E Tests (Playwright/Cypress)

## 7. Performance Optimierung
- **Frage:** Sollen weitere Optimierungen gemacht werden?
- **Mögliche Verbesserungen:**
  - Image CDN Integration
  - Redis Caching
  - Database Query Optimization
  - API Rate Limiting

## 8. Monitoring & Logging
- **Frage:** Soll Monitoring/Logging eingerichtet werden?
- **Optionen:**
  - Sentry für Error Tracking
  - Logging Service (Winston, Pino)
  - Analytics Integration

## 9. Backup & Recovery
- **Frage:** Soll automatisches Backup eingerichtet werden?
- **Benötigt:** Database Backup Script, Storage Backup

## 10. Multi-Language Support
- **Frage:** Soll i18n komplett implementiert werden?
- **Aktuell:** Alles auf Deutsch
- **Erweiterung:** next-intl für mehrsprachige Unterstützung

---

**Diese Fragen können beim nächsten Review besprochen werden.**
**Kern-Features sind alle implementiert und funktionsfähig!**















