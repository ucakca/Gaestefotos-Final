# 🎨 Funktionaler & Optischer Entwicklungsplan

**Datum:** 2025-12-09  
**Basierend auf:** qrFotos.de + Everlense.de Analyse

---

## 📊 Analyse-Zusammenfassung

### qrFotos.de (Desktop-Fokus)
- ✅ 4 Event-Modi (Standard, Moderation, Foto Sammeln, Nur Ansicht)
- ✅ Foto Challenge (Gamification)
- ✅ Video-Upload
- ✅ Unteralben
- ✅ Klare Sidebar-Navigation
- ✅ Viele konfigurierbare Optionen

### Everlense.de (Mobile-First)
- ✅ Modernes Purple/Weiß Design
- ✅ Bottom Navigation Bar
- ✅ Challenge Feature
- ✅ Live Slideshow
- ✅ Album-Thumbnails mit Sort-Funktion
- ✅ "Start Setup" Wizard
- ✅ Profilbild + Event-Namen prominent
- ✅ "Invite Guests" Feature
- ✅ Sehr cleanes, modernes UI

---

## 🎯 Kombinierter Entwicklungsplan

### Phase 1: Funktionale Features (Backend + Frontend)

#### 1.1 Event-Modi System ⭐⭐⭐ **PRIORITÄT 1**

**Ziel:** 4 klar definierte Modi wie qrFotos

**Backend-Änderungen:**
```typescript
// packages/backend/prisma/schema.prisma
// Erweitere featuresConfig
featuresConfig Json @default("{
  \"mode\": \"STANDARD\",
  \"showGuestlist\": true,
  \"mysteryMode\": false,
  \"allowUploads\": true,
  \"moderationRequired\": false,
  \"allowDownloads\": true
}")

// Event-Modi:
// - STANDARD: Alle können hochladen und sehen
// - MODERATION: Uploads müssen freigegeben werden
// - COLLECT: Gäste sehen nur eigene Fotos, Host sieht alle
// - VIEW_ONLY: Keine Uploads, nur Ansehen
```

**Backend-Logik:**
```typescript
// packages/backend/src/routes/photos.ts
router.get('/:eventId/photos', async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { 
      featuresConfig: true, 
      hostId: true 
    }
  });
  
  const mode = (event.featuresConfig as any)?.mode || 'STANDARD';
  const isHost = req.userId === event.hostId;
  const isGuest = req.userRole === 'GUEST';
  
  const where: any = { eventId };
  
  // Foto Sammeln Modus
  if (mode === 'COLLECT' && !isHost) {
    // Gäste sehen nur eigene Fotos
    where.guestId = req.userId;
  }
  
  // Moderation Modus
  if (mode === 'MODERATION' && !isHost) {
    where.status = 'APPROVED';
  }
  
  // View Only Modus
  if (mode === 'VIEW_ONLY' && !isHost) {
    // Gäste können keine Uploads machen (wird im Frontend gehandhabt)
  }
  
  // ... rest of query
});
```

**Frontend-UI:**
```typescript
// packages/frontend/src/app/events/[id]/edit/page.tsx
// Prominente Modus-Auswahl mit Radio-Buttons
<Card>
  <CardHeader>
    <CardTitle>Event-Modus</CardTitle>
    <CardDescription>
      Wähle, wie Gäste mit Fotos interagieren können
    </CardDescription>
  </CardHeader>
  <CardContent>
    <RadioGroup value={mode} onValueChange={setMode}>
      <div className="space-y-3">
        <RadioCard value="STANDARD">
          <div className="flex items-start gap-3">
            <RadioButton />
            <div>
              <div className="font-semibold">Standard</div>
              <div className="text-sm text-gray-500">
                Gäste können Fotos hochladen und alle Fotos im Album sehen
              </div>
            </div>
          </div>
        </RadioCard>
        
        <RadioCard value="MODERATION">
          <div className="flex items-start gap-3">
            <RadioButton />
            <div>
              <div className="font-semibold">Moderation</div>
              <div className="text-sm text-gray-500">
                Uploads müssen erst von dir freigegeben werden, bevor andere sie sehen
              </div>
            </div>
          </div>
        </RadioCard>
        
        <RadioCard value="COLLECT">
          <div className="flex items-start gap-3">
            <RadioButton />
            <div>
              <div className="font-semibold">Foto Sammeln</div>
              <div className="text-sm text-gray-500">
                Gäste können hochladen, sehen aber nur ihre eigenen Fotos. Du siehst alle.
              </div>
            </div>
          </div>
        </RadioCard>
        
        <RadioCard value="VIEW_ONLY">
          <div className="flex items-start gap-3">
            <RadioButton />
            <div>
              <div className="font-semibold">Nur Ansicht</div>
              <div className="text-sm text-gray-500">
                Gäste können keine Fotos hochladen, nur das Album ansehen
              </div>
            </div>
          </div>
        </RadioCard>
      </div>
    </RadioGroup>
  </CardContent>
</Card>
```

