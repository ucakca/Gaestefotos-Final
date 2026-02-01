# 🧙 Event-Wizard Spezifikation

**Version:** 1.0  
**Erstellt:** 2026-01-11  
**Status:** Bereit zur Implementation

---

## Übersicht

| Variante | Steps | Zeit | Zielgruppe |
|----------|-------|------|------------|
| **Quick-Start** | 5 Steps | ~2 Min | "Schnell loslegen" |
| **Vollständig** | 9 Steps | ~5 Min | "Alles einrichten" |

---

## Event-Typen & Presets

### Hauptkategorien (6)

```typescript
const EVENT_CATEGORIES = {
  wedding: { icon: 'Rings', label: 'Hochzeit', color: 'rose' },
  family: { icon: 'Baby', label: 'Familie', color: 'sky' },
  milestone: { icon: 'GraduationCap', label: 'Meilenstein', color: 'amber' },
  business: { icon: 'Briefcase', label: 'Business', color: 'slate' },
  party: { icon: 'PartyPopper', label: 'Party', color: 'violet' },
  custom: { icon: 'Sparkles', label: 'Sonstiges', color: 'emerald' },
};
```

### Untertypen (bei Hochzeit & Familie)

```typescript
const WEDDING_SUBTYPES = [
  { id: 'civil', label: 'Standesamtliche Trauung' },
  { id: 'church', label: 'Kirchliche Hochzeit' },
  { id: 'henna', label: 'Henna-Nacht / Kına Gecesi' },
  { id: 'mehndi', label: 'Mehndi / Sangeet' },
  { id: 'polterabend', label: 'Polterabend' },
  { id: 'rehearsal', label: 'Rehearsal Dinner' },
];

const FAMILY_SUBTYPES = [
  { id: 'baptism', label: 'Taufe' },
  { id: 'birthday', label: 'Geburtstag' },
  { id: 'kids_birthday', label: 'Kindergeburtstag' },
  { id: 'bar_mitzvah', label: 'Bar/Bat Mizwa' },
  { id: 'aqiqa', label: 'Aqiqa / Sünnet' },
  { id: 'anniversary', label: 'Jubiläum' },
];
```

---

## Album-Presets

```typescript
const ALBUM_PRESETS = {
  wedding: [
    { id: 'story', icon: 'BookOpen', label: 'Unsere Geschichte', hostOnly: true,
      hint: 'Perfekt für Kinderfotos oder Verlobungsbilder vorab' },
    { id: 'ceremony', icon: 'Church', label: 'Zeremonie', default: true },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', default: true },
    { id: 'portraits', icon: 'Camera', label: 'Portraits', default: true },
    { id: 'henna', icon: 'Sparkles', label: 'Henna-Nacht', default: false },
    { id: 'polterabend', icon: 'Beer', label: 'Polterabend', default: false },
  ],
  
  family: [
    { id: 'ceremony', icon: 'Church', label: 'Zeremonie', default: true },
    { id: 'family', icon: 'Users', label: 'Familie', default: true },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', default: true },
    { id: 'portraits', icon: 'Camera', label: 'Portraits', default: true },
  ],
  
  milestone: [
    { id: 'ceremony', icon: 'Award', label: 'Zeremonie', default: true },
    { id: 'people', icon: 'Users', label: 'Familie & Freunde', default: true },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', default: true },
  ],
  
  business: [
    { id: 'program', icon: 'Presentation', label: 'Programm', default: true },
    { id: 'networking', icon: 'Handshake', label: 'Networking', default: true },
    { id: 'team', icon: 'Users', label: 'Team', default: true },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', default: false },
  ],
  
  party: [
    { id: 'vibes', icon: 'Music', label: 'Stimmung', default: true },
    { id: 'highlights', icon: 'Star', label: 'Highlights', default: true },
    { id: 'guests', icon: 'Users', label: 'Gäste', default: true },
  ],
  
  custom: [
    { id: 'general', icon: 'Images', label: 'Allgemein', default: true },
  ],
};
```

