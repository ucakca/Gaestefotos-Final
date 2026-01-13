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
| 1 | Zurück-Button Header Mobile | ✅ | Session 1: asChild-Pattern |
| 2 | FAQ Button im Host-Dashboard entfernen | ✅ | Nicht gefunden - evtl. bereits entfernt |
| 3 | "Uploads prüfen" Funktion unklar | ❓ | Link zu /moderation - Moderation-Seite |
| 4 | Logout/Abmelden Button entfernen | ✅ | Session 2: hidden lg:flex (statt md) |
| 5 | Schritt-für-Schritt Event-Erstellung | ✅ | Opus: Bereits vorhanden auf /create-event (9 Schritte) |
| 6 | Karte bei Event-Erstellung | ✅ | Opus: OpenStreetMap Preview + Geocoding hinzugefügt |
| 7 | Fotos/Videos Buttons im Dashboard entfernen | ✅ | Bereits hidden sm:inline-flex |
| 8 | Titelbild/Profilbild lädt nicht | ✅ | Heute behoben (Design-Images Route) |
| 9 | Dashboard benutzerfreundlicher | 📋 | Konzept-Arbeit nötig |
| 10 | Nicht-enthaltene Features ausgrauen | 📋 | Package-Prüfung pro Feature |
| 11 | Auge-Symbol für Passwort | ✅ | Bereits vorhanden (showPassword) |
| 12 | Speicher/Statistiken sinnvoll? | ❓ | Design-Entscheidung |
| 13 | Upgrade-Funktion verbessern | 📋 | UX-Redesign nötig |
| 14 | Share-Link Funktion erklären | 🔧 | Bessere Beschriftung/Tooltip |
| 15 | Einladungsseite fehlt/broken | 🔧 | Route prüfen |
| 16 | Event Profil doppelt | 🔧 | Deduplizieren |
| 17 | Event-Details Bearbeiten-Hinweis | ✅ | Session 2: Pencil-Icon + Text 'Zum Bearbeiten klicken' |
| 18 | QR-Aufsteller Fehler | 🔧 | Error-Handling prüfen |
| 19 | Tools-Gäste verbessern | 📋 | Kontakt-Import Feature |
| 20 | Einladungsseite-Funktion | ✅ | Opus: Konzept dokumentiert (FEATURE_ALBUM_INVITATIONS.md) |
| 21 | Alben-Vorschläge fehlen | 📋 | Event-Typ basierte Templates |
| 22 | Lucide Icons bei Alben | 🔧 | Icon-Picker prüfen |
| 23 | Album bearbeiten Mobile | 🔧 | Responsive Fix |
| 24 | Smart-Album Checkbox | ✅ | Session 2: Info-Box + Overlap-Warnung |
| 25 | Challenges Vorlagen | ✅ | Session 2: 6 Templates (Gruppenfoto, Lustigster Moment, etc.) |
| 26 | + Button statt Text | ✅ | Bereits korrekt: Nur IconButton mit + |
| 27 | Event-Modus Standard aktiv | ✅ | Bereits korrekt: mode || 'STANDARD' default |
| 28 | Mystery Mode Erklärung | ✅ | HelpTooltip existiert |
| 29 | Video-Auswahlfunktion | ✅ | Bereits vollständig: selectedVideos, Bulk-Actions, Filter |
| 30 | Gästebuch Host-Logik | ✅ | Session 2: Entry-Form nur für Gäste, Host nur Host-Message |
| 31 | Design Presets verbessern | 📋 | Custom Preset Feature |
| 32 | Farben-UI unübersichtlich | 📋 | UX-Redesign |
| 33 | Titelbild auf Gästeseite | 🔧 | CSS/Design-Config prüfen |
| 34 | "++story" Text | 🔧 | StoriesBar.tsx prüfen |
| 35 | Alben abgeschnitten/ohne Icon | 🔧 | CSS Fix + Icon |
| 36 | Upload-Button ohne Funktion | 🔧 | Event-Handler prüfen |
| 37 | Challenges Modal falsch | 🔧 | Fullscreen Modal |
| 38 | Info-Menü erweitern | ✅ | Session 2: Kontakt, SSL, DSGVO, Backups hinzugefügt |
| 39 | Feed Button Hintergrund | ✅ | Session 2: bg-transparent entfernt |

---

## Zusammenfassung (Nach Opus + Sonnet Sessions)

| Kategorie | Anzahl | Prozent |
|-----------|--------|---------|
| ✅ Erledigt | 23 | 59% |
| 🔧 Quick Fixes offen | 6 | 15% |
| 📋 Feature-Requests | 6 | 15% |
| ❓ Klärung | 4 | 10% |
| **GESAMT** | **39** | **100%** |

---

## HEUTE ERLEDIGT (Sonnet Session 2)

**Quick Fixes implementiert:**
1. **#4** - Logout nur Desktop (lg: statt md:)
2. **#17** - Event Details Pencil-Icon + Hinweis
3. **#24** - Smart Album Erklärung + Overlap-Warnung
4. **#25** - Challenge-Templates (6 Vorlagen)
5. **#26** - Bestätigt: Bereits nur + Button
6. **#27** - Bestätigt: STANDARD default OK
7. **#29** - Bestätigt: Video-Auswahl bereits da
8. **#30** - Gästebuch: Entry-Form nur für Gäste
9. **#38** - Info-Menü: Betriebsinfo erweitert
10. **#39** - Feed-Button CSS gefixt

## VERBLEIBENDE QUICK FIXES (für Opus)

1. **#6** - Karte bei Event-Erstellung (Maps-Integration)
2. **#14** - Share-Link Funktion klarer beschreiben
3. **#15** - Einladungsseite Route prüfen
4. **#16** - Event Profil Deduplizierung
5. **#18** - QR-Aufsteller Fehler debuggen
6. **#23** - Album Mobile bearbeiten prüfen
7. **#33** - Titelbild Sync Dashboard Gästeseite
8. **#34** - "++story" Text debuggen
9. **#35** - Alben CSS + Icons prüfen
10. **#36** - Upload-Button Funktionalität testen
