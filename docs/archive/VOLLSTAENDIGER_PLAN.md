# 📋 Vollständiger Entwicklungsplan mit detaillierten Beschreibungen

**Datum:** 2025-12-09  
**Basierend auf:** qrFotos.de + Everlense.de + Paperless Post Analyse

---

## 🔧 FUNKTIONAL: Detaillierte Feature-Beschreibungen

### 1. Event-Modi System ⭐⭐⭐

#### Was ist das Event-Modi System?

Das **Event-Modi System** gibt dem Gastgeber **4 verschiedene Möglichkeiten**, wie Gäste mit Fotos interagieren können. Jeder Modus hat unterschiedliche Regeln für Uploads und Sichtbarkeit.

**Warum wichtig:**
- Verschiedene Event-Typen brauchen verschiedene Regeln
- Privatsphäre-Schutz
- Flexibilität für Gastgeber

#### Die 4 Modi im Detail:

##### 1. **Standard Modus**
```
┌─────────────────────────────────────┐
│  ✅ Gäste können hochladen          │
│  ✅ Alle sehen alle Fotos           │
│  ✅ Sofort sichtbar                │
└─────────────────────────────────────┘
```
- **Was passiert:** Gäste können Fotos hochladen und **sofort alle Fotos im Album sehen**
- **Wann nutzen:** Öffentliche Events, Partys, wo alle alles sehen sollen
- **Beispiel:** Geburtstagsfeier, alle sollen sofort alle Fotos sehen
- **Backend:** Keine Filterung, alle Fotos werden angezeigt

##### 2. **Moderation Modus** ✅ (haben wir bereits!)
```
┌─────────────────────────────────────┐
│  ✅ Gäste können hochladen          │
│  ⏳ Fotos warten auf Freigabe       │
│  ✅ Erst nach Freigabe sichtbar     │
└─────────────────────────────────────┘
```
- **Was passiert:** Gäste können hochladen, aber Fotos sind **erst nach Freigabe durch Gastgeber** für andere sichtbar
- **Wann nutzen:** Events wo Qualität wichtig ist, unpassende Fotos vermieden werden sollen
- **Beispiel:** Hochzeit, Firmenfeier - Gastgeber prüft vorher
- **Backend:** Filtert nach `status = 'APPROVED'` für Gäste

##### 3. **Foto Sammeln Modus** ⭐ **NEU - FEHLT NOCH!**
```
┌─────────────────────────────────────┐
│  ✅ Gäste können hochladen          │
│  👁️ Gäste sehen NUR eigene Fotos   │
│  👑 Gastgeber sieht ALLE Fotos      │
└─────────────────────────────────────┘
```
- **Was passiert:** 
  - Gäste können Fotos hochladen
  - **Gäste sehen NUR ihre eigenen hochgeladenen Fotos** (Privatsphäre!)
  - **Gastgeber sieht ALLE Fotos** von allen Gästen
- **Wann nutzen:** Private Events, Hochzeiten, wo Gäste sich sicherer fühlen sollen
- **Beispiel:** Hochzeit - Gäste laden Fotos hoch, sehen aber nur ihre eigenen. Brautpaar sieht alles.
- **Warum wichtig:** Viele Gäste fühlen sich wohler, wenn nicht alle ihre Fotos sofort sehen
- **Backend:** Filtert nach `guestId = currentUserId` für Gäste, alle für Host

##### 4. **Nur Ansicht Modus**
```
┌─────────────────────────────────────┐
│  ❌ Gäste können NICHT hochladen    │
│  ✅ Gäste können Album ansehen       │
│  👑 Nur Gastgeber kann hochladen    │
└─────────────────────────────────────┘
```
- **Was passiert:** Gäste können **keine Fotos hochladen**, nur das Album ansehen
- **Wann nutzen:** Events wo nur der Gastgeber Fotos hochlädt, Gäste sollen nur schauen
- **Beispiel:** Professionelle Event-Fotografie, Gastgeber lädt alle Fotos hoch
- **Backend:** Upload-Endpoint prüft Modus und blockiert für Gäste

---

### Backend-Filterung - Was bewirkt das genau?

