# 🚀 Implementierungs-Roadmap - Kombinierter Plan

**Datum:** 2025-12-09  
**Basierend auf:** qrFotos.de + Everlense.de Analyse

---

## 📊 Analyse-Zusammenfassung

### qrFotos.de (Desktop-Fokus)
- ✅ 4 Event-Modi (Standard, Moderation, Foto Sammeln, Nur Ansicht)
- ✅ Foto Challenge (Gamification)
- ✅ Video-Upload
- ✅ Sidebar-Navigation
- ✅ Viele konfigurierbare Optionen

### Everlense.de (Mobile-First)
- ✅ Modernes Purple/Weiß Design
- ✅ Bottom Navigation Bar
- ✅ Challenge Feature
- ✅ Live Slideshow
- ✅ Album-Thumbnails mit Sort
- ✅ Profilbild + Event-Namen prominent
- ✅ "Invite Guests" Feature
- ✅ Sehr cleanes, modernes UI

---

## 🎯 Kombinierter Entwicklungsplan

### Phase 1: Event-Modi System (Hoch-Priorität) 🔴

#### 1.1 Backend-Implementierung

**Schema-Erweiterung:**
```typescript
// featuresConfig erweitern um 'mode'
{
  mode: 'STANDARD' | 'MODERATION' | 'COLLECT' | 'VIEW_ONLY',
  showGuestlist: boolean,
  allowUploads: boolean,
  moderationRequired: boolean,
  allowDownloads: boolean,
}
```

**Photo-Route anpassen:**
- Filterung basierend auf Modus
- COLLECT: Gäste sehen nur eigene Fotos
- MODERATION: Nur APPROVED Fotos für Gäste
- VIEW_ONLY: Keine Uploads möglich

#### 1.2 Frontend-UI

**Event-Einstellungen Seite:**
- Prominente Modus-Auswahl mit Radio-Buttons
- Klare Beschreibungen (wie qrFotos)
- Visuelle Icons für jeden Modus
- Live-Vorschau der Auswirkungen

---

### Phase 2: Design-System Modernisierung (Hoch-Priorität) 🔴

#### 2.1 Design-Tokens

**Farben (Everlense-inspiriert):**
- Primary: Purple (`#a855f7`) - modern, freundlich
- Alternative: Grün (`#295B4D`) - aktuell, kann beibehalten werden
- Neutrals: Grau-Skala

**Komponenten:**
- Rounded Buttons (rounded-lg)
- Card-Design mit Shadows
- Moderne Icons
- Klare Typografie

#### 2.2 Navigation

**Mobile:**
- Bottom Navigation Bar (wie Everlense)
- 4 Hauptbereiche: Fotos, Challenges, Slideshow, Einstellungen

**Desktop:**
- Sidebar Navigation (wie qrFotos)
- Kollabierbar
- Icons + Text

---

### Phase 3: UI-Komponenten (Mittel-Priorität) 🟡

#### 3.1 Event-Header

**Inspiration Everlense:**
- Großes Profilbild (Event-Logo)
- Event-Titel prominent
- Event-Datum
- "Start Setup" Button
- "Gäste einladen" Button

#### 3.2 Album-Thumbnails

**Inspiration Everlense:**
- Grid-Layout (4 Spalten)
- Sort-Funktion (Neueste, Älteste, Zufällig)
- "Add Pictures" Placeholder
- Hover-Effekte

---

### Phase 4: Neue Features (Mittel-Priorität) 🟡

#### 4.1 Foto Challenge

**Backend:**
- Challenge Model
- Voting-System
- Gewinner-Anzeige

**Frontend:**
- Challenge-Liste
- Challenge erstellen
- Fotos zu Challenge hinzufügen
- Voting-UI

#### 4.2 Live Slideshow

**Backend:**
- WebSocket-basierte Slideshow
- Auto-Play
- Filter: Nur APPROVED

**Frontend:**
- Fullscreen Slideshow
- Steuerung
- Übergangseffekte

---

## 🎨 Optischer Plan

### Layout-Struktur

```
┌─────────────────────────────────────┐
│  Header (Logo, Free Badge, Menu)   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Profilbild (Event-Logo)   │   │
│  │   Event-Titel                │   │
│  │   [Start Setup] [Gäste]      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Neues Album        [Sort] │   │
│  │  ┌──┬──┬──┬──┐              │   │
│  │  │+ │📷│📷│📷│              │   │
│  │  └──┴──┴──┴──┘              │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│ [Fotos] [Challenge] [Slideshow] [⚙️]│ ← Bottom Nav (Mobile)
└─────────────────────────────────────┘
```

