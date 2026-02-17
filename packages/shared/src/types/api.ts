/**
 * Extended API response types shared across packages.
 */

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UploadResponse {
  id: string;
  url: string;
  thumbnailUrl?: string;
  status: string;
}

export interface FaceSearchResponse {
  success: boolean;
  results: {
    photoId: string;
    photoUrl: string;
    similarity: number;
    facePosition?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
  count: number;
  message: string;
}

export interface EventPublicData {
  id: string;
  slug: string;
  title: string;
  dateTime: string | null;
  locationName: string | null;
  coverImageUrl: string | null;
  designConfig: any;
  featuresConfig: any;
  theme?: any;
  isActive: boolean;
}

export interface QueueStatsResponse {
  [queueName: string]: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
}
