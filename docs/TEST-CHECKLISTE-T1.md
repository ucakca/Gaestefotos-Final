# T1: User-Testing Checkliste — Alle Features

> Stand: 27. Februar 2026
> Debug-Mode: AKTIV ✅ — Grüner 🐛 Bug-Button unten rechts auf app.gästefotos.com

---

## So funktioniert das Test-System

1. Öffne **app.gästefotos.com** im Browser
2. Du siehst unten rechts einen **grünen 🐛 Bug-Button**
3. Klick darauf → **Debug Console** öffnet sich (Vollbild, dunkel)
4. Dort siehst du:
   - **API** (grün) — erfolgreiche API-Calls
   - **NET** (orange) — 4xx Fehler
   - **ERR** (rot) — 5xx Fehler, Console-Fehler, Crashes
   - **WARN** (gelb) — Warnungen
   - **WS** (lila) — WebSocket-Verbindungen
5. **Alle Logs werden automatisch ans Backend gesendet** → ich kann sie dort lesen
6. Zum Schließen: X-Button oben rechts

### Logs an mich senden:
- Nachdem du eine Sektion getestet hast, sage mir Bescheid
- Ich lese die Logs mit: `curl localhost:8001/api/debug/logs`
- Oder: im Debug-Panel auf "Copy" klicken → mir einfügen

---

## Test-Sektionen

### 1. 📱 Gäste-App Grundfunktionen

| # | Test | URL / Aktion | Erwartung | ✅/❌ |
|---|------|-------------|-----------|------|
| 1.1 | **Startseite laden** | `app.gästefotos.com` | Seite lädt ohne Fehler | |
| 1.2 | **Event öffnen** | Klick auf ein Event | Event-Galerie öffnet | |
| 1.3 | **Foto hochladen** | Upload-Button → Foto wählen | Upload erfolgreich, Foto erscheint | |
| 1.4 | **Foto ansehen** | Klick auf ein Foto | Lightbox öffnet | |
| 1.5 | **Foto teilen** | Share-Button auf Foto | Share-Dialog öffnet | |
| 1.6 | **Dark Mode** | System auf Dark → App prüfen | Alle Elemente lesbar | |
| 1.7 | **Navigation** | Zwischen Tabs wechseln | Smooth, keine Fehler | |

### 2. 🔐 Auth & Login

| # | Test | URL / Aktion | Erwartung | ✅/❌ |
|---|------|-------------|-----------|------|
| 2.1 | **Login** | E-Mail + Passwort | Redirect zum Dashboard | |
| 2.2 | **Logout** | Logout-Button | Zurück zur Startseite | |
| 2.3 | **Theme nach Login** | Login → Dashboard | Theme bleibt (nicht Light→Dark Wechsel) | |
| 2.4 | **Passwort vergessen** | "Passwort vergessen" Link | E-Mail wird gesendet | |

### 3. 📊 Host-Dashboard

| # | Test | URL / Aktion | Erwartung | ✅/❌ |
|---|------|-------------|-----------|------|
| 3.1 | **Dashboard laden** | `/dashboard` | Stats-Karten, Event-Liste | |
| 3.2 | **Event erstellen** | "Neues Event" Button | Event wird erstellt | |
| 3.3 | **Event bearbeiten** | Event öffnen → Einstellungen | Alle Felder editierbar | |
| 3.4 | **Setup-Checkliste** | Dashboard → Setup | Alle Punkte navigieren korrekt | |
| 3.5 | **QR-Styler** | QR-Code Designer öffnen | QR-Code generiert + editierbar | |
| 3.6 | **Einladungen** | Einladung erstellen + versenden | Einladungskarte wird generiert | |
| 3.7 | **Design/Wizard** | Design anpassen | KI-Farbgenerator + Preview | |
| 3.8 | **Gästeliste** | Gästeliste öffnen | Liste mit RSVP-Status | |

### 4. 🤖 AI-Effekte (Bild)

| # | Test | URL / Aktion | Erwartung | ✅/❌ |
|---|------|-------------|-----------|------|
| 4.1 | **Face Switch** | Foto wählen → Face Switch | Gesichter getauscht (Qualität?) | |
| 4.2 | **BG Removal** | Foto → Hintergrund entfernen | Transparenter/Custom Hintergrund | |
| 4.3 | **AI Oldify** | Foto → Altern | Gesicht altert (+30 Jahre) | |
| 4.4 | **AI Style Pop** | Foto → Pop-Art/Neon | Stilisiertes Portrait | |
| 4.5 | **AI Cartoon** | Foto → Cartoon | Cartoon-Version | |
| 4.6 | **Style Transfer** | Foto → Stil wählen (16 Stile) | Stil wird übertragen | |
| 4.7 | **Emoji Me** | Foto → Emoji-Avatar | Emoji-Version des Gesichts | |
| 4.8 | **Miniature** | Foto → Tilt-Shift | Miniatur-Effekt | |
| 4.9 | **Time Machine** | Foto → Zeitreise | Person in anderer Epoche | |
| 4.10 | **Pet Me** | Foto → Tier-Version | Person als Tier | |
| 4.11 | **Yearbook** | Foto → 80er/90er Yearbook | Yearbook-Style | |
| 4.12 | **Celebrity Lookalike** | Foto → Promi-Doppelgänger | Vergleich mit Promi | |

