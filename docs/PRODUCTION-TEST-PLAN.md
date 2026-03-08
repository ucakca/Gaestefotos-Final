# Production Test Plan — gästefotos.com

> Erstellt: März 2026  
> Version: 1.0  
> Ziel: Vollständige manuelle Prüfung aller Komponenten vor Produktions-Release

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Bestanden |
| ❌ | Fehlgeschlagen |
| ⚠️ | Teilweise / Einschränkung |
| ⏭️ | Übersprungen (nicht verfügbar) |
| 🔲 | Noch nicht getestet |

**URLs:**
- **Admin Dashboard:** `https://dash.gaestefotos.com` (Port 3001)
- **Host + App:** `https://app.gaestefotos.com` (Port 3000)
- **Backend API:** `https://api.gästefotos.com` (Port 8001)

---

## 0. Voraussetzungen & Setup

### 0.1 Test-Event erstellen
- [ ] Login als Host-User (nicht Admin)
- [ ] Neues Test-Event erstellen: `Produktionstest März 2026`
- [ ] Event-Slug notieren: `_______________`
- [ ] Event-ID notieren: `_______________`
- [ ] Mindestens 3 Testfotos hochladen (verschiedene Formate: JPG, PNG)

### 0.2 Test-Accounts
| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Admin | | |
| Host (FREE) | | |
| Host (BASIC) | | |
| Host (PREMIUM) | | |
| Gast | — | — |

### 0.3 Services-Status prüfen
```bash
systemctl status gaestefotos-backend
systemctl status gaestefotos-frontend
systemctl status gaestefotos-admin-dashboard
systemctl status redis
systemctl status ollama
```

---

## 1. ADMIN DASHBOARD (`dash.gaestefotos.com`)

### 1.1 System-Übersicht `/dashboard`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.1.1 | Seite lädt ohne Fehler | Keine JS-Errors in Console | 🔲 | |
| 1.1.2 | Server-Info Cards laden | CPU, RAM, Disk angezeigt | 🔲 | |
| 1.1.3 | Uptime-Anzeige | Korrekte Uptime in Stunden/Tagen | 🔲 | |
| 1.1.4 | Stats: User-Anzahl | Echte Zahl aus DB | 🔲 | |
| 1.1.5 | Stats: Event-Anzahl | Echte Zahl aus DB | 🔲 | |
| 1.1.6 | Stats: Foto-Anzahl | Echte Zahl aus DB | 🔲 | |
| 1.1.7 | Stats: AI-Job-Anzahl | Echte Zahl aus DB | 🔲 | |
| 1.1.8 | Load Average angezeigt | 3 Werte (1m, 5m, 15m) | 🔲 | |
| 1.1.9 | Memory-Auslastung | Korrekte Werte in MB/GB | 🔲 | |
| 1.1.10 | Disk-Auslastung | Korrekte Werte + Prozent | 🔲 | |

---

### 1.2 User-Verwaltung `/manage/users`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.2.1 | User-Liste lädt | Alle User sichtbar mit Rolle/Paket | 🔲 | |
| 1.2.2 | Suche nach User | Filtert korrekt nach Name/E-Mail | 🔲 | |
| 1.2.3 | User-Details öffnen | Modal/Seite mit User-Info | 🔲 | |
| 1.2.4 | User-Paket ändern | Paketänderung wird gespeichert | 🔲 | |
| 1.2.5 | User sperren/entsperren | Status ändert sich, Login blockiert | 🔲 | |

---

### 1.3 Events-Verwaltung `/manage/events`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.3.1 | Events-Liste lädt | Alle Events mit Status/Datum | 🔲 | |
| 1.3.2 | Event suchen | Filterung nach Name/Slug | 🔲 | |
| 1.3.3 | Event-Details `/manage/events/[id]` | Vollständige Event-Info | 🔲 | |
| 1.3.4 | Event-Fotos `/manage/events/[id]/photos` | Foto-Grid mit Thumbnails | 🔲 | |
| 1.3.5 | Foto löschen (Admin) | Foto verschwindet aus Grid | 🔲 | |
| 1.3.6 | Event deaktivieren | Status wechselt zu INACTIVE | 🔲 | |
| 1.3.7 | Neues Event erstellen `/manage/events/create` | Event wird angelegt | 🔲 | |

---

### 1.4 Partner-Verwaltung `/manage/partners`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.4.1 | Partner-Liste lädt | Liste mit Partner-Namen/Status | 🔲 | |
| 1.4.2 | Partner anlegen | Neuer Partner erscheint in Liste | 🔲 | |
| 1.4.3 | Partner-Details | Hardware-Zuordnung sichtbar | 🔲 | |

---

### 1.5 Paket-Verwaltung `/manage/packages`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.5.1 | Paket-Liste lädt | FREE, BASIC, SMART, PREMIUM sichtbar | 🔲 | |
| 1.5.2 | Paket-Grenzen korrekt | Foto-Limits, Feature-Flags stimmen | 🔲 | |
| 1.5.3 | Paket bearbeiten | Änderungen werden gespeichert | 🔲 | |

---

### 1.6 AI-Features `/manage/ai-features`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.6.1 | Feature-Liste lädt | Alle AI-Features mit Credit-Kosten | 🔲 | |
| 1.6.2 | Feature deaktivieren | Feature ist sofort gesperrt | 🔲 | |
| 1.6.3 | Credit-Kosten ändern | Neue Kosten werden übernommen | 🔲 | |
| 1.6.4 | Provider-Auswahl | Dropdown für jeden Feature sichtbar | 🔲 | |

---

### 1.7 AI-Jobs `/manage/ai-jobs`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.7.1 | Job-Liste lädt | Jobs mit Status PENDING/DONE/FAILED | 🔲 | |
| 1.7.2 | Job-Details | Input/Output + Fehler-Details | 🔲 | |
| 1.7.3 | Fehlgeschlagene Jobs | Retry-Option vorhanden | 🔲 | |

