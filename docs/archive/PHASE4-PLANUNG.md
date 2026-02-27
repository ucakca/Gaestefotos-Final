# gästefotos.com — Phase 4: Dashboard Redesign & Event Wall

> Stand: 13.02.2026 — Planungsdokument aus UX/UI-Review-Session
> Status: **Planung abgeschlossen, bereit zur Umsetzung**

---

## Zusammenfassung

Das Host Event-Dashboard wird grundlegend überarbeitet. Ziel: Klare Rollentrennung (Host vs. Admin), konsistente Navigation, Upsell-Strategie, und ein neues Flaggschiff-Feature "Event Wall" mit Animationen und Gamification.

### Kernprobleme (IST-Zustand)
- **Rollen-Vermischung**: Host sieht Features die er nicht braucht (Leads, Assets)
- **Naming-Chaos**: "Booth-Spiele" und "KI Booth" suggerieren Hardware, sind aber teils Smartphone-Features
- **Navigations-Inkonsistenz**: Bottom-Nav ändert sich zwischen Seiten, alte Standalone-Seiten (`/photos`, `/videos`, `/guestbook`) haben anderes Design
- **Fehlende Upsell-Strategie**: Nicht gebuchte Features sind unsichtbar statt als Upsell-Möglichkeit ausgegraut
- **LiveWall inkonsistent**: Host-Seite und Gästeseite haben unterschiedliche Implementierungen

---

## Naming — Finale Zuordnung

| Alt | Neu | Begründung |
|---|---|---|
| Booth-Spiele | **Foto-Spiele** | Kein Hardware-Bezug, Smartphone-Feature für Gäste |
| KI Booth | **KI-Kunst** | Selfie → Kunstwerk, kein "Booth" nötig |
| Challenges (Stat-Kachel) | **Foto-Spiele** | Konsistent mit dem Feature-Namen |
| Share-Link + QR-Code | **Share** | Ein Punkt, enthält beides |
| LiveWall / Diashow | **Event Wall** | Zentrales Feature, alle Quellen, nicht nur Slides |
| Leads | _(raus aus Host-Sicht)_ | Nur Admin/Partner |
| Assets | _(raus aus Host-Sicht)_ | Nur Admin/Partner |

### Icon-Zuordnung

| Feature | Icon | Begründung |
|---|---|---|
| Galerie-Fotos | Smartphone-Icon | Gäste laden mit dem Handy hoch |
| Photo Booth (Hardware) | Fotoapparat-Icon | Klassische Kamera = Hardware-Station |
| Mirror Booth (Hardware) | Spiegel-Icon 🪞 | Direkter Bezug zum Produkt |
| Foto-Spiele | Spielerisches Icon 🎮 | Gamification |
| KI-Kunst | Palette/Pinsel 🎨 | Kreativ/Kunst |
| Gästebuch | Buch-Icon 📖 | Standard |
| Mosaic | Puzzle/Grid 🧩 | Mosaik-Kacheln |

---

## Host Event-Dashboard — Neue 4-Tab-Struktur

### Tab 1: Übersicht

**Stat-Kacheln** (klickbar → führen zum passenden Tab/Detail):

| Kachel | Anzeige | Klick-Ziel |
|---|---|---|
| Fotos | Anzahl Fotos | Galerie-Tab, Filter: Fotos |
| Videos | Anzahl Videos | Galerie-Tab, Filter: Videos |
| Gästebuch | Anzahl Einträge | Gästebuch-Tab |
| Besucher | Anzahl Besucher | Detail mit Timeline |
| Foto-Spiele | Anzahl Gäste die gespielt haben (NICHT Anzahl aktive Spiele) | Foto-Spiele Konfiguration |
| Ausstehend | Anzahl zu moderieren | Galerie-Tab, Filter: Ausstehend |

**Event-Banner** mit Vorschau + Design Buttons (wie jetzt).

**Event einrichten Wizard** (solange nicht 100%).

**Paket-Übersicht / Upsell**:
- Aktuelles Paket anzeigen
- Gebuchte Features ✅ farbig
- Nicht gebuchte Features 🔒 ausgegraut
- [Upgrade] Button → Paket-Vergleichsseite
- Addons separat als "Verfügbare Addons"

