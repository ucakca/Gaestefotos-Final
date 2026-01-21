// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'guest';
  createdAt: Date;
}

// Event Types
export interface Event {
  id: string;
  hostId: string;
  slug: string;
  title: string;
  dateTime: Date;
  locationName?: string;
  locationGoogleMapsLink?: string;
  designConfig: EventDesignConfig;
  featuresConfig: EventFeaturesConfig;
  profileDescription?: string;
  createdAt: Date;
  updatedAt: Date;
  // Runtime properties from API
  isActive?: boolean;
  password?: string;
  guestCount?: number;
  isStorageLocked?: boolean;
  storageEndsAt?: Date | string | null;
  host?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface EventDesignConfig {
  designPresetKey?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
  coverImageUrl?: string;
  // Runtime properties from uploads/storage
  profileImage?: string;
  coverImage?: string;
  profileImageStoragePath?: string;
  coverImageStoragePath?: string;
  welcomeMessage?: string;
}

export interface EventFeaturesConfig {
  showGuestlist: boolean;
  mysteryMode: boolean;
  allowUploads: boolean;
  moderationRequired: boolean;
  allowDownloads: boolean;
  mode?: 'STANDARD' | 'MODERATION' | 'COLLECT' | 'VIEW_ONLY';
}

export const DEFAULT_EVENT_FEATURES_CONFIG: EventFeaturesConfig = {
  showGuestlist: true,
  mysteryMode: false,
  allowUploads: true,
  moderationRequired: false,
  allowDownloads: true,
  mode: 'STANDARD',
};

export function normalizeEventFeaturesConfig(input: unknown): Record<string, any> {
  const raw = input && typeof input === 'object' ? (input as Record<string, any>) : {};

  return {
    ...raw,
    showGuestlist:
      typeof raw.showGuestlist === 'boolean' ? raw.showGuestlist : DEFAULT_EVENT_FEATURES_CONFIG.showGuestlist,
    mysteryMode: typeof raw.mysteryMode === 'boolean' ? raw.mysteryMode : DEFAULT_EVENT_FEATURES_CONFIG.mysteryMode,
    allowUploads: typeof raw.allowUploads === 'boolean' ? raw.allowUploads : DEFAULT_EVENT_FEATURES_CONFIG.allowUploads,
    moderationRequired:
      typeof raw.moderationRequired === 'boolean'
        ? raw.moderationRequired
        : DEFAULT_EVENT_FEATURES_CONFIG.moderationRequired,
    allowDownloads:
      typeof raw.allowDownloads === 'boolean' ? raw.allowDownloads : DEFAULT_EVENT_FEATURES_CONFIG.allowDownloads,
    mode:
      raw.mode === 'STANDARD' || raw.mode === 'MODERATION' || raw.mode === 'COLLECT' || raw.mode === 'VIEW_ONLY'
        ? raw.mode
        : DEFAULT_EVENT_FEATURES_CONFIG.mode,
  };
}

// Guest Types
export interface Guest {
  id: string;
  eventId: string;
  firstName: string;
  lastName: string;
  email?: string;
  status: 'pending' | 'accepted' | 'declined';
  dietaryRequirements?: string;
  plusOneCount: number;
  accessToken: string;
  createdAt: Date;
}

// Photo Types
export interface Photo {
  id: string;
  eventId: string;
  guestId?: string;
  storagePath: string;
  url?: string;
  uploadedBy?: string | null;
  isStoryOnly?: boolean;
  status: 'approved' | 'pending' | 'deleted';
  createdAt: Date;
  // Populated relations from API
  event?: {
    id: string;
    title: string;
    slug: string;
  };
  guest?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  category?: {
    id: string;
    name: string;
  };
  categoryId?: string;
}

// Extended Photo Types for Grid Display
export interface ChallengeCompletion {
  id: string;
  uploaderName?: string;
  guest?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Challenge {
  id: string;
  title: string;
  description?: string;
}

export interface GuestbookEntry {
  id: string;
  authorName: string;
  message: string;
}

export interface ExtendedPhoto extends Photo {
  // Challenge photo properties
  isChallengePhoto?: boolean;
  challenge?: Challenge;
  completion?: ChallengeCompletion;
  photoId?: string;
  
  // Guestbook entry properties
  isGuestbookEntry?: boolean;
  guestbookEntry?: GuestbookEntry;
}

// Category Types
export interface Category {
  id: string;
  eventId: string;
  name: string;
  iconKey?: string | null;
  order: number;
  startAt?: Date | null;
  endAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    photos: number;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: string;
  payload: any;
}

export interface PhotoUploadMessage extends WebSocketMessage {
  type: 'photo_uploaded';
  payload: {
    photo: Photo;
    eventId: string;
  };
}

// Re-export invitation and QR design types
export * from './invitation';
export * from './qr-design';
export { QR_TEMPLATES } from './qr-design';
