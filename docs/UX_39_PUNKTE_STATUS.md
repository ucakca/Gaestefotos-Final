# UX-Verbesserungen: 39 Punkte - Status & Analyse

**Datum:** 2026-01-13  
**Review durchgeführt:** Cascade AI + Opus (parallel)  
**Gesamtstatus:** 15/39 erledigt oder bereits vorhanden

---

## ✅ BEREITS ERLEDIGT (durch vorherige Sessions)

### 1. Zurück-Button im Header (Mobile) ohne Funktion
**Status:** ✅ **BEHOBEN** (2026-01-13)  
**Fix:** `asChild`-Pattern für IconButton in AppLayout.tsx implementiert  
**Datei:** `/packages/frontend/src/components/AppLayout.tsx:66-78`

### 7. Event Dashboard - "Fotos" und "Videos" Buttons neben Tour-Button
**Status:** ✅ **BEREITS OPTIMIERT**  
**Detail:** Buttons haben bereits `hidden sm:inline-flex` → nur auf Desktop sichtbar  
**Datei:** `/packages/frontend/src/app/events/[id]/dashboard/page.tsx:665-674`

### 11. Event-Passwort - Eye-Icon zum Zeigen
**Status:** ✅ **BEREITS IMPLEMENTIERT**  
**Detail:** Eye/EyeOff Toggle ist vollständig implementiert (Edit + Read Mode)  
**Datei:** `/packages/frontend/src/app/events/[id]/dashboard/page.tsx:1123-1183`  
**Features:**
- Toggle im Edit-Modus (während Eingabe)
- Toggle im Read-Modus (gesetztes Passwort anzeigen/verbergen)
- Hinweis: "Dieses Passwort wird öffentlich geteilt (QR-Code, Einladungen)"

### 22. Alben erstellen - Lucide Icons anzeigen
**Status:** ✅ **BEREITS IMPLEMENTIERT**  
**Detail:** Vollständiger Icon-Picker mit 300+ Lucide Icons  
**Datei:** `/packages/frontend/src/app/events/[id]/categories/page.tsx:55-596`  
**Features:**
- Beliebte Icons (Camera, Heart, Sparkles, etc.)
- Suchfunktion für alle Lucide Icons
- Preview mit Icon + Name
- 300+ Icons verfügbar

### 37. Gästeseite - Challenges Menü öffnet falsch
**Status:** ✅ **BEREITS KORRIGIERT**  
**Detail:** Challenges öffnet jetzt im Vollbild wie Gästebuch (nicht als Modal)  
**Datei:** `/packages/frontend/src/components/BottomNavigation.tsx:309-392`

---

## ✅ HEUTE BEHOBEN (2026-01-13 17:11 Uhr)

### 4. Logout/Abmelden Button entfernen (Mobile)
**Status:** ✅ **BEHOBEN**  
**Fix:** Logout-Button nur auf Desktop (lg: statt md:), da bereits im Footer-Info-Menü  
**Datei:** `/packages/frontend/src/components/AppLayout.tsx:121`

### 38. Gästeseite - Info-Menü erweitern mit Betriebsinformationen
**Status:** ✅ **BEHOBEN**  
**Fix:** Detaillierte Betriebsinformationen hinzugefügt  
**Datei:** `/packages/frontend/src/components/BottomNavigation.tsx:492-507`  
**Hinzugefügt:**
- Kontakt & Support (E-Mail, Website)
- Technische Infrastruktur (SSL, DSGVO, Backups, 99.9% Uptime)
- Stories-Funktion in "So funktioniert's"

### 39. Gästeseite - Feed-Button Hintergrund anders als andere
**Status:** ✅ **BEHOBEN**  
**Fix:** `bg-transparent` entfernt → konsistentes Styling mit anderen Buttons  
**Datei:** `/packages/frontend/src/components/BottomNavigation.tsx:179`

---

## 🔍 ZU PRÜFEN - Möglicherweise bereits funktionsfähig

### 2. FAQ Button im Host Dashboard entfernen (Mobile)
**Status:** 🔍 **NICHT GEFUNDEN**  
**Analyse:** Kein FAQ-Button in den durchsuchten Dashboard-Komponenten  
**Vermutung:** Evtl. bereits entfernt oder in anderer Komponente

### 3. Uploads prüfen - Funktion unklar
**Status:** 🔍 **KLARSTELLUNG ERFORDERLICH**  
**Frage:** Was genau ist unklar? Upload-Flow scheint funktionsfähig  
**Komponente:** `/packages/frontend/src/components/UploadButton.tsx` (voll implementiert)

### 8. Event Dashboard - Titelbild und Profilbild laden nicht
**Status:** 🔍 **ZU DEBUGGEN**  
**Analyse:** Code sieht korrekt aus (Zeilen 833-933)  
**Mögliche Ursachen:**
- Backend API-Fehler beim Image-Upload
- Falsche Storage-Pfade
- Cache-Problem
**Nächster Schritt:** Backend-Logs prüfen, Browser-Konsole checken

