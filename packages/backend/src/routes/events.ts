import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import archiver from 'archiver';
import multer from 'multer';
import prisma from '../config/database';
import { authMiddleware, requireRole, AuthRequest, issueEventAccessCookie, optionalAuthMiddleware, hasEventAccess } from '../middleware/auth';
import { DEFAULT_EVENT_FEATURES_CONFIG, normalizeEventFeaturesConfig, randomString, slugify } from '@gaestefotos/shared';
import { logger } from '../utils/logger';
import { getActiveEventEntitlement, getEffectiveEventPackage, getEventUsageBreakdown, bigintToString } from '../services/packageLimits';
import { getEventStorageEndsAt } from '../services/storagePolicy';
import { storageService } from '../services/storage';
import { PDFDocument, rgb } from 'pdf-lib';

const router = Router();

const designUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  },
});

const uploadSingleDesignImage = (fieldName: string) => (req: AuthRequest, res: Response, next: any) => {
  designUpload.single(fieldName)(req as any, res as any, (err: any) => {
    if (!err) return next();
    const code = (err as any)?.code;
    if (code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Datei zu groß. Maximum: 10MB' });
    }
    return res.status(400).json({ error: (err as any)?.message || String(err) });
  });
};

async function requireHostOrAdmin(req: AuthRequest, res: Response, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, hostId: true, deletedAt: true, isActive: true, designConfig: true },
  });

  if (!event || event.deletedAt || event.isActive === false) {
    res.status(404).json({ error: 'Event nicht gefunden' });
    return null;
  }

  if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
    res.status(404).json({ error: 'Event nicht gefunden' });
    return null;
  }

  return event;
}

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/).optional(),
  dateTime: z.string().datetime().optional(),
  locationName: z.string().optional(),
  locationGoogleMapsLink: z.string().optional(),
  designConfig: z.record(z.any()).optional(),
  featuresConfig: z.record(z.any()).optional(),
  categories: z
    .array(
      z.object({
        name: z.string().min(1),
        order: z.number().int().optional(),
        isVisible: z.boolean().optional(),
        uploadLocked: z.boolean().optional(),
        uploadLockUntil: z.string().datetime().nullable().optional(),
        dateTime: z.string().datetime().nullable().optional(),
        locationName: z.string().nullable().optional(),
      })
    )
    .optional(),
});

const uploadIssuesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  sinceHours: z.coerce.number().int().min(1).max(24 * 365).optional().default(72),
});

 const trafficSourceSchema = z
   .string()
   .trim()
   .min(1)
   .max(32)
   .regex(/^[a-zA-Z0-9_-]+$/);

 async function trackEventTrafficBySource(eventId: string, source: string) {
   if (!eventId || !source) return;
   try {
     await prisma.eventTrafficStat.upsert({
       where: {
         eventId_source: {
           eventId,
           source,
         },
       },
       create: {
         eventId,
         source,
         count: 1,
       },
       update: {
         count: { increment: 1 },
       },
     });
   } catch (error) {
     logger.error('trackEventTrafficBySource failed', {
       message: (error as any)?.message || String(error),
       eventId,
       source,
     });
   }
 }

const qrExportSchema = z.object({
  format: z.enum(['A6', 'A5']),
  svg: z.string().min(1).max(800_000),
});

const qrPdfOptionsSchema = z.object({
  bleedMm: z.coerce.number().min(0).max(10).optional().default(0),
  cropMarks: z.coerce.boolean().optional().default(false),
  marginMm: z.coerce.number().min(0).max(20).optional().default(6),
});

