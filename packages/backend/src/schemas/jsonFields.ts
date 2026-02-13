/**
 * Zod Schemas for JSON Fields
 * Runtime validation for JSON database fields
 */

import { z } from 'zod';

/**
 * Event.designConfig - Design/Theme configuration
 */
export const DesignConfigSchema = z.object({
  colorScheme: z.enum(['light', 'dark', 'auto']).optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  fontFamily: z.string().optional(),
  coverImageUrl: z.string().optional(),
  profileImageUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  customCss: z.string().optional(),
}).passthrough(); // Allow additional fields for backwards compatibility

export type DesignConfig = z.infer<typeof DesignConfigSchema>;

/**
 * Event.featuresConfig - Feature flags and settings
 */
export const FeaturesConfigSchema = z.object({
  mysteryMode: z.boolean().optional().default(false),
  allowUploads: z.boolean().optional().default(true),
  showGuestlist: z.boolean().optional().default(false),
  allowDownloads: z.boolean().optional().default(true),
  moderationRequired: z.boolean().optional().default(false),
  allowGuestbook: z.boolean().optional().default(true),
  allowChallenges: z.boolean().optional().default(true),
  allowStories: z.boolean().optional().default(false),
  allowVideoUpload: z.boolean().optional().default(false),
  allowLiveWall: z.boolean().optional().default(false),
  enableFotoSpass: z.boolean().optional().default(true),
  faceSearch: z.boolean().optional().default(true),
  customHashtag: z.string().optional(),
  customOverlayLogoUrl: z.string().optional(),
  uploadRateLimits: z.object({
    photoIpMax: z.number().optional(),
    photoEventMax: z.number().optional(),
    videoIpMax: z.number().optional(),
    videoEventMax: z.number().optional(),
  }).optional(),
  virusScan: z.object({
    enforce: z.boolean().optional(),
  }).optional(),
}).passthrough();

export type FeaturesConfig = z.infer<typeof FeaturesConfigSchema>;

/**
 * EventMember.permissions - Co-host permissions
 */
export const MemberPermissionsSchema = z.object({
  canManagePhotos: z.boolean().optional().default(true),
  canManageGuests: z.boolean().optional().default(false),
  canManageSettings: z.boolean().optional().default(false),
  canManageChallenges: z.boolean().optional().default(true),
  canManageCategories: z.boolean().optional().default(true),
  canDownloadAll: z.boolean().optional().default(true),
  canDeletePhotos: z.boolean().optional().default(false),
  canInviteGuests: z.boolean().optional().default(false),
}).passthrough();

export type MemberPermissions = z.infer<typeof MemberPermissionsSchema>;

/**
 * Event.invitationDesign - Invitation card design
 */
export const InvitationDesignSchema = z.object({
  template: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  accentColor: z.string().optional(),
  fontFamily: z.string().optional(),
  logoUrl: z.string().optional(),
  customText: z.string().optional(),
  qrStyle: z.object({
    dotColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    cornerRadius: z.number().optional(),
  }).optional(),
}).passthrough();

export type InvitationDesign = z.infer<typeof InvitationDesignSchema>;

/**
 * Photo.exifData - EXIF metadata
 */
export const ExifDataSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  dateTime: z.string().optional(),
  exposureTime: z.string().optional(),
  fNumber: z.number().optional(),
  iso: z.number().optional(),
  focalLength: z.string().optional(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  orientation: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
}).passthrough();

export type ExifData = z.infer<typeof ExifDataSchema>;

/**
 * Photo.faceData - Face detection results
 */
export const FaceDataSchema = z.object({
  faces: z.array(z.object({
    boundingBox: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }).optional(),
    embedding: z.array(z.number()).optional(),
    confidence: z.number().optional(),
  })).optional(),
  processedAt: z.string().optional(),
  version: z.string().optional(),
}).passthrough();

export type FaceData = z.infer<typeof FaceDataSchema>;

/**
 * Helper functions for safe parsing
 */
export function parseDesignConfig(data: unknown): Partial<DesignConfig> {
  const result = DesignConfigSchema.safeParse(data || {});
  return result.success ? result.data : {};
}

export function parseFeaturesConfig(data: unknown): Partial<FeaturesConfig> {
  const result = FeaturesConfigSchema.safeParse(data || {});
  return result.success ? result.data : {
    mysteryMode: false,
    allowUploads: true,
    showGuestlist: false,
    allowDownloads: true,
    moderationRequired: false,
  };
}

export function parseMemberPermissions(data: unknown): Partial<MemberPermissions> {
  const result = MemberPermissionsSchema.safeParse(data || {});
  return result.success ? result.data : {};
}

export function parseInvitationDesign(data: unknown): Partial<InvitationDesign> {
  const result = InvitationDesignSchema.safeParse(data || {});
  return result.success ? result.data : {};
}

export function parseExifData(data: unknown): Partial<ExifData> {
  const result = ExifDataSchema.safeParse(data || {});
  return result.success ? result.data : {};
}

export function parseFaceData(data: unknown): Partial<FaceData> {
  const result = FaceDataSchema.safeParse(data || {});
  return result.success ? result.data : {};
}

export default {
  DesignConfigSchema,
  FeaturesConfigSchema,
  MemberPermissionsSchema,
  InvitationDesignSchema,
  ExifDataSchema,
  FaceDataSchema,
  parseDesignConfig,
  parseFeaturesConfig,
  parseMemberPermissions,
  parseInvitationDesign,
  parseExifData,
  parseFaceData,
};