---

### 1.8 AI-Monitoring `/manage/ai-monitoring`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.8.1 | Monitoring-Dashboard lädt | Charts/Statistiken sichtbar | 🔲 | |
| 1.8.2 | Provider-Status | Fal.ai / Replicate Status angezeigt | 🔲 | |
| 1.8.3 | Cost-Tracking | Kosten pro Provider sichtbar | 🔲 | |

---

### 1.9 AI-Providers `/manage/ai-providers`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.9.1 | Provider-Liste | Fal.ai, Replicate, OpenAI, Groq, etc. | 🔲 | |
| 1.9.2 | API-Key testen | Test-Button → Erfolg/Fehler Meldung | 🔲 | |
| 1.9.3 | Provider aktivieren/deaktivieren | Status ändert sich sofort | 🔲 | |

---

### 1.10 ComfyUI `/manage/comfyui`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.10.1 | Workflow-Liste | Alle 18 Qwen-Workflows gelistet | 🔲 | |
| 1.10.2 | Workflow JSON anzeigen | Editor öffnet sich mit JSON | 🔲 | |
| 1.10.3 | Workflow-Test (1 Effect) | Test-Bild generieren → Ergebnis erscheint | 🔲 | |
| 1.10.4 | RunPod-Status | Endpoint-Status angezeigt | 🔲 | |

---

### 1.11 Cost-Monitoring `/manage/cost-monitoring`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.11.1 | Kosten-Dashboard | Tages/Monats-Kosten nach Provider | 🔲 | |
| 1.11.2 | Zeitraum-Filter | Filterung nach Datum funktioniert | 🔲 | |

---

### 1.12 Credits `/manage/credits`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.12.1 | Credit-Übersicht | Credit-Stand pro User/Event | 🔲 | |
| 1.12.2 | Credits manuell hinzufügen | Credits werden gutgeschrieben | 🔲 | |
| 1.12.3 | Credit-Historie | Transaktionen sichtbar | 🔲 | |

---

### 1.13 E-Mail Templates `/manage/email-templates`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.13.1 | Template-Liste | Alle Templates gelistet | 🔲 | |
| 1.13.2 | Template bearbeiten | Editor öffnet sich | 🔲 | |
| 1.13.3 | Test-Mail senden | E-Mail kommt an | 🔲 | |

---

### 1.14 Prompt Templates `/manage/prompt-templates`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.14.1 | Template-Liste | Alle LLM-Templates (12+) sichtbar | 🔲 | |
| 1.14.2 | Template bearbeiten | Änderungen werden gespeichert | 🔲 | |
| 1.14.3 | Fallback-Prompts vorhanden | fortune_teller, ai_roast, etc. | 🔲 | |

---

### 1.15 QR-Templates `/manage/qr-templates`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.15.1 | Templates-Liste | QR-Design-Vorlagen sichtbar | 🔲 | |
| 1.15.2 | Template erstellen | Neues Template wird gespeichert | 🔲 | |

---

### 1.16 Event-Themes `/manage/event-themes`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.16.1 | Theme-Liste | Standard-Themes sichtbar | 🔲 | |
| 1.16.2 | Theme bearbeiten | Farben/Fonts änderbar | 🔲 | |

---

### 1.17 Face Swap Templates `/manage/face-swap-templates`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.17.1 | Template-Liste | Vorlagen für Face Swap sichtbar | 🔲 | |
| 1.17.2 | Template hochladen | Neue Vorlage wird gespeichert | 🔲 | |

---

### 1.18 Impersonation `/manage/impersonation`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.18.1 | User suchen | User-Suche funktioniert | 🔲 | |
| 1.18.2 | Als User einloggen | Host-Dashboard unter diesem User | 🔲 | |
| 1.18.3 | Impersonation beenden | Zurück zu Admin-Account | 🔲 | |

---

### 1.19 System-Analyse `/manage/system-analysis`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.19.1 | Analyse-Seite lädt | Keine Fehler | 🔲 | |
| 1.19.2 | Datenbank-Status | Verbindung OK | 🔲 | |
| 1.19.3 | Redis-Status | Verbindung OK | 🔲 | |
| 1.19.4 | Face Models vorhanden | Alle 6 Models ✅ | 🔲 | |

---

### 1.20 Workflows `/manage/workflows`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.20.1 | Workflow-Liste | Alle 11 Seeded Workflows sichtbar | 🔲 | |
| 1.20.2 | Workflow-Editor öffnen | Visual Editor lädt | 🔲 | |
| 1.20.3 | Workflow-Simulation | Simulationsmodus funktioniert | 🔲 | |

---

### 1.21 Settings

| # | Test | Seite | Erwartet | Status | Notizen |
|---|------|-------|----------|--------|---------|
| 1.21.1 | API-Keys | `/settings/api-keys` | Keys verschleiert angezeigt | 🔲 | |
| 1.21.2 | Key hinzufügen | `/settings/api-keys` | Neuer Key wird gespeichert | 🔲 | |
| 1.21.3 | E-Mail-Einstellungen | `/settings/email` | SMTP-Config sichtbar | 🔲 | |
| 1.21.4 | Test-Mail | `/settings/email` | Mail kommt an | 🔲 | |
| 1.21.5 | Allgemeine Einstellungen | `/settings/general` | Plattform-Name etc. | 🔲 | |
| 1.21.6 | Maintenance-Modus | `/settings/maintenance` | Toggle aktivier-/deaktivierbar | 🔲 | |

---

### 1.22 Feature Flags `/feature-flags`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.22.1 | Flag-Liste | Alle Feature Flags sichtbar | 🔲 | |
| 1.22.2 | Flag umschalten | Änderung wird gespeichert + wirkt sofort | 🔲 | |

