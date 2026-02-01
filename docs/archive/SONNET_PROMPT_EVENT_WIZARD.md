# 🎯 SONNET IMPLEMENTATION PROMPT: Event-Wizard

## Deine Aufgabe

Implementiere einen **Event-Creation Wizard** für die Gästefotos-App. Der Wizard führt neue Hosts durch die Event-Erstellung mit einem psychologisch optimierten UX-Flow.

---

## Kontext

- **Tech Stack:** Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **UI Components:** Bereits vorhanden in `packages/frontend/src/components/ui/`
- **Icons:** Lucide React (`lucide-react`)
- **Bestehende Event-Erstellung:** `packages/frontend/src/app/events/create/page.tsx` (ersetzen/erweitern)

---

## Spezifikation

**Lies zuerst:** `/root/gaestefotos-app-v2/docs/EVENT_WIZARD_SPEC.md`

Diese Datei enthält:
- Alle Event-Typen und Kategorien
- Album-Presets pro Event-Typ
- Challenge-Presets pro Event-Typ
- Detaillierte Wireframes für jeden Step
- State-Management Struktur
- CSS-Animationen

---

## Wizard-Flow (Zusammenfassung)

```
CORE WIZARD (5 Steps, ~2 Min):
├── Step 1: Event-Typ wählen (6 Kategorien + Untertypen)
├── Step 2: Name & Datum eingeben
├── Step 3: Design (Bilder + Farben) ← "Magic Moment" mit Shimmer
├── Step 4: Alben auswählen (vorausgewählt basierend auf Typ)
└── Step 5: Zugang (Passwort + Modi) ← GABELUNG

Nach Step 5: User wählt:
├── "🚀 Jetzt starten" → Event erstellen → QR-Code Seite
└── "⚙️ Erweiterte Features" → Steps 6-9

ERWEITERTE FEATURES (Optional, 4 Steps):
├── Step 6: Challenges (Vorlagen + eigene)
├── Step 7: Gästebuch (Nachricht + Optionen)
├── Step 8: Co-Hosts einladen
└── Step 9: Zusammenfassung → Event erstellen
```

---

## Kritische UX-Optimierungen (MUSS implementiert werden)

### 1. Magic Moment (Step 3)
```tsx
// Bei Bild-Upload: Preview bekommt Shimmer-Animation
const [isShimmering, setIsShimmering] = useState(false);

const handleImageUpload = (file: File) => {
  setImage(file);
  setIsShimmering(true);
  setTimeout(() => setIsShimmering(false), 600);
};

// CSS
<div className={`preview ${isShimmering ? 'animate-shimmer' : ''}`}>
```

### 2. Inhalts-Versprechen (Step 4)
```tsx
// Bei "Unsere Geschichte" Album: Hint-Text anzeigen
{album.hostOnly && (
  <p className="text-xs text-muted-foreground ml-6">
    💡 Perfekt für Kinderfotos oder Verlobungsbilder vorab
  </p>
)}
```

### 3. Button-Gewichtung (Step 5)
```tsx
// Primary = Auffällig, Secondary = Dezent
<Button variant="default" size="lg" className="w-full">
  🚀 Jetzt starten & QR-Code erhalten
</Button>

<div className="text-center text-muted-foreground">oder</div>

<Button variant="outline" size="sm">
  ⚙️ Erweiterte Features einrichten
</Button>
```

### 4. Angst-Prävention (Step 8)
```tsx
// Beruhigender Hinweis bei Co-Hosts
<p className="text-sm text-muted-foreground">
  💡 Du kannst Co-Hosts jederzeit mit einem Klick wieder entfernen.
</p>
```

---

## Datei-Struktur (erstellen)

```
packages/frontend/src/
├── app/
│   └── create-event/
│       └── page.tsx              # Neuer Wizard Entry Point
├── components/
│   └── wizard/
│       ├── EventWizard.tsx       # Main Container mit State
│       ├── WizardProgress.tsx    # Progress Bar/Steps Indicator
│       ├── WizardNavigation.tsx  # Zurück/Weiter Buttons
│       ├── MobilePreview.tsx     # Handy-Mockup mit Live-Preview
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
│       └── presets/
│           ├── eventTypes.ts
│           ├── albumPresets.ts
│           └── challengePresets.ts
```

