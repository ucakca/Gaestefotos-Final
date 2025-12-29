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
}

export interface EventFeaturesConfig {
  showGuestlist: boolean;
  mysteryMode: boolean;
  allowUploads: boolean;
  moderationRequired: boolean;
  allowDownloads: boolean;
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

