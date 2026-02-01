# User-Rückfragen zu Improvement Plan

## Funktionale Klärungen benötigt

### #3 - "Uploads prüfen" Funktion
**Frage:** Was ist die genaue Funktion von "Uploads prüfen"?
- Ist das die Moderations-Funktion?
- Oder etwas anderes?

### #12 - Speicher & Statistiken
**Frage:** Sollen Speicher/Statistiken angezeigt werden?
**Bedenken:** Könnte demotivierend wirken wenn wenige Uploads

**Meine Empfehlung:** 
- Speicher nur bei >80% zeigen (Warnung)
- Statistiken optional in Einstellungen verstecken
- Fokus auf positive Metriken (Anzahl Fotos, nicht Speicher)

### #14 - Share-Link vs Event-URL
**Frage:** Ist Share-Link = Event-URL?
**Vermutung:** Share-Link → Kurzlink, Event-URL → Vollständige URL

### #15 & #20 - Einladungsseite Konzept
**Frage:** Wie soll die Einladungsseite funktionieren?
**Dein Konzept (#20):**
- Event mit 3 Alben (Trauung, Essen, Party)
- Unterschiedliche Tage
- Separation: Freunde / Familie / Bekannte
- Nicht jeder kann zu allem eingeladen werden

**Meine Interpretation:**
1. Album-basierte Einladungen
2. Pro Album: Wer darf sehen/uploaden?
3. Zeitliche Staffelung möglich

**Benötigt:**
- UI-Design für Album-Zuordnung zu Gruppen
- Gruppen-Verwaltung (Freunde, Familie, etc.)
- Einladungs-Links pro Album/Gruppe

### #19 - Gästeverwaltung Verbesserungen
**Frage:** Welche Features konkret?
- Import aus Telefon-Kontakten?
- CSV-Import?
- Manuell Gäste hinzufügen + Kategorisieren?

### #30 - Gästebuch für Host
**Frage:** Soll Host im Gästebuch schreiben können?

**Deine Gedanken:**
- Sprachnachricht: Extra Checkbox aktivierbar
- Standard: deaktiviert (zu laut auf Partys)

**Meine Empfehlung:**
- Host kann Begrüßungsnachricht schreiben (einmalig)
- Host kann NICHT im Gästebuch "chatten"
- Gästebuch = nur Gäste untereinander

---

## Meine Empfehlungen

### Dashboard Aufräumen (#9)
**Vorschläge:**
1. **Tabs statt One-Page:**
   - Übersicht (Statistiken, Quick Actions)
   - Fotos & Videos
   - Gäste & Einladungen
   - Einstellungen

2. **Card-basiertes Layout:**
   - Wichtige Actions als Cards
   - Weniger verwendete in Dropdown

3. **Mobile-First Optimierung:**
   - Wichtigste 3-4 Actions sichtbar
   - Rest in "Mehr" Menu

### Upgrade-Funktion (#13)
**Vorschläge:**
1. Feature-Vergleichstabelle
2. "Was du mit Upgrade bekommst" Highlights
3. Klarer Call-to-Action
4. Pricing transparent

### Design Presets (#31, #32)
**Vorschläge:**
1. **Custom Preset:**
   - "Eigenes Preset erstellen" Button
   - Preset speichern & benennen
   - Für zukünftige Events wiederverwenden

2. **Farben Auto-Adjust:**
   - Preset wählen → Farben automatisch anpassen
   - Advanced: Farben manuell überschreiben
   - Live-Preview der Änderungen

---

**Bitte priorisieren:**
1. Welche Fragen soll ich zuerst klären?
2. Soll ich mit Critical Bugs (#6,8,18,34-39) sofort starten?
3. Oder erst Konzept-Fragen klären?