**Backend-Filterung bedeutet:** Der Server (Backend) entscheidet, welche Fotos ein Gast sehen darf, **bevor** die Fotos überhaupt an das Frontend gesendet werden.

#### Warum ist das wichtig?

**Ohne Backend-Filterung (nur Frontend):**
```
Gast ruft API auf → Backend sendet ALLE 200 Fotos → Frontend filtert → Zeigt 5 Fotos
❌ Problem: Alle 200 Fotos werden geladen (langsam, unsicher)
❌ Problem: Jemand könnte Frontend-Code ändern und alle Fotos sehen
```

**Mit Backend-Filterung:**
```
Gast ruft API auf → Backend prüft: "Ist Gast, Modus COLLECT" 
→ Backend sendet NUR 5 eigene Fotos → Frontend zeigt 5 Fotos
✅ Vorteil: Nur relevante Daten werden geladen (schnell)
✅ Vorteil: Sicherheit - kann nicht umgangen werden
```

#### Technische Umsetzung:

```typescript
// packages/backend/src/routes/photos.ts

router.get('/:eventId/photos', async (req, res) => {
  // 1. Event laden
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { 
      featuresConfig: true,  // Enthält den Modus
      hostId: true           // Wer ist der Gastgeber?
    }
  });
  
  // 2. Modus bestimmen
  const mode = (event.featuresConfig as any)?.mode || 'STANDARD';
  const isHost = req.userId === event.hostId;
  const isGuest = !isHost;
  
  // 3. Filter aufbauen
  const where: any = { eventId };
  
  // 4. Modus-spezifische Filterung
  if (mode === 'COLLECT' && isGuest) {
    // Foto Sammeln: Gast sieht nur eigene Fotos
    where.guestId = req.userId;  // ← WICHTIG: Backend filtert!
  }
  
  if (mode === 'MODERATION' && isGuest) {
    // Moderation: Gast sieht nur freigegebene Fotos
    where.status = 'APPROVED';  // ← WICHTIG: Backend filtert!
  }
  
  if (mode === 'VIEW_ONLY' && isGuest) {
    // View Only: Gast kann gar keine Fotos sehen (oder nur lesen)
    // Hier könnte man auch alle Fotos zeigen, aber Upload blockieren
  }
  
  // 5. Nur gefilterte Fotos abrufen
  const photos = await prisma.photo.findMany({
    where,  // ← Filter wird hier angewendet
    // ...
  });
  
  res.json({ photos });  // Nur erlaubte Fotos werden gesendet
});
```

**Ergebnis:**
- Gast sieht nur 5 eigene Fotos (statt 200)
- Schneller (weniger Daten)
- Sicher (kann nicht umgangen werden)
- Privatsphäre geschützt

---

### Frontend-UI - Genauere Beschreibung

#### Wo wird es angezeigt?

**1. Event-Einstellungen Seite** (`/events/[id]/edit`)

**Aktuell:**
- Checkboxen für verschiedene Optionen
- Nicht sehr intuitiv

