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
    if (!event || (event.hostId !== req.userId && req.userRole !== 'ADMIN')) {
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
        energyStartBalance: 10,
        energyRewardFirstUpload: 5,
        energyRewardGuestbook: 3,
        energyRewardChallenge: 3,
        energyRewardSurvey: 2,
        energyRewardSocialShare: 2,
        energyCostLlmGame: 1,
        energyCostImageEffect: 2,
        energyCostStyleTransfer: 2,
        energyCostFaceSwap: 3,
        energyCostGif: 3,
        energyCostVideo: 5,
        energyCostTradingCard: 2,
        energyCooldownSeconds: 60,
        energyEnabled: true,
        customPromptContext: null,
        eventKeywords: [],
        eventTypeHint: null,
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
    if (!event || (event.hostId !== req.userId && req.userRole !== 'ADMIN')) {
      return res.status(403).json({ error: 'Nur der Veranstalter kann die KI-Konfiguration ändern' });
    }

    const {
      disabledFeatures, boothPreset, welcomeMessage,
      // Energy config fields
      energyStartBalance, energyRewardFirstUpload, energyRewardGuestbook,
      energyRewardChallenge, energyRewardSurvey, energyRewardSocialShare,
      energyCostLlmGame, energyCostImageEffect, energyCostStyleTransfer,
      energyCostFaceSwap, energyCostGif, energyCostVideo, energyCostTradingCard,
      energyCooldownSeconds, energyEnabled,
    } = req.body;

    // Build update object only for provided fields
    const updateData: Record<string, any> = {};
    if (disabledFeatures !== undefined) updateData.disabledFeatures = disabledFeatures;
    if (boothPreset !== undefined) updateData.boothPreset = boothPreset;
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
    // Energy fields (only set if explicitly provided)
    if (energyStartBalance !== undefined) updateData.energyStartBalance = Number(energyStartBalance);
    if (energyRewardFirstUpload !== undefined) updateData.energyRewardFirstUpload = Number(energyRewardFirstUpload);
    if (energyRewardGuestbook !== undefined) updateData.energyRewardGuestbook = Number(energyRewardGuestbook);
    if (energyRewardChallenge !== undefined) updateData.energyRewardChallenge = Number(energyRewardChallenge);
    if (energyRewardSurvey !== undefined) updateData.energyRewardSurvey = Number(energyRewardSurvey);
    if (energyRewardSocialShare !== undefined) updateData.energyRewardSocialShare = Number(energyRewardSocialShare);
    if (energyCostLlmGame !== undefined) updateData.energyCostLlmGame = Number(energyCostLlmGame);
    if (energyCostImageEffect !== undefined) updateData.energyCostImageEffect = Number(energyCostImageEffect);
    if (energyCostStyleTransfer !== undefined) updateData.energyCostStyleTransfer = Number(energyCostStyleTransfer);
    if (energyCostFaceSwap !== undefined) updateData.energyCostFaceSwap = Number(energyCostFaceSwap);
    if (energyCostGif !== undefined) updateData.energyCostGif = Number(energyCostGif);
    if (energyCostVideo !== undefined) updateData.energyCostVideo = Number(energyCostVideo);
    if (energyCostTradingCard !== undefined) updateData.energyCostTradingCard = Number(energyCostTradingCard);
    if (energyCooldownSeconds !== undefined) updateData.energyCooldownSeconds = Number(energyCooldownSeconds);
    if (energyEnabled !== undefined) updateData.energyEnabled = Boolean(energyEnabled);

    const config = await prisma.eventAiConfig.upsert({
      where: { eventId },
      create: {
        eventId,
        disabledFeatures: disabledFeatures || [],
        boothPreset: boothPreset || null,
        welcomeMessage: welcomeMessage || null,
        ...updateData,
      },
      update: updateData,
    });

    logger.info('AI config updated', { eventId, userId: req.userId });
    res.json({ config });
  } catch (error) {
    logger.error('Update AI config error', { error });
    res.status(500).json({ error: 'Failed to update AI config' });
  }
});

export default router;
