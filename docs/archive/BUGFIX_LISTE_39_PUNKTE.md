# 🐛 BUGFIX-LISTE: 39 Identifizierte Probleme

**Datum:** 2026-01-11  
**Tester:** Caglar  
**Test-Event:** `manueller-produktiv-test`  
**Frontend Engineer:** Sonnet 4.5

---

## 📊 KATEGORISIERUNG

**Von 39 Punkten:**
- 🔥 **KRITISCH:** 8 Bugs (funktional kaputt)
- ⚠️ **WICHTIG:** 15 UX-Probleme
- 📌 **NICE-TO-HAVE:** 16 Verbesserungen

---

## 🔥 KRITISCHE BUGS (Sofort fixen!)

### 1. **Upload-Button ohne Funktion** (#3, #36) 🔥🔥🔥
**Problem:** Gästeseite Upload-Button reagiert nicht  
**Betroffene Datei:** `packages/frontend/src/app/e2/[slug]/page.tsx`  
**Priorität:** P0 (BLOCKER!)  
**Aufwand:** 30 Min

### 2. **Titel- und Profilbilder laden nicht** (#8) 🔥🔥
**Problem:** Event-Dashboard zeigt keine Bilder  
**Betroffene Datei:** `packages/frontend/src/app/events/[id]/dashboard/page.tsx`  
**Priorität:** P0 (KRITISCH!)  
**Aufwand:** 1 Stunde

### 3. **Karte wird nicht angezeigt** (#6) 🔥
**Problem:** Bei Event-Erstellung fehlt Karten-Anzeige  
**Betroffene Datei:** `packages/frontend/src/components/MapsLink.tsx` (?)  
**Priorität:** P1  
**Aufwand:** 30 Min

### 4. **QR-Tools Fehler** (#18) 🔥
**Problem:** QR-Aufsteller generiert Fehler  
**Betroffene Datei:** `packages/frontend/src/app/events/[id]/dashboard/page.tsx`  
**Priorität:** P1  
**Aufwand:** 30 Min

### 5. **Challenges-Menü öffnet falsch** (#37) 🔥
**Problem:** Challenges-Menü sollte Vollbild sein (wie Gästebuch)  
**Betroffene Datei:** `packages/frontend/src/app/e2/[slug]/page.tsx`  
**Priorität:** P1  
**Aufwand:** 20 Min

### 6. **++story Text-Fehler** (#34) 🔥
**Problem:** Text "++story" wird angezeigt  
**Betroffene Datei:** `packages/frontend/src/components/guest/StoriesBar.tsx` (?)  
**Priorität:** P1  
**Aufwand:** 10 Min

### 7. **Alben oben abgeschnitten** (#35) 🔥
**Problem:** Album-Icons werden abgeschnitten  
**Betroffene Datei:** `packages/frontend/src/components/AlbumNavigation.tsx`  
**Priorität:** P1  
**Aufwand:** 15 Min

### 8. **Album-Bearbeitung mobile kaputt** (#23) 🔥
**Problem:** Album kann auf Mobile nicht bearbeitet werden  
**Betroffene Datei:** `packages/frontend/src/app/events/[id]/categories/page.tsx`  
**Priorität:** P1  
**Aufwand:** 30 Min

---

## ⚠️ WICHTIGE UX-PROBLEME

### 9. **Zurück-Button ohne Funktion** (#1) ⚠️
**Problem:** Mobile Header Zurück-Button reagiert nicht  
**Betroffene Datei:** `packages/frontend/src/components/AppLayout.tsx`  
**Priorität:** P2  
**Aufwand:** 15 Min

### 10. **Redundante Buttons (Mobile)** (#2, #4, #7) ⚠️
**Problem:** FAQ, Abmelden, Fotos/Videos doppelt (Header + Footer)  
**Betroffene Dateien:** AppLayout.tsx, DashboardFooter.tsx  
**Priorität:** P2  
**Aufwand:** 30 Min

