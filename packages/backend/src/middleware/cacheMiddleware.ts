/**
 * Cache Middleware
 * 
 * Express middleware für automatisches Caching von GET-Requests
 */

import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet } from '../services/cache/redis';
import { logger } from '../utils/logger';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
}

/**
 * Cache middleware for GET requests
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 300,
    keyGenerator = (req) => `cache:${req.method}:${req.originalUrl}`,
    condition = (req) => req.method === 'GET',
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if condition not met
    if (!condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Try to get from cache
      const cached = await cacheGet<any>(cacheKey);

      if (cached) {
        logger.debug('[Cache] Serving from cache', { key: cacheKey });
        return res.json(cached);
      }

      // Override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheSet(cacheKey, body, ttl).catch((err) => {
            logger.error('[Cache] Failed to cache response', {
              error: err.message,
              key: cacheKey,
            });
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('[Cache] Middleware error', {
        error: (error as Error).message,
        key: cacheKey,
      });
      next();
    }
  };
}

/**
 * Event-specific cache middleware
 */
export function eventCacheMiddleware(ttl: number = 300) {
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const eventId = req.params.id || req.params.eventId;
      const path = req.path.replace(eventId, ':id');
      return `event:${eventId}:${path}:${JSON.stringify(req.query)}`;
    },
    condition: (req) => req.method === 'GET' && !req.headers['cache-control']?.includes('no-cache'),
  });
}

/**
 * Gallery cache middleware
 */
export function galleryCacheMiddleware() {
  return cacheMiddleware({
    ttl: 120, // 2 minutes
    keyGenerator: (req) => {
      const eventId = req.params.id || req.params.eventId;
      const page = req.query.page || '1';
      const categoryId = req.query.categoryId || 'all';
      return `event:${eventId}:gallery:${categoryId}:page:${page}`;
    },
  });
}

/**
 * Stats cache middleware
 */
export function statsCacheMiddleware() {
  return cacheMiddleware({
    ttl: 600, // 10 minutes
    keyGenerator: (req) => {
      const eventId = req.params.id || req.params.eventId;
      return `event:${eventId}:stats`;
    },
  });
}
