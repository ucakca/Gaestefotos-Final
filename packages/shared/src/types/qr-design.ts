/**
 * QR Code Design Configuration Types
 */

export type QRTemplate = 'modern' | 'boho' | 'classic' | 'minimal' | 'elegant';
export type QRFrameStyle = 'none' | 'rounded' | 'ornate' | 'floral' | 'geometric';
export type QRSizePreset = 'table' | 'a6' | 'a5' | 'a4' | 'square' | 'poster';
export type QRFont = 'sans' | 'serif' | 'mono' | 'script' | 'display';

export interface QRDesignColors {
  foreground: string;
  background: string;
  frame?: string;
}

export interface QRDesignConfig {
  id: string;
  name: string;
  template: QRTemplate;
  colors: QRDesignColors;
  frameStyle: QRFrameStyle;
  headerText?: string;
  footerText?: string;
  font?: QRFont;
  fontSize?: number;
  centerLogoUrl?: string;
  sizePreset: QRSizePreset;
  isDefault?: boolean;
  createdAt?: string;
}

export interface EventQRDesigns {
  designs: QRDesignConfig[];
  activeDesignId?: string;
}

export const QR_FONTS: Record<QRFont, {
  name: string;
  cssClass: string;
  fontFamily: string;
}> = {
  sans: {
    name: 'Sans-Serif',
    cssClass: 'font-sans',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  serif: {
    name: 'Serif',
    cssClass: 'font-serif',
    fontFamily: 'Georgia, Times New Roman, serif',
  },
  mono: {
    name: 'Monospace',
    cssClass: 'font-mono',
    fontFamily: 'Courier New, monospace',
  },
  script: {
    name: 'Script',
    cssClass: 'font-script',
    fontFamily: 'Brush Script MT, cursive',
  },
  display: {
    name: 'Display',
    cssClass: 'font-display',
    fontFamily: 'Impact, fantasy',
  },
};

export const QR_TEMPLATES: Record<QRTemplate, {
  name: string;
  frameStyle: QRFrameStyle;
  defaultColors: QRDesignColors;
  headerFont: string;
  decorations?: string[];
}> = {
  modern: {
    name: 'Modern',
    frameStyle: 'rounded',
    defaultColors: { foreground: '#1a1a1a', background: '#ffffff', frame: '#f5f5f5' },
    headerFont: 'font-sans font-bold',
  },
  boho: {
    name: 'Boho',
    frameStyle: 'floral',
    defaultColors: { foreground: '#5c6b4d', background: '#faf8f5', frame: '#d4c4a8' },
    headerFont: 'font-serif italic',
    decorations: ['leaves-top', 'leaves-bottom'],
  },
  classic: {
    name: 'Klassisch',
    frameStyle: 'ornate',
    defaultColors: { foreground: '#2c2c2c', background: '#fffef9', frame: '#c9a962' },
    headerFont: 'font-serif tracking-wide',
    decorations: ['ornament-corners'],
  },
  minimal: {
    name: 'Minimal',
    frameStyle: 'none',
    defaultColors: { foreground: '#000000', background: '#ffffff' },
    headerFont: 'font-mono text-sm',
  },
  elegant: {
    name: 'Elegant',
    frameStyle: 'geometric',
    defaultColors: { foreground: '#1a1a1a', background: '#f8f6f4', frame: '#d4af37' },
    headerFont: 'font-serif',
    decorations: ['corners-elegant'],
  },
};
