// Setup Wizard Types

export type EventCategory = 'wedding' | 'family' | 'milestone' | 'business' | 'party' | 'custom';

export type SetupPhase = 1 | 2 | 3 | 4;

export type StepStatus = 'pending' | 'active' | 'completed';

export interface SetupStep {
  id: string;
  phase: SetupPhase;
  title: string;
  description?: string;
  status: StepStatus;
  isRequired: boolean;
  icon?: string;
}

export interface AlbumConfig {
  id: string;
  name: string;
  icon?: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface ChallengeConfig {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface SetupState {
  // Progress
  currentPhase: SetupPhase;
  currentStepId: string;
  completedSteps: string[];
  
  // Phase 1: Grundlagen
  eventType: EventCategory;
  eventSubtype?: string;
  title: string;
  dateTime: Date | null;
  location: string;
  
  // Phase 2: Design
  coverImage: File | null;
  coverImagePreview: string | null;
  profileImage: File | null;
  profileImagePreview: string | null;
  colorScheme: string;
  
  // Phase 3: QR & Teilen
  qrStyle: string;
  invitationText: string;
  
  // Phase 4: Erweiterte Features
  albums: AlbumConfig[];
  challenges: ChallengeConfig[];
  guestbookEnabled: boolean;
  guestbookMessage: string;
  coHostEmails: string[];
  
  // Meta
  eventId?: string;
  eventSlug?: string;
  isCreating: boolean;
  error: string | null;
}

export const INITIAL_SETUP_STATE: SetupState = {
  currentPhase: 1,
  currentStepId: 'event-type',
  completedSteps: [],
  
  eventType: 'wedding',
  eventSubtype: undefined,
  title: '',
  dateTime: null,
  location: '',
  
  coverImage: null,
  coverImagePreview: null,
  profileImage: null,
  profileImagePreview: null,
  colorScheme: 'elegant',
  
  qrStyle: 'default',
  invitationText: '',
  
  albums: [],
  challenges: [],
  guestbookEnabled: true,
  guestbookMessage: '',
  coHostEmails: [],
  
  eventId: undefined,
  eventSlug: undefined,
  isCreating: false,
  error: null,
};

export const SETUP_STEPS: SetupStep[] = [
  // Phase 1: Grundlagen
  { id: 'event-type', phase: 1, title: 'Eventtyp wählen', status: 'active', isRequired: true, icon: 'Sparkles' },
  { id: 'title', phase: 1, title: 'Titel festlegen', status: 'pending', isRequired: true, icon: 'Type' },
  { id: 'date-location', phase: 1, title: 'Datum & Ort', status: 'pending', isRequired: false, icon: 'Calendar' },
  
  // Phase 2: Design
  { id: 'cover-image', phase: 2, title: 'Cover-Bild', status: 'pending', isRequired: false, icon: 'Image' },
  { id: 'profile-image', phase: 2, title: 'Profilbild', status: 'pending', isRequired: false, icon: 'User' },
  { id: 'color-scheme', phase: 2, title: 'Farbschema', status: 'pending', isRequired: false, icon: 'Palette' },
  
  // Phase 3: QR & Teilen
  { id: 'qr-code', phase: 3, title: 'QR-Code erstellen', status: 'pending', isRequired: false, icon: 'QrCode' },
  { id: 'share', phase: 3, title: 'Event teilen', status: 'pending', isRequired: false, icon: 'Share2' },
  
  // Phase 4: Erweiterte Features
  { id: 'albums', phase: 4, title: 'Alben einrichten', status: 'pending', isRequired: false, icon: 'FolderOpen' },
  { id: 'challenges', phase: 4, title: 'Challenges', status: 'pending', isRequired: false, icon: 'Trophy' },
  { id: 'guestbook', phase: 4, title: 'Gästebuch', status: 'pending', isRequired: false, icon: 'BookOpen' },
  { id: 'cohosts', phase: 4, title: 'Co-Hosts', status: 'pending', isRequired: false, icon: 'Users' },
];

export const PHASE_INFO: Record<SetupPhase, { title: string; icon: string; milestone: string }> = {
  1: { title: 'Event-Grundlagen', icon: '🎉', milestone: 'Dein Event ist angelegt!' },
  2: { title: 'Design & Branding', icon: '🎨', milestone: 'Sieht fantastisch aus!' },
  3: { title: 'QR-Code & Teilen', icon: '📤', milestone: 'Bereit zum Teilen!' },
  4: { title: 'Erweiterte Features', icon: '⭐', milestone: 'Pro-Setup komplett!' },
};
