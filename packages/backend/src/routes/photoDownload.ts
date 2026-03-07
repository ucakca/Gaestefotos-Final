import { Router, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { storageService } from '../services/storage';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/events/:eventId/photos/download-zip — Download all event photos as ZIP
router.get(
  '/:eventId/photos/download-zip',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Zugriff verweigert' });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, slug: true } });
      if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

      const photos = await prisma.photo.findMany({
        where: { eventId, deletedAt: null, status: { not: 'DELETED' as any } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, storagePath: true, url: true, createdAt: true },
      });

      if (photos.length === 0) {
        return res.status(404).json({ error: 'Keine Fotos zum Herunterladen' });
      }

      const archiver = require('archiver');
      const safeName = (event.slug || event.id).replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}-fotos.zip"`);

      const archive = archiver('zip', { zlib: { level: 1 } }); // level 1 = fast (photos already compressed)
      archive.on('error', (err: Error) => {
        logger.error('ZIP archive error', { err: err.message, eventId });
        if (!res.headersSent) res.status(500).json({ error: 'ZIP-Fehler' });
      });

      archive.pipe(res);

      let added = 0;
      for (const photo of photos) {
        try {
          if (photo.storagePath) {
            const buffer = await storageService.getFile(photo.storagePath);
            const ext = photo.storagePath.split('.').pop() || 'jpg';
            archive.append(buffer, { name: `foto-${String(added + 1).padStart(4, '0')}.${ext}` });
            added++;
          }
        } catch (err: any) {
          logger.warn('Skip photo in ZIP', { photoId: photo.id, err: err.message });
        }
      }

      await archive.finalize();
      logger.info('ZIP download complete', { eventId, photoCount: added });
    } catch (error: any) {
      logger.error('ZIP download error', { error: error.message, eventId: req.params.eventId });
      if (!res.headersSent) res.status(500).json({ error: 'Fehler beim ZIP-Download' });
    }
  }
);

// GET /:photoId/exif — Extract EXIF metadata + PNG SD parameters (free, local, sharp)
router.get(
  '/:photoId/exif',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: { id: true, eventId: true, storagePath: true },
      });
      if (!photo || !photo.storagePath) {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      const { storageService } = await import('../services/storage');
      const buffer = await storageService.getFile(photo.storagePath);

      const sharpLib = require('sharp');
      const metadata = await sharpLib(buffer).metadata();

      // Extract SD generation parameters from PNG tEXt chunk
      let sdParams: Record<string, string> = {};
      if (metadata.format === 'png') {
        try {
          // Walk raw buffer for PNG tEXt chunks
          let offset = 8; // skip PNG signature
          while (offset < buffer.length - 12) {
            const chunkLen = buffer.readUInt32BE(offset);
            const chunkType = buffer.slice(offset + 4, offset + 8).toString('ascii');
            if (chunkType === 'tEXt') {
              const data = buffer.slice(offset + 8, offset + 8 + chunkLen).toString('latin1');
              const sepIdx = data.indexOf('\0');
              if (sepIdx !== -1) {
                const key = data.slice(0, sepIdx);
                const value = data.slice(sepIdx + 1);
                sdParams[key] = value;
              }
            }
            if (chunkType === 'IEND') break;
            offset += 12 + chunkLen;
          }
        } catch (_) {
          // ignore chunk parsing errors
        }
      }

      // Parse SD "parameters" key (Automatic1111 format)
      let sdParsed: {
        prompt?: string;
        negativePrompt?: string;
        steps?: string;
        cfg?: string;
        seed?: string;
        model?: string;
        sampler?: string;
        size?: string;
      } = {};
      const rawParams = sdParams['parameters'] || sdParams['Parameters'] || '';
      if (rawParams) {
        const negMatch = rawParams.match(/Negative prompt:\s*([\s\S]*?)(?=Steps:|$)/i);
        const stepsMatch = rawParams.match(/Steps:\s*(\d+)/i);
        const cfgMatch = rawParams.match(/CFG scale:\s*([\d.]+)/i);
        const seedMatch = rawParams.match(/Seed:\s*(\d+)/i);
        const modelMatch = rawParams.match(/Model:\s*([^,\n]+)/i);
        const samplerMatch = rawParams.match(/Sampler:\s*([^,\n]+)/i);
        const sizeMatch = rawParams.match(/Size:\s*([^,\n]+)/i);

        const negStart = rawParams.search(/Negative prompt:/i);
        sdParsed = {
          prompt: negStart > 0 ? rawParams.slice(0, negStart).trim() : rawParams.split('\n')[0].trim(),
          negativePrompt: negMatch?.[1]?.trim(),
          steps: stepsMatch?.[1],
          cfg: cfgMatch?.[1],
          seed: seedMatch?.[1],
          model: modelMatch?.[1]?.trim(),
          sampler: samplerMatch?.[1]?.trim(),
          size: sizeMatch?.[1]?.trim(),
        };
      }

      res.json({
        photoId,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        space: metadata.space,
        channels: metadata.channels,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        hasProfile: metadata.hasProfile,
        exif: metadata.exif ? Object.fromEntries(
          Object.entries(metadata.exif as any).filter(([, v]) => v !== undefined)
        ) : null,
        icc: !!metadata.icc,
        software: (metadata as any).Software || null,
        pngText: Object.keys(sdParams).length > 0 ? sdParams : null,
        sdParameters: Object.keys(sdParsed).length > 0 ? sdParsed : null,
        isAiGenerated: !!(sdParams['parameters'] || sdParams['Parameters'] || (metadata as any).Software?.match(/stable diffusion|comfyui|midjourney/i)),
      });
    } catch (error: any) {
      logger.error('EXIF read error', { error: error.message, photoId: req.params.photoId });
      res.status(500).json({ error: 'EXIF-Analyse fehlgeschlagen' });
    }
  }
);

export default router;
