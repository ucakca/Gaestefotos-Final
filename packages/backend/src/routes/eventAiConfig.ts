/**
 * Event AI Config Routes
 * 
 * GET  /api/events/:eventId/ai-features  — Get allowed AI features for event + device
 * GET  /api/events/:eventId/ai-config    — Get event AI config (host only)
 * PUT  /api/events/:eventId/ai-config    — Update event AI config (host only)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { getAiFeatureGate } from '../services/aiFeatureGate';
import { DeviceType, ALL_DEVICE_TYPES } from '../services/aiFeatureRegistry';
import { cacheInvalidate } from '../services/cache/redis';

// ─── Validation ──────────────────────────────────────────────

const aiConfigUpdateSchema = z.object({
  disabledFeatures: z.array(z.string()).optional(),
  boothPreset: z.record(z.array(z.string())).nullable().optional(),
  welcomeMessage: z.string().max(500).nullable().optional(),
  customPromptContext: z.string().max(2000).nullable().optional(),
  energyStartBalance: z.number().int().min(0).max(1000).optional(),
  energyRewardFirstUpload: z.number().int().min(0).max(100).optional(),
  energyRewardGuestbook: z.number().int().min(0).max(100).optional(),
  energyRewardChallenge: z.number().int().min(0).max(100).optional(),
  energyRewardSurvey: z.number().int().min(0).max(100).optional(),
  energyRewardSocialShare: z.number().int().min(0).max(100).optional(),
  energyCostLlmGame: z.number().int().min(0).max(100).optional(),
  energyCostImageEffect: z.number().int().min(0).max(100).optional(),
  energyCostStyleTransfer: z.number().int().min(0).max(100).optional(),
  energyCostFaceSwap: z.number().int().min(0).max(100).optional(),
  energyCostGif: z.number().int().min(0).max(100).optional(),
  energyCostVideo: z.number().int().min(0).max(100).optional(),
  energyCostTradingCard: z.number().int().min(0).max(100).optional(),
  energyCooldownSeconds: z.number().int().min(0).max(3600).optional(),
  energyEnabled: z.boolean().optional(),
}).strict();

const router = Router();

/**
 * GET /api/events/:eventId/ai-features
 * Returns all AI features with access status for the given event + device.
 * PUBLIC — no auth required (guests need this to render UI).
 * Accepts ?device=guest_app|photo_booth|mirror_booth|ki_booth|admin_dashboard
 */
router.get('/:eventId/ai-features', async (req: Request, res: Response) => {
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

    // Validate request body with Zod
    const parsed = aiConfigUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten().fieldErrors });
    }

    const {
      disabledFeatures, boothPreset, welcomeMessage, customPromptContext,
      energyStartBalance, energyRewardFirstUpload, energyRewardGuestbook,
      energyRewardChallenge, energyRewardSurvey, energyRewardSocialShare,
      energyCostLlmGame, energyCostImageEffect, energyCostStyleTransfer,
      energyCostFaceSwap, energyCostGif, energyCostVideo, energyCostTradingCard,
      energyCooldownSeconds, energyEnabled,
    } = parsed.data;

    // Build update object only for provided fields
    const updateData: Record<string, any> = {};
    if (disabledFeatures !== undefined) updateData.disabledFeatures = disabledFeatures;
    if (boothPreset !== undefined) updateData.boothPreset = boothPreset;
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
    if (customPromptContext !== undefined) updateData.customPromptContext = customPromptContext;
    if (energyStartBalance !== undefined) updateData.energyStartBalance = energyStartBalance;
    if (energyRewardFirstUpload !== undefined) updateData.energyRewardFirstUpload = energyRewardFirstUpload;
    if (energyRewardGuestbook !== undefined) updateData.energyRewardGuestbook = energyRewardGuestbook;
    if (energyRewardChallenge !== undefined) updateData.energyRewardChallenge = energyRewardChallenge;
    if (energyRewardSurvey !== undefined) updateData.energyRewardSurvey = energyRewardSurvey;
    if (energyRewardSocialShare !== undefined) updateData.energyRewardSocialShare = energyRewardSocialShare;
    if (energyCostLlmGame !== undefined) updateData.energyCostLlmGame = energyCostLlmGame;
    if (energyCostImageEffect !== undefined) updateData.energyCostImageEffect = energyCostImageEffect;
    if (energyCostStyleTransfer !== undefined) updateData.energyCostStyleTransfer = energyCostStyleTransfer;
    if (energyCostFaceSwap !== undefined) updateData.energyCostFaceSwap = energyCostFaceSwap;
    if (energyCostGif !== undefined) updateData.energyCostGif = energyCostGif;
    if (energyCostVideo !== undefined) updateData.energyCostVideo = energyCostVideo;
    if (energyCostTradingCard !== undefined) updateData.energyCostTradingCard = energyCostTradingCard;
    if (energyCooldownSeconds !== undefined) updateData.energyCooldownSeconds = energyCooldownSeconds;
    if (energyEnabled !== undefined) updateData.energyEnabled = energyEnabled;

    const config = await prisma.eventAiConfig.upsert({
      where: { eventId },
      create: {
        eventId,
        disabledFeatures: disabledFeatures || [],
        boothPreset: boothPreset || Prisma.JsonNull,
        welcomeMessage: welcomeMessage || null,
        ...updateData,
      },
      update: updateData,
    });

    // Invalidate feature-gate cache so guests see updated config immediately
    await cacheInvalidate(`event:${eventId}:ai-gate:*`);

    logger.info('AI config updated', { eventId, userId: req.userId });
    res.json({ config });
  } catch (error) {
    logger.error('Update AI config error', { error });
    res.status(500).json({ error: 'Failed to update AI config' });
  }
});

export default router;