---

### 1.23 KI-Studio `/manage/ki-studio`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.23.1 | Studio lädt | Keine Fehler | 🔲 | |
| 1.23.2 | Bild generieren | AI generiert Bild | 🔲 | |

---

### 1.24 Invitation Templates `/invitation-templates`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 1.24.1 | Template-Liste | Templates sichtbar | 🔲 | |
| 1.24.2 | Template bearbeiten | Editor öffnet sich | 🔲 | |

---

## 2. HOST DASHBOARD (`app.gaestefotos.com/events/[id]/...`)

### 2.1 Authentifizierung & Account

| # | Test | URL | Erwartet | Status | Notizen |
|---|------|-----|----------|--------|---------|
| 2.1.1 | Registrierung | `/register` | Neuer Account wird angelegt | 🔲 | |
| 2.1.2 | E-Mail-Bestätigung | — | Bestätigungs-Mail kommt an | 🔲 | |
| 2.1.3 | Login | `/login` | Weiterleitung zu Dashboard | 🔲 | |
| 2.1.4 | Passwort vergessen | `/forgot-password` | Reset-Mail kommt an | 🔲 | |
| 2.1.5 | Passwort zurücksetzen | Reset-Link | Neues Passwort wird gesetzt | 🔲 | |
| 2.1.6 | Logout | — | Session beendet, Weiterleitung | 🔲 | |

---

### 2.2 Host-Dashboard Übersicht `/dashboard`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.2.1 | Seite lädt | Event-Liste sichtbar | 🔲 | |
| 2.2.2 | Aktive Events angezeigt | Events mit Foto-Count/Datum | 🔲 | |
| 2.2.3 | Paket-Status sichtbar | Aktuelles Paket + Grenzen | 🔲 | |
| 2.2.4 | Neues Event Button | Weiterleitung zu Create-Event | 🔲 | |

---

### 2.3 Event erstellen `/create-event` oder `/events/new`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.3.1 | Formular lädt | Alle Pflichtfelder sichtbar | 🔲 | |
| 2.3.2 | Event-Name eingeben | Eingabe funktioniert | 🔲 | |
| 2.3.3 | Event-Datum setzen | Datepicker funktioniert | 🔲 | |
| 2.3.4 | Slug auto-generiert | Aus Name generiert, editierbar | 🔲 | |
| 2.3.5 | Event speichern | Weiterleitung zu Event-Dashboard | 🔲 | |
| 2.3.6 | Slug-Duplikat | Fehlermeldung bei doppeltem Slug | 🔲 | |

---

### 2.4 Event-Dashboard `/events/[id]/dashboard`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.4.1 | Dashboard lädt | Alle Sections sichtbar | 🔲 | |
| 2.4.2 | QR-Code angezeigt | Gäste-QR-Code sichtbar + downloadbar | 🔲 | |
| 2.4.3 | Foto-Statistiken | Foto-Anzahl, letzte Uploads | 🔲 | |
| 2.4.4 | Quick-Links | Alle Unter-Seiten erreichbar | 🔲 | |
| 2.4.5 | Live-Wall Link | Link zur Live-Wall öffnet sich | 🔲 | |
| 2.4.6 | Social Accounts Manager | Instagram/Facebook verbinden | 🔲 | |
| 2.4.7 | Event-Status (aktiv/inaktiv) | Toggle funktioniert | 🔲 | |

---

### 2.5 Fotos-Verwaltung `/events/[id]/photos`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.5.1 | Foto-Grid lädt | Alle Fotos als Thumbnails | 🔲 | |
| 2.5.2 | Foto-Lightbox öffnen | Klick öffnet Vollbild | 🔲 | |
| 2.5.3 | Foto löschen | Foto verschwindet nach Bestätigung | 🔲 | |
| 2.5.4 | Mehrere Fotos löschen | Multi-Select + Bulk-Delete | 🔲 | |
| 2.5.5 | Foto herunterladen | Download funktioniert | 🔲 | |
| 2.5.6 | Foto freigeben/sperren | Sichtbarkeit ändert sich | 🔲 | |
| 2.5.7 | Album-Filter | Filterung nach Kategorie | 🔲 | |
| 2.5.8 | Foto sortieren | Sortierung nach Datum/Likes/etc. | 🔲 | |
| 2.5.9 | Foto als Highlight | Highlight-Flag setzbar | 🔲 | |
| 2.5.10 | Alle Fotos downloaden | ZIP-Download oder Massendownload | 🔲 | |

---

### 2.6 Event bearbeiten `/events/[id]/edit`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.6.1 | Formular lädt | Bestehende Werte vorausgefüllt | 🔲 | |
| 2.6.2 | Event-Name ändern | Änderung wird gespeichert | 🔲 | |
| 2.6.3 | Datum ändern | Datepicker funktioniert | 🔲 | |
| 2.6.4 | Passwort-Schutz aktivieren | Gast-Seite verlangt Passwort | 🔲 | |
| 2.6.5 | Max-Fotos-Limit setzen | Upload wird nach Limit blockiert | 🔲 | |
| 2.6.6 | Event-Beschreibung | Text wird gespeichert | 🔲 | |
| 2.6.7 | Event löschen | Bestätigungs-Dialog → Event entfernt | 🔲 | |

---

