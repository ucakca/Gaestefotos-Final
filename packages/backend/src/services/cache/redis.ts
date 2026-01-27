/**
 * Redis Caching Service
 * 
 * Zentrale Redis-Integration für Performance-Optimierung
 * - Event-Daten: 5 Minuten
 * - Galerie-Fotos: 2 Minuten
 * - Statistiken: 10 Minuten
 * - QR-Designs: 30 Minuten
 */

import Redis from 'ioredis';
import { logger } from '../../utils/logger';

// Redis Client Singleton
let redisClient: Redis | null = null;

/**
 * Initialize Redis connection
 */
export function initRedis(): Redis {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisEnabled = process.env.REDIS_ENABLED !== 'false';

  if (!redisEnabled) {
    logger.warn('[Redis] Redis caching disabled via REDIS_ENABLED=false');
    // Return mock client that does nothing
    return createMockRedis();
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNRESET'];
        if (targetErrors.some(e => err.message.includes(e))) {
          return true;
        }
        return false;
      },
    });

    redisClient.on('connect', () => {
      logger.info('[Redis] Connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('[Redis] Connection error', { error: err.message });
    });

    redisClient.on('close', () => {
      logger.warn('[Redis] Connection closed');
    });

    return redisClient;
  } catch (error) {
    logger.error('[Redis] Failed to initialize', { error: (error as Error).message });
    return createMockRedis();
  }
}

/**
 * Get Redis client instance
 */
export function getRedis(): Redis {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('[Redis] Connection closed gracefully');
  }
}

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const data = await redis.get(key);
    
    if (!data) {
      logger.debug('[Redis] Cache miss', { key });
      return null;
    }

    logger.debug('[Redis] Cache hit', { key });
    return JSON.parse(data) as T;
  } catch (error) {
    logger.error('[Redis] Cache get error', {
      key,
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * Set value in cache
 */
export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    const redis = getRedis();
    const serialized = JSON.stringify(value);
    
    await redis.setex(key, ttlSeconds, serialized);
    
    logger.debug('[Redis] Cache set', { key, ttl: ttlSeconds });
  } catch (error) {
    logger.error('[Redis] Cache set error', {
      key,
      error: (error as Error).message,
    });
  }
}

/**
 * Delete value from cache
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
    
    logger.debug('[Redis] Cache deleted', { key });
  } catch (error) {
    logger.error('[Redis] Cache delete error', {
      key,
      error: (error as Error).message,
    });
  }
}

/**
 * Invalidate cache by pattern
 */
export async function cacheInvalidate(pattern: string): Promise<number> {
  try {
    const redis = getRedis();
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      logger.debug('[Redis] No keys to invalidate', { pattern });
      return 0;
    }

    const deleted = await redis.del(...keys);
    
    logger.info('[Redis] Cache invalidated', { pattern, count: deleted });
    return deleted;
  } catch (error) {
    logger.error('[Redis] Cache invalidate error', {
      pattern,
      error: (error as Error).message,
    });
    return 0;
  }
}

/**
 * Check if key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error('[Redis] Cache exists error', {
      key,
      error: (error as Error).message,
    });
    return false;
  }
}

/**
 * Get TTL for key
 */
export async function cacheTTL(key: string): Promise<number> {
  try {
    const redis = getRedis();
    return await redis.ttl(key);
  } catch (error) {
    logger.error('[Redis] Cache TTL error', {
      key,
      error: (error as Error).message,
    });
    return -1;
  }
}

/**
 * Increment counter
 */
export async function cacheIncrement(key: string, ttlSeconds?: number): Promise<number> {
  try {
    const redis = getRedis();
    const value = await redis.incr(key);
    
    if (ttlSeconds && value === 1) {
      await redis.expire(key, ttlSeconds);
    }
    
    return value;
  } catch (error) {
    logger.error('[Redis] Cache increment error', {
      key,
      error: (error as Error).message,
    });
    return 0;
  }
}

/**
 * Cache key builders
 */
export const CacheKeys = {
  event: (eventId: string) => `event:${eventId}`,
  eventPhotos: (eventId: string, page: number = 1) => `event:${eventId}:photos:page:${page}`,
  eventPhotoCount: (eventId: string) => `event:${eventId}:photos:count`,
  eventGallery: (eventId: string) => `event:${eventId}:gallery`,
  eventStats: (eventId: string) => `event:${eventId}:stats`,
  qrDesign: (eventId: string) => `event:${eventId}:qr`,
  guestList: (eventId: string) => `event:${eventId}:guests`,
  categories: (eventId: string) => `event:${eventId}:categories`,
};

/**
 * Cache TTL presets (in seconds)
 */
export const CacheTTL = {
  SHORT: 120,      // 2 minutes - frequently changing data
  MEDIUM: 300,     // 5 minutes - standard cache
  LONG: 600,       // 10 minutes - stable data
  VERY_LONG: 1800, // 30 minutes - rarely changing data
};

/**
 * Mock Redis for when Redis is disabled
 */
function createMockRedis(): Redis {
  logger.warn('[Redis] Using mock Redis (no-op)');
  
  const mockRedis = {
    get: async () => null,
    set: async () => 'OK',
    setex: async () => 'OK',
    del: async () => 0,
    keys: async () => [],
    exists: async () => 0,
    ttl: async () => -1,
    incr: async () => 1,
    expire: async () => 1,
    quit: async () => 'OK',
    on: () => mockRedis,
  } as unknown as Redis;

  return mockRedis;
}
