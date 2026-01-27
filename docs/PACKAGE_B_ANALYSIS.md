# Package B: Feature-Erweiterungen - Detaillierte Analyse

**Datum:** 23. Januar 2026, 22:50 Uhr  
**Status:** 🔍 In Analyse

---

## Übersicht

Package B erweitert die bestehende Architektur mit neuen Features ohne Breaking Changes.

**Aus Architecture Audit:**
1. Gästegruppen-System
2. Dynamische Einladungsseiten
3. QR-Code Designer UI (User-Kritik berücksichtigen)
4. Galerie-Verbesserungen (Masonry, Swipe)

---

## 1. Gästegruppen-System

### 🔍 Aktuelle Situation

**Prisma Schema Analyse:**
```prisma
model Guest {
  id                   String   @id @default(uuid())
  eventId              String
  firstName            String
  lastName             String
  email                String?
  status               GuestStatus @default(PENDING)
  // ... weitere Felder
  // ❌ KEIN groupId oder Gruppen-Relation
}
```

**Ergebnis:** ❌ Gästegruppen-System existiert NICHT

### ✅ Erforderliche Implementierung

#### 1.1 Database Schema
```prisma
model GuestGroup {
  id          String   @id @default(uuid())
  eventId     String
  name        String
  description String?
  color       String?  // Für UI-Kennzeichnung
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  guests      Guest[]
  invitations InvitationGroupLink[]
  
  @@index([eventId])
  @@map("guest_groups")
}

// Guest-Erweiterung
model Guest {
  // ... existing fields
  groupId     String?
  group       GuestGroup? @relation(fields: [groupId], references: [id])
  @@index([groupId])
}

// Invitation-Gruppen-Verknüpfung
model InvitationGroupLink {
  id           String      @id @default(uuid())
  invitationId String
  groupId      String
  invitation   Invitation  @relation(fields: [invitationId], references: [id], onDelete: Cascade)
  group        GuestGroup  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  
  @@unique([invitationId, groupId])
  @@map("invitation_group_links")
}
```

#### 1.2 Backend API Routes
```typescript
// packages/backend/src/routes/guestGroups.ts

GET    /events/:eventId/guest-groups           // Liste aller Gruppen
POST   /events/:eventId/guest-groups           // Gruppe erstellen
PUT    /events/:eventId/guest-groups/:groupId  // Gruppe bearbeiten
DELETE /events/:eventId/guest-groups/:groupId  // Gruppe löschen
PUT    /events/:eventId/guests/:guestId/group  // Gast zu Gruppe zuweisen
```

#### 1.3 Frontend UI
- Gruppen-Verwaltung im Event-Dashboard
- Drag & Drop: Gäste zu Gruppen zuweisen
- Farb-Coding für visuelle Unterscheidung
- Bulk-Operationen (alle Gäste einer Gruppe)

### 📊 Aufwand
- **Database:** 2h (Migration, Models)
- **Backend:** 3h (Routes, Service, Validation)
- **Frontend:** 4h (UI, Drag & Drop, Bulk-Actions)
- **Gesamt:** ~9h

---

## 2. Dynamische Einladungsseiten

### 🔍 Aktuelle Situation

**Prisma Schema:**
```prisma
model Invitation {
  id           String   @id @default(uuid())
  eventId      String
  slug         String   @unique
  name         String
  config       Json?    @default("{}")  // ⚠️ Generic JSON
  // ...
}
```

**Analyse:** Einladungen existieren, aber Content ist generisch in JSON.

### ❌ Fehlendes System

**Erforderlich (laut ANALYSIS_DYNAMIC_INVITATIONS.md):**
- Gruppenspezifische Inhalte
- Sektionen (Timeline, Location, RSVP, Menu, etc.)
- Drag & Drop Sektionen-Reihenfolge
- Conditional Content (nur für bestimmte Gruppen sichtbar)

### ✅ Erforderliche Implementierung

#### 2.1 Database Schema
```prisma
model InvitationSection {
  id           String   @id @default(uuid())
  invitationId String
  type         SectionType  // TIMELINE, LOCATION, RSVP, MENU, TEXT, IMAGE
  order        Int
  isActive     Boolean  @default(true)
  config       Json     // Section-spezifische Config
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  invitation   Invitation @relation(fields: [invitationId], references: [id], onDelete: Cascade)
  contents     InvitationContent[]
  
  @@index([invitationId])
  @@map("invitation_sections")
}

model InvitationContent {
  id        String   @id @default(uuid())
  sectionId String
  groupId   String?  // null = für alle Gruppen sichtbar
  content   Json     // Gruppenspezifischer Content
  
  section   InvitationSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  group     GuestGroup?       @relation(fields: [groupId], references: [id])
  
  @@index([sectionId])
  @@index([groupId])
  @@map("invitation_contents")
}

enum SectionType {
  TIMELINE
  LOCATION
  RSVP
  MENU
  TEXT
  IMAGE
  GALLERY
  GUESTBOOK
}
```