### 5. 🎮 AI-Spiele (LLM)

| # | Test | URL / Aktion | Erwartung | ✅/❌ |
|---|------|-------------|-----------|------|
| 5.1 | **Compliment Mirror** | Starten → Foto/Selfie | Kompliment generiert | |
| 5.2 | **Fortune Teller** | Starten | Zukunfts-Vorhersage | |
| 5.3 | **Roast Battle** | Starten → Foto | Lustiger Roast | |
| 5.4 | **Party Animal** | Starten → Foto | Tier-Match | |
| 5.5 | **Confession Booth** | Starten | "Beichte" generiert | |
| 5.6 | **AI Bingo** | Starten | Bingo-Karte generiert | |
| 5.7 | **AI DJ** | Starten → Stimmung | 5 Song-Vorschläge | |
| 5.8 | **Meme Generator** | Foto → Meme | 3 Captions + Template | |
| 5.9 | **Party Awards** | Starten | 5 "Am ehesten..." Awards | |
| 5.10 | **Photo Critic** | Foto → Bewertung | Professionelle Foto-Kritik | |
| 5.11 | **Couple Match** | 2 Fotos → Match | Match-Score | |

### 6. 🔍 Face Search

| # | Test | URL / Aktion | Erwartung | ✅/❌ |
|---|------|-------------|-----------|------|
| 6.1 | **Selfie machen** | Face Search → Kamera | Kamera öffnet | |
| 6.2 | **Fotos finden** | Selfie → Suche | Eigene Fotos gefunden | |
| 6.3 | **Ergebnis-Qualität** | Ergebnisse prüfen | Richtige Person erkannt | |

### 7. 📺 Live Wall

| # | Test | URL / Aktion | Erwartung | ✅/❌ |
|---|------|-------------|-----------|------|
| 7.1 | **Live Wall öffnen** | Event → Live Wall | Foto-Grid lädt | |
| 7.2 | **Auto-Refresh** | Foto hochladen → warten | Neues Foto erscheint nach 5s | |
| 7.3 | **Fullscreen** | Fullscreen-Button | Fullscreen-Mode | |
| 7.4 | **QR-Code teilen** | QR-Button | QR-Code wird angezeigt | |
| 7.5 | **Gästebuch-Overlays** | Gästebuch-Eintrag → Wall | Badge erscheint | |

### 8. 💌 Einladungskarten (Gast-Ansicht)

| # | Test | URL / Aktion | Erwartung | ✅/❌ |
|---|------|-------------|-----------|------|
| 8.1 | **Einladung öffnen** | `/i/{slug}` | Schöne Einladungskarte | |
| 8.2 | **RSVP** | Ja/Vielleicht/Nein klicken | Antwort gespeichert | |
| 8.3 | **Kalender** | "Zum Kalender hinzufügen" | ICS-Download | |
| 8.4 | **Teilen** | Share-Buttons | WhatsApp/E-Mail/Link funktioniert | |

### 9. 🏢 Admin-Dashboard

| # | Test | URL / Aktion | Erwartung | ✅/❌ |
|---|------|-------------|-----------|------|
| 9.1 | **Dashboard laden** | `dash.gästefotos.com` | Admin-Dashboard öffnet | |
| 9.2 | **AI-Provider** | KI → Provider | Provider-Liste + Status | |
| 9.3 | **AI-Credits** | KI → Credits | Balance + Transaktionen | |
| 9.4 | **Face Swap Templates** | KI → Templates | 25 Templates sichtbar | |
| 9.5 | **Reference Images** | KI → Reference Images | Event-Auswahl + Upload | |
| 9.6 | **Survey Prompts** | KI → Survey Prompts | 5 Default-Fragen | |
| 9.7 | **Cost Monitoring** | KI → Kosten | Charts + Provider-Breakdown | |
| 9.8 | **Trend Monitor** | KI → Trends | CivitAI, HuggingFace Trends | |
| 9.9 | **Partner-Verwaltung** | Partner | Partner-Liste | |
| 9.10 | **Events verwalten** | Events | Event-Liste + Detail | |

### 10. ⚡ Performance & Fehler

| # | Test | URL / Aktion | Erwartung | ✅/❌ |
|---|------|-------------|-----------|------|
| 10.1 | **Seitenladezeit** | Verschiedene Seiten | < 3 Sekunden | |
| 10.2 | **Console-Fehler** | Debug-Panel → ERR Filter | 0 Errors ideal | |
| 10.3 | **404-Requests** | Debug-Panel → NET Filter | Keine 404s für API-Calls | |
| 10.4 | **Mobile** | Handy → App öffnen | Responsive, alles bedienbar | |
| 10.5 | **PWA** | "Zum Startbildschirm" | App installierbar | |

---

## Nach dem Testen

1. Sage mir Bescheid welche Sektion(en) du getestet hast
2. Ich lese die Debug-Logs vom Server
3. Wir identifizieren Fehler + Prioritäten
4. Debug-Mode kann ich jederzeit deaktivieren mit:
   ```
   curl -X POST localhost:8001/api/debug/local-toggle -H "Content-Type: application/json" -d '{"enabled":false}'
   ```

---

> **Hinweis:** Der Debug-Button (🐛) erscheint NUR wenn Debug-Mode aktiv ist. Normalen Nutzern fällt er nicht auf.
