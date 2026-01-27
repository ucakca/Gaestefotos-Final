// Shared API Types for Frontend & Backend
// Generated: 2026-01-23

// ============================================================================
// User & Auth Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date | string;
  twoFactorEnabled?: boolean;
  twoFactorPending?: boolean;
  wordpressUserId?: number | null;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  HOST = 'HOST',
  GUEST = 'GUEST',
}

export interface LoginResponse {
  success?: boolean;
  user?: User;
  token?: string;
  twoFactorRequired?: boolean;
  twoFactorSetupRequired?: boolean;
  redirectUrl?: string;
}

export interface AuthError {
  error: string | ErrorDetail[];
  statusCode?: number;
}

export interface ErrorDetail {
  message: string;
  path?: string[];
  code?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface Event {
  id: string;
  hostId: string;
  slug: string;
  title: string;
  dateTime: Date | string | null;
  locationName: string | null;
  locationGoogleMapsLink: string | null;
  designConfig: DesignConfig | null;
  featuresConfig: FeaturesConfig;
  createdAt: Date | string;
  updatedAt: Date | string;
  password: string | null;
  guestbookHostMessage: string | null;
  deletedAt: Date | string | null;
  isActive: boolean;
  purgeAfter: Date | string | null;
  eventCode: string | null;
  profileDescription: string | null;
}

export interface DesignConfig {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  backgroundImage?: string;
  [key: string]: unknown;
}

export interface FeaturesConfig {
  mysteryMode?: boolean;
  allowUploads?: boolean;
  showGuestlist?: boolean;
  allowDownloads?: boolean;
  moderationRequired?: boolean;
  [key: string]: unknown;
}

export interface EventWithStats extends Event {
  _count?: {
    photos?: number;
    videos?: number;
    guests?: number;
    categories?: number;
  };
  host?: Pick<User, 'id' | 'name' | 'email'>;
}

// ============================================================================
// Photo Types
// ============================================================================

export interface Photo {
  id: string;
  eventId: string;
  filename: string;
  originalFilename: string;
  url: string;
  thumbnailUrl: string | null;
  blurHash: string | null;
  width: number | null;
  height: number | null;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date | string;
  uploadedBy: string | null;
  moderationStatus: ModerationStatus;
  takenAt: Date | string | null;
  categoryId: string | null;
  metadata: PhotoMetadata | null;
}

export enum ModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface PhotoMetadata {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  [key: string]: unknown;
}

export interface PhotoWithRelations extends Photo {
  category?: Category | null;
  uploader?: Pick<User, 'id' | 'name'> | null;
  _count?: {
    likes?: number;
  };
  userHasLiked?: boolean;
}

// ============================================================================
// Video Types
// ============================================================================

export interface Video {
  id: string;
  eventId: string;
  filename: string;
  originalFilename: string;
  url: string;
  thumbnailUrl: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date | string;
  uploadedBy: string | null;
  moderationStatus: ModerationStatus;
  processingStatus: ProcessingStatus;
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// ============================================================================
// Category Types
// ============================================================================

export interface Category {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  coverPhotoId: string | null;
  sortOrder: number;
  createdAt: Date | string;
}

export interface CategoryWithCount extends Category {
  _count?: {
    photos?: number;
  };
  coverPhoto?: Photo | null;
}

// ============================================================================
// Guest Types
// ============================================================================

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  rsvpStatus: RsvpStatus;
  invitedAt: Date | string;
  respondedAt: Date | string | null;
}

export enum RsvpStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  TENTATIVE = 'TENTATIVE',
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string | ErrorDetail[];
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string | ErrorDetail[];
  statusCode: number;
  timestamp?: string;
  path?: string;
}

// ============================================================================
// Upload Types
// ============================================================================

export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface UploadResult {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  type: 'photo' | 'video';
}

// ============================================================================
// QR Design Types
// ============================================================================

export interface QRDesignConfig {
  url: string;
  size: number;
  margin: number;
  dotsColor: string;
  cornersColor: string;
  cornersDotColor: string;
  backgroundColor: string;
  logoUrl?: string | null;
  logoSize?: number;
  frameStyle?: string;
  textTop?: string;
  textBottom?: string;
}

// ============================================================================
// Co-Host Types
// ============================================================================

export interface EventMember {
  id: string;
  eventId: string;
  userId: string;
  role: EventMemberRole;
  permissions: EventMemberPermissions;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export enum EventMemberRole {
  COHOST = 'COHOST',
}

export interface EventMemberPermissions {
  canModerate?: boolean;
  canManageGuests?: boolean;
  canManageCategories?: boolean;
  canDownloadPhotos?: boolean;
  canEditEvent?: boolean;
  [key: string]: unknown;
}

export interface EventMemberWithUser extends EventMember {
  user: Pick<User, 'id' | 'name' | 'email'>;
}

// ============================================================================
// Invitation Types
// ============================================================================

export interface Invitation {
  id: string;
  eventId: string;
  recipientEmail: string;
  recipientName: string;
  token: string;
  status: InvitationStatus;
  sentAt: Date | string;
  respondedAt: Date | string | null;
  expiresAt: Date | string;
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface EventStatistics {
  totalPhotos: number;
  totalVideos: number;
  totalGuests: number;
  totalUploads: number;
  totalDownloads: number;
  totalViews: number;
  storageUsed: number;
  uploadsByDay: { date: string; count: number }[];
  topUploaders: { userId: string; name: string; count: number }[];
}

// ============================================================================
// Guestbook Types
// ============================================================================

export interface GuestbookEntry {
  id: string;
  eventId: string;
  authorName: string;
  message: string;
  createdAt: Date | string;
  audioUrl: string | null;
}

export interface GuestbookEntryWithPhotos extends GuestbookEntry {
  photos: GuestbookPhotoUpload[];
}

export interface GuestbookPhotoUpload {
  id: string;
  url: string;
  thumbnailUrl: string | null;
}
