import ffmpeg from 'fluent-ffmpeg';
import { createReadStream, createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import sharp from 'sharp';

export interface VideoMetadata {
  duration: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
  bitrate: number | null;
  fps: number | null;
}

export interface ThumbnailOptions {
  timestamp?: string; // e.g., '00:00:05' or '50%'
  width?: number;
  height?: number;
}

/**
 * Extract metadata from video file using ffprobe
 */
export async function extractVideoMetadata(videoPath: string): Promise<VideoMetadata | null> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err: Error | null, metadata: any) => {
      if (err) {
        logger.error('[videoProcessor] Failed to extract metadata', {
          error: err.message,
          videoPath,
        });
        return resolve(null);
      }

      try {
        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        
        if (!videoStream) {
          return resolve(null);
        }

        const duration = metadata.format.duration || null;
        const width = videoStream.width || null;
        const height = videoStream.height || null;
        const codec = videoStream.codec_name || null;
        const bitrate = metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : null;
        
        // Calculate FPS
        let fps: number | null = null;
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          if (den && den !== 0) {
            fps = num / den;
          }
        }

        resolve({
          duration,
          width,
          height,
          codec,
          bitrate,
          fps,
        });
      } catch (parseError) {
        logger.error('[videoProcessor] Failed to parse metadata', {
          error: (parseError as Error).message,
        });
        resolve(null);
      }
    });
  });
}

/**
 * Generate thumbnail from video at specific timestamp
 */
export async function generateVideoThumbnail(
  videoPath: string,
  outputPath: string,
  options: ThumbnailOptions = {}
): Promise<boolean> {
  const { timestamp = '00:00:02', width = 640, height = 360 } = options;

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: `${width}x${height}`,
      })
      .on('end', () => {
        logger.info('[videoProcessor] Thumbnail generated', {
          videoPath,
          outputPath,
        });
        resolve(true);
      })
      .on('error', (err: Error) => {
        logger.error('[videoProcessor] Thumbnail generation failed', {
          error: err.message,
          videoPath,
          outputPath,
        });
        reject(err);
      });
  });
}

/**
 * Compress video for web streaming
 * Converts to H.264 MP4 with optimized settings
 */
export async function compressVideoForWeb(
  inputPath: string,
  outputPath: string,
  targetBitrate: string = '2000k'
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .videoBitrate(targetBitrate)
      .audioBitrate('128k')
      .format('mp4')
      .outputOptions([
        '-preset fast',
        '-movflags +faststart', // Enable streaming
        '-crf 23', // Quality (lower = better, 18-28 range)
      ])
      .output(outputPath)
      .on('end', () => {
        logger.info('[videoProcessor] Video compression completed', {
          inputPath,
          outputPath,
          targetBitrate,
        });
        resolve(true);
      })
      .on('error', (err: Error) => {
        logger.error('[videoProcessor] Video compression failed', {
          error: err.message,
          inputPath,
        });
        reject(err);
      })
      .on('progress', (progress: any) => {
        logger.debug('[videoProcessor] Compression progress', {
          percent: progress.percent?.toFixed(2),
          timemark: progress.timemark,
        });
      })
      .run();
  });
}

/**
 * Generate multiple thumbnails for video scrubbing
 */
export async function generateThumbnailStrip(
  videoPath: string,
  outputDir: string,
  count: number = 10
): Promise<string[]> {
  const metadata = await extractVideoMetadata(videoPath);
  
  if (!metadata || !metadata.duration) {
    throw new Error('Could not extract video duration');
  }

  const duration = metadata.duration;
  const interval = duration / (count + 1);
  const thumbnailPaths: string[] = [];

  for (let i = 1; i <= count; i++) {
    const timestamp = Math.floor(i * interval);
    const outputPath = path.join(outputDir, `thumb_${i}.jpg`);
    
    try {
      await generateVideoThumbnail(videoPath, outputPath, {
        timestamp: `${timestamp}`,
        width: 320,
        height: 180,
      });
      thumbnailPaths.push(outputPath);
    } catch (err) {
      logger.warn('[videoProcessor] Failed to generate thumbnail strip item', {
        index: i,
        timestamp,
        error: (err as Error).message,
      });
    }
  }

  return thumbnailPaths;
}

/**
 * Validate video file
 * Checks codec, resolution, duration constraints
 */
export async function validateVideo(
  videoPath: string,
  constraints?: {
    maxDuration?: number; // seconds
    maxWidth?: number;
    maxHeight?: number;
    allowedCodecs?: string[];
  }
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  const metadata = await extractVideoMetadata(videoPath);
  
  if (!metadata) {
    errors.push('Konnte Video-Metadaten nicht extrahieren');
    return { valid: false, errors };
  }

  if (constraints?.maxDuration && metadata.duration && metadata.duration > constraints.maxDuration) {
    errors.push(`Video zu lang (max: ${constraints.maxDuration}s)`);
  }

  if (constraints?.maxWidth && metadata.width && metadata.width > constraints.maxWidth) {
    errors.push(`Video zu breit (max: ${constraints.maxWidth}px)`);
  }

  if (constraints?.maxHeight && metadata.height && metadata.height > constraints.maxHeight) {
    errors.push(`Video zu hoch (max: ${constraints.maxHeight}px)`);
  }

  if (constraints?.allowedCodecs && metadata.codec && !constraints.allowedCodecs.includes(metadata.codec)) {
    errors.push(`Codec nicht unterstützt: ${metadata.codec}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract video poster image (optimized for display)
 */
export async function extractPosterImage(
  videoPath: string,
  outputPath: string,
  timestamp: string = '00:00:03'
): Promise<string> {
  const tempPath = outputPath.replace(/\.(jpg|png)$/, '_temp.jpg');
  
  // Generate raw thumbnail
  await generateVideoThumbnail(videoPath, tempPath, {
    timestamp,
    width: 1920,
    height: 1080,
  });

  // Optimize with sharp
  await sharp(tempPath)
    .resize(1920, 1080, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, progressive: true })
    .toFile(outputPath);

  // Clean up temp file
  await fs.unlink(tempPath).catch(() => {});

  return outputPath;
}