**Neu (wie qrFotos):**
```
┌─────────────────────────────────────────────┐
│  Event-Modus                                │
│  Wähle, wie Gäste mit Fotos interagieren   │
│  können                                     │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ○ Standard                           │   │
│  │   📸 Gäste können hochladen          │   │
│  │   👁️ Alle sehen alle Fotos           │   │
│  │   ✅ Sofort sichtbar                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ○ Moderation                         │   │
│  │   📸 Gäste können hochladen          │   │
│  │   ⏳ Fotos warten auf Freigabe       │   │
│  │   ✅ Erst nach Freigabe sichtbar     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ● Foto Sammeln                       │   │
│  │   📸 Gäste können hochladen          │   │
│  │   👁️ Gäste sehen nur eigene Fotos    │   │
│  │   👑 Du siehst alle Fotos            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ○ Nur Ansicht                        │   │
│  │   ❌ Gäste können nicht hochladen    │   │
│  │   👁️ Gäste können Album ansehen      │   │
│  │   👑 Nur du kannst hochladen        │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**Design:**
- Jeder Modus ist eine **Card** mit:
  - Radio-Button (links)
  - Icon (oben)
  - Titel (fett)
  - 3 Zeilen Beschreibung (klein, grau)
  - Hover-Effekt (Border wird farbig)
- Aktiver Modus hat:
  - Gefüllter Radio-Button
  - Border in Primärfarbe
  - Hintergrund leicht getönt

**2. Event-Übersicht** (`/events/[id]`)

**Badge/Icon zeigt aktiven Modus:**
```
┌─────────────────────┐
│  Event-Titel        │
│  🏷️ Foto Sammeln    │ ← Badge
└─────────────────────┘
```

**3. Photo-Liste** (`/e/[slug]`)

**Info-Banner wenn Modus aktiv:**
```
┌─────────────────────────────────┐
│  ℹ️ Foto Sammeln Modus aktiv     │
│  Du siehst nur deine eigenen    │
│  hochgeladenen Fotos            │
└─────────────────────────────────┘
```

---

## 🏆 Foto Challenge - Genauere Beschreibung

### Was ist eine Foto Challenge?

Eine **Foto Challenge** ist ein spielerisches Element, bei dem Gastgeber eine "Aufgabe" stellt und Gäste Fotos hochladen können, die zu dieser Aufgabe passen.

### Beispiele für Challenges:

1. **"Beste Selfie"**
   - Beschreibung: "Zeigt uns euer bestes Selfie vom Event!"
   - Zeitraum: 2 Stunden
   - Voting: Ja

2. **"Schnappschuss des Abends"**
   - Beschreibung: "Fang den schönsten Moment ein!"
   - Zeitraum: Ganzer Abend
   - Voting: Ja

3. **"Kreativste Foto"**
   - Beschreibung: "Seid kreativ! Zeigt uns etwas Einzigartiges!"
   - Zeitraum: 1 Tag
   - Voting: Ja

4. **"Lustigste Moment"**
   - Beschreibung: "Welcher Moment war am lustigsten?"
   - Zeitraum: Ganzer Abend
   - Voting: Ja

### Wie funktioniert es genau?

#### 1. Gastgeber erstellt Challenge:

**UI:**
```
┌─────────────────────────────────┐
│  Neue Challenge erstellen        │
├─────────────────────────────────┤
│                                 │
│  Titel: [Beste Selfie        ]  │
│                                 │
│  Beschreibung:                  │
│  [Zeigt uns euer bestes...]     │
│                                 │
│  Start: [Jetzt]                 │
│  Ende:  [In 2 Stunden]          │
│                                 │
│  Voting aktivieren: ☑️          │
│                                 │
│  [Abbrechen] [Erstellen]        │
└─────────────────────────────────┘
```

**Backend speichert:**
- Titel
- Beschreibung
- Start-Datum
- End-Datum
- Voting aktiviert (Ja/Nein)

#### 2. Gäste sehen Challenge:

**UI:**
```
┌─────────────────────────────────┐
│  📸 Foto Challenge              │
├─────────────────────────────────┤
│                                 │
│  🏆 Beste Selfie                │
│  Zeigt uns euer bestes Selfie! │
│                                 │
│  ⏰ Noch 1h 23min                │
│                                 │
│  ┌──────┬──────┬──────┐        │
│  │ 📷   │ 📷   │ 📷   │        │
│  │ 👍 5 │ 👍 12│ 👍 8 │        │
│  │      │ 🏆   │      │        │
│  └──────┴──────┴──────┘        │
│                                 │
│  [Foto hochladen]               │
│                                 │
└─────────────────────────────────┘
```

#### 3. Gäste nehmen teil:

- Klicken "Foto hochladen"
- Wählen Foto aus
- Foto wird zur Challenge hinzugefügt
- Andere können voten

#### 4. Voting (optional):

- Gäste können Fotos "liken" (Herz-Icon)
- Anzahl der Likes wird angezeigt
- Foto mit meisten Likes führt

#### 5. Challenge endet:

- Automatisch nach End-Datum
- Oder manuell vom Gastgeber
- Gewinner wird angezeigt:
  ```
  ┌─────────────────────────────────┐
  │  🏆 Challenge beendet!           │
  │                                 │
  │  Gewinner:                      │
  │  ┌─────────────┐                │
  │  │   [Foto]    │                │
  │  │   👍 42     │                │
  │  │   🏆        │                │
  │  └─────────────┘                │
  │                                 │
  └─────────────────────────────────┘
  ```

### Backend-Schema:

```typescript
// packages/backend/prisma/schema.prisma