---

## Challenge-Presets

```typescript
const CHALLENGE_PRESETS = {
  wedding: [
    { label: 'Selfie mit dem Brautpaar', icon: 'Camera', default: true },
    { label: 'Bester Tanz-Moment', icon: 'Music', default: true },
    { label: 'Anstoßen!', icon: 'Wine', default: true },
    { label: 'Das schönste Outfit', icon: 'Shirt', default: false },
    { label: 'Lustigstes Foto des Abends', icon: 'Laugh', default: false },
    { label: 'Längstes Ehepaar auf der Feier', icon: 'Heart', default: false },
  ],
  
  family: [
    { label: 'Familien-Selfie', icon: 'Users', default: true },
    { label: 'Generationen-Foto', icon: 'Heart', default: true },
    { label: 'Beste Party-Stimmung', icon: 'PartyPopper', default: false },
  ],
  
  business: [
    { label: 'Networking-Moment', icon: 'Handshake', default: true },
    { label: 'Team-Foto', icon: 'Users', default: true },
    { label: 'Bester Vortrag', icon: 'Presentation', default: false },
  ],
  
  party: [
    { label: 'Gruppen-Selfie', icon: 'Users', default: true },
    { label: 'Party-Stimmung', icon: 'Music', default: true },
    { label: 'Prost!', icon: 'Beer', default: true },
  ],
};
```

---

## Wizard Steps (Detail)

### STEP 1: Event-Typ

```
┌─────────────────────────────────────────────────────────────┐
│  Was feierst du?                                            │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │   💍    │  │   👶    │  │   🎓    │                      │
│  │Hochzeit │  │ Familie │  │Meilenstein│                    │
│  └─────────┘  └─────────┘  └─────────┘                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │   🏢    │  │   🥳    │  │   ✨    │                      │
│  │Business │  │  Party  │  │Sonstiges│                      │
│  └─────────┘  └─────────┘  └─────────┘                      │
│                                                             │
│  [Bei Hochzeit/Familie → Untertyp-Auswahl einblenden]       │
└─────────────────────────────────────────────────────────────┘
```

**State Output:**
```typescript
{ eventType: 'wedding', eventSubtype: 'henna' | null }
```

---

### STEP 2: Name & Datum

