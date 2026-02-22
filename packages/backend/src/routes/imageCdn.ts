/**
 * Image CDN Route
 * 
 * CDN-friendly image serving with on-the-fly resizing and format conversion.
 * URL pattern: /cdn/:photoId?w=400&q=80&f=webp
 * 
 * Features:
 * - Query-based resize (w=width, h=height)
 * - Format conversion (f=webp|jpeg|png|avif)
 * - Quality control (q=1-100)
 * - Strong cache headers (immutable content-addressed)
 * - ETag support for conditional requests
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { storageService } from '../services/storage';
import { optionalAuthMiddleware, hasEventAccess, hasEventManageAccess, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

let sharp: any;
try {
  sharp = require('sharp');
} catch {}

const router = Router();

// Allowed resize presets to prevent abuse
const ALLOWED_WIDTHS = [100, 200, 300, 400, 600, 800, 1200, 1920];
const ALLOWED_FORMATS = ['jpeg', 'webp', 'png', 'avif'] as const;
type ImageFormat = (typeof ALLOWED_FORMATS)[number];

function clampWidth(w: number): number {
  // Snap to nearest allowed width
  return ALLOWED_WIDTHS.reduce((prev, curr) =>
    Math.abs(curr - w) < Math.abs(prev - w) ? curr : prev
  );
}

function parseParams(query: any): {
  width: number | null;
  height: number | null;
  quality: number;
  format: ImageFormat | null;
} {
  const w = parseInt(query.w, 10);
  const h = parseInt(query.h, 10);
  const q = parseInt(query.q, 10);
  const f = String(query.f || '').toLowerCase();

  return {
    width: Number.isFinite(w) && w > 0 ? clampWidth(w) : null,
    height: Number.isFinite(h) && h > 0 ? Math.min(h, 1920) : null,
    quality: Number.isFinite(q) && q >= 1 && q <= 100 ? q : 80,
    format: ALLOWED_FORMATS.includes(f as any) ? (f as ImageFormat) : null,
  };
}

/**
 * GET /cdn/:photoId
 * Serves optimized images with CDN-friendly cache headers.
 */
router.get('/:photoId', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const params = parseParams(req.query);

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        event: {
          select: { deletedAt: true, isActive: true, password: true },
        },
      },
    });

    if (!photo || photo.deletedAt || photo.status !== 'APPROVED') {
      return res.status(404).end();
    }

    if (photo.event.deletedAt || photo.event.isActive === false) {
      return res.status(404).end();
    }

    // Access check: public events (no password) are freely accessible.
    // Password-protected events require event access cookie or manager role.
    const isPublicEvent = !photo.event.password;
    if (!isPublicEvent) {
      const isManager = req.userId ? await hasEventManageAccess(req, photo.eventId) : false;
      if (!isManager && !hasEventAccess(req, photo.eventId)) {
        return res.status(404).end();
      }
    }

    // Generate ETag from photo ID + params + updatedAt
    const etagSource = `${photoId}:${params.width}:${params.height}:${params.quality}:${params.format}:${photo.updatedAt.getTime()}`;
    const etag = `"${crypto.createHash('md5').update(etagSource).digest('hex')}"`;

    // Conditional request support
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    // Choose source: prefer WebP storage if format=webp and it exists
    let sourcePath = photo.storagePath;
    if (params.format === 'webp' && photo.storagePathWebp) {
      sourcePath = photo.storagePathWebp;
    }

    if (!sourcePath) {
      return res.status(404).end();
    }

    let buffer = await storageService.getFile(sourcePath);

    // Apply transformations if sharp is available and params are set
    if (sharp && (params.width || params.height || params.format)) {
      let pipeline = sharp(buffer).rotate();

      if (params.width || params.height) {
        pipeline = pipeline.resize(params.width ?? undefined, params.height ?? undefined, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const format = params.format || 'jpeg';
      switch (format) {
        case 'webp':
          pipeline = pipeline.webp({ quality: params.quality });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality: params.quality });
          break;
        case 'png':
          pipeline = pipeline.png();
          break;
        case 'jpeg':
        default:
          pipeline = pipeline.jpeg({ quality: params.quality, progressive: true });
          break;
      }

      buffer = await pipeline.toBuffer();
    }

    // Content type
    const format = params.format || (sourcePath.endsWith('.webp') ? 'webp' : 'jpeg');
    const contentTypes: Record<string, string> = {
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      png: 'image/png',
      avif: 'image/avif',
    };

    res.setHeader('Content-Type', contentTypes[format] || 'image/jpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('ETag', etag);
    // Long cache: images are immutable (photoId is unique, params are in URL)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vary', 'Accept');

    res.send(buffer);

    // Non-blocking: increment view counter (skip for thumbnail/tiny requests)
    if (!params.width || params.width >= 400) {
      prisma.photo.update({ where: { id: photoId }, data: { views: { increment: 1 } } }).catch(() => {});
    }
  } catch (error: any) {
    const msg = error.message || '';
    // S3/SeaweedFS "NoSuchKey" or similar → return 404, not 500
    const isNotFound = error.name === 'NoSuchKey' || msg.includes('does not exist') || msg.includes('NoSuchKey') || msg.includes('not found') || error.$metadata?.httpStatusCode === 404;
    if (isNotFound) {
      logger.warn('[ImageCDN] Storage key missing', { photoId: req.params.photoId });
      return res.status(404).end();
    }
    logger.error('[ImageCDN] Error serving image', {
      photoId: req.params.photoId,
      error: msg,
    });
    res.status(500).end();
  }
});

export default router;
