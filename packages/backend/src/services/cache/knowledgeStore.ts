/**
 * AI Knowledge Store — Permanenter, selbstlernender AI-Antwort-Speicher
 * 
 * Architektur:
 * ┌─────────────┐     ┌──────────┐     ┌──────────────────┐
 * │  Anfrage    │────►│  Redis   │────►│  Postgres        │
 * │             │     │  (Fast)  │     │  (Permanent)     │
 * └─────────────┘     └──────────┘     └──────────────────┘
 * 
 * Prinzipien:
 * 1. NICHTS wird gelöscht — jede AI-Antwort wird permanent gespeichert
 * 2. Redis = schneller Lookup-Layer (24h TTL als Cache, nicht als Ablaufdatum)
 * 3. Postgres = permanenter Store (AiResponseCache Tabelle)
 * 4. Gleiche Qualität für alle Pakete
 * 5. hitCount + quality Score für Ranking
 * 6. Seeding vor Launch möglich
 * 7. Offline-fähig: Knowledge Store antwortet auch ohne Internet
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { getRedis } from './redis';

const prisma = new PrismaClient();

// ─── Types ──────────────────────────────────────────────────

export type KnowledgeFeature =
  | 'suggest-albums'
  | 'suggest-description'
  | 'suggest-invitation'
  | 'suggest-challenges'
  | 'suggest-guestbook'
  | 'suggest-colors'
  | 'suggest-theme'
  | 'chat'
  | 'compliment-mirror'
  | (string & {});

export interface KnowledgeEntry<T = any> {
  id: string;
  feature: string;
  response: T;
  hitCount: number;
  quality: number;
  isVerified: boolean;
  isPinned: boolean;
  provider: string | null;
  createdAt: Date;
  lastHitAt: Date | null;
}

export interface KnowledgeStats {
  totalEntries: number;
  totalHits: number;
  features: Record<string, { entries: number; hits: number; avgQuality: number }>;
  topEntries: Array<{ feature: string; inputNormalized: string; hitCount: number; quality: number }>;
}

// ─── Constants ──────────────────────────────────────────────

const REDIS_PREFIX = 'ks:';           // Knowledge Store Redis prefix
const REDIS_STATS_PREFIX = 'ks:stats:';
const REDIS_CACHE_TTL = 86400;        // 24h Redis-Cache (nur für Speed, Daten bleiben in Postgres)

// ─── Input Normalization ────────────────────────────────────

/**
 * Normalisiert Eingabe-Parameter für konsistente Hashes.
 * Sortiert Keys alphabetisch, lowercase, trimmed.
 */
function normalizeInput(params: Record<string, any>): string {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      clean[key] = String(value).toLowerCase().trim();
    }
  }
  const sorted = Object.keys(clean).sort();
  return sorted.map(k => `${k}=${clean[k]}`).join('|');
}

/**
 * Generiert einen SHA-256 Hash der normalisierten Eingabe.
 */
