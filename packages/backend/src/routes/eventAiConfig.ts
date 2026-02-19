/**
 * Event AI Config Routes
 * 
 * GET  /api/events/:eventId/ai-features  — Get allowed AI features for event + device
 * GET  /api/events/:eventId/ai-config    — Get event AI config (host only)
 * PUT  /api/events/:eventId/ai-config    — Update event AI config (host only)
 */

import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import prisma from '../config/database';
import { getAiFeatureGate } from '../services/aiFeatureGate';
import { DeviceType, ALL_DEVICE_TYPES } from '../services/aiFeatureRegistry';

const router = Router();

/**
 * GET /api/events/:eventId/ai-features
 * Returns all AI features with access status for the given event + device.
 * Used by guest app, booth, and admin to know which features to show.
 * Accepts ?device=guest_app|photo_booth|mirror_booth|ki_booth|admin_dashboard
 */
router.get('/:eventId/ai-features', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const deviceParam = (req.query.device as string) || req.headers['x-device-type'] as string || 'guest_app';
    const deviceType: DeviceType = ALL_DEVICE_TYPES.includes(deviceParam as DeviceType)
      ? (deviceParam as DeviceType)
      : 'guest_app';

    const gate = await getAiFeatureGate(eventId, deviceType);

    res.json(gate);
  } catch (error) {
    logger.error('Get AI features error', { error });
    res.status(500).json({ error: 'Failed to fetch AI features' });
  }
});

/**
 * GET /api/events/:eventId/ai-config
 * Returns the EventAiConfig for the host to manage.
 * Host-only: must be event owner or co-host.
 */
router.get('/:eventId/ai-config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true },
    });
    if (!event || event.hostId !== req.userId) {
      return res.status(403).json({ error: 'Nur der Veranstalter kann die KI-Konfiguration einsehen' });
    }

    let config = await prisma.eventAiConfig.findUnique({
      where: { eventId },
    });

    if (!config) {
      // Return defaults
      config = {
        id: '',
        eventId,
        disabledFeatures: [],
        boothPreset: null,
        welcomeMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    res.json({ config });
  } catch (error) {
    logger.error('Get AI config error', { error });
    res.status(500).json({ error: 'Failed to fetch AI config' });
  }
});

/**
 * PUT /api/events/:eventId/ai-config
 * Update the EventAiConfig.
 * Host-only: must be event owner or co-host.
 */
router.put('/:eventId/ai-config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true },
    });
    if (!event || event.hostId !== req.userId) {
      return res.status(403).json({ error: 'Nur der Veranstalter kann die KI-Konfiguration ändern' });
    }

    const { disabledFeatures, boothPreset, welcomeMessage } = req.body;

    const config = await prisma.eventAiConfig.upsert({
      where: { eventId },
      create: {
        eventId,
        disabledFeatures: disabledFeatures || [],
        boothPreset: boothPreset || null,
        welcomeMessage: welcomeMessage || null,
      },
      update: {
        ...(disabledFeatures !== undefined && { disabledFeatures }),
        ...(boothPreset !== undefined && { boothPreset }),
        ...(welcomeMessage !== undefined && { welcomeMessage }),
      },
    });

    logger.info('AI config updated', { eventId, userId: req.userId });
    res.json({ config });
  } catch (error) {
    logger.error('Update AI config error', { error });
    res.status(500).json({ error: 'Failed to update AI config' });
  }
});

export default router;
