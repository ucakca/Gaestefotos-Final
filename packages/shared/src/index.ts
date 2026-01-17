// Shared Types
export * from './types/qr-design';
export * from './types/invitation-design';
export * from './types/invitation';

// Database types (re-export for frontend)
export type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
};

export type Event = {
  id: string;
  slug: string;
  title: string;
  hostId: string;
  designConfig?: any;
  featuresConfig?: any;
  createdAt: Date;
  dateTime?: Date | null;
  locationName?: string | null;
  locationGoogleMapsLink?: string | null;
};

export type Photo = {
  id: string;
  eventId: string;
  uploaderId: string | null;
  url: string;
  status?: string | null;
  createdAt: Date;
};

export type Guest = {
  id: string;
  eventId: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  status?: string | null;
  rsvpStatus?: string | null;
  phoneNumber?: string | null;
  dietaryRestrictions?: string | null;
  plusOne?: boolean;
  plusOneName?: string | null;
  plusOneCount?: number;
  tableNumber?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt?: Date;
};

export type Category = {
  id: string;
  eventId: string;
  name: string;
  order?: number;
  isVisible?: boolean;
  icon?: string | null;
  iconKey?: string | null;
  createdAt: Date;
};
export { formatDate, formatDateTime } from './utils/date';
export { slugify, generateRandomCode, randomString } from './utils/string';

// Event helpers
export const DEFAULT_EVENT_FEATURES_CONFIG = {
  showGuestlist: false,
  mysteryMode: false,
  allowUploads: true,
  moderationRequired: false,
  allowDownloads: true,
};

export function normalizeEventFeaturesConfig(config: any): any {
  return {
    ...DEFAULT_EVENT_FEATURES_CONFIG,
    ...config,
  };
}

// Shared Utilities
export * from './utils';

// Shared Constants
export * from './constants';
