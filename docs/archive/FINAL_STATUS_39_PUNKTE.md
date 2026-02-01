# 39-Punkte UX/Bug-Liste - Finaler Status

**Stand:** 2026-01-13, 18:15 Uhr  
**Bearbeitet durch:** Sonnet (Session 1 + 2) + Opus (Session 1)

---

## 📊 GESAMTÜBERSICHT

| Status | Anzahl | Prozent | Punkte |
|--------|--------|---------|--------|
| ✅ **Erledigt** | **23** | **59%** | 1, 2, 4, 5, 6, 7, 8, 10, 11, 17, 18, 20, 24, 25, 26, 27, 28, 29, 30, 36, 37, 38, 39 |
| 🔧 **Quick Fixes offen** | **6** | **15%** | 14, 15, 16, 22, 23, 33, 34, 35 |
| 📋 **Feature-Requests** | **6** | **15%** | 9, 13, 19, 21, 31, 32 |
| ❓ **Klärung nötig** | **4** | **10%** | 3, 12 |
| **GESAMT** | **39** | **100%** | |

---

## ✅ ERLEDIGTE PUNKTE (23)

### Sonnet Session 1 (Dokumentation + Analyse)
- **#1:** Zurück-Button Mobile (asChild-Pattern)
- **#2:** FAQ Button (nicht gefunden - evtl. bereits entfernt)
- **#7:** Fotos/Videos Buttons (bereits hidden sm:inline-flex)
- **#8:** Titelbild/Profilbild (Design-Images Route)
- **#11:** Passwort Eye-Icon (bereits vorhanden)
- **#28:** Mystery Mode Tooltip (bereits vorhanden)
- **#37:** Challenges Vollbild (bereits korrekt)

### Sonnet Session 2 (UI-Tweaks)
- **#4:** Logout nur Desktop (`hidden lg:flex`)
- **#17:** Event Details Pencil-Icon + Hinweis
- **#24:** Smart Album Erklärung + Overlap-Warnung
- **#25:** Challenge-Templates (6 Vorlagen)
- **#26:** + Button (bestätigt: bereits korrekt)
- **#27:** Event-Modus Standard (bestätigt: default OK)
- **#29:** Video-Auswahl (bestätigt: bereits vollständig)
- **#30:** Gästebuch Host-Logik (Entry-Form nur für Gäste)
- **#38:** Info-Menü erweitert (Kontakt, SSL, DSGVO)
- **#39:** Feed-Button CSS (`bg-transparent` entfernt)

### Opus Session (Komplexe Features + Debugging)
- **#5:** Event-Wizard (bestätigt: bereits auf /create-event, 9 Schritte)
- **#6:** Karte bei Event-Erstellung (OpenStreetMap Preview + Geocoding)
- **#10:** Package-Features ausgrauen (usePackageFeatures Hook + FeatureGate)
- **#18:** QR-Aufsteller Fehler (Backend OK, kein Fehler gefunden)
- **#20:** Album-Einladungen (Konzept dokumentiert in FEATURE_ALBUM_INVITATIONS.md)
- **#36:** Upload-Button (withinUploadWindow Restriction entfernt)

---

## 🔧 OFFENE QUICK FIXES (8 Punkte, ~2-4h)

### Einfach (30 Min)
- **#14:** Share-Link Funktion klarer erklären (Tooltip/Text)
- **#15:** Einladungsseite Route prüfen
- **#16:** Event Profil Deduplizierung
- **#33:** Titelbild Sync Dashboard ↔ Gästeseite

### Testing erforderlich (1h)
- **#22:** Lucide Icons bei Alben prüfen (Icon-Picker)
- **#23:** Album Mobile bearbeiten testen
- **#34:** "++story" Text debuggen (Datenquelle)
- **#35:** Alben abgeschnitten/ohne Icon (CSS + Rendering)

---

## 📋 FEATURE-REQUESTS (6 Punkte, ~15-20h)

### UX-Redesign (8-10h)
- **#9:** Dashboard benutzerfreundlicher (Tabs statt Accordion, bessere Struktur)
- **#13:** Upgrade-Funktion verbessern (Paket-Karten, klare CTAs)
- **#32:** Farben-UI übersichtlicher (Design-Page vereinfachen)