### Desktop-Layout

```
┌──────┬──────────────────────────────┐
│      │  Header                      │
│ Side │                              │
│ bar  │  Content Area                │
│      │                              │
│ [📷] │  ┌──────────────────────┐   │
│ [🏆] │  │  Event Header        │   │
│ [▶️] │  │  Album Thumbnails    │   │
│ [⚙️] │  │  ...                 │   │
│      │  └──────────────────────┘   │
└──────┴──────────────────────────────┘
```

---

## 📋 Detaillierte Feature-Liste

### Funktional (Backend)

1. **Event-Modi System** ⭐⭐⭐
   - [ ] Backend: Modus-Logik in Photo-Route
   - [ ] Backend: Modus-Validierung
   - [ ] Backend: Guest-Filterung für COLLECT-Modus

2. **Foto Challenge** ⭐⭐
   - [ ] Backend: Challenge Schema
   - [ ] Backend: Challenge API
   - [ ] Backend: Voting-System

3. **Live Slideshow** ⭐
   - [ ] Backend: WebSocket Slideshow
   - [ ] Backend: Auto-Play Logic

### Optisch (Frontend)

1. **Design-System** ⭐⭐⭐
   - [ ] Design-Tokens definieren
   - [ ] Komponenten-Library
   - [ ] Farb-Schema (Purple oder Grün)

2. **Navigation** ⭐⭐⭐
   - [ ] Bottom Navigation (Mobile)
   - [ ] Sidebar Navigation (Desktop)
   - [ ] Responsive Umschaltung

3. **Event-Header** ⭐⭐
   - [ ] Profilbild-Komponente
   - [ ] Event-Titel prominent
   - [ ] Action Buttons

4. **Album-Thumbnails** ⭐⭐
   - [ ] Grid-Layout
   - [ ] Sort-Funktion
   - [ ] Add-Button

5. **Event-Einstellungen** ⭐⭐⭐
   - [ ] Modus-Auswahl UI
   - [ ] Radio-Button Cards
   - [ ] Klare Beschreibungen

---

## 🚀 Sprint-Planung

### Sprint 1: Event-Modi (1 Woche)
**Ziel:** Foto Sammeln Modus funktionsfähig

**Tasks:**
- [ ] Backend: Modus-Logik implementieren
- [ ] Backend: Photo-Route Filterung
- [ ] Frontend: Modus-Auswahl UI
- [ ] Frontend: Photo-Liste Filterung
- [ ] Testing: Alle 4 Modi

**Deliverable:** Event-Modi funktionieren vollständig

### Sprint 2: Design-System (1 Woche)
**Ziel:** Modernes Design-System etabliert

**Tasks:**
- [ ] Design-Tokens definieren
- [ ] Button-Komponenten
- [ ] Card-Komponenten
- [ ] Input-Komponenten
- [ ] Navigation-Komponenten

**Deliverable:** Konsistentes Design-System

### Sprint 3: Navigation & Header (3 Tage)
**Ziel:** Mobile + Desktop Navigation

**Tasks:**
- [ ] Bottom Navigation (Mobile)
- [ ] Sidebar Navigation (Desktop)
- [ ] Event-Header Komponente
- [ ] Responsive Umschaltung

**Deliverable:** Navigation funktioniert auf allen Geräten

### Sprint 4: Album-Thumbnails & Sort (2 Tage)
**Ziel:** Moderne Album-Ansicht

**Tasks:**
- [ ] Thumbnail Grid
- [ ] Sort-Funktion
- [ ] Add-Button
- [ ] Hover-Effekte

**Deliverable:** Album-Ansicht modernisiert

### Sprint 5: Event-Einstellungen UI (2 Tage)
**Ziel:** Modus-Auswahl prominent

**Tasks:**
- [ ] Radio-Button Cards
- [ ] Icons für Modi
- [ ] Beschreibungen
- [ ] Live-Vorschau

**Deliverable:** Intuitive Modus-Auswahl

### Sprint 6: Foto Challenge (2 Wochen)
**Ziel:** Challenge-System funktionsfähig

**Tasks:**
- [ ] Backend: Challenge Schema
- [ ] Backend: Challenge API
- [ ] Frontend: Challenge UI
- [ ] Frontend: Voting
- [ ] Frontend: Gewinner-Anzeige

**Deliverable:** Challenge-System komplett