model Challenge {
  id          String   @id @default(uuid())
  eventId     String
  title       String
  description String?
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(true)
  allowVoting Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  event  Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  photos ChallengePhoto[]
  
  @@index([eventId])
  @@map("challenges")
}

model ChallengePhoto {
  id          String   @id @default(uuid())
  challengeId String
  photoId     String
  votes       Int      @default(0)
  createdAt   DateTime @default(now())
  
  challenge Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  photo     Photo     @relation(fields: [photoId], references: [id], onDelete: Cascade)
  
  @@unique([challengeId, photoId])
  @@index([challengeId])
  @@map("challenge_photos")
}

// Erweitere Photo Model
model Photo {
  // ... existing fields
  challengePhotos ChallengePhoto[]
}
```

---

## 🎮 Gamification - Genauere Beschreibung

### Was ist Gamification?

**Gamification** bedeutet, spielerische Elemente in eine normale Anwendung einzubauen, um Nutzer zu motivieren und zu engagieren.

### Elemente die wir einbauen können:

#### 1. **Challenges** (Foto Challenge)
- Aufgaben stellen
- Teilnahme motivieren
- Gewinner feiern
- **Beispiel:** "Beste Selfie" Challenge

#### 2. **Voting/Likes**
- Fotos können geliked werden
- Ranking-System
- "Beliebteste Fotos" Sektion
- **Beispiel:** Foto mit 50 Likes steht oben

#### 3. **Badges/Achievements**
- "Erstes Foto hochgeladen" 🎯
- "10 Fotos hochgeladen" 📸
- "Challenge gewonnen" 🏆
- "Meist geliktes Foto" ⭐
- **Beispiel:** Badge erscheint unter dem Profilbild

#### 4. **Leaderboard**
- Wer hat die meisten Fotos?
- Wer hat die meisten Likes?
- Wer hat Challenges gewonnen?
- **Beispiel:** Top 10 Liste im Event

#### 5. **Progress Bars**
- "Event zu 50% voll" (basierend auf erwarteten Fotos)
- Challenge-Fortschritt
- **Beispiel:** "Noch 23 Fotos bis zum Ziel!"

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

#### 1. **Like-System** (einfach) ⭐ Empfohlen
```
┌─────────────────────┐
│  [Foto]             │
│                     │
│  ❤️ 42 Likes        │
│  [❤️ Like]          │
└─────────────────────┘
```
- Gäste können Fotos "liken" (Herz-Icon)
- Jeder kann nur einmal liken
- Anzahl der Likes wird angezeigt
- **Beispiel:** Instagram-ähnlich

#### 2. **Star-Rating** (detailliert)
```
┌─────────────────────┐
│  [Foto]             │
│                     │
│  ⭐⭐⭐⭐⭐ (4.5)      │
│  [Bewerten]         │
└─────────────────────┘
```
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
// packages/backend/prisma/schema.prisma

model PhotoVote {
  id        String   @id @default(uuid())
  photoId   String
  userId    String   // Wer hat gevotet
  vote      Int      // 1 = Like, oder 1-5 für Stars
  createdAt DateTime @default(now())
  
  photo Photo @relation(fields: [photoId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([photoId, userId]) // Ein Vote pro User pro Foto
  @@index([photoId])
  @@map("photo_votes")
}

// Erweitere Photo Model
model Photo {
  // ... existing fields
  votes PhotoVote[]
  voteCount Int @default(0) // Cached count
}
```

**Frontend:**
```typescript
// packages/frontend/src/components/PhotoCard.tsx

<div className="photo-card">
  <img src={photo.url} alt="" />
  
  <div className="photo-actions">
    <button 
      onClick={handleLike}
      className={isLiked ? 'liked' : ''}
    >
      ❤️ {photo.voteCount}
    </button>
  </div>
</div>
```

---

