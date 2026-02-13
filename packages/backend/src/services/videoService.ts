/**
 * Video / GIF / Boomerang Service
 * 
 * Creates MP4 videos, animated GIFs, and boomerang loops from event photos.
 * Uses fluent-ffmpeg for video processing and sharp for image preparation.
 */

import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import prisma from '../config/database';
import { storageService } from './storage';
import { logger } from '../utils/logger';

// ─── Configuration ───────────────────────────────────────────────────────────

const VIDEO_OUTPUT_DIR = process.env.VIDEO_OUTPUT_DIR || path.join(os.tmpdir(), 'gf-video-jobs');
const MAX_PHOTOS_PER_JOB = 100;
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';

// Set ffmpeg paths
ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

// Ensure output directory exists
fs.mkdir(VIDEO_OUTPUT_DIR, { recursive: true }).catch((err) => {
  logger.error('Failed to create video output directory', { error: err.message });
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VideoJobConfig {
  eventId: string;
  userId?: string;
  type: 'VIDEO' | 'GIF' | 'BOOMERANG';
  photoIds: string[];
  width?: number;
  height?: number;
  fps?: number;
  quality?: number;
  transitionType?: string;
  transitionMs?: number;
  photoDisplayMs?: number;
  musicTrack?: string;
  watermark?: boolean;
  watermarkText?: string;
  loopCount?: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Create a video job and start processing in the background
 */
export async function createVideoJob(config: VideoJobConfig): Promise<string> {
  if (config.photoIds.length === 0) {
    throw new Error('At least one photo is required');
  }
  if (config.photoIds.length > MAX_PHOTOS_PER_JOB) {
    throw new Error(`Maximum ${MAX_PHOTOS_PER_JOB} photos per job`);
  }

  // Verify photos exist and belong to the event
  const photos = await prisma.photo.findMany({
    where: {
      id: { in: config.photoIds },
      eventId: config.eventId,
    },
    select: { id: true, storagePath: true },
  });

  if (photos.length === 0) {
    throw new Error('No valid photos found for this event');
  }

  // Determine credit cost based on type
  const creditsCost = config.type === 'VIDEO' ? 3 : config.type === 'BOOMERANG' ? 2 : 1;

  const job = await prisma.videoJob.create({
    data: {
      eventId: config.eventId,
      userId: config.userId || null,
      type: config.type,
      photoIds: config.photoIds,
      width: config.width || 1080,
      height: config.height || 1080,
      fps: config.fps || (config.type === 'GIF' ? 15 : 30),
      quality: config.quality || 80,
      transitionType: config.transitionType || 'fade',
      transitionMs: config.transitionMs || 500,
      photoDisplayMs: config.photoDisplayMs || 2000,
      musicTrack: config.musicTrack || null,
      watermark: config.watermark || false,
      watermarkText: config.watermarkText || null,
      loopCount: config.loopCount ?? (config.type === 'GIF' ? 0 : 1),
      creditsCost,
    },
  });

  // Start processing in the background
  processVideoJob(job.id).catch((err) => {
    logger.error('Video job processing failed', { jobId: job.id, error: err.message });
  });

  return job.id;
}

/**
 * Process a video job (runs in background)
 */
async function processVideoJob(jobId: string): Promise<void> {
  const job = await prisma.videoJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'QUEUED') return;

  await prisma.videoJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  const workDir = path.join(VIDEO_OUTPUT_DIR, jobId);
  await fs.mkdir(workDir, { recursive: true });

  try {
    // 1. Download and prepare photos
    const photoPaths = await preparePhotos(job.photoIds, job.eventId, workDir, job.width, job.height);

    if (photoPaths.length === 0) {
      throw new Error('No photos could be prepared');
    }

    // 2. Generate output based on type
    let outputPath: string;
    let contentType: string;

    switch (job.type) {
      case 'VIDEO':
        outputPath = await createVideo(photoPaths, workDir, {
          fps: job.fps,
          width: job.width,
          height: job.height,
          quality: job.quality,
          transitionType: job.transitionType,
          transitionMs: job.transitionMs,
          photoDisplayMs: job.photoDisplayMs,
          musicTrack: job.musicTrack,
          watermark: job.watermark,
          watermarkText: job.watermarkText,
        });
        contentType = 'video/mp4';
        break;

      case 'GIF':
        outputPath = await createGif(photoPaths, workDir, {
          fps: Math.min(job.fps, 20), // Cap GIF fps
          width: Math.min(job.width, 480), // Cap GIF size
          height: Math.min(job.height, 480),
          photoDisplayMs: job.photoDisplayMs,
          loopCount: job.loopCount,
        });
        contentType = 'image/gif';
        break;

      case 'BOOMERANG':
        outputPath = await createBoomerang(photoPaths, workDir, {
          fps: job.fps,
          width: job.width,
          height: job.height,
          quality: job.quality,
        });
        contentType = 'video/mp4';
        break;

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    // 3. Upload result to storage
    const outputBuffer = await fs.readFile(outputPath);
    const ext = job.type === 'GIF' ? '.gif' : '.mp4';
    const filename = `${job.type.toLowerCase()}_${jobId}${ext}`;
    const storagePath = await storageService.uploadFile(
      job.eventId,
      filename,
      outputBuffer,
      contentType
    );

    const fileStats = await fs.stat(outputPath);

    // 4. Update job as completed
    await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        outputPath: storagePath,
        outputUrl: `/api/video-jobs/${jobId}/download`,
        fileSizeBytes: BigInt(fileStats.size),
        completedAt: new Date(),
      },
    });

    logger.info('Video job completed', { jobId, type: job.type, size: fileStats.size });
  } catch (error: any) {
    logger.error('Video job failed', { jobId, error: error.message, stack: error.stack });
    await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
        completedAt: new Date(),
      },
    });
  } finally {
    // Cleanup work directory
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Download photos from storage and resize to uniform dimensions
 */
async function preparePhotos(
  photoIds: string[],
  eventId: string,
  workDir: string,
  width: number,
  height: number
): Promise<string[]> {
  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, eventId },
    select: { id: true, storagePath: true },
  });

  // Maintain order from photoIds
  const photoMap = new Map(photos.map((p) => [p.id, p]));
  const paths: string[] = [];

  for (let i = 0; i < photoIds.length; i++) {
    const photo = photoMap.get(photoIds[i]);
    if (!photo) continue;

    try {
      const buffer = await storageService.getFile(photo.storagePath);
      const outputPath = path.join(workDir, `frame_${String(i).padStart(4, '0')}.png`);

      await sharp(buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'centre',
        })
        .png()
        .toFile(outputPath);

      paths.push(outputPath);
    } catch (err: any) {
      logger.warn('Failed to prepare photo for video', { photoId: photo.id, error: err.message });
    }
  }

  return paths;
}

