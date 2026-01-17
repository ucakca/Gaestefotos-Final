/**
 * Invitation Card Design Configuration Types
 * Canvas-based editor for creating custom invitation cards
 */

export type CanvasElementType = 'text' | 'image' | 'shape' | 'qr';
export type ShapeType = 'rectangle' | 'circle' | 'line';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex: number;
}

export interface TextElement extends CanvasElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle?: 'normal' | 'bold' | 'italic';
  color: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

export interface ImageElement extends CanvasElement {
  type: 'image';
  src: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
}

export interface ShapeElement extends CanvasElement {
  type: 'shape';
  shapeType: ShapeType;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface QRElement extends CanvasElement {
  type: 'qr';
  qrData: string; // URL to encode
  foregroundColor: string;
  backgroundColor: string;
}

export type CanvasElementUnion = TextElement | ImageElement | ShapeElement | QRElement;

export interface InvitationDesignConfig {
  id: string;
  name: string;
  width: number; // Canvas width in px
  height: number; // Canvas height in px
  backgroundColor: string;
  backgroundImage?: string;
  elements: CanvasElementUnion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EventInvitationDesigns {
  designs: InvitationDesignConfig[];
  activeDesignId?: string;
}

// Predefined canvas sizes for invitations
export const INVITATION_SIZES = {
  'a6-portrait': { width: 420, height: 595, label: 'A6 Hochformat' },
  'a6-landscape': { width: 595, height: 420, label: 'A6 Querformat' },
  'a5-portrait': { width: 595, height: 842, label: 'A5 Hochformat' },
  'square': { width: 600, height: 600, label: 'Quadrat' },
  'story': { width: 480, height: 853, label: 'Instagram Story' },
} as const;

export type InvitationSizePreset = keyof typeof INVITATION_SIZES;
