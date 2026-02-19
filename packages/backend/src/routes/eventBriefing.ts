/**
 * Event Briefing Routes
 * 
 * GET    /api/events/:eventId/briefing          — Get briefing (auto-creates DRAFT if none)
 * PUT    /api/events/:eventId/briefing          — Update briefing (Host/Admin/Partner)
 * POST   /api/events/:eventId/briefing/submit   — Submit briefing (Host → SUBMITTED)
 * POST   /api/events/:eventId/briefing/review   — Mark as reviewed (Admin/Partner)
 * POST   /api/events/:eventId/briefing/finalize — Finalize + sync to EventAiConfig
 */

import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import prisma from '../config/database';

const router = Router();

/**
 * GET /api/events/:eventId/briefing
 * Returns the briefing for the event, auto-creating a DRAFT from event data if none exists.
 */
router.get('/:eventId/briefing', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, title: true, dateTime: true, partnerId: true },
    });
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    let briefing = await prisma.eventBriefing.findUnique({ where: { eventId } });

    if (!briefing) {
      // Auto-create DRAFT pre-filled from event data
      briefing = await prisma.eventBriefing.create({
        data: {
          eventId,
          status: 'DRAFT',
          eventName: event.title,
          eventDate: event.dateTime,
        },
      });
      logger.info('Auto-created briefing DRAFT', { eventId });
    }

    res.json({ briefing });
  } catch (error) {
    logger.error('Get briefing error', { error });
    res.status(500).json({ error: 'Briefing konnte nicht geladen werden' });
  }
});

/**
 * PUT /api/events/:eventId/briefing
 * Update briefing fields. Host can update when DRAFT/SUBMITTED. Admin/Partner can always update.
 */
router.put('/:eventId/briefing', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, partnerId: true },
    });
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { role: true },
    });
    const isAdmin = user?.role === 'ADMIN';
    const isHost = event.hostId === req.userId;

    if (!isAdmin && !isHost) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
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
    // Only admin can set internal notes
    if (internalNotes !== undefined && isAdmin) updateData.internalNotes = internalNotes;

    // Track who filled it
    if (!updateData.filledById) updateData.filledById = req.userId;

    const briefing = await prisma.eventBriefing.upsert({
      where: { eventId },
      create: { eventId, ...updateData },
      update: updateData,
    });

    logger.info('Briefing updated', { eventId, userId: req.userId });
    res.json({ briefing });
  } catch (error) {
    logger.error('Update briefing error', { error });
    res.status(500).json({ error: 'Briefing konnte nicht gespeichert werden' });
  }
});

/**
 * POST /api/events/:eventId/briefing/submit
 * Host submits the briefing for review.
 */
router.post('/:eventId/briefing/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true },
    });
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });
    if (event.hostId !== req.userId) {
      const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { role: true } });
      if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Nur der Veranstalter kann das Briefing einreichen' });
    }

    const briefing = await prisma.eventBriefing.update({
      where: { eventId },
      data: { status: 'SUBMITTED', filledById: req.userId },
    });

    logger.info('Briefing submitted', { eventId, userId: req.userId });
    res.json({ briefing, message: 'Briefing wurde eingereicht!' });
  } catch (error) {
    logger.error('Submit briefing error', { error });
    res.status(500).json({ error: 'Briefing konnte nicht eingereicht werden' });
  }
});

/**
 * POST /api/events/:eventId/briefing/review
 * Admin/Partner marks the briefing as reviewed.
 */
router.post('/:eventId/briefing/review', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { role: true } });
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin-Zugang erforderlich' });
    }

    const briefing = await prisma.eventBriefing.update({
      where: { eventId },
      data: { status: 'REVIEWED', reviewedById: req.userId, reviewedAt: new Date() },
    });

    logger.info('Briefing reviewed', { eventId, reviewedBy: req.userId });
    res.json({ briefing, message: 'Briefing wurde geprüft!' });
  } catch (error) {
    logger.error('Review briefing error', { error });
    res.status(500).json({ error: 'Briefing konnte nicht geprüft werden' });
  }
});

/**
 * POST /api/events/:eventId/briefing/finalize
 * Admin/Partner finalizes the briefing and syncs it to EventAiConfig.
 */
router.post('/:eventId/briefing/finalize', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { role: true } });
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin-Zugang erforderlich' });
    }

    const briefing = await prisma.eventBriefing.findUnique({ where: { eventId } });
    if (!briefing) return res.status(404).json({ error: 'Kein Briefing gefunden' });

    // Sync briefing → EventAiConfig
    const aiConfigData: Record<string, any> = {};
    if (briefing.disabledFeatures.length > 0) {
      aiConfigData.disabledFeatures = briefing.disabledFeatures;
    }
    if (briefing.mood || briefing.theme) {
      aiConfigData.welcomeMessage = [briefing.mood, briefing.theme].filter(Boolean).join(' — ');
    }
    // Sync custom prompt context from briefing
    if (briefing.customPromptRequest) {
      aiConfigData.customPromptContext = briefing.customPromptRequest;
    }
    if (briefing.keywords && briefing.keywords.length > 0) {
      aiConfigData.eventKeywords = briefing.keywords;
    }
    if (briefing.eventType) {
      aiConfigData.eventTypeHint = briefing.eventType;
    }

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

    // Mark as finalized
    const updated = await prisma.eventBriefing.update({
      where: { eventId },
      data: { status: 'FINALIZED', reviewedById: req.userId, reviewedAt: new Date() },
    });

    logger.info('Briefing finalized + synced to AI config', { eventId, userId: req.userId });
    res.json({ briefing: updated, message: 'Briefing finalisiert und Konfiguration angewendet!' });
  } catch (error) {
    logger.error('Finalize briefing error', { error });
    res.status(500).json({ error: 'Briefing konnte nicht finalisiert werden' });
  }
});

export default router;
