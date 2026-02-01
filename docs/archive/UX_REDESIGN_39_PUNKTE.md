# 🎨 UX Redesign: 39-Punkte-Plan

**Erstellt:** 2026-01-11  
**Tester:** Caglar  
**Status:** In Bearbeitung

---

## Übersicht

| Kategorie | Punkte | Status | Aufwand |
|-----------|--------|--------|---------|
| ✅ Erledigt (Cursor) | 1,2,4,7,8,11,17,34,35,36,39 | 11/39 | - |
| 🔴 Gästeseite Bugs | 37,38 | 0/2 | 2h |
| 🟠 Host Dashboard | 3,9,12,16 | 0/4 | 4h |
| 🔵 Event Wizard | 5,6,21,25,26,27 | 0/6 | 8h |
| 🟣 Paket-Gating | 10,13 | 0/2 | 4h |
| 🟡 Einladungen | 14,15,20,24 | 0/4 | 6h |
| 🟢 Tools & Features | 18,19,22,23,28,29,30,31,32,33 | 0/10 | 8h |

**Gesamt: 11/39 erledigt (28%)**

---

## ✅ ERLEDIGT (von Cursor/Sonnet)

| # | Problem | Fix | Commit |
|---|---------|-----|--------|
| 1 | Zurück-Button Mobile ohne Funktion | Link-Wrapper korrigiert | 05cacc1 |
| 2 | FAQ Button redundant (Mobile) | Hidden auf Mobile | 05cacc1 |
| 4 | Logout/Abmelden Button redundant | Hidden auf Mobile | 05cacc1 |
| 7 | Fotos/Videos neben Tour redundant | Hidden auf Mobile | 05cacc1 |
| 8 | Titelbild/Profilbild lädt nicht | URL-Encoding hinzugefügt | 05cacc1 |
| 11 | Passwort-Auge fehlt | Eye/EyeOff Icon | 05cacc1 |
| 17 | Bleistift-Symbol für Edit fehlt | Pencil Icon hinzugefügt | 05cacc1 |
| 34 | "++Story" statt "+Story" | Text korrigiert | 05cacc1 |
| 35 | Alben oben abgeschnitten | Padding erhöht | 05cacc1 |
| 36 | Upload-Button ohne Funktion | Wrapper entfernt | 05cacc1 |
| 39 | Feed Button Hintergrund anders | Konsistente Styles | 05cacc1 |

---

## 🔴 GÄSTESEITE BUGS (Priorität: KRITISCH)

### #37: Challenges Menü öffnet falsch
**Problem:** Challenges öffnen nicht im Vollbild wie Gästebuch  
**Lösung:** `inset-0` statt partielles Overlay  
**Datei:** `BottomNavigation.tsx`  
**Aufwand:** 30 Min

### #38: Info Menü erweitern
**Problem:** Info-Seite zeigt keine Betriebsinformationen  
**Lösung:** Impressum, Kontakt, Datenschutz-Links hinzufügen  
**Datei:** `BottomNavigation.tsx` oder neue `InfoPanel.tsx`  
**Aufwand:** 1h

---

## 🟠 HOST DASHBOARD (Priorität: WICHTIG)

### #3: "Uploads prüfen" - Funktion unklar
**Problem:** User versteht nicht was diese Funktion macht  
**Lösung:** 
- Besseres Label: "Ausstehende Genehmigungen" oder "Moderation"
- Tooltip mit Erklärung
- Badge mit Anzahl wartender Uploads
**Aufwand:** 1h

### #9: Dashboard benutzerfreundlicher aufräumen
**Problem:** Dashboard ist überladen  
**Ideen:**
1. **Tabs statt Akkordeons:** "Übersicht | Einstellungen | Tools"
2. **Wichtigstes oben:** QR-Code, Event-Link, Statistiken
3. **Progressive Disclosure:** Erweiterte Optionen ausblenden
4. **Card-Layout:** Visuelle Gruppierung
**Aufwand:** 4-6h (größeres Redesign)

### #12: Statistiken demotivierend?
**Problem:** "23 Fotos" klingt nach "nur 23"  
**Lösung:**
```
Bei 0 Fotos:    "🚀 Bereit! Teile den QR-Code mit deinen Gästen"
Bei 1-10:       "🎉 Die ersten Fotos sind da! Toller Start!"
Bei 11-50:      "+12 heute" (Fokus auf Wachstum)
Bei 50+:        "📸 50+ Erinnerungen gesammelt!"
```
**Aufwand:** 1h

