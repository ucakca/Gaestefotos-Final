# 🔍 Pre-Launch QA Audit Report
**Datum:** 22. Januar 2026  
**Plattformen:** app.gästefotos.com, dash.gästefotos.com  
**Rolle:** Senior QA Engineer & Full-Stack UX Designer  

---

## 📋 Executive Summary

Dieser Bericht dokumentiert eine systematische Analyse der Gästefotos-Plattform vor dem Launch. Die Analyse umfasst Code-Review, User Journey Testing, UI/UX-Konsistenz, Bug Detection und Edge Case Handling.

**Status:** ⚠️ IN BEARBEITUNG

---

## 🚨 Kritische Blocker (Muss vor Launch gefixt werden)

### 1. Frontend /admin/* Code noch vorhanden (Duplikate)
**Status:** ✅ BEHOBEN (22.01.2026)
- **Problem:** Frontend hatte duplizierte Admin-Routen unter `/admin/*`
- **Impact:** Verwirrung, Code-Duplikation, Wartungsprobleme
- **Fix:** -3896 lines Code gelöscht, Admin Dashboard konsolidiert
- **Commit:** c709eb1

### 2. Landingpage Redirect ohne Fallback
**Status:** 🔴 OFFEN
- **Problem:** `packages/frontend/src/app/page.tsx` macht sofortigen Redirect zu `/login`
- **Impact:** Keine Landingpage für neue User, keine SEO-Optimization
- **Datei:** `/root/gaestefotos-app-v2/packages/frontend/src/app/page.tsx`
- **Code:**
```tsx
useEffect(() => {
  router.replace('/login');
}, [router]);
```
- **Empfehlung:** 
  - Marketing-Landingpage mit Value Proposition
  - "Jetzt starten" CTA → dann zu Login
  - SEO-optimierte Inhalte (Meta Tags, Headings)

### 3. Login Flow - Admin-Weiterleitung komplex
**Status:** ⚠️ ZU PRÜFEN
- **Problem:** Login-Page hat komplexe Admin-Detection-Logik (Zeile 60-78)
- **Impact:** Mehrere Hostname-Replacements, potenzielle Race Conditions
- **Datei:** `/root/gaestefotos-app-v2/packages/frontend/src/app/login/page.tsx`
- **Code:**
```tsx
const isAdmin = roleRaw === 'ADMIN' || roleRaw === 'SUPERADMIN' || ...
if (isAdmin && typeof window !== 'undefined') {
  const origin = window.location.origin;
  const token = String(response.token || '');
  const url = new URL(origin);
  url.hostname = url.hostname.replace(/^app\./i, 'dash.');
  // ...
}
```
- **Empfehlung:** 
  - Backend sollte redirect_url zurückgeben
  - Vereinfachte Client-Logik
  - Besseres Error Handling bei fehlschlagendem Redirect

---

## 🎨 UX-Optimierungen (Verbesserung der Nutzerführung)

### 1. Login-Page UX
**Status:** 🟡 VERBESSERUNGSPOTENTIAL

**Aktueller Stand:**
- ✅ Gute Animation (Framer Motion)
- ✅ Password Show/Hide Toggle
- ✅ "Remember Me" Checkbox
- ✅ Error-Display mit Animation

**Verbesserungen:**
- ❌ Kein "Passwort vergessen?" Link
- ❌ Kein "Noch kein Account? Registrieren" Link sichtbar
- ❌ Error Messages nicht internationalisiert
- ❌ Keine Ladeindikator während API-Call (außer `loading` state)

**Empfohlene Fixes:**
```tsx
// Nach dem Passwort-Feld:
<div className="flex justify-between items-center mt-2">
  <Link href="/forgot-password" className="text-sm text-app-accent hover:underline">
    Passwort vergessen?
  </Link>
</div>

// Nach dem Submit-Button:
<p className="text-center text-sm text-app-muted mt-4">
  Noch kein Account?{' '}
  <Link href="/register" className="text-app-accent hover:underline font-medium">
    Jetzt registrieren
  </Link>
</p>
```

### 2. User Journey: Foto-Upload bis Dashboard
**Status:** 📊 ZU TESTEN

**Zu prüfende Flows:**
1. **Host Flow:**
   - Login → Event erstellen → QR generieren → Gäste laden ein
   - Event-Settings ändern → Fotos moderieren
   
2. **Guest Flow:**
   - QR scannen → Fotos hochladen → Gästebuch-Eintrag
   - Eigene Fotos ansehen → Download
   
3. **Admin Flow:**
   - Login → Analytics → Photo Moderation → Feature Flags

**Edge Cases:**
- Was passiert bei Upload von 500 Fotos gleichzeitig?
- Verbindungsabbruch während Upload?
- Falsches Dateiformat (z.B. .exe statt .jpg)?
- Event ist gelöscht während Guest hochlädt?

---

## 🎨 Design-Feinschliff (Visuelle Korrekturen)

### 1. Konsistenz-Check: Buttons
**Status:** 🔴 INKONSISTENZEN GEFUNDEN

**Problem:** Button-Variants nicht einheitlich
- Admin Dashboard: `variant="destructive"` ✅
- Manche Stellen: `variant="danger"` ❌ (deprecated)

**Fix:** Bereits behoben in `c709eb1`

### 2. Spacing & Layout
**Status:** 📊 ZU PRÜFEN

**Zu checken:**
- Padding/Margin Konsistenz über alle Pages
- Responsive Breakpoints (Mobile, Tablet, Desktop)
- Dark Mode Kompatibilität (falls geplant)

---