### 2.7 Design & Branding `/events/[id]/design`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.7.1 | Design-Editor lädt | Aktuelle Theme-Einstellungen | 🔲 | |
| 2.7.2 | Primärfarbe ändern | Farbe wird auf Gast-Seite angewendet | 🔲 | |
| 2.7.3 | Logo hochladen | Logo erscheint auf Gast-Seite | 🔲 | |
| 2.7.4 | Cover-Bild setzen | Cover erscheint in Event-Hero | 🔲 | |
| 2.7.5 | Font auswählen | Font wird auf Gast-Seite angewendet | 🔲 | |
| 2.7.6 | Theme-Preset wählen | Preset-Farben werden übernommen | 🔲 | |
| 2.7.7 | Live-Preview | Vorschau aktualisiert sich | 🔲 | |
| 2.7.8 | Änderungen speichern | Gespeichert + auf Gast-Seite sichtbar | 🔲 | |

---

### 2.8 Gäste-Verwaltung `/events/[id]/guests`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.8.1 | Gästeliste lädt | Alle registrierten Gäste | 🔲 | |
| 2.8.2 | Gast suchen | Suche nach Name/E-Mail | 🔲 | |
| 2.8.3 | Gast-Foto-Count | Anzahl Fotos pro Gast sichtbar | 🔲 | |

---

### 2.9 Gästebuch `/events/[id]/guestbook`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.9.1 | Einträge laden | Alle Gästebuch-Einträge sichtbar | 🔲 | |
| 2.9.2 | Eintrag löschen | Eintrag verschwindet | 🔲 | |
| 2.9.3 | Export | Einträge exportierbar (CSV/PDF) | 🔲 | |

---

### 2.10 Challenges `/events/[id]/challenges`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.10.1 | Challenge-Liste | Aktive Challenges sichtbar | 🔲 | |
| 2.10.2 | Challenge erstellen | Neue Challenge wird angelegt | 🔲 | |
| 2.10.3 | Challenge aktivieren | Status ändert sich | 🔲 | |
| 2.10.4 | Leaderboard anzeigen | Rangfolge der Teilnehmer | 🔲 | |

---

### 2.11 AI-Konfiguration `/events/[id]/ai-config`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.11.1 | AI-Config lädt | Feature-Liste sichtbar | 🔲 | |
| 2.11.2 | Feature aktivieren/deaktivieren | Toggle funktioniert | 🔲 | |
| 2.11.3 | Paket-Standard Modus | Default-Features aus Paket | 🔲 | |
| 2.11.4 | Experten-Modus | Erweiterte Einstellungen sichtbar | 🔲 | |
| 2.11.5 | Prompt-Override | Custom Prompt für Feature speichern | 🔲 | |
| 2.11.6 | Preset wählen (Hochzeit/Party/Business) | Presets werden angewendet | 🔲 | |
| 2.11.7 | Credit-Kosten sichtbar | Kosten pro Feature angezeigt | 🔲 | |

---

### 2.12 Booth-Games `/events/[id]/booth-games`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.12.1 | Games-Katalog lädt | Alle verfügbaren Spiele | 🔲 | |
| 2.12.2 | Spiel aktivieren | Spiel ist auf Gast-Seite verfügbar | 🔲 | |
| 2.12.3 | AI Slot Machine | Spin-Test funktioniert | 🔲 | |
| 2.12.4 | Compliment Mirror | Kompliment wird generiert | 🔲 | |
| 2.12.5 | Fortune Teller | Fortune wird generiert | 🔲 | |
| 2.12.6 | AI Roast | Roast wird generiert | 🔲 | |
| 2.12.7 | Mimik Duell | Spiel startet + bewertet | 🔲 | |

---

### 2.13 Booth-Briefing `/events/[id]/briefing`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.13.1 | Briefing-Seite lädt | Booth-Setup-Infos sichtbar | 🔲 | |
| 2.13.2 | QR-Code für Booth | Booth-Konfigurations-QR | 🔲 | |
| 2.13.3 | Booth-Status | Online/Offline-Status | 🔲 | |

---

### 2.14 Kategorien `/events/[id]/categories`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.14.1 | Kategorie-Liste | Alle Kategorien/Alben sichtbar | 🔲 | |
| 2.14.2 | Kategorie erstellen | Neue Kategorie wird angelegt | 🔲 | |
| 2.14.3 | Fotos einer Kategorie zuordnen | Zuordnung wird gespeichert | 🔲 | |

---

### 2.15 Assets `/events/[id]/assets`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.15.1 | Asset-Bibliothek lädt | Overlays, Logos, Sticker sichtbar | 🔲 | |
| 2.15.2 | Asset hochladen | Datei wird hochgeladen | 🔲 | |
| 2.15.3 | Asset löschen | Asset wird entfernt | 🔲 | |

---

### 2.16 Einladungen `/events/[id]/invitations`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.16.1 | Einladungs-Editor | Template auswählen + bearbeiten | 🔲 | |
| 2.16.2 | Einladung per E-Mail | Mail wird gesendet | 🔲 | |
| 2.16.3 | Einladungslink kopieren | Link korrekt generiert | 🔲 | |

---

### 2.17 Live-Wall `/events/[id]/live-wall`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.17.1 | Live-Wall öffnet sich | Vollbild-Modus | 🔲 | |
| 2.17.2 | Neue Fotos erscheinen | Realtime via WebSocket | 🔲 | |
| 2.17.3 | QR-Code sichtbar | Gäste-QR auf Wall angezeigt | 🔲 | |
| 2.17.4 | Slideshow-Modus | Fotos rotieren automatisch | 🔲 | |

---

### 2.18 Live-Analytics `/events/[id]/live-analytics`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.18.1 | Analytics-Seite lädt | Charts sichtbar | 🔲 | |
| 2.18.2 | Uploads in Echtzeit | Counter steigt bei neuem Upload | 🔲 | |
| 2.18.3 | Gäste-Aktivität | Zeitverlauf-Chart | 🔲 | |

---

