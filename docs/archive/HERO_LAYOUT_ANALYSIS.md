# 🔍 Hero-Variante Layout-Analyse

**Datum:** 2026-01-10  
**Screenshot-Analyse:** Aktuelles Layout vs. Erwartetes Design

---

## 📸 Was im Screenshot sichtbar ist:

### ✅ **Funktioniert:**
1. ✅ Großes Cover-Bild als Background (dunkles Auto/Buildings)
2. ✅ Großes Profilbild überlagert (Schüssel mit Beeren)
3. ✅ Event-Info-Karte vorhanden
4. ✅ Story-Button sichtbar
5. ✅ Album-Navigation vorhanden

### ⚠️ **Mögliche Probleme:**

1. **Cover-Bild Höhe zu gering:**
   - Aktuell: `pb-24` (96px padding-bottom)
   - Sollte: **50-60vh** (50-60% der Viewport-Höhe)
   - Problem: Cover-Bild ist nicht prominent genug

2. **Event-Info-Karte Position:**
   - Aktuell: `-mt-16` (64px negative margin)
   - Sollte: Mehr Überlappung mit Hero-Bereich
   - Problem: Karte könnte zu weit unten sein

3. **Profilbild Position:**
   - Aktuell: Überlagert, aber vielleicht nicht prominent genug
   - Sollte: Mehr im Vordergrund, größer

4. **Layout-Flow:**
   - Cover-Bild → Profilbild → Karte → Navigation
   - Sollte flüssiger übergehen

---

## 🔧 Code-Analyse

### **Aktueller Code (EventHeader.tsx):**

```tsx
// Zeile 273: Header-Bereich
<div className="relative px-4 pt-4 pb-24">  // ← pb-24 = 96px (zu wenig!)
  {/* Logo + Event-Titel */}
</div>

// Zeile 288: Übergang zu Content
<div className="absolute left-0 right-0 -bottom-10 h-20 bg-app-bg rounded-t-[48px]" />

// Zeile 293: Event-Info-Karte
<div className="max-w-md mx-auto px-4 -mt-16 relative">  // ← -mt-16 = -64px
  {/* Profilbild + Story-Button + Event-Info */}
</div>
```

### **Problem:**
- `pb-24` = 96px → Cover-Bild ist zu klein
- Sollte: **50-60vh** für Hero-Bereich

---

## 🎯 Erwartetes Design

### **Hero-Section sollte sein:**
```
┌─────────────────────────┐
│   [Cover-Bild]          │ ← 50-60vh Höhe
│   [Gradient Overlay]     │
│   [Logo + Event-Titel]   │
│                         │
│   [Profilbild]          │ ← Prominent überlagert
│   [Story-Button]        │
│   [Event-Info-Karte]    │ ← Überlappt mit Hero
└─────────────────────────┘
```

### **Aktuelles Layout:**
```
┌─────────────────────────┐
│   [Cover-Bild]          │ ← Nur 96px padding-bottom
│   [Logo + Event-Titel]   │
│   [Übergang]            │
│   [Profilbild]          │ ← Zu weit unten
│   [Event-Info-Karte]    │
└─────────────────────────┘
```

---

## ✅ Fix-Vorschläge

### **1. Cover-Bild Höhe erhöhen:**

**Aktuell:**
```tsx
<div className="relative px-4 pt-4 pb-24">  // pb-24 = 96px
```

**Sollte sein:**
```tsx
<div className="relative px-4 pt-4" style={{ minHeight: '50vh' }}>  // 50vh
```

### **2. Profilbild prominenter positionieren:**

**Aktuell:**
```tsx
<div className="max-w-md mx-auto px-4 -mt-16 relative">
```

**Sollte sein:**
```tsx
<div className="max-w-md mx-auto px-4 -mt-20 relative">  // Mehr Überlappung
```

### **3. Event-Info-Karte besser integrieren:**

**Aktuell:**
```tsx
<div className="mt-4 w-full rounded-2xl border border-app-border bg-app-card ...">
```

**Sollte sein:**
```tsx
<div className="mt-6 w-full rounded-2xl border border-app-border bg-app-card shadow-lg ...">
```

---

## 🎨 Design-Verbesserungen

### **1. Cover-Bild prominenter:**
- Höhe: 50-60vh statt 96px
- Gradient-Overlay stärker
- Parallax-Effekt sichtbarer

### **2. Profilbild größer/prominenter:**
- Aktuell: `w-28 h-28` (112px)
- Vorschlag: `w-32 h-32` (128px) oder sogar `w-36 h-36` (144px)

### **3. Event-Info-Karte:**
- Mehr Schatten (shadow-lg)
- Bessere Überlappung mit Hero
- Größere Abstände

### **4. Story-Button:**
- Prominenter
- Größer
- Besser sichtbar

---

## 📊 Vergleich: Aktuell vs. Soll

| Element | Aktuell | Soll |
|---|---|---|
| **Cover-Bild Höhe** | 96px (pb-24) | 50-60vh |
| **Profilbild Größe** | 112px (w-28) | 128-144px (w-32/w-36) |
| **Karte Überlappung** | -64px (-mt-16) | -80px (-mt-20) |
| **Karte Schatten** | shadow-sm | shadow-lg |
| **Story-Button** | Standard | Prominenter |

---

## ✅ Nächste Schritte

1. **Cover-Bild Höhe:** `pb-24` → `minHeight: '50vh'`
2. **Profilbild:** `w-28` → `w-32` oder `w-36`
3. **Karte Überlappung:** `-mt-16` → `-mt-20`
4. **Schatten:** `shadow-sm` → `shadow-lg`

---

**Status:** ⚠️ **LAYOUT VERBESSERUNGEN ERFORDERLICH**  
**Priorität:** 🟡 **WICHTIG** - Hero sollte prominenter sein
