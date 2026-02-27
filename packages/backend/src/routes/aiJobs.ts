/**
 * AI Job Routes
 * 
 * - POST   /api/ai-jobs              — Submit a new AI job
 * - GET    /api/ai-jobs/:id          — Get job status (authenticated)
 * - GET    /api/ai-jobs/event/:eventId — List jobs for an event
 * - GET    /api/r/:shortCode         — Public result page data (no auth)
 * - POST   /api/ai-jobs/:id/cancel   — Cancel a queued job
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, optionalAuthMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import { randomString } from '@gaestefotos/shared';

const router = Router();

// ─── Submit a new AI job ─────────────────────────────────────────────────────

const submitSchema = z.object({
  eventId: z.string().uuid(),
  photoId: z.string().optional(),
  workflow: z.string().min(1),
  workflowJson: z.record(z.any()).optional(),
  inputImages: z.array(z.string()).optional().default([]),
  parameters: z.record(z.any()).optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  priority: z.number().int().min(0).max(10).optional().default(0),
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const data = parsed.data;

    // Verify event exists and user has access
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { id: true, hostId: true, isActive: true, deletedAt: true },
    });

    if (!event || event.deletedAt || !event.isActive) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Generate short code for result delivery
    const shortCode = randomString(8);

    const job = await (prisma as any).aiJob.create({
      data: {
        eventId: data.eventId,
        photoId: data.photoId || null,
        workflow: data.workflow,
        workflowJson: data.workflowJson || null,
        inputImages: data.inputImages,
        parameters: data.parameters || null,
        guestName: data.guestName || null,
        guestEmail: data.guestEmail || null,
        priority: data.priority,
        shortCode,
        status: 'QUEUED',
      },
    });

    logger.info('AI job created', { jobId: job.id, workflow: data.workflow, eventId: data.eventId });

    res.status(201).json({
      id: job.id,
      shortCode: job.shortCode,
      status: job.status,
      resultUrl: `/r/${job.shortCode}`,
    });
  } catch (error) {
    logger.error('Create AI job error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get job status ──────────────────────────────────────────────────────────

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const job = await (prisma as any).aiJob.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        eventId: true,
        workflow: true,
        status: true,
        shortCode: true,
        resultUrl: true,
        error: true,
        computeTimeMs: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job nicht gefunden' });
    }

    res.json(job);
  } catch (error) {
    logger.error('Get AI job error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── List jobs for an event ──────────────────────────────────────────────────

router.get('/event/:eventId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const status = req.query.status as string | undefined;

    const where: any = { eventId };
    if (status) where.status = status;

    const jobs = await (prisma as any).aiJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        workflow: true,
        status: true,
        shortCode: true,
        resultUrl: true,
        guestName: true,
        computeTimeMs: true,
        createdAt: true,
        completedAt: true,
      },
    });

    res.json({ jobs });
  } catch (error) {
    logger.error('List AI jobs error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Cancel a job ────────────────────────────────────────────────────────────

router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const job = await (prisma as any).aiJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job nicht gefunden' });
    }

    if (job.status !== 'QUEUED' && job.status !== 'PROCESSING') {
      return res.status(400).json({ error: 'Job kann nicht mehr abgebrochen werden' });
    }

    await (prisma as any).aiJob.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Cancel AI job error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// ─── Public result endpoint (mounted separately as /api/r/:shortCode) ────────

export const resultRouter = Router();

resultRouter.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    const job = await (prisma as any).aiJob.findUnique({
      where: { shortCode },
      select: {
        id: true,
        workflow: true,
        status: true,
        resultUrl: true,
        guestName: true,
        computeTimeMs: true,
        createdAt: true,
        completedAt: true,
        event: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Ergebnis nicht gefunden' });
    }

    res.json({
      status: job.status,
      workflow: job.workflow,
      resultUrl: job.resultUrl,
      guestName: job.guestName,
      eventTitle: job.event?.title,
      eventSlug: job.event?.slug,
      computeTimeMs: job.computeTimeMs,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    logger.error('Get AI result error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});
