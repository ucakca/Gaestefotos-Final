/**
 * Partner AI Config Routes
 * 
 * Allows partners to manage AI configuration and briefings for their events.
 * Partners can only access events that belong to their partner organization.
 * 
 * GET    /api/partner/events/:eventId/ai-config   — Get AI config for partner event
 * PUT    /api/partner/events/:eventId/ai-config   — Update AI config for partner event
 * GET    /api/partner/events/:eventId/briefing     — Get briefing for partner event
 * PUT    /api/partner/events/:eventId/briefing     — Update briefing for partner event
 * POST   /api/partner/events/:eventId/briefing/finalize — Finalize briefing (partner)
 */

import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import prisma from '../config/database';
import { clearEventPromptCache } from '../services/eventPromptContext';

const router = Router();

/**
 * Check if the authenticated user has partner access to the given event.
 * Returns true if: user is ADMIN, or user is a PartnerMember whose partner owns the event.
 */
async function hasPartnerEventAccess(userId: string, userRole: string | undefined, eventId: string): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { partnerId: true },
  });

  if (!event?.partnerId) return false;

  const membership = await prisma.partnerMember.findUnique({
    where: { partnerId_userId: { partnerId: event.partnerId, userId } },
  });

  return !!membership;
}

// ─── GET AI CONFIG ──────────────────────────────────────────────────────────

router.get('/events/:eventId/ai-config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!(await hasPartnerEventAccess(req.userId!, req.userRole, eventId))) {
      return res.status(403).json({ error: 'Kein Partner-Zugriff auf dieses Event' });
    }

    let config = await prisma.eventAiConfig.findUnique({ where: { eventId } });

    if (!config) {
      return res.json({
        config: {
          eventId,
          disabledFeatures: [],
          welcomeMessage: null,
          energyEnabled: true,
          energyStartBalance: 10,
          customPromptContext: null,
          eventKeywords: [],
          eventTypeHint: null,
        },
      });
    }

    res.json({ config });
  } catch (error) {
    logger.error('Partner get AI config error', { error });
    res.status(500).json({ error: 'AI-Konfiguration konnte nicht geladen werden' });
  }
});

// ─── PUT AI CONFIG ──────────────────────────────────────────────────────────

router.put('/events/:eventId/ai-config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!(await hasPartnerEventAccess(req.userId!, req.userRole, eventId))) {
      return res.status(403).json({ error: 'Kein Partner-Zugriff auf dieses Event' });
    }

    const {
      disabledFeatures, welcomeMessage, boothPreset,
      energyEnabled, energyStartBalance, energyCooldownSeconds,
      customPromptContext, eventKeywords, eventTypeHint,
    } = req.body;

    const updateData: Record<string, any> = {};
    if (disabledFeatures !== undefined) updateData.disabledFeatures = disabledFeatures;
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
    if (boothPreset !== undefined) updateData.boothPreset = boothPreset;
    if (energyEnabled !== undefined) updateData.energyEnabled = energyEnabled;
    if (energyStartBalance !== undefined) updateData.energyStartBalance = Number(energyStartBalance);
    if (energyCooldownSeconds !== undefined) updateData.energyCooldownSeconds = Number(energyCooldownSeconds);
    if (customPromptContext !== undefined) updateData.customPromptContext = customPromptContext;
    if (eventKeywords !== undefined) updateData.eventKeywords = eventKeywords;
    if (eventTypeHint !== undefined) updateData.eventTypeHint = eventTypeHint;

    const config = await prisma.eventAiConfig.upsert({
      where: { eventId },
      create: { eventId, ...updateData },
      update: updateData,
    });

    // Clear prompt cache so changes take effect immediately
    clearEventPromptCache(eventId);

    logger.info('Partner updated AI config', { eventId, userId: req.userId });
    res.json({ config });
  } catch (error) {
    logger.error('Partner update AI config error', { error });
    res.status(500).json({ error: 'AI-Konfiguration konnte nicht gespeichert werden' });
  }
});

// ─── GET BRIEFING ───────────────────────────────────────────────────────────

router.get('/events/:eventId/briefing', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!(await hasPartnerEventAccess(req.userId!, req.userRole, eventId))) {
      return res.status(403).json({ error: 'Kein Partner-Zugriff auf dieses Event' });
    }

    const briefing = await prisma.eventBriefing.findUnique({ where: { eventId } });

    if (!briefing) {
      return res.json({ briefing: null, message: 'Noch kein Briefing vorhanden' });
    }

    res.json({ briefing });
  } catch (error) {
    logger.error('Partner get briefing error', { error });
    res.status(500).json({ error: 'Briefing konnte nicht geladen werden' });
  }
});

