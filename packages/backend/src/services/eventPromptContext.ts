/**
 * Event Prompt Context Service
 * 
 * Retrieves per-event custom prompt context and injects it into AI system prompts.
 * This allows hosts to customize AI behavior per event (e.g., "duze die Gäste",
 * "verwende unseren Insider-Witz", "halte Roasts familienfreundlich").
 * 
 * The context is stored in EventAiConfig.customPromptContext (set via Briefing finalize).
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

export interface EventPromptContext {
  customPromptContext: string | null;
  eventKeywords: string[];
  eventTypeHint: string | null;
  welcomeMessage: string | null;
}

// Cache to avoid repeated DB hits during a single event's game session
const contextCache = new Map<string, { data: EventPromptContext; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Get the custom prompt context for an event.
 */
export async function getEventPromptContext(eventId: string): Promise<EventPromptContext> {
  // Check cache
  const cached = contextCache.get(eventId);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  try {
    const config = await prisma.eventAiConfig.findUnique({
      where: { eventId },
      select: {
        customPromptContext: true,
        eventKeywords: true,
        eventTypeHint: true,
        welcomeMessage: true,
      },
    });

    const result: EventPromptContext = {
      customPromptContext: config?.customPromptContext || null,
      eventKeywords: config?.eventKeywords || [],
      eventTypeHint: config?.eventTypeHint || null,
      welcomeMessage: config?.welcomeMessage || null,
    };

    contextCache.set(eventId, { data: result, expiry: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (error) {
    logger.warn('Failed to load event prompt context', { eventId, error });
    return { customPromptContext: null, eventKeywords: [], eventTypeHint: null, welcomeMessage: null };
  }
}

/**
 * Inject event-specific context into an AI system prompt.
 * Returns the enriched system prompt.
 * 
 * Example:
 *   Original: "Du bist ein witziger Persönlichkeits-Analyst..."
 *   With context: "Du bist ein witziger Persönlichkeits-Analyst...
 *     WICHTIGE EVENT-ANWEISUNGEN: Duze alle Gäste. Verwende den Insider-Witz 'Aloha Beaches'."
 */
export async function enrichSystemPrompt(
  eventId: string,
  baseSystemPrompt: string,
): Promise<string> {
  const ctx = await getEventPromptContext(eventId);

  const additions: string[] = [];

  if (ctx.eventTypeHint) {
    additions.push(`Event-Typ: ${ctx.eventTypeHint}`);
  }

  if (ctx.eventKeywords.length > 0) {
    additions.push(`Event-Keywords: ${ctx.eventKeywords.join(', ')}`);
  }

  if (ctx.customPromptContext) {
    additions.push(`WICHTIGE EVENT-ANWEISUNGEN VOM VERANSTALTER: ${ctx.customPromptContext}`);
  }

  if (additions.length === 0) return baseSystemPrompt;

  return `${baseSystemPrompt}\n\n---\n${additions.join('\n')}`;
}

/**
 * Clear the cache for an event (call after updating config).
 */
export function clearEventPromptCache(eventId: string): void {
  contextCache.delete(eventId);
}
