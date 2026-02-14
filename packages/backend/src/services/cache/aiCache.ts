/**
 * Lernendes AI-Cache-System
 * 
 * Speichert erfolgreiche AI-Antworten in Redis mit langer TTL.
 * Ermöglicht Offline-Betrieb für Text-AI-Features am Event-Terminal.
 * 
 * Architektur:
 * 1. Request kommt rein → Cache-Key wird aus Feature + Parametern generiert
 * 2. Cache-Hit → sofortige Antwort (funktioniert offline!)
 * 3. Cache-Miss + Online → AI API aufrufen → Ergebnis cachen → zurückgeben
 * 4. Cache-Miss + Offline → statischer Fallback
 * 
 * Das System "lernt" indem es:
 * - Jede erfolgreiche AI-Antwort speichert (30 Tage TTL)
 * - Hit-Counts trackt um beliebte Anfragen zu priorisieren
 * - Warm-Up Funktion für häufige Event-Typen bereitstellt
 */

import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { getRedis } from './redis';

// ─── Types ──────────────────────────────────────────────────

export type AiCacheFeatureKnown =
  | 'suggest-albums'
  | 'suggest-description'
  | 'suggest-invitation'
  | 'suggest-challenges'
  | 'suggest-guestbook'
  | 'suggest-colors'
  | 'chat';

// Erweiterbar: Neue Features werden automatisch akzeptiert
export type AiCacheFeature = AiCacheFeatureKnown | (string & {});

interface CachedAiResponse<T = any> {
  response: T;
  createdAt: number;
  hitCount: number;
  provider: string;
  params: Record<string, any>;
}

interface AiCacheStats {
  totalEntries: number;
  totalHits: number;
  features: Record<string, { entries: number; hits: number }>;
}

// ─── Constants ──────────────────────────────────────────────

const AI_CACHE_PREFIX = 'ai:cache';
const AI_CACHE_STATS_PREFIX = 'ai:cache:stats';
const AI_CACHE_TTL = 30 * 24 * 60 * 60; // 30 Tage in Sekunden
const AI_CACHE_CHAT_TTL = 7 * 24 * 60 * 60; // 7 Tage für Chat-Antworten

// Event-Typen die beim Warm-Up vorgeladen werden
const COMMON_EVENT_TYPES = ['wedding', 'party', 'business', 'family', 'milestone', 'custom'];

// ─── Cache Key Generation ───────────────────────────────────

/**
 * Generiert einen deterministischen Cache-Key aus Feature + Parametern.
 * Sortiert Parameter alphabetisch für Konsistenz.
 */
function generateCacheKey(feature: AiCacheFeature, params: Record<string, any>): string {
  // Nur relevante, nicht-leere Parameter verwenden
  const cleanParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = String(value).toLowerCase().trim();
    }
  }

  // Sortierte Parameter für deterministischen Hash
  const sortedKeys = Object.keys(cleanParams).sort();
  const paramString = sortedKeys.map(k => `${k}=${cleanParams[k]}`).join('|');

  // Kurzer Hash für den Key
  const hash = crypto.createHash('md5').update(paramString).digest('hex').substring(0, 12);

  return `${AI_CACHE_PREFIX}:${feature}:${hash}`;
}

/**
 * Generiert einen lesbaren Debug-Key (für Logs)
 */
function generateDebugKey(feature: AiCacheFeature, params: Record<string, any>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  return `${feature}(${parts})`;
}

// ─── Core Cache Functions ───────────────────────────────────

/**
 * Versucht eine gecachte AI-Antwort zu finden.
 * Erhöht hitCount bei Treffer.
 */
