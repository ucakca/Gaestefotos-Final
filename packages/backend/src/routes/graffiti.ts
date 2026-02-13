import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, authMiddleware, optionalAuthMiddleware, hasEventAccess, hasEventManageAccess } from '../middleware/auth';
import { storageService } from '../services/storage';
import { logger } from '../utils/logger';

const router = Router();

// ─── SAVE GRAFFITI LAYER (Guest draws on photo) ────────────────────────────

router.post('/', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, drawingData } = req.body;

    if (!photoId || !eventId || !drawingData) {
      return res.status(400).json({ error: 'photoId, eventId und drawingData sind erforderlich' });
    }

    // Verify photo exists and belongs to event
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, eventId },
    });
    if (!photo) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    const layer = await prisma.graffitiLayer.create({
      data: {
        photoId,
        eventId,
        drawingData,
        createdBy: req.userId || null,
      },
    });

    res.status(201).json({ layer });
  } catch (error) {
    logger.error('Save graffiti error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

// ─── SAVE MERGED GRAFFITI (photo + drawing merged as new image) ─────────────

router.post('/merge', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { layerId, mergedImageBase64 } = req.body;

    if (!layerId || !mergedImageBase64) {
      return res.status(400).json({ error: 'layerId und mergedImageBase64 sind erforderlich' });
    }

    const layer = await prisma.graffitiLayer.findUnique({
      where: { id: layerId },
      include: { photo: { select: { eventId: true } } },
    });
    if (!layer) return res.status(404).json({ error: 'Layer nicht gefunden' });

    // Decode base64 and upload
    const imageBuffer = Buffer.from(mergedImageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const storagePath = await storageService.uploadFile(
      layer.photo.eventId,
      `graffiti-${layerId}.jpg`,
      imageBuffer,
      'image/jpeg'
    );

    const updated = await prisma.graffitiLayer.update({
      where: { id: layerId },
      data: { mergedPath: storagePath },
    });

    res.json({ layer: updated, storagePath });
  } catch (error) {
    logger.error('Merge graffiti error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Zusammenführen' });
  }
});

// ─── GET GRAFFITI LAYERS FOR PHOTO ──────────────────────────────────────────

router.get('/photo/:photoId', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const layers = await prisma.graffitiLayer.findMany({
      where: { photoId: req.params.photoId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ layers });
  } catch (error) {
    logger.error('Get graffiti layers error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// ─── DELETE LAYER (Host/Admin) ──────────────────────────────────────────────

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const layer = await prisma.graffitiLayer.findUnique({ where: { id: req.params.id } });
    if (!layer) return res.status(404).json({ error: 'Layer nicht gefunden' });

    if (!(await hasEventManageAccess(req, layer.eventId))) {
      return res.status(403).json({ error: 'Kein Zugriff' });
    }

    if (layer.mergedPath) {
      try { await storageService.deleteFile(layer.mergedPath); } catch { /* best effort */ }
    }

    await prisma.graffitiLayer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete graffiti error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

export default router;
