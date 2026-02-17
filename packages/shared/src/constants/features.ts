/**
 * Feature flags and package tier constants.
 * Shared between backend (entitlement checks) and frontend (UI gating).
 */

export const PACKAGE_TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
} as const;

export type PackageTier = (typeof PACKAGE_TIERS)[keyof typeof PACKAGE_TIERS];

export const FEATURE_FLAGS = {
  FACE_SEARCH: 'faceSearch',
  MOSAIC_WALL: 'mosaicWall',
  MOSAIC_PRINT: 'mosaicPrint',
  AI_STYLE: 'aiStyle',
  PHOTO_BOOTH: 'photoBooth',
  CUSTOM_BRANDING: 'customBranding',
  AD_FREE: 'adFree',
  SLIDESHOW: 'slideshow',
  HASHTAG_IMPORT: 'hashtagImport',
  HIGHLIGHT_REELS: 'highlightReels',
  GUESTBOOK: 'guestbook',
  MODERATION: 'moderation',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const FREE_TIER_LIMITS = {
  STORAGE_DAYS: 7,
  MAX_PHOTOS: 200,
  MAX_EVENTS: 1,
  MOSAIC_GRID: '4x4',
  WATERMARK: true,
} as const;