#### 1.2 Foto Challenge System ⭐⭐ **PRIORITÄT 2**

**Backend-Schema:**
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

**Frontend-UI:**
- Challenge-Liste im Event
- Challenge erstellen/bearbeiten
- Fotos zu Challenge hinzufügen
- Voting-System
- Gewinner-Anzeige

#### 1.3 Live Slideshow ⭐ **PRIORITÄT 3**

**Backend:**
- WebSocket-basierte Slideshow
- Automatischer Wechsel alle X Sekunden
- Filter: Nur APPROVED Fotos
- Sortierung: Neueste zuerst / Zufällig

**Frontend:**
- Fullscreen Slideshow
- Steuerung: Play/Pause, Vor/Zurück
- Auto-Play Option
- Übergangseffekte

---

### Phase 2: Optische Verbesserungen (UI/UX)

#### 2.1 Modernes Design-System ⭐⭐⭐ **PRIORITÄT 1**

**Inspiration von Everlense:**
- Purple/Weiß Farbschema (oder anpassbar)
- Rounded Corners überall
- Moderne Icons
- Klare Typografie

**Design-Tokens:**
```typescript
// packages/frontend/src/styles/design-tokens.css
:root {
  /* Primary Colors (Everlense-inspiriert) */
  --color-primary-50: #f3e8ff;
  --color-primary-100: #e9d5ff;
  --color-primary-500: #a855f7; /* Purple */
  --color-primary-600: #9333ea;
  --color-primary-700: #7e22ce;
  
  /* Neutral Colors */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-500: #6b7280;
  --color-gray-900: #111827;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

#### 2.2 Mobile-First Navigation ⭐⭐⭐ **PRIORITÄT 1**

**Bottom Navigation Bar (wie Everlense):**
```typescript
// packages/frontend/src/components/BottomNavigation.tsx
export default function BottomNavigation({ eventId }: { eventId: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        <NavLink href={`/e/${eventId}`} icon={<PhotoIcon />} label="Fotos" />
        <NavLink href={`/e/${eventId}/challenges`} icon={<TrophyIcon />} label="Challenges" />
        <NavLink href={`/e/${eventId}/slideshow`} icon={<PlayIcon />} label="Slideshow" />
        <NavLink href={`/e/${eventId}/settings`} icon={<SettingsIcon />} label="Einstellungen" />
      </div>
    </nav>
  );
}
```

**Desktop: Sidebar Navigation (wie qrFotos):**
```typescript
// packages/frontend/src/components/EventSidebar.tsx
// Sidebar für Desktop, Bottom Nav für Mobile
```

#### 2.3 Event-Header mit Profilbild ⭐⭐ **PRIORITÄT 2**

**Inspiration von Everlense:**
```typescript
// packages/frontend/src/components/EventHeader.tsx
<div className="flex flex-col items-center py-8">
  {/* Profilbild */}
  <div className="relative">
    <img 
      src={event.logo || defaultLogo} 
      alt={event.title}
      className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
    />
    <button className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-2 shadow-md">
      <CameraIcon className="w-4 h-4" />
    </button>
  </div>
  
  {/* Event-Titel */}
  <h1 className="text-2xl font-bold mt-4">{event.title}</h1>
  
  {/* Event-Datum */}
  {event.dateTime && (
    <p className="text-gray-500 mt-1">
      {formatDate(event.dateTime)}
    </p>
  )}
  
  {/* Action Buttons */}
  <div className="flex gap-3 mt-6">
    <Button variant="primary" size="lg">
      Start Setup
    </Button>
    <Button variant="outline" size="lg">
      <UserPlusIcon className="w-4 h-4 mr-2" />
      Gäste einladen
    </Button>
  </div>
