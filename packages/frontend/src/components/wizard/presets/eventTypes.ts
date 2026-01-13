import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

export type EventCategory = 'wedding' | 'family' | 'milestone' | 'business' | 'party' | 'custom';

export interface EventSubtype {
  id: string;
  label: string;
}

export interface EventTypeConfig {
  icon: keyof typeof Icons;
  label: string;
  color: string;
  subtypes: EventSubtype[] | null;
}

export const EVENT_TYPES: Record<EventCategory, EventTypeConfig> = {
  wedding: {
    icon: 'Heart',
    label: 'Hochzeit',
    color: 'rose',
    subtypes: [
      { id: 'civil', label: 'Standesamtlich' },
      { id: 'church', label: 'Kirchlich' },
      { id: 'henna', label: 'Henna-Nacht' },
      { id: 'mehndi', label: 'Mehndi/Sangeet' },
      { id: 'polterabend', label: 'Polterabend' },
      { id: 'rehearsal', label: 'Rehearsal Dinner' },
    ],
  },
  family: {
    icon: 'Home',
    label: 'Familie',
    color: 'sky',
    subtypes: [
      { id: 'baptism', label: 'Taufe' },
      { id: 'birthday', label: 'Geburtstag' },
      { id: 'kids', label: 'Kindergeburtstag' },
      { id: 'barmitzvah', label: 'Bar/Bat Mizwa' },
      { id: 'aqiqa', label: 'Aqiqa / Sünnet' },
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
