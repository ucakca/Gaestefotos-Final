import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import prisma from '../config/database';

const TEMP_DIR = '/tmp/highlight-reels';
const OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'reels');

// Ensure directories exist
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

export interface HighlightReelOptions {
  eventId: string;
  duration?: number; // seconds per photo (default: 3)
  maxPhotos?: number; // max photos to include (default: 20)
  resolution?: '720p' | '1080p' | '4k';
  transition?: 'fade' | 'slide' | 'zoom';
  music?: boolean;
}

export interface ReelProgress {
  status: 'preparing' | 'downloading' | 'processing' | 'encoding' | 'complete' | 'error';
  progress: number;
  message: string;
}

// In-memory progress tracking
const reelProgress = new Map<string, ReelProgress>();

export function getReelProgress(jobId: string): ReelProgress | null {
  return reelProgress.get(jobId) || null;
}

function updateProgress(jobId: string, status: ReelProgress['status'], progress: number, message: string) {
  reelProgress.set(jobId, { status, progress, message });
}

export async function generateHighlightReel(options: HighlightReelOptions): Promise<string> {
  const {
    eventId,
    duration = 3,
    maxPhotos = 20,
    resolution = '1080p',
    transition = 'fade',
  } = options;

  const jobId = `reel-${eventId}-${Date.now()}`;
  const jobDir = path.join(TEMP_DIR, jobId);
  
  try {
    updateProgress(jobId, 'preparing', 0, 'Bereite Video vor...');
    
    // Create job directory
    await fs.mkdir(jobDir, { recursive: true });
    
    // Get event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Event nicht gefunden');
    }

    // Get photos separately
    const photos = await prisma.photo.findMany({
      where: { eventId, status: 'APPROVED' },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: maxPhotos,
    });

    if (photos.length === 0) {
      throw new Error('Keine genehmigten Fotos vorhanden');
    }

    updateProgress(jobId, 'downloading', 10, `Lade ${photos.length} Fotos...`);

    // Download photos to temp directory
    const photoFiles: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const photoUrl = photo.url || photo.storagePath;
      if (!photoUrl) continue;
      
      const ext = photoUrl.split('.').pop() || 'jpg';
      const filename = `photo_${String(i).padStart(3, '0')}.${ext}`;
      const filepath = path.join(jobDir, filename);
      
      // Copy from uploads or storage path
      const sourcePath = photoUrl.startsWith('/') 
        ? path.join(process.cwd(), photoUrl)
        : path.join(process.cwd(), 'uploads', photoUrl);
        
      if (existsSync(sourcePath)) {
        await fs.copyFile(sourcePath, filepath);
        photoFiles.push(filepath);
      }
      
      updateProgress(jobId, 'downloading', 10 + Math.floor((i / photos.length) * 30), `Foto ${i + 1}/${photos.length}`);
    }

    if (photoFiles.length === 0) {
      throw new Error('Keine Fotos konnten geladen werden');
    }

    updateProgress(jobId, 'processing', 40, 'Erstelle Slideshow...');

    // Resolution settings
    const resolutionMap = {
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '4k': { width: 3840, height: 2160 },
    };
    const { width, height } = resolutionMap[resolution];

    // Create input file list
    const inputListPath = path.join(jobDir, 'input.txt');
    const inputContent = photoFiles.map(f => `file '${f}'\nduration ${duration}`).join('\n');
    await fs.writeFile(inputListPath, inputContent);

    // Output path
    const outputFilename = `highlight-${event.slug}-${Date.now()}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    updateProgress(jobId, 'encoding', 50, 'Rendere Video...');

    // Build FFmpeg command
    const ffmpegArgs = [
      '-f', 'concat',
      '-safe', '0',
      '-i', inputListPath,
      '-vf', [
        `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
        transition === 'fade' ? 'fade=t=in:st=0:d=0.5,fade=t=out:st=' + (duration - 0.5) + ':d=0.5' : '',
        transition === 'zoom' ? 'zoompan=z=\'min(zoom+0.0015,1.5)\':d=125:s=' + width + 'x' + height : '',
      ].filter(Boolean).join(','),
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-y',
      outputPath
    ];

    // Run FFmpeg
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        // Parse progress from FFmpeg output
        const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+)/);
        if (timeMatch) {
          const seconds = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
          const totalSeconds = photoFiles.length * duration;
          const progress = Math.min(95, 50 + Math.floor((seconds / totalSeconds) * 45));
          updateProgress(jobId, 'encoding', progress, `Rendere... ${Math.floor((seconds / totalSeconds) * 100)}%`);
        }
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
        }
      });

      ffmpeg.on('error', reject);
    });

    // Cleanup temp directory
    await fs.rm(jobDir, { recursive: true, force: true });

    updateProgress(jobId, 'complete', 100, 'Video fertig!');

    // Return public URL
    return `/uploads/reels/${outputFilename}`;

  } catch (error) {
    updateProgress(jobId, 'error', 0, error instanceof Error ? error.message : 'Unbekannter Fehler');
    
    // Cleanup on error
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
    } catch {}
    
    throw error;
  }
}

export async function listEventReels(eventId: string): Promise<string[]> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return [];

  const files = await fs.readdir(OUTPUT_DIR).catch(() => []);
  return files
    .filter(f => f.includes(event.slug) && f.endsWith('.mp4'))
    .map(f => `/uploads/reels/${f}`);
}

export async function deleteReel(filename: string): Promise<void> {
  const filepath = path.join(OUTPUT_DIR, path.basename(filename));
  await fs.unlink(filepath);
}
