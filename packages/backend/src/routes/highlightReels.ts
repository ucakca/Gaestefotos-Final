import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { generateHighlightReel, getReelProgress, listEventReels, deleteReel, HighlightReelOptions } from '../services/highlightReel';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

// Generate highlight reel
router.post('/:eventId/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { duration, maxPhotos, resolution, transition } = req.body;

    // Check access
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    const options: HighlightReelOptions = {
      eventId,
      duration: duration || 3,
      maxPhotos: maxPhotos || 20,
      resolution: resolution || '1080p',
      transition: transition || 'fade',
    };

    // Start generation in background
    const jobId = `reel-${eventId}-${Date.now()}`;
    
    // Run async
    generateHighlightReel(options)
      .then(url => {
        logger.info(`Highlight reel generated: ${url}`);
      })
      .catch(err => {
        logger.error(`Highlight reel error: ${err.message}`);
      });

    res.json({ 
      success: true, 
      jobId,
      message: 'Video-Generierung gestartet' 
    });

  } catch (error) {
    logger.error('Error starting highlight reel:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Starten der Video-Generierung' });
  }
});

// Get generation progress
router.get('/:eventId/progress/:jobId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const progress = getReelProgress(jobId);
    
    if (!progress) {
      return res.status(404).json({ error: 'Job nicht gefunden' });
    }

    res.json(progress);
  } catch (error) {
    logger.error('Error getting progress:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Abrufen des Fortschritts' });
  }
});

// List event reels
router.get('/:eventId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    const reels = await listEventReels(eventId);
    res.json({ reels });

  } catch (error) {
    logger.error('Error listing reels:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Abrufen der Videos' });
  }
});

// Delete reel
router.delete('/:eventId/:filename', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, filename } = req.params;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    await deleteReel(filename);
    res.json({ success: true });

  } catch (error) {
    logger.error('Error deleting reel:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

export default router;
