# 📋 Detaillierte Feature-Beschreibungen

**Datum:** 2025-12-09

---

## 🔧 Funktional: Event-Modi System

### Was ist das Event-Modi System?

Das Event-Modi System gibt dem Gastgeber **4 verschiedene Möglichkeiten**, wie Gäste mit Fotos interagieren können. Jeder Modus hat unterschiedliche Regeln für Uploads und Sichtbarkeit.

### Die 4 Modi im Detail:

#### 1. **Standard Modus**
- **Was passiert:** Gäste können Fotos hochladen und **sofort alle Fotos im Album sehen**
- **Wann nutzen:** Öffentliche Events, Partys, wo alle alles sehen sollen
- **Beispiel:** Geburtstagsfeier, alle sollen sofort alle Fotos sehen

#### 2. **Moderation Modus** ✅ (haben wir bereits!)
- **Was passiert:** Gäste können hochladen, aber Fotos sind **erst nach Freigabe durch Gastgeber** für andere sichtbar
- **Wann nutzen:** Events wo Qualität wichtig ist, unpassende Fotos vermieden werden sollen
- **Beispiel:** Hochzeit, Firmenfeier - Gastgeber prüft vorher

#### 3. **Foto Sammeln Modus** ⭐ **NEU - FEHLT NOCH!**
- **Was passiert:** 
  - Gäste können Fotos hochladen
  - **Gäste sehen NUR ihre eigenen hochgeladenen Fotos** (Privatsphäre!)
  - **Gastgeber sieht ALLE Fotos** von allen Gästen
- **Wann nutzen:** Private Events, Hochzeiten, wo Gäste sich sicherer fühlen sollen
- **Beispiel:** Hochzeit - Gäste laden Fotos hoch, sehen aber nur ihre eigenen. Brautpaar sieht alles.
- **Warum wichtig:** Viele Gäste fühlen sich wohler, wenn nicht alle ihre Fotos sofort sehen

#### 4. **Nur Ansicht Modus**
- **Was passiert:** Gäste können **keine Fotos hochladen**, nur das Album ansehen
- **Wann nutzen:** Events wo nur der Gastgeber Fotos hochlädt, Gäste sollen nur schauen
- **Beispiel:** Professionelle Event-Fotografie, Gastgeber lädt alle Fotos hoch

---

### Backend-Filterung - Was bewirkt das?

**Backend-Filterung bedeutet:** Der Server (Backend) entscheidet, welche Fotos ein Gast sehen darf, **bevor** die Fotos überhaupt an das Frontend gesendet werden.

**Warum wichtig:**
- **Sicherheit:** Gäste können nicht durch Frontend-Manipulation Fotos sehen, die sie nicht sollen
- **Performance:** Nur relevante Fotos werden geladen (weniger Daten)
- **Privatsphäre:** Funktioniert auch wenn jemand die API direkt aufruft

**Beispiel für Foto Sammeln Modus:**

```typescript
// Backend prüft:
// 1. Wer ist der User? (Gast oder Gastgeber?)
// 2. Welcher Modus ist aktiv? (COLLECT)
// 3. Wenn Gast + COLLECT → Nur eigene Fotos
// 4. Wenn Gastgeber → Alle Fotos

// Ergebnis: Gast sieht nur 5 eigene Fotos statt 200 Fotos von allen
```

**Ohne Backend-Filterung:**
- Frontend könnte alle Fotos laden und dann filtern
- ❌ Unsicher (kann umgangen werden)
- ❌ Langsam (lädt unnötige Daten)
- ❌ Privatsphäre-Problem

**Mit Backend-Filterung:**
- Backend sendet nur erlaubte Fotos
- ✅ Sicher (kann nicht umgangen werden)
- ✅ Schnell (nur relevante Daten)
- ✅ Privatsphäre geschützt

---

### Frontend-UI - Genauere Beschreibung

