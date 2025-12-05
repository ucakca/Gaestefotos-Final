// API Routes
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me',
  },
  EVENTS: {
    LIST: '/api/events',
    CREATE: '/api/events',
    GET: (id: string) => `/api/events/${id}`,
    UPDATE: (id: string) => `/api/events/${id}`,
    DELETE: (id: string) => `/api/events/${id}`,
    BY_SLUG: (slug: string) => `/api/events/slug/${slug}`,
  },
  GUESTS: {
    LIST: (eventId: string) => `/api/events/${eventId}/guests`,
    CREATE: (eventId: string) => `/api/events/${eventId}/guests`,
    UPDATE: (eventId: string, guestId: string) => `/api/events/${eventId}/guests/${guestId}`,
    DELETE: (eventId: string, guestId: string) => `/api/events/${eventId}/guests/${guestId}`,
  },
  PHOTOS: {
    LIST: (eventId: string) => `/api/events/${eventId}/photos`,
    UPLOAD: (eventId: string) => `/api/events/${eventId}/photos/upload`,
    GET: (photoId: string) => `/api/photos/${photoId}`,
    DELETE: (photoId: string) => `/api/photos/${photoId}`,
    APPROVE: (photoId: string) => `/api/photos/${photoId}/approve`,
    REJECT: (photoId: string) => `/api/photos/${photoId}/reject`,
  },
} as const;

// WebSocket Events
export const WS_EVENTS = {
  PHOTO_UPLOADED: 'photo_uploaded',
  PHOTO_APPROVED: 'photo_approved',
  PHOTO_REJECTED: 'photo_rejected',
  GUEST_RSVP: 'guest_rsvp',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
} as const;

// User Roles
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  GUEST: 'guest',
} as const;

// Photo Status
export const PHOTO_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DELETED: 'deleted',
} as const;

// Guest Status
export const GUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
} as const;

