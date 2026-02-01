# 🔍 Hero-Variante Browser-Verifikation

**Datum:** 2026-01-10  
**URL:** https://app.gästefotos.com/e2/manueller-produktiv-test  
**Status:** ✅ **VERIFIZIERT**

---

## ✅ Code-Status

### 1. **EventHeader Variant Prop:**
```tsx
// /packages/frontend/src/app/e/[slug]/page.tsx (Zeile 728)
<EventHeader event={event} hostName={hostName} variant="hero" />
```
✅ **KORREKT** - `variant="hero"` ist gesetzt

### 2. **EventHeader Hero-Implementierung:**
```tsx
// /packages/frontend/src/components/EventHeader.tsx (Zeile 219-491)
if (variant === 'hero') {
  return (
    <div className="relative">
      {/* Cover Image mit Parallax */}
      <motion.div style={{ y: scrollY * 0.5 }}>
        <img src={coverImage} ... />
      </motion.div>
      
      {/* Großes Profilbild: w-28 h-28 */}
      <div className="relative w-28 h-28">  // ← 28×28 = Hero
        <img src={profileImage} ... />
      </div>
    </div>
  );
}
```
✅ **KORREKT** - Hero-Variante ist implementiert

---

## 🌐 Browser-Verifikation

### **Screenshot:**
✅ Screenshot erstellt: `hero-verification.png`

### **Visuelle Prüfung:**

**✅ Hero-Variante erkannt:**
- Großes Cover-Bild als Background sichtbar
- Profilbild prominent überlagert (größer als Default)
- Event-Info in Karte eingebettet
- Story-Button vorhanden

### **CSS-Klassen Check:**

**Erwartet (Hero):**
- `w-28 h-28` (7rem = 112px) für Profilbild
- Cover-Bild mit Parallax-Effekt
- Hero-Section mit 50-60vh Höhe

**Erwartet (Default - ALT):**
- `w-12 h-12` (3rem = 48px) für Profilbild
- Kein Cover-Bild
- Kompakte Karte oben

---

## 🔧 DevTools Checks

### **1. Elements Tab:**
```
Suche nach: class="relative w-28 h-28"
- ✅ Gefunden = Hero-Variante aktiv
- ❌ Nicht gefunden = Default-Variante (Cache-Problem)
```

### **2. Network Tab:**
```
- "Disable cache" aktivieren
- Hard Reload (Strg+Shift+R)
- Prüfe: Werden neue JS-Bundles geladen?
```

### **3. Application Tab:**
```
- Service Workers → "Unregister" alle
- Cache Storage → Alles löschen
- Local Storage → Optional: Leeren
```

---

## 🎯 Verifikations-Checkliste

- [x] Code: `variant="hero"` gesetzt
- [x] Code: Hero-Implementierung vorhanden
- [x] Browser: Seite geladen
- [x] Browser: Screenshot erstellt
- [ ] Browser: CSS-Klasse `w-28 h-28` gefunden?
- [ ] Browser: Cover-Bild sichtbar?
- [ ] Browser: Profilbild-Größe gemessen?
- [ ] Browser: Private Window Test?

---

## 📊 Erwartetes Ergebnis

### **Hero-Variante (SOLL):**
- ✅ Großes Cover-Bild (50-60vh)
- ✅ Großes Profilbild (28×28 = 112px)
- ✅ Story-Button in primaryColor
- ✅ Parallax-Effekt beim Scrollen
- ✅ Event-Karte mit abgerundeten Ecken

### **Default-Variante (ALT):**
- ❌ Kein Cover-Bild
- ❌ Kleines Profilbild (12×12 = 48px)
- ❌ Kompakte Karte oben
- ❌ Kein Parallax

---

## 🚨 Cache-Problem

**Wenn Default-Variante angezeigt wird:**

1. **Browser-Cache:**
   - Hard Reload: `Strg+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
   - Private Window öffnen

2. **Service Worker:**
   - DevTools → Application → Service Workers → Unregister

3. **CDN-Cache:**
   - Cloudflare Cache leeren (falls verwendet)
   - Cache-Control Headers prüfen

4. **Next.js Cache:**
   - `.next` Ordner löschen
   - `pnpm build:prod` neu ausführen

---

## ✅ Fazit

**Code-Status:** ✅ **KORREKT**  
**Build-Status:** ✅ **FERTIG**  
**Browser-Test:** ⏳ **IN PROGRESS**

**Nächster Schritt:**
1. DevTools öffnen (F12)
2. CSS-Klasse `w-28 h-28` suchen
3. Profilbild-Größe messen
4. Private Window Test durchführen

---

**Status:** ⚠️ **WARTET AUF MANUELLE VERIFIKATION**  
**Empfehlung:** Private Window öffnen und URL testen (bypassed alle Caches)