**Wo:** Event-Einstellungen Seite (`/events/[id]/edit`)

**Wie es aussehen soll:**

```
┌─────────────────────────────────────────┐
│  Event-Modus                            │
│  Wähle, wie Gäste mit Fotos             │
│  interagieren können                    │
├─────────────────────────────────────────┤
│                                         │
│  ○ Standard                             │
│    Gäste können hochladen und           │
│    alle Fotos im Album sehen            │
│                                         │
│  ○ Moderation                           │
│    Uploads müssen erst von dir          │
│    freigegeben werden                   │
│                                         │
│  ● Foto Sammeln                         │
│    Gäste sehen nur eigene Fotos,        │
│    du siehst alle                      │
│                                         │
│  ○ Nur Ansicht                          │
│    Gäste können keine Fotos hochladen   │
│                                         │
└─────────────────────────────────────────┘
```

**Technische Umsetzung:**
- Radio-Button Gruppe
- Jeder Modus hat:
  - Icon (visuell)
  - Titel (fett)
  - Beschreibung (klein, grau)
  - Hover-Effekt
- Aktiver Modus ist markiert
- Speichern-Button speichert die Auswahl

**Wo sonst noch:**
- In der Event-Übersicht: Badge/Icon zeigt aktiven Modus
- In der Photo-Liste: Info-Banner wenn Modus aktiv ist

---

## 🏆 Foto Challenge - Genauere Beschreibung

### Was ist eine Foto Challenge?

Eine **Foto Challenge** ist ein spielerisches Element, bei dem Gastgeber eine "Aufgabe" stellt und Gäste Fotos hochladen können, die zu dieser Aufgabe passen.

**Beispiele:**
- "Beste Selfie"
- "Schnappschuss des Abends"
- "Kreativste Foto"
- "Lustigste Moment"
- "Schönste Dekoration"

### Wie funktioniert es?

1. **Gastgeber erstellt Challenge:**
   - Titel: "Beste Selfie"
   - Beschreibung: "Zeigt uns euer bestes Selfie vom Event!"
   - Start-Datum: Jetzt
   - End-Datum: In 2 Stunden

2. **Gäste nehmen teil:**
   - Sehen die Challenge im Event
   - Laden Fotos hoch
   - Fotos werden zur Challenge hinzugefügt

3. **Voting (optional):**
   - Gäste können Fotos "liken" oder bewerten
   - Fotos mit meisten Votes gewinnen

4. **Gewinner:**
   - Challenge endet
   - Foto mit meisten Votes wird als Gewinner angezeigt
   - Badge "🏆 Gewinner" auf dem Foto

### UI-Beispiel:

