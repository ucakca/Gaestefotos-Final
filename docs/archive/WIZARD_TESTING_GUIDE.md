# Event Wizard - Testing Guide

**Für:** User Testing & QA  
**Erstellt:** 2026-01-11  
**Status:** Ready for Testing

---

## 🚀 Quick Start

### 1. Server starten

**Terminal 1 - Backend:**
```bash
cd /root/gaestefotos-app-v2/packages/backend
pnpm dev
```

**Terminal 2 - Frontend:**
```bash
cd /root/gaestefotos-app-v2/packages/frontend
pnpm dev
```

**Zugriff:**
- Frontend: `https://app.gästefotos.com` (oder Staging-URL)
- Backend: `https://api.gästefotos.com`

---

## 📋 Test-Szenarien

### ✅ Szenario 1: Quick-Finish (Steps 1-5)

**Ziel:** Event mit Minimalaufwand erstellen

**Steps:**
1. **Step 1 - Event-Typ:**
   - Wähle "Hochzeit"
   - ✓ Icon und Farbe korrekt?
   - Wähle Subtyp "Kirchlich"
   - Klicke "Weiter"

2. **Step 2 - Basis-Info:**
   - Name: "Maria & Thomas"
   - Datum: Heute + 30 Tage
   - Uhrzeit: 14:00
   - Ort: "Schloss Neuschwanstein"
   - ✓ Datum-Picker funktioniert?
   - Klicke "Weiter"

3. **Step 3 - Design:**
   - Wähle Color Scheme: "Romantic"
   - Upload Cover-Bild (max 10MB)
   - ✓ Shimmer-Animation erscheint?
   - ✓ Preview aktualisiert sich?
   - Klicke "Weiter"

4. **Step 4 - Alben:**
   - ✓ "Unsere Geschichte" zeigt Hint-Text?
   - Wähle 3 Alben aus
   - ✓ Counter zeigt "Weiter (3 Alben)"?
   - Klicke "Weiter"

5. **Step 5 - Zugang:**
   - Password: "test1234"
   - Wähle "Sofort sichtbar"
   - ✓ Primary Button prominent?
   - Klicke "🚀 Event jetzt erstellen"

**Erwartetes Ergebnis:**
- Redirect zu `/events/{id}/dashboard?created=true`
- Event existiert in Datenbank
- Cover-Bild ist hochgeladen
- 3 Alben (Categories) sind erstellt
- Password ist gesetzt (bcrypt-Hash)

---

### ✅ Szenario 2: Extended Mode (Steps 1-9)

**Ziel:** Alle Features testen

**Steps 1-5:** Wie Szenario 1

**Step 5 (Alternative):**
- Klicke "⚙️ Erweiterte Features einrichten"

**Step 6 - Challenges:**
- ✓ Vorschläge basieren auf Event-Typ?
- Aktiviere 3 Challenges
- Füge Custom-Challenge hinzu: "Wildestes Gruppenbild"
- Klicke "Weiter"

**Step 7 - Gästebuch:**
- Aktiviere Gästebuch
- Message: "Hinterlasst uns eine schöne Nachricht!"
- ✓ Checkbox für Voice Messages?
- Klicke "Weiter"

**Step 8 - Co-Hosts:**
- Email 1: "test1@example.com"
- Email 2: "test2@example.com"
- ✓ "Jederzeit entfernbar"-Text sichtbar?
- Klicke "Weiter"

**Step 9 - Zusammenfassung:**
- ✓ Alle Daten korrekt angezeigt?
- ✓ Anzahl Alben/Challenges korrekt?
- Klicke "Event erstellen"

**Erwartetes Ergebnis:**
- Event mit Challenges erstellt
- Gästebuch aktiviert + Message gespeichert
- Co-Host Emails geloggt (Email-Service fehlt noch)

---

### ✅ Szenario 3: Edge Cases

#### 3.1 Ohne Bilder
- Steps 1-5 durchlaufen
- **KEIN** Cover/Profile Bild hochladen
- ✓ Event wird trotzdem erstellt?

#### 3.2 Mystery Mode
- Step 5: Wähle "Mystery-Modus"
- Event erstellen
- ✓ `featuresConfig.mysteryMode = true` in DB?

#### 3.3 Moderated Mode
- Step 5: Wähle "Mit Moderation"
- Event erstellen
- ✓ `featuresConfig.moderationRequired = true` in DB?

#### 3.4 Ohne Challenges
- Extended Mode aktivieren
- Step 6: ALLE Challenges deaktivieren
- ✓ Wizard erlaubt Weiter?

#### 3.5 Host-Only Album
- Step 4: Aktiviere "Unsere Geschichte"
- Event erstellen
- ✓ Category hat `uploadLocked = true` in DB?

---

## 🔍 Validierung in der Datenbank

Nach Event-Erstellung prüfen:

```sql
-- Event-Daten
SELECT 
  id, title, slug, password, 
  "designConfig"->>'colorScheme' as color_scheme,
  "featuresConfig"->>'mysteryMode' as mystery_mode,
  "featuresConfig"->>'moderationRequired' as moderated,
  "guestbookHostMessage"
FROM events 
WHERE title = 'Maria & Thomas';

-- Alben (Categories)
SELECT name, "order", "isVisible", "uploadLocked"
FROM categories 
WHERE "eventId" = 'EVENT_ID_HIER';

-- Challenges
SELECT title, "order", "isActive"
FROM challenges 
WHERE "eventId" = 'EVENT_ID_HIER';

-- Bilder
SELECT "designConfig"->>'coverImage', "designConfig"->>'profileImage'
FROM events
WHERE id = 'EVENT_ID_HIER';
```