### 2.19 Statistiken `/events/[id]/statistics`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.19.1 | Stats-Seite lädt | Keine Fehler | 🔲 | |
| 2.19.2 | Foto-Anzahl gesamt | Korrekte Zahl | 🔲 | |
| 2.19.3 | Gäste-Anzahl | Unique Visitor Count | 🔲 | |
| 2.19.4 | Top-Fotos | Meist-gelikte Fotos | 🔲 | |
| 2.19.5 | Upload-Zeitverlauf | Chart mit Uploads pro Stunde | 🔲 | |

---

### 2.20 Mosaic `/events/[id]/mosaic`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.20.1 | Mosaic-Seite lädt | Mosaic-Konfiguration sichtbar | 🔲 | |
| 2.20.2 | Mosaic generieren | Mosaik aus Fotos erstellt | 🔲 | |
| 2.20.3 | Print-Station `/mosaic/print-station` | Print-Übersicht lädt | 🔲 | |

---

### 2.21 Videos `/events/[id]/videos`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.21.1 | Video-Liste lädt | Generierte Videos sichtbar | 🔲 | |
| 2.21.2 | Video abspielen | Player funktioniert | 🔲 | |
| 2.21.3 | Video herunterladen | Download-Link funktioniert | 🔲 | |
| 2.21.4 | Video-Jobs `/video-jobs` | Job-Status sichtbar | 🔲 | |

---

### 2.22 QR-Styler `/events/[id]/qr-styler`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.22.1 | QR-Editor lädt | Vorschau-QR sichtbar | 🔲 | |
| 2.22.2 | Farben ändern | QR-Vorschau aktualisiert sich | 🔲 | |
| 2.22.3 | Logo einbetten | Logo in QR-Mitte sichtbar | 🔲 | |
| 2.22.4 | QR herunterladen | PNG/SVG-Download funktioniert | 🔲 | |
| 2.22.5 | QR-Template anwenden | Design-Preset wird übernommen | 🔲 | |

---

### 2.23 Leads `/events/[id]/leads`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.23.1 | Leads-Liste lädt | E-Mail-Adressen sichtbar | 🔲 | |
| 2.23.2 | Lead-Export | CSV-Download funktioniert | 🔲 | |

---

### 2.24 WiFi `/events/[id]/wifi`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.24.1 | WiFi-Seite lädt | Keine Fehler | 🔲 | |
| 2.24.2 | WiFi-QR generieren | QR für WLAN-Zugang | 🔲 | |

---

### 2.25 Paket & Billing `/events/[id]/package`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.25.1 | Paket-Übersicht lädt | Aktuelles Paket sichtbar | 🔲 | |
| 2.25.2 | Upgrade-Button (FREE → BASIC) | WooCommerce-Checkout öffnet | 🔲 | |
| 2.25.3 | Upgrade-Button (BASIC → SMART) | Checkout mit korrektem Preis | 🔲 | |
| 2.25.4 | Upgrade-Button (SMART → PREMIUM) | Checkout mit korrektem Preis | 🔲 | |
| 2.25.5 | Addon kaufen (Photo Booth) | Addon-Checkout öffnet | 🔲 | |
| 2.25.6 | Feature-Vergleichstabelle | FREE/BASIC/SMART/PREMIUM Vergleich | 🔲 | |
| 2.25.7 | Upgrade Modal | Modal öffnet mit korrekten Preisen (49€/99€/199€) | 🔲 | |

---

### 2.26 Duplicate-Detection `/events/[id]/duplicates`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.26.1 | Duplikat-Seite lädt | Erkannte Duplikate sichtbar | 🔲 | |
| 2.26.2 | Duplikat löschen | Foto wird entfernt | 🔲 | |

---

### 2.27 KI-Booth `/events/[id]/ki-booth`

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 2.27.1 | KI-Booth Seite lädt | Keine Fehler | 🔲 | |
| 2.27.2 | AI-Style auswählen | Style wird für Booth aktiviert | 🔲 | |

---

## 3. GAST-SEITE (`app.gaestefotos.com/e3/[slug]`)

### 3.1 Seiten-Ladung & Basis

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.1.1 | Seite lädt (Desktop) | Vollständige Seite ohne Fehler | 🔲 | |
| 3.1.2 | Seite lädt (Mobile Safari) | Mobile-Layout korrekt | 🔲 | |
| 3.1.3 | Seite lädt (Mobile Chrome) | Mobile-Layout korrekt | 🔲 | |
| 3.1.4 | Event-Theme angewendet | Farben/Fonts des Events sichtbar | 🔲 | |
| 3.1.5 | Event-Hero angezeigt | Cover-Bild + Event-Name + Datum | 🔲 | |
| 3.1.6 | Passwort-Gate (privates Event) | Passwort-Eingabe erscheint | 🔲 | |
| 3.1.7 | Passwort korrekt eingeben | Zugriff wird gewährt | 🔲 | |
| 3.1.8 | Passwort falsch | Fehlermeldung angezeigt | 🔲 | |
| 3.1.9 | Offline-Nutzung | Basis-UI lädt aus Cache | 🔲 | |

---

### 3.2 Foto-Feed & Navigation

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.2.1 | Foto-Grid lädt | Thumbnails sichtbar | 🔲 | |
| 3.2.2 | Infinite Scroll / Load More | Weitere Fotos laden beim Scrollen | 🔲 | |
| 3.2.3 | Album-Filter | Filterung nach Kategorie funktioniert | 🔲 | |
| 3.2.4 | Sortierung: Neueste zuerst | Korrekte Reihenfolge | 🔲 | |
| 3.2.5 | Sortierung: Meiste Likes | Sortierung korrekt | 🔲 | |
| 3.2.6 | Sortierung: Zufällig | Reihenfolge ändert sich | 🔲 | |
| 3.2.7 | Neues Foto Indikator | Toast/Badge bei neuem Upload | 🔲 | |
| 3.2.8 | Sticky Header | Header beim Scrollen sichtbar | 🔲 | |
| 3.2.9 | Jump-to-Top Button | Scroll zurück nach oben | 🔲 | |
| 3.2.10 | Bottom Navigation | Tabs: Feed / Challenges / Gästebuch / Info | 🔲 | |