/**
 * Create MP4 video slideshow from photos
 */
function createVideo(
  photoPaths: string[],
  workDir: string,
  opts: {
    fps: number;
    width: number;
    height: number;
    quality: number;
    transitionType: string;
    transitionMs: number;
    photoDisplayMs: number;
    musicTrack: string | null;
    watermark: boolean;
    watermarkText: string | null;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(workDir, 'output.mp4');
    const displaySeconds = opts.photoDisplayMs / 1000;

    // Create concat file for ffmpeg
    const concatFilePath = path.join(workDir, 'concat.txt');
    const concatContent = photoPaths
      .map((p) => `file '${p}'\nduration ${displaySeconds}`)
      .join('\n');
    // Add last file again (ffmpeg concat demuxer requirement)
    const lastFile = photoPaths[photoPaths.length - 1];
    const fullConcat = concatContent + `\nfile '${lastFile}'`;

    fs.writeFile(concatFilePath, fullConcat)
      .then(() => {
        let cmd = ffmpeg()
          .input(concatFilePath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .videoCodec('libx264')
          .outputOptions([
            '-pix_fmt', 'yuv420p',
            '-crf', String(Math.round(51 - (opts.quality / 100) * 41)), // quality 80 → crf ~18
            '-preset', 'medium',
            '-movflags', '+faststart',
            '-vf', `scale=${opts.width}:${opts.height}:force_original_aspect_ratio=decrease,pad=${opts.width}:${opts.height}:(ow-iw)/2:(oh-ih)/2`,
          ])
          .fps(opts.fps);

        if (opts.musicTrack) {
          cmd = cmd.input(opts.musicTrack).audioCodec('aac').audioBitrate('128k');
        } else {
          cmd = cmd.noAudio();
        }

        cmd
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', (err: Error) => reject(err))
          .run();
      })
      .catch(reject);
  });
}

/**
 * Create animated GIF from photos
 */