---

## State Interface

```typescript
interface WizardState {
  currentStep: number;
  isExtendedMode: boolean;
  
  // Step 1
  eventType: 'wedding' | 'family' | 'milestone' | 'business' | 'party' | 'custom';
  eventSubtype?: string;
  
  // Step 2
  title: string;
  dateTime: Date | null;
  location?: string;
  
  // Step 3
  coverImage?: File;
  coverImagePreview?: string;
  profileImage?: File;
  profileImagePreview?: string;
  colorScheme: 'elegant' | 'romantic' | 'modern' | 'colorful';
  
  // Step 4
  albums: Array<{
    id: string;
    label: string;
    icon: string;
    enabled: boolean;
    hostOnly: boolean;
  }>;
  
  // Step 5
  password: string;
  visibilityMode: 'instant' | 'mystery' | 'moderated';
  
  // Step 6 (optional)
  challenges: Array<{
    label: string;
    icon: string;
    enabled: boolean;
  }>;
  
  // Step 7 (optional)
  guestbookEnabled: boolean;
  guestbookMessage: string;
  allowVoiceMessages: boolean;
  
  // Step 8 (optional)
  coHostEmails: string[];
}
```

---

## API Call (nach Wizard-Abschluss)

```typescript
const createEvent = async (state: WizardState) => {
  const formData = new FormData();
  
  // Basis-Daten
  formData.append('title', state.title);
  formData.append('dateTime', state.dateTime?.toISOString() || '');
  if (state.location) formData.append('location', state.location);
  formData.append('password', state.password);
  formData.append('visibilityMode', state.visibilityMode);
  formData.append('colorScheme', state.colorScheme);
  
  // Bilder
  if (state.coverImage) formData.append('coverImage', state.coverImage);
  if (state.profileImage) formData.append('profileImage', state.profileImage);
  
  // JSON-Daten
  formData.append('albums', JSON.stringify(state.albums.filter(a => a.enabled)));
  formData.append('challenges', JSON.stringify(state.challenges?.filter(c => c.enabled) || []));
  formData.append('guestbook', JSON.stringify({
    enabled: state.guestbookEnabled,
    message: state.guestbookMessage,
    allowVoice: state.allowVoiceMessages,
  }));
  formData.append('coHostEmails', JSON.stringify(state.coHostEmails || []));
  
  const response = await fetch('/api/events', {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
};
```

---

## Presets-Daten

### Event-Typen

```typescript
// presets/eventTypes.ts
export const EVENT_TYPES = {
  wedding: {
    icon: 'Rings',
    label: 'Hochzeit',
    color: 'rose',
    subtypes: [
      { id: 'civil', label: 'Standesamtlich' },
      { id: 'church', label: 'Kirchlich' },
      { id: 'henna', label: 'Henna-Nacht' },
      { id: 'mehndi', label: 'Mehndi/Sangeet' },
      { id: 'polterabend', label: 'Polterabend' },
    ],
  },
  family: {
    icon: 'Baby',
    label: 'Familie',
    color: 'sky',
    subtypes: [
      { id: 'baptism', label: 'Taufe' },
      { id: 'birthday', label: 'Geburtstag' },
      { id: 'kids', label: 'Kindergeburtstag' },
      { id: 'barmitzvah', label: 'Bar/Bat Mizwa' },
      { id: 'anniversary', label: 'Jubiläum' },
    ],
  },
  milestone: {
    icon: 'GraduationCap',
    label: 'Meilenstein',
    color: 'amber',
    subtypes: [
      { id: 'graduation', label: 'Abschluss' },
      { id: 'retirement', label: 'Ruhestand' },
    ],
  },
  business: {
    icon: 'Briefcase',
    label: 'Business',
    color: 'slate',
    subtypes: null,
  },
  party: {
    icon: 'PartyPopper',
    label: 'Party',
    color: 'violet',
    subtypes: [
      { id: 'jga', label: 'JGA' },
      { id: 'silvester', label: 'Silvester' },
      { id: 'general', label: 'Allgemein' },
    ],
  },
  custom: {
    icon: 'Sparkles',
    label: 'Sonstiges',
    color: 'emerald',
    subtypes: null,
  },
};
```