```
┌─────────────────────────────────────────────────────────────┐
│  Wie heißt dein Event?                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Sarah & Marc heiraten                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Wann findet es statt?                                      │
│  📅 [15.03.2026]     🕐 [14:00] (optional)                  │
│                                                             │
│  📍 Wo? (optional)                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Schloss Schönbrunn, Wien                            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**State Output:**
```typescript
{ title: string, dateTime: Date, location?: string }
```

---

### STEP 3: Design (Magic Moment)

```
┌─────────────────────────────────────────────────────────────┐
│  Gestalte dein Event                                        │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐    ┌─────────────┐     │
│  │              │   │              │    │ 📱 PREVIEW  │     │
│  │  Titelbild   │   │  Profilbild  │    │ ┌─────────┐ │     │
│  │   + Upload   │   │   + Upload   │    │ │ Sarah & │ │     │
│  │              │   │              │    │ │  Marc   │ │     │
│  └──────────────┘   └──────────────┘    │ └─────────┘ │     │
│                                          └─────────────┘     │
│  🎨 Farbschema                                              │
│  ○ Elegant   ● Romantisch   ○ Modern   ○ Bunt               │
└─────────────────────────────────────────────────────────────┘
```

**🎯 UX-Optimierung "Magic Moment":**
- Bei Bild-Upload: Preview "shimmert" kurz auf (CSS animation: pulse/glow)
- Emotionale Bindung: "Das ist MEINE App"

**State Output:**
```typescript
{ coverImage?: File, profileImage?: File, colorScheme: string }
```

---

### STEP 4: Alben

```
┌─────────────────────────────────────────────────────────────┐
│  In welche Alben sollen die Fotos?                          │
│                                                             │
│  ☑️ 📖 Unsere Geschichte     🔒 Nur du                      │
│     💡 Perfekt für Kinderfotos oder Verlobungsbilder vorab  │
│                                                             │
│  ☑️ 💒 Zeremonie                                            │
│  ☑️ 🎉 Feier                                                │
│  ☑️ 📸 Portraits                                            │
│  ☐ 🎭 Henna-Nacht                                           │
│                                                             │
│  [+ Eigenes Album]                                          │
└─────────────────────────────────────────────────────────────┘
```

**🎯 UX-Optimierung "Inhalts-Versprechen":**
- Bei "Unsere Geschichte": Hint-Text zeigen
- Motiviert Host, App VOR dem Event zu nutzen

**State Output:**
```typescript
{ albums: Array<{ id: string, label: string, hostOnly: boolean }> }
```

---

### STEP 5: Gäste-Zugang (Gabelung)

```
┌─────────────────────────────────────────────────────────────┐
│  Wie sollen Gäste beitreten?                                │
│                                                             │
│  🔐 Event-Passwort                                          │
│  ┌────────────────────────────────┐ 👁️                      │
│  │ LiebeSarahMarc2026             │                         │
│  └────────────────────────────────┘                         │
│  💡 Wird auf dem QR-Code angezeigt.                         │
│                                                             │
│  📸 Foto-Sichtbarkeit                                       │
│  ● Sofort sichtbar                                          │
│  ○ Mystery Mode (erst nach Event)                           │
│  ○ Moderation (du genehmigst)                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │      [ 🚀 Jetzt starten & QR-Code erhalten ]        │    │
│  │              (Primary Button, auffällig)            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│           ─────────── oder ───────────                      │
│                                                             │
│        [ ⚙️ Erweiterte Features einrichten ]                │
│        (Secondary Button, Outline-Style)                    │
│        Challenges, Gästebuch, Co-Hosts                      │
└─────────────────────────────────────────────────────────────┘
```

**🎯 UX-Optimierung "Visuelles Gewicht":**
- "Jetzt starten" = Primary Button (bg-accent, prominent)
- "Erweiterte Features" = Secondary Button (outline, dezent)
- Ziel: User zum Erfolg führen, Extras sind optional

**State Output:**
```typescript
{ password: string, visibilityMode: 'instant' | 'mystery' | 'moderated' }
```

**Routing:**
- "Jetzt starten" → Event erstellen → QR-Code Seite
- "Erweiterte Features" → Step 6

---

### STEP 6: Challenges (Optional)

```
┌─────────────────────────────────────────────────────────────┐
│  Foto-Challenges für deine Gäste                            │
│                                                             │
│  ☑️ 📸 Selfie mit dem Brautpaar                             │
│  ☑️ 💃 Bester Tanz-Moment                                   │
│  ☑️ 🥂 Anstoßen!                                            │
│  ☐ 👗 Das schönste Outfit                                   │
│  ☐ 😂 Lustigstes Foto                                       │
│                                                             │
│  [+ Eigene Challenge]                                       │
│                                                             │
│              [Weiter →]     [Überspringen]                  │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 7: Gästebuch (Optional)