---

### 3.3 Photo Lightbox

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.3.1 | Lightbox öffnen | Klick auf Foto → Vollbild | 🔲 | |
| 3.3.2 | Nächstes/Vorheriges Foto | Swipe oder Pfeiltasten | 🔲 | |
| 3.3.3 | Foto liken | Like-Zähler erhöht sich | 🔲 | |
| 3.3.4 | Foto kommentieren | Kommentar wird gespeichert | 🔲 | |
| 3.3.5 | Foto herunterladen | Download auf Gerät | 🔲 | |
| 3.3.6 | Foto teilen | Share-Sheet öffnet sich | 🔲 | |
| 3.3.7 | Lightbox schließen | ESC oder Klick außerhalb | 🔲 | |

---

### 3.4 Foto-Upload

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.4.1 | Upload-Button sichtbar | FAB oder Button im UI | 🔲 | |
| 3.4.2 | Quick Upload (1 Foto) | Foto erscheint im Feed | 🔲 | |
| 3.4.3 | Workflow-Upload öffnen | WorkflowUploadModal öffnet sich | 🔲 | |
| 3.4.4 | Mehrere Fotos auswählen | Multi-Upload funktioniert | 🔲 | |
| 3.4.5 | Upload-Fortschritt | Progress-Bar sichtbar | 🔲 | |
| 3.4.6 | E-Mail eingeben | Optionale E-Mail wird gespeichert | 🔲 | |
| 3.4.7 | Upload ohne E-Mail | Anonym-Upload funktioniert | 🔲 | |
| 3.4.8 | Foto nach Upload im Feed | Neues Foto erscheint sofort | 🔲 | |
| 3.4.9 | TUS-Resume bei Abbruch | Upload setzt sich fort | 🔲 | |
| 3.4.10 | Foto-Limit erreicht | Blockiert + Fehlermeldung | 🔲 | |

---

### 3.5 Face Search (Gesichtserkennung)

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.5.1 | Face-Search öffnen | Modal öffnet sich | 🔲 | |
| 3.5.2 | Selfie aufnehmen | Kamera öffnet sich im Browser | 🔲 | |
| 3.5.3 | Suche ausführen | Fotos mit meinem Gesicht gefiltert | 🔲 | |
| 3.5.4 | Ergebnisse korrekt | Treffer zeigen tatsächlich mein Gesicht | 🔲 | |
| 3.5.5 | Kein Treffer | "Keine Fotos gefunden" Meldung | 🔲 | |

---

### 3.6 AI-Features (Gast-Seite)

#### 3.6.1 Style Transfer

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.6.1.1 | Style Transfer Modal öffnen | Modal mit Style-Auswahl | 🔲 | |
| 3.6.1.2 | Foto auswählen | Eigenes Foto oder aus Feed | 🔲 | |
| 3.6.1.3 | Style: Anime | Ergebnis in Anime-Stil | 🔲 | |
| 3.6.1.4 | Style: Watercolor | Ergebnis in Wasserfarben | 🔲 | |
| 3.6.1.5 | Style: Oil Painting | Ergebnis als Ölgemälde | 🔲 | |
| 3.6.1.6 | Style: Yearbook | Schulbuch-Foto-Stil | 🔲 | |
| 3.6.1.7 | Style: AI Oldify | Gealterte Version | 🔲 | |
| 3.6.1.8 | Ergebnis wird in Feed hochgeladen | Generiertes Foto erscheint | 🔲 | |
| 3.6.1.9 | Credit-Kosten korrekt abgezogen | Energy-Bar sinkt | 🔲 | |
| 3.6.1.10 | Kein Credit → Fehlermeldung | "Nicht genug Credits" | 🔲 | |

#### 3.6.2 Face Swap

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.6.2.1 | Face-Swap starten | Feature aus AI-Games auswählen | 🔲 | |
| 3.6.2.2 | Ziel-Foto wählen | Template-Auswahl oder eigenes Foto | 🔲 | |
| 3.6.2.3 | Swap ausführen | Gesicht wird getauscht | 🔲 | |
| 3.6.2.4 | Qualität ausreichend | Gesicht erkennbar | 🔲 | |

#### 3.6.3 AI-Spiele (AiGamesModal)

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.6.3.1 | AI-Games öffnen | Modal mit Spielen-Übersicht | 🔲 | |
| 3.6.3.2 | AI Slot Machine | Spin funktioniert, Bild wird generiert | 🔲 | |
| 3.6.3.3 | Fortune Teller | Wahrsagung wird generiert | 🔲 | |
| 3.6.3.4 | AI Roast | Roast-Text wird generiert | 🔲 | |
| 3.6.3.5 | Compliment Mirror | Kompliment wird generiert | 🔲 | |
| 3.6.3.6 | Persona Quiz | Quiz-Ablauf + Ergebnis | 🔲 | |
| 3.6.3.7 | Celebrity Lookalike | Promi-Ähnlichkeit analysiert | 🔲 | |

#### 3.6.4 AI-Effects (AiEffectsModal)

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.6.4.1 | Effects-Modal öffnen | Effekt-Kacheln sichtbar | 🔲 | |
| 3.6.4.2 | Background Removal | Hintergrund entfernt | 🔲 | |
| 3.6.4.3 | Caption Generator | Bildunterschrift generiert | 🔲 | |
| 3.6.4.4 | AI Meme | Meme wird erstellt | 🔲 | |

---