### Album-Presets

```typescript
// presets/albumPresets.ts
export const ALBUM_PRESETS = {
  wedding: [
    { id: 'story', icon: 'BookOpen', label: 'Unsere Geschichte', hostOnly: true, default: true,
      hint: 'Perfekt für Kinderfotos oder Verlobungsbilder vorab' },
    { id: 'ceremony', icon: 'Church', label: 'Zeremonie', hostOnly: false, default: true },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', hostOnly: false, default: true },
    { id: 'portraits', icon: 'Camera', label: 'Portraits', hostOnly: false, default: true },
    { id: 'henna', icon: 'Sparkles', label: 'Henna-Nacht', hostOnly: false, default: false },
  ],
  family: [
    { id: 'ceremony', icon: 'Church', label: 'Zeremonie', hostOnly: false, default: true },
    { id: 'family', icon: 'Users', label: 'Familie', hostOnly: false, default: true },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', hostOnly: false, default: true },
  ],
  // ... weitere (siehe EVENT_WIZARD_SPEC.md)
};
```

### Challenge-Presets

```typescript
// presets/challengePresets.ts
export const CHALLENGE_PRESETS = {
  wedding: [
    { label: 'Selfie mit dem Brautpaar', icon: 'Camera', default: true },
    { label: 'Bester Tanz-Moment', icon: 'Music', default: true },
    { label: 'Anstoßen!', icon: 'Wine', default: true },
    { label: 'Das schönste Outfit', icon: 'Shirt', default: false },
    { label: 'Lustigstes Foto', icon: 'Laugh', default: false },
  ],
  // ... weitere (siehe EVENT_WIZARD_SPEC.md)
};
```

---

## CSS für Shimmer-Animation

```css
/* In globals.css oder als Tailwind Plugin */
@keyframes shimmer {
  0% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb), 0.4); }
  50% { box-shadow: 0 0 20px 10px rgba(var(--accent-rgb), 0.2); }
  100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb), 0); }
}

.animate-shimmer {
  animation: shimmer 0.6s ease-out;
}
```

---

## Routing nach Wizard

```typescript
// Nach erfolgreicher Event-Erstellung
const result = await createEvent(wizardState);
router.push(`/events/${result.id}/qr-code?created=true`);
```

---

## Checkliste

- [ ] Wizard-Container mit Step-Navigation
- [ ] Progress-Indicator (Dots oder Bar)
- [ ] Step 1: Event-Typ mit Untertypen
- [ ] Step 2: Titel, Datum, Ort
- [ ] Step 3: Design mit Live-Preview + Shimmer
- [ ] Step 4: Alben mit Presets + Custom
- [ ] Step 5: Zugang + Gabelung
- [ ] Step 6: Challenges (optional)
- [ ] Step 7: Gästebuch (optional)
- [ ] Step 8: Co-Hosts (optional)
- [ ] Step 9: Summary
- [ ] API-Integration
- [ ] Mobile-responsive
- [ ] Keyboard-Navigation (Enter = Weiter)

---

## Wichtige Hinweise

1. **Bestehende UI-Components nutzen:** `Button`, `Input`, `Checkbox` aus `/components/ui/`
2. **Keine neuen Dependencies** ohne Rücksprache
3. **TypeScript strict mode** beachten
4. **Mobile-first** designen
5. **Presets aus EVENT_WIZARD_SPEC.md** übernehmen

---

**Start:** Erstelle zuerst die Datei-Struktur, dann die Presets, dann die Steps von 1-9.