// ─── PUT BRIEFING ───────────────────────────────────────────────────────────

router.put('/events/:eventId/briefing', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!(await hasPartnerEventAccess(req.userId!, req.userRole, eventId))) {
      return res.status(403).json({ error: 'Kein Partner-Zugriff auf dieses Event' });
    }

    const {
      eventType, eventName, eventDate, guestCount,
      logoUrl, primaryColor, footerText,
      mood, theme, keywords,
      disabledFeatures, customPromptRequest,
      devices, specialRequests, internalNotes,
    } = req.body;

    const updateData: Record<string, any> = {};
    if (eventType !== undefined) updateData.eventType = eventType;
    if (eventName !== undefined) updateData.eventName = eventName;
    if (eventDate !== undefined) updateData.eventDate = eventDate ? new Date(eventDate) : null;
    if (guestCount !== undefined) updateData.guestCount = guestCount ? Number(guestCount) : null;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (footerText !== undefined) updateData.footerText = footerText;
    if (mood !== undefined) updateData.mood = mood;
    if (theme !== undefined) updateData.theme = theme;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (disabledFeatures !== undefined) updateData.disabledFeatures = disabledFeatures;
    if (customPromptRequest !== undefined) updateData.customPromptRequest = customPromptRequest;
    if (devices !== undefined) updateData.devices = devices;
    if (specialRequests !== undefined) updateData.specialRequests = specialRequests;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

    const briefing = await prisma.eventBriefing.upsert({
      where: { eventId },
      create: { eventId, ...updateData },
      update: updateData,
    });

    logger.info('Partner updated briefing', { eventId, userId: req.userId });
    res.json({ briefing });
  } catch (error) {
    logger.error('Partner update briefing error', { error });
    res.status(500).json({ error: 'Briefing konnte nicht gespeichert werden' });
  }
});

// ─── FINALIZE BRIEFING ──────────────────────────────────────────────────────

router.post('/events/:eventId/briefing/finalize', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!(await hasPartnerEventAccess(req.userId!, req.userRole, eventId))) {
      return res.status(403).json({ error: 'Kein Partner-Zugriff auf dieses Event' });
    }

    const briefing = await prisma.eventBriefing.findUnique({ where: { eventId } });
    if (!briefing) return res.status(404).json({ error: 'Kein Briefing vorhanden' });

    // Sync briefing → EventAiConfig
    const aiConfigData: Record<string, any> = {};
    if (briefing.disabledFeatures.length > 0) aiConfigData.disabledFeatures = briefing.disabledFeatures;
    if (briefing.mood || briefing.theme) aiConfigData.welcomeMessage = [briefing.mood, briefing.theme].filter(Boolean).join(' — ');
    if (briefing.customPromptRequest) aiConfigData.customPromptContext = briefing.customPromptRequest;
    if (briefing.keywords?.length > 0) aiConfigData.eventKeywords = briefing.keywords;
    if (briefing.eventType) aiConfigData.eventTypeHint = briefing.eventType;

    await prisma.eventAiConfig.upsert({
      where: { eventId },
      create: { eventId, ...aiConfigData },
      update: aiConfigData,
    });

    // Sync branding → Event designConfig
    const designUpdate: Record<string, any> = {};
    if (briefing.primaryColor) designUpdate.primaryColor = briefing.primaryColor;
    if (briefing.logoUrl) designUpdate.logoUrl = briefing.logoUrl;
    if (briefing.footerText) designUpdate.footerText = briefing.footerText;

    if (Object.keys(designUpdate).length > 0) {
      const event = await prisma.event.findUnique({ where: { id: eventId }, select: { designConfig: true } });
      const existingDesign = (event?.designConfig as Record<string, any>) || {};
      await prisma.event.update({
        where: { id: eventId },
        data: { designConfig: { ...existingDesign, ...designUpdate } },
      });
    }

    const updated = await prisma.eventBriefing.update({
      where: { eventId },
      data: { status: 'FINALIZED', reviewedById: req.userId, reviewedAt: new Date() },
    });

    clearEventPromptCache(eventId);

    logger.info('Partner finalized briefing', { eventId, userId: req.userId });
    res.json({ briefing: updated, message: 'Briefing finalisiert und Konfiguration angewendet!' });
  } catch (error) {
    logger.error('Partner finalize briefing error', { error });
    res.status(500).json({ error: 'Briefing konnte nicht finalisiert werden' });
  }
});

export default router;
