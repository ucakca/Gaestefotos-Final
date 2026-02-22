/**
 * Cover-Shooting Service
 *
 * Applies magazine-cover-style overlays to photos using SVG + Sharp compositing.
 * Templates: Vogue, GQ, Rolling Stone, Time, Forbes, Cosmopolitan, National Geographic
 *
 * No external API needed — pure Sharp/SVG for instant results on the Booth.
 */

import sharp from 'sharp';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// ─── Template Definitions ────────────────────────────────────────────────────

export type CoverTemplate =
  | 'vogue'
  | 'gq'
  | 'rolling_stone'
  | 'time'
  | 'forbes'
  | 'cosmo'
  | 'national_geo';

export interface CoverShotOptions {
  template?: CoverTemplate;
  coverLine1?: string;    // Custom headline (host can personalise)
  coverLine2?: string;
  guestName?: string;
  eventTitle?: string;
}

export interface CoverTemplateDefinition {
  id: CoverTemplate;
  label: string;
  emoji: string;
  mastheadText: string;
  mastheadColor: string;     // hex
  mastheadBg: string;        // hex or 'transparent'
  accentColor: string;       // hex
  textColor: string;         // hex for cover lines
  borderColor: string;       // hex
  borderWidth: number;       // px
  defaultCoverLine1: string;
  defaultCoverLine2: string;
  subheadline?: string;
}

export const COVER_TEMPLATES: CoverTemplateDefinition[] = [
  {
    id: 'vogue',
    label: 'VOGUE',
    emoji: '👗',
    mastheadText: 'VOGUE',
    mastheadColor: '#FFFFFF',
    mastheadBg: 'transparent',
    accentColor: '#C0A060',
    textColor: '#FFFFFF',
    borderColor: '#C0A060',
    borderWidth: 6,
    defaultCoverLine1: 'STYLE ICON OF THE YEAR',
    defaultCoverLine2: 'The Most Glamorous Night',
    subheadline: 'EXCLUSIVE',
  },
  {
    id: 'gq',
    label: 'GQ',
    emoji: '🎩',
    mastheadText: 'GQ',
    mastheadColor: '#FFFFFF',
    mastheadBg: 'transparent',
    accentColor: '#E8C020',
    textColor: '#FFFFFF',
    borderColor: '#E8C020',
    borderWidth: 5,
    defaultCoverLine1: 'MAN OF THE NIGHT',
    defaultCoverLine2: 'Style · Success · Party',
    subheadline: 'GENTLEMEN QUARTERLY',
  },
  {
    id: 'rolling_stone',
    label: 'ROLLING STONE',
    emoji: '🎸',
    mastheadText: 'Rolling Stone',
    mastheadColor: '#FF2222',
    mastheadBg: 'transparent',
    accentColor: '#FF2222',
    textColor: '#FFFFFF',
    borderColor: '#FF2222',
    borderWidth: 4,
    defaultCoverLine1: 'STAR OF THE NIGHT',
    defaultCoverLine2: 'The Legend That Rocks the Party',
    subheadline: 'SPECIAL EDITION',
  },
  {
    id: 'time',
    label: 'TIME',
    emoji: '⏰',
    mastheadText: 'TIME',
    mastheadColor: '#CC0000',
    mastheadBg: 'transparent',
    accentColor: '#CC0000',
    textColor: '#FFFFFF',
    borderColor: '#CC0000',
    borderWidth: 8,
    defaultCoverLine1: 'PERSON OF THE YEAR',
    defaultCoverLine2: 'Why They Changed Everything',
    subheadline: 'SPECIAL ISSUE',
  },
  {
    id: 'forbes',
    label: 'Forbes',
    emoji: '💼',
    mastheadText: 'Forbes',
    mastheadColor: '#FFFFFF',
    mastheadBg: 'transparent',
    accentColor: '#0050A0',
    textColor: '#FFFFFF',
    borderColor: '#0050A0',
    borderWidth: 5,
    defaultCoverLine1: '#1 MOST POWERFUL GUEST',
    defaultCoverLine2: 'The Secrets to Party Success',
    subheadline: '30 UNDER 30',
  },
  {
    id: 'cosmo',
    label: 'Cosmopolitan',
    emoji: '💄',
    mastheadText: 'Cosmopolitan',
    mastheadColor: '#FFFFFF',
    mastheadBg: 'transparent',
    accentColor: '#FF4080',
    textColor: '#FFFFFF',
    borderColor: '#FF4080',
    borderWidth: 5,
    defaultCoverLine1: 'TONIGHT\'S IT GIRL',
    defaultCoverLine2: '50 Ways to Own the Dance Floor',
    subheadline: 'HOT LIST 2025',
  },
  {
    id: 'national_geo',
    label: 'National Geographic',
    emoji: '🌍',
    mastheadText: 'National\nGeographic',
    mastheadColor: '#FFCC00',
    mastheadBg: 'transparent',
    accentColor: '#FFCC00',
    textColor: '#FFFFFF',
    borderColor: '#FFCC00',
    borderWidth: 12,
    defaultCoverLine1: 'RARE SPECIES SPOTTED',
    defaultCoverLine2: 'An Extraordinary Night In The Wild',
    subheadline: 'EXCLUSIVE EXPEDITION',
  },
];