</div>
```

#### 2.4 Album-Thumbnails mit Sort-Funktion ⭐⭐ **PRIORITÄT 2**

**Inspiration von Everlense:**
```typescript
// packages/frontend/src/components/AlbumThumbnails.tsx
<div className="space-y-4">
  {/* Header mit Sort */}
  <div className="flex justify-between items-center">
    <h2 className="text-xl font-semibold">Neues Album</h2>
    <Select value={sortBy} onValueChange={setSortBy}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">Neueste</SelectItem>
        <SelectItem value="oldest">Älteste</SelectItem>
        <SelectItem value="random">Zufällig</SelectItem>
      </SelectContent>
    </Select>
  </div>
  
  {/* Thumbnail Grid */}
  <div className="grid grid-cols-4 gap-2">
    {/* Add Button */}
    <button className="aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors">
      <PlusIcon className="w-8 h-8 text-gray-400" />
      <span className="text-xs text-gray-500 mt-1">Fotos hinzufügen</span>
    </button>
    
    {/* Photo Thumbnails */}
    {photos.map(photo => (
      <img 
        key={photo.id}
        src={photo.thumbnailUrl}
        alt=""
        className="aspect-square object-cover rounded-lg"
      />
    ))}
  </div>
</div>
```

#### 2.5 Setup Wizard ⭐ **PRIORITÄT 3**

**Inspiration von Everlense "Start Setup":**
```typescript
// packages/frontend/src/app/events/new/setup/page.tsx
// Schritt-für-Schritt Wizard:
// 1. Event-Details (Titel, Datum, Ort)
// 2. Event-Modus wählen
// 3. Design anpassen
// 4. Gäste einladen
// 5. Fertig!
```

---

### Phase 3: Kombinierte Features

#### 3.1 Verbesserte Event-Einstellungen Seite

**Layout (Kombination beider):**
- **Desktop:** Sidebar-Navigation (qrFotos-Style)
- **Mobile:** Bottom Navigation (Everlense-Style)
- **Content:** Moderne Cards mit klaren Optionen

**Struktur:**
```
Event-Einstellungen
├── Allgemein
│   ├── Titel & Beschreibung
│   ├── Datum & Ort
│   └── Profilbild/Logo
├── Event-Modus ⭐ NEU
│   ├── Standard
│   ├── Moderation
│   ├── Foto Sammeln ⭐ NEU
│   └── Nur Ansicht
├── Design
│   ├── Farb Schema
│   ├── Logo
│   └── Hintergrund
├── Features
│   ├── Foto Challenge ⭐ NEU
│   ├── Live Slideshow ⭐ NEU
│   ├── Video-Upload (später)
│   └── Download-Kontrolle
└── Gäste
    ├── Gästeliste
    ├── Einladungen versenden
    └── Zugriffsrechte
```

---

## 🎨 Design-System Spezifikation

### Farben

**Primary (Purple - Everlense-inspiriert):**
- Primary-50: `#f3e8ff`
- Primary-500: `#a855f7`
- Primary-600: `#9333ea`
- Primary-700: `#7e22ce`

**Alternative (Grün - aktuell):**
- Primary-500: `#295B4D` (aktuell)
- Primary-600: `#1e3d35`

**Neutrals:**
- Gray-50: `#f9fafb`
- Gray-100: `#f3f4f6`
- Gray-500: `#6b7280`
- Gray-900: `#111827`

### Typografie

- **Headings:** Inter, Bold
- **Body:** Inter, Regular
- **Sizes:** 
  - H1: 2rem (32px)
  - H2: 1.5rem (24px)
  - Body: 1rem (16px)
  - Small: 0.875rem (14px)

### Komponenten

**Buttons:**
- Primary: Purple background, white text, rounded-lg
- Secondary: White background, purple border, rounded-lg
- Ghost: Transparent, purple text

