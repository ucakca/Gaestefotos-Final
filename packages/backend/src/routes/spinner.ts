import { Router, Request, Response } from 'express';
import { PrismaClient, SpinnerStatus, SpinnerSpeed, SpinnerEffect } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/events/:eventId/spinner — list spinner sessions
router.get('/events/:eventId/spinner', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status, limit = '50', offset = '0' } = req.query;

    const where: any = { eventId };
    if (status) where.status = status as SpinnerStatus;

    const [sessions, total] = await Promise.all([
      prisma.spinnerSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.spinnerSession.count({ where }),
    ]);

    res.json({ sessions, total });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/spinner/queue — get current queue
router.get('/events/:eventId/spinner/queue', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const queue = await prisma.spinnerSession.findMany({
      where: {
        eventId,
        status: { in: ['QUEUED', 'RECORDING', 'PROCESSING'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    const current = queue.find(s => s.status === 'RECORDING') || null;
    const waiting = queue.filter(s => s.status === 'QUEUED');
    const processing = queue.filter(s => s.status === 'PROCESSING');

    res.json({ current, waiting, processing, queueLength: waiting.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/spinner — create a new spinner session (join queue)
router.post('/events/:eventId/spinner', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { visitorId, visitorName, duration, rotations, speed, effect, musicTrack } = req.body;

    // Validate
    const dur = Math.max(1, Math.min(10, duration || 3));
    const rot = Math.max(0.5, Math.min(3, rotations || 1));

    const session = await prisma.spinnerSession.create({
      data: {
        eventId,
        visitorId,
        visitorName,
        duration: dur,
        rotations: rot,
        speed: (speed as SpinnerSpeed) || 'NORMAL',
        effect: (effect as SpinnerEffect) || 'NONE',
        musicTrack,
        status: 'QUEUED',
      },
    });

    // Get queue position
    const position = await prisma.spinnerSession.count({
      where: {
        eventId,
        status: 'QUEUED',
        createdAt: { lt: session.createdAt },
      },
    });

    res.status(201).json({ session, queuePosition: position + 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/events/:eventId/spinner/:id/status — update session status (booth controller)
router.put('/events/:eventId/spinner/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, videoUrl, thumbnailUrl, rawVideoUrl, shareUrl } = req.body;

    if (!status) return res.status(400).json({ error: 'Status erforderlich' });

    const updateData: any = { status: status as SpinnerStatus };

    if (status === 'RECORDING') {
      updateData.processingStartedAt = new Date();
    }
    if (status === 'READY' || status === 'FAILED') {
      updateData.processingEndedAt = new Date();
    }
    if (videoUrl) updateData.videoUrl = videoUrl;
    if (thumbnailUrl) updateData.thumbnailUrl = thumbnailUrl;
    if (rawVideoUrl) updateData.rawVideoUrl = rawVideoUrl;
    if (shareUrl) updateData.shareUrl = shareUrl;

    const session = await prisma.spinnerSession.update({
      where: { id },
      data: updateData,
    });

    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/spinner/:id/share — mark as shared + generate share URL
router.post('/events/:eventId/spinner/:id/share', async (req: Request, res: Response) => {
  try {
    const { id, eventId } = req.params;

    const existing = await prisma.spinnerSession.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Session nicht gefunden' });
    if (existing.status !== 'READY') return res.status(400).json({ error: 'Video noch nicht bereit' });

    const shareUrl = `${process.env.FRONTEND_URL || 'https://gaestefotos.com'}/s/spinner/${id}`;

    const session = await prisma.spinnerSession.update({
      where: { id },
      data: { status: 'SHARED', shareUrl },
    });

    res.json({ session, shareUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/events/:eventId/spinner/:id — cancel/remove session
router.delete('/events/:eventId/spinner/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.spinnerSession.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Session nicht gefunden' });

    // Can only cancel if queued
    if (existing.status === 'QUEUED') {
      await prisma.spinnerSession.delete({ where: { id } });
      return res.json({ message: 'Session entfernt' });
    }

    res.status(400).json({ error: 'Kann nur wartende Sessions entfernen' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/spinner/stats — spinner statistics
router.get('/events/:eventId/spinner/stats', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const [total, completed, byEffect, bySpeed] = await Promise.all([
      prisma.spinnerSession.count({ where: { eventId } }),
      prisma.spinnerSession.count({ where: { eventId, status: { in: ['READY', 'SHARED'] } } }),
      prisma.spinnerSession.groupBy({
        by: ['effect'],
        where: { eventId, status: { in: ['READY', 'SHARED'] } },
        _count: true,
      }),
      prisma.spinnerSession.groupBy({
        by: ['speed'],
        where: { eventId, status: { in: ['READY', 'SHARED'] } },
        _count: true,
      }),
    ]);

    res.json({
      total,
      completed,
      byEffect: byEffect.map(e => ({ effect: e.effect, count: e._count })),
      bySpeed: bySpeed.map(s => ({ speed: s.speed, count: s._count })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
