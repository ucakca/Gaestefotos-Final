import prisma from '../config/database';
import { logger } from '../utils/logger';

const DEFAULT_INTERVAL_MS = 60 * 1000; // 1 minute
const LOG_PREFIX = '[workflow-timer]';

function getIntervalMs(): number {
  const raw = process.env.WORKFLOW_TIMER_INTERVAL_MS;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_INTERVAL_MS;
  return Math.floor(n);
}

interface TimerStepConfig {
  mode: 'after_event_start' | 'after_event_end' | 'cron' | 'specific_time';
  delayMinutes: number;
}

interface WorkflowStep {
  type: string;
  config?: TimerStepConfig;
  label?: string;
}

interface PendingTimer {
  eventId: string;
  eventTitle: string;
  workflowId: string;
  workflowName: string;
  stepType: string;
  stepLabel: string;
  triggerAt: Date;
  config: TimerStepConfig;
}

async function checkTimersOnce(): Promise<void> {
  const enabled = process.env.WORKFLOW_TIMER_ENABLED !== 'false'; // enabled by default
  if (!enabled) return;

  try {
    const now = new Date();

    // Find all active events that have a workflow assigned
    const events = await prisma.event.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        workflowId: { not: null },
        dateTime: { not: null },
      },
      select: {
        id: true,
        title: true,
        dateTime: true,
        workflowId: true,
        workflow: {
          select: {
            id: true,
            name: true,
            steps: true,
          },
        },
      },
    });

    const pendingTimers: PendingTimer[] = [];

    for (const event of events) {
      if (!event.workflow || !event.dateTime) continue;

      const steps = (event.workflow.steps as any);
      const nodeList: any[] = steps?.nodes || (Array.isArray(steps) ? steps : []);

      for (const node of nodeList) {
        const data = node.data || node;
        if (data.type !== 'TRIGGER_TIMER') continue;

        const config: TimerStepConfig = data.config || {};
        const eventTime = new Date(event.dateTime);
        let triggerAt: Date | null = null;

        switch (config.mode) {
          case 'after_event_start': {
            const delayMs = (config.delayMinutes || 60) * 60 * 1000;
            triggerAt = new Date(eventTime.getTime() + delayMs);
            break;
          }
          case 'after_event_end': {
            // Assume event lasts ~4 hours if no endTime
            const endTime = new Date(eventTime.getTime() + 4 * 60 * 60 * 1000);
            const delayMs = (config.delayMinutes || 60) * 60 * 1000;
            triggerAt = new Date(endTime.getTime() + delayMs);
            break;
          }
          case 'specific_time': {
            // delayMinutes represents minutes from midnight on event day
            const eventDay = new Date(eventTime);
            eventDay.setHours(0, 0, 0, 0);
            triggerAt = new Date(eventDay.getTime() + (config.delayMinutes || 0) * 60 * 1000);
            break;
          }
          // 'cron' mode handled separately in future (needs node-cron)
          default:
            continue;
        }

        if (!triggerAt) continue;

        // Check if trigger time is within the last check interval (fire window)
        const intervalMs = getIntervalMs();
        const windowStart = new Date(now.getTime() - intervalMs);

        if (triggerAt > windowStart && triggerAt <= now) {
          pendingTimers.push({
            eventId: event.id,
            eventTitle: event.title,
            workflowId: event.workflow.id,
            workflowName: event.workflow.name,
            stepType: data.type,
            stepLabel: data.label || 'Timer',
            triggerAt,
            config,
          });
        }
      }
    }

    if (pendingTimers.length > 0) {
      logger.info(`${LOG_PREFIX} ${pendingTimers.length} timer(s) triggered`, {
        timers: pendingTimers.map((t) => ({
          event: t.eventTitle,
          workflow: t.workflowName,
          step: t.stepLabel,
          triggerAt: t.triggerAt.toISOString(),
        })),
      });

      // Execute workflow steps for each triggered timer
      for (const timer of pendingTimers) {
        await prisma.qaLogEvent.create({
          data: {
            level: 'DEBUG',
            type: 'WORKFLOW_TIMER_TRIGGERED',
            message: `Timer "${timer.stepLabel}" ausgelöst für Event "${timer.eventTitle}" (Workflow: ${timer.workflowName})`,
            data: {
              eventId: timer.eventId,
              workflowId: timer.workflowId,
              config: timer.config,
              triggerAt: timer.triggerAt.toISOString(),
            } as any,
          },
        });

        // Execute downstream steps
        try {
          const { executeWorkflow } = await import('./workflowExecutor');
          await executeWorkflow(timer.workflowId, 'TRIGGER_TIMER', {
            eventId: timer.eventId,
            triggeredBy: 'timer',
          });
        } catch (execError: any) {
          logger.error(`${LOG_PREFIX} Failed to execute workflow for timer`, {
            workflowId: timer.workflowId,
            eventId: timer.eventId,
            error: execError?.message,
          });
        }
      }
    }

    // ── Event Lifecycle Detection ──────────────────────────────────────────
    // Check if any events just started or ended (within the last check interval)
    await checkEventLifecycle(now, getIntervalMs());

  } catch (error: any) {
    logger.error(`${LOG_PREFIX} Error checking timers`, { message: error?.message || String(error) });
  }
}