## 📺 Live Slideshow - Genauere Beschreibung

### Was ist eine Live Slideshow?

Eine **Live Slideshow** zeigt Fotos automatisch nacheinander in Vollbild, wie eine Diashow. Sie aktualisiert sich automatisch, wenn neue Fotos hochgeladen werden.

### WebSocket-basiert - Was bedeutet das genau?

**WebSocket** ist eine Technologie, die eine **dauerhafte Verbindung** zwischen Browser und Server aufbaut.

#### Vergleich: HTTP vs WebSocket

**HTTP (normal):**
```
Browser: "Gibt es neue Fotos?"
Server: "Nein"
[Verbindung wird geschlossen]
[5 Sekunden warten]
Browser: "Gibt es neue Fotos?"
Server: "Nein"
[Verbindung wird geschlossen]
...
❌ Problem: Viele Anfragen, langsam, verbraucht Bandbreite
```

**WebSocket:**
```
Browser: "Verbinde mich für Updates"
Server: "OK, Verbindung offen"
[Verbindung bleibt offen]
[Neues Foto wird hochgeladen]
Server: "Neues Foto! ID: 123"
Browser: "Zeige Foto sofort an"
✅ Vorteil: Sofort, effizient, wenig Bandbreite
```

#### Für Slideshow bedeutet das:

1. **Neues Foto wird hochgeladen**
2. **Server sendet sofort an alle verbundenen Slideshows:**
   ```typescript
   io.to(`event:${eventId}`).emit('new-photo', {
     photoId: '123',
     url: 'https://...',
   });
   ```
3. **Alle Slideshows zeigen das neue Foto sofort** (ohne Refresh)

### Features der Slideshow:

#### 1. **Auto-Play**
- Fotos wechseln automatisch (z.B. alle 5 Sekunden)
- Smooth Übergänge (Fade, Slide, Zoom)
- **Einstellbar:** 3s, 5s, 10s, 30s

#### 2. **Steuerung**
- **Play/Pause Button:** Slideshow anhalten
- **Vor/Zurück Buttons:** Manuell navigieren
- **Geschwindigkeit:** Schneller/langsamer
- **Zufällige Reihenfolge:** Shuffle-Modus

#### 3. **Filter**
- Nur APPROVED Fotos
- Nur bestimmte Kategorie
- Zufällige Reihenfolge
- Neueste zuerst

#### 4. **Fullscreen**
- Nimmt ganzen Bildschirm ein
- Perfekt für Projektion auf Wand/TV
- ESC-Taste zum Beenden

### UI-Beispiel:

```
┌─────────────────────────────────┐
│  [Foto in Vollbild]              │
│                                 │
│  ⏮️  ⏸️  ⏭️                      │
│                                 │
│  Foto 12 von 45                 │
│  ⚙️ Einstellungen                │
│                                 │
│  [Fullscreen] [Exit]            │
└─────────────────────────────────┘
```

### Technische Umsetzung:

**Backend:**
```typescript
// packages/backend/src/index.ts

io.on('connection', (socket) => {
  socket.on('join:slideshow', (eventId: string) => {
    socket.join(`slideshow:${eventId}`);
  });
  
  // Wenn neues Foto hochgeladen wird:
  // io.to(`slideshow:${eventId}`).emit('new-photo', photo);
});
```

**Frontend:**
```typescript
// packages/frontend/src/app/live/[slug]/slideshow/page.tsx

useEffect(() => {
  socket.emit('join:slideshow', eventId);
  
  socket.on('new-photo', (photo) => {
    // Neues Foto sofort zur Slideshow hinzufügen
    setPhotos(prev => [photo, ...prev]);
  });
}, []);
```

---

## 🎨 OPTISCH: Design-System

### Design-System Modernisierung

#### Was ist ein Design-System?

Ein **Design-System** ist eine Sammlung von wiederverwendbaren Komponenten, Farben, Schriftarten und Regeln, die konsistent im gesamten Design verwendet werden.

#### Unsere Design-Tokens:

