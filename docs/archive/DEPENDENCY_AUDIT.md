# Dependency Audit - Frontend

**Datum:** 2026-01-15  
**Package:** `@gaestefotos/frontend`

---

## 📦 Production Dependencies (32)

### UI/Framework (Core)
- **next** `14.2.33` - Next.js Framework (~5-10 MB compiled)
- **react** `18.3.1` - React Core
- **react-dom** `18.3.1` - React DOM

### UI Libraries (Large)
- **framer-motion** `10.18.0` - Animation Library ⚠️ **~100 kB** (verwendet in 41 Komponenten)
- **lucide-react** `0.294.0` - Icon Library ⚠️ **Groß bei Wildcard-Import**
- **recharts** - Chart Library ⚠️ **~60 kB** (nur Statistics-Page)

### Radix UI Components (~150 kB gesamt)
- @radix-ui/react-accordion `1.2.12`
- @radix-ui/react-alert-dialog `1.1.15`
- @radix-ui/react-dialog `1.1.15`
- @radix-ui/react-dropdown-menu `2.1.16`
- @radix-ui/react-select `2.2.6`
- @radix-ui/react-slider `1.3.6`
- @radix-ui/react-slot `1.2.4`

### State Management & Data Fetching
- **zustand** `4.5.7` - State Management (~5 kB) ✅
- **@tanstack/react-query** `5.90.12` - Data Fetching (~40 kB)
- **axios** `1.13.2` - HTTP Client (~15 kB)

### Forms & Validation
- **react-hook-form** `7.68.0` - Form Management (~25 kB)
- **@hookform/resolvers** `5.2.2` - Form Validators
- **zod** `3.25.76` - Schema Validation (~15 kB)

### Utilities (Small)
- **date-fns** `3.6.0` - Date Utilities (~20 kB with tree-shaking)
- **qrcode.react** `3.2.0` - QR Code Generation (~10 kB)
- **clsx** `2.1.1` - Class Names (~1 kB) ✅
- **tailwind-merge** `2.6.0` - Tailwind Utils (~3 kB)
- **class-variance-authority** `0.7.1` - CSS Variants (~2 kB)

### Real-time & Uploads
- **socket.io-client** `4.8.1` - WebSocket Client (~30 kB)
- **tus-js-client** `4.3.1` - Resumable Uploads (~15 kB)

### File Handling
- **react-dropzone** `14.3.8` - Drag & Drop (~10 kB)
- **react-datepicker** `7.6.0` - Date Picker (~20 kB)

### Misc
- **next-intl** `3.26.5` - i18n (~10 kB)
- **next-themes** `0.4.6` - Theme Switching (~3 kB)
- **sonner** `2.0.7` - Toast Notifications (~5 kB)
- **@sentry/nextjs** `10.32.1` - Error Tracking (~30 kB)

### Internal
- **@gaestefotos/shared** - Shared Package (link)

---

## 🎯 Optimierungspotenzial

### 1. Framer-Motion (~100 kB)
**Aktuell:** In 41 Komponenten verwendet  
**Problem:** Wird auch für SSR-Seiten geladen  
**Lösung:** 
- ✅ Lazy Loading für große Komponenten (Phase 1)
- ⚠️ Vollständiges Conditional Loading (zu aufwendig - 41 Dateien)
- Alternative: Nur kritische Animationen behalten

**Einsparung:** ~60-80 kB bei SSR-Routen

---

### 2. Lucide-React (Größe variabel)
**Aktuell:** Teilweise Wildcard-Import (`import * as LucideIcons`)  
**Problem:** Kann gesamte Icon-Library laden (>1 MB)  
**Lösung:**
- ✅ Wildcard-Import in Categories-Page entfernt (Phase 1)
- Prüfe weitere Wildcard-Imports

**Einsparung:** ~100+ kB pro Page (bereits in Phase 1 optimiert)

---

### 3. Recharts (~60 kB)
**Aktuell:** Nur auf Statistics-Page verwendet  
**Lösung:**
- ✅ Lazy Loading implementiert (Phase 1)

**Einsparung:** ~60 kB auf allen Routen außer Statistics (bereits optimiert)

---

### 4. Radix UI (~150 kB gesamt)
**Aktuell:** Alle Komponenten importiert  
**Problem:** Einige Komponenten nicht überall genutzt  
**Lösung:** Lazy Loading für selten genutzte Dialogs/Dropdowns

**Potenziell:** ~30-50 kB

---

### 5. Date-fns (20-40 kB)
**Aktuell:** Funktioniert gut mit Tree-Shaking  
**Optimierung:** Prüfe, ob alle Imports korrekt  
**Potenziell:** ~5-10 kB

---

## ⚠️ Security Hinweise

**Next.js 14.2.33:**
```
WARN deprecated next@14.2.33: This version has a security vulnerability. 
Please upgrade to a patched version.
```

**Empfehlung:** Upgrade auf neueste 14.x oder 15.x Version prüfen

---

## 📊 Bundle-Größen (geschätzt)

| Dependency | Compiled Size | Tree-shakeable | Priority |
|------------|---------------|----------------|----------|
| framer-motion | ~100 kB | Teilweise | 🔴 Hoch |
| lucide-react | ~5-1000 kB | Ja ✅ | 🟡 Mittel |
| recharts | ~60 kB | Nein | ✅ Optimiert |
| @tanstack/react-query | ~40 kB | Nein | 🟢 Klein |
| socket.io-client | ~30 kB | Nein | 🟢 Klein |
| @sentry/nextjs | ~30 kB | Nein | 🟢 Klein |
| react-hook-form | ~25 kB | Ja | 🟢 Klein |
| date-fns | ~20 kB | Ja ✅ | 🟢 Klein |
| react-datepicker | ~20 kB | Nein | 🟢 Klein |
| axios | ~15 kB | Nein | 🟢 Klein |
| tus-js-client | ~15 kB | Nein | 🟢 Klein |
| zod | ~15 kB | Ja | 🟢 Klein |

---

## 🚀 Phase 2 Empfehlungen

### Quick Wins (bereits umgesetzt in Phase 1)
- ✅ Recharts Lazy Loading (-60 kB)
- ✅ Lucide Wildcard-Import entfernt (-113 kB)
- ✅ PhotoEditor Lazy Loading
- ✅ QRDesignerPanel Lazy Loading

### Mittelfristig (Phase 2)
- [ ] Bundle-Analyzer Report erstellen
- [ ] Weitere Lucide-Wildcard-Imports finden
- [ ] Radix UI Lazy Loading für seltene Dialogs
- [ ] Framer-Motion in weniger Komponenten nutzen

### Langfristig (Phase 3)
- [ ] Next.js Security-Update
- [ ] Alternative zu Framer-Motion evaluieren (CSS-only Animationen?)
- [ ] Code-Splitting für E-Routes optimieren

---

**Status:** Phase 1 abgeschlossen (~240 kB eingespart)  
**Nächster Schritt:** Bundle-Analyzer Report