---

## ❌ Error-Handling Tests

### Test 1: Fehlende Pflichtfelder
- Step 2: Lass "Name" leer
- Versuche "Weiter" zu klicken
- ✓ Error-Message erscheint?
- ✓ "Bitte gib einen Event-Namen ein"?

### Test 2: Keine Alben
- Step 4: Deaktiviere ALLE Alben
- Versuche "Weiter" zu klicken
- ✓ Error: "Bitte wähle mindestens ein Album aus"?

### Test 3: Upload-Fehler
- Step 3: Upload zu große Datei (>50MB)
- ✓ Error-Message sichtbar?
- ✓ Fehlermeldung verständlich?

### Test 4: Backend-Fehler
- Backend stoppen
- Event erstellen versuchen
- ✓ Error-Display zeigt Netzwerkfehler?
- ✓ User kann Error wegklicken?

---

## 🎨 UX-Features validieren

### Magic Moment (Step 3)
- Upload Cover-Bild
- ✓ Shimmer-Animation für ~0.6s sichtbar?
- ✓ Bild erscheint in Mobile Preview?

### Inhalts-Versprechen (Step 4)
- Hover über "Unsere Geschichte"
- ✓ Hint-Text erscheint?
- ✓ Text: "Perfekt für Kinderfotos oder Verlobungsbilder vorab"?

### Button-Gewichtung (Step 5)
- ✓ "Event jetzt erstellen" = Primary (prominent)?
- ✓ "Erweiterte Features" = Secondary (dezent)?

### Angst-Prävention (Step 8)
- ✓ Text "Jederzeit entfernbar" sichtbar?
- ✓ Beruhigend formuliert?

---

## 📱 Mobile Testing

**Geräte:** iPhone, Android, Tablet

### Responsive Checks
- ✓ Wizard auf Smartphone bedienbar?
- ✓ Image-Upload funktioniert?
- ✓ Datum-Picker mobile-optimiert?
- ✓ Progress-Bar sichtbar?
- ✓ Buttons nicht zu klein?

### Touch Interaction
- ✓ Event-Typ Cards klickbar?
- ✓ Color-Scheme Pills groß genug?
- ✓ Checkboxen einfach tippbar?

---

## 🐛 Bekannte Limitationen

### Co-Host Emails
**Status:** Placeholder implementiert  
**Verhalten:** Emails werden geloggt, aber nicht versendet  
**Log Check:**
```bash
grep "Co-host invitations" /root/gaestefotos-app-v2/packages/backend/logs/*.log
```

### Image Compression
**Status:** Keine automatische Kompression  
**Workaround:** User muss Bilder vorher komprimieren  
**Limit:** 50MB (Nginx + Multer)

---

## 📊 Performance-Tests

### Upload-Geschwindigkeit
- 5MB Bild: < 5 Sekunden
- 20MB Bild: < 15 Sekunden
- ✓ Progress-Indicator sichtbar?

### Response-Zeit
- Event-Creation: < 3 Sekunden
- Redirect: < 1 Sekunde

---

## ✅ Abnahme-Checkliste

### Funktional
- [ ] Quick-Finish (Steps 1-5) funktioniert
- [ ] Extended Mode (Steps 1-9) funktioniert
- [ ] Bilder werden hochgeladen
- [ ] Alben werden korrekt erstellt
- [ ] Challenges werden korrekt erstellt
- [ ] Password wird gehasht
- [ ] Visibility Mode korrekt gemappt
- [ ] Color Scheme wird gespeichert
- [ ] Guestbook Config gespeichert

### UX
- [ ] Shimmer-Animation bei Upload
- [ ] Hint-Text bei Host-Only Album
- [ ] Button-Gewichtung korrekt
- [ ] Angst-Prävention bei Co-Hosts
- [ ] Error-Messages verständlich
- [ ] Progress-Feedback vorhanden

### Performance
- [ ] Kein UI-Freeze beim Upload
- [ ] Schnelle Navigation zwischen Steps
- [ ] Responsive auf Mobile

### Edge Cases
- [ ] Event ohne Bilder erstellt
- [ ] Event ohne Challenges
- [ ] Alle Visibility Modes getestet
- [ ] Error Handling funktioniert

---

## 🚨 Bug-Reporting

**Format:**
```
Titel: [Kurze Beschreibung]
Steps: [1. ... 2. ... 3. ...]
Expected: [Was sollte passieren]
Actual: [Was passiert tatsächlich]
Browser: [Chrome/Firefox/Safari + Version]
Screenshots: [Optional]
```

**Log-Dateien:**
```bash
# Frontend Logs
tail -f /root/gaestefotos-app-v2/packages/frontend/.next/trace

# Backend Logs
tail -f /root/gaestefotos-app-v2/packages/backend/logs/app.log
```

---

## 🎉 Testing-Status

**Getestet von:** _________  
**Datum:** _________  
**Status:** ⏳ In Progress | ✅ Passed | ❌ Failed  
**Notizen:** 

---

**Bei Problemen:** Logs prüfen und Bug-Report erstellen!