function hashInput(normalized: string): string {
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Generiert einen lesbaren Debug-Key (für Logs).
 */
function debugKey(feature: string, params: Record<string, any>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  return `${feature}(${parts})`;
}

/**
 * Extrahiert den eventType aus Params (für kontextbezogene Suche).
 */
function extractEventType(params: Record<string, any>): string | null {
  return params.eventType?.toLowerCase?.()?.trim?.() || null;
}

// ─── Core: GET ──────────────────────────────────────────────

/**
 * Sucht eine Antwort im Knowledge Store.
 * 
 * 1. Redis-Lookup (schnell, 24h Cache)
 * 2. Postgres-Lookup (permanent)
 * 3. null wenn nichts gefunden
 * 
 * Bei Treffer: hitCount++ und lastHitAt aktualisieren.
 */
export async function knowledgeGet<T>(
  feature: KnowledgeFeature,
  params: Record<string, any>
): Promise<T | null> {
  const normalized = normalizeInput(params);
  const hash = hashInput(normalized);
  const redisKey = `${REDIS_PREFIX}${feature}:${hash.substring(0, 16)}`;

  try {
    // 1. Redis-Lookup (schnell)
    const redis = getRedis();
    const cached = await redis.get(redisKey);
    if (cached) {
      const entry = JSON.parse(cached);

      // Hit-Count in Postgres async erhöhen
      updateHitCount(feature, hash).catch(() => {});
      trackHit(feature).catch(() => {});

      logger.info('[KnowledgeStore] Redis Hit', {
        feature,
        key: debugKey(feature, params),
        hitCount: entry.hitCount,
      });

      return entry.response as T;
    }

    // 2. Postgres-Lookup (permanent)
    const dbEntry = await prisma.aiResponseCache.findUnique({
      where: { feature_inputHash: { feature, inputHash: hash } },
    });

    if (!dbEntry) {
      logger.debug('[KnowledgeStore] Miss', { feature, key: debugKey(feature, params) });
      return null;
    }

    // Parse response
    let response: T;
    try {
      response = JSON.parse(dbEntry.response) as T;
    } catch {
      response = dbEntry.response as unknown as T;
    }

    // In Redis cachen für nächsten schnellen Zugriff
    const redisEntry = {
      response,
      hitCount: dbEntry.hitCount,
      quality: dbEntry.quality,
    };
    redis.setex(redisKey, REDIS_CACHE_TTL, JSON.stringify(redisEntry)).catch(() => {});

    // Hit-Count aktualisieren
    updateHitCount(feature, hash).catch(() => {});
    trackHit(feature).catch(() => {});

    logger.info('[KnowledgeStore] Postgres Hit', {
      feature,
      key: debugKey(feature, params),
      hitCount: dbEntry.hitCount + 1,
      quality: dbEntry.quality,
      ageHours: Math.round((Date.now() - dbEntry.createdAt.getTime()) / (1000 * 60 * 60)),
    });

    return response;
  } catch (error) {
    logger.error('[KnowledgeStore] Get error', {
      feature,
      error: (error as Error).message,
    });
    return null;
  }
}

// ─── Core: SET ──────────────────────────────────────────────

/**
 * Speichert eine AI-Antwort permanent im Knowledge Store.
 * 
 * - Upsert: Wenn gleicher Feature+Hash existiert, wird aktualisiert
 * - Redis-Cache wird ebenfalls gesetzt
 * - Wird NIE automatisch gelöscht
 */
export async function knowledgeSet<T>(
  feature: KnowledgeFeature,
  params: Record<string, any>,
  response: T,
  options?: {
    provider?: string;
    model?: string;
    quality?: number;
    isVerified?: boolean;
    isPinned?: boolean;
  }
): Promise<void> {
  const normalized = normalizeInput(params);
  const hash = hashInput(normalized);
  const inputRaw = JSON.stringify(params);
  const eventType = extractEventType(params);
  const responseStr = typeof response === 'string' ? response : JSON.stringify(response);
  const responseFormat = typeof response === 'string' ? 'text'
    : Array.isArray(response) ? 'json_array'
    : 'json_object';

  try {
    // 1. Postgres: Upsert (create or update)
    await prisma.aiResponseCache.upsert({
      where: { feature_inputHash: { feature, inputHash: hash } },
      create: {
        feature,
        inputHash: hash,
        inputNormalized: normalized,
        inputRaw,
        eventType,
        response: responseStr,
        responseFormat,
        provider: options?.provider || null,
        model: options?.model || null,
        quality: options?.quality ?? 1.0,
        isVerified: options?.isVerified ?? false,
        isPinned: options?.isPinned ?? false,
        hitCount: 0,
      },
      update: {
        response: responseStr,
        responseFormat,
        provider: options?.provider || undefined,
        model: options?.model || undefined,
        quality: options?.quality ?? undefined,
        isVerified: options?.isVerified ?? undefined,
        isPinned: options?.isPinned ?? undefined,
      },
    });

    // 2. Redis-Cache setzen
    const redis = getRedis();
    const redisKey = `${REDIS_PREFIX}${feature}:${hash.substring(0, 16)}`;
    const redisEntry = {
      response,
      hitCount: 0,
      quality: options?.quality ?? 1.0,
    };
    redis.setex(redisKey, REDIS_CACHE_TTL, JSON.stringify(redisEntry)).catch(() => {});

    // 3. Stats
    trackEntry(feature).catch(() => {});

    logger.info('[KnowledgeStore] Stored', {
      feature,
      key: debugKey(feature, params),
      provider: options?.provider,
      quality: options?.quality ?? 1.0,
    });
  } catch (error) {
    logger.error('[KnowledgeStore] Set error', {
      feature,
      error: (error as Error).message,
    });
  }
}

// ─── Hit Count + Quality ────────────────────────────────────

async function updateHitCount(feature: string, inputHash: string): Promise<void> {
  try {
    await prisma.aiResponseCache.update({
      where: { feature_inputHash: { feature, inputHash } },
      data: {
        hitCount: { increment: 1 },
        lastHitAt: new Date(),
        // Quality steigt leicht mit jedem Hit (bewährt sich = gut)
        quality: { increment: 0.001 },
      },
    });
  } catch { /* Entry might have been deleted between check and update */ }
}

async function trackHit(feature: string): Promise<void> {
  try {
    const redis = getRedis();
    redis.incr(`${REDIS_STATS_PREFIX}hits:${feature}`).catch(() => {});
    redis.incr(`${REDIS_STATS_PREFIX}hits:total`).catch(() => {});
  } catch {}
}

async function trackEntry(feature: string): Promise<void> {
  try {
    const redis = getRedis();
    redis.incr(`${REDIS_STATS_PREFIX}entries:${feature}`).catch(() => {});
    redis.incr(`${REDIS_STATS_PREFIX}entries:total`).catch(() => {});
  } catch {}
}

// ─── Cache Wrapper ──────────────────────────────────────────

interface WithKnowledgeOptions<TParams, TResult> {
  /** Fallback wenn AI offline & kein Store-Hit */
  fallback?: (params: TParams) => TResult;
  /** Validierung ob das Ergebnis gespeichert werden soll */
  validate?: (result: TResult) => boolean;
  /** Provider-Name für Logging */
  provider?: string;
  /** Modell-Name */
  model?: string;
  /** Initiale Qualität (0-1) */
  quality?: number;
  /** Feature für bestimmte Anfragen überspringen (z.B. Compliment Mirror = immer frisch) */
  skipStore?: boolean | ((params: TParams) => boolean);
}

/**
 * Generischer Knowledge-Store-Wrapper für AI-Funktionen.
 * 
 * Ersetzt withAiCache — gleiche API, aber permanent statt TTL.
 * 
 * Flow:
 * 1. Knowledge Store prüfen → Treffer? → sofort zurückgeben (0 Tokens)
 * 2. Kein Treffer → AI aufrufen
 * 3. Ergebnis validieren & permanent speichern
 * 4. Bei Fehler → Fallback
 */
export function withKnowledge<TParams extends Record<string, any>, TResult>(
  feature: KnowledgeFeature,
  generateFn: (params: TParams) => Promise<TResult>,
  options?: WithKnowledgeOptions<TParams, TResult>
): (params: TParams) => Promise<TResult> {
  return async (params: TParams): Promise<TResult> => {
    // Check if store should be skipped for this request
    const skip = typeof options?.skipStore === 'function'
      ? options.skipStore(params)
      : options?.skipStore ?? false;

    // 1. Knowledge Store prüfen
    if (!skip) {
      const stored = await knowledgeGet<TResult>(feature, params);
      if (stored !== null) {
        return stored;
      }
    }

    // 2. AI aufrufen
    try {
      const result = await generateFn(params);

      // 3. Validieren & speichern
      const isValid = options?.validate
        ? options.validate(result)
        : (Array.isArray(result) ? result.length > 0 : !!result);

      if (isValid && !skip) {
        await knowledgeSet(feature, params, result, {
          provider: options?.provider || 'auto',
          model: options?.model,
          quality: options?.quality ?? 1.0,
        });
      }

      return result;
    } catch (error) {
      logger.error(`[KnowledgeStore] Generate failed for ${feature}`, {
        error: (error as Error).message,
        params,
      });

      // 4. Fallback
      if (options?.fallback) {
        logger.info(`[KnowledgeStore] Using fallback for ${feature}`);
        return options.fallback(params);
      }

      throw error;
    }
  };
}

// ─── Warm-Up / Seeding ──────────────────────────────────────

const COMMON_EVENT_TYPES = ['wedding', 'party', 'business', 'family', 'milestone', 'custom'];

/**
 * Füllt den Knowledge Store mit häufigen Anfragen vor (Seeding).
 * Prüft zuerst ob Einträge schon existieren → kein Doppel-Seeding.
 */
export async function seedKnowledge(
  generateFn: (feature: KnowledgeFeature, params: Record<string, any>) => Promise<any>,
  eventTypes?: string[]
): Promise<{ seeded: number; skipped: number; errors: number }> {
  const types = eventTypes || COMMON_EVENT_TYPES;
  let seeded = 0, skipped = 0, errors = 0;

  logger.info('[KnowledgeStore] Seeding started', { eventTypes: types });

  const features: Array<{ feature: KnowledgeFeature; needsTitle: boolean }> = [
    { feature: 'suggest-albums', needsTitle: false },
    { feature: 'suggest-challenges', needsTitle: false },
    { feature: 'suggest-colors', needsTitle: false },
    { feature: 'suggest-description', needsTitle: true },
    { feature: 'suggest-guestbook', needsTitle: true },
    { feature: 'suggest-invitation', needsTitle: true },
  ];

  const commonTitles: Record<string, string[]> = {
    wedding: ['Unsere Hochzeit', 'Hochzeit', 'Traumhochzeit'],
    party: ['Feier', 'Party', 'Geburtstagsparty'],
    business: ['Firmenfeier', 'Teambuilding', 'Konferenz', 'Weihnachtsfeier'],
    family: ['Familientreffen', 'Familienfeier'],
    milestone: ['Geburtstag', 'Jubiläum', '50. Geburtstag'],
    custom: ['Event', 'Veranstaltung'],
  };

  for (const eventType of types) {
    for (const { feature, needsTitle } of features) {
      if (!needsTitle) {
        // Simple: nur eventType
        const params = { eventType };
        const existing = await knowledgeGet(feature, params);
        if (existing) { skipped++; continue; }

        try {
          const result = await generateFn(feature, params);
          if (result) {
            await knowledgeSet(feature, params, result, {
              provider: 'seed',
              quality: 0.9,
              isPinned: true,
            });
            seeded++;
          }
        } catch { errors++; }
      } else {
        // Mit Titel-Varianten
        const titles = commonTitles[eventType] || commonTitles.custom;
        for (const title of titles) {
          const params = { eventType, eventTitle: title };
          const existing = await knowledgeGet(feature, params);
          if (existing) { skipped++; continue; }

          try {
            const result = await generateFn(feature, params);
            if (result) {
              await knowledgeSet(feature, params, result, {
                provider: 'seed',
                quality: 0.9,
                isPinned: true,
              });
              seeded++;
            }
          } catch { errors++; }

          // Rate limiting: 200ms zwischen API-Calls
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }

    // Theme-Vorschläge: eventType × season
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    for (const season of seasons) {
      const params = { eventType, season };
      const existing = await knowledgeGet('suggest-theme', params);
      if (existing) { skipped++; continue; }

      try {
        const result = await generateFn('suggest-theme', params);
        if (result) {
          await knowledgeSet('suggest-theme', params, result, {
            provider: 'seed',
            quality: 0.9,
            isPinned: true,
          });
          seeded++;
        }
      } catch { errors++; }

      await new Promise(r => setTimeout(r, 200));
    }
  }

  logger.info('[KnowledgeStore] Seeding complete', { seeded, skipped, errors });
  return { seeded, skipped, errors };
}

// ─── Statistics ─────────────────────────────────────────────

/**
 * Gibt umfassende Knowledge Store Statistiken zurück.
 */
export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  try {
    // Feature-Statistiken aus Postgres
    const featureAgg = await prisma.aiResponseCache.groupBy({
      by: ['feature'],
      _count: true,
      _sum: { hitCount: true },
      _avg: { quality: true },
    });

    const features: KnowledgeStats['features'] = {};
    let totalEntries = 0;
    let totalHits = 0;

    for (const agg of featureAgg) {
      features[agg.feature] = {
        entries: agg._count,
        hits: agg._sum.hitCount || 0,
        avgQuality: Math.round((agg._avg.quality || 0) * 100) / 100,
      };
      totalEntries += agg._count;
      totalHits += agg._sum.hitCount || 0;
    }

    // Top-Einträge (meistgenutzt)
    const topRaw = await prisma.aiResponseCache.findMany({
      select: { feature: true, inputNormalized: true, hitCount: true, quality: true },
      orderBy: { hitCount: 'desc' },
      take: 10,
    });

    const topEntries = topRaw.map(e => ({
      feature: e.feature,
      inputNormalized: e.inputNormalized.substring(0, 100),
      hitCount: e.hitCount,
      quality: Math.round(e.quality * 100) / 100,
    }));

    return { totalEntries, totalHits, features, topEntries };
  } catch (error) {
    logger.error('[KnowledgeStore] Stats error', { error: (error as Error).message });
    return { totalEntries: 0, totalHits: 0, features: {}, topEntries: [] };
  }
}

// ─── Admin Functions ────────────────────────────────────────

/**
 * Markiert einen Eintrag als verifiziert (von Admin geprüft).
 */
export async function verifyEntry(id: string): Promise<void> {
  await prisma.aiResponseCache.update({
    where: { id },
    data: { isVerified: true, quality: 1.5 },
  });
}

/**
 * Pinnt einen Eintrag (wird nie überschrieben, immer bevorzugt).
 */
export async function pinEntry(id: string, pinned: boolean = true): Promise<void> {
  await prisma.aiResponseCache.update({
    where: { id },
    data: { isPinned: pinned },
  });
}

/**
 * Löscht einen spezifischen Eintrag (z.B. fehlerhafte AI-Antwort).
 */
export async function deleteEntry(id: string): Promise<void> {
  const entry = await prisma.aiResponseCache.findUnique({ where: { id } });
  if (entry) {
    // Auch aus Redis entfernen
    const redisKey = `${REDIS_PREFIX}${entry.feature}:${entry.inputHash.substring(0, 16)}`;
    const redis = getRedis();
    redis.del(redisKey).catch(() => {});
  }
  await prisma.aiResponseCache.delete({ where: { id } });
}

/**
 * Listet Einträge (für Admin-UI).
 */
export async function listEntries(options?: {
  feature?: string;
  eventType?: string;
  isVerified?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'hitCount' | 'quality' | 'createdAt';
}): Promise<{ entries: any[]; total: number }> {
  const where: any = {};
  if (options?.feature) where.feature = options.feature;
  if (options?.eventType) where.eventType = options.eventType;
  if (options?.isVerified !== undefined) where.isVerified = options.isVerified;
  if (options?.search) {
    where.OR = [
      { inputNormalized: { contains: options.search.toLowerCase() } },
      { response: { contains: options.search } },
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.aiResponseCache.findMany({
      where,
      orderBy: { [options?.orderBy || 'hitCount']: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.aiResponseCache.count({ where }),
  ]);

  return { entries, total };
}

/**
 * Migriert bestehende Redis-Cache-Einträge in den Knowledge Store.
 * Einmalige Migration beim Umstieg von TTL-Cache auf Knowledge Store.
 */
export async function migrateFromRedisCache(): Promise<{ migrated: number; errors: number }> {
  let migrated = 0, errors = 0;
  
  try {
    const redis = getRedis();
    const keys = await redis.keys('ai:cache:*');
    
    // Filter: nur Feature-Keys, keine Stats-Keys
    const featureKeys = keys.filter(k => 
      !k.includes(':stats:') && 
      !k.startsWith('ai:cache:stats')
    );

    logger.info('[KnowledgeStore] Migration starting', { keysFound: featureKeys.length });

    for (const key of featureKeys) {
      try {
        const data = await redis.get(key);
        if (!data) continue;

        const cached = JSON.parse(data);
        if (!cached.response || !cached.params) continue;

        // Feature aus Key extrahieren: ai:cache:suggest-albums:abc123
        const parts = key.replace('ai:cache:', '').split(':');
        const feature = parts.slice(0, -1).join(':'); // alles außer dem Hash
        if (!feature) continue;

        const normalized = normalizeInput(cached.params);
        const hash = hashInput(normalized);

        await prisma.aiResponseCache.upsert({
          where: { feature_inputHash: { feature, inputHash: hash } },
          create: {
            feature,
            inputHash: hash,
            inputNormalized: normalized,
            inputRaw: JSON.stringify(cached.params),
            eventType: extractEventType(cached.params),
            response: typeof cached.response === 'string' 
              ? cached.response 
              : JSON.stringify(cached.response),
            responseFormat: typeof cached.response === 'string' ? 'text'
              : Array.isArray(cached.response) ? 'json_array' : 'json_object',
            provider: cached.provider || 'migrated',
            hitCount: cached.hitCount || 0,
            quality: 1.0,
          },
          update: {
            // Nicht überschreiben wenn schon migriert
          },
        });

        migrated++;
      } catch {
        errors++;
      }
    }

    logger.info('[KnowledgeStore] Migration complete', { migrated, errors });
  } catch (error) {
    logger.error('[KnowledgeStore] Migration error', { error: (error as Error).message });
  }

  return { migrated, errors };
}

// ─── AI Provider Check ──────────────────────────────────

/**
 * Prüft ob ein AI-Provider erreichbar ist (simple connectivity check).
 * Testet Groq, dann OpenAI als Fallback.
 */
export async function isAiOnline(): Promise<boolean> {
  try {
    const response = await fetch('https://api.groq.com', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok || response.status === 401 || response.status === 403;
  } catch {
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