### #16: Event Profil doppelt
**Problem:** "Event Profil" und "Design" überschneiden sich  
**Lösung:** 
- Zusammenführen in "Event Design"
- Oder: Event Profil = Basis-Infos, Design = Visuals
**Aufwand:** 2h

---

## 🔵 EVENT WIZARD (Priorität: HOCH)

### #5: Schritt-für-Schritt Event-Erstellung
**Aktuell:** Ein langes Formular  
**Gewünscht:** Wizard mit Steps

**Vorgeschlagene Steps:**
```
Step 1: Event-Typ
  → Hochzeit, Geburtstag, Firmenfeier, Sonstiges
  → Automatische Alben-Vorschläge basierend auf Typ

Step 2: Basis-Infos
  → Titel, Datum, Uhrzeit
  → Passwort (optional)

Step 3: Alben einrichten
  → Vorgeschlagene Alben basierend auf Typ
  → Eigene hinzufügen

Step 4: Design wählen
  → Preset auswählen
  → Farben anpassen

Step 5: QR-Code
  → Fertig! QR-Code herunterladen
  → Link teilen
```
**Aufwand:** 6-8h

### #6: Karte wird nicht angezeigt
**Problem:** Bei Event-Erstellung fehlt Karten-Integration  
**Lösung:** Google Maps / OpenStreetMap Embed  
**Aufwand:** 2h

### #21: Keine Alben-Vorschläge
**Problem:** User muss alle Alben selbst erstellen  
**Lösung:** 
```typescript
const ALBUM_PRESETS = {
  wedding: ['Trauung', 'Empfang', 'Feier', 'Fotobooth'],
  birthday: ['Party', 'Geschenke', 'Kuchen', 'Gäste'],
  corporate: ['Keynote', 'Networking', 'Team', 'Afterparty'],
};
```
**Aufwand:** 2h

### #25: Keine Challenge-Vorlagen
**Problem:** User muss alle Challenges selbst erstellen  
**Lösung:**
```typescript
const CHALLENGE_PRESETS = {
  wedding: [
    'Foto mit dem Brautpaar',
    'Selfie auf der Tanzfläche',
    'Das beste Outfit',
  ],
  birthday: [
    'Glückwunsch-Selfie',
    'Geschenke-Auspacken',
  ],
};
```
**Aufwand:** 2h

### #26: "Challenge hinzufügen" → nur "+"
**Problem:** Text nimmt zu viel Platz  
**Lösung:** Nur Plus-Icon mit Tooltip  
**Aufwand:** 15 Min

### #27: Event-Modus Default
**Problem:** "Aktiv" und "Standard" immer angeklickt  
**Lösung:** Bessere Defaults + klare Erklärung  
**Aufwand:** 30 Min

---

## 🟣 PAKET-GATING (Priorität: HOCH)

### #10: Nicht enthaltene Funktionen ausgrauen
**Problem:** User sieht Features, die er nicht nutzen kann  
**Lösung:**
```tsx
<FeatureGate feature="faceSearch" showUpgrade>
  <FaceSearchButton />
</FeatureGate>
```
- Ausgegraut + Lock-Icon
- Tooltip: "Verfügbar ab Smart-Paket"
- Link zu Upgrade-Seite
**Aufwand:** 3h (Wrapper-Component + Integration)

### #13: Upgrade-Funktion verbessern
**Problem:** Upgrade-Flow nicht benutzerfreundlich  
**Lösung:**
- Vergleichstabelle der Pakete
- Klarer CTA "Jetzt upgraden"
- Was bekommt man zusätzlich?
**Aufwand:** 2h

---

## 🟡 EINLADUNGEN (Priorität: MITTEL)

### #14: Share-Link vs Event-URL
**Problem:** Unterschied unklar  
**Lösung:**
- Zusammenführen in "Event teilen"
- Dialog erklärt: QR-Code, Link, Social Share
**Aufwand:** 1h

### #15: Einladungsseite fehlt/verbessern
**Problem:** Digitale Einladungen funktionieren nicht  
**Lösung:** Komplettes Feature reviewen und fixen  
**Aufwand:** 4h

