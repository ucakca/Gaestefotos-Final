# 🧹 Code Cleanup Liste

**Erstellt:** 22. Januar 2026  
**Ziel:** Vor Launch aufräumen für wartbaren, sauberen Code  

---

## ❌ ZU ENTFERNEN

### 1. Frontend `(admin)` Route-Gruppe
**Status:** 🔴 ZU PRÜFEN
- **Pfad:** `packages/frontend/src/app/(admin)/dashboard/`
- **Inhalt:** print-service page
- **Frage:** Ist das ein Überbleibsel oder wird das genutzt?
- **Aktion:** Prüfen ob noch verwendet → Falls nein: löschen

### 2. Console.log Statements (Production)
**Status:** 🔴 ZU ENTFERNEN

**Frontend (8 gefunden):**
- `app/events/[id]/live-wall/page.tsx` (3x)
- `components/InstallPrompt.tsx` (1x)
- `components/invitation-editor/InvitationConfigEditor.tsx` (1x)
- `components/invitation-editor/InvitationEditorPanel.tsx` (1x)
- `components/qr-designer/QRDesignerPanel.tsx` (1x)
- `components/wizard/EventWizard.tsx` (1x)

**Backend (7 gefunden):**
- `routes/printService.ts` (3x)
- `index.ts` (1x)
- `routes/events.ts` (1x)
- `services/email.ts` (1x)
- `services/imageProcessor.ts` (1x)

**Aktion:** Alle `console.log` durch `logger` ersetzen oder entfernen

### 3. Test-Dateien in Production
**Status:** 🔴 ZU ENTFERNEN
- `packages/frontend/src/app/login/page-test.tsx`
- **Aktion:** Sollte in `/tests` Ordner oder gelöscht werden

### 4. Unused Route `/ui`
**Status:** 🟡 ZU PRÜFEN
- `packages/frontend/src/app/ui/page.tsx`
- **Frage:** UI-Testseite oder Production-Feature?
- **Aktion:** Falls nur Dev-Tool → entfernen oder mit DEV-Flag schützen

---

## ⚠️ ZU REFACTOREN

### 5. TODO/FIXME/HACK Comments
**Status:** 🟡 DOKUMENTIEREN

**Frontend:** 20 TODOs gefunden
- Hauptsächlich in: `qaLog.ts`, `AppLayout.tsx`, `UploadButton.tsx`
- **Aktion:** Jedes TODO als Issue tracken oder fixen

**Backend:** 73 TODOs gefunden
- Hauptsächlich in: `adminQaLogs.ts`, `wordpress.ts`, `qaLogRetention.ts`
- **Aktion:** Kritische TODOs priorisieren und Issue erstellen

### 6. Type-Safety Issues
**Status:** 🟡 ZU VERBESSERN

**Login Flow:**
```tsx
// packages/frontend/src/app/login/page.tsx:58
const me = await authApi.getMe();
const roleRaw = (me?.user as any)?.role;  // ❌ 'as any'
```
- **Problem:** Type-Casting mit `any` umgeht TypeScript-Checks
- **Aktion:** Proper Interface für User-Objekt definieren

**Dashboard:**
```tsx
// packages/frontend/src/app/dashboard/page.tsx:82
} catch (err: any) {  // ❌ 'any'
```
- **Aktion:** Error-Type definieren oder `unknown` verwenden

### 7. Duplicate Code Detection
**Status:** 🟡 ZU KONSOLIDIEREN

**Token-Handling:**
- Login: `localStorage` vs `sessionStorage` Logic
- Dashboard: Token aus URL extrahieren
- **Aktion:** Zentrales Token-Management in `@gaestefotos/shared`

**Event-Loading Pattern:**
- Mehrere Pages haben ähnliche `loadEvents()` Funktionen
- **Aktion:** Custom Hook `useEvents()` erstellen

---

## 📦 ZU KONSOLIDIEREN

### 8. Utility Functions in /shared
**Status:** 🟡 IN ARBEIT

**Kandidaten für Shared:**
- Token-Management (localStorage/sessionStorage)
- Error-Handling Utils
- API-Response-Parser
- URL-Helper (extractInviteTokenFromUrl, etc.)

---

## 🔒 SECURITY CHECKS

### 9. Input Validation
**Status:** ⚠️ ZU TESTEN
- Event Slug Validation
- Password-Protected Event Handling
- File Upload Validation (Dateitypen, Größe)

### 10. XSS Protection
**Status:** ✅ NEXT.JS DEFAULT
- Next.js escaped automatisch
- Aber: User-generated Content (Gästebuch) prüfen

### 11. Rate Limiting
**Status:** 🔴 ZU PRÜFEN
- Foto-Upload: Rate Limit?
- Login: Brute-Force Protection?
- API-Endpoints: DDoS Protection?

---

## 🎯 PERFORMANCE

### 12. Image Optimization
**Status:** 🟡 ZU PRÜFEN
- Werden Next.js Image-Component verwendet?
- Lazy Loading aktiv?
- Thumbnail-Generation funktioniert?

### 13. Bundle Size
**Status:** 🟡 ZU ANALYSIEREN
- `framer-motion` nur wo nötig?
- `lucide-react` tree-shaking aktiv?
- Dynamic Imports für schwere Components?

**Gefunden:**
- ✅ `StoryViewer` wird dynamisch geladen
- ✅ `FaceSearch` wird dynamisch geladen
- ✅ `ModernPhotoGrid` wird dynamisch geladen

---

## 📱 MOBILE/RESPONSIVE

### 14. PWA Install Prompt
**Status:** ✅ VORHANDEN
- `components/InstallPrompt.tsx` existiert
- **Zu testen:** Funktioniert auf iOS/Android?

### 15. Touch Gestures
**Status:** 🟡 ZU TESTEN
- Story-Viewer: Swipe funktioniert?
- Photo-Grid: Pinch-to-Zoom?
- Lightbox: Touch-Navigation?

---

## 🧪 TESTING

### 16. Unit Tests
**Status:** 🔴 FEHLEN
- **Aktion:** Kritische Utils testen (Token-Handling, URL-Parsing)

### 17. E2E Tests
**Status:** 🔴 FEHLEN
- **Aktion:** Hauptflows testen (Login, Upload, Moderation)

### 18. Accessibility Tests
**Status:** 🔴 ZU MACHEN
- **Aktion:** Lighthouse Audit
- **Aktion:** Screen Reader Test
- **Aktion:** Keyboard Navigation

---

## 🗺️ PRIORISIERUNG

### 🔴 KRITISCH (vor Launch)
1. Console.logs entfernen
2. Test-Files löschen
3. (admin) Route klären
4. Security Checks (Rate Limiting)
5. Type-Safety verbessern

### 🟡 WICHTIG (nach Launch)
1. TODOs in Issues umwandeln
2. Duplicate Code refactoren
3. Performance-Analyse
4. Unit Tests schreiben

### 🟢 NICE-TO-HAVE
1. Accessibility verbessern
2. Bundle Size optimieren
3. E2E Tests hinzufügen

---

**Nächster Schritt:** (admin) Route prüfen und Console.logs entfernen