## ❓ Logik-Fragen (Wo die Intention unklar ist)

### 1. Token-Storage-Strategie
**Frage:** Warum sowohl `localStorage` als auch `sessionStorage`?
- **Datei:** `login/page.tsx` Zeile 42-48
- **Logik:** `rememberMe` ? `localStorage` : `sessionStorage`
- **Problem:** 2FA-Token-Handling könnte sich überschneiden

**Empfehlung:** Token-Management vereinheitlichen

### 2. Admin-Subdomain vs. Pfad
**Frage:** Warum `dash.gästefotos.com` statt `app.gästefotos.com/admin`?
- **Pro Subdomain:** Klare Trennung, eigene SSL, eigene Deployment
- **Contra:** CORS-Komplexität, Cookie-Sharing-Probleme

**Aktuell:** Gut gelöst, aber Cross-Domain-Token-Passing zu testen

---

## 🧹 Code-Cleanup Liste

### ❌ Zu entfernende/aufzuräumende Bereiche:

1. **Frontend `/admin/*` Überbleibsel**
   - **Status:** ✅ ERLEDIGT (Migration abgeschlossen)
   - **Commit:** c709eb1

2. **Deprecated Button-Variants**
   - **Status:** ✅ ERLEDIGT
   - **Fix:** `variant="danger"` → `variant="destructive"`

3. **Unused Imports**
   - **Status:** 🔴 ZU PRÜFEN
   - **Aktion:** `eslint --fix` mit unused-imports Plugin

4. **Console.log Statements**
   - **Status:** 🔴 ZU PRÜFEN
   - **Aktion:** Grep nach `console.log` in Production Code

5. **TODO/FIXME Comments**
   - **Status:** 📊 WIRD ANALYSIERT
   - **Aktion:** Alle TODOs dokumentieren und Tickets erstellen

6. **Duplicate Utility Functions**
   - **Status:** 🔴 ZU PRÜFEN
   - **Aktion:** Helper-Functions in `@gaestefotos/shared` konsolidieren

7. **Type-Safety Issues**
   - **Status:** ⚠️ GEFUNDEN
   - **Beispiel:** `response?.user as any` (Zeile 58 login/page.tsx)
   - **Aktion:** Proper TypeScript Interfaces definieren

---

## 🧪 Testing-Strategie

### Persona-Simulations-Tests

#### Persona A: "Oma Erna" (70, wenig Tech-Erfahrung)
**Aufgabe:** Als Gast Fotos hochladen
- Kann sie den QR-Code scannen?
- Findet sie den Upload-Button sofort?
- Versteht sie die Fehlermeldungen?

#### Persona B: "Profi-Fotograf" (35, Tech-affin)
**Aufgabe:** 200 Bilder gleichzeitig hochladen
- Nervt ihn die Upload-Animation?
- Funktioniert Bulk-Upload?
- Gibt es Progress-Feedback?

#### Persona C: "Admin Lisa" (28, Moderatorin)
**Aufgabe:** 50 Fotos in Photo-Moderation durchgehen
- Sind Bulk-Actions verfügbar?
- Funktioniert die Filterung?
- Gibt es Keyboard-Shortcuts?

### Usability-Testbogen

**Test 1: Login & Navigation**
- [ ] Login mit korrekten Credentials
- [ ] Login mit falschen Credentials → Error klar?
- [ ] "Remember Me" funktioniert
- [ ] Logout funktioniert
- [ ] Admin wird zu dash. weitergeleitet

**Test 2: Event Creation (Host)**
- [ ] Event erstellen mit allen Pflichtfeldern
- [ ] QR-Code wird generiert
- [ ] Event-Settings sind editierbar
- [ ] Event kann gelöscht werden

**Test 3: Foto-Upload (Guest)**
- [ ] QR-Code scannen führt zur richtigen Event-Page
- [ ] Fotos können hochgeladen werden
- [ ] Upload-Progress wird angezeigt
- [ ] Fehler bei ungültigen Dateiformaten
- [ ] Eigene Fotos werden angezeigt

**Test 4: Photo Moderation (Admin)**
- [ ] Alle Fotos werden geladen
- [ ] Filterung nach Status funktioniert
- [ ] Bulk-Approve/Reject funktioniert
- [ ] Fotos können gelöscht werden

**Test 5: Analytics Dashboard (Admin)**
- [ ] Charts werden korrekt angezeigt
- [ ] Daten sind aktuell
- [ ] Export-Funktionen verfügbar

---

## 📊 Nächste Schritte

### Phase 1: Code-Analyse ✅ (in Arbeit)
- [x] Struktur-Overview
- [x] Login-Flow analysiert
- [ ] Alle TODO/FIXME gefunden
- [ ] Console.logs gefunden
- [ ] Unused Imports gefunden

### Phase 2: UI/UX Deep-Dive
- [ ] Alle Pages durchgehen
- [ ] Responsiveness testen
- [ ] Accessibility Check (WCAG)
- [ ] Performance-Metriken

### Phase 3: Functional Testing
- [ ] User Journeys durchspielen
- [ ] Edge Cases testen
- [ ] Error Handling testen

### Phase 4: Security Audit
- [ ] XSS-Protection
- [ ] CSRF-Protection
- [ ] Rate Limiting
- [ ] Input Validation

---

## 📝 Notizen

- Admin Dashboard Migration wurde erfolgreich abgeschlossen
- Select.Item Errors behoben
- Feature Flags BigInt Serialization gefixt
- Server-seitig alles OK (200 Responses)

---

**Zuletzt aktualisiert:** 22.01.2026 22:40 Uhr
