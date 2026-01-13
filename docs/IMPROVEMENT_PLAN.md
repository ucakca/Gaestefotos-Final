# Verbesserungsplan - 39 Punkte
**Erstellt:** 2026-01-11, 19:30 Uhr  
**Priorität:** Nach Impact & Aufwand sortiert

---

## ✅ Quick Wins (sofort umsetzbar)

### Mobile UI - Doppelte Buttons entfernen
- [ ] **#1** Zurück-Button Header (mobile) - funktionslos → entfernen
- [ ] **#2** FAQ Button (mobile Dashboard) → entfernen (bereits im Footer)
- [ ] **#4** Logout/Abmelden (mobile Dashboard) → entfernen (bereits im Footer)
- [ ] **#7** Fotos/Videos Links (Event Dashboard) → entfernen (bereits im Footer)

### UX Micro-Improvements
- [ ] **#11** Passwort Eye-Icon → zeigen/verstecken
- [ ] **#17** Event Details: Bleistift-Icon → editierbar-Hinweis
- [ ] **#26** Album/Challenge hinzufügen → nur + Button
- [ ] **#28** Mystery Mode → Erklärung hinzufügen
- [ ] **#27** Event Modus: Standard immer angeklickt → Fix

---

## 🔥 Critical Bugs (sofort beheben)

### Bilder laden nicht
- [ ] **#6** Event-Karte: Kein Bild angezeigt
- [ ] **#8** Event Dashboard: Titel/Profilbild laden nicht
- [ ] **#33** Design: Titelbild → keine Auswirkung auf Gästeseite

### Gästeseite Bugs
- [ ] **#34** Story: zeigt "++story"
- [ ] **#35** Alben: oben abgeschnitten, ohne Icon
- [ ] **#36** Upload Button: ohne Funktion
- [ ] **#37** Challenges Menü: öffnet falsch (wie Gästebuch öffnen)
- [ ] **#38** Info Menü: Betrieb-Informationen fehlen
- [ ] **#39** Feed Button: Hintergrund anders als andere

### Funktionale Bugs
- [ ] **#18** QR-Aufsteller: Fehler vorhanden
- [ ] **#22** Album Icons: Lucid Icons werden nicht angezeigt
- [ ] **#23** Album Edit: Mobile Ansicht funktioniert nicht

---

## 🎯 Wizard Integration (bereits implementiert!)

- [ ] **#5** Event erstellen: Schritt-für-Schritt Führung → **WIZARD IST DA!**
- [ ] **#21** Alben: Vorschläge basierend auf Event-Typ → **PRESETS EXISTIEREN!**
- [ ] **#25** Challenges: Vorlagen/Vorschläge → **PRESETS EXISTIEREN!**

**Status:** Wizard läuft bereits auf `/create-event` mit:
- 6 Event-Typen (Hochzeit, Familie, Business, Party, Meilenstein, Sonstiges)
- 25+ Album-Presets
- 30+ Challenge-Presets

**TODO:** Alte Album/Challenge-Erstellung auch mit Presets erweitern!

---

## 🏗️ Medium Impact (1-2h Aufwand)

### Dashboard Aufräumen
- [ ] **#9** Event Dashboard: benutzerfreundlicher aufräumen → Ideen sammeln
- [ ] **#16** Event Profil: Duplikat entfernen (im Footer Design vorhanden)

### Upgrade-Hinweise
- [ ] **#10** Nicht-enthaltene Features: ausgrauen + Upgrade-Hinweis
- [ ] **#13** Upgrade-Funktion: benutzerfreundlicher gestalten

### Album/Challenge Verbesserungen
- [ ] **#24** Smart Album: Checkbox + bessere Erklärung (Überschneidungen)
- [ ] **#29** Videos: Auswahlfunktion wie bei Fotos fehlt

### Design-Optimierung
- [ ] **#31** Design Presets: Custom Preset erstellen ermöglichen
- [ ] **#32** Farben: unübersichtlich → auto-adjust basierend auf Preset

---

## 💭 Konzeptfragen (Klärung mit User nötig)

### Funktionale Klärungen
- [ ] **#3** "Uploads prüfen": Was ist die genaue Funktion?
- [ ] **#12** Speicher/Statistiken: Wichtig für Host? Oder demotivierend?
- [ ] **#14** Share-Link: Gleich wie Event-URL? Funktion unklar
- [ ] **#15** Einladungsseite: Was fehlt? Funktion unklar

### Einladungs-Konzept
- [ ] **#20** Einladungsseite: Separation Freunde/Familie/Bekannte
  - Album 1: Trauung → nur Familie
  - Album 2: Essen → Freunde + Familie
  - Album 3: Party → alle
  - **Konzept:** Event mit mehreren Alben, gestaffelte Einladungen

### Gästebuch
- [ ] **#30** Gästebuch für Host: Nachricht schreiben sinnvoll?
  - Sprachnachricht: als Extra-Checkbox aktivierbar
  - Standard: deaktiviert (zu laut auf Partys)

### Gästeverwaltung
- [ ] **#19** Tools-Gäste: Import aus Telefon? Welche Verbesserungen?

---

## 📊 Priorisierung

### Phase 1: Critical Fixes (heute)
1. Bilder laden nicht (#6, #8, #33)
2. Gästeseite Bugs (#34-39)
3. QR-Fehler (#18)
4. Mobile UI Cleanup (#1, #2, #4, #7)

### Phase 2: Quick Wins (morgen)
1. Passwort Eye (#11)
2. Edit-Icons (#17, #27, #28)
3. Album Icons (#22)
4. Mobile Album Edit (#23)

### Phase 3: Wizard-Erweiterung (2 Tage)
1. Alte Album-Erstellung mit Presets erweitern (#21)
2. Alte Challenge-Erstellung mit Presets erweitern (#25)
3. Icons in Album-Auswahl (#22)

### Phase 4: Dashboard & UX (3-5 Tage)
1. Dashboard aufräumen (#9, #16)
2. Upgrade-Hinweise (#10, #13)
3. Design-Optimierung (#31, #32)
4. Smart Album (#24)

### Phase 5: Konzept-Features (nach Klärung)
1. Einladungs-Separation (#20)
2. Gästeverwaltung (#19)
3. Speicher/Statistiken Review (#12)

---

## 🎯 User-Entscheidungen benötigt

1. **Speicher/Statistiken (#12):** Behalten oder entfernen?
2. **Einladungs-Separation (#20):** Welche Felder/UI für Album-Zuordnung?
3. **Gästebuch für Host (#30):** Nachricht schreiben sinnvoll?
4. **Gästeverwaltung (#19):** Welche Features konkret?
5. **Uploads prüfen (#3):** Was ist die Funktion?

---

**Nächster Schritt:** Phase 1 Critical Fixes starten