#### 2.2 Backend API
```typescript
// packages/backend/src/routes/invitationSections.ts

GET    /invitations/:invitationId/sections           // Liste
POST   /invitations/:invitationId/sections           // Erstellen
PUT    /invitations/:invitationId/sections/:id       // Bearbeiten
DELETE /invitations/:invitationId/sections/:id       // Löschen
PUT    /invitations/:invitationId/sections/reorder   // Reihenfolge

// Content pro Gruppe
POST   /invitations/:invitationId/sections/:id/content  // Content erstellen
PUT    /invitations/:invitationId/sections/:id/content/:contentId  // Bearbeiten
```

#### 2.3 Frontend UI
- Sektionen-Editor mit Drag & Drop
- Gruppen-Selector pro Content
- Live-Preview
- Template-System (vordefinierte Sektionen)

### 📊 Aufwand
- **Database:** 3h
- **Backend:** 5h
- **Frontend:** 8h (Editor ist komplex)
- **Gesamt:** ~16h

---

## 3. QR-Code Designer UI

### 🔍 User-Kritik (Memory)

**Probleme:**
1. Design nicht einheitlich mit Event-Wizard
2. Keine Live-Vorschau
3. Kein Download möglich
4. Kein Foto-Upload

### ✅ Erforderliche Fixes

#### 3.1 Zweispaltiges Layout
```typescript
// packages/frontend/src/app/events/[id]/qr-styler/page.tsx

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div className="order-2 lg:order-1">
    {/* Editor Panel */}
    <QREditorPanel />
  </div>
  <div className="order-1 lg:order-2 sticky top-4">
    {/* Live Preview */}
    <QRPreviewPanel />
  </div>
</div>
```

#### 3.2 Live-Vorschau
- Echtzeit-Rendering bei Config-Änderung
- SVG-basiert (skalierbar)
- Template-Preview

#### 3.3 Download-Funktionalität
```typescript
// Bereits vorhanden in Backend:
POST /api/events/:id/qr/export.pdf
POST /api/events/:id/qr/export.svg
POST /api/events/:id/qr/export.png

// Frontend: Download-Buttons funktional machen
```

#### 3.4 Foto-Upload
- Logo-Upload für QR-Code
- Center-Logo (Brand)
- Background-Image Option

### 📊 Aufwand
- **Layout:** 2h
- **Live-Preview:** 3h
- **Download:** 1h (bereits im Backend)
- **Foto-Upload:** 2h
- **Gesamt:** ~8h

---

## 4. Galerie-Verbesserungen

### 🔍 Aktuelle Situation

**Gallery.tsx:** Standard Grid (2/3/4 Spalten)  
**ModernPhotoGrid.tsx:** Advanced mit Reactions, Comments

### ✅ Erforderliche Features

#### 4.1 Masonry-Layout
```typescript
// Option 1: react-masonry-css (leichtgewichtig)
// Option 2: Custom CSS Grid Masonry (experimentell)

<Masonry
  breakpointCols={{ default: 4, 1024: 3, 768: 2 }}
  className="masonry-grid"
  columnClassName="masonry-column"
>
  {photos.map(photo => <PhotoCard />)}
</Masonry>
```

#### 4.2 Infinite Scroll
```typescript
import { useInView } from 'react-intersection-observer';

const { ref, inView } = useInView();

useEffect(() => {
  if (inView && hasMore && !loading) {
    loadMore();
  }
}, [inView]);

<div ref={ref} />  // Trigger-Element
```

#### 4.3 Swipe-Gesten
```typescript
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => nextPhoto(),
  onSwipedRight: () => prevPhoto(),
});

<div {...handlers}>
  <img src={photo.url} />
</div>
```

### 📊 Aufwand
- **Masonry:** 3h
- **Infinite Scroll:** 2h
- **Swipe:** 2h
- **Gesamt:** ~7h

---

## 📋 Package B Gesamt-Übersicht

| Feature | Aufwand | Risiko | Prio |
|---------|---------|--------|------|
| **1. Gästegruppen** | 9h | Mittel | Hoch |
| **2. Dynamische Einladungen** | 16h | Mittel | Hoch |
| **3. QR-Designer Fixes** | 8h | Niedrig | Hoch |
| **4. Galerie-Verbesserungen** | 7h | Niedrig | Mittel |

**Gesamt:** ~40 Stunden (1 Woche Vollzeit)

---

## 🎯 Empfohlene Reihenfolge

**Phase 1: Quick Wins (1-2 Tage)**
1. QR-Designer Fixes (8h) - User-Kritik beheben
2. Galerie-Verbesserungen (7h) - Sichtbare UX-Verbesserung

**Phase 2: Foundation (2-3 Tage)**
3. Gästegruppen-System (9h) - Basis für Einladungen

**Phase 3: Advanced (3-4 Tage)**
4. Dynamische Einladungen (16h) - Komplex, nutzt Gästegruppen

---

**Status:** ✅ Analyse abgeschlossen  
**Nächster Schritt:** Entscheidung User - mit welchem Feature beginnen?