**Quick Actions**:
- **Share** (QR-Code + Link zusammengelegt)
- **Event Wall** starten
- **Mosaic Wall** (wenn gebucht, sonst ausgegraut mit Upsell)

**Hinweis Statistiken**: Kein separater Statistik-Quick-Action. Statistiken werden direkt in die Stat-Kacheln integriert. Klick auf Kachel zeigt Details.

### Tab 2: Galerie

- **Fotos + Videos vereint** in einem Tab
- Filter-Tabs oben: Alle | Fotos | Videos | Ausstehend
- Moderation-Tools (Freigeben/Ablehnen)
- "Mehr laden" Button / Infinite Scroll — **kein Wegnavigieren zu `/photos`!**
- Farbinkonsistenz fixen: Ausgewählter Filter muss lesbar sein

**BUG**: "Alle Medien anzeigen" führt aktuell zu `/photos` (alte Standalone-Seite mit anderem Design). Muss innerhalb des Galerie-Tabs bleiben.

### Tab 3: Gästebuch

- Einträge lesen
- Moderation (Freigeben/Löschen)
- Zukunft: PDF-Export (schönes Layout als Erinnerung)
- Zukunft: Event Wall-Integration (Einträge mit Foto auf der Wall zeigen)

### Tab 4: Setup

**Prinzip: Progressive Disclosure** — Nicht überfüllt! Nur Kategorien zeigen, Details per Klick.

4 Hauptkategorien als Cards:
1. **Design** — Branding, Farben, Logo
2. **Teilen** — QR-Code, Link, Einladungen, Hashtag-Import (nur bei Werbefrei sichtbar)
3. **Features** — Foto-Spiele, KI-Kunst, Event Wall Konfiguration
4. **Allgemein** — Moderation, Datenschutz, Daten-Export

Jedes Feature als Card mit:
- Icon + Name + Status-Badge (✅ Aktiv / 🔒 Nicht gebucht)
- ⚙️ Zahnrad → Konfigurations-Wizard (Schritt für Schritt)
- ❓ Fragezeichen → Info-Sheet mit Erklärung, Beispiel-Animation/Video, Preis

**Konsistenz mit Wizard**: Setup = Wizard in "Ich weiß was ich will"-Modus. Gleiche Kategorien, frei navigierbar statt linear. Wizard muss ggf. an neue Features angepasst werden.

**Upsell bei allen nicht gebuchten Features**:
- ❓ Button zeigt: Kurze Erklärung (2-3 Sätze), Vorschau-Animation/Video, "So sieht es für deine Gäste aus", Preis + "Jetzt freischalten" CTA

### Bottom-Nav

**IMMER gleich: Übersicht | Galerie | Gästebuch | Setup**

Keine Änderung der Navigation beim Wechsel zwischen Seiten. Kein alter scrollbarer DashboardFooter mehr. Alles innerhalb der 4 Tabs.

---

## Event Wall — Flaggschiff-Feature

### Konzept
Eine zentrale, animierte Darstellung aller Event-Inhalte. Ersetzt die alte "LiveWall" und "Diashow". Läuft auf TV/Beamer.

### Quellen

| Quelle | Symbol | Bedingung |
|---|---|---|
| Galerie-Fotos | Smartphone-Icon | Immer verfügbar |
| Foto-Spiele Ergebnisse | 🎮 | Wenn Foto-Spiele gebucht |
| KI-Kunst Ergebnisse | 🎨 | Wenn KI-Kunst gebucht |
| Gästebuch-Einträge | 📖 | **Nur wenn Eintrag ein Foto hat** (Text-Only kommt nicht auf Wall) |
| Mosaic-Tiles | 🧩 | Wenn Mosaic gebucht |
| Booth-Fotos (Zukunft) | Fotoapparat / 🪞 | Wenn Hardware-Addon gebucht |

**Host wählt nur aus gebuchten Quellen. Nicht gebuchte sind ausgegraut mit Upsell.**

### Animationen & Übergänge

**Zufällig gemischt** — keine quellenbasierte Logik die der User erkennt. Verschiedene Übergänge:
- Fade (sanftes Ein-/Ausblenden)
- Slide (gleiten in verschiedene Richtungen)
- Zoom / Ken-Burns-Effekt
- Flip (Karte dreht sich)
- Collage-Shuffle (2-4 Fotos arrangieren sich neu)

