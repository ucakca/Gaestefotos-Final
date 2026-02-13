/**
 * Video / GIF / Boomerang API Routes
 * 
 * Endpoints for creating and managing video jobs from event photos.
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { storageService } from '../services/storage';
import { logger } from '../utils/logger';
import {
  createVideoJob,
  getVideoJob,
  listVideoJobs,
  cancelVideoJob,
  getVideoJobStats,
} from '../services/videoService';

const router = Router();

// ─── Create Video Job ────────────────────────────────────────────────────────

router.post(
  '/events/:eventId/video-jobs',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const {
        type,
        photoIds,
        width,
        height,
        fps,
        quality,
        transitionType,
        transitionMs,
        photoDisplayMs,
        musicTrack,
        watermark,
        watermarkText,
        loopCount,
      } = req.body;

      if (!type || !['VIDEO', 'GIF', 'BOOMERANG'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be VIDEO, GIF, or BOOMERANG' });
      }

      if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ error: 'photoIds must be a non-empty array' });
      }

      const jobId = await createVideoJob({
        eventId,
        userId: req.userId,
        type,
        photoIds,
        width,
        height,
        fps,
        quality,
        transitionType,
        transitionMs,
        photoDisplayMs,
        musicTrack,
        watermark,
        watermarkText,
        loopCount,
      });

      res.status(201).json({ jobId, status: 'QUEUED' });
    } catch (error: any) {
      logger.error('Create video job error', { error: error.message });
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// ─── Get Job Status ──────────────────────────────────────────────────────────

router.get(
  '/video-jobs/:jobId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const job = await getVideoJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({
        ...job,
        fileSizeBytes: job.fileSizeBytes?.toString() || null,
      });
    } catch (error: any) {
      logger.error('Get video job error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── List Jobs for Event ─────────────────────────────────────────────────────

router.get(
  '/events/:eventId/video-jobs',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const result = await listVideoJobs(eventId, page, limit);
      res.json({
        ...result,
        jobs: result.jobs.map((j) => ({
          ...j,
          fileSizeBytes: j.fileSizeBytes?.toString() || null,
        })),
      });
    } catch (error: any) {
      logger.error('List video jobs error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Download Result ─────────────────────────────────────────────────────────

router.get(
  '/video-jobs/:jobId/download',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const job = await getVideoJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      if (job.status !== 'COMPLETED' || !job.outputPath) {
        return res.status(400).json({ error: 'Job not completed yet' });
      }

      const buffer = await storageService.getFile(job.outputPath);
      const ext = job.type === 'GIF' ? 'gif' : 'mp4';
      const contentType = job.type === 'GIF' ? 'image/gif' : 'video/mp4';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${job.type.toLowerCase()}_${job.id}.${ext}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error: any) {
      logger.error('Download video job error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Cancel Job ──────────────────────────────────────────────────────────────

router.post(
  '/video-jobs/:jobId/cancel',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const success = await cancelVideoJob(req.params.jobId);
      if (!success) {
        return res.status(400).json({ error: 'Job cannot be cancelled (already processing or completed)' });
      }
      res.json({ success: true });
    } catch (error: any) {
      logger.error('Cancel video job error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Job Stats ───────────────────────────────────────────────────────────────

router.get(
  '/events/:eventId/video-jobs/stats',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const stats = await getVideoJobStats(req.params.eventId);
      res.json(stats);
    } catch (error: any) {
      logger.error('Video job stats error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
