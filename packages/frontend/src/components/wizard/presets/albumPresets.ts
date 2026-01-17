import { EventCategory } from './eventTypes';

export interface AlbumPreset {
  id: string;
  icon: string;
  label: string;
  hostOnly: boolean;
  default: boolean;
  hint?: string;
}

export const ALBUM_PRESETS: Record<EventCategory, AlbumPreset[]> = {
  wedding: [
    {
      id: 'story',
      icon: 'BookOpen',
      label: 'Unsere Geschichte',
      hostOnly: true,
      default: true,
      hint: '💡 Für Erinnerungen aus der Vergangenheit – Kindheitsfotos, besondere Momente, oder die Geschichte hinter dem Event',
    },
    { id: 'getting-ready', icon: 'Sparkles', label: 'Getting Ready', hostOnly: false, default: true },
    { id: 'ceremony', icon: 'Church', label: 'Zeremonie', hostOnly: false, default: true },
    { id: 'couple', icon: 'Heart', label: 'Brautpaar', hostOnly: false, default: true },
    { id: 'party', icon: 'PartyPopper', label: 'Feier & Tanz', hostOnly: false, default: true },
    { id: 'group', icon: 'Users', label: 'Gruppenfotos', hostOnly: false, default: true },
    { id: 'cake', icon: 'Cake', label: 'Torte & Essen', hostOnly: false, default: false },
    { id: 'location', icon: 'MapPin', label: 'Location', hostOnly: false, default: false },
    { id: 'henna', icon: 'Hand', label: 'Henna-Nacht', hostOnly: false, default: false },
    { id: 'polterabend', icon: 'Wine', label: 'Polterabend', hostOnly: false, default: false },
  ],

  family: [
    { id: 'birthday-child', icon: 'Crown', label: 'Geburtstagskind', hostOnly: false, default: true },
    { id: 'family', icon: 'Home', label: 'Familie', hostOnly: false, default: true },
    { id: 'kids', icon: 'Baby', label: 'Kinder', hostOnly: false, default: true },
    { id: 'gifts', icon: 'Gift', label: 'Geschenke', hostOnly: false, default: true },
    { id: 'cake', icon: 'Cake', label: 'Torte', hostOnly: false, default: true },
    { id: 'games', icon: 'Gamepad2', label: 'Spiele', hostOnly: false, default: false },
    { id: 'group', icon: 'Users', label: 'Gruppenfotos', hostOnly: false, default: false },
  ],

  milestone: [
    { id: 'ceremony', icon: 'Award', label: 'Zeremonie', hostOnly: false, default: true },
    { id: 'graduate', icon: 'GraduationCap', label: 'Absolvent', hostOnly: false, default: true },
    { id: 'people', icon: 'Users', label: 'Familie & Freunde', hostOnly: false, default: true },
    { id: 'speeches', icon: 'Mic', label: 'Reden', hostOnly: false, default: false },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', hostOnly: false, default: true },
  ],

  business: [
    { id: 'keynote', icon: 'Presentation', label: 'Keynotes', hostOnly: false, default: true },
    { id: 'networking', icon: 'Handshake', label: 'Networking', hostOnly: false, default: true },
    { id: 'team', icon: 'Users', label: 'Team', hostOnly: false, default: true },
    { id: 'location', icon: 'Building2', label: 'Location', hostOnly: false, default: false },
    { id: 'products', icon: 'Package', label: 'Produkte', hostOnly: false, default: false },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', hostOnly: false, default: false },
  ],

  party: [
    { id: 'party', icon: 'PartyPopper', label: 'Party', hostOnly: false, default: true },
    { id: 'dance', icon: 'Music', label: 'Tanzfläche', hostOnly: false, default: true },
    { id: 'drinks', icon: 'GlassWater', label: 'Drinks', hostOnly: false, default: true },
    { id: 'guests', icon: 'Users', label: 'Gäste', hostOnly: false, default: true },
    { id: 'funny', icon: 'Laugh', label: 'Lustige Momente', hostOnly: false, default: false },
  ],

  custom: [
    { id: 'highlights', icon: 'Star', label: 'Highlights', hostOnly: false, default: true },
    { id: 'group', icon: 'Users', label: 'Gruppenfotos', hostOnly: false, default: true },
    { id: 'details', icon: 'Camera', label: 'Details', hostOnly: false, default: false },
  ],
};