/**
 * Detect event start/end transitions and fire TRIGGER_EVENT_START / TRIGGER_EVENT_END.
 * Uses a simple time-window approach: if event.dateTime falls within [now - interval, now],
 * the event just started. For end detection, assumes 4h duration (configurable via schedule).
 */
async function checkEventLifecycle(now: Date, intervalMs: number): Promise<void> {
  const windowStart = new Date(now.getTime() - intervalMs);

  try {
    // Events that just STARTED (dateTime within window)
    const startingEvents = await prisma.event.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        dateTime: { gt: windowStart, lte: now },
      },
      select: { id: true, title: true, dateTime: true },
    });

    if (startingEvents.length > 0) {
      const { onEventTrigger } = await import('./workflowExecutor');
      for (const evt of startingEvents) {
        logger.info(`${LOG_PREFIX} Event started: "${evt.title}"`, { eventId: evt.id });
        await onEventTrigger(evt.id, 'TRIGGER_EVENT_START').catch(() => {});
      }
    }

    // Events that just ENDED (dateTime + 4h within window)
    const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours
    const endWindowStart = new Date(windowStart.getTime() - DEFAULT_DURATION_MS);
    const endWindowEnd = new Date(now.getTime() - DEFAULT_DURATION_MS);

    const endingEvents = await prisma.event.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        dateTime: { gt: endWindowStart, lte: endWindowEnd },
      },
      select: { id: true, title: true, dateTime: true },
    });

    if (endingEvents.length > 0) {
      const { onEventTrigger } = await import('./workflowExecutor');
      for (const evt of endingEvents) {
        logger.info(`${LOG_PREFIX} Event ended: "${evt.title}"`, { eventId: evt.id });
        await onEventTrigger(evt.id, 'TRIGGER_EVENT_END').catch(() => {});
      }
    }
  } catch (err: any) {
    logger.error(`${LOG_PREFIX} Event lifecycle check failed`, { error: err.message });
  }
}

let timerHandle: ReturnType<typeof setInterval> | null = null;

export function startWorkflowTimerWorker(): void {
  const intervalMs = getIntervalMs();
  logger.info(`${LOG_PREFIX} Starting workflow timer worker (interval: ${intervalMs}ms)`);

  // Initial run after short delay
  setTimeout(() => {
    checkTimersOnce();
  }, 5000);

  timerHandle = setInterval(checkTimersOnce, intervalMs);
}

export function stopWorkflowTimerWorker(): void {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
    logger.info(`${LOG_PREFIX} Stopped workflow timer worker`);
  }
}