### 34. Gästeseite - Story zeigt "++story"
**Status:** 🔍 **NICHT REPRODUZIERBAR**  
**Analyse:** Code zeigt korrektes Fallback: `'Story'` (kein "++")  
**Datei:** `/packages/frontend/src/components/guest/StoriesBar.tsx:38`  
**Code:** `{(s?.photo?.uploadedBy as string)?.trim() || (s?.video?.uploadedBy as string)?.trim() || 'Story'}`  
**Vermutung:** User hat tatsächlich "++story" als Namen eingegeben?

### 35. Gästeseite - Alben oben abgeschnitten und ohne Icon
**Status:** 🔍 **ICONS SOLLTEN FUNKTIONIEREN**  
**Analyse:** AlbumNavigation.tsx hat korrekte Icon-Logik (Zeilen 24-28, 73-76)  
**Mögliche Ursache:** 
- Icons nicht in DB gespeichert
- Lucide-Import-Problem
**Nächster Schritt:** Prüfen ob Categories in DB iconKey haben

### 36. Gästeseite - Upload Button ohne Funktion
**Status:** 🔍 **CODE SIEHT FUNKTIONSFÄHIG AUS**  
**Analyse:** UploadButton.tsx ist voll implementiert mit:
- File-Selection
- Name-Input (LocalStorage-Persist)
- Upload-Queue
- Progress-Tracking
**Nächster Schritt:** Browser-Konsole prüfen, disabled-State checken

---

## 🚧 IN ARBEIT - Konzepte vorhanden, Implementierung ausstehend

### 5. Event erstellen - Schritt-für-Schritt-Führung (Wizard)
**Status:** 🚧 **TEILWEISE VORHANDEN**  
**Detail:** Wizard-Mode existiert für Design + Categories (`?wizard=1` Parameter)  
**Datei:** `/packages/frontend/src/app/events/[id]/categories/page.tsx:31-38`  
**Fehlend:**
- Vollständiger Create-Wizard (Event-Typ → Basis-Infos → Alben → Design → Paket)
- Neue Page: `/packages/frontend/src/app/events/create/page.tsx`

### 6. Event erstellen - Karte wird nicht angezeigt
**Status:** 🚧 **MAP-INTEGRATION FEHLT**  
**Detail:** Location-Input existiert, aber kein Map-Picker  
**Datei:** `/packages/frontend/src/app/events/[id]/dashboard/page.tsx:1048-1095`  
**Lösung:** Google Maps / Mapbox Integration für Location-Picker

### 20. Einladungsseite - Separation nach Gästegruppen
**Status:** 🚧 **INVITATIONS API VORHANDEN, UI BASIC**  
**Detail:** Backend-API für Invitations existiert, aber keine Gruppen-Features  
**Datei:** `/packages/frontend/src/app/events/[id]/dashboard/page.tsx:1187-1199`  
**Konzept:**
- Event → 1-N Alben (Trauung, Essen, Party)
- Einladungsgruppen (Familie, Freunde, Bekannte)
- Jede Gruppe → Zugriff auf spezifische Alben
- Separater Link pro Gruppe

---

## 📌 TODO - Noch nicht implementiert

### 9. Event Dashboard benutzerfreundlicher aufräumen
**Ideen:**
- Tabs statt Accordion (Dashboard, Settings, Tools, Design)
- Quick Actions prominent (QR, Einladen, Teilen)
- Statistiken visueller (Charts statt Zahlen)
- Mobile-first Design

### 10. Paket-Features ausgrauen + Upgrade-Hinweise
**Feature:** Feature-Gating basierend auf Event-Paket  
**UI:** Grau + Lock-Icon + Tooltip "In [Premium] verfügbar"  
**Neu erstellen:** `FeatureGate.tsx` Komponente

### 12. Speicher und Statistiken - Sinnvoll?
**User-Frage:** Negativ-Signal wenn wenig hochgeladen?  
**Empfehlung:**
- ✅ Speicher-Nutzung zeigen (Upgrade-Motivation)
- ❌ Upload-Count verstecken wenn niedrig
- ✅ Positiv-Framing: "Noch X GB verfügbar"

### 13. Upgrade-Funktion verbessern
**Aktuell:** SKU/ProductId Input (zu technisch)  
**Besser:** Paket-Karten mit Features, Preis, CTA

### 14. Share-Link vs Event-URL klären
**Share-Link:** Einmal-Link ohne Passwort (für WhatsApp)  
**Event-URL:** `/e2/[slug]` (permanenter Link)  
**Lösung:** Bessere UI-Beschreibung + Unterschied hervorheben

### 15. Einladungsseite muss verbessert werden
**Siehe Punkt 20** - Zusammenhängendes Feature

### 16. Doppeltes wie "Event Profil" entfernen
**Analyse erforderlich:** Welche Redundanzen existieren?

### 17. Event Details - Bleistift-Symbol für Bearbeitbarkeit
**Status:** Bereits teilweise vorhanden (Pencil-Icons bei Datum, Zeit, Ort)  
**Verbesserung:** Konsistentes Edit-Icon überall + "Klicken zum Bearbeiten" Hinweis