### 3.7 Energy-System

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.7.1 | Energy-Bar sichtbar | Credits-Anzeige im UI | 🔲 | |
| 3.7.2 | Credits werden abgezogen | Nach AI-Nutzung sinkt Wert | 🔲 | |
| 3.7.3 | Credits = 0 | AI-Features gesperrt | 🔲 | |
| 3.7.4 | Credits aufladen | Kauf über Checkout | 🔲 | |

---

### 3.8 Challenges Tab

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.8.1 | Challenges-Tab öffnen | Aktive Challenges sichtbar | 🔲 | |
| 3.8.2 | Challenge annehmen | Teilnahme wird registriert | 🔲 | |
| 3.8.3 | Challenge-Foto hochladen | Foto wird Challenge zugeordnet | 🔲 | |
| 3.8.4 | Leaderboard | Rangliste sichtbar | 🔲 | |
| 3.8.5 | Achievement Toast | Toast bei Erfolg | 🔲 | |

---

### 3.9 Gästebuch Tab

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.9.1 | Gästebuch-Tab öffnen | Bestehende Einträge sichtbar | 🔲 | |
| 3.9.2 | Neuen Eintrag schreiben | Text-Input + optionales Foto | 🔲 | |
| 3.9.3 | Eintrag speichern | Eintrag erscheint in Liste | 🔲 | |
| 3.9.4 | Polaroid-Style angezeigt | Eintrag im richtigen Design | 🔲 | |

---

### 3.10 Info Tab

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.10.1 | Info-Tab öffnen | Event-Details sichtbar | 🔲 | |
| 3.10.2 | Veranstaltungsort | Adresse/Ort angezeigt | 🔲 | |
| 3.10.3 | Datum/Uhrzeit | Korrekte Event-Infos | 🔲 | |

---

### 3.11 Stories

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.11.1 | Stories-Bar sichtbar | Horizontale Story-Kreise | 🔲 | |
| 3.11.2 | Story öffnen | Vollbild-Viewer | 🔲 | |
| 3.11.3 | Nächste Story | Tap → nächste Story | 🔲 | |
| 3.11.4 | Story schließen | X-Button oder Swipe down | 🔲 | |

---

### 3.12 Slideshow-Modus

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.12.1 | Slideshow starten | Vollbild-Slideshow | 🔲 | |
| 3.12.2 | Fotos rotieren | Automatische Weiterblätterung | 🔲 | |
| 3.12.3 | Slideshow beenden | ESC oder Button | 🔲 | |

---

### 3.13 QR-Code Share

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.13.1 | QR-Code öffnen | Event-QR sichtbar | 🔲 | |
| 3.13.2 | QR scannen | Führt zur Event-Seite | 🔲 | |
| 3.13.3 | Link kopieren | Event-URL in Clipboard | 🔲 | |

---

### 3.14 Push-Notifkationen

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.14.1 | Push-Banner erscheint | Banner nach erstem Besuch | 🔲 | |
| 3.14.2 | Push erlauben | Berechtigung erteilt | 🔲 | |
| 3.14.3 | Push ablehnen | Banner verschwindet | 🔲 | |
| 3.14.4 | Push-Benachrichtigung | Benachrichtigung bei neuem Foto | 🔲 | |

---

### 3.15 Realtime (WebSocket)

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.15.1 | WebSocket-Verbindung | Keine Connection-Errors | 🔲 | |
| 3.15.2 | Neues Foto erscheint live | Ohne Page-Reload sichtbar | 🔲 | |
| 3.15.3 | Like-Update live | Like-Count aktualisiert sich | 🔲 | |
| 3.15.4 | Social Proof Toast | "Max hat gerade ein Foto hochgeladen" | 🔲 | |

---

### 3.16 WiFi-Benachrichtigung

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 3.16.1 | WiFi-Info-Banner | Erscheint wenn Event-WLAN konfiguriert | 🔲 | |

---

## 4. E-MAIL & BENACHRICHTIGUNGEN

| # | Test | Trigger | Erwartet | Status | Notizen |
|---|------|---------|----------|--------|---------|
| 4.1 | Willkommens-Mail | Neuer Account | Mail kommt an | 🔲 | |
| 4.2 | E-Mail-Bestätigung | Registrierung | Bestätigungs-Link funktioniert | 🔲 | |
| 4.3 | Passwort-Reset | "Passwort vergessen" | Reset-Link funktioniert | 🔲 | |
| 4.4 | Event erstellt | Neues Event | Bestätigungs-Mail | 🔲 | |
| 4.5 | Foto-Upload-Bestätigung | Gast-Upload | Mail mit Link zum Foto | 🔲 | |
| 4.6 | Event-Erinnerung | Vor Event | Erinnerungs-Mail | 🔲 | |
| 4.7 | Event-Highlights | Nach Event | Highlights-Mail mit besten Fotos | 🔲 | |
| 4.8 | Upgrade-Bestätigung | WooCommerce Zahlung | Paket-Upgrade Mail | 🔲 | |

---

## 5. ZAHLUNGEN (WooCommerce)

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 5.1 | BASIC kaufen (49€) | SKU `basic`, Zahlung + Upgrade | 🔲 | |
| 5.2 | SMART kaufen (99€) | SKU `smart`, Zahlung + Upgrade | 🔲 | |
| 5.3 | PREMIUM kaufen (199€) | SKU `premium`, Zahlung + Upgrade | 🔲 | |
| 5.4 | Upgrade BASIC→SMART (50€) | SKU `upgrade-basic-smart` | 🔲 | |
| 5.5 | Upgrade BASIC→PREMIUM (150€) | SKU `upgrade-basic-premium` | 🔲 | |
| 5.6 | Upgrade SMART→PREMIUM (100€) | SKU `upgrade-smart-premium` | 🔲 | |
| 5.7 | Addon: Photo Booth (449€) | SKU `addon-photo-booth` | 🔲 | |
| 5.8 | Addon: Highlight Reel (49€) | SKU `addon-highlight-reel` | 🔲 | |
| 5.9 | Webhook empfangen | `order.updated` → Backend verarbeitet | 🔲 | |
| 5.10 | Paket nach Zahlung aktiv | User-Paket ändert sich sofort | 🔲 | |
| 5.11 | Event-Code im Checkout | `?event_code=XYZ` vorausgefüllt | 🔲 | |

