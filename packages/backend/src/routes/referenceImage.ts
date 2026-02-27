import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getReferenceImageConfig,
  uploadReferenceImage,
  updateReferenceImageSettings,
  removeReferenceImage,
  clearReferenceImageCache,
} from '../services/referenceImageAnchoring';

const router = Router();

router.get('/:eventId/reference-image', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getReferenceImageConfig(req.params.eventId);
    res.json({ configured: !!config, ...config });
  } catch (error: any) {
    logger.error('Get reference image config error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/:eventId/reference-image', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { imageBase64, imageUrl, filename, mode, position, opacity, scale } = req.body;
    let url: string;

    if (imageBase64) {
      const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : 'image/png';
      const base64Data = matches ? matches[2] : imageBase64;
      const buffer = Buffer.from(base64Data, 'base64');
      url = await uploadReferenceImage(eventId, buffer, filename || `brand-${Date.now()}.png`, mimeType);
    } else if (imageUrl) {
      const response = await fetch(imageUrl);
      if (!response.ok) return res.status(400).json({ error: `Bild konnte nicht geladen werden: ${response.status}` });
      const buffer = Buffer.from(await response.arrayBuffer());
      url = await uploadReferenceImage(eventId, buffer, filename || `brand-${Date.now()}.png`, response.headers.get('content-type') || 'image/png');
    } else {
      return res.status(400).json({ error: 'imageBase64 oder imageUrl ist erforderlich' });
    }

    if (mode || position || opacity !== undefined || scale !== undefined) {
      await updateReferenceImageSettings(eventId, {
        ...(mode && { referenceImageMode: mode }),
        ...(position && { referenceImagePosition: position }),
        ...(opacity !== undefined && { referenceImageOpacity: Number(opacity) }),
        ...(scale !== undefined && { referenceImageScale: Number(scale) }),
      });
    }

    clearReferenceImageCache(eventId);
    const config = await getReferenceImageConfig(eventId);
    res.json({ success: true, url, config });
  } catch (error: any) {
    logger.error('Upload reference image error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:eventId/reference-image', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { mode, position, opacity, scale } = req.body;
    await updateReferenceImageSettings(eventId, {
      ...(mode && { referenceImageMode: mode }),
      ...(position && { referenceImagePosition: position }),
      ...(opacity !== undefined && { referenceImageOpacity: Number(opacity) }),
      ...(scale !== undefined && { referenceImageScale: Number(scale) }),
    });
    clearReferenceImageCache(eventId);
    const config = await getReferenceImageConfig(eventId);
    res.json({ success: true, config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:eventId/reference-image', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await removeReferenceImage(req.params.eventId);
    res.json({ success: true, message: 'Reference image entfernt' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
