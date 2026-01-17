import { EventCategory } from './presets/eventTypes';

export interface AlbumConfig {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  hostOnly: boolean;
  hint?: string;
}

export interface ChallengeConfig {
  label: string;
  icon: string;
  enabled: boolean;
}

export type ColorScheme = 'elegant' | 'romantic' | 'modern' | 'colorful' | 'ocean' | 'forest' | 'sunset' | 'custom';
export type VisibilityMode = 'instant' | 'mystery' | 'moderated';

export interface WizardState {
  currentStep: number;
  isExtendedMode: boolean;

  eventType: EventCategory;
  eventSubtype?: string;

  title: string;
  dateTime: Date | null;
  location?: string;

  coverImage?: File;
  coverImagePreview?: string;
  profileImage?: File;
  profileImagePreview?: string;
  colorScheme: ColorScheme;

  albums: AlbumConfig[];

  password: string;
  visibilityMode: VisibilityMode;

  challenges: ChallengeConfig[];

  guestbookEnabled: boolean;
  guestbookMessage: string;
  allowVoiceMessages: boolean;

  coHostEmails: string[];
}

export const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 1,
  isExtendedMode: false,
  eventType: 'wedding',
  title: '',
  dateTime: null,
  colorScheme: 'romantic',
  albums: [],
  password: '',
  visibilityMode: 'instant',
  challenges: [],
  guestbookEnabled: true,
  guestbookMessage: 'Schreibt uns eure Glückwünsche! 💕',
  allowVoiceMessages: false,
  coHostEmails: [],
};