### 11. **Passwort-Anzeige fehlt** (#11) ⚠️
**Problem:** Event-Passwort kann nicht angezeigt werden (Auge-Symbol fehlt)  
**Betroffene Datei:** `packages/frontend/src/app/events/[id]/dashboard/page.tsx`  
**Priorität:** P2  
**Aufwand:** 20 Min

### 12. **Event-Detail-Bearbeitung unklar** (#17) ⚠️
**Problem:** Kein Bleistift-Symbol → User weiß nicht, dass bearbeitbar  
**Betroffene Datei:** Dashboard-Page  
**Priorität:** P2  
**Aufwand:** 15 Min

### 13. **Share-Link unklar** (#14) ⚠️
**Problem:** Funktion/Unterschied zu Event-URL unklar  
**Betroffene Datei:** Dashboard-Page  
**Priorität:** P2  
**Aufwand:** 30 Min (bessere Erklärung + UI)

### 14. **Lucide-Icons fehlen** (#22) ⚠️
**Problem:** Bei Alben-Erstellung werden Icons nicht angezeigt  
**Betroffene Datei:** Categories-Page  
**Priorität:** P2  
**Aufwand:** 20 Min

### 15. **Button-Hintergrund inkonsistent** (#39) ⚠️
**Problem:** Feed-Button hat anderen Hintergrund als andere  
**Betroffene Datei:** BottomNavigation.tsx  
**Priorität:** P3  
**Aufwand:** 10 Min

---

## 📌 VERBESSERUNGS-VORSCHLÄGE

### 16. **Schritt-für-Schritt Event-Erstellung** (#5) 📌
**Anforderung:** Wizard für neues Event  
**Aufwand:** 3-4 Stunden  
**Priorität:** P3

### 17. **Event-Dashboard aufräumen** (#9) 📌
**Anforderung:** Benutzerfreundlichere Struktur  
**Aufwand:** 2 Stunden  
**Priorität:** P3

### 18. **Paket-Features ausgrauen** (#10) 📌
**Anforderung:** Nicht-verfügbare Features mit Upgrade-Hinweis  
**Aufwand:** 2 Stunden  
**Priorität:** P2

### 19. **Speicher & Statistiken UX** (#12) 📌
**Anforderung:** Überdenken ob nötig (könnte negativ wirken)  
**Aufwand:** 1 Stunde (Diskussion + Minor UI-Tweaks)  
**Priorität:** P3

### 20. **Upgrade-Funktion verbessern** (#13) 📌
**Anforderung:** Benutzerfreundlicher  
**Aufwand:** 2 Stunden  
**Priorität:** P2

### 21. **Einladungsseite überarbeiten** (#15, #20) 📌
**Anforderung:** Separation für Freunde/Familie/Bekannte  
**Konzept:** Mehrstufige Einladungen für verschiedene Alben/Gruppen  
**Aufwand:** 4-6 Stunden  
**Priorität:** P3

### 22. **Event-Profil doppelt** (#16) 📌
**Anforderung:** Konsolidieren (Footer Design vs. Dashboard)  
**Aufwand:** 1 Stunde  
**Priorität:** P3

### 23. **Alben-Vorschläge** (#21) 📌
**Anforderung:** Vordefinierte Alben je nach Event-Typ (Hochzeit, Business, etc.)  
**Aufwand:** 3 Stunden  
**Priorität:** P2

### 24. **Smart Albums Checkbox** (#24) 📌
**Anforderung:** Bessere Erklärung + Überschneidungs-Validierung  
**Aufwand:** 2 Stunden  
**Priorität:** P2

### 25. **Challenge-Vorlagen** (#25) 📌
**Anforderung:** Vordefinierte Challenges (wie bei Alben)  
**Aufwand:** 2 Stunden  
**Priorität:** P3