export async function aiCacheGet<T>(
  feature: AiCacheFeature,
  params: Record<string, any>
): Promise<T | null> {
  try {
    const redis = getRedis();
    const key = generateCacheKey(feature, params);
    const data = await redis.get(key);

    if (!data) {
      logger.debug('[AI-Cache] Miss', { feature, key: generateDebugKey(feature, params) });
      return null;
    }

    const cached: CachedAiResponse<T> = JSON.parse(data);

    // Hit-Count erhöhen (fire & forget)
    cached.hitCount++;
    redis.setex(key, AI_CACHE_TTL, JSON.stringify(cached)).catch(() => {});

    // Globalen Hit-Counter erhöhen
    const statsKey = `${AI_CACHE_STATS_PREFIX}:hits:${feature}`;
    redis.incr(statsKey).catch(() => {});

    logger.info('[AI-Cache] Hit', {
      feature,
      key: generateDebugKey(feature, params),
      hitCount: cached.hitCount,
      ageHours: Math.round((Date.now() - cached.createdAt) / (1000 * 60 * 60)),
    });

    return cached.response;
  } catch (error) {
    logger.error('[AI-Cache] Get error', {
      feature,
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * Speichert eine AI-Antwort im Cache.
 */
export async function aiCacheSet<T>(
  feature: AiCacheFeature,
  params: Record<string, any>,
  response: T,
  provider: string = 'unknown'
): Promise<void> {
  try {
    const redis = getRedis();
    const key = generateCacheKey(feature, params);
    const ttl = feature === 'chat' ? AI_CACHE_CHAT_TTL : AI_CACHE_TTL;

    const entry: CachedAiResponse<T> = {
      response,
      createdAt: Date.now(),
      hitCount: 0,
      provider,
      params,
    };

    await redis.setex(key, ttl, JSON.stringify(entry));

    // Entry-Counter erhöhen
    const statsKey = `${AI_CACHE_STATS_PREFIX}:entries:${feature}`;
    redis.incr(statsKey).catch(() => {});

    logger.info('[AI-Cache] Stored', {
      feature,
      key: generateDebugKey(feature, params),
      ttlDays: Math.round(ttl / 86400),
      provider,
    });
  } catch (error) {
    logger.error('[AI-Cache] Set error', {
      feature,
      error: (error as Error).message,
    });
  }
}

/**
 * Prüft ob der AI-Provider erreichbar ist (simple connectivity check).
 */
export async function isAiOnline(): Promise<boolean> {
  try {
    const response = await fetch('https://api.groq.com', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok || response.status === 401 || response.status === 403;
  } catch {
    // Auch andere Provider testen
    try {
      const response = await fetch('https://api.openai.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok || response.status === 401 || response.status === 403;
    } catch {
      return false;
    }
  }
}

// ─── Warm-Up System ─────────────────────────────────────────

/**
 * Wärmt den Cache auf, indem häufige Anfragen vorgeladen werden.
 * Sollte aufgerufen werden wenn:
 * - Server startet und online ist
 * - Admin es manuell triggert
 * - Vor einem Event (Event-Typ bekannt)
 */
export async function warmUpCache(
  generateFn: (feature: AiCacheFeature, params: Record<string, any>) => Promise<any>,
  eventTypes?: string[]
): Promise<{ warmed: number; skipped: number; errors: number }> {
  const types = eventTypes || COMMON_EVENT_TYPES;
  let warmed = 0;
  let skipped = 0;
  let errors = 0;

  logger.info('[AI-Cache] Warm-up starting', { eventTypes: types });

  for (const eventType of types) {
    // Album-Vorschläge
    const albumParams = { eventType };
    if (!(await aiCacheGet('suggest-albums', albumParams))) {
      try {
        const result = await generateFn('suggest-albums', albumParams);
        if (result) {
          await aiCacheSet('suggest-albums', albumParams, result, 'warm-up');
          warmed++;
        }
      } catch { errors++; }
    } else { skipped++; }

    // Challenge-Vorschläge
    const challengeParams = { eventType };
    if (!(await aiCacheGet('suggest-challenges', challengeParams))) {
      try {
        const result = await generateFn('suggest-challenges', challengeParams);
        if (result) {
          await aiCacheSet('suggest-challenges', challengeParams, result, 'warm-up');
          warmed++;
        }
      } catch { errors++; }
    } else { skipped++; }

    // Farbschemata
    const colorParams = { eventType };
    if (!(await aiCacheGet('suggest-colors', colorParams))) {
      try {
        const result = await generateFn('suggest-colors', colorParams);
        if (result) {
          await aiCacheSet('suggest-colors', colorParams, result, 'warm-up');
          warmed++;
        }
      } catch { errors++; }
    } else { skipped++; }

    // Beschreibung + Gästebuch brauchen eventTitle, daher mit Platzhaltern
    const commonTitles: Record<string, string[]> = {
      wedding: ['Unsere Hochzeit', 'Hochzeit'],
      party: ['Feier', 'Party'],
      business: ['Firmenfeier', 'Teambuilding', 'Konferenz'],
      family: ['Familientreffen', 'Familienfeier'],
      milestone: ['Geburtstag', 'Jubiläum'],
      custom: ['Event', 'Veranstaltung'],
    };

    const titles = commonTitles[eventType] || commonTitles.custom;
    for (const title of titles) {
      const descParams = { eventType, eventTitle: title };
      if (!(await aiCacheGet('suggest-description', descParams))) {
        try {
          const result = await generateFn('suggest-description', descParams);
          if (result) {
            await aiCacheSet('suggest-description', descParams, result, 'warm-up');
            warmed++;
          }
        } catch { errors++; }
      } else { skipped++; }

      const gbParams = { eventType, eventTitle: title };
      if (!(await aiCacheGet('suggest-guestbook', gbParams))) {
        try {
          const result = await generateFn('suggest-guestbook', gbParams);
          if (result) {
            await aiCacheSet('suggest-guestbook', gbParams, result, 'warm-up');
            warmed++;
          }
        } catch { errors++; }
      } else { skipped++; }

      const invParams = { eventType, eventTitle: title };
      if (!(await aiCacheGet('suggest-invitation', invParams))) {
        try {
          const result = await generateFn('suggest-invitation', invParams);
          if (result) {
            await aiCacheSet('suggest-invitation', invParams, result, 'warm-up');
            warmed++;
          }
        } catch { errors++; }
      } else { skipped++; }
    }
  }

  logger.info('[AI-Cache] Warm-up complete', { warmed, skipped, errors });
  return { warmed, skipped, errors };
}

// ─── Auto-Cache Wrapper ─────────────────────────────────────

interface WithAiCacheOptions<TParams, TResult> {
  /** Fallback wenn AI offline & kein Cache-Hit */
  fallback?: (params: TParams) => TResult;
  /** Validierung ob das Ergebnis gecacht werden soll (default: truthy check) */
  validate?: (result: TResult) => boolean;
  /** Provider-Name für Logging (default: aus getDefaultConfig) */
  provider?: string;
}

/**
 * Generischer Cache-Wrapper für AI-Funktionen.
 * 
 * Jede AI-Funktion die mit withAiCache gewrapt wird, bekommt automatisch:
 * - Cache-Lookup vor dem API-Call
 * - Cache-Store nach erfolgreichem API-Call
 * - Fallback bei Fehler + Offline
 * - Hit-Count Tracking
 * 
 * Verwendung:
 *   const cached = withAiCache('suggest-albums', generateFn, { fallback });
 *   const result = await cached({ eventType: 'wedding' });
 */
export function withAiCache<TParams extends Record<string, any>, TResult>(
  feature: AiCacheFeature,
  generateFn: (params: TParams) => Promise<TResult>,
  options?: WithAiCacheOptions<TParams, TResult>
): (params: TParams) => Promise<TResult> {
  return async (params: TParams): Promise<TResult> => {
    // 1. Cache prüfen
    const cached = await aiCacheGet<TResult>(feature, params);
    if (cached !== null) {
      return cached;
    }

    // 2. AI aufrufen
    try {
      const result = await generateFn(params);

      // 3. Validieren & cachen
      const isValid = options?.validate
        ? options.validate(result)
        : (Array.isArray(result) ? result.length > 0 : !!result);

      if (isValid) {
        const providerName = options?.provider || 'auto';
        await aiCacheSet(feature, params, result, providerName);
      }

      return result;
    } catch (error) {
      logger.error(`[AI-Cache] Generate failed for ${feature}`, {
        error: (error as Error).message,
        params,
      });

      // 4. Fallback
      if (options?.fallback) {
        logger.info(`[AI-Cache] Using fallback for ${feature}`);
        return options.fallback(params);
      }

      throw error;
    }
  };
}

// ─── Statistics ─────────────────────────────────────────────

/**
 * Gibt Cache-Statistiken zurück.
 */
export async function getAiCacheStats(): Promise<AiCacheStats> {
  try {
    const redis = getRedis();
    const features: AiCacheFeature[] = [
      'suggest-albums', 'suggest-description', 'suggest-invitation',
      'suggest-challenges', 'suggest-guestbook', 'suggest-colors', 'chat',
    ];

    let totalEntries = 0;
    let totalHits = 0;
    const featureStats: Record<string, { entries: number; hits: number }> = {};

    for (const feature of features) {
      const entriesKey = `${AI_CACHE_STATS_PREFIX}:entries:${feature}`;
      const hitsKey = `${AI_CACHE_STATS_PREFIX}:hits:${feature}`;

      const entries = parseInt(await redis.get(entriesKey) || '0', 10);
      const hits = parseInt(await redis.get(hitsKey) || '0', 10);

      featureStats[feature] = { entries, hits };
      totalEntries += entries;
      totalHits += hits;
    }

    return { totalEntries, totalHits, features: featureStats };
  } catch (error) {
    logger.error('[AI-Cache] Stats error', { error: (error as Error).message });
    return { totalEntries: 0, totalHits: 0, features: {} };
  }
}

/**
 * Löscht den gesamten AI-Cache.
 */
export async function clearAiCache(): Promise<number> {
  try {
    const redis = getRedis();
    const keys = await redis.keys(`${AI_CACHE_PREFIX}:*`);

    if (keys.length === 0) return 0;

    const deleted = await redis.del(...keys);
    logger.info('[AI-Cache] Cleared', { deletedKeys: deleted });
    return deleted;
  } catch (error) {
    logger.error('[AI-Cache] Clear error', { error: (error as Error).message });
    return 0;
  }
}

/**
 * Gibt die Anzahl der gecachten Einträge pro Feature zurück.
 */
export async function getAiCacheEntryCount(): Promise<Record<AiCacheFeature, number>> {
  try {
    const redis = getRedis();
    const features: AiCacheFeature[] = [
      'suggest-albums', 'suggest-description', 'suggest-invitation',
      'suggest-challenges', 'suggest-guestbook', 'suggest-colors', 'chat',
    ];

    const counts: Record<string, number> = {};
    for (const feature of features) {
      const keys = await redis.keys(`${AI_CACHE_PREFIX}:${feature}:*`);
      counts[feature] = keys.length;
    }

    return counts as Record<AiCacheFeature, number>;
  } catch (error) {
    logger.error('[AI-Cache] Count error', { error: (error as Error).message });
    return {} as Record<AiCacheFeature, number>;
  }
}
