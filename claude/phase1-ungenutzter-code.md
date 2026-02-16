# Phase 1: Analyse ungenutzter / schwer zuzuordnender Code

**Hinweis:** Code-First, ohne .md zu berücksichtigen. Dynamische Imports (`import(...)`) gelten als genutzt.

---

## 1. Backend – Services

Alle unter `packages/backend/src/services/` gefundenen Services wurden mit den Routen und `index.ts` abgeglichen:

- **faceRecognition** – von faceSearch und photos (getFaceDetectionMetadata) genutzt.
- **logoOverlay** – von photos, guestbook (addCustomBrandingOverlay), hashtagImport (addLogoOverlay) genutzt.
- **achievementTracker** – von photos, guestbook (checkAchievements) genutzt.
- **faceSwitch** – von boothGames dynamisch importiert (processFaceSwitchForPhoto).
- **aiStyleEffects** – von boothGames dynamisch importiert (processStyleEffectForPhoto).
- **bgRemoval** – von boothGames dynamisch importiert (processBgRemovalForPhoto).
- **guestbookPdf** – von guestbook dynamisch importiert (generateGuestbookPdf).
- **storagePolicy, eventPolicy, uploadDatePolicy, smartAlbum, highlightReel, challengeTemplates** – von Routen oder index.ts referenziert (siehe Architektur-Map).

**Ergebnis:** Kein Service in `src/services/` ist eindeutig ungenutzt. Optional: Prüfung, ob alle exportierten Funktionen/Objekte eines Services tatsächlich verwendet werden (feinerer Scan in Phase 2).

---

## 2. Backend – Routen

Alle 80 Route-Dateien werden in `index.ts` eingebunden und unter `/api/*` gemountet. Keine Route-Datei ist ungenutzt.

---

## 3. Backend – Utils / Lib / Middleware

- Nicht vollständig durchsucht. Empfehlung Phase 2: gezielt `src/utils/`, `src/lib/`, `src/middleware/` nach Exporten durchsuchen, die nirgends importiert werden.

---

## 4. Frontend

- Keine systematische „dead code“-Suche in Phase 1. Empfehlung: In Phase 2 oder 5 mit Tool (z. B. ts-prune, knip) oder manuell nach ungenutzten Exporten in `src/components/`, `src/lib/`, `src/hooks/` suchen.

---

## 5. Shared

- `packages/shared` exportiert Typen und Utils zentral. Nutzung aus Backend und Frontend über `@gaestefotos/shared`. Einzelne nicht genutzte Exports möglich – optional in Phase 2 prüfen.

---

## 6. Zusammenfassung

- **Backend-Services:** Kein offensichtlich toter Service; alle werden von Routen oder Workers referenziert (teils dynamisch).
- **Backend-Routen:** Alle eingebunden.
- **Nächste Schritte:** Feinerer Scan auf ungenutzte Exporte (Backend Utils/Lib, Frontend Components/Hooks) und verwaiste Dateien in Phase 2/5.
