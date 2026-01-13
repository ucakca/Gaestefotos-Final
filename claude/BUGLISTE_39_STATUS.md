# 39-Punkte Bugliste - Status-Analyse (13.01.2026)

## Legende
- ✅ = Bereits behoben
- 🔧 = Heute fixbar (< 30 Min)
- 📋 = Feature-Request / Größere Änderung
- ❓ = Unklar / Braucht Klärung

---

## Status-Übersicht

| # | Beschreibung | Status | Kommentar |
|---|--------------|--------|-----------|
| 1 | Zurück-Button Header Mobile | ✅ | Heute behoben (asChild-Pattern) |
| 2 | FAQ Button im Host-Dashboard entfernen | 🔧 | Vorhanden in `/dashboard/page.tsx:114` |
| 3 | "Uploads prüfen" Funktion unklar | ❓ | Wo genau? Moderation? |
| 4 | Logout/Abmelden Button entfernen | 🔧 | Vorhanden in `/dashboard/page.tsx:131-137` |
| 5 | Schritt-für-Schritt Event-Erstellung | 📋 | Wizard existiert bereits (`/components/wizard/`) |
| 6 | Karte bei Event-Erstellung | 🔧 | Muss geprüft werden |
| 7 | Fotos/Videos Buttons im Dashboard entfernen | 🔧 | Zeile 665-674, `hidden sm:inline-flex` |
| 8 | Titelbild/Profilbild lädt nicht | ✅ | Heute behoben (Design-Images Route) |
| 9 | Dashboard benutzerfreundlicher | 📋 | Konzept-Arbeit nötig |
| 10 | Nicht-enthaltene Features ausgrauen | 📋 | Package-Prüfung pro Feature |
| 11 | Auge-Symbol für Passwort | ✅ | Bereits vorhanden (showPassword) |
| 12 | Speicher/Statistiken sinnvoll? | ❓ | Design-Entscheidung |
| 13 | Upgrade-Funktion verbessern | 📋 | UX-Redesign nötig |
| 14 | Share-Link Funktion erklären | 🔧 | Bessere Beschriftung/Tooltip |
| 15 | Einladungsseite fehlt/broken | 🔧 | Route prüfen |
| 16 | Event Profil doppelt | 🔧 | Deduplizieren |
| 17 | Event-Details Bearbeiten-Hinweis | 🔧 | Pencil-Icon hinzufügen |
| 18 | QR-Aufsteller Fehler | 🔧 | Error-Handling prüfen |
| 19 | Tools-Gäste verbessern | 📋 | Kontakt-Import Feature |
| 20 | Einladungsseite-Funktion | 📋 | Album-basierte Einladungen |
| 21 | Alben-Vorschläge fehlen | 📋 | Event-Typ basierte Templates |
| 22 | Lucide Icons bei Alben | 🔧 | Icon-Picker prüfen |
| 23 | Album bearbeiten Mobile | 🔧 | Responsive Fix |
| 24 | Smart-Album Checkbox | 🔧 | UX-Erklärung verbessern |
| 25 | Challenges Vorlagen | 📋 | Template-System |
| 26 | + Button statt Text | 🔧 | UI-Anpassung |
| 27 | Event-Modus Standard aktiv | 🔧 | Default-Wert prüfen |
| 28 | Mystery Mode Erklärung | ✅ | HelpTooltip existiert |
| 29 | Video-Auswahlfunktion | 🔧 | Wie bei Fotos implementieren |
| 30 | Gästebuch Host-Logik | ❓ | Design-Entscheidung |
| 31 | Design Presets verbessern | 📋 | Custom Preset Feature |
| 32 | Farben-UI unübersichtlich | 📋 | UX-Redesign |
| 33 | Titelbild auf Gästeseite | 🔧 | CSS/Design-Config prüfen |
| 34 | "++story" Text | 🔧 | StoriesBar.tsx prüfen |
| 35 | Alben abgeschnitten/ohne Icon | 🔧 | CSS Fix + Icon |
| 36 | Upload-Button ohne Funktion | 🔧 | Event-Handler prüfen |
| 37 | Challenges Modal falsch | 🔧 | Fullscreen Modal |
| 38 | Info-Menü erweitern | 📋 | Betrieb-Info hinzufügen |
| 39 | Feed Button Hintergrund | 🔧 | CSS Fix |

---

## Zusammenfassung

| Kategorie | Anzahl |
|-----------|--------|
| ✅ Bereits behoben | 4 |
| 🔧 Heute fixbar | 20 |
| 📋 Feature-Request | 12 |
| ❓ Klärung nötig | 3 |

---

## Priorität für heute (🔧 Quick Fixes)

1. **#2, #4** - FAQ/Logout Buttons entfernen (Mobile)
2. **#7** - Fotos/Videos im Header entfernen (Mobile)
3. **#34** - "++story" Text fixen
4. **#35** - Alben CSS + Icons
5. **#36** - Upload-Button prüfen
6. **#39** - Feed Button CSS