### Sprint 7: Live Slideshow (1 Woche)
**Ziel:** Slideshow funktionsfähig

**Tasks:**
- [ ] Backend: WebSocket Slideshow
- [ ] Frontend: Fullscreen Slideshow
- [ ] Frontend: Steuerung
- [ ] Frontend: Übergangseffekte

**Deliverable:** Live Slideshow funktioniert

---

## 🎨 Design-Spezifikation

### Farben

**Option 1: Purple (Everlense-Style)**
```css
--primary-50: #f3e8ff;
--primary-500: #a855f7;
--primary-600: #9333ea;
--primary-700: #7e22ce;
```

**Option 2: Grün (aktuell)**
```css
--primary-500: #295B4D;
--primary-600: #1e3d35;
--accent: #EAA48F;
```

**Empfehlung:** Purple für moderneren Look, oder Grün beibehalten für Branding

### Typografie

- **Font:** Inter (modern, lesbar)
- **Headings:** Bold, 2rem / 1.5rem
- **Body:** Regular, 1rem
- **Small:** 0.875rem

### Komponenten

**Buttons:**
- Primary: `bg-primary-500 text-white rounded-lg px-6 py-3`
- Secondary: `bg-white border-2 border-primary-500 text-primary-500 rounded-lg px-6 py-3`
- Ghost: `text-primary-500 rounded-lg px-6 py-3`

**Cards:**
- `bg-white rounded-lg shadow-md p-6`

**Inputs:**
- `border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500`

---

## 📱 Responsive Breakpoints

- **Mobile:** < 768px → Bottom Navigation
- **Tablet:** 768px - 1024px → Sidebar (kollabierbar)
- **Desktop:** > 1024px → Sidebar (immer sichtbar)

---

## ✅ Quick Wins (Sofort umsetzbar)

1. **Foto Sammeln Modus** (3 Tage)
   - Backend-Logik
   - Frontend-Filterung
   - UI-Option

2. **Bottom Navigation** (2 Tage)
   - Mobile Navigation
   - Icons
   - Active States

3. **Event-Header** (2 Tage)
   - Profilbild
   - Event-Titel
   - Buttons

4. **Modus-Auswahl UI** (2 Tage)
   - Radio-Button Cards
   - Beschreibungen
   - Icons

**Gesamt Quick Wins: ~9 Tage**

---

## 🎯 Prioritäten-Matrix

| Feature | Funktional | Optisch | Priorität | Aufwand | Sprint |
|---------|------------|---------|-----------|---------|--------|
| Event-Modi System | ⭐⭐⭐ | ⭐⭐ | 🔴 Hoch | 1 Woche | 1 |
| Design-System | ⭐ | ⭐⭐⭐ | 🔴 Hoch | 1 Woche | 2 |
| Bottom Navigation | ⭐ | ⭐⭐⭐ | 🔴 Hoch | 2 Tage | 3 |
| Event-Header | ⭐ | ⭐⭐ | 🟡 Mittel | 2 Tage | 3 |
| Album-Thumbnails | ⭐ | ⭐⭐ | 🟡 Mittel | 2 Tage | 4 |
| Modus-Auswahl UI | ⭐⭐ | ⭐⭐ | 🔴 Hoch | 2 Tage | 5 |
| Foto Challenge | ⭐⭐⭐ | ⭐⭐ | 🟡 Mittel | 2 Wochen | 6 |
| Live Slideshow | ⭐⭐ | ⭐⭐ | 🟢 Niedrig | 1 Woche | 7 |

---

## 💡 Besondere Highlights

### Was uns auszeichnet:

1. **WordPress-Integration** ✅ (Einzigartig!)
2. **Moderne Architektur** ✅ (Next.js, TypeScript)
3. **Sicherheit** ✅ (Rate Limiting, File Security)
4. **Kombiniertes Best-of-Both** ⭐
   - qrFotos Features
   - Everlense Design
   - Desktop + Mobile optimiert

---

## 📝 Nächste Schritte

### Sofort starten:
1. ✅ Event-Modi System (Backend + Frontend)
2. ✅ Design-System definieren
3. ✅ Bottom Navigation

### Kurzfristig:
1. ✅ Event-Header
2. ✅ Album-Thumbnails
3. ✅ Modus-Auswahl UI

### Mittelfristig:
1. ✅ Foto Challenge
2. ✅ Live Slideshow

---

**Dieser Plan kombiniert die besten Features von qrFotos.de (Funktionalität) und Everlense.de (Design) zu einer modernen, vollständigen Lösung!** 🚀