**Farben:**
```css
:root {
  /* Primary (Purple - Everlense-inspiriert) */
  --primary-50: #f3e8ff;
  --primary-500: #a855f7;
  --primary-600: #9333ea;
  --primary-700: #7e22ce;
  
  /* Oder Grün (aktuell) */
  --primary-500: #295B4D;
  --primary-600: #1e3d35;
  --accent: #EAA48F;
  
  /* Neutrals */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-500: #6b7280;
  --gray-900: #111827;
}
```

**Komponenten:**
- Buttons: `rounded-lg`, `shadow-md`
- Cards: `rounded-lg`, `shadow-md`, `p-6`
- Inputs: `rounded-md`, `border`, `focus:ring-2`

---

### Gastgeber kann eigenes Design machen

#### Was bedeutet das?

Der Gastgeber soll in den Event-Einstellungen **alle Design-Elemente anpassen** können:

#### 1. **Farben anpassen:**
```
┌─────────────────────────────────┐
│  Farben                         │
├─────────────────────────────────┤
│                                 │
│  Primärfarbe:                   │
│  [🎨 #a855f7] [Vorschau]       │
│                                 │
│  Sekundärfarbe:                 │
│  [🎨 #9333ea] [Vorschau]       │
│                                 │
│  Hintergrundfarbe:              │
│  [🎨 #ffffff] [Vorschau]       │
│                                 │
└─────────────────────────────────┘
```

#### 2. **Logo hochladen:**
```
┌─────────────────────────────────┐
│  Logo                            │
├─────────────────────────────────┤
│                                 │
│  [Aktuelles Logo]               │
│                                 │
│  [📷 Neues Logo hochladen]      │
│                                 │
│  Empfohlen: 200x200px, PNG      │
│                                 │
└─────────────────────────────────┘
```

#### 3. **Hintergrund:**
```
┌─────────────────────────────────┐
│  Hintergrund                     │
├─────────────────────────────────┤
│                                 │
│  ○ Farbe                        │
│    [🎨 #f9f5f2]                 │
│                                 │
│  ○ Bild                         │
│    [📷 Bild hochladen]          │
│                                 │
│  ○ Pattern                      │
│    [Muster auswählen]           │
│                                 │
└─────────────────────────────────┘
```

#### 4. **Schriftarten:**
```
┌─────────────────────────────────┐
│  Schriftarten                    │
├─────────────────────────────────┤
│                                 │
│  Überschriften:                  │
│  [Inter ▼]                      │
│                                 │
│  Text:                          │
│  [Inter ▼]                      │
│                                 │
└─────────────────────────────────┘
```

#### 5. **Komponenten-Stil:**
```
┌─────────────────────────────────┐
│  Komponenten                     │
├─────────────────────────────────┤
│                                 │
│  Button-Stil:                   │
│  ○ Rund (rounded-lg)           │
│  ○ Eckig (rounded-sm)          │
│                                 │
│  Border-Radius:                 │
│  [Slider: ████████░░] Medium   │
│                                 │
└─────────────────────────────────┘
```

#### Live-Vorschau:

