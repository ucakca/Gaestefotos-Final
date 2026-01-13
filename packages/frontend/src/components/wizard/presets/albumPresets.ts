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
      hint: 'Perfekt für Kinderfotos oder Verlobungsbilder vorab',
    },
    { id: 'ceremony', icon: 'Building', label: 'Zeremonie', hostOnly: false, default: true },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', hostOnly: false, default: true },
    { id: 'portraits', icon: 'Camera', label: 'Portraits', hostOnly: false, default: true },
    { id: 'henna', icon: 'Sparkles', label: 'Henna-Nacht', hostOnly: false, default: false },
    { id: 'polterabend', icon: 'Wine', label: 'Polterabend', hostOnly: false, default: false },
  ],

  family: [
    { id: 'ceremony', icon: 'Building', label: 'Zeremonie', hostOnly: false, default: true },
    { id: 'family', icon: 'Users', label: 'Familie', hostOnly: false, default: true },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', hostOnly: false, default: true },
    { id: 'portraits', icon: 'Camera', label: 'Portraits', hostOnly: false, default: true },
  ],

  milestone: [
    { id: 'ceremony', icon: 'Award', label: 'Zeremonie', hostOnly: false, default: true },
    { id: 'people', icon: 'Users', label: 'Familie & Freunde', hostOnly: false, default: true },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', hostOnly: false, default: true },
  ],

  business: [
    { id: 'program', icon: 'Presentation', label: 'Programm', hostOnly: false, default: true },
    { id: 'networking', icon: 'Handshake', label: 'Networking', hostOnly: false, default: true },
    { id: 'team', icon: 'Users', label: 'Team', hostOnly: false, default: true },
    { id: 'party', icon: 'PartyPopper', label: 'Feier', hostOnly: false, default: false },
  ],

  party: [
    { id: 'vibes', icon: 'Music', label: 'Stimmung', hostOnly: false, default: true },
    { id: 'highlights', icon: 'Star', label: 'Highlights', hostOnly: false, default: true },
    { id: 'guests', icon: 'Users', label: 'Gäste', hostOnly: false, default: true },
  ],

  custom: [
    { id: 'general', icon: 'Image', label: 'Allgemein', hostOnly: false, default: true },
  ],
};