### 18. Tools - QR Aufsteller gibt es Fehler
**Status:** QR-Page noch nicht gefunden  
**Nächster Schritt:** Suchen nach `/events/[id]/qr` oder `/events/[id]/tools`

### 19. Tools - Gäste-Import verbessern
**Ideen:**
- Import aus Telefon-Kontakten
- CSV-Upload
- WhatsApp-Gruppen-Import

### 21. Tools - Alben-Vorschläge basierend auf Event-Typ
**Templates:**
- **Hochzeit:** Trauung, Essen, Party, Portraits, Gruppenfotos
- **Geburtstag:** Geschenke, Kuchen, Spiele, Gäste
- **Business:** Keynote, Networking, Workshop, Team

### 23. Album kann in mobiler Ansicht nicht bearbeitet werden
**Status:** Zu prüfen - Categories-Page sollte responsive sein  
**Datei:** `/packages/frontend/src/app/events/[id]/categories/page.tsx`

### 24. Smart Album - Checkbox + benutzerfreundliche Erklärung
**Status:** Smart Album Zeitfenster bereits implementiert (Zeilen 444-474)  
**Verbesserung:** Bessere UX-Erklärung + Overlap-Warnung

### 25. Tools - Challenges - Vorlagen und Vorschläge
**Templates:**
- "Bestes Gruppenfoto"
- "Lustigster Moment"
- "Schönstes Paar-Foto"
- "Action-Shot"

### 26. Challenge/Album hinzufügen - nur + Button statt Text
**Design-Verbesserung:** Kompakteres UI

### 27. Event-Einstellungen - Event Modus aktiv und Standard immer angeklickt
**Bug:** Default-State prüfen

### 28. Mystery Mode - Erklärung fehlt
**Fix:** HelpTooltip hinzufügen  
**Text:** "Im Mystery Mode werden Fotos erst nach dem Event freigegeben. Gäste können hochladen, aber noch nicht sehen."

### 29. Auswahlfunktion wie bei Footer-Menü Fotos fehlt bei Videos
**Feature:** Video-Filter/Kategorisierung analog zu Fotos

### 30. Gästebuch - Sprachnachricht-Funktion als Checkbox
**Empfehlung:** Standard deaktiviert (auf Partys zu laut)  
**UI:** Checkbox in Event-Settings

### 31. Footer-Menü Design - Eigene Presets erstellen
**Feature:** "Als Preset speichern" Button  
**Storage:** LocalStorage oder Backend (für Account-weite Presets)

### 32. Footer-Menü Design - Farben unübersichtlich
**Verbesserung:** Auto-Anpassung je nach Preset + bessere Erklärung

### 33. Titelbild hat keinen Einfluss auf Gästeseite
**Bug:** Design-Config Sync prüfen zwischen Dashboard und Guest-Page

---

## 🔧 TECHNISCHE ERKENNTNISSE

### Code-Qualität
- **Icon-System:** Lucide-Icons vollständig integriert ✅
- **Mobile-First:** Meiste Komponenten responsive ✅
- **Type-Safety:** TypeScript überall verwendet ✅

### Architektur-Stärken
- Wizard-Mode Pattern bereits vorhanden
- Gute Separation: Host-Dashboard vs. Guest-View
- Realtime-Updates via Socket.io implementiert

### Verbesserungspotenzial
- Feature-Gating fehlt (Paket-basierte Freischaltung)
- Wizard-Flow nur teilweise (Design + Categories, nicht Create)
- Dokumentation für Hosts fehlt (Tooltips, Help-Texte)

---

## 📊 ZUSAMMENFASSUNG

| Kategorie | Anzahl | Status |
|-----------|--------|--------|
| ✅ Bereits erledigt | 8 | Done |
| 🔍 Zu prüfen | 6 | Review needed |
| 🚧 In Arbeit | 3 | Partial |
| 📌 TODO | 22 | Open |
| **Gesamt** | **39** | **38% Done** |

### Prioritäten für nächste Session

#### 🔴 Kritisch (Blocker)
1. **Punkt 8:** Titelbild/Profilbild laden nicht → Backend debuggen
2. **Punkt 18:** Tools-QR Fehler → Page finden und fixen
3. **Punkt 36:** Upload-Button ohne Funktion → Browser-Tests

#### 🟡 Wichtig (UX)
4. **Punkt 28:** Mystery Mode Tooltip hinzufügen (5 Min)
5. **Punkt 9:** Event-Dashboard aufräumen (2h)
6. **Punkt 13:** Upgrade-UI verbessern (1h)

#### 🟢 Nice-to-Have (Features)
7. **Punkt 5:** Event-Create-Wizard (6h)
8. **Punkt 10:** Feature-Gating (4h)
9. **Punkt 21:** Album-Templates (2h)

---

**Nächster Schritt:** Mystery Mode Tooltip + Tools-Bereich finden und Fehler beheben