```
┌─────────────────────────────────┐
│  Vorschau                        │
├─────────────────────────────────┤
│                                 │
│  [Live-Vorschau des Events]     │
│  Zeigt sofort wie es aussieht   │
│                                 │
│  [Vollbild-Vorschau]            │
│                                 │
└─────────────────────────────────┘
```

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
  logo: "https://storage.../logo.png",
  backgroundImage: "https://storage.../bg.jpg",
  borderRadius: "lg",
  buttonStyle: "rounded"
}
```

**Frontend:**
- CSS Variables werden dynamisch gesetzt
- Komponenten nutzen diese Variablen
- Änderungen sofort sichtbar

---

## 📱 Navigation

### Mobile: Bottom Navigation (wie Everlense)

**Aussehen:**
```
┌─────────────────────────────────┐
│                                 │
│  Content Area                   │
│                                 │
│                                 │
├─────────────────────────────────┤
│ [📷] [🏆] [▶️] [⚙️]            │ ← Fixed Bottom
│ Fotos Challenge Slideshow Einst │
└─────────────────────────────────┘
```

**Features:**
- Fixed am unteren Rand
- 4 Hauptbereiche
- Aktiver Bereich ist markiert
- Touch-optimiert (große Buttons)

### Desktop: Sidebar (wie qrFotos)

**Aussehen:**
```
┌───┬─────────────────────────────┐
│📷 │  Content Area              │
│🏆 │                            │
│▶️ │                            │
│⚙️ │                            │
│   │                            │
└───┴─────────────────────────────┘
```

**Features:**
- Fixed links
- Icons + Text
- Kollabierbar (nur Icons)
- Hover-Effekte

---

## 💌 Einladungskarte - Neue Anforderung

### Was ist eine Einladungskarte?

Eine **digitale Einladungskarte** ist eine schöne, gestaltete Seite, die Gäste per Link oder QR-Code öffnen können. Sie enthält alle wichtigen Event-Informationen.

### Vergleichsseiten-Analyse:

**Paperless Post Features:**
- ✅ Viele Vorlagen
- ✅ Anpassbare Farben
- ✅ RSVP-Funktion
- ✅ Countdown
- ✅ Karten-Design (wie echte Karte)
- ✅ Teilen-Funktion

**Everlense/qrFotos:**
- ✅ QR-Code auf Einladung
- ✅ Direkter Link zum Event
- ✅ Event-Informationen
- ✅ Design anpassbar

### Unsere Einladungskarte sollte enthalten:

#### 1. **Event-Informationen:**
- Event-Titel (groß, prominent)
- Datum & Uhrzeit
- Ort/Adresse
- Beschreibung
- Event-Logo/Bild

#### 2. **Design:**
- Anpassbar (Farben, Schriftarten)
- Vorlagen zur Auswahl
- Event-Logo integriert
- Hintergrundbild möglich

#### 3. **Interaktion:**
- QR-Code (führt direkt zum Event)
- "Zum Event" Button
- RSVP-Funktion (optional)
- Teilen-Funktion (WhatsApp, Email)

#### 4. **Responsive:**
- Mobile: Vertikal, wie echte Karte
- Desktop: Horizontal, wie echte Karte
- Druckbar (PDF-Export)

### UI-Beispiel:

```
┌─────────────────────────────────┐
│                                 │
│      [Event-Logo]               │
│                                 │
│    Lisa & Jan                   │
│    Hochzeit                      │
│                                 │
│    📅 15. Juni 2025             │
│    🕐 16:00 Uhr                 │
│    📍 Schlosspark, Berlin       │
│                                 │
│    Wir freuen uns auf euch!     │
│                                 │
│    ┌─────────────┐              │
│    │   [QR-Code] │              │
│    └─────────────┘              │
│                                 │
│    [Zum Event]                  │
│                                 │
│    [Teilen] [RSVP]              │
│                                 │
└─────────────────────────────────┘
```

### Technische Umsetzung:

**Backend:**
```typescript
// packages/backend/src/routes/events.ts

router.get('/:id/invitation', async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { host: true }
  });
  
  // Generiere QR-Code URL
  const eventUrl = `${process.env.FRONTEND_URL}/e/${event.slug}`;
  const qrCodeUrl = await generateQRCode(eventUrl);
  
  res.json({
    event: {
      title: event.title,
      dateTime: event.dateTime,
      locationName: event.locationName,
      description: event.description,
      logo: event.logo,
      designConfig: event.designConfig,
    },
    qrCodeUrl,
    eventUrl,
  });
});
```

**Frontend:**
```typescript
// packages/frontend/src/app/e/[slug]/invitation/page.tsx