---

## 6. AI-FEATURES END-TO-END

| # | Feature | Trigger | Erwartet | Provider | Status | Notizen |
|---|---------|---------|----------|----------|--------|---------|
| 6.1 | **Style Transfer: Anime** | Gast wählt Effekt | Animiertes Bild ~35s | Qwen/ComfyUI | 🔲 | |
| 6.2 | **Style Transfer: Yearbook** | Gast wählt Effekt | Schulbuch-Stil | Qwen/ComfyUI | 🔲 | |
| 6.3 | **AI Oldify** | Gast wählt Effekt | Gealtert, Gesicht erkennbar | Qwen/ComfyUI | 🔲 | |
| 6.4 | **Face Swap** | 2 Fotos auswählen | Gesichter getauscht | fal-ai/inswapper | 🔲 | |
| 6.5 | **Background Removal** | Foto auswählen | Transparenter Hintergrund | remove.bg | 🔲 | |
| 6.6 | **AI Roast** | Foto hochladen | Lustiger Roast-Text | Grok/Groq | 🔲 | |
| 6.7 | **Fortune Teller** | Handfoto | Wahrsagung + stilisiertes Bild | Grok + Qwen | 🔲 | |
| 6.8 | **AI Slot Machine** | Spin | Slot-Kombination + Bild generiert | Fal.ai | 🔲 | |
| 6.9 | **Caption Generator** | Foto auswählen | Passende Bildunterschrift | Grok/Groq | 🔲 | |
| 6.10 | **Persona Quiz** | Fragen beantworten | Quiz-Ergebnis + Charakter | Grok/Groq | 🔲 | |
| 6.11 | **Celebrity Lookalike** | Selfie | Promi-Ähnlichkeit | Grok + Vision | 🔲 | |
| 6.12 | **AI Meme** | Foto auswählen | Meme mit Text | Grok/Groq | 🔲 | |
| 6.13 | **Video Generation** | Foto + Prompt | Video ~60s | fal-ai/wan-i2v | 🔲 | |
| 6.14 | **Highlight Reel** | Event-Ende | Automatisches Highlight-Video | FFmpeg | 🔲 | |

---

## 7. PERFORMANCE & STABILITÄT

| # | Test | Methode | Zielwert | Status | Notizen |
|---|------|---------|----------|--------|---------|
| 7.1 | Seiten-Ladezeit (Gast-Seite) | Browser DevTools | < 3s (3G) | 🔲 | |
| 7.2 | Foto-Grid mit 100 Fotos | Scrollen, FPS messen | > 30 FPS | 🔲 | |
| 7.3 | Upload 10MB Foto | TUS-Upload timen | < 30s (100Mbit) | 🔲 | |
| 7.4 | API-Response Zeit | `/api/events/:id` | < 200ms | 🔲 | |
| 7.5 | WebSocket-Reconnect | Verbindung trennen + wiederherstellen | Auto-Reconnect | 🔲 | |
| 7.6 | Concurrent Uploads | 5 parallele Uploads | Alle erfolgreich | 🔲 | |
| 7.7 | Memory-Leak (30min) | Browser nach 30min Nutzung | Kein Absturz | 🔲 | |

---

## 8. SICHERHEIT

| # | Test | Erwartet | Status | Notizen |
|---|------|----------|--------|---------|
| 8.1 | Admin-Route ohne Login | Redirect zu Login | 🔲 | |
| 8.2 | Host-Event eines anderen Users | 403 Forbidden | 🔲 | |
| 8.3 | API ohne JWT | 401 Unauthorized | 🔲 | |
| 8.4 | Event-Upload ohne Access | 403 Forbidden | 🔲 | |
| 8.5 | SQL-Injection Versuch | Keine DB-Fehler | 🔲 | |
| 8.6 | XSS in Event-Name | Input wird escaped | 🔲 | |
| 8.7 | Brute-Force Login | Rate-Limit greift | 🔲 | |
| 8.8 | CORS-Header korrekt | Nur erlaubte Origins | 🔲 | |

---

## 9. FEHLER-ZUSAMMENFASSUNG

Alle Fehler und Bugs während des Tests hier eintragen:

| # | Datum | Bereich | Schwere | Beschreibung | Reproduktion | Status |
|---|-------|---------|---------|-------------|-------------|--------|
| | | | | | | |

**Schwere:** 🔴 Kritisch (Blocker) · 🟠 Hoch (Wichtig) · 🟡 Mittel · 🟢 Niedrig (Kosmetisch)

---

## 10. TEST-ERGEBNIS ÜBERSICHT

Ausfüllen nach Abschluss:

| Bereich | Tests gesamt | Bestanden | Fehlgeschlagen | Übersprungen |
|---------|-------------|-----------|---------------|-------------|
| Admin Dashboard | 80 | | | |
| Host Dashboard | 120 | | | |
| Gast-Seite | 80 | | | |
| E-Mail | 8 | | | |
| Zahlungen | 11 | | | |
| AI End-to-End | 14 | | | |
| Performance | 7 | | | |
| Sicherheit | 8 | | | |
| **Gesamt** | **~328** | | | |

**Freigabe:** ☐ Ja — bereit für Produktion · ☐ Nein — Blocker vorhanden

---

*Testdokumentation erstellt: März 2026 | gästefotos.com Plattform v2*
