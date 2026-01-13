import { EventCategory } from './eventTypes';

export interface ChallengePreset {
  label: string;
  icon: string;
  default: boolean;
}

export const CHALLENGE_PRESETS: Record<EventCategory, ChallengePreset[]> = {
  wedding: [
    { label: 'Selfie mit dem Brautpaar', icon: 'Camera', default: true },
    { label: 'Bester Tanz-Moment', icon: 'Music', default: true },
    { label: 'Anstoßen!', icon: 'Wine', default: true },
    { label: 'Das schönste Outfit', icon: 'ShoppingBag', default: false },
    { label: 'Lustigstes Foto des Abends', icon: 'Smile', default: false },
    { label: 'Längstes Ehepaar auf der Feier', icon: 'Heart', default: false },
  ],

  family: [
    { label: 'Familien-Selfie', icon: 'Users', default: true },
    { label: 'Generationen-Foto', icon: 'Heart', default: true },
    { label: 'Beste Party-Stimmung', icon: 'PartyPopper', default: false },
  ],

  milestone: [
    { label: 'Zeremonie-Moment', icon: 'Award', default: true },
    { label: 'Gruppen-Foto', icon: 'Users', default: true },
    { label: 'Beste Stimmung', icon: 'PartyPopper', default: false },
  ],

  business: [
    { label: 'Networking-Moment', icon: 'Handshake', default: true },
    { label: 'Team-Foto', icon: 'Users', default: true },
    { label: 'Bester Vortrag', icon: 'Presentation', default: false },
  ],

  party: [
    { label: 'Gruppen-Selfie', icon: 'Users', default: true },
    { label: 'Party-Stimmung', icon: 'Music', default: true },
    { label: 'Prost!', icon: 'Wine', default: true },
  ],

  custom: [
    { label: 'Beste Fotos', icon: 'Camera', default: true },
    { label: 'Gruppen-Selfie', icon: 'Users', default: true },
  ],
};
