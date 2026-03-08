import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

// In-memory storage for debug state and logs
let debugState = { enabled: false, enabledAt: null as string | null, enabledBy: null as string | null };
let debugLogs: any[] = [];
const MAX_LOGS = 500;

// Get debug state
router.get('/state', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { role: true },
    });
    
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können den Debug-Modus verwenden' });
    }

    return res.json(debugState);
  } catch (error) {
    logger.error('Get debug state error', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Toggle debug mode
router.post('/toggle', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { role: true, name: true },
    });
    
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können den Debug-Modus verwenden' });
    }

    const { enabled } = req.body;
    
    debugState = {
      enabled: !!enabled,
      enabledAt: enabled ? new Date().toISOString() : null,
      enabledBy: enabled ? user.name || 'Admin' : null,
    };

    // Clear logs when disabling
    if (!enabled) {
      debugLogs = [];
    }

    logger.info('Debug mode toggled', { enabled, by: user.name });
    return res.json(debugState);
  } catch (error) {
    logger.error('Toggle debug mode error', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Get debug logs
router.get('/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { role: true },
    });
    
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Debug-Logs sehen' });
    }

    return res.json({ logs: debugLogs });
  } catch (error) {
    logger.error('Get debug logs error', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Add debug log (called from frontend apps)
// Rate-limited and input-sanitized to prevent log injection / memory exhaustion
const debugLogLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many debug logs' });
router.post('/logs', debugLogLimiter, async (_req, res: Response) => {
  try {
    if (!debugState.enabled) {
      return res.status(200).json({ ok: true, stored: false });
    }

    const type = String(_req.body?.type || 'info').slice(0, 20);
    const message = String(_req.body?.message || '').slice(0, 2000);
    const details = typeof _req.body?.details === 'string' ? _req.body.details.slice(0, 5000) : undefined;
    const stack = typeof _req.body?.stack === 'string' ? _req.body.stack.slice(0, 5000) : undefined;
    const domain = String(_req.body?.domain || 'unknown').slice(0, 100);
    const userAgent = typeof _req.body?.userAgent === 'string' ? _req.body.userAgent.slice(0, 300) : undefined;

    const log = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      timestamp: new Date().toISOString(),
      message,
      details,
      stack,
      domain,
      userAgent,
    };

    debugLogs.unshift(log);

    // Keep only last MAX_LOGS
    if (debugLogs.length > MAX_LOGS) {
      debugLogs = debugLogs.slice(0, MAX_LOGS);
    }

    return res.json({ ok: true, stored: true });
  } catch (error) {
    logger.error('Add debug log error', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Clear debug logs
router.delete('/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { role: true },
    });
    
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Debug-Logs löschen' });
    }

    debugLogs = [];
    return res.json({ ok: true });
  } catch (error) {
    logger.error('Clear debug logs error', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Check if debug mode is enabled (public endpoint for frontends)
router.get('/enabled', async (_req, res: Response) => {
  return res.json({ enabled: debugState.enabled });
});

// Localhost-only toggle (no auth needed, only from 127.0.0.1)
// Uses socket.remoteAddress (not req.ip) to bypass trust proxy and prevent X-Forwarded-For spoofing
router.post('/local-toggle', async (req, res: Response) => {
  const socketIp = req.socket.remoteAddress || '';
  const isLocalhost = socketIp === '127.0.0.1' || socketIp === '::1' || socketIp === '::ffff:127.0.0.1';
  if (!isLocalhost) {
    return res.status(403).json({ error: 'Only from localhost' });
  }
  const { enabled } = req.body;
  debugState = {
    enabled: !!enabled,
    enabledAt: enabled ? new Date().toISOString() : null,
    enabledBy: 'localhost',
  };
  if (!enabled) debugLogs = [];
  logger.info('Debug mode toggled via localhost', { enabled });
  return res.json(debugState);
});

export default router;
