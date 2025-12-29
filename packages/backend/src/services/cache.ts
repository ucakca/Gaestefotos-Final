import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

// Initialize Redis connection
export function initRedis(): Redis | null {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn('Redis URL not configured, caching disabled');
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err: any) => {
      logger.error('Redis error', { error: err.message });
    });

    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis', { error });
    return null;
  }
}

// Initialize on module load
initRedis();

export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!redis) {
      return null;
    }

    try {
      const data = await redis.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  },

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!redis) {
      return;
    }

    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  },

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    if (!redis) {
      return;
    }

    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Cache del error', { key, error });
    }
  },

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (!redis) {
      return;
    }

    try {
      let cursor = '0';
      const batchSize = 500;
      const toDelete: string[] = [];

      do {
        const result = await (redis as any).scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
        cursor = Array.isArray(result) ? String(result[0]) : '0';
        const keys = Array.isArray(result) ? (result[1] as string[]) : [];

        if (Array.isArray(keys) && keys.length) {
          toDelete.push(...keys);
          while (toDelete.length >= batchSize) {
            const batch = toDelete.splice(0, batchSize);
            await redis.del(...batch);
          }
        }
      } while (cursor !== '0');

      if (toDelete.length) {
        await redis.del(...toDelete);
      }
    } catch (error) {
      logger.error('Cache delPattern error', { pattern, error });
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!redis) {
      return false;
    }

    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  },
};






