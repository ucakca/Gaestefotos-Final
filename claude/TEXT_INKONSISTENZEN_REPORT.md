# 📝 Text-Inkonsistenzen Audit - Event-Seite

**Datum:** 16. Februar 2026  
**Priorität:** 🟡 MITTEL  
**Betroffene Komponente:** EventHero.tsx + weitere

---

## 🔍 Gefundene Inkonsistenzen

### 1. ❌ **Rechtschreibfehler: "Schliessen" statt "Schließen"**

**Datei:** `packages/frontend/src/components/e3/EventHero.tsx`  
**Zeilen:** 205, 301

```tsx
// ❌ FALSCH: Schweizer Schreibweise
aria-label="Schliessen"

// ✅ RICHTIG: Deutsche Schreibweise
aria-label="Schließen"
```

**Problem:**
- "Schliessen" ist **Schweizer Deutsch** (ohne ß)
- "Schließen" ist **Hochdeutsch** (mit ß)
- Rest der App nutzt **Hochdeutsch** → inkonsistent!

**Anzahl:** 2 Vorkommen

---

### 2. ❌ **Inkonsistente Theme-Toggle-Beschriftung**

**Datei:** `packages/frontend/src/components/e3/EventHero.tsx`  
**Zeile:** 189

```tsx
// ❌ INKONSISTENT: Mit Bindestrich
aria-label={theme === 'dark' ? 'Hell-Modus' : 'Dunkel-Modus'}
```

**Vergleich mit ThemeToggle.tsx (Zeile 39):**
```tsx
// ✅ KORREKT: Ohne Bindestrich
title={isDark ? 'Heller Modus' : 'Dunkler Modus'}
```

**Problem:**
- EventHero: "Hell-Modus" (mit Bindestrich)
- ThemeToggle: "Heller Modus" (ohne Bindestrich, adjektivisch)
- **Inkonsistenz** über verschiedene Komponenten

**Fix:**
```tsx
// ✅ RICHTIG: Konsistent mit ThemeToggle
aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
```

---

## 📊 Vollständige Sprach-Audit

### ✅ KORREKT: Konsistente deutsche UI-Texte

| Komponente | Text | Status |
|------------|------|--------|
| BottomNav | "Feed", "Live", "Gästebuch", "Info" | ✅ OK |
| GuestbookTab | "Gästebuch", "Glückwünsche" | ✅ OK |
| EventHero | "Tagesablauf", "Dresscode", "Wunschliste" | ✅ OK |
| PhotoGrid | "Fotos", "Videos" | ✅ OK |
| ChallengesTab | "Foto-Spiele" | ✅ OK |

**Ergebnis:** Ansonsten sehr konsistente deutsche Texte! 👍

---

### ✅ KORREKT: Englische Code-Begriffe

```tsx
// Code-Variablen/Props (Englisch) - ✅ OK
uploadModalOpen
photoCount
guestbookCount
```

**Ergebnis:** Klare Trennung Code (EN) vs. UI (DE) - Best Practice! ✅

---

## 🔤 Groß-/Kleinschreibung Audit

### ✅ Buttons & Labels (korrekt)

```tsx
"Feed"              // ✅ Großgeschrieben (Substantiv)
"Live"              // ✅ Großgeschrieben
"Gästebuch"         // ✅ Großgeschrieben (Substantiv)
"Info"              // ✅ Großgeschrieben
"Foto-Spiele"       // ✅ Großgeschrieben
"Event teilen"      // ✅ Substantiv groß
"Stories ansehen"   // ✅ Substantiv groß, Verb klein
"Profilbild ansehen" // ✅ Substantiv groß, Verb klein
```

**Ergebnis:** Deutsche Rechtschreibung korrekt umgesetzt! ✅

---

## 🎯 Weitere Micro-Inkonsistenzen

### 3. ⚠️ **Inkonsistente Emoji-Nutzung**

**EventHero.tsx Zeile 74:**
```tsx
welcomeMessage = 'Schön, dass ihr alle hier seid! Lasst uns gemeinsam unvergessliche Erinnerungen schaffen ❤️'
```

**GuestbookTab Zeile 196:**
```tsx
<h2 className="text-2xl font-bold text-foreground mb-2">Gästebuch</h2>
// Kein Emoji
```

**BottomNav Zeile 390 (page.tsx):**
```tsx
<strong>Foto-Spaß verfügbar!</strong> Challenges und Spiele...
// Kein Emoji
```

**Empfehlung:**
- **Entweder:** Emojis konsequent nutzen (z.B. "📖 Gästebuch", "🎮 Foto-Spaß")
- **Oder:** Emojis nur in User-Content (Welcome-Message), nicht in UI

**Priorität:** 🟢 NIEDRIG (Stylistic Choice)

---

### 4. ⚠️ **"Foto" vs "Photo" in Variablennamen**

**Code-Audit:**
```tsx
photoCount          // ✅ Englisch (Code)
uploadModalOpen     // ✅ Englisch (Code)
filteredPhotos      // ✅ Englisch (Code)
```

**UI-Texte:**
```tsx
"Fotos"             // ✅ Deutsch (UI)
"Foto-Spiele"       // ✅ Deutsch (UI)
```

**Ergebnis:** ✅ Konsistent! Code = EN, UI = DE

---

## 🔧 FIXES IMPLEMENTIEREN

### Fix 1: Rechtschreibung "Schließen"

**Datei:** `EventHero.tsx`  
**Zeilen:** 205, 301

```tsx
// VORHER:
aria-label="Schliessen"

// NACHHER:
aria-label="Schließen"
```

**Anzahl:** 2 Änderungen

---

### Fix 2: Theme-Toggle konsistent

**Datei:** `EventHero.tsx`  
**Zeile:** 189

```tsx
// VORHER:
aria-label={theme === 'dark' ? 'Hell-Modus' : 'Dunkel-Modus'}

// NACHHER:
aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
```

**Anzahl:** 1 Änderung

---

## 📊 Zusammenfassung

### 🔴 Kritische Inkonsistenzen (zu beheben)
1. ✅ "Schliessen" → "Schließen" (2x)
2. ✅ "Hell-Modus" → "Heller Modus" (1x)
3. ✅ "Dunkel-Modus" → "Dunkler Modus" (1x)

**Total:** 3 Fixes

### 🟢 Gut umgesetzt
- ✅ Deutsche UI-Texte konsistent
- ✅ Englische Code-Begriffe konsistent
- ✅ Groß-/Kleinschreibung korrekt
- ✅ Code/UI-Trennung sauber

---

## 🎯 Testing-Checkliste

Nach den Fixes:

- [ ] Accessibility-Labels korrekt (Screenreader-Test)
- [ ] Rechtschreibung durchgängig Hochdeutsch
- [ ] Theme-Toggle-Beschriftung konsistent
- [ ] Keine gemischten EN/DE in UI-Texten

---

**Ende Report - Fixes werden jetzt implementiert...**