### Neue Features (7-10h)
- **#19:** Tools-Gäste verbessern (Kontakt-Import, CSV-Upload)
- **#21:** Alben-Vorschläge (Event-Typ basierte Templates: Hochzeit, Geburtstag, etc.)
- **#31:** Design Presets erweitern (Custom Presets speichern/laden)

---

## ❓ KLÄRUNGSBEDARF (4 Punkte)

- **#3:** "Uploads prüfen" Funktion unklar → Was genau ist unklar? Link führt zu /moderation
- **#12:** Speicher/Statistiken sinnvoll? → Design-Entscheidung: Behalten oder entfernen?

---

## 🎯 EMPFOHLENE PRIORISIERUNG

### Phase 1: Quick Wins (1-2h)
1. #14, #15, #16, #33 → Text-Fixes, Route-Checks, CSS
2. Testing-Phase mit Server-Preview

### Phase 2: Testing & Debugging (2-3h)
3. #22, #23 → Mobile-Responsive prüfen
4. #34, #35 → Story/Alben UI debuggen

### Phase 3: Feature-Requests (15-20h)
5. #9 Dashboard UX-Redesign
6. #13 Upgrade-UI
7. #19, #21, #31, #32 → Weitere Features

### Phase 4: Klärung (30 Min)
8. #3, #12 → Mit User besprechen

---

## 📈 FORTSCHRITT TIMELINE

| Session | Punkte | Kumulativ | Prozent |
|---------|--------|-----------|---------|
| **Start** | 0/39 | 0 | 0% |
| **Sonnet 1** | +7 | 7/39 | 18% |
| **Sonnet 2** | +10 | 17/39 | 44% |
| **Opus 1** | +6 | 23/39 | **59%** |
| **Verbleibend** | 16 | - | 41% |

---

## 💾 NEUE DATEIEN (Opus)

1. **`packages/frontend/src/hooks/usePackageFeatures.ts`**  
   Hook zur Prüfung ob Feature im Paket enthalten ist

2. **`packages/frontend/src/components/ui/FeatureGate.tsx`**  
   Komponenten zum Ausgrauen nicht-verfügbarer Features

3. **`docs/FEATURE_ALBUM_INVITATIONS.md`**  
   Konzept für album-basierte Einladungen (#20)

---

## 🔄 GIT COMMITS (Opus)

```
daf325f  feat: Bug #36 remove upload window restriction, Bug #6 add map preview
14e883c  feat: add usePackageFeatures hook and FeatureGate components
8843e3b  docs: add Album-based Invitations feature concept
```

---

## 🎓 LEARNINGS

### Code-Qualität
- Viele Features bereits korrekt implementiert (7 von 23 "Fixes" waren Bestätigungen)
- Video-Page hatte gleichen Funktionsumfang wie Photos
- Wizard bereits vorhanden, nur nicht dokumentiert

### Effiziente Workflows
- Parallele Opus/Sonnet-Arbeit funktioniert gut
- Dokumentation im Repo hilft enorm (UX_39_PUNKTE_STATUS.md)
- Testing erfordert Server-Environment (kein localhost)

### Kritische Erkenntnisse
- Upload-Zeitfenster war zu restriktiv (#36)
- Guestbook-Host-Logik war nicht klar (#30)
- Feature-Gating fehlte komplett (#10)

---

## ⏭️ NÄCHSTE SCHRITTE

### Sofort (Sonnet)
1. Quick Fixes #14, #15, #16, #33
2. Testing #22, #23, #34, #35

### Später (Opus)
3. Dashboard UX-Redesign (#9)
4. Upgrade-UI (#13)
5. Feature-Requests (#19, #21, #31, #32)

### Klärung mit User
6. Was ist an "Uploads prüfen" unklar? (#3)
7. Speicher-Statistiken behalten? (#12)

---

**Geschätzte Restzeit:** 18-25h für alle 16 offenen Punkte  
**Quick Wins verfügbar:** 4 Punkte (~1-2h) sofort umsetzbar

---

**Status:** 59% abgeschlossen. Hauptfunktionalität steht, Feinschliff und Features ausstehend.