```
┌─────────────────────────────────────────────────────────────┐
│  Gästebuch einrichten                                       │
│                                                             │
│  ☑️ Gästebuch aktivieren                                    │
│                                                             │
│  Willkommensnachricht:                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Schreibt uns eure Glückwünsche! 💕                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ☑️ Textnachrichten                                         │
│  ☐ Sprachnachrichten                                        │
│     💡 Auf lauten Events oft schwer verständlich            │
│                                                             │
│              [Weiter →]     [Überspringen]                  │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 8: Co-Hosts (Optional)

```
┌─────────────────────────────────────────────────────────────┐
│  Brauchst du Hilfe?                                         │
│                                                             │
│  Co-Hosts können:                                           │
│  ✅ Fotos genehmigen/löschen                                │
│  ✅ QR-Code herunterladen                                   │
│  ❌ Keine Paket-Änderungen                                  │
│                                                             │
│  E-Mail-Adressen:                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ trauzeugin@email.de                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  💡 Du kannst Co-Hosts jederzeit wieder entfernen.          │
│                                                             │
│              [Weiter →]     [Überspringen]                  │
└─────────────────────────────────────────────────────────────┘
```

**🎯 UX-Optimierung "Angst-Prävention":**
- Hinweis "jederzeit entfernen" senkt Hemmschwelle
- Mehr Einladungen = mehr Admin-UI Sichtbarkeit

---

### STEP 9: Zusammenfassung

```
┌─────────────────────────────────────────────────────────────┐
│  ✨ Alles bereit!                                           │
│                                                             │
│  📋 Sarah & Marc heiraten                                   │
│  📅 15.03.2026, 14:00                                       │
│  🔐 Passwort: LiebeSarahMarc2026                            │
│                                                             │
│  📁 4 Alben                                                 │
│  🏆 3 Challenges                                            │
│  📖 Gästebuch aktiv                                         │
│  👥 2 Co-Host Einladungen                                   │
│                                                             │
│         [ 🚀 Event jetzt erstellen ]                        │
│                                                             │
│  💡 Alles später im Dashboard änderbar.                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Technische Implementation

### Datei-Struktur

```
packages/frontend/src/
├── app/
│   └── create-event/
│       └── page.tsx              # Wizard Container
├── components/
│   └── wizard/
│       ├── EventWizard.tsx       # Main Wizard Component
│       ├── WizardStep.tsx        # Step Wrapper
│       ├── steps/
│       │   ├── EventTypeStep.tsx
│       │   ├── BasicInfoStep.tsx
│       │   ├── DesignStep.tsx
│       │   ├── AlbumsStep.tsx
│       │   ├── AccessStep.tsx
│       │   ├── ChallengesStep.tsx
│       │   ├── GuestbookStep.tsx
│       │   ├── CoHostsStep.tsx
│       │   └── SummaryStep.tsx
│       ├── MobilePreview.tsx     # Handy-Preview mit Shimmer
│       └── presets.ts            # Alle Presets (Types, Albums, Challenges)
```

### State Management

```typescript
interface WizardState {
  currentStep: number;
  isExtendedMode: boolean;
  
  // Step 1
  eventType: EventCategory;
  eventSubtype?: string;
  
  // Step 2
  title: string;
  dateTime: Date | null;
  location?: string;
  
  // Step 3
  coverImage?: File;
  profileImage?: File;
  colorScheme: string;
  
  // Step 4
  albums: AlbumConfig[];
  
  // Step 5
  password: string;
  visibilityMode: 'instant' | 'mystery' | 'moderated';
  
  // Step 6 (optional)
  challenges: ChallengeConfig[];
  
  // Step 7 (optional)
  guestbookEnabled: boolean;
  guestbookMessage: string;
  allowVoiceMessages: boolean;
  
  // Step 8 (optional)
  coHostEmails: string[];
}
```

---

## CSS Animations

### Shimmer-Effekt für Preview

```css
@keyframes shimmer {
  0% { box-shadow: 0 0 0 0 rgba(var(--accent), 0.4); }
  50% { box-shadow: 0 0 20px 10px rgba(var(--accent), 0.2); }
  100% { box-shadow: 0 0 0 0 rgba(var(--accent), 0); }
}

.preview-shimmer {
  animation: shimmer 0.6s ease-out;
}
```

---

## API Endpoints

### Event erstellen

```
POST /api/events
Body: {
  title: string,
  dateTime: string,
  location?: string,
  password?: string,
  visibilityMode: string,
  colorScheme: string,
  albums: AlbumConfig[],
  challenges?: ChallengeConfig[],
  guestbook?: GuestbookConfig,
  coHostEmails?: string[],
}
```

---

**Nächster Schritt:** Implementation starten
