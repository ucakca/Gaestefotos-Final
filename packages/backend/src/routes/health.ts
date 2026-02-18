import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { storageService } from '../services/storage';
import { getRedis } from '../services/cache/redis';
import { logger } from '../utils/logger';

const router = Router();

interface CheckResult {
  status: string;
  latencyMs?: number;
  error?: string;
  [key: string]: any;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    storage: CheckResult;
  };
  process?: {
    memoryMB: { rss: number; heapUsed: number; heapTotal: number; external: number };
    cpuUser: number;
    cpuSystem: number;
    pid: number;
    nodeVersion: string;
  };
}

/**
 * @route GET /api/health
 * @description Health check endpoint for monitoring
 * @access Public
 */
router.get('/', async (_req: Request, res: Response) => {
  const result: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    uptime: process.uptime(),
    checks: {
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
      storage: { status: 'unknown' },
    },
  };

  // Check database
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    result.checks.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart,
    };
  } catch (error: any) {
    result.checks.database = {
      status: 'error',
      error: error.message || 'Database connection failed',
    };
    result.status = 'unhealthy';
    logger.error('[Health] Database check failed', { error: error.message });
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    const redis = getRedis();
    await redis.ping();
    result.checks.redis = {
      status: 'ok',
      latencyMs: Date.now() - redisStart,
    };
  } catch (error: any) {
    result.checks.redis = {
      status: 'error',
      error: error.message || 'Redis connection failed',
    };
    result.status = result.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    logger.error('[Health] Redis check failed', { error: error.message });
  }

  // Check storage (SeaweedFS S3)
  try {
    const storageStart = Date.now();
    await storageService.ensureBucketExists();
    result.checks.storage = {
      status: 'ok',
      latencyMs: Date.now() - storageStart,
    };
  } catch (error: any) {
    result.checks.storage = {
      status: 'error',
      error: error.message || 'Storage check failed',
    };
    result.status = result.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    logger.error('[Health] Storage check failed', { error: error.message });
  }

  // Process metrics
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  result.process = {
    memoryMB: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
    },
    cpuUser: Math.round(cpu.user / 1000),
    cpuSystem: Math.round(cpu.system / 1000),
    pid: process.pid,
    nodeVersion: process.version,
  };

  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(result);
});

/**
 * @route GET /api/health/live
 * @description Liveness probe - just checks if the server is running
 * @access Public
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * @route GET /api/health/ready
 * @description Readiness probe - checks if the server is ready to accept traffic
 * @access Public
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(503).json({ 
      status: 'not_ready', 
      error: 'Database not available',
      timestamp: new Date().toISOString() 
    });
  }
});

export default router;
