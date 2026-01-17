// Shared Types
export * from './types/qr-design';
export * from './types/invitation-design';
export { formatDate, formatDateTime, formatRelativeDate } from './utils/date';
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
