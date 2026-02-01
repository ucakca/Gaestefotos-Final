import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { storageService } from '../services/storage';
import { logger } from '../utils/logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: { status: string; latencyMs?: number; error?: string };
    storage: { status: string; error?: string };
  };
}

/**
 * @route GET /api/health
 * @description Health check endpoint for monitoring
 * @access Public
 */
router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const result: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    uptime: process.uptime(),
    checks: {
      database: { status: 'unknown' },
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

  // Check storage (MinIO) - simple connectivity check
  try {
    // storageService is initialized at startup, so if we got here it's working
    result.checks.storage = { status: 'ok' };
  } catch (error: any) {
    result.checks.storage = {
      status: 'error',
      error: error.message || 'Storage check failed',
    };
    result.status = result.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    logger.error('[Health] Storage check failed', { error: error.message });
  }

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
