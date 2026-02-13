import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendPhotoShareSms, isSmsConfigured } from '../services/smsService';
import { logger } from '../utils/logger';

const router = Router();

const shareSchema = z.object({
  photoId: z.string().min(1),
  phoneNumber: z.string().min(8).max(20),
  senderName: z.string().min(1).max(100),
  message: z.string().max(300).optional(),
});

// GET /api/sms/status — Check if SMS service is configured
router.get('/status', authMiddleware, async (_req: AuthRequest, res: Response) => {
  res.json({ configured: isSmsConfigured() });
});

// POST /api/sms/share-photo — Share a photo via SMS
router.post('/share-photo', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = shareSchema.parse(req.body);

    const photo = await prisma.photo.findUnique({
      where: { id: data.photoId },
      include: { event: { select: { id: true, title: true, slug: true } } },
    });

    if (!photo || !photo.event) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const photoUrl = `${baseUrl}/api/photos/${photo.id}/download`;

    const result = await sendPhotoShareSms({
      phoneNumber: data.phoneNumber,
      senderName: data.senderName,
      eventTitle: photo.event.title,
      photoUrl,
      photoId: photo.id,
      eventId: photo.event.id,
      message: data.message,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'SMS konnte nicht gesendet werden' });
    }

    res.json({ success: true, message: 'Foto wurde per SMS geteilt' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Ungültige Eingabe', details: error.flatten() });
    }
    logger.error('SMS share error', { message: error.message });
    res.status(500).json({ error: 'Fehler beim Teilen per SMS' });
  }
});

// ─────────────────────────────────────────────────────────────
// Admin Endpoints
// ─────────────────────────────────────────────────────────────

// GET /api/sms/admin/logs — List SMS logs with pagination & filters
router.get('/admin/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const status = req.query.status as string | undefined;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.smsMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.smsMessage.count({ where }),
    ]);

    res.json({
      logs: logs.map((l: any) => ({
        id: l.id,
        eventId: l.eventId,
        eventTitle: null,
        phoneNumber: l.recipientPhone,
        message: l.message || '',
        status: l.status,
        provider: l.provider || 'twilio',
        createdAt: l.createdAt,
        deliveredAt: l.sentAt || null,
        errorMessage: l.errorMessage || null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    logger.error('SMS admin logs error', { message: error.message });
    res.status(500).json({ error: 'Fehler beim Laden der SMS-Logs' });
  }
});

// GET /api/sms/admin/stats — SMS statistics
router.get('/admin/stats', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const [totalSent, totalDelivered, totalFailed, totalPending] = await Promise.all([
      prisma.smsMessage.count({ where: { status: { in: ['SENT', 'DELIVERED'] } } }),
      prisma.smsMessage.count({ where: { status: 'DELIVERED' } }),
      prisma.smsMessage.count({ where: { status: 'FAILED' } }),
      prisma.smsMessage.count({ where: { status: 'PENDING' } }),
    ]);

    // Estimate cost: ~0.07€ per SMS
    const costCents = totalSent * 7;

    res.json({
      totalSent,
      totalDelivered,
      totalFailed,
      totalPending,
      costCents,
    });
  } catch (error: any) {
    logger.error('SMS admin stats error', { message: error.message });
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// GET /api/sms/admin/config — Get SMS configuration status
router.get('/admin/config', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const configured = isSmsConfigured();
  res.json({
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? '***' + (process.env.TWILIO_ACCOUNT_SID).slice(-4) : '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? '••••••••' : '',
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    isConfigured: configured,
    defaultMessage: process.env.SMS_DEFAULT_MESSAGE || 'Hallo! Hier sind deine Fotos von {eventTitle}: {link}',
  });
});

// PUT /api/sms/admin/config — Update SMS configuration (env-based, returns info only)
router.put('/admin/config', authMiddleware, async (req: AuthRequest, res: Response) => {
  // Note: In production, env vars would be managed via deployment config.
  // This endpoint acknowledges the request but environment changes require redeployment.
  res.json({
    success: true,
    message: 'SMS-Konfiguration wird über Umgebungsvariablen verwaltet. Bitte setze TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN und TWILIO_PHONE_NUMBER in der Deployment-Konfiguration.',
  });
});

export default router;
