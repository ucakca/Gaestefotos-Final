// Setup Wizard Types

export type EventCategory = 'wedding' | 'family' | 'milestone' | 'business' | 'party' | 'custom';

export type SetupPhase = 1 | 2 | 3 | 4 | 5;

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

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  location?: string;
}

export interface AlbumConfig {
  id: string;
  name: string;
  icon?: string;
  enabled: boolean;
  isCustom?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  dateOffsetHours?: number;
  durationHours?: number;
}

export interface ChallengeConfig {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface FeaturesConfig {
  allowUploads: boolean;
  allowDownloads: boolean;
  moderationRequired: boolean;
  mysteryMode: boolean;
  showGuestlist: boolean;
  uploadToleranceDays?: number;
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
  schedule: ScheduleItem[];
  
  // Phase 2: Design
  coverImage: File | null;
  coverImagePreview: string | null;
  profileImage: File | null;
  profileImagePreview: string | null;
  colorScheme: string;
  themeId: string | null;
  themeData: any | null;
  
  // Phase 3: Galerie einrichten
  albums: AlbumConfig[];
  challenges: ChallengeConfig[];
  guestbookEnabled: boolean;
  guestbookMessage: string;
  featuresConfig: FeaturesConfig;
  
  // Phase 4: Team
  coHostEmails: string[];
  
  // Phase 5: QR & Teilen
  qrStyle: string;
  invitationText: string;
  
  // Meta
  eventId?: string;
  eventSlug?: string;
  isCreating: boolean;
  error: string | null;
}

export const DEFAULT_FEATURES: FeaturesConfig = {
  allowUploads: true,
  allowDownloads: true,
  moderationRequired: false,
  mysteryMode: false,
  showGuestlist: false,
};

export const INITIAL_SETUP_STATE: SetupState = {
  currentPhase: 1,
  currentStepId: 'event-type',
  completedSteps: [],
  
  eventType: 'wedding',
  eventSubtype: undefined,
  title: '',
  dateTime: null,
  location: '',
  schedule: [],
  
  coverImage: null,
  coverImagePreview: null,
  profileImage: null,
  profileImagePreview: null,
  colorScheme: 'elegant',
  themeId: null,
  themeData: null,
  
  albums: [],
  challenges: [],
  guestbookEnabled: true,
  guestbookMessage: '',
  featuresConfig: { ...DEFAULT_FEATURES },
  
  coHostEmails: [],
  
  qrStyle: 'default',
  invitationText: '',
  
  eventId: undefined,
  eventSlug: undefined,
  isCreating: false,
  error: null,
};

export const SETUP_STEPS: SetupStep[] = [
  // Phase 1: Erstellen
  { id: 'event-type', phase: 1, title: 'Eventtyp wählen', status: 'active', isRequired: true, icon: 'Sparkles' },
  { id: 'title', phase: 1, title: 'Titel festlegen', status: 'pending', isRequired: true, icon: 'Type' },
  { id: 'date-location', phase: 1, title: 'Datum & Ort', status: 'pending', isRequired: false, icon: 'Calendar' },
  
  // Phase 2: Gestalten (Bilder zuerst, dann KI-Theme — KI braucht Bilder als Kontext)
  { id: 'cover-image', phase: 2, title: 'Cover-Bild', status: 'pending', isRequired: false, icon: 'Image' },
  { id: 'profile-image', phase: 2, title: 'Profilbild', status: 'pending', isRequired: false, icon: 'User' },
  { id: 'event-theme', phase: 2, title: 'Event-Theme', status: 'pending', isRequired: false, icon: 'Palette' },
  { id: 'color-scheme', phase: 2, title: 'Farbschema', status: 'pending', isRequired: false, icon: 'Palette' },
  
  // Phase 3: Einrichten
  { id: 'albums', phase: 3, title: 'Alben einrichten', status: 'pending', isRequired: false, icon: 'FolderOpen' },
  { id: 'guestbook', phase: 3, title: 'Gästebuch', status: 'pending', isRequired: false, icon: 'BookOpen' },
  { id: 'challenges', phase: 3, title: 'Challenges', status: 'pending', isRequired: false, icon: 'Trophy' },
  { id: 'features', phase: 3, title: 'Galerie-Optionen', status: 'pending', isRequired: false, icon: 'Settings' },
  
  // Phase 4: Team
  { id: 'cohosts', phase: 4, title: 'Co-Hosts einladen', status: 'pending', isRequired: false, icon: 'Users' },
  
  // Phase 5: Teilen
  { id: 'qr-code', phase: 5, title: 'QR-Code erstellen', status: 'pending', isRequired: false, icon: 'QrCode' },
  { id: 'share', phase: 5, title: 'Event teilen', status: 'pending', isRequired: false, icon: 'Share2' },
];

export const PHASE_INFO: Record<SetupPhase, { title: string; icon: string; milestone: string }> = {
  1: { title: 'Erstellen', icon: '🎉', milestone: 'Dein Event ist angelegt!' },
  2: { title: 'Gestalten', icon: '🎨', milestone: 'Sieht fantastisch aus!' },
  3: { title: 'Einrichten', icon: '⚙️', milestone: 'Galerie ist startklar!' },
  4: { title: 'Team', icon: '👥', milestone: 'Dein Team ist bereit!' },
  5: { title: 'Teilen', icon: '🚀', milestone: 'Alles bereit — Event ist live!' },
};
