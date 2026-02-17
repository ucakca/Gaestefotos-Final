/**
 * Upload constants shared across frontend and backend.
 * Single source of truth for file limits, types, and constraints.
 */

export const UPLOAD_LIMITS = {
  MAX_FILES_PER_BATCH: 20,
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  MAX_FILE_SIZE_MB: 50,
  PARALLEL_UPLOADS: 3,
  CHUNK_SIZE_BYTES: 5 * 1024 * 1024, // 5MB TUS chunks
} as const;

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export const ACCEPTED_MEDIA_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_VIDEO_TYPES,
] as const;

export const IMAGE_VARIANTS = {
  ORIGINAL: 'original',
  OPTIMIZED: 'optimized',    // 1920px, 85% quality
  THUMBNAIL: 'thumbnail',    // 300x300, 75% quality
  WEBP: 'webp',              // 1920px, WebP format
} as const;

export const CDN_PRESETS = {
  THUMBNAIL: { w: 300, q: 75, f: 'webp' },
  GALLERY: { w: 800, q: 80, f: 'webp' },
  FULL: { w: 1920, q: 85, f: 'webp' },
  AVATAR: { w: 100, q: 80, f: 'webp' },
} as const;