```
┌─────────────────────────────────────┐
│  📸 Foto Challenge                  │
├─────────────────────────────────────┤
│                                     │
│  🏆 Beste Selfie                    │
│  Zeigt uns euer bestes Selfie!      │
│  ⏰ Noch 1h 23min                    │
│                                     │
│  ┌──────┬──────┬──────┐            │
│  │ 📷   │ 📷   │ 📷   │            │
│  │ 👍 5 │ 👍 12│ 👍 8 │            │
│  └──────┴──────┴──────┘            │
│                                     │
│  [Foto hochladen]                   │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎮 Gamification - Genauere Beschreibung

### Was ist Gamification?

**Gamification** bedeutet, spielerische Elemente in eine normale Anwendung einzubauen, um Nutzer zu motivieren und zu engagieren.

### Elemente die wir einbauen können:

1. **Challenges** (Foto Challenge)
   - Aufgaben stellen
   - Teilnahme motivieren
   - Gewinner feiern

2. **Voting/Likes**
   - Fotos können geliked werden
   - Ranking-System
   - "Beliebteste Fotos" Sektion

3. **Badges/Achievements**
   - "Erstes Foto hochgeladen" 🎯
   - "10 Fotos hochgeladen" 📸
   - "Challenge gewonnen" 🏆
   - "Meist geliktes Foto" ⭐

4. **Leaderboard**
   - Wer hat die meisten Fotos?
   - Wer hat die meisten Likes?
   - Wer hat Challenges gewonnen?

5. **Progress Bars**
   - "Event zu 50% voll" (basierend auf erwarteten Fotos)
   - Challenge-Fortschritt

### Warum wichtig?

- **Engagement:** Gäste bleiben länger auf der Seite
- **Mehr Fotos:** Motivation mehr zu uploaden
- **Spaß:** Macht Events interaktiver
- **Social:** Gäste interagieren miteinander

---

## 👍 Voting-System - Genauere Beschreibung

### Was ist das Voting-System?

Ein **Voting-System** erlaubt es Gästen, Fotos zu bewerten (liken, voten, bewerten).

### Verschiedene Voting-Arten:

#### 1. **Like-System** (einfach)
- Gäste können Fotos "liken" (Herz-Icon)
- Jeder kann nur einmal liken
- Anzahl der Likes wird angezeigt
- **Beispiel:** Instagram-ähnlich

#### 2. **Star-Rating** (detailliert)
- Gäste können 1-5 Sterne vergeben
- Durchschnitt wird berechnet
- **Beispiel:** Amazon-ähnlich

#### 3. **Challenge-Voting** (für Challenges)
- Gäste voten für Challenge-Fotos
- Foto mit meisten Votes gewinnt
- **Beispiel:** Wettbewerb

### Technische Umsetzung:

**Backend:**
```typescript
// Neue Tabelle: PhotoVote
model PhotoVote {
  id        String   @id @default(uuid())
  photoId   String
  userId    String   // Wer hat gevotet
  vote      Int      // 1 = Like, oder 1-5 für Stars
  createdAt DateTime @default(now())
  
  photo Photo @relation(...)
  user  User  @relation(...)
  
  @@unique([photoId, userId]) // Ein Vote pro User pro Foto
}
```

**Frontend:**
- Like-Button unter jedem Foto
- Animation beim Klicken
- Anzahl der Likes anzeigen
- "Du hast geliked" Indikator

### UI-Beispiel:

```
┌─────────────────────┐
│  [Foto]             │
│                     │
│  ❤️ 42 Likes        │
│  [Like Button]      │
└─────────────────────┘
```

---

## 📺 Live Slideshow - Genauere Beschreibung

### Was ist eine Live Slideshow?

Eine **Live Slideshow** zeigt Fotos automatisch nacheinander in Vollbild, wie eine Diashow. Sie aktualisiert sich automatisch, wenn neue Fotos hochgeladen werden.

### WebSocket-basiert - Was bedeutet das?

**WebSocket** ist eine Technologie, die eine **dauerhafte Verbindung** zwischen Browser und Server aufbaut.

**Normal (HTTP):**
- Browser fragt: "Gibt es neue Fotos?"
- Server antwortet: "Nein"
- Verbindung wird geschlossen
- Browser fragt nach 5 Sekunden wieder
- ❌ Langsam, viele Anfragen

**WebSocket:**
- Browser verbindet sich einmal
- Server sendet automatisch: "Neues Foto!"
- Browser zeigt es sofort an
- ✅ Sofort, effizient

**Für Slideshow bedeutet das:**
- Neues Foto wird hochgeladen
- Server sendet sofort an alle verbundenen Slideshows
- Alle sehen das neue Foto sofort (ohne Refresh)

### Features:

1. **Auto-Play**
   - Fotos wechseln automatisch (z.B. alle 5 Sekunden)
   - Smooth Übergänge (Fade, Slide)

2. **Steuerung**
   - Play/Pause Button
   - Vor/Zurück Buttons
   - Geschwindigkeit einstellen

3. **Filter**
   - Nur APPROVED Fotos
   - Nur bestimmte Kategorie
   - Zufällige Reihenfolge

4. **Fullscreen**
   - Nimmt ganzen Bildschirm ein
   - Perfekt für Projektion auf Wand/TV

### UI-Beispiel:

```
┌─────────────────────────────────┐
│  [Foto in Vollbild]             │
│                                 │
│  ⏮️  ⏸️  ⏭️                     │
│                                 │
│  Foto 12 von 45                 │
│  ⚙️ Einstellungen                │
└─────────────────────────────────┘
```

---

## 🎨 Design-System - Gastgeber kann eigenes Design machen

### Was bedeutet "Gastgeber kann eigenes Design machen"?

Der Gastgeber soll in den Event-Einstellungen **alle Design-Elemente anpassen** können:

1. **Farben:**
   - Primärfarbe (Buttons, Links)
   - Sekundärfarbe (Akzente)
   - Hintergrundfarbe
   - Textfarbe

2. **Schriftarten:**
   - Überschriften-Font
   - Text-Font
   - Schriftgrößen

3. **Logo:**
   - Event-Logo hochladen
   - Wird überall angezeigt

4. **Hintergrund:**
   - Hintergrundbild
   - Hintergrundfarbe
   - Pattern/Texture

5. **Komponenten:**
   - Button-Stil (Rund, Eckig)
   - Card-Stil
   - Border-Radius

### Wie funktioniert es?

**Backend:**
```typescript
// designConfig erweitern
{
  colors: {
    primary: "#a855f7",
    secondary: "#9333ea",
    background: "#ffffff",
    text: "#111827"
  },
  fonts: {
    heading: "Inter",
    body: "Inter"
  },
  logo: "https://...",
  backgroundImage: "https://...",
  borderRadius: "lg", // sm, md, lg, xl
  buttonStyle: "rounded" // rounded, square
}
```

**Frontend:**
- Design-Editor in Event-Einstellungen
- Live-Vorschau
- Farb-Picker
- Font-Auswahl
- Logo-Upload
- Vorschau-Button (sieht sofort wie es aussieht)

### UI-Beispiel:

```
┌─────────────────────────────────┐
│  Design anpassen                 │
├─────────────────────────────────┤
│                                 │
│  Primärfarbe: [🎨 #a855f7]     │
│  Sekundärfarbe: [🎨 #9333ea]   │
│                                 │
│  Logo: [📷 Hochladen]           │
│                                 │
│  Hintergrund:                   │
│  ○ Farbe                        │
│  ○ Bild                         │
│                                 │
│  [Vorschau] [Speichern]         │
└─────────────────────────────────┘
```

---

## 📱 Responsive Design

### Was bedeutet "responsive"?

**Responsive** bedeutet, dass die Anwendung sich **automatisch an verschiedene Bildschirmgrößen anpasst**.

### Breakpoints:

- **Mobile:** < 768px (Smartphones)
  - Bottom Navigation
  - Einspaltig
  - Große Buttons (Touch-optimiert)

- **Tablet:** 768px - 1024px (Tablets)
  - Sidebar (kollabierbar)
  - Zweispaltig
  - Hybrid Navigation

- **Desktop:** > 1024px (Computer)
  - Sidebar (immer sichtbar)
  - Mehrspaltig
  - Hover-Effekte

### Beispiel:

**Mobile:**
```
┌─────────┐
│ Header  │
│         │
│ Content │
│         │
│ [Nav]   │ ← Unten
└─────────┘
```

**Desktop:**
```
┌───┬─────────┐
│Nav│ Content │
│   │         │
│   │         │
└───┴─────────┘
```

---

## 💌 Einladungskarte - Neue Anforderung

### Was ist eine Einladungskarte?

Eine **digitale Einladungskarte** ist eine schöne, gestaltete Seite, die Gäste per Link oder QR-Code öffnen können. Sie enthält alle wichtigen Event-Informationen.

### Vergleichsseiten analysieren...

Ich analysiere jetzt Vergleichsseiten für Einladungskarten-Designs.






