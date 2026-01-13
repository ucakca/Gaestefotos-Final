# Bugliste 39 Punkte - Status-Analyse

## Status-Legende
- ✅ = Erledigt
- 🔧 = In Arbeit / Teilweise erledigt
- ❌ = Offen
- ❓ = Klärung nötig

---

## Host Dashboard (Mobile)

| # | Problem | Status | Notizen |
|---|---------|--------|---------|
| 1 | Zurück-Button im Header ohne Funktion | ✅ | asChild-Pattern Fix am 13.01.2026 |
| 2 | FAQ-Button entfernen (bereits im Footer) | ✅ | Hidden auf Mobile |
| 3 | "Uploads prüfen" - Funktion unklar | ❓ | Klärung: Was ist gemeint? |
| 4 | Logout-Button entfernen (bereits im Footer) | ✅ | Hidden auf Mobile |

## Event erstellen

| # | Problem | Status | Notizen |
|---|---------|--------|---------|
| 5 | Schritt-für-Schritt-Führung beim Event erstellen | ❌ | Großes Feature |
| 6 | Karte wird nicht angezeigt | ❌ | Google Maps Integration prüfen |

## Event Dashboard

| # | Problem | Status | Notizen |
|---|---------|--------|---------|
| 7 | "Fotos" und "Videos" neben Tour entfernen | ✅ | Entfernt (13.01.2026) |
| 8 | Titelbild und Profilbild laden nicht | ❌ | Bug #8 war nur für deaktivierte Events |
| 9 | Dashboard benutzerfreundlicher aufräumen | ❌ | UX-Redesign nötig |
| 10 | Nicht enthaltene Funktionen ausgrauen + Upgrade-Hinweis | ❌ | Feature-Gating |
| 11 | Passwort-Auge-Symbol zum Anzeigen | ✅ | Bereits implementiert (EyeIcon/EyeOff) |
| 12 | Speicher/Statistiken - Sind sie wichtig? | ❓ | Design-Entscheidung |
| 13 | Upgrade-Funktion verbessern | ❌ | UX-Verbesserung |
| 14 | Share-Link besser erklären | ❌ | UX/Dokumentation |
| 15 | Einladungsseite fehlt/verbessern | ❌ | Feature fehlt |
| 16 | Event-Profil doppelt (auch in Design) | ❌ | Duplikate entfernen |
| 17 | Event-Details mit Bleistift-Symbol | ❌ | UX-Verbesserung |

## Tools

| # | Problem | Status | Notizen |
|---|---------|--------|---------|
| 18 | QR-Aufsteller hat Fehler | ❌ | Bug prüfen |
| 19 | Gäste-Import verbessern | ❌ | Feature-Verbesserung |
| 20 | Einladungsseite - Konzept für Alben/Gruppen | ❌ | Komplexes Feature |
| 21 | Alben - Keine Vorschläge | ❌ | Feature fehlt |
| 22 | Lucide-Icons bei Alben nicht angezeigt | ❌ | Bug |
| 23 | Album kann mobil nicht bearbeitet werden | ❌ | Bug |
| 24 | Smart-Album Checkbox + Erklärung | ❌ | UX-Verbesserung |
| 25 | Challenges - Keine Vorlagen | ❌ | Feature fehlt |
| 26 | Nur + Button statt "Challenge hinzufügen" | ❌ | UX-Verbesserung |

## Event-Einstellungen

| # | Problem | Status | Notizen |
|---|---------|--------|---------|
| 27 | Event-Modus: Standard immer angeklickt | ❌ | Bug/UX |
| 28 | Mystery-Mode Erklärung fehlt | ❌ | Dokumentation |

## Videos

| # | Problem | Status | Notizen |
|---|---------|--------|---------|
| 29 | Auswahlfunktion wie bei Fotos fehlt | ❌ | Feature-Parität |

## Gästebuch

| # | Problem | Status | Notizen |
|---|---------|--------|---------|
| 30 | Host soll nur Nachricht hinterlassen können + Sprachnachricht optional | ❓ | Design-Entscheidung |

## Design (Footer-Menü)

| # | Problem | Status | Notizen |
|---|---------|--------|---------|
| 31 | Presets unübersichtlich + eigene Presets erstellen | ❌ | Feature |
| 32 | Farben-Bereich unklar | ❌ | UX-Verbesserung |
| 33 | Titelbild hat keinen Einfluss auf Gästeseite | ❌ | Bug |

## Gästeseite

| # | Problem | Status | Notizen |
|---|---------|--------|---------|
| 34 | Story zeigt "++story" | ❌ | Bug |
| 35 | Alben oben abgeschnitten, ohne Icon | ❌ | Bug |
| 36 | Upload-Button ohne Funktion | ❌ | Bug - kritisch! |
| 37 | Challenges-Menü öffnet falsch | ❌ | UX-Bug |
| 38 | Info-Menü mit Betriebsinformationen erweitern | ❌ | Feature |
| 39 | Feed-Button Hintergrund anders als andere | ❌ | Style-Bug |

---

## Zusammenfassung

- **Erledigt:** 1 von 39 (✅)
- **Offen:** 35 von 39 (❌)
- **Klärung nötig:** 3 von 39 (❓)

## Priorisierung

### Kritisch (Bugs die Nutzung blockieren)
- #36: Upload-Button ohne Funktion
- #8: Titelbild/Profilbild laden nicht
- #18: QR-Aufsteller Fehler
- #34-35: Story/Alben Darstellungsfehler

### Hoch (UX-Probleme)
- #2, #4, #7: Redundante Buttons entfernen
- #11: Passwort-Auge
- #22-23: Album-Bugs
- #39: Style-Inkonsistenz

### Mittel (Feature-Verbesserungen)
- #5: Schritt-für-Schritt Event-Erstellung
- #9: Dashboard aufräumen
- #10: Feature-Gating mit Upgrade-Hinweis
- #21, #25: Vorlagen für Alben/Challenges

### Niedrig (Nice-to-Have)
- #19: Gäste-Import
- #31: Eigene Presets
- #38: Betriebsinfos im Info-Menü
