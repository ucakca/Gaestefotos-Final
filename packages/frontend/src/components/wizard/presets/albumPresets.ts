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
      default: false,
      hint: '💡 Für Erinnerungen aus der Vergangenheit – Kindheitsfotos, besondere Momente, oder die Geschichte hinter dem Event',
    },
    { id: 'getting-ready', icon: 'Sparkles', label: 'Getting Ready', hostOnly: false, default: false },
    { id: 'ceremony', icon: 'Church', label: 'Zeremonie', hostOnly: false, default: false },
    { id: 'couple', icon: 'Heart', label: 'Brautpaar', hostOnly: false, default: false },
    { id: 'party', icon: 'PartyPopper', label: 'Feier & Tanz', hostOnly: false, default: false },
    { id: 'group', icon: 'Users', label: 'Gruppenfotos', hostOnly: false, default: false },
    { id: 'cake', icon: 'Cake', label: 'Torte & Essen', hostOnly: false, default: false },
    { id: 'location', icon: 'MapPin', label: 'Location', hostOnly: false, default: false },
    { id: 'henna', icon: 'Hand', label: 'Henna-Nacht', hostOnly: false, default: false },
    { id: 'polterabend', icon: 'Wine', label: 'Polterabend', hostOnly: false, default: false },
  ],

  family: [
    { id: 'birthday-child', icon: 'Crown', label: 'Geburtstagskind', hostOnly: false, default: false },
    { id: 'family', icon: 'Home', label: 'Familie', hostOnly: false, default: false },
    { id: 'kids', icon: 'Baby', label: 'Kinder', hostOnly: false, default: false },
    { id: 'gifts', icon: 'Gift', label: 'Geschenke', hostOnly: false, default: false },
    { id: 'cake', icon: 'Cake', label: 'Torte', hostOnly: false, default: false },
    { id: 'games', icon: 'Gamepad2', label: 'Spiele', hostOnly: false, default: false },
    { id: 'group', icon: 'Users', label: 'Gruppenfotos', hostOnly: false, default: false },
  ],

  milestone: [
    { id: 'ceremony', icon: 'Award', label: 'Zeremonie', hostOnly: false, default: false },
    { id: 'graduate', icon: 'GraduationCap', label: 'Absolvent', hostOnly: false, default: false },
    { id: 'people', icon: 'Users', label: 'Familie & Freunde', hostOnly: false, default: false },
    { id: 'speeches', icon: 'Mic', label: 'Reden', hostOnly: false, default: false },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', hostOnly: false, default: false },
  ],

  business: [
    { id: 'keynote', icon: 'Presentation', label: 'Keynotes', hostOnly: false, default: false },
    { id: 'networking', icon: 'Handshake', label: 'Networking', hostOnly: false, default: false },
    { id: 'team', icon: 'Users', label: 'Team', hostOnly: false, default: false },
    { id: 'location', icon: 'Building2', label: 'Location', hostOnly: false, default: false },
    { id: 'products', icon: 'Package', label: 'Produkte', hostOnly: false, default: false },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', hostOnly: false, default: false },
  ],

  party: [
    { id: 'party', icon: 'PartyPopper', label: 'Party', hostOnly: false, default: false },
    { id: 'dance', icon: 'Music', label: 'Tanzfläche', hostOnly: false, default: false },
    { id: 'drinks', icon: 'GlassWater', label: 'Drinks', hostOnly: false, default: false },
    { id: 'guests', icon: 'Users', label: 'Gäste', hostOnly: false, default: false },
    { id: 'funny', icon: 'Laugh', label: 'Lustige Momente', hostOnly: false, default: false },
  ],

  custom: [
    { id: 'highlights', icon: 'Star', label: 'Highlights', hostOnly: false, default: false },
    { id: 'group', icon: 'Users', label: 'Gruppenfotos', hostOnly: false, default: false },
    { id: 'details', icon: 'Camera', label: 'Details', hostOnly: false, default: false },
  ],
};