function createGif(
  photoPaths: string[],
  workDir: string,
  opts: {
    fps: number;
    width: number;
    height: number;
    photoDisplayMs: number;
    loopCount: number;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(workDir, 'output.gif');
    const displaySeconds = opts.photoDisplayMs / 1000;
    const frameRate = 1 / displaySeconds;

    // Create concat file
    const concatFilePath = path.join(workDir, 'concat.txt');
    const concatContent = photoPaths
      .map((p) => `file '${p}'\nduration ${displaySeconds}`)
      .join('\n');
    const lastFile = photoPaths[photoPaths.length - 1];
    const fullConcat = concatContent + `\nfile '${lastFile}'`;

    fs.writeFile(concatFilePath, fullConcat)
      .then(() => {
        ffmpeg()
          .input(concatFilePath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions([
            '-vf', `scale=${opts.width}:${opts.height}:force_original_aspect_ratio=decrease,pad=${opts.width}:${opts.height}:(ow-iw)/2:(oh-ih)/2,fps=${frameRate},split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`,
            '-loop', String(opts.loopCount),
          ])
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', (err: Error) => reject(err))
          .run();
      })
      .catch(reject);
  });
}

/**
 * Create boomerang (forward + reverse loop) from photos
 */
function createBoomerang(
  photoPaths: string[],
  workDir: string,
  opts: {
    fps: number;
    width: number;
    height: number;
    quality: number;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(workDir, 'boomerang.mp4');
    const displayPerFrame = 1 / opts.fps;

    // For boomerang: forward + reverse sequence
    const boomerangPaths = [...photoPaths, ...photoPaths.slice(0, -1).reverse()];

    const concatFilePath = path.join(workDir, 'concat.txt');
    const concatContent = boomerangPaths
      .map((p) => `file '${p}'\nduration ${displayPerFrame}`)
      .join('\n');
    const lastFile = boomerangPaths[boomerangPaths.length - 1];
    const fullConcat = concatContent + `\nfile '${lastFile}'`;

    fs.writeFile(concatFilePath, fullConcat)
      .then(() => {
        ffmpeg()
          .input(concatFilePath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .videoCodec('libx264')
          .outputOptions([
            '-pix_fmt', 'yuv420p',
            '-crf', String(Math.round(51 - (opts.quality / 100) * 41)),
            '-preset', 'medium',
            '-movflags', '+faststart',
            '-vf', `scale=${opts.width}:${opts.height}:force_original_aspect_ratio=decrease,pad=${opts.width}:${opts.height}:(ow-iw)/2:(oh-ih)/2`,
          ])
          .noAudio()
          .fps(opts.fps)
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', (err: Error) => reject(err))
          .run();
      })
      .catch(reject);
  });
}

/**
 * Get a video job by ID
 */
export async function getVideoJob(jobId: string) {
  return prisma.videoJob.findUnique({ where: { id: jobId } });
}

/**
 * List video jobs for an event
 */
export async function listVideoJobs(eventId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [jobs, total] = await Promise.all([
    prisma.videoJob.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.videoJob.count({ where: { eventId } }),
  ]);
  return { jobs, total, page, limit };
}

/**
 * Cancel a queued video job
 */
export async function cancelVideoJob(jobId: string): Promise<boolean> {
  const job = await prisma.videoJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'QUEUED') return false;

  await prisma.videoJob.update({
    where: { id: jobId },
    data: { status: 'CANCELLED' },
  });
  return true;
}

/**
 * Get stats for video jobs in an event
 */
export async function getVideoJobStats(eventId: string) {
  const [total, completed, failed, processing, queued] = await Promise.all([
    prisma.videoJob.count({ where: { eventId } }),
    prisma.videoJob.count({ where: { eventId, status: 'COMPLETED' } }),
    prisma.videoJob.count({ where: { eventId, status: 'FAILED' } }),
    prisma.videoJob.count({ where: { eventId, status: 'PROCESSING' } }),
    prisma.videoJob.count({ where: { eventId, status: 'QUEUED' } }),
  ]);

  const byType = await prisma.videoJob.groupBy({
    by: ['type'],
    where: { eventId },
    _count: true,
  });

  return {
    total,
    completed,
    failed,
    processing,
    queued,
    byType: byType.reduce((acc: Record<string, number>, t: any) => {
      acc[t.type] = t._count;
      return acc;
    }, {} as Record<string, number>),
  };
}