**Cards:**
- White background
- Rounded-lg
- Shadow-md
- Padding: 1.5rem

**Inputs:**
- Rounded-md
- Border: gray-300
- Focus: purple-500 ring

---

## 📱 Responsive Design

### Mobile (< 768px)
- Bottom Navigation Bar
- Full-width Cards
- Stacked Layout
- Touch-optimierte Buttons (min 44px)

### Tablet (768px - 1024px)
- Sidebar Navigation (kollabierbar)
- 2-Column Layout
- Hybrid Navigation

### Desktop (> 1024px)
- Sidebar Navigation (immer sichtbar)
- 3-Column Layout
- Hover-Effekte

---

## 🚀 Implementierungs-Roadmap

### Sprint 1 (1-2 Wochen): Event-Modi System
- [ ] Backend: Modus-Logik implementieren
- [ ] Frontend: Modus-Auswahl UI
- [ ] Frontend: Photo-Liste Filterung
- [ ] Testing: Alle 4 Modi

### Sprint 2 (1-2 Wochen): Design-System
- [ ] Design-Tokens definieren
- [ ] Komponenten-Library erstellen
- [ ] Event-Header mit Profilbild
- [ ] Bottom Navigation (Mobile)
- [ ] Sidebar Navigation (Desktop)

### Sprint 3 (2-3 Wochen): Foto Challenge
- [ ] Backend: Challenge Schema
- [ ] Backend: Challenge API
- [ ] Frontend: Challenge UI
- [ ] Frontend: Voting-System

### Sprint 4 (1-2 Wochen): Live Slideshow
- [ ] Backend: WebSocket Slideshow
- [ ] Frontend: Fullscreen Slideshow
- [ ] Frontend: Steuerung

### Sprint 5 (1 Woche): Polish & Testing
- [ ] UI/UX Verbesserungen
- [ ] Mobile Optimierung
- [ ] Performance-Testing
- [ ] Bug-Fixes

---

## 📊 Prioritäten-Matrix

| Feature | Funktional | Optisch | Priorität | Aufwand |
|---------|------------|---------|-----------|---------|
| Event-Modi System | ⭐⭐⭐ | ⭐⭐ | 🔴 Hoch | 2 Wochen |
| Design-System | ⭐ | ⭐⭐⭐ | 🔴 Hoch | 2 Wochen |
| Foto Sammeln Modus | ⭐⭐⭐ | ⭐ | 🔴 Hoch | 3 Tage |
| Bottom Navigation | ⭐ | ⭐⭐⭐ | 🟡 Mittel | 2 Tage |
| Event-Header | ⭐ | ⭐⭐ | 🟡 Mittel | 2 Tage |
| Foto Challenge | ⭐⭐⭐ | ⭐⭐ | 🟡 Mittel | 2 Wochen |
| Live Slideshow | ⭐⭐ | ⭐⭐ | 🟢 Niedrig | 1 Woche |
| Album Thumbnails | ⭐ | ⭐⭐ | 🟢 Niedrig | 2 Tage |

---

## 🎯 Quick Wins (Sofort umsetzbar)

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
   - Action Buttons

---

## 💡 Besondere Highlights

### Was uns auszeichnet:

1. **WordPress-Integration** ✅
   - Einzigartig im Markt
   - Einfaches Onboarding

2. **Moderne Architektur** ✅
   - Next.js, TypeScript
   - API-First
   - Skalierbar

3. **Sicherheit** ✅
   - Rate Limiting
   - File Upload Security
   - WebP Support

4. **Kombiniertes Best-of-Both** ⭐
   - qrFotos Features + Everlense Design
   - Desktop + Mobile optimiert

---

## 📝 Nächste Schritte

1. **Sofort starten:**
   - Foto Sammeln Modus implementieren
   - Design-System definieren

2. **Kurzfristig:**
   - Bottom Navigation
   - Event-Header
   - Modus-Auswahl UI

3. **Mittelfristig:**
   - Foto Challenge
   - Live Slideshow
   - Video-Upload

---

**Dieser Plan kombiniert die besten Features von qrFotos.de (Funktionalität) und Everlense.de (Design) zu einer modernen, vollständigen Lösung!** 🚀






