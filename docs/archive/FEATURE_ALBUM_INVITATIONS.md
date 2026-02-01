# Feature: Album-basierte Einladungen (#20)

## Status: Konzept dokumentiert, Implementierung ausstehend

## Problem
Der Host möchte verschiedene Gästegruppen zu verschiedenen Teilen eines Events einladen:
- Album 1: Trauung → Nur Familie
- Album 2: Essen → Familie + enge Freunde
- Album 3: Party → Alle Gäste

## Lösung

### 1. Schema-Erweiterung (Prisma)

```prisma
model Invitation {
  id           String   @id @default(uuid())
  eventId      String
  slug         String   @unique
  name         String
  config       Json?    @default("{}")
  passwordHash String?
  visibility   InvitationVisibility @default(UNLISTED)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // NEU: Einschränkung auf bestimmte Kategorien
  categoryIds  String[] @default([])  // Leer = alle Kategorien sichtbar
  
  event        Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  shortLinks   InvitationShortLink[]
  visits       InvitationVisit[]
  rsvps        InvitationRsvp[]

  @@index([eventId])
  @@map("invitations")
}
```

### 2. Backend-Änderungen

**invitations.ts:**
- `createInvitationSchema` erweitern um `categoryIds: z.array(z.string()).optional()`
- Beim Erstellen einer Einladung: `categoryIds` speichern
- Beim Abrufen der Einladung: Nur freigegebene Kategorien zurückgeben

**photos.ts / categories.ts:**
- Beim Laden von Fotos über Einladungs-Link: Filtern nach `categoryIds`
- Gäste sehen nur Fotos aus freigegebenen Kategorien

### 3. Frontend-Änderungen

**Einladungs-Erstellung (Host):**
```tsx
// Kategorie-Auswahl bei Einladungserstellung
<MultiSelect
  label="Sichtbare Alben"
  options={categories.map(c => ({ value: c.id, label: c.name }))}
  value={selectedCategoryIds}
  onChange={setSelectedCategoryIds}
  placeholder="Alle Alben (Standard)"
/>
```

**Gästeseite:**
- Nur Kategorien anzeigen, die in der Einladung freigegeben sind
- "Alle Fotos" zeigt nur Fotos aus freigegebenen Kategorien

### 4. UX-Flow

1. Host erstellt Event mit 3 Alben: Trauung, Essen, Party
2. Host erstellt Einladung "Familie" → Alle 3 Alben freigegeben
3. Host erstellt Einladung "Bekannte" → Nur "Party" freigegeben
4. Gast mit "Familie"-Link sieht alle 3 Alben
5. Gast mit "Bekannte"-Link sieht nur "Party"

### 5. Aufwand

- Schema-Migration: 30 Min
- Backend-API: 2 Stunden
- Frontend-UI: 3 Stunden
- Testing: 1 Stunde

**Gesamt: ~6-7 Stunden**

### 6. Abhängigkeiten

- Bestehende Kategorie-Logik
- Einladungs-System
- Gäste-Zugangs-Cookie-System

## Nächste Schritte

1. [ ] Schema-Migration erstellen
2. [ ] Backend-API erweitern
3. [ ] Frontend Einladungs-Erstellung anpassen
4. [ ] Gästeseite Kategorie-Filter implementieren
5. [ ] E2E-Tests schreiben
