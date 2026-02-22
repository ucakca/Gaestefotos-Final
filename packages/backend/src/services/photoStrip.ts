/**
 * Photo Strip Service
 *
 * Creates classic 4-photo vertical strips (the traditional photo booth look).
 * Pure Sharp compositing — no external API needed.
 *
 * API: POST /api/booth-games/photo-strip
 * Body: { photoIds: string[4], template?, eventTitle?, brandColor? }
 */

import sharp from 'sharp';
import prisma from '../config/database';
import { storageService } from './storage';
import { logger } from '../utils/logger';

// ─── Template Definitions ─────────────────────────────────────────────────────

export type StripTemplate = 'classic' | 'color' | 'vintage' | 'neon' | 'minimal';

interface StripTemplateDefinition {
  id: StripTemplate;
  label: string;
  emoji: string;
  bgColor: string;       // hex
  borderColor: string;   // hex
  textColor: string;     // hex
  fontFamily: string;
  accentColor: string;
}

export const STRIP_TEMPLATES: StripTemplateDefinition[] = [
  { id: 'classic', label: 'Classic (Schwarz)', emoji: '🖤', bgColor: '#1a1a1a', borderColor: '#333333', textColor: '#ffffff', fontFamily: 'Helvetica', accentColor: '#ffffff' },
  { id: 'color',   label: 'Farbe (Weiß)',      emoji: '🤍', bgColor: '#ffffff', borderColor: '#e5e5e5', textColor: '#111111', fontFamily: 'Helvetica', accentColor: '#6366f1' },
  { id: 'vintage', label: 'Vintage (Sepia)',    emoji: '📜', bgColor: '#f4e4c1', borderColor: '#c9a87c', textColor: '#5c3d2e', fontFamily: 'Georgia',   accentColor: '#8b5e3c' },
  { id: 'neon',    label: 'Neon (Pink)',        emoji: '💜', bgColor: '#0a0015', borderColor: '#ff00ff', textColor: '#ffffff', fontFamily: 'Helvetica', accentColor: '#ff00ff' },
  { id: 'minimal', label: 'Minimal (Grau)',     emoji: '⬜', bgColor: '#f8f8f8', borderColor: '#dddddd', textColor: '#444444', fontFamily: 'Helvetica', accentColor: '#888888' },
];

// ─── Main Function ─────────────────────────────────────────────────────────────

export interface PhotoStripOptions {
  template?: StripTemplate;
  eventTitle?: string;
  brandColor?: string;
}

export interface PhotoStripResult {
  newPhotoPath: string;
  template: StripTemplate;
  photoCount: number;
}

export async function createPhotoStrip(
  eventId: string,
  photoIds: string[],
  uploadedBy: string | undefined,
  options: PhotoStripOptions = {},
): Promise<PhotoStripResult> {
  const { template: templateId = 'classic', eventTitle, brandColor } = options;

  if (!photoIds || photoIds.length < 1 || photoIds.length > 4) {
    throw new Error('1-4 Fotos sind erforderlich für einen Photo Strip');
  }

  const tpl = STRIP_TEMPLATES.find(t => t.id === templateId) || STRIP_TEMPLATES[0];
  const bgColor = brandColor || tpl.bgColor;

  // ─── Load photos from DB + storage ─────────────────────────────────────────

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, eventId, deletedAt: null },
    select: { id: true, storagePath: true },
  });

  if (photos.length === 0) {
    throw new Error('Keine Fotos gefunden');
  }

  // Sort by requested order
  const ordered = photoIds
    .map(id => photos.find(p => p.id === id))
    .filter(Boolean) as { id: string; storagePath: string }[];

  // ─── Strip dimensions ───────────────────────────────────────────────────────

  const FRAME_W = 600;
  const FRAME_H = 450;
  const PADDING = 16;
  const FOOTER_H = 80;
  const STRIP_W = FRAME_W + PADDING * 2;
  const PHOTO_AREA_H = (FRAME_H + PADDING) * ordered.length + PADDING;
  const STRIP_H = PHOTO_AREA_H + FOOTER_H;

  // ─── Build composite layers ─────────────────────────────────────────────────

  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < ordered.length; i++) {
    try {
      const photoData = await storageService.getFile(ordered[i].storagePath);
      const resized = await sharp(photoData)
        .resize(FRAME_W, FRAME_H, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 92 })
        .toBuffer();

      composites.push({
        input: resized,
        left: PADDING,
        top: PADDING + i * (FRAME_H + PADDING),
      });
    } catch (err) {
      logger.warn('[PhotoStrip] Failed to load photo', { photoId: ordered[i].id, error: (err as Error).message });
    }
  }

  // ─── Footer SVG ─────────────────────────────────────────────────────────────

  const footerY = PHOTO_AREA_H + 10;
  const title = eventTitle ? eventTitle.substring(0, 40) : 'gästefotos.com';
  const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const footerSvg = Buffer.from(`
    <svg width="${STRIP_W}" height="${FOOTER_H}" xmlns="http://www.w3.org/2000/svg">
      <text x="${STRIP_W / 2}" y="30"
        font-family="${tpl.fontFamily}, sans-serif"
        font-size="18" font-weight="700"
        fill="${tpl.textColor}"
        text-anchor="middle"
        letter-spacing="1">
        ${title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </text>
      <text x="${STRIP_W / 2}" y="55"
        font-family="${tpl.fontFamily}, sans-serif"
        font-size="13"
        fill="${tpl.accentColor}"
        text-anchor="middle"
        letter-spacing="2">
        ${date}
      </text>
      <line x1="${STRIP_W / 2 - 60}" y1="65" x2="${STRIP_W / 2 + 60}" y2="65"
        stroke="${tpl.accentColor}" stroke-width="1" opacity="0.5"/>
    </svg>
  `);

  composites.push({ input: footerSvg, left: 0, top: footerY });

  // ─── Create final strip ──────────────────────────────────────────────────────

  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const stripBuffer = await sharp({
    create: { width: STRIP_W, height: STRIP_H, channels: 3, background: { r, g, b } },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toBuffer();

  // ─── Save to storage ─────────────────────────────────────────────────────────

  const fileName = `strip-${Date.now()}.jpg`;
  const newPath = await storageService.uploadFile(eventId, fileName, stripBuffer, 'image/jpeg');

  // ─── Create Photo record ──────────────────────────────────────────────────────

  const newPhoto = await prisma.photo.create({
    data: {
      eventId,
      storagePath: newPath,
      url: '',
      status: 'APPROVED',
      uploadedBy: uploadedBy || null,
      tags: [`template:${templateId}`, 'photo_strip'],
    },
  });

  await prisma.photo.update({
    where: { id: newPhoto.id },
    data: { url: `/cdn/${newPhoto.id}` },
  });

  logger.info('[PhotoStrip] Created', { eventId, template: templateId, photoCount: ordered.length });

  return {
    newPhotoPath: `/cdn/${newPhoto.id}`,
    template: templateId,
    photoCount: ordered.length,
  };
}