export function getCoverTemplate(id: CoverTemplate): CoverTemplateDefinition {
  return COVER_TEMPLATES.find(t => t.id === id) ?? COVER_TEMPLATES[0];
}

// ─── SVG Overlay Builder ─────────────────────────────────────────────────────

function buildCoverSvg(
  width: number,
  height: number,
  tpl: CoverTemplateDefinition,
  coverLine1: string,
  coverLine2: string,
  guestName: string,
): Buffer {
  const borderW = tpl.borderWidth;
  const isNatGeo = tpl.id === 'national_geo';

  // masthead Y position
  const mastheadY = isNatGeo ? height - 60 : 20;
  const mastheadFontSize = isNatGeo ? 42 : (tpl.id === 'gq' ? 110 : 72);
  const lineH = mastheadFontSize * 0.9;

  // split multi-line masthead (National Geo)
  const mastheadLines = tpl.mastheadText.split('\n');

  // cover lines position: at the bottom
  const coverLineY = height - 130;
  const cl1Size = 22;
  const cl2Size = 16;

  // Optional guest name badge
  const nameBadgeY = height - 70;

  // Build gradient overlay: darker at top + bottom for readability
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Top gradient for masthead readability -->
    <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.65"/>
      <stop offset="30%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <!-- Bottom gradient for cover lines -->
    <linearGradient id="botGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="55%" stop-color="#000000" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.90"/>
    </linearGradient>
    <!-- Accent line under masthead -->
    <filter id="textShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="1" dy="1" stdDeviation="3" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
  </defs>

  <!-- Top gradient overlay -->
  <rect x="0" y="0" width="${width}" height="${Math.round(height * 0.38)}" fill="url(#topGrad)"/>
  <!-- Bottom gradient overlay -->
  <rect x="0" y="${Math.round(height * 0.55)}" width="${width}" height="${Math.round(height * 0.45)}" fill="url(#botGrad)"/>

  <!-- Outer border -->
  <rect x="${borderW / 2}" y="${borderW / 2}" width="${width - borderW}" height="${height - borderW}"
        fill="none" stroke="${tpl.borderColor}" stroke-width="${borderW}" rx="${isNatGeo ? 0 : 2}"/>

  <!-- Masthead -->
  ${mastheadLines.map((line, i) => `
  <text x="${isNatGeo ? width / 2 : 22}" y="${mastheadY + lineH + (i * lineH)}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${mastheadFontSize}"
        font-weight="${tpl.id === 'rolling_stone' ? 'italic' : 'bold'}"
        fill="${tpl.mastheadColor}"
        text-anchor="${isNatGeo ? 'middle' : 'start'}"
        filter="url(#textShadow)"
        letter-spacing="${tpl.id === 'gq' ? '12' : '2'}"
  >${line}</text>`).join('')}

  <!-- Accent line under masthead -->
  ${!isNatGeo ? `<line x1="20" y1="${mastheadY + lineH + 14}" x2="${width - 20}" y2="${mastheadY + lineH + 14}" stroke="${tpl.accentColor}" stroke-width="2"/>` : ''}

  ${tpl.subheadline ? `
  <!-- Subheadline -->
  <text x="22" y="${mastheadY + lineH + 36}"
        font-family="Helvetica, Arial, sans-serif"
        font-size="11"
        font-weight="600"
        fill="${tpl.accentColor}"
        text-anchor="start"
        letter-spacing="3"
  >${tpl.subheadline}</text>` : ''}

  <!-- Cover line 1 -->
  <text x="${width / 2}" y="${coverLineY}"
        font-family="Helvetica, Arial, sans-serif"
        font-size="${cl1Size}"
        font-weight="700"
        fill="${tpl.accentColor}"
        text-anchor="middle"
        filter="url(#textShadow)"
        letter-spacing="1"
  >${coverLine1}</text>

  <!-- Cover line 2 -->
  <text x="${width / 2}" y="${coverLineY + cl1Size + 10}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${cl2Size}"
        font-style="italic"
        fill="${tpl.textColor}"
        text-anchor="middle"
        filter="url(#textShadow)"
  >${coverLine2}</text>

  ${guestName ? `
  <!-- Guest name pill -->
  <rect x="${width / 2 - 110}" y="${nameBadgeY - 22}" width="220" height="28" rx="14"
        fill="${tpl.accentColor}" opacity="0.92"/>
  <text x="${width / 2}" y="${nameBadgeY - 3}"
        font-family="Helvetica, Arial, sans-serif"
        font-size="13"
        font-weight="700"
        fill="#FFFFFF"
        text-anchor="middle"
        letter-spacing="1"
  >${guestName.toUpperCase()}</text>` : ''}

  <!-- Issue line / barcode area at bottom right -->
  <text x="${width - 12}" y="${height - 12}"
        font-family="Helvetica, Arial, sans-serif"
        font-size="9"
        fill="${tpl.textColor}"
        text-anchor="end"
        opacity="0.7"
  >gästefotos.com</text>
</svg>`;

  return Buffer.from(svg, 'utf-8');
}

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Apply magazine cover overlay to an image buffer.
 */
export async function applyCoverShot(
  imageBuffer: Buffer,
  options: CoverShotOptions = {},
): Promise<Buffer> {
  const tpl = getCoverTemplate(options.template ?? 'vogue');
  const coverLine1 = options.coverLine1 || (options.eventTitle
    ? options.eventTitle.toUpperCase().slice(0, 36)
    : tpl.defaultCoverLine1);
  const coverLine2 = options.coverLine2 || tpl.defaultCoverLine2;
  const guestName = options.guestName?.slice(0, 24) ?? '';

  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 800;
  const height = meta.height ?? 1067;

  const svgBuffer = buildCoverSvg(width, height, tpl, coverLine1, coverLine2, guestName);

  const resultBuffer = await sharp(imageBuffer)
    .composite([{ input: svgBuffer, blend: 'over' }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return resultBuffer;
}

/**
 * Process cover shot for a photo and save as new photo.
 */
export async function processCoverShotForPhoto(
  photoId: string,
  userId: string,
  options: CoverShotOptions = {},
): Promise<{ newPhotoPath: string; template: CoverTemplate }> {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, eventId: true, storagePath: true },
  });

  if (!photo || !photo.storagePath) {
    throw new Error('Foto nicht gefunden');
  }

  const { storageService } = await import('./storage');
  const imageBuffer = await storageService.getFile(photo.storagePath);

  const template = options.template ?? 'vogue';
  const resultBuffer = await applyCoverShot(imageBuffer, options);

  const newPath = await storageService.uploadFile(
    photo.eventId,
    `cover-${template}-${photoId}.jpg`,
    resultBuffer,
    'image/jpeg',
  );

  logger.info(`[CoverShot] Created ${template} cover for photo ${photoId}`);
  return { newPhotoPath: newPath, template };
}
