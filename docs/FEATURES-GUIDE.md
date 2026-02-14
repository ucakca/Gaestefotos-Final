# gästefotos.com — Feature-Anleitung

> Stand: 13. Februar 2026

---

## Inhaltsverzeichnis

1. [Mosaic Wall & Print-Terminal](#1-mosaic-wall--print-terminal)
2. [Partner / Franchise-Modell](#2-partner--franchise-modell)
3. [Partner-Abrechnung (Billing)](#3-partner-abrechnung-billing)
4. [Digitale Einladungskarten](#4-digitale-einladungskarten)
5. [AI-Features & Foto-Effekte](#5-ai-features--foto-effekte)
6. [Credit-System](#6-credit-system)
7. [SMS Sharing](#7-sms-sharing)
8. [E-Mail Foto-Sharing](#8-e-mail-foto-sharing)
9. [Gallery Embed Code](#9-gallery-embed-code)
10. [Slideshow Mode](#10-slideshow-mode)
11. [Bulk Download (ZIP)](#11-bulk-download-zip)
12. [Lead Collection](#12-lead-collection)

---

## 1. Mosaic Wall & Print-Terminal

### Konzept
Gäste laden Fotos hoch, die als Tiles in ein Mosaic-Zielbild eingebaut werden. Optional können Gäste ihre Fotos am Print-Terminal als Sticker ausdrucken.

### Für den Host (Event-Dashboard)

**Mosaic Wall erstellen:**
1. Event öffnen → Tab **„Mosaic Wall"**
2. Zielbild hochladen (das Bild, das aus den Tiles entsteht)
3. Grid-Preset wählen: Klein (12×12), Mittel (24×24), Groß (48×32)
4. Einstellungen konfigurieren:
   - **Tile-Animation**: Zoom+Fly, Fade, Slide, etc.
   - **Tile-Größe**: physische Größe in mm (für Druck)
   - **Overlay-Intensität**: wie stark das Zielbild durchscheint (0–40%)
   - **Auto-Fill**: automatisches Füllen mit AI-generierten Tiles ab Schwellenwert
   - **Ticker & QR-Overlay**: auf der Live-Wall anzeigen
5. **„Einstellungen speichern"** klicken
6. **„Mosaic Wall aktivieren"** → Status wechselt zu ACTIVE

**Print-Terminal konfigurieren:**
1. Im Mosaic-Settings-Bereich → Abschnitt **„Print-Terminal"**
2. **Print-Terminal aktivieren** → Toggle an
3. **Print-Bestätigung** → wenn aktiv, erscheint das Tile erst auf der Digital-Wall nach dem Druck
4. **Reservierungs-Timeout** → wie lange ein PIN-Code gültig bleibt (5–60 Min.)
5. Die **Terminal-URL** wird angezeigt: `print.gästefotos.com/t/{event-slug}`

**Live-Wall anzeigen:**
- URL: `gästefotos.com/live/{event-slug}`
- Fullscreen-tauglich für Beamer/Monitor
- Zeigt Tiles in Echtzeit via WebSocket

### Für Gäste

1. Event-Seite öffnen → Feed-Tab
2. Button **„Foto für Mosaic Wall"** erscheint (wenn printEnabled)
3. Foto hochladen → System gibt **PIN-Code** + **QR-Code** zurück
4. Am Print-Terminal: PIN eingeben oder QR scannen → Vorschau → **„Jetzt drucken!"**
5. Sticker wird gedruckt (300 DPI, mit Positions-Overlay)
6. Tile erscheint auf der Digital-Wall (sofort oder nach Print-Bestätigung)

### Poster-Export

- Host kann das Mosaic als Poster exportieren
- Standard: Web-Qualität (200px/Tile, PNG)
- Druck: `quality=print` → 400px/Tile, 95% JPEG, DPI-Metadata Headers
- URL: `/api/events/{eventId}/mosaic/export?quality=print`

---

## 2. Partner / Franchise-Modell

### Konzept
Zwei Partnerschafts-Tiers:
- **Branded**: Partner arbeitet unter gästefotos.com Branding
- **White-Label**: Partner nutzt eigenes Branding (Logo, Farben, Domain)

### Rollen

| Rolle | Beschreibung |
|-------|-------------|
| **ADMIN** | Superadmin — sieht alles, verwaltet Partner |
| **PARTNER** | Partner-User — sieht eigene Partner-Daten |
| **HOST** | Normaler Event-Host |

### Partner-Rollen (innerhalb eines Partners)

| Rolle | Rechte |
|-------|--------|
| **OWNER** | Vollzugriff, Billing, Einstellungen |
| **MANAGER** | Events verwalten, Hardware zuweisen |
| **OPERATOR** | Events vor Ort bedienen |

### Für Admins — Partner verwalten

1. **Admin-Dashboard** → Sidebar → **„Partner"**
2. **„Neuer Partner"** → Formular ausfüllen:
   - Name, Slug, Tier (Branded/White-Label)
   - Kontakt-E-Mail, Telefon, Firma
   - Max Events, Storage (GB), Provision (%)
3. Partner erscheint in der Liste
4. **Klick auf Partner** → Detail-Modal:
   - **Stats**: Events, Fotos, Videos, Print-Jobs
   - **Details**: Kontakt, Tier, Limits, Provision
   - **Mitglieder**: Team-Übersicht mit Rollen
   - **Hardware**: Registrierte Geräte (Terminal, Booth, Display)
   - **Abrechnungen**: Billing-Perioden (siehe Abschnitt 3)

### Mitglieder hinzufügen

- Im Admin-Dashboard oder via API
- E-Mail des Users angeben → muss bereits registriert sein
- Rolle zuweisen (OWNER, MANAGER, OPERATOR)
- User-Rolle wird automatisch auf PARTNER hochgestuft

### Hardware registrieren

- Typen: `PRINT_TERMINAL`, `PHOTO_BOOTH`, `DISPLAY`
- Felder: Name, Seriennummer, Status (AVAILABLE/ASSIGNED/MAINTENANCE)
- Kann einem Event zugewiesen werden

### Für Partner — eigenes Dashboard

1. Im Host-Dashboard erscheint der Button **„Partner"** (Header, nur für PARTNER-User)
2. Klick → `/partner` Seite:
   - **Stats-Karten**: Events, Fotos, Videos, Print-Jobs (mit Event-Limit)
   - **Events-Liste**: alle Partner-Events mit Status, Fotos-Count
   - **Hardware**: registrierte Geräte mit Status
   - **Team**: Mitglieder mit Rollen
   - **Branding** (nur White-Label): Primary-/Accent-Farbe, Custom Domain
   - **Abrechnungen**: letzte 5 Perioden mit Status und Auszahlungsbetrag
   - **Quick Info**: Storage-Limit, Event-Limit, Provision

---

## 3. Partner-Abrechnung (Billing)

### Konzept
Admins generieren monatliche/periodische Abrechnungen für Partner. Jede Abrechnung enthält:
- Anzahl Events, Fotos, Print-Jobs im Zeitraum
- Einzelposten (Line Items): Event-Gebühren, Print-Job-Gebühren
- Provision wird automatisch berechnet

### Status-Workflow

```
DRAFT → FINALIZED → SENT → PAID
                  ↘ CANCELLED
```

| Status | Bedeutung |
|--------|-----------|
| **DRAFT** | Entwurf — kann bearbeitet/storniert werden |
| **FINALIZED** | Finalisiert — bereit zum Versand |
| **SENT** | An Partner versendet |
| **PAID** | Bezahlt — paidAt wird gesetzt |
| **CANCELLED** | Storniert |

### Abrechnung generieren (Admin)

1. Partner-Detail öffnen → Abschnitt **„Abrechnungen"**
2. **„+ Generieren"** klicken
3. **Von/Bis-Datum** auswählen
4. **„Abrechnung generieren"** → System zählt automatisch:
   - Events im Zeitraum → je ein Line Item
   - Print-Jobs im Zeitraum → aggregiert mit Stückpreis (1,50 €/Druck)
   - Fotos werden gezählt (aktuell kein Preis)
5. Umsatz, Provision und Auszahlung werden berechnet

### Preise anpassen

- Print-Job-Preis: aktuell 1,50 €/Stück (hartcodiert, später konfigurierbar)
- Event-Gebühr: aktuell 0 € (Platzhalter für spätere Konfiguration)
- Provision: wird vom Partner-Profil übernommen (z.B. 20%)

### Für Partner sichtbar

- Partner-Dashboard → rechte Sidebar → **„Abrechnungen"**
- Read-only: Zeitraum, Status, Events, Prints, Auszahlungsbetrag

---

## 4. Digitale Einladungskarten

### Konzept
Hosts erstellen digitale Einladungskarten für ihre Events. Gäste erhalten einen schönen, teilbaren Link mit Event-Details, RSVP und Kalender-Integration.

### Einladung erstellen (Host)

1. Event-Dashboard → Tab **„Einladungen"**
2. Name eingeben → **Einladung erstellen**
3. Einladung bearbeiten → **Konfigurations-Editor** öffnet sich

### Design-Tab (NEU)

Im Konfigurations-Editor gibt es jetzt den Tab **„Design"**:

- **Persönliche Nachricht**: Text, der unter dem Titel auf der Karte erscheint
- **Akzentfarbe**: Color-Picker für die Hauptfarbe des Designs
- **Hintergrundbild**: URL zu einem Bild → wird als Hero-Hintergrund verwendet (mit Vorschau)

### Weitere Tabs

- **Basis**: Paar-Namen, Willkommenstext, Theme-Preset, Countdown, RSVP, Galerie-Link
- **Gästegruppen**: Verschiedene Gruppen mit unterschiedlichen Berechtigungen
- **Zeitplan**: Event-Ablauf mit Uhrzeiten
- **Locations**: Trauung, Empfang, Party — jeweils Name + Adresse

### Die Einladungskarte (Gast-Ansicht)

URL: `gästefotos.com/i/{einladungs-slug}`

**Design:**
- **Hero-Section**: Gradient (Indigo→Purple→Pink) oder Custom-Hintergrundbild
  - Badge: „Du bist eingeladen!"
  - Event-Titel (groß, weiß, fett)
  - Optionale persönliche Nachricht
  - Datum-Badge: Tag + Monat + Uhrzeit in glassmorphism-Box
- **Event-Details**: Glassmorphism-Card mit Datum (Kalender-Icon) und Ort (MapPin-Icon + Google Maps Link)
- **RSVP-Section**: „Kommst du?" mit drei visuellen Buttons:
  - ✅ Ja (grün)
  - ❓ Vielleicht (amber)
  - ❌ Nein (rot)
  - Optional: Name-Eingabe
  - Nach Antwort: Bestätigungs-Badge + „Antwort ändern"
- **Teilen**: 
  - Teilen-Button (native Share API)
  - WhatsApp-Button (grün, mit Icon)
  - E-Mail, Link kopieren, QR-Code
- **Kalender**: „Zum Kalender hinzufügen" (ICS-Download)
- **Galerie-Link**: „Zur Foto-Galerie"

**Features:**
- Passwortschutz möglich (eleganter Lock-Screen)
- QR-Code-Anzeige (Toggle)
- Responsive Design (Mobile-first)
- RSVP-Zähler (Ja/Vielleicht/Nein)
- Google Maps Integration

### Teilen

Einladungen können geteilt werden über:
- **Native Share API** (Mobile)
- **WhatsApp** (Direktlink)
- **E-Mail** (mailto: mit vorgefülltem Text)
- **Link kopieren** (Clipboard)
- **QR-Code** (Toggle, farbig)
- **ShortLinks** (tracking-fähig, pro Kanal)

---

## 5. AI-Features & Foto-Effekte

### Konzept
Gäste können ihre Fotos mit KI-gestützten Effekten bearbeiten. Jeder Effekt verbraucht Credits (siehe Punkt 6). Die AI-Provider werden über das Admin-Dashboard konfiguriert.

### Verfügbare Effekte

| Effekt | Beschreibung | Endpoint |
|--------|-------------|----------|
| **Face Switch** | Gesichter in Gruppenfotos tauschen | `/api/booth-games/face-switch` |
| **Background Removal** | Hintergrund entfernen (transparent/custom) | `/api/booth-games/bg-removal` |
| **AI Oldify** | Alterungs-Effekt (Gesicht +30/+50 Jahre) | `/api/booth-games/style-effect` |
| **AI Style Pop** | Stilisierte Portraits (Pop-Art, Neon, etc.) | `/api/booth-games/style-effect` |
| **AI Cartoon** | Cartoon-/Comic-Stil | `/api/booth-games/style-effect` |
| **Style Transfer** | Stil eines Referenzbilds übertragen | `/api/style-transfer` |

### AI-Provider-System

Admins konfigurieren Provider unter `/manage/ai-providers`:
- **Groq** — Schnelle LLM-Inferenz (Llama 3.1) für Chat, Vorschläge, Compliment Mirror
- **Grok (xAI)** — Leistungsstarkes LLM mit OpenAI-kompatibler API (`grok-2-latest`)
- **OpenAI** — GPT-4o / GPT-Vision für komplexe Textaufgaben & DALL-E
- **Replicate** — Stable Diffusion, SDXL, Faceswap-Modelle
- **Stability AI** — Background Removal, Style-Effekte
- Pro Effekt wird automatisch der passende Provider gewählt (`aiExecution.ts`)

### Backend-Architektur
- `aiExecution.ts` — Zentrale Ausführung: Provider-Resolution + Credit-Check + Logging
- `faceSwitch.ts` — Face Detection (vorhandene faceData) + Gesichter-Shuffle + sharp-Compositing
- `bgRemoval.ts` — Multi-Provider (Replicate/Stability) mit Polling
- `aiStyleEffects.ts` — Style-Effekte via Stability AI / Replicate

---

## 6. Credit-System

### Konzept
Pay-per-Use Monetarisierung für AI-Features. Jeder AI-Aufruf verbraucht Credits. Admins können Credits manuell vergeben oder User kaufen Credits selbst.

### Für Admins

1. **Admin-Dashboard** → Sidebar → **„AI Credits"**
2. **Übersicht**: Gesamt-Credits im System, aktive Nutzer, Verbrauch
3. **User-Credits verwalten**: Balance einsehen, Credits hinzufügen
4. **Transaktions-Historie**: Alle Buchungen (consume/recharge) mit Filter

### Datenmodell

```
CreditBalance (userId, balance, totalConsumed, totalRecharged)
    → CreditTransaction (type, amount, featureUsed, description)
```

- `CreditTransactionType`: CONSUME, RECHARGE, BONUS, REFUND, ADJUSTMENT

### API
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/admin/credits/balance` | Gesamt-Übersicht |
| GET | `/api/admin/credits/transactions` | Transaktionen auflisten |
| POST | `/api/admin/credits/add` | Credits einem User hinzufügen |
| GET | `/api/admin/credits/user/:userId` | User-Balance abfragen |

---

## 7. SMS Sharing

### Konzept
Gäste können ihre Fotos per SMS teilen. Integration über Twilio REST API. Admins konfigurieren Twilio-Credentials und sehen Logs/Statistiken.

### Für Admins

1. **Admin-Dashboard** → Sidebar → **„SMS Sharing"**
2. **Logs-Tab**: Paginierte SMS-Verlauf-Tabelle mit Status-Filter und Suche
3. **Stats-Tab**: Gesendet/Zugestellt/Fehlgeschlagen/Ausstehend + Kostenübersicht + Zustellrate
4. **Config-Tab**: Twilio-Konfiguration (Account SID, Auth Token, Telefonnummer, Nachrichtenvorlage)

### Status-Workflow
```
PENDING → SENT → DELIVERED
                → FAILED
```

### API
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/sms/send` | SMS senden (Foto-Link an Telefonnummer) |
| GET | `/api/sms/admin/logs` | SMS-Logs (Admin) |
| GET | `/api/sms/admin/stats` | SMS-Statistiken (Admin) |
| GET | `/api/sms/admin/config` | Twilio-Config lesen (Admin) |
| PUT | `/api/sms/admin/config` | Twilio-Config speichern (Admin) |

---

## 8. E-Mail Foto-Sharing

### Konzept
Gäste können ein Foto per E-Mail an sich selbst oder andere senden. Das System verschickt eine E-Mail mit Foto-Link und optionaler Vorschau.

### Ablauf
1. Gast wählt Foto in der Galerie
2. Klickt **„Per E-Mail teilen"**
3. Gibt E-Mail-Adresse ein
4. System sendet E-Mail mit Foto-Link über konfigurierten Provider (SendGrid/Postmark)
5. Status wird in `EmailShareLog` getrackt

### Datenmodell
```
EmailShareLog (eventId, photoId, recipientEmail, subject, templateUsed, status, externalId, sentAt)
```
- Status: PENDING → SENT → DELIVERED → OPENED / BOUNCED / FAILED

---

## 9. Gallery Embed Code

### Konzept
Hosts können ihre Event-Galerie auf externen Websites einbetten — per iframe oder JavaScript-Snippet.

### Für Hosts / Admins

1. **Admin-Dashboard** → Sidebar → **„Embed Code"**
2. Event auswählen
3. **Embed-Code** wird generiert:
   - **iframe**: `<iframe src="https://gästefotos.com/embed/{eventId}" ...>`
   - **Script-Tag**: `<script src="https://gästefotos.com/api/embed/{eventId}/script.js"></script>`
4. Code kopieren und auf eigener Website einfügen

### API
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/embed/:eventId` | Embed-Daten (Fotos, Config) |
| GET | `/api/embed/:eventId/script.js` | JavaScript-Widget |

---

## 10. Slideshow Mode

### Konzept
Fullscreen-Slideshow der Event-Fotos — ideal für Beamer, Monitore oder als Ergänzung zur Live-Wall.

### Features
- **Auto-Play** mit konfigurierbarer Geschwindigkeit
- **Übergangseffekte**: Fade, Slide, Zoom
- **Nur genehmigte Fotos** (Status: APPROVED)
- **Fullscreen-tauglich** für Beamer/Display

### API
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/slideshow/:eventId` | Slideshow-Konfiguration |
| GET | `/api/slideshow/:eventId/photos` | Genehmigte Fotos für Slideshow |

---

## 11. Bulk Download (ZIP)

### Konzept
Hosts können alle (oder gefilterte) Event-Fotos als ZIP-Archiv herunterladen. Stream-basiert für große Events.

### Features
- **Filter**: nach Kategorie, Datum, oder spezifischen Foto-IDs
- **Stream-basiert**: kein RAM-Limit, auch 10.000+ Fotos möglich
- **Kompression**: zlib Level 6 (guter Kompromiss)
- **Paket-Gating**: `allowDownloads` Feature-Flag

### API
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/events/:eventId/download/zip` | ZIP-Download starten (mit Filtern) |
| GET | `/api/events/:eventId/download/stats` | Download-Statistiken |

---

## 12. Lead Collection

### Konzept
Gäste geben vor/nach dem Foto ihre Kontaktdaten ein (Name, E-Mail, Telefon). Hosts sammeln Leads für Marketing — wichtig für B2B-Kunden (Messen, Brand Activations).

### Features
- **Mehrere Quellen**: Gallery, Booth, QR-Code, Face Search, Guestbook, WiFi Portal, Invitation
- **DSGVO-Consent**: `consentGiven` Flag pro Lead
- **CSV-Export**: Leads als CSV herunterladen
- **Statistiken**: Leads pro Quelle, Zeitverlauf
- **Partner-Zuordnung**: Leads können einem Partner zugeordnet werden

### API
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/leads` | Lead erstellen |
| GET | `/api/leads/event/:eventId` | Leads eines Events |
| GET | `/api/leads/event/:eventId/stats` | Lead-Statistiken |
| GET | `/api/leads/event/:eventId/export` | CSV-Export |
| GET | `/api/leads/partner/:partnerId` | Partner-Leads |

---

## API-Referenz (Kurzübersicht)

### Mosaic
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/events/:id/mosaic` | Mosaic Wall erstellen |
| PUT | `/api/events/:id/mosaic` | Einstellungen aktualisieren |
| GET | `/api/events/:id/mosaic/display` | Wall + Tiles laden (public) |
| GET | `/api/events/:id/mosaic/tiles?since=` | Inkrementelle Tiles |
| POST | `/api/events/:id/mosaic/print-job` | Print-Job erstellen |
| GET | `/api/events/:id/mosaic/print-job/:pin` | Print-Job laden |
| POST | `/api/events/:id/mosaic/print-job/:pin/print` | Druckvorgang starten |
| POST | `/api/events/:id/mosaic/print-job/:pin/confirm` | Druck bestätigen |
| GET | `/api/events/:id/mosaic/print-job/:pin/sticker` | 300 DPI Sticker-Bild |
| GET | `/api/events/:id/mosaic/export` | Poster-Export |

### Partner
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/partners` | Partner auflisten |
| POST | `/api/partners` | Partner erstellen (Admin) |
| GET | `/api/partners/:id` | Partner-Details |
| PUT | `/api/partners/:id` | Partner aktualisieren |
| GET | `/api/partners/:id/events` | Partner-Events |
| GET | `/api/partners/:id/stats` | Partner-Statistiken |
| POST | `/api/partners/:id/members` | Mitglied hinzufügen |
| DELETE | `/api/partners/:id/members/:userId` | Mitglied entfernen |
| POST | `/api/partners/:id/hardware` | Hardware registrieren |
| PUT | `/api/partners/:id/hardware/:hwId` | Hardware aktualisieren |

### Billing
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/partners/:id/billing` | Abrechnungen auflisten |
| POST | `/api/partners/:id/billing/generate` | Abrechnung generieren (Admin) |
| GET | `/api/partners/:id/billing/:periodId` | Abrechnung Details |
| PUT | `/api/partners/:id/billing/:periodId` | Status aktualisieren (Admin) |

### Einladungen
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/events/:id/invitations` | Einladungen auflisten |
| POST | `/api/events/:id/invitations` | Einladung erstellen |
| PUT | `/api/events/:id/invitations/:invId` | Einladung bearbeiten |
| GET | `/api/invitations/slug/:slug` | Öffentliche Einladung laden |
| POST | `/api/invitations/slug/:slug/rsvp` | RSVP abgeben |
| GET | `/api/invitations/slug/:slug/ics` | ICS-Kalender download |

---

## Datenbank-Modelle (Neu)

### Partner-System
```
Partner → PartnerMember (→ User)
       → PartnerHardware
       → Event (via partnerId)
       → BillingPeriod → BillingLineItem
```

### Enums
- `PartnerTier`: BRANDED, WHITE_LABEL
- `PartnerStatus`: ACTIVE, SUSPENDED, TRIAL
- `PartnerMemberRole`: OWNER, MANAGER, OPERATOR
- `BillingPeriodStatus`: DRAFT, FINALIZED, SENT, PAID, CANCELLED
- `UserRole`: ADMIN, PARTNER, HOST

---

## URLs-Übersicht

| URL | Beschreibung | Zugang |
|-----|-------------|--------|
| `/dashboard` | Host-Dashboard | Eingeloggte Hosts |
| `/partner` | Partner-Dashboard | PARTNER-User |
| `/events/{id}/mosaic` | Mosaic-Einstellungen | Host |
| `/live/{slug}` | Live Mosaic Wall | Public |
| `/e3/{slug}` | Event-Gästeseite | Public |
| `/i/{slug}` | Einladungskarte | Public |
| `/s/{code}` | ShortLink Redirect | Public |
| `print.gästefotos.com/t/{slug}` | Print-Terminal | Vor Ort |
| `admin.gästefotos.com/manage/partners` | Admin Partner-Verwaltung | Admin |
