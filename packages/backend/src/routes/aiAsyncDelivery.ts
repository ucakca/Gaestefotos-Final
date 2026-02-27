import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  executeAsync,
  getAiJobByShortCode,
  getAiJobById,
  getAiJobsForDevice,
} from '../services/aiAsyncDelivery';

const router = Router();

// ── Specific routes MUST come before parametric /:shortCode ──

// GET /api/ai-jobs/video-models — list available FAL.ai video models
router.get('/video-models', (_req, res: Response) => {
  try {
    const { getAvailableVideoModels } = require('../services/aiVideoGen');
    res.json({ models: getAvailableVideoModels() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai-jobs/by-id/:jobId
router.get('/by-id/:jobId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const job = await getAiJobById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job nicht gefunden' });
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai-jobs/device/:eventId/:deviceId
router.get('/device/:eventId/:deviceId', async (req, res: Response) => {
  try {
    const jobs = await getAiJobsForDevice(req.params.eventId, req.params.deviceId);
    res.json({ jobs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai-jobs/admin/list — admin: list all jobs with pagination & filters
router.get('/admin/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;
    const feature = req.query.feature as string;
    const eventId = req.query.eventId as string;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (status) { where += ` AND status = $${paramIdx++}`; params.push(status.toUpperCase()); }
    if (feature) { where += ` AND feature = $${paramIdx++}`; params.push(feature); }
    if (eventId) { where += ` AND event_id = $${paramIdx++}`; params.push(eventId); }

    const countRows = await (await import('../config/database')).default.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as total FROM ai_jobs ${where}`, ...params,
    );
    const total = countRows[0]?.total || 0;

    const rows = await (await import('../config/database')).default.$queryRawUnsafe<any[]>(
      `SELECT id, event_id, photo_id, device_id, feature, status, short_code, result_url, error,
              created_at, started_at, completed_at, expires_at,
              EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - COALESCE(started_at, created_at)))::int as duration_sec
       FROM ai_jobs ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      ...params, limit, offset,
    );

    const statsRows = await (await import('../config/database')).default.$queryRawUnsafe<any[]>(
      `SELECT status, COUNT(*)::int as count FROM ai_jobs GROUP BY status`,
    );
    const featureRows = await (await import('../config/database')).default.$queryRawUnsafe<any[]>(
      `SELECT feature, COUNT(*)::int as count FROM ai_jobs GROUP BY feature ORDER BY count DESC`,
    );

    res.json({
      jobs: rows.map((r: any) => ({
        id: r.id, eventId: r.event_id, photoId: r.photo_id, deviceId: r.device_id,
        feature: r.feature, status: r.status, shortCode: r.short_code,
        resultUrl: r.result_url, error: r.error,
        createdAt: r.created_at, startedAt: r.started_at, completedAt: r.completed_at,
        expiresAt: r.expires_at, durationSec: r.duration_sec,
      })),
      total,
      stats: Object.fromEntries(statsRows.map((r: any) => [r.status, r.count])),
      features: featureRows.map((r: any) => ({ feature: r.feature, count: r.count })),
    });
  } catch (error: any) {
    logger.error('Admin AI jobs list error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ── Parametric catch-all LAST ──

// GET /api/ai-jobs/:shortCode — public, no auth
router.get('/:shortCode', async (req, res: Response) => {
  try {
    const { shortCode } = req.params;
    if (!shortCode || shortCode.length < 6) return res.status(400).json({ error: 'Ungültiger Code' });
    const job = await getAiJobByShortCode(shortCode);
    if (!job) return res.status(404).json({ error: 'Job nicht gefunden oder abgelaufen' });
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST routes (order doesn't matter for these) ──

// POST /api/ai-jobs/style-transfer
router.post('/style-transfer', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, style, prompt, strength, deviceId } = req.body;
    if (!photoId || !eventId || !style) return res.status(400).json({ error: 'photoId, eventId und style sind erforderlich' });

    const io = req.app?.get?.('io');
    const job = await executeAsync(
      { eventId, photoId, userId: req.userId, deviceId, feature: 'style_transfer', inputData: { style, prompt, strength } },
      async (_jobId, inputData) => {
        const { executeStyleTransfer } = await import('../services/styleTransfer');
        const result = await executeStyleTransfer({ photoId, eventId, style: inputData.style, prompt: inputData.prompt, strength: inputData.strength });
        return { resultUrl: result.outputUrl };
      },
      io,
    );

    res.status(202).json({ jobId: job.id, shortCode: job.shortCode, status: job.status, feature: 'style_transfer' });
  } catch (error: any) {
    logger.error('Async style transfer error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-jobs/style-effect
router.post('/style-effect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, effect, intensity, variant, deviceId } = req.body;
    if (!photoId || !effect) return res.status(400).json({ error: 'photoId und effect sind erforderlich' });

    const io = req.app?.get?.('io');
    const job = await executeAsync(
      { eventId, photoId, userId: req.userId, deviceId, feature: effect, inputData: { effect, intensity, variant } },
      async (_jobId, inputData) => {
        const { processStyleEffectForPhoto } = await import('../services/aiStyleEffects');
        const result = await processStyleEffectForPhoto(photoId, req.userId!, inputData.effect, {
          intensity: inputData.intensity ? Number(inputData.intensity) : undefined,
          variant: inputData.variant,
        });
        const { storageService } = await import('../services/storage');
        const url = await storageService.getFileUrl(result.newPhotoPath, 7200);
        return { resultUrl: url, storagePath: result.newPhotoPath };
      },
      io,
    );

    res.status(202).json({ jobId: job.id, shortCode: job.shortCode, status: job.status, feature: effect });
  } catch (error: any) {
    logger.error('Async style effect error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-jobs/face-swap
router.post('/face-swap', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, templateId, templateUrl, deviceId } = req.body;
    if (!photoId || !eventId) return res.status(400).json({ error: 'photoId und eventId sind erforderlich' });
    if (!templateId && !templateUrl) return res.status(400).json({ error: 'templateId oder templateUrl ist erforderlich' });

    const io = req.app?.get?.('io');
    const job = await executeAsync(
      { eventId, photoId, userId: req.userId, deviceId, feature: 'face_swap', inputData: { templateId, templateUrl } },
      async (_jobId, inputData) => {
        const { storageService } = await import('../services/storage');
        const { resolveProvider } = await import('../services/aiExecution');
        const db = (await import('../config/database')).default;

        let tplUrl = inputData.templateUrl;
        if (inputData.templateId) {
          const rows: any[] = await db.$queryRawUnsafe(
            `SELECT "imageUrl" FROM face_swap_templates WHERE id = $1 AND "isActive" = true LIMIT 1`, inputData.templateId,
          );
          if (!rows[0]) throw new Error('Template nicht gefunden');
          tplUrl = rows[0].imageUrl;
        }

        const photo = await db.photo.findUnique({ where: { id: photoId }, select: { storagePath: true, url: true } });
        if (!photo?.storagePath) throw new Error('Foto nicht gefunden');
        const guestUrl = photo.url || await storageService.getFileUrl(photo.storagePath);

        const provider = await resolveProvider('face_switch');
        if (!provider) throw new Error('Kein Face-Swap Provider');
        const apiKey = provider.apiKey || '';

        const swapModel = provider.model || 'fal-ai/face-swap';
        const queueUrl = `https://queue.fal.run/${swapModel}`;
        const submitRes = await fetch(queueUrl, {
          method: 'POST',
          headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ base_image_url: tplUrl, swap_image_url: guestUrl }),
        });
        if (!submitRes.ok) throw new Error(`FAL queue error ${submitRes.status}`);
        const { request_id } = await submitRes.json() as any;

        for (let i = 0; i < 120; i++) {
          await new Promise(ok => setTimeout(ok, 5000));
          const sRes = await fetch(`https://queue.fal.run/${swapModel}/requests/${request_id}/status`, { headers: { Authorization: `Key ${apiKey}` } });
          const sData = await sRes.json() as any;
          if (sData.status === 'COMPLETED') break;
          if (sData.status === 'FAILED') throw new Error('Face swap failed');
        }

        const rRes = await fetch(`https://queue.fal.run/${swapModel}/requests/${request_id}`, { headers: { Authorization: `Key ${apiKey}` } });
        const rData = await rRes.json() as any;
        const outputUrl = rData?.image?.url || rData?.output?.url || '';
        if (!outputUrl) throw new Error('Kein Ergebnis-Bild');

        const imgRes = await fetch(outputUrl);
        let buf: Buffer = Buffer.from(await imgRes.arrayBuffer()) as Buffer;

        try {
          const { applyReferenceImageOverlay } = await import('../services/referenceImageAnchoring');
          buf = await applyReferenceImageOverlay(buf, eventId);
        } catch { /* no overlay */ }

        const sp = await storageService.uploadFile(eventId, `face-swap-async-${photoId}.jpg`, buf, 'image/jpeg');
        const url = await storageService.getFileUrl(sp, 7200);
        return { resultUrl: url, storagePath: sp };
      },
      io,
    );

    res.status(202).json({ jobId: job.id, shortCode: job.shortCode, status: job.status, feature: 'face_swap' });
  } catch (error: any) {
    logger.error('Async face swap error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-jobs/video
router.post('/video', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, prompt, duration, model, deviceId } = req.body;
    if (!photoId || !eventId) return res.status(400).json({ error: 'photoId und eventId sind erforderlich' });

    const io = req.app?.get?.('io');
    const job = await executeAsync(
      { eventId, photoId, userId: req.userId, deviceId, feature: 'ai_video', inputData: { prompt, duration, model } },
      async (_jobId, inputData) => {
        const { generateImageToVideo, getVideoJobStatus } = await import('../services/aiVideoGen');
        const videoJobId = await generateImageToVideo({
          photoId, eventId, prompt: inputData.prompt, duration: inputData.duration || 5,
        });
        for (let i = 0; i < 150; i++) {
          await new Promise(ok => setTimeout(ok, 4000));
          const status = getVideoJobStatus(videoJobId);
          if (status?.status === 'completed' && status.videoUrl) return { resultUrl: status.videoUrl };
          if (status?.status === 'failed') throw new Error(status.error || 'Video generation failed');
        }
        throw new Error('Video generation timeout');
      },
      io,
    );

    res.status(202).json({ jobId: job.id, shortCode: job.shortCode, status: job.status, feature: 'ai_video' });
  } catch (error: any) {
    logger.error('Async video error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai-jobs/survey — survey answer → async AI generation
router.post('/survey', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId, eventId, questionId, answer, deviceId } = req.body;
    if (!photoId || !eventId || !questionId || !answer) {
      return res.status(400).json({ error: 'photoId, eventId, questionId und answer sind erforderlich' });
    }

    const { getSurveyQuestion, buildSurveyPrompt } = await import('../services/aiSurveyPrompt');
    const question = await getSurveyQuestion(questionId);
    if (!question) return res.status(404).json({ error: 'Survey-Frage nicht gefunden' });

    const finalPrompt = buildSurveyPrompt(question.promptTemplate, answer);

    const io = req.app?.get?.('io');
    const job = await executeAsync(
      { eventId, photoId, userId: req.userId, deviceId, feature: 'survey_ai', inputData: { questionId, answer, prompt: finalPrompt, negativePrompt: question.negativePrompt, style: question.style } },
      async (_jobId, inputData) => {
        const { executeStyleTransfer } = await import('../services/styleTransfer');
        const result = await executeStyleTransfer({
          photoId, eventId, style: inputData.style || 'survey-custom', prompt: inputData.prompt,
        });
        return { resultUrl: result.outputUrl };
      },
      io,
    );

    res.status(202).json({
      jobId: job.id, shortCode: job.shortCode, status: job.status, feature: 'survey_ai',
      question: question.question, answer, prompt: finalPrompt,
    });
  } catch (error: any) {
    logger.error('Async survey AI error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
