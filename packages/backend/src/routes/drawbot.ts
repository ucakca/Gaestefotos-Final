import { Router, Request, Response } from 'express';
import { PrismaClient, DrawbotStatus, DrawbotStyle } from '@prisma/client';
import { createDrawing, getDrawbotStyles, type DrawbotStyle as ServiceStyle } from '../services/drawbot';
import { logger } from '../utils/logger';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Map Prisma DrawbotStyle enum to service style keys
const STYLE_MAP: Record<string, ServiceStyle> = {
  LINE_ART: 'monet',
  CONTOUR: 'monet',
  STIPPLE: 'minimal',
  CROSS_HATCH: 'davinci',
  PORTRAIT: 'monet',
  ABSTRACT: 'davinci',
};

// GET /api/events/:eventId/drawbot — list drawbot jobs
router.get('/events/:eventId/drawbot', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status, limit = '50', offset = '0' } = req.query;

    const where: any = { eventId };
    if (status) where.status = status as DrawbotStatus;

    const [jobs, total] = await Promise.all([
      prisma.drawbotJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.drawbotJob.count({ where }),
    ]);

    res.json({ jobs, total });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/drawbot/queue — current queue
router.get('/events/:eventId/drawbot/queue', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const queue = await prisma.drawbotJob.findMany({
      where: {
        eventId,
        status: { in: ['QUEUED', 'CONVERTING', 'DRAWING'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    const current = queue.find(j => j.status === 'DRAWING') ||
                    queue.find(j => j.status === 'CONVERTING') || null;
    const waiting = queue.filter(j => j.status === 'QUEUED');

    res.json({ current, waiting, queueLength: waiting.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/drawbot — create a new drawbot job
router.post('/events/:eventId/drawbot', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const {
      visitorId,
      visitorName,
      sourceImageUrl,
      sourcePhotoId,
      style,
      paperSize,
      penColor,
      complexity,
    } = req.body;

    if (!sourceImageUrl) {
      return res.status(400).json({ error: 'Bild-URL erforderlich' });
    }

    const comp = Math.max(1, Math.min(100, complexity || 50));

    // Estimate drawing time based on complexity
    const estimatedTimeMs = Math.round(comp * 600 + 5000); // 5s base + 600ms per complexity point

    const job = await prisma.drawbotJob.create({
      data: {
        eventId,
        visitorId,
        visitorName,
        sourceImageUrl,
        sourcePhotoId,
        style: (style as DrawbotStyle) || 'LINE_ART',
        paperSize: paperSize || 'A4',
        penColor: penColor || '#000000',
        complexity: comp,
        estimatedTimeMs,
        status: 'QUEUED',
      },
    });

    // Get queue position
    const position = await prisma.drawbotJob.count({
      where: {
        eventId,
        status: 'QUEUED',
        createdAt: { lt: job.createdAt },
      },
    });

    res.status(201).json({ job, queuePosition: position + 1, estimatedTimeMs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/events/:eventId/drawbot/:id/status — update job status (hardware controller)
router.put('/events/:eventId/drawbot/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, outputImageUrl, pathData, actualTimeMs } = req.body;

    if (!status) return res.status(400).json({ error: 'Status erforderlich' });

    const updateData: any = { status: status as DrawbotStatus };

    if (status === 'CONVERTING') {
      updateData.processingStartedAt = new Date();
    }
    if (status === 'DONE' || status === 'FAILED') {
      updateData.processingEndedAt = new Date();
    }
    if (outputImageUrl) updateData.outputImageUrl = outputImageUrl;
    if (pathData) updateData.pathData = pathData;
    if (actualTimeMs) updateData.actualTimeMs = actualTimeMs;

    const job = await prisma.drawbotJob.update({
      where: { id },
      data: updateData,
    });

    res.json({ job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/events/:eventId/drawbot/:id — cancel a queued job
router.delete('/events/:eventId/drawbot/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.drawbotJob.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Job nicht gefunden' });

    if (existing.status === 'QUEUED') {
      await prisma.drawbotJob.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return res.json({ message: 'Job abgebrochen' });
    }

    res.status(400).json({ error: 'Kann nur wartende Jobs abbrechen' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/drawbot/stats — drawbot statistics
router.get('/events/:eventId/drawbot/stats', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const [total, completed, byStyle, avgTime] = await Promise.all([
      prisma.drawbotJob.count({ where: { eventId } }),
      prisma.drawbotJob.count({ where: { eventId, status: 'DONE' } }),
      prisma.drawbotJob.groupBy({
        by: ['style'],
        where: { eventId, status: 'DONE' },
        _count: true,
      }),
      prisma.drawbotJob.aggregate({
        where: { eventId, status: 'DONE', actualTimeMs: { not: null } },
        _avg: { actualTimeMs: true },
      }),
    ]);

    res.json({
      total,
      completed,
      byStyle: byStyle.map(s => ({ style: s.style, count: s._count })),
      avgDrawTimeMs: avgTime._avg.actualTimeMs || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/drawbot/:id/convert — run the actual image→line-art→gcode conversion
router.post('/events/:eventId/drawbot/:id/convert', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.drawbotJob.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Job nicht gefunden' });
    if (job.status !== 'QUEUED' && job.status !== 'CONVERTING') {
      return res.status(400).json({ error: `Job ist im Status ${job.status}, kann nicht konvertiert werden` });
    }

    // Update status to CONVERTING
    await prisma.drawbotJob.update({
      where: { id },
      data: { status: 'CONVERTING', processingStartedAt: new Date() },
    });

    // Load source image
    let imageBuffer: Buffer;
    if (job.sourceImageUrl.startsWith('http')) {
      const response = await axios.get(job.sourceImageUrl, { responseType: 'arraybuffer', timeout: 30000 });
      imageBuffer = Buffer.from(response.data);
    } else {
      const sourcePath = job.sourceImageUrl.startsWith('/')
        ? path.join(process.cwd(), job.sourceImageUrl)
        : path.join(process.cwd(), 'uploads', job.sourceImageUrl);
      imageBuffer = await fs.readFile(sourcePath);
    }

    // Map DB style to service style
    const serviceStyle = STYLE_MAP[job.style] || 'monet';

    // Detail level from complexity (1-100 → 1-10)
    const detail = Math.max(1, Math.min(10, Math.round(job.complexity / 10)));

    // Paper size parsing
    const paperSizes: Record<string, { w: number; h: number }> = {
      A4: { w: 210, h: 297 },
      A3: { w: 297, h: 420 },
      A5: { w: 148, h: 210 },
      Letter: { w: 216, h: 279 },
    };
    const paper = paperSizes[job.paperSize] || paperSizes.A4;

    // Run conversion pipeline
    const result = await createDrawing(imageBuffer, serviceStyle, {
      paperWidth: paper.w,
      paperHeight: paper.h,
      detail,
    });

    // Update job with results
    const updated = await prisma.drawbotJob.update({
      where: { id },
      data: {
        status: 'DONE',
        outputImageUrl: result.previewPath,
        pathData: {
          svgPath: result.svgPath,
          gcodePath: result.gcodePath,
          previewPath: result.previewPath,
          lineCount: result.lineCount,
          estimatedDrawTime: result.estimatedDrawTime,
        },
        actualTimeMs: result.processingMs,
        processingEndedAt: new Date(),
      },
    });

    logger.info('[Drawbot] Job converted', {
      jobId: id,
      style: serviceStyle,
      lineCount: result.lineCount,
      processingMs: result.processingMs,
    });

    res.json({
      job: updated,
      svg: result.svgPath,
      gcode: result.gcodePath,
      preview: result.previewPath,
      lineCount: result.lineCount,
      estimatedDrawTime: result.estimatedDrawTime,
    });
  } catch (err: any) {
    logger.error('[Drawbot] Conversion failed', { error: err.message });

    // Mark job as failed
    try {
      await prisma.drawbotJob.update({
        where: { id: req.params.id },
        data: { status: 'FAILED', processingEndedAt: new Date() },
      });
    } catch {}

    res.status(500).json({ error: err.message });
  }
});

// GET /api/drawbot/styles — available drawing styles
router.get('/drawbot/styles', async (_req: Request, res: Response) => {
  const serviceStyles = getDrawbotStyles();
  res.json({
    styles: [
      { key: 'LINE_ART', name: 'Linienzeichnung', description: 'Klare Konturen und Linien (Monet-Stil)', icon: '✏️', engine: 'monet' },
      { key: 'CONTOUR', name: 'Kontur', description: 'Weiche Umrisse des Motivs', icon: '🖊️', engine: 'monet' },
      { key: 'STIPPLE', name: 'Punktierung', description: 'Reduzierte Linien — schnell zu zeichnen', icon: '⚬', engine: 'minimal' },
      { key: 'CROSS_HATCH', name: 'Kreuzschraffur', description: 'Spielerische, ausdrucksstarke Skizze (Da Vinci-Stil)', icon: '▦', engine: 'davinci' },
      { key: 'PORTRAIT', name: 'Portrait', description: 'Optimiert für Gesichter', icon: '🎨', engine: 'monet' },
      { key: 'ABSTRACT', name: 'Abstrakt', description: 'Kreative Interpretation', icon: '🌀', engine: 'davinci' },
    ],
    serviceStyles,
  });
});

export default router;
