import prisma from '../config/database';
import { logger } from '../utils/logger';
import { getEventStorageEndsAt, addDays } from './storagePolicy';
import { emailService } from './email';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_BATCH_SIZE = 200;
const REMINDER_DAYS = [30, 7, 1] as const;
const REMINDER_KIND = 'STORAGE_ENDS_AT';

function getIntervalMs(): number {
  const raw = process.env.STORAGE_REMINDER_INTERVAL_MS;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_INTERVAL_MS;
  return Math.floor(n);
}

function getBatchSize(): number {
  const raw = process.env.STORAGE_REMINDER_BATCH_SIZE;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BATCH_SIZE;
  return Math.floor(n);
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function sendRemindersOnce(): Promise<void> {
  const enabled = process.env.STORAGE_REMINDER_ENABLED === 'true';
  if (!enabled) return;

  const now = new Date();
  const today = startOfDayUTC(now);
  const batchSize = getBatchSize();

  // Fetch candidate events; keep the selection small and filter in-code
  const events = await prisma.event.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      dateTime: { not: null },
    },
    select: {
      id: true,
      title: true,
      host: { select: { email: true, name: true } },
    },
    take: batchSize,
    orderBy: { createdAt: 'desc' },
  });

  for (const e of events) {
    try {
      const hostEmail = e.host?.email;
      if (!hostEmail) continue;

      const endsAt = await getEventStorageEndsAt(e.id);
      if (!endsAt) continue;

      const endsDay = startOfDayUTC(endsAt);

      // If already ended, skip reminders.
      if (today.getTime() > endsDay.getTime()) continue;

      for (const daysBefore of REMINDER_DAYS) {
        const triggerDay = startOfDayUTC(addDays(endsDay, -daysBefore));
        if (today.getTime() !== triggerDay.getTime()) continue;

        // Dedup via unique constraint (eventId, kind, daysBefore)
        try {
          await prisma.eventReminderLog.create({
            data: {
              eventId: e.id,
              kind: REMINDER_KIND,
              daysBefore,
              storageEndsAt: endsAt,
            },
          });
        } catch (err: any) {
          // If already sent, ignore.
          if (err?.code === 'P2002') {
            continue;
          }
          throw err;
        }

        await emailService.sendStorageEndsReminder({
          to: hostEmail,
          hostName: e.host?.name || 'Host',
          eventTitle: e.title,
          eventId: e.id,
          storageEndsAt: endsAt,
          daysBefore,
        });

        logger.info('Storage reminder sent', {
          eventId: e.id,
          daysBefore,
          to: hostEmail,
          storageEndsAt: endsAt.toISOString(),
        });
      }
    } catch (err) {
      logger.error('Storage reminder: failed processing event', {
        eventId: e.id,
        message: (err as any)?.message || String(err),
      });
    }
  }
}

let reminderTimer: NodeJS.Timeout | null = null;

export function startStorageReminderWorker(): void {
  const enabled = process.env.STORAGE_REMINDER_ENABLED === 'true';
  if (!enabled) {
    logger.info('Storage reminder worker disabled');
    return;
  }

  const intervalMs = getIntervalMs();
  logger.info('Storage reminder worker starting', { intervalMs, batchSize: getBatchSize(), reminderDays: REMINDER_DAYS });

  sendRemindersOnce().catch((err) => {
    logger.error('Storage reminder worker initial run failed', { message: (err as any)?.message || String(err) });
  });

  reminderTimer = setInterval(() => {
    sendRemindersOnce().catch((err) => {
      logger.error('Storage reminder worker run failed', { message: (err as any)?.message || String(err) });
    });
  }, intervalMs);
  reminderTimer.unref?.();
}

export function stopStorageReminderWorker(): void {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
}