const qrTemplateConfigSchema = z.object({
  templateSlug: z.string().min(1).max(100),
  format: z.enum(['A6', 'A5']),
  headline: z.string().min(1).max(120),
  subline: z.string().min(0).max(160),
  eventName: z.string().min(0).max(120),
  callToAction: z.string().min(0).max(200),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

function getPrintPixels(format: 'A6' | 'A5') {
  const dpi = 300;
  const mmToPx = (mm: number) => Math.round((mm / 25.4) * dpi);

  if (format === 'A6') {
    return { dpi, width: mmToPx(105), height: mmToPx(148) };
  }
  return { dpi, width: mmToPx(148), height: mmToPx(210) };
}

function getPrintMm(format: 'A6' | 'A5') {
  if (format === 'A6') return { widthMm: 105, heightMm: 148 };
  return { widthMm: 148, heightMm: 210 };
}

function mmToPt(mm: number) {
  return (mm * 72) / 25.4;
}

function drawCropMarks(page: any, trim: { x: number; y: number; w: number; h: number }) {
  // Very small, unobtrusive crop marks for print.
  const markLen = 12;
  const offset = 6;
  const thickness = 0.5;
  const color = rgb(0, 0, 0);

  const left = trim.x;
  const right = trim.x + trim.w;
  const bottom = trim.y;
  const top = trim.y + trim.h;

  // bottom-left
  page.drawLine({ start: { x: left - offset, y: bottom }, end: { x: left - offset - markLen, y: bottom }, thickness, color });
  page.drawLine({ start: { x: left, y: bottom - offset }, end: { x: left, y: bottom - offset - markLen }, thickness, color });
  // bottom-right
  page.drawLine({ start: { x: right + offset, y: bottom }, end: { x: right + offset + markLen, y: bottom }, thickness, color });
  page.drawLine({ start: { x: right, y: bottom - offset }, end: { x: right, y: bottom - offset - markLen }, thickness, color });
  // top-left
  page.drawLine({ start: { x: left - offset, y: top }, end: { x: left - offset - markLen, y: top }, thickness, color });
  page.drawLine({ start: { x: left, y: top + offset }, end: { x: left, y: top + offset + markLen }, thickness, color });
  // top-right
  page.drawLine({ start: { x: right + offset, y: top }, end: { x: right + offset + markLen, y: top }, thickness, color });
  page.drawLine({ start: { x: right, y: top + offset }, end: { x: right, y: top + offset + markLen }, thickness, color });
}

function isSvgObviouslyUnsafe(svg: string): boolean {
  const s = svg.toLowerCase();
  if (s.includes('<script')) return true;
  if (s.includes('onload=')) return true;
  if (s.includes('javascript:')) return true;

  // Avoid remote fetches in embedded images.
  if (s.includes('href="http')) return true;
  if (s.includes("href='http")) return true;
  if (s.includes('xlink:href="http')) return true;
  if (s.includes("xlink:href='http")) return true;

  return false;
}

function getViewBoxSize(svg: string): { w: number; h: number } | null {
  const match = svg.match(/viewBox\s*=\s*"\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*"/i);
  if (!match) return null;
  const w = Number(match[3]);
  const h = Number(match[4]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { w, h };
}

async function getUniqueEventSlug(preferredSlug: string): Promise<string> {
  // Avoid tight infinite loops, but collisions should be extremely unlikely.
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? preferredSlug : `${preferredSlug}-${randomString(4).toLowerCase()}`;
    const existingEvent = await prisma.event.findUnique({ where: { slug: candidate } });
    if (!existingEvent) return candidate;
  }
  // Last resort
  return `event-${randomString(12).toLowerCase()}`;
}

// Get all events (for current user)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        hostId: req.userId,
      },
      include: {
        _count: {
          select: {
            photos: true,
            guests: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ events });
  } catch (error) {
    logger.error('Get events error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get QR template config for an event (host/admin)
router.get('/:id/qr/config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await requireHostOrAdmin(req, res, eventId);
    if (!event) return;

    const designConfig = (event.designConfig as any) || {};
    const qrTemplateConfig = designConfig.qrTemplateConfig || null;
    return res.json({ ok: true, qrTemplateConfig });
  } catch (error) {
    logger.error('Get QR config error', { message: (error as any)?.message || String(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Save QR template config for an event (host/admin)
router.put('/:id/qr/config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const parsed = qrTemplateConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige QR-Konfiguration' });
    }

    const event = await requireHostOrAdmin(req, res, eventId);
    if (!event) return;

    const designConfig = (event.designConfig as any) || {};
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        designConfig: {
          ...designConfig,
          qrTemplateConfig: parsed.data,
        },
      },
      select: { id: true, designConfig: true, updatedAt: true },
    });

    return res.json({ ok: true, event: updated });
  } catch (error) {
    logger.error('Save QR config error', { message: (error as any)?.message || String(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Export QR template as high-res PNG (print)
router.post('/:id/qr/export.png', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const parsed = qrExportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Export-Daten' });
    }

    const event = await requireHostOrAdmin(req, res, eventId);
    if (!event) return;

    const { format, svg } = parsed.data;
    if (isSvgObviouslyUnsafe(svg)) {
      return res.status(400).json({ error: 'SVG enthält unsichere Inhalte' });
    }

    const { width, height, dpi } = getPrintPixels(format);

    // Prefer WASM renderer (resvg) to avoid native module issues.
    let png: Buffer | null = null;
    try {
      const { Resvg } = require('@resvg/resvg-js');
      const vb = getViewBoxSize(svg);
      const scale = vb ? width / vb.w : 1;
      const resvg = new Resvg(svg, {
        background: 'white',
        fitTo: { mode: 'zoom', value: scale },
        font: {
          // Use system fonts; designer fonts will be handled later.
          loadSystemFonts: true,
        },
      });
      const rendered = resvg.render();
      png = Buffer.from(rendered.asPng());
    } catch (e) {
      logger.warn('QR export PNG: resvg unavailable/failed, falling back', { message: (e as any)?.message || String(e) });
    }

    if (!png) {
      // Fallback to sharp if available (native).
      try {
        const sharpLib = require('sharp');
        png = await sharpLib(Buffer.from(svg, 'utf8'), { density: dpi })
          .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png({ compressionLevel: 9 })
          .toBuffer();
      } catch (e) {
        logger.error('QR export PNG: no renderer available', { message: (e as any)?.message || String(e) });
        return res.status(501).json({
          error: 'PNG Export ist auf diesem Server nicht verfügbar (Renderer fehlt/ist nicht kompatibel).',
        });
      }
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="qr-aufsteller-${eventId}-${format}.png"`);
    return res.send(png);
  } catch (error) {
    logger.error('QR export PNG error', { message: (error as any)?.message || String(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Export QR template as PDF (print)
router.post('/:id/qr/export.pdf', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const parsed = qrExportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Export-Daten' });
    }

    const pdfOptsParsed = qrPdfOptionsSchema.safeParse(req.body);
    if (!pdfOptsParsed.success) {
      return res.status(400).json({ error: 'Ungültige PDF Optionen' });
    }

    const event = await requireHostOrAdmin(req, res, eventId);
    if (!event) return;

    const { format, svg } = parsed.data;
    if (isSvgObviouslyUnsafe(svg)) {
      return res.status(400).json({ error: 'SVG enthält unsichere Inhalte' });
    }

    // Hosts get "idiotensicher" output: no bleed, no crop marks.
    const isAdmin = req.userRole === 'ADMIN';
    const bleedMm = isAdmin ? pdfOptsParsed.data.bleedMm : 0;
    const cropMarks = isAdmin ? pdfOptsParsed.data.cropMarks : false;
    const requestedMarginMm = isAdmin ? pdfOptsParsed.data.marginMm : 6;
    const marginMm = bleedMm > 0 || cropMarks ? 0 : requestedMarginMm;

    const { widthMm, heightMm } = getPrintMm(format);
    const pageWidthPt = mmToPt(widthMm + 2 * bleedMm);
    const pageHeightPt = mmToPt(heightMm + 2 * bleedMm);
    const trimWidthPt = mmToPt(widthMm);
    const trimHeightPt = mmToPt(heightMm);

    // Render SVG to a high-res PNG. We keep a 300dpi-ish ratio by targeting pixels.
    const { width: renderWidthPx } = getPrintPixels(format);

    let png: Buffer | null = null;
    try {
      const { Resvg } = require('@resvg/resvg-js');
      const vb = getViewBoxSize(svg);
      const scale = vb ? renderWidthPx / vb.w : 1;
      const resvg = new Resvg(svg, {
        background: 'white',
        fitTo: { mode: 'zoom', value: scale },
        font: { loadSystemFonts: true },
      });
      png = Buffer.from(resvg.render().asPng());
    } catch (e) {
      logger.warn('QR export PDF: resvg failed', { message: (e as any)?.message || String(e) });
    }

    if (!png) {
      return res.status(501).json({ error: 'PDF Export ist auf diesem Server nicht verfügbar (Renderer fehlt).' });
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([pageWidthPt, pageHeightPt]);
    const img = await pdf.embedPng(png);

    const trimX = mmToPt(bleedMm);
    const trimY = mmToPt(bleedMm);

    const marginPt = mmToPt(marginMm);
    const targetX = trimX + marginPt;
    const targetY = trimY + marginPt;
    const targetW = Math.max(1, trimWidthPt - 2 * marginPt);
    const targetH = Math.max(1, trimHeightPt - 2 * marginPt);

    const imgW = img.width;
    const imgH = img.height;
    const scale = Math.min(targetW / imgW, targetH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = targetX + (targetW - drawW) / 2;
    const drawY = targetY + (targetH - drawH) / 2;

    page.drawImage(img, { x: drawX, y: drawY, width: drawW, height: drawH });

    if (cropMarks && bleedMm > 0) {
      drawCropMarks(page, { x: trimX, y: trimY, w: trimWidthPt, h: trimHeightPt });
    }

    const pdfBytes = await pdf.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="qr-aufsteller-${eventId}-${format}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    logger.error('QR export PDF error', { message: (error as any)?.message || String(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleEventStorageUsage(req: AuthRequest, res: Response) {
  try {
    const eventId = req.params.id;

    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, deletedAt: true, isActive: true },
    });

    if (!existingEvent || existingEvent.deletedAt || existingEvent.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Storage usage/limits are host/admin only.
    // Guests should not see 401s here (they don't have a JWT); return 404 instead.
    if (existingEvent.hostId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const [entitlement, usage] = await Promise.all([
      getActiveEventEntitlement(eventId),
      getEventUsageBreakdown(eventId),
    ]);

    const pkg = entitlement?.wcSku
      ? await prisma.packageDefinition.findFirst({
          where: { sku: entitlement.wcSku, isActive: true },
          select: { sku: true, name: true, resultingTier: true, type: true },
        })
      : null;

    return res.json({
      ok: true,
      eventId,
      enforceStorageLimits: process.env.ENFORCE_STORAGE_LIMITS === 'true',
      entitlement: entitlement
        ? {
            ...entitlement,
            storageLimitBytes: bigintToString((entitlement as any).storageLimitBytes as any),
            package: pkg,
          }
        : null,
      usage: {
        photosBytes: usage.photosBytes.toString(),
        videosBytes: usage.videosBytes.toString(),
        guestbookBytes: usage.guestbookBytes.toString(),
        guestbookPendingBytes: usage.guestbookPendingBytes.toString(),
        designBytes: usage.designBytes.toString(),
        totalBytes: usage.totalBytes.toString(),
      },
    });
  } catch (error) {
    logger.error('Get storage limits error', {
      message: (error as any)?.message || String(error),
      eventId: req.params.id,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

router.get(
  '/:eventId/download-zip',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          slug: true,
          hostId: true,
          featuresConfig: true,
          deletedAt: true,
          isActive: true,
        },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const isHost = !!req.userId && req.userId === event.hostId;
      const isAdmin = req.userRole === 'ADMIN';
      const isGuestWithAccess = hasEventAccess(req, eventId);

      if (!isHost && !isAdmin && !isGuestWithAccess) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const storageEndsAt = await getEventStorageEndsAt(eventId);
      if (storageEndsAt && Date.now() > storageEndsAt.getTime()) {
        return res.status(404).json({ error: 'Speicherperiode beendet' });
      }

      const featuresConfig = (event.featuresConfig || {}) as any;
      if (!isHost && !isAdmin && featuresConfig?.allowDownloads === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const photos = await prisma.photo.findMany({
        where: {
          eventId,
          deletedAt: null,
          status: (isHost || isAdmin) ? undefined : 'APPROVED',
        },
        select: { id: true, storagePath: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!photos.length) {
        return res.status(404).json({ error: 'Keine Fotos gefunden' });
      }

      const filename = `${event.slug || 'event'}-photos.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Cache-Control', 'private, max-age=0');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => {
        logger.error('ZIP archive error', { message: (err as any)?.message || String(err), eventId });
        try {
          res.status(500).end();
        } catch {
          // noop
        }
      });

      archive.pipe(res);

      for (const photo of photos) {
        if (!photo.storagePath) continue;
        const buf = await storageService.getFile(photo.storagePath);
        const ext = (photo.storagePath.split('.').pop() || 'jpg').toLowerCase();
        archive.append(buf, { name: `photo-${photo.id}.${ext}` });
      }

      await archive.finalize();
    } catch (error) {
      logger.error('Download zip error', { message: (error as any)?.message || String(error) });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Backwards-compatible proxy route for event design assets.
// Some frontend components expect /api/events/:eventId/design-image/:kind/:storagePath.
router.get('/:eventId/design-image/:kind/:storagePath', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, kind, storagePath } = req.params;
    if (!['profile', 'cover', 'logo'].includes(kind)) {
      return res.status(404).json({ error: 'Nicht gefunden' });
    }

    const decoded = decodeURIComponent(storagePath);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const buf = await storageService.getFile(decoded);
    const ext = (decoded.split('.').pop() || '').toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buf);
  } catch (error) {
    logger.error('Design image proxy error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Proxy route for event design assets (avoid mixed-content by never returning presigned http:// urls)
router.get('/:eventId/design/file/:storagePath', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, storagePath } = req.params;
    const decoded = decodeURIComponent(storagePath);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const buf = await storageService.getFile(decoded);
    const ext = (decoded.split('.').pop() || '').toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buf);
  } catch (error) {
    logger.error('Design asset proxy error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Upload event logo (used for white-label branding)
router.post(
  '/:id/logo',
  authMiddleware,
  uploadSingleDesignImage('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const event = await requireHostOrAdmin(req, res, eventId);
      if (!event) return;

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Kein Bild hochgeladen' });
      }

      const storagePath = await storageService.uploadFile(eventId, file.originalname, file.buffer, file.mimetype);
      const url = `/api/events/${eventId}/design-image/logo/${encodeURIComponent(storagePath)}`;

      const designConfig = (event.designConfig as any) || {};
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: { designConfig: { ...designConfig, logoUrl: url, logoStoragePath: storagePath } },
      });

      return res.status(200).json({ ok: true, event: updated });
    } catch (error) {
      logger.error('Upload logo error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      return res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

router.post(
  '/:id/upload-profile-image',
  authMiddleware,
  uploadSingleDesignImage('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const event = await requireHostOrAdmin(req, res, eventId);
      if (!event) return;

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Kein Bild hochgeladen' });
      }

      const storagePath = await storageService.uploadFile(eventId, file.originalname, file.buffer, file.mimetype);
      const url = `/api/events/${eventId}/design/file/${encodeURIComponent(storagePath)}`;

      const designConfig = (event.designConfig as any) || {};
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: { designConfig: { ...designConfig, profileImage: url, profileImageStoragePath: storagePath } },
      });

      return res.status(200).json({ ok: true, event: updated });
    } catch (error) {
      logger.error('Upload profile image error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      return res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

router.post(
  '/:id/upload-cover-image',
  authMiddleware,
  uploadSingleDesignImage('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const event = await requireHostOrAdmin(req, res, eventId);
      if (!event) return;

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Kein Bild hochgeladen' });
      }

      const storagePath = await storageService.uploadFile(eventId, file.originalname, file.buffer, file.mimetype);
      const url = `/api/events/${eventId}/design/file/${encodeURIComponent(storagePath)}`;

      const designConfig = (event.designConfig as any) || {};
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: { designConfig: { ...designConfig, coverImage: url, coverImageStoragePath: storagePath } },
      });

      return res.status(200).json({ ok: true, event: updated });
    } catch (error) {
      logger.error('Upload cover image error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      return res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Get event by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            photos: true,
            guests: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event not found' });
    }

    const storageEndsAt = await getEventStorageEndsAt(event.id);
    const isStorageLocked = storageEndsAt ? Date.now() > storageEndsAt.getTime() : false;
    const effectivePackage = await getEffectiveEventPackage(event.id);
    res.json({ event: { ...event, storageEndsAt, isStorageLocked, effectivePackage } });
  } catch (error) {
    logger.error('Get event error', { message: (error as any)?.message || String(error), eventId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event by slug (public)
router.get('/slug/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { slug: req.params.slug },
      include: {
        host: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            photos: true,
            guests: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const rawSource = typeof req.query.source === 'string' ? req.query.source : '';
    const parsedSource = trafficSourceSchema.safeParse(rawSource);
    if (parsedSource.success) {
      await trackEventTrafficBySource(event.id, parsedSource.data.toLowerCase());
    }

    const storageEndsAt = await getEventStorageEndsAt(event.id);
    const isStorageLocked = storageEndsAt ? Date.now() > storageEndsAt.getTime() : false;
    const effectivePackage = await getEffectiveEventPackage(event.id);

    // Issue access cookie for guests so follow-up public endpoints work in a fresh browser.
    issueEventAccessCookie(res, event.id);
    res.json({ event: { ...event, storageEndsAt, isStorageLocked, effectivePackage } });
  } catch (error) {
    logger.error('Get event by slug error', { message: (error as any)?.message || String(error), slug: req.params.slug });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event traffic stats (host/admin)
router.get('/:id/traffic', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const stats = await prisma.eventTrafficStat.findMany({
      where: { eventId },
      select: { source: true, count: true, firstSeenAt: true, lastSeenAt: true },
      orderBy: { count: 'desc' },
    });

    return res.json({ ok: true, stats });
  } catch (error) {
    logger.error('Get event traffic stats error', { message: (error as any)?.message || String(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
router.post(
  '/',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const data = createEventSchema.parse(req.body);

      // Free-event limit enforcement (default: 3) for hosts.
      // An event is considered "free" if it has no ACTIVE entitlement for the owner.
      const freeLimit = Number(process.env.FREE_EVENT_LIMIT || 3);
      if (Number.isFinite(freeLimit) && freeLimit > 0) {
        const host = await prisma.user.findUnique({
          where: { id: req.userId! },
          select: { wordpressUserId: true },
        });

        const freeEventCount = await prisma.event.count({
          where: {
            hostId: req.userId!,
            deletedAt: null,
            isActive: true,
            ...(host?.wordpressUserId
              ? {
                  NOT: {
                    entitlements: {
                      some: {
                        status: 'ACTIVE',
                        wpUserId: host.wordpressUserId,
                      },
                    },
                  },
                }
              : {
                  NOT: {
                    entitlements: {
                      some: {
                        status: 'ACTIVE',
                      },
                    },
                  },
                }),
          },
        });

        if (freeEventCount >= freeLimit) {
          return res.status(403).json({
            error:
              'Du hast das Limit von 3 kostenlosen Events erreicht. Bitte upgrade dein Paket, um weitere Events zu erstellen.',
            code: 'FREE_EVENT_LIMIT_REACHED',
            limit: freeLimit,
            current: freeEventCount,
          });
        }
      }

      // Generate slug if not provided
      let preferredSlug = data.slug || slugify(data.title);
      if (!preferredSlug || preferredSlug.length < 3) {
        preferredSlug = `event-${randomString(8).toLowerCase()}`;
      }
      const slug = await getUniqueEventSlug(preferredSlug);

      const categoriesCreate = (data.categories || [])
        .filter((c) => (c.name || '').trim().length > 0)
        .map((c, idx) => ({
          name: c.name,
          order: typeof c.order === 'number' ? c.order : idx,
          isVisible: c.isVisible ?? true,
          uploadLocked: c.uploadLocked ?? false,
          uploadLockUntil: c.uploadLockUntil ? new Date(c.uploadLockUntil) : null,
          dateTime: c.dateTime ? new Date(c.dateTime) : null,
          locationName: c.locationName ?? null,
        }));

      const event = await prisma.event.create({
        data: {
          hostId: req.userId!,
          title: data.title,
          slug,
          dateTime: data.dateTime ? new Date(data.dateTime) : null,
          locationName: data.locationName,
          locationGoogleMapsLink: data.locationGoogleMapsLink,
          designConfig: data.designConfig || {},
          featuresConfig: normalizeEventFeaturesConfig(data.featuresConfig || DEFAULT_EVENT_FEATURES_CONFIG),
          ...(categoriesCreate.length > 0
            ? {
                categories: {
                  create: categoriesCreate,
                },
              }
            : {}),
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({ event });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Create event error', { message: (error as any)?.message || String(error) });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Alias: frontend uses PATCH for partial updates (e.g. design builder)
router.patch(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const existingEvent = await prisma.event.findUnique({
        where: { id: req.params.id },
      });

      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (existingEvent.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const data = createEventSchema.partial().parse(req.body);
      const { categories: _categories, ...eventData } = data as any;

      const event = await prisma.event.update({
        where: { id: req.params.id },
        data: {
          ...eventData,
          dateTime: eventData.dateTime ? new Date(eventData.dateTime) : undefined,
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return res.json({ event });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Patch event error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.get(
  '/:id/storage-limits',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { hostId: true, deletedAt: true, isActive: true },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(404).json({ error: 'Event not found' });
      }

      const storageEndsAt = await getEventStorageEndsAt(eventId);
      const isStorageLocked = storageEndsAt ? Date.now() > storageEndsAt.getTime() : false;
      const effectivePackage = await getEffectiveEventPackage(eventId);
      res.json({ storageEndsAt, isStorageLocked, effectivePackage });
    } catch (error) {
      logger.error('Get storage limits error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.get(
  '/:id/upload-issues',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const { limit, sinceHours } = uploadIssuesQuerySchema.parse(req.query);

      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
        select: { hostId: true, deletedAt: true, isActive: true },
      });

      if (!existingEvent || existingEvent.deletedAt || existingEvent.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (existingEvent.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
      const now = new Date();

      const [
        tempDeletedPhotos,
        tempDeletedVideos,
        scanErrorPhotos,
        scanPendingPhotos,
        scanErrorVideos,
        scanPendingVideos,
        guestbookExpiredUploads,
      ] =
        await Promise.all([
          prisma.photo.findMany({
            where: {
              eventId,
              deletedAt: { not: null },
              status: 'DELETED',
              storagePath: '',
              url: '',
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, deletedAt: true, uploadedBy: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          prisma.video.findMany({
            where: {
              eventId,
              deletedAt: { not: null },
              status: 'DELETED',
              storagePath: '',
              url: '',
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, deletedAt: true, uploadedBy: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          prisma.photo.findMany({
            where: {
              eventId,
              deletedAt: null,
              status: { not: 'DELETED' },
              exifData: { path: ['scanStatus'], equals: 'ERROR' },
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, uploadedBy: true, exifData: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          prisma.photo.findMany({
            where: {
              eventId,
              deletedAt: null,
              status: { not: 'DELETED' },
              exifData: { path: ['scanStatus'], equals: 'PENDING' },
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, uploadedBy: true, exifData: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          (prisma as any).video.findMany({
            where: {
              eventId,
              deletedAt: null,
              status: { not: 'DELETED' },
              scanStatus: 'ERROR',
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, uploadedBy: true, scanError: true, scannedAt: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          (prisma as any).video.findMany({
            where: {
              eventId,
              deletedAt: null,
              status: { not: 'DELETED' },
              scanStatus: 'PENDING',
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, uploadedBy: true, scannedAt: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          (prisma as any).guestbookPhotoUpload.findMany({
            where: {
              eventId,
              expiresAt: { lt: now },
              claimedAt: { not: null },
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, claimedAt: true, expiresAt: true, storagePath: true, sizeBytes: true },
            orderBy: { expiresAt: 'desc' },
            take: limit,
          }),
        ]);

      res.json({
        ok: true,
        eventId,
        since: since.toISOString(),
        counts: {
          tempDeletedPhotos: tempDeletedPhotos.length,
          tempDeletedVideos: tempDeletedVideos.length,
          scanErrorPhotos: scanErrorPhotos.length,
          scanPendingPhotos: scanPendingPhotos.length,
          scanErrorVideos: scanErrorVideos.length,
          scanPendingVideos: scanPendingVideos.length,
          guestbookExpiredUploads: guestbookExpiredUploads.length,
        },
        items: {
          tempDeletedPhotos,
          tempDeletedVideos,
          scanErrorPhotos: scanErrorPhotos.map((p) => ({
            id: p.id,
            createdAt: p.createdAt,
            uploadedBy: p.uploadedBy,
            scanError: (p.exifData as any)?.scanError,
            scanUpdatedAt: (p.exifData as any)?.scanUpdatedAt,
          })),
          scanPendingPhotos: scanPendingPhotos.map((p) => ({
            id: p.id,
            createdAt: p.createdAt,
            uploadedBy: p.uploadedBy,
            scanUpdatedAt: (p.exifData as any)?.scanUpdatedAt,
          })),
          scanErrorVideos: scanErrorVideos.map((v: any) => ({
            id: v.id,
            createdAt: v.createdAt,
            uploadedBy: v.uploadedBy,
            scanError: v.scanError,
            scannedAt: v.scannedAt,
          })),
          scanPendingVideos: scanPendingVideos.map((v: any) => ({
            id: v.id,
            createdAt: v.createdAt,
            uploadedBy: v.uploadedBy,
            scannedAt: v.scannedAt,
          })),
          guestbookExpiredUploads,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Get upload issues error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

function getInviteJwtSecret(): string | null {
  return process.env.INVITE_JWT_SECRET || process.env.JWT_SECRET || null;
}

function getInviteTtlSeconds(): number {
  return Number(process.env.INVITE_TOKEN_TTL_SECONDS || 60 * 60); // 1h
}

function getInviteTokenFromRequest(req: any): string | null {
  const inviteFromQuery = typeof req.query?.invite === 'string' ? req.query.invite : null;
  const inviteFromHeader = typeof req.headers['x-invite-token'] === 'string' ? (req.headers['x-invite-token'] as string) : null;
  return inviteFromQuery || inviteFromHeader || null;
}

router.post('/:id/access', async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const inviteToken = getInviteTokenFromRequest(req);

    if (!inviteToken) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const secret = getInviteJwtSecret();
    if (!secret) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(inviteToken, secret);
    } catch {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const t = decoded?.type;
    const okType = t === 'invite' || t === 'event_invite';
    if (!okType || decoded?.eventId !== eventId) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Ensure event exists and is active (avoid issuing cookies for deleted events)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    issueEventAccessCookie(res, eventId);
    return res.json({ ok: true });
  } catch (error) {
    logger.error('Issue event access cookie error', {
      message: (error as any)?.message || String(error),
      eventId: req.params.id,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/invite-token', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true, title: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const secret = getInviteJwtSecret();
    if (!secret) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const inviteToken = jwt.sign(
      { type: 'event_invite', eventId },
      secret,
      { expiresIn: getInviteTtlSeconds() }
    );

    const frontendBaseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL || '';
    const shareUrl = event.slug
      ? `${frontendBaseUrl}/e2/${event.slug}?invite=${encodeURIComponent(inviteToken)}`
      : null;

    return res.json({ ok: true, eventId, inviteToken, shareUrl });
  } catch (error) {
    logger.error('Mint event invite token error', {
      message: (error as any)?.message || String(error),
      eventId: req.params.id,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Backwards-compatible alias used by some frontend pages
router.get('/:id/usage', optionalAuthMiddleware, handleEventStorageUsage);

// Update event
router.put(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      // Check ownership
      const existingEvent = await prisma.event.findUnique({
        where: { id: req.params.id },
      });

      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (existingEvent.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const data = createEventSchema.partial().parse(req.body);

      // Categories are managed via dedicated category endpoints, not via event update.
      const { categories: _categories, ...eventData } = data as any;

      const event = await prisma.event.update({
        where: { id: req.params.id },
        data: {
          ...eventData,
          dateTime: eventData.dateTime ? new Date(eventData.dateTime) : undefined,
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json({ event });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Update event error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete event
router.delete(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      // Check ownership
      const existingEvent = await prisma.event.findUnique({
        where: { id: req.params.id },
      });

      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (existingEvent.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.event.delete({
        where: { id: req.params.id },
      });

      res.json({ message: 'Event deleted' });
    } catch (error) {
      logger.error('Delete event error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