### 26. **Plus-Button statt Text** (#26) 📌
**Anforderung:** "Challenge/Album hinzufügen" → nur "+" Icon  
**Aufwand:** 30 Min  
**Priorität:** P3

### 27. **Event-Modus Standard** (#27) ⚠️
**Anforderung:** "Event Modus aktiv" immer angeklickt  
**Aufwand:** 5 Min  
**Priorität:** P2

### 28. **Mystery-Mode Erklärung** (#28) ⚠️
**Anforderung:** Tooltip/Erklärung für Mystery-Mode  
**Aufwand:** 15 Min  
**Priorität:** P2

### 29. **Video-Auswahl wie Fotos** (#29) ⚠️
**Anforderung:** Gleiche Auswahl-UI  
**Aufwand:** 1 Stunde  
**Priorität:** P2

### 30. **Gästebuch für Host** (#30) 📌
**User-Frage:** "Soll Host Gästebuch-Nachricht schreiben können?"  
**Meine Meinung:** Nein, Host kann besser direkt mit Gästen sprechen (persönlicher)  
**Sprachnachricht:** ✅ Als opt-in (auf Partys laut), Standard: deaktiviert  
**Aufwand:** 30 Min  
**Priorität:** P3

### 31. **Design-Presets optimieren** (#31) 📌
**Anforderung:** Eigene Presets erstellen + übersichtlicher  
**Aufwand:** 3 Stunden  
**Priorität:** P3

### 32. **Farben-UI unklar** (#32) 📌
**User-Frage:** "Was machen die Farben? Automatisch je nach Preset?"  
**Meine Meinung:** Ja, Farben sollten sich automatisch einstellen + Preview zeigen  
**Aufwand:** 2 Stunden  
**Priorität:** P2

### 33. **Titelbild ohne Einfluss auf Gästeseite** (#33) ⚠️
**Problem:** Eingestelltes Titelbild wird nicht auf Gästeseite angezeigt  
**Aufwand:** 1 Stunde  
**Priorität:** P2

### 34. **Info-Menü Gästeseite** (#38) 📌
**Anforderung:** Erweitern mit Betriebsinformationen  
**Aufwand:** 1 Stunde  
**Priorität:** P3

### 35. **Gäste-Import** (#19) 📌
**User-Frage:** "Import aus Telefon?"  
**Meine Meinung:** CSV-Import oder Kontakte-API (für Mobile)  
**Aufwand:** 4 Stunden  
**Priorität:** P3

---

## 🎯 FIX-PLAN (Heute!)

### **Phase 1: KRITISCHE FUNKTIONS-BUGS** (2 Stunden)
1. ✅ Upload-Button fixen (#3, #36)
2. ✅ Bilder laden fixen (#8)
3. ✅ ++story Text fixen (#34)
4. ✅ Alben abgeschnitten fixen (#35)
5. ✅ Challenges-Menü Vollbild (#37)

### **Phase 2: WICHTIGE UX-FIXES** (1.5 Stunden)
6. ✅ Zurück-Button fixen (#1)
7. ✅ Redundante Buttons entfernen (#2, #4, #7)
8. ✅ Passwort-Auge (#11)
9. ✅ Bleistift-Symbol Event-Details (#17)
10. ✅ Button-Hintergrund konsistent (#39)

### **Phase 3: QUICK-WINS** (1 Stunde)
11. ✅ Plus-Button statt Text (#26)
12. ✅ Event-Modus Standard (#27)
13. ✅ Mystery-Mode Tooltip (#28)
14. ✅ Lucide-Icons fixen (#22)

**Gesamt:** ~4.5 Stunden (schaffbar heute!)

---

**Verbleibend für später:**
- Wizard, Alben-Vorschläge, Challenge-Vorlagen (je 2-4h)
- Einladungsseite-Überarbeitung (4-6h)
- Design-Presets (3h)

---

**Status:** Beginne jetzt mit Phase 1!