**Spezial-Animation für Mosaic**: Wenn ein Mosaic-Foto kommt, wird es animiert "auf die Wall geklebt" — Gesamtbild baut sich Stück für Stück auf. Das ist ein **Erlebnis- und Erfolgsmoment** für die Gäste ("Mein Foto ist jetzt Teil des großen Bildes!").

### Darstellungsmodi
- Diashow mit verschiedenen Übergängen (nicht nur rotierend)
- Collage (2-4 Fotos gleichzeitig, verhindert Endlos-Feeling)
- Highlight (nur favorisierte/freigegebene)

---

## Badges & Gamification

### Badges bei neuen Inhalten

Jedes Medium bekommt seinen **eigenen Badge** — nicht generisch, sondern bezogen auf das betroffene Medium:

```
📸 Galerie     🔴 +5     ← 5 neue Fotos
🎮 Foto-Spiele 🔴 +2     ← 2 neue Spiel-Ergebnisse
📖 Gästebuch   🔴 +1     ← 1 neuer Eintrag
🎨 KI-Kunst    🔴 +3     ← 3 neue Kunstwerke
🧩 Mosaic      🔴 +12    ← 12 neue Tiles
```

Auch auf der Event Wall: Badge-Flash wenn neuer Content reinkommt ("Neues Foto von Martin!").

**Frequenz**: Nicht zu oft, nicht zu selten. Konfigurierbar. Mehrere Achievements können gebündelt angezeigt werden.

### Achievements / Abzeichen

| Achievement | Bedingung |
|---|---|
| Erster Upload | 1. Foto hochgeladen |
| Foto-Marathon | 10+ Fotos |
| Spieler | 1. Foto-Spiel gespielt |
| Game Master | Alle verfügbaren Spiele gespielt |
| Künstler | 1. KI-Kunst erstellt |
| Geschichtenerzähler | Gästebuch-Eintrag geschrieben |
| Social Butterfly | Foto geteilt |

**Animationen**: Vollbildschirm-Animationen und Bildschirmeffekte bei Achievements! Konfetti, Glow, etc.

### Leaderboard

- Meiste Fotos (existiert bereits)
- Meiste Spiele gespielt
- Event-Champion (Gesamtpunktzahl)
- Erweiterbar um Likes/Reaktionen

---

## KI-Kunst — Selfie-Only Regel

### Host-Sicht
Nur Konfiguration: Welche Stile aktiv? Preview. Fertig.

### Gast-Flow
1. Gast öffnet "KI-Kunst" in der Event-App
2. **Beispiel-Vorlagen werden gezeigt** (Slide/Carousel) — damit der Gast versteht was das Feature ist
3. Drückt + → **Kamera öffnet sich für Selfie** (kein Fotoauswahl aus Galerie!)
4. Selfie muss frisch vom Event sein — verhindert Missbrauch (fremde Fotos manipulieren)
5. Stil wählen
6. KI transformiert
7. Ergebnis wird in der Galerie geteilt + Speichern/Teilen Funktion

---

## Hashtag-Import

- **Werbefrei-Paket**: Host kann selbst Hashtag setzen → sichtbar unter Setup
- **Nicht Werbefrei**: Hashtag-Import passiert automatisch im Hintergrund → nicht sichtbar für Host

---

## Hardware-Addons: Inventar & Buchungssystem

### Erstmal für eigenes Inventar (kein Partner-System, aber zukunftssicher geplant)

**Inventar-Liste** (Admin-Bereich):
- Gerätename, Typ (Photo Booth / KI-Station / Mirror Booth / etc.)
- Status: Verfügbar / Gebucht / In Wartung
- Standort

**Kalender-Ansicht**:
- Monatskalender mit farbigen Blöcken pro Gerät
- Puffer-Tage für Transport/Aufbau/Abbau einplanbar
- Sofort sichtbar: Welcher Tag ist noch frei?

**Buchungs-Flow** (wenn Host Addon bucht):
- System prüft: Ist Gerät am Datum frei?
- Verfügbar → Automatische Reservierung
- Nicht verfügbar → "Leider nicht verfügbar. Nächster freier Termin: [Datum]. Warteliste?"

