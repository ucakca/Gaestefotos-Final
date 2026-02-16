import { execFile } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import { storageService } from './storage';

let scanTimer: NodeJS.Timeout | null = null;

/**
 * Scan a buffer with ClamAV via clamdscan.
 * Returns { clean: boolean, threat?: string }
 */
export async function scanBuffer(buffer: Buffer): Promise<{ clean: boolean; threat?: string }> {
  const tmpFile = join(tmpdir(), `clamscan-${randomBytes(8).toString('hex')}`);
  try {
    await writeFile(tmpFile, buffer);
    return await new Promise((resolve) => {
      execFile('clamdscan', ['--no-summary', '--infected', tmpFile], { timeout: 30000 }, (error, stdout, _stderr) => {
        const output = (stdout || '').trim();
        if (error && (error as any).code === 1) {
          // Exit code 1 = virus found
          const match = output.match(/:\s*(.+)\s+FOUND/);
          resolve({ clean: false, threat: match?.[1] || 'UNKNOWN' });
        } else {
          // Exit code 0 = clean, or other error = treat as clean to not block uploads
          resolve({ clean: true });
        }
      });
    });
  } catch (error) {
    logger.warn('[VirusScan] clamdscan failed, treating as clean', { message: getErrorMessage(error) });
    return { clean: true };
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}

async function processPendingPhotoScans(): Promise<void> {
  const pending = await prisma.photo.findMany({
    where: {
      deletedAt: null,
      status: { not: 'DELETED' },
      exifData: {
        path: ['scanStatus'],
        equals: 'PENDING',
      },
    },
    select: {
      id: true,
      exifData: true,
      eventId: true,
      storagePath: true,
      event: {
        select: {
          featuresConfig: true,
        },
      },
    },
    take: 20,
    orderBy: { createdAt: 'asc' },
  });

  for (const item of pending) {
    const prev = (item.exifData as any) || {};
    try {
      // Download file from storage and scan with ClamAV
      const buffer = await storageService.getFile(item.storagePath);
      const result = await scanBuffer(buffer);

      if (result.clean) {
        await prisma.photo.update({
          where: { id: item.id },
          data: {
            exifData: {
              ...prev,
              scanStatus: 'CLEAN',
              scanError: null,
              scanUpdatedAt: new Date().toISOString(),
            },
          },
        });
      } else {
        logger.warn('[VirusScan] THREAT DETECTED in photo', {
          photoId: item.id,
          eventId: item.eventId,
          threat: result.threat,
        });
        // Mark as infected and soft-delete
        await prisma.photo.update({
          where: { id: item.id },
          data: {
            status: 'DELETED',
            deletedAt: new Date(),
            exifData: {
              ...prev,
              scanStatus: 'INFECTED',
              scanThreat: result.threat,
              scanUpdatedAt: new Date().toISOString(),
            },
          },
        });
      }
    } catch (error) {
      logger.warn('[VirusScan] failed to scan photo', {
        message: getErrorMessage(error),
        photoId: item.id,
      });
    }
  }
}

async function processPendingVideoScans(): Promise<void> {
  const pending = await (prisma as any).video.findMany({
    where: {
      deletedAt: null,
      status: { not: 'DELETED' },
      scanStatus: 'PENDING',
    },
    select: {
      id: true,
      eventId: true,
      storagePath: true,
      event: {
        select: {
          featuresConfig: true,
        },
      },
    },
    take: 10,
    orderBy: { createdAt: 'asc' },
  });

  for (const item of pending) {
    try {
      const buffer = await storageService.getFile(item.storagePath);
      const result = await scanBuffer(buffer);

      if (result.clean) {
        await (prisma as any).video.update({
          where: { id: item.id },
          data: {
            scanStatus: 'CLEAN',
            scannedAt: new Date(),
            scanError: null,
          },
        });
      } else {
        logger.warn('[VirusScan] THREAT DETECTED in video', {
          videoId: item.id,
          eventId: item.eventId,
          threat: result.threat,
        });
        await (prisma as any).video.update({
          where: { id: item.id },
          data: {
            scanStatus: 'INFECTED',
            scannedAt: new Date(),
            scanError: result.threat,
            status: 'DELETED',
            deletedAt: new Date(),
          },
        });
      }
    } catch (error) {
      logger.warn('[VirusScan] failed to scan video', {
        message: getErrorMessage(error),
        videoId: item.id,
      });
    }
  }
}

export function startVirusScanWorker(): void {
  const enabled = process.env.VIRUS_SCAN_WORKER_ENABLED === 'true';
  if (!enabled) {
    logger.info('Virus scan worker disabled (set VIRUS_SCAN_WORKER_ENABLED=true to activate)');
    return;
  }

  if (scanTimer) {
    return;
  }

  const intervalMs = Number(process.env.VIRUS_SCAN_POLL_INTERVAL_MS || '60000');
  const safeIntervalMs = Number.isFinite(intervalMs) && intervalMs >= 5000 ? intervalMs : 60000;

  scanTimer = setInterval(() => {
    Promise.all([processPendingPhotoScans(), processPendingVideoScans()]).catch((error) => {
      logger.warn('[VirusScan] worker tick failed', { message: getErrorMessage(error) });
    });
  }, safeIntervalMs);

  logger.info('Virus scan worker started (ClamAV)', { intervalMs: safeIntervalMs });
}