// Schöne Einladungskarte mit:
// - Event-Info
// - QR-Code
// - Design anpassbar
// - Teilen-Funktion
// - RSVP (optional)
```

---

## 📋 Vollständige Feature-Liste

### Funktional (Backend + Frontend)

1. **Event-Modi System** ⭐⭐⭐
   - [ ] Backend: Modus-Logik in Photo-Route
   - [ ] Backend: Modus-Validierung
   - [ ] Backend: Guest-Filterung für COLLECT-Modus
   - [ ] Frontend: Modus-Auswahl UI (Radio-Buttons)
   - [ ] Frontend: Photo-Liste Filterung
   - [ ] Frontend: Info-Banner bei aktivem Modus

2. **Foto Challenge** ⭐⭐
   - [ ] Backend: Challenge Schema
   - [ ] Backend: Challenge API (CRUD)
   - [ ] Backend: Voting-System
   - [ ] Frontend: Challenge-Liste
   - [ ] Frontend: Challenge erstellen/bearbeiten
   - [ ] Frontend: Fotos zu Challenge hinzufügen
   - [ ] Frontend: Voting-UI
   - [ ] Frontend: Gewinner-Anzeige

3. **Voting-System** ⭐⭐
   - [ ] Backend: PhotoVote Schema
   - [ ] Backend: Like-API
   - [ ] Frontend: Like-Button
   - [ ] Frontend: Like-Count anzeigen
   - [ ] Frontend: "Beliebteste Fotos" Sektion

4. **Live Slideshow** ⭐
   - [ ] Backend: WebSocket Slideshow
   - [ ] Backend: Auto-Play Logic
   - [ ] Frontend: Fullscreen Slideshow
   - [ ] Frontend: Steuerung (Play/Pause, Vor/Zurück)
   - [ ] Frontend: Übergangseffekte

5. **Einladungskarte** ⭐⭐
   - [ ] Backend: Invitation API
   - [ ] Backend: QR-Code Generierung
   - [ ] Frontend: Einladungskarte-Design
   - [ ] Frontend: Vorlagen
   - [ ] Frontend: Design-Editor
   - [ ] Frontend: Teilen-Funktion
   - [ ] Frontend: PDF-Export (optional)

### Optisch (Frontend)

1. **Design-System** ⭐⭐⭐
   - [ ] Design-Tokens definieren
   - [ ] Komponenten-Library
   - [ ] Farb-Schema (anpassbar)
   - [ ] CSS Variables für dynamische Farben

2. **Gastgeber-Design-Editor** ⭐⭐⭐
   - [ ] Farb-Picker
   - [ ] Logo-Upload
   - [ ] Hintergrund-Editor
   - [ ] Schriftarten-Auswahl
   - [ ] Live-Vorschau
   - [ ] Vorlagen

3. **Navigation** ⭐⭐⭐
   - [ ] Bottom Navigation (Mobile)
   - [ ] Sidebar Navigation (Desktop)
   - [ ] Responsive Umschaltung
   - [ ] Active States
   - [ ] Icons

4. **Event-Header** ⭐⭐
   - [ ] Profilbild-Komponente
   - [ ] Event-Titel prominent
   - [ ] Event-Datum
   - [ ] Action Buttons
   - [ ] Responsive

5. **Album-Thumbnails** ⭐⭐
   - [ ] Grid-Layout (responsive)
   - [ ] Sort-Funktion
   - [ ] Add-Button
   - [ ] Hover-Effekte
   - [ ] Lazy Loading

6. **Event-Einstellungen UI** ⭐⭐⭐
   - [ ] Modus-Auswahl UI (Radio-Cards)
   - [ ] Design-Editor
   - [ ] Live-Vorschau
   - [ ] Klare Beschreibungen

---

## 🚀 Implementierungs-Reihenfolge

### Phase 1: Event-Modi System (1 Woche)
1. Backend: Modus-Logik
2. Frontend: Modus-Auswahl UI
3. Testing: Alle 4 Modi

### Phase 2: Design-System (1 Woche)
1. Design-Tokens
2. Komponenten-Library
3. Gastgeber-Design-Editor

### Phase 3: Navigation & Header (3 Tage)
1. Bottom Navigation
2. Sidebar Navigation
3. Event-Header

### Phase 4: Einladungskarte (1 Woche)
1. Backend: Invitation API
2. Frontend: Einladungskarte-Design
3. Vorlagen
4. QR-Code Integration

### Phase 5: Foto Challenge (2 Wochen)
1. Backend: Challenge System
2. Frontend: Challenge UI
3. Voting-System

### Phase 6: Live Slideshow (1 Woche)
1. Backend: WebSocket Slideshow
2. Frontend: Fullscreen Slideshow

---

**Dieser Plan kombiniert alle Features mit detaillierten Beschreibungen!** 🎯






