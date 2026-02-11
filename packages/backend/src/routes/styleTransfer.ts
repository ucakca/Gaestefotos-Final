import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { executeStyleTransfer, AI_STYLES } from '../services/styleTransfer';

const router = Router();

// GET /api/style-transfer/styles — List available styles
router.get('/styles', (_req, res: Response) => {
  const styles = Object.entries(AI_STYLES).map(([key, val]) => ({
    key,
    name: val.name,
    strength: val.strength,
  }));
  res.json({ styles });
});

// POST /api/style-transfer/apply — Apply style transfer to a photo
router.post('/apply', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, style, prompt, strength } = req.body;

    if (!photoId || !eventId || !style) {
      return res.status(400).json({ error: 'photoId, eventId und style sind erforderlich' });
    }

    if (!AI_STYLES[style]) {
      return res.status(400).json({ error: `Unbekannter Style: ${style}`, availableStyles: Object.keys(AI_STYLES) });
    }

    const result = await executeStyleTransfer({ photoId, eventId, style, prompt, strength });

    res.json({
      success: true,
      outputUrl: result.outputUrl,
      style: result.style,
      durationMs: result.durationMs,
    });
  } catch (error) {
    const msg = (error as Error).message;
    logger.error('Style transfer error', { message: msg });
    res.status(500).json({ error: msg });
  }
});

export default router;
