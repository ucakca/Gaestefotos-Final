/**
 * Automation Assignment Service
 * 
 * Auto-assigns event-specific automations based on event settings.
 * Called on event creation and when event settings change.
 * 
 * Rules:
 * - "Standard Foto-Upload" is GLOBAL → runs for all events, no assignment needed
 * - "Moderiertes Event" → assigned when moderationRequired=true
 * - "Event-Ende Recap" → assigned when event has a dateTime
 * - "KI-Verarbeitung" → opt-in only (not auto-assigned)
 * - "Webhook-Integration" → opt-in only (not auto-assigned)
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

const LOG = '[automation-assignment]';

interface EventSettings {
  moderationRequired?: boolean;
  hasDateTime?: boolean;
}

/**
 * Auto-assign appropriate automations to an event based on its settings.
 * Idempotent: safe to call multiple times.
 */
export async function autoAssignAutomations(eventId: string, settings: EventSettings): Promise<void> {
  try {
    // Get all non-global AUTOMATION workflows
    const automations = await prisma.boothWorkflow.findMany({
      where: { flowType: 'AUTOMATION', isGlobal: false, isActive: true, isSystem: true },
      select: { id: true, name: true },
    });

    const automationMap = new Map(automations.map(a => [a.name, a.id]));

    // Determine which automations should be assigned
    const shouldAssign: string[] = [];
    const shouldRemove: string[] = [];

    // "Moderiertes Event" — assign if moderation is enabled
    const moderationId = automationMap.get('Moderiertes Event');
    if (moderationId) {
      if (settings.moderationRequired) {
        shouldAssign.push(moderationId);
      } else {
        shouldRemove.push(moderationId);
      }
    }

    // "Event-Ende Recap" — assign if event has a date
    const recapId = automationMap.get('Event-Ende Recap');
    if (recapId) {
      if (settings.hasDateTime) {
        shouldAssign.push(recapId);
      }
      // Don't remove recap if date is removed — host might still want it
    }

    // Execute assignments
    for (const workflowId of shouldAssign) {
      await prisma.eventAutomation.upsert({
        where: { eventId_workflowId: { eventId, workflowId } },
        create: { eventId, workflowId, isActive: true },
        update: {}, // Don't overwrite if already exists (user might have toggled it off)
      });
    }

    // Execute removals
    for (const workflowId of shouldRemove) {
      await prisma.eventAutomation.deleteMany({
        where: { eventId, workflowId },
      });
    }

    const assigned = shouldAssign.length;
    const removed = shouldRemove.length;
    if (assigned > 0 || removed > 0) {
      logger.info(`${LOG} Auto-assigned automations`, { eventId, assigned, removed });
    }
  } catch (error: any) {
    // Never let automation assignment break event creation/update
    logger.error(`${LOG} Auto-assign failed`, { eventId, error: error.message });
  }
}

/**
 * Sync automations when event settings change.
 * Compares old vs new featuresConfig and adjusts assignments.
 */
export async function syncAutomationsOnSettingsChange(
  eventId: string,
  oldFeaturesConfig: any,
  newFeaturesConfig: any,
  hasDateTime: boolean
): Promise<void> {
  const oldModeration = oldFeaturesConfig?.moderationRequired === true;
  const newModeration = newFeaturesConfig?.moderationRequired === true;

  // Only sync if relevant settings actually changed
  if (oldModeration !== newModeration) {
    await autoAssignAutomations(eventId, {
      moderationRequired: newModeration,
      hasDateTime,
    });
  }
}
