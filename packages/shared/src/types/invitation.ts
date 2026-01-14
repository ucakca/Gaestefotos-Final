/**
 * Extended Invitation Config Types
 * Supports guest group differentiation and invitation page content
 */

export interface InvitationLocation {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  mapsUrl?: string;
  description?: string;
}

export interface InvitationScheduleItem {
  time: string; // HH:mm format
  title: string;
  icon?: string; // Lucide icon name
  description?: string;
  location?: InvitationLocation;
  visibleForGroups: string[]; // ["all"] or specific group slugs
}

export interface InvitationDresscode {
  title: string;
  description: string;
  examples?: string[];
}

export interface InvitationRSVPQuestion {
  id: string;
  label: string;
  type: 'text' | 'email' | 'boolean' | 'select' | 'textarea';
  required?: boolean;
  options?: string[]; // for select type
  placeholder?: string;
  visibleForGroups?: string[]; // if not set, visible for all
}

export interface InvitationGuestGroup {
  slug: string;
  name: string;
  canSeeCeremony?: boolean;
  canSeeReception?: boolean;
  canSeeParty?: boolean;
  customQuestions?: InvitationRSVPQuestion[];
}

export interface InvitationConfig {
  // Basic Info
  coupleNames?: string;
  welcomeText?: string;
  eventDate?: string; // ISO date
  
  // Guest Groups
  guestGroup?: string; // current group slug
  availableGroups?: InvitationGuestGroup[];
  
  // Content Sections
  schedule?: InvitationScheduleItem[];
  dresscode?: InvitationDresscode;
  
  // Locations
  ceremonyLocation?: InvitationLocation;
  receptionLocation?: InvitationLocation;
  partyLocation?: InvitationLocation;
  
  // RSVP Form
  rsvpQuestions?: InvitationRSVPQuestion[];
  rsvpEnabled?: boolean;
  
  // Design
  themePreset?: 'classic' | 'boho' | 'modern' | 'minimal';
  customColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  backgroundImageUrl?: string;
  
  // Features
  showCountdown?: boolean;
  showGalleryLink?: boolean;
}

export interface InvitationRSVPResponse {
  name: string;
  email?: string;
  attending?: boolean;
  attendingCeremony?: boolean;
  attendingReception?: boolean;
  attendingParty?: boolean;
  dietaryRestrictions?: string;
  plusOneName?: string;
  customAnswers?: Record<string, any>;
}