**Status-Tracking**:
Reserviert → Bestätigt → Ausgeliefert → Aktiv → Zurück → Geprüft

**Hinweis**: Architektur so planen, dass Partner-Erweiterung später möglich ist (Multi-Tenant Inventar).

---

## Rollen-Trennung

| Feature | Host | Admin | Partner (Zukunft) |
|---|---|---|---|
| Galerie / Moderation | ✅ | ✅ | ✅ |
| Gästebuch | ✅ | ✅ | ✅ |
| Event Wall | ✅ | ✅ | ✅ |
| Foto-Spiele (Konfig) | ✅ | ✅ | ✅ |
| KI-Kunst (Konfig) | ✅ | ✅ | ✅ |
| Share / QR-Code | ✅ | ✅ | ✅ |
| Paket-Übersicht | ✅ | ✅ | ✅ |
| Statistiken (Kacheln) | ✅ | ✅ | ✅ |
| Leads | ❌ | ✅ | ✅ |
| Assets | ❌ | ✅ | ✅ |
| Hardware-Inventar | ❌ | ✅ | ✅ |
| Partner-Verwaltung | ❌ | ✅ | ❌ |

---

## Bekannte Bugs

| Bug | Beschreibung | Priorität |
|---|---|---|
| **Gastseite Footer** | Falscher Footer auf der Gastseite | HIGH |
| **Floating Button weg** | KI-Assistent Floating Button fehlt auf der Gastseite | HIGH |
| **Galerie Filter-Farben** | Ausgewählter Filter nicht lesbar (Farbinkonsistenz) | HIGH |
| **"Alle Medien anzeigen"** | Führt zu `/photos` (alte Standalone-Seite mit anderem Design) | HIGH |
| **Navigations-Wechsel** | Bottom-Nav ändert sich wenn man von Dashboard zu `/photos` navigiert | HIGH |

---

## Alte Standalone-Seiten

Langfristig komplett entfernen:
- `/events/[id]/photos` → alles im Galerie-Tab
- `/events/[id]/videos` → alles im Galerie-Tab
- `/events/[id]/guestbook` → alles im Gästebuch-Tab

**Priorität: Niedrig** — System noch nicht aktiv mit Kunden. Wird gemacht wenn es dran ist.

---

## Umsetzungs-Reihenfolge (Vorschlag)

### Schritt 1: Bugs fixen
- Gastseite Footer + Floating Button
- Galerie Filter-Farben
- "Alle Medien anzeigen" → innerhalb Galerie-Tab laden

### Schritt 2: Naming & Navigation
- Alle Umbenennungen durchführen (Foto-Spiele, KI-Kunst, Share, Event Wall)
- Bottom-Nav konsistent machen (immer 4 Tabs)
- Leads + Assets aus Host-Sicht entfernen

### Schritt 3: Dashboard-Redesign
- Stat-Kacheln überarbeiten (klickbar, Foto-Spiele = Gäste-Anzahl)
- Paket-Übersicht / Upsell auf Übersicht
- Setup-Tab (Progressive Disclosure, Feature-Cards mit ⚙️ + ❓)
- Wizard anpassen

### Schritt 4: Event Wall
- Einheitliches Feature (Host + Gast)
- Quellen-System (gemischt, alle verfügbaren)
- Animationen & Übergänge (Fade, Slide, Zoom, Flip, Collage)
- Mosaic Spezial-Animation ("auf die Wall kleben")

### Schritt 5: Gamification
- Badges pro Medium
- Achievements mit Vollbildschirm-Animationen
- Leaderboard erweitern
- Frequenz-Logik (nicht zu oft/selten, bündelbar)

### Schritt 6: KI-Kunst Gast-Flow
- Beispiel-Vorlagen Carousel
- Selfie-Only (kein Galerie-Pick)
- Ergebnis in Galerie teilen

### Schritt 7: Hardware Inventar & Buchung
- Inventar-Verwaltung (Admin)
- Kalender-Ansicht
- Buchungs-Flow mit Verfügbarkeitsprüfung
- Zukunftssicher für Partner-Erweiterung
