/**
 * Booth Setup Routes
 * 
 * POST /api/booth/setup          — Booth scans QR code → gets event + registers device
 * GET  /api/booth/config/:eventId — Booth fetches its runtime config (games, effects, energy, branding)
 * POST /api/booth/heartbeat      — Booth sends periodic heartbeat
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { getAiFeatureGate } from '../services/aiFeatureGate';
import type { DeviceType } from '../services/aiFeatureRegistry';

const router = Router();

// ─── POST /api/booth/setup ──────────────────────────────────────────────────
// Booth scans a QR code containing the event code.
// Returns event info and registers the device session.

const setupSchema = z.object({
  eventCode: z.string().min(1),
  deviceType: z.enum(['photo_booth', 'mirror_booth', 'ki_booth']).default('photo_booth'),
  deviceName: z.string().optional(),
  hardwareId: z.string().uuid().optional(),
});

router.post('/setup', async (req: Request, res: Response) => {
  try {
    const { eventCode, deviceType, deviceName, hardwareId } = setupSchema.parse(req.body);

    // Find event by code
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { eventCode },
          { slug: eventCode },
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        dateTime: true,
        isActive: true,
        designConfig: true,
        eventCode: true,
        hostId: true,
        locationName: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event nicht gefunden. Bitte QR-Code prüfen.' });
    }

    if (!event.isActive) {
      return res.status(403).json({ error: 'Dieses Event ist derzeit nicht aktiv.' });
    }

    // Get AI feature gate for this device type
    const featureGate = await getAiFeatureGate(event.id, deviceType as DeviceType);

    // Get briefing data if exists
    const briefing = await prisma.eventBriefing.findUnique({
      where: { eventId: event.id },
      select: {
        eventType: true,
        mood: true,
        primaryColor: true,
        logoUrl: true,
        footerText: true,
        devices: true,
        status: true,
      },
    });

    // Generate a session token for this booth
    const sessionToken = `booth_${event.id}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    logger.info('Booth setup completed', {
      eventId: event.id,
      deviceType,
      deviceName,
      hardwareId,
    });

    res.json({
      success: true,
      sessionToken,
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        dateTime: event.dateTime,
        locationName: event.locationName,
        designConfig: event.designConfig,
        eventCode: event.eventCode,
      },
      features: {
        allowedFeatures: featureGate.allowedFeatures,
        features: featureGate.features,
        limits: featureGate.limits,
      },
      branding: briefing ? {
        primaryColor: briefing.primaryColor,
        logoUrl: briefing.logoUrl,
        footerText: briefing.footerText,
        mood: briefing.mood,
        eventType: briefing.eventType,
      } : null,
      deviceType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error('Booth setup error', { error });
    res.status(500).json({ error: 'Booth-Setup fehlgeschlagen' });
  }
});

// ─── GET /api/booth/config/:eventId ─────────────────────────────────────────
// Booth fetches its runtime config (refreshable).

router.get('/config/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const deviceType = (req.query.device as string) || 'photo_booth';

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        isActive: true,
        designConfig: true,
        featuresConfig: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // AI features + gating
    const featureGate = await getAiFeatureGate(eventId, deviceType as DeviceType);

    // AI config (energy, prompts)
    const aiConfig = await prisma.eventAiConfig.findUnique({
      where: { eventId },
      select: {
        welcomeMessage: true,
        energyEnabled: true,
        energyStartBalance: true,
        energyCooldownSeconds: true,
        customPromptContext: true,
        eventKeywords: true,
        eventTypeHint: true,
      },
    });

    // Branding from briefing
    const briefing = await prisma.eventBriefing.findUnique({
      where: { eventId },
      select: {
        primaryColor: true,
        logoUrl: true,
        footerText: true,
        mood: true,
        eventType: true,
      },
    });

    res.json({
      event: {
        id: event.id,
        title: event.title,
        isActive: event.isActive,
        designConfig: event.designConfig,
      },
      features: {
        allowedFeatures: featureGate.allowedFeatures,
        features: featureGate.features,
        limits: featureGate.limits,
      },
      aiConfig: aiConfig ? {
        welcomeMessage: aiConfig.welcomeMessage,
        energyEnabled: aiConfig.energyEnabled,
        energyStartBalance: aiConfig.energyStartBalance,
        energyCooldownSeconds: aiConfig.energyCooldownSeconds,
        hasCustomPrompts: !!aiConfig.customPromptContext,
        eventType: aiConfig.eventTypeHint,
        keywords: aiConfig.eventKeywords,
      } : null,
      branding: briefing ? {
        primaryColor: briefing.primaryColor,
        logoUrl: briefing.logoUrl,
        footerText: briefing.footerText,
        mood: briefing.mood,
      } : null,
      deviceType,
    });
  } catch (error) {
    logger.error('Booth config error', { error });
    res.status(500).json({ error: 'Config konnte nicht geladen werden' });
  }
});

// ─── POST /api/booth/heartbeat ──────────────────────────────────────────────
// Booth sends periodic heartbeat with status info.

const heartbeatSchema = z.object({
  eventId: z.string().uuid(),
  deviceType: z.string(),
  sessionToken: z.string(),
  status: z.enum(['idle', 'active', 'error']).default('active'),
  stats: z.object({
    photosCount: z.number().optional(),
    gamesPlayed: z.number().optional(),
    uptime: z.number().optional(),
  }).optional(),
});

router.post('/heartbeat', async (req: Request, res: Response) => {
  try {
    const data = heartbeatSchema.parse(req.body);

    logger.debug('Booth heartbeat', {
      eventId: data.eventId,
      deviceType: data.deviceType,
      status: data.status,
    });

    // Check if event is still active
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { isActive: true },
    });

    res.json({
      ok: true,
      eventActive: event?.isActive ?? false,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Heartbeat fehlgeschlagen' });
  }
});

// ─── POST /api/booth/upload ────────────────────────────────────────────────
// Optimized photo upload for booths (no TUS, direct base64 or multipart).
// Adds source:booth tag automatically.

const boothUploadSchema = z.object({
  eventId: z.string().uuid(),
  image: z.string().min(100), // base64-encoded image data (with or without data URI prefix)
  deviceType: z.enum(['photo_booth', 'mirror_booth', 'ki_booth']).optional(),
  sessionId: z.string().optional(),
  position: z.number().int().min(0).max(9).optional(), // position in series (0-indexed)
  category: z.string().optional(),
});

router.post('/upload', async (req: Request, res: Response) => {
  try {
    const data = boothUploadSchema.parse(req.body);

    // Validate event
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { id: true, isActive: true, deletedAt: true, featuresConfig: true },
    });
    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden oder inaktiv' });
    }

    // Decode base64 image
    const base64 = data.image.startsWith('data:')
      ? data.image.split(',')[1]
      : data.image;
    const buffer = Buffer.from(base64, 'base64');

    if (buffer.length < 1000) {
      return res.status(400).json({ error: 'Bild zu klein oder ungültig' });
    }

    const { storageService } = await import('../services/storage');

    const filename = `booth-${data.sessionId || 'session'}-${data.position ?? 0}-${Date.now()}.jpg`;
    const storagePath = await storageService.uploadFile(data.eventId, filename, buffer, 'image/jpeg');

    const featuresConfig = event.featuresConfig as any;
    const moderationRequired = featuresConfig?.moderationRequired === true;
    const photoStatus = moderationRequired ? 'PENDING' : 'APPROVED';

    const photo = await prisma.photo.create({
      data: {
        eventId: data.eventId,
        storagePath,
        url: '',
        status: photoStatus,
        sizeBytes: BigInt(buffer.length),
        tags: ['source:booth', ...(data.position !== undefined ? [`series:${data.position}`] : [])],
      },
    });

    const updatedPhoto = await prisma.photo.update({
      where: { id: photo.id },
      data: { url: `/cdn/${photo.id}` },
    });

    // Non-blocking: face detection + pgvector embedding
    import('../services/faceRecognition').then(m =>
      m.getFaceDetectionMetadata(buffer).then(async (faceResult) => {
        if (faceResult.faceCount > 0) {
          await prisma.photo.update({
            where: { id: photo.id },
            data: { faceCount: faceResult.faceCount, faceData: { faces: faceResult.faces, descriptors: faceResult.descriptors || [] } },
          });
          const { storeFaceEmbedding } = await import('../services/faceSearchPgvector');
          const descriptors = faceResult.descriptors || [];
          for (let i = 0; i < descriptors.length; i++) {
            storeFaceEmbedding({
              photoId: photo.id, eventId: data.eventId,
              descriptor: descriptors[i], faceIndex: i, box: faceResult.faces[i],
            }).catch(() => {});
          }
        }
      })
    ).catch(() => {});

    logger.info('[Booth] Photo uploaded', { eventId: data.eventId, photoId: photo.id, size: buffer.length });

    res.status(201).json({
      ok: true,
      photoId: photo.id,
      url: updatedPhoto.url,
      status: photoStatus,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error('[Booth] Upload error', { error: (error as Error).message });
    res.status(500).json({ error: 'Booth-Upload fehlgeschlagen' });
  }
});

export default router;