### #20: Einladungen für verschiedene Gruppen
**Problem:** Keine Separation für Freunde/Familie/Bekannte  
**Gewünscht:**
```
Event: Hochzeit
├── Album: Trauung → Einladung: Familie
├── Album: Essen → Einladung: Familie + Freunde
└── Album: Party → Einladung: Alle
```
**Lösung:** Einladungs-Gruppen mit Album-Zuordnung  
**Aufwand:** 6h (größeres Feature)

### #24: Smart Album Checkbox
**Problem:** Alben können sich überschneiden  
**Lösung:** 
- Checkbox "Exklusiv" (Foto nur in einem Album)
- Erklärung: "Fotos können in mehreren Alben erscheinen"
**Aufwand:** 2h

---

## 🟢 TOOLS & FEATURES (Priorität: MITTEL)

### #18: QR Aufsteller Fehler
**Problem:** Spezifischer Fehler beim QR-Tool  
**TODO:** Fehler reproduzieren und fixen  
**Aufwand:** 1-2h

### #19: Gäste-Tool verbessern
**Problem:** Import-Funktion fehlt  
**Lösung:** CSV/Kontakte-Import  
**Aufwand:** 3h

### #22: Lucide Icons bei Alben fehlen
**Problem:** Icons werden nicht angezeigt  
**Lösung:** Icon-Picker korrekt implementieren  
**Aufwand:** 1h

### #23: Album Mobile nicht bearbeitbar
**Problem:** Bearbeiten-Button fehlt auf Mobile  
**Lösung:** Touch-friendly Edit-Button  
**Aufwand:** 30 Min

### #28: Mystery Mode Erklärung fehlt
**Problem:** User versteht Feature nicht  
**Lösung:** Tooltip/Modal mit Erklärung  
**Aufwand:** 30 Min

### #29: Auswahlfunktion bei Videos fehlt
**Problem:** Fotos haben Auswahl, Videos nicht  
**Lösung:** Gleiche UI für Videos  
**Aufwand:** 1h

### #30: Sprachnachrichten deaktivierbar
**Problem:** Auf Partys ist es laut  
**Lösung:**
- Checkbox in Event-Einstellungen
- Default: Deaktiviert
- Hinweis: "Auf lauten Events empfohlen"
**Aufwand:** 1h

### #31: Eigene Presets erstellen
**Problem:** Nur vordefinierte Presets  
**Lösung:** "Preset speichern" Button  
**Aufwand:** 2h

### #32: Farben unübersichtlich
**Problem:** Unterschied zwischen Farb-Optionen unklar  
**Lösung:**
- Live-Preview
- Automatische Anpassung bei Preset-Wahl
- Bessere Labels
**Aufwand:** 2h

### #33: Titelbild ohne Einfluss auf Gästeseite
**Problem:** Design-Änderungen nicht sichtbar  
**Lösung:** Bug fixen - Titelbild korrekt laden  
**Aufwand:** 1h

---

## 📋 EMPFOHLENE REIHENFOLGE

### Phase 1: Kritische Bugs (2h)
1. #37 Challenges Vollbild
2. #38 Info erweitern

### Phase 2: Quick Wins (3h)
3. #3 Uploads prüfen Label
4. #12 Statistiken motivierend
5. #26 Plus-Button
6. #28 Mystery Mode Erklärung

### Phase 3: Paket-Gating (4h)
7. #10 Features ausgrauen
8. #13 Upgrade verbessern

### Phase 4: Event Wizard (8h)
9. #5 Step-by-Step Wizard
10. #21 Album-Vorschläge
11. #25 Challenge-Vorlagen

### Phase 5: Dashboard Redesign (6h)
12. #9 Dashboard aufräumen
13. #16 Event Profil zusammenführen

### Phase 6: Einladungen (6h)
14. #15 Einladungsseite
15. #20 Gruppen-Einladungen
16. #14 Share-Link

### Phase 7: Restliche Tools (6h)
17. Alle übrigen Punkte

---

## Fragen an Product Owner

1. **Dashboard Redesign (#9):** Tabs oder Akkordeons? Cards oder Listen?
2. **Event Wizard (#5):** Welche Steps sind Pflicht vs. Optional?
3. **Einladungen (#20):** Wie komplex soll die Gruppen-Logik sein?
4. **Statistiken (#12):** Ganz entfernen oder motivierend umformulieren?

---

**Letzte Aktualisierung:** 2026-01-11 13:45  
**Nächster Review:** Nach Phase 1
