import { Router, Response } from 'express';
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
    return res.status(500).json({ error: 'Internal server error' });
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
    return res.status(500).json({ error: 'Internal server error' });
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
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Add debug log (called from frontend apps - no auth required)
router.post('/logs', async (_req, res: Response) => {
  try {
    if (!debugState.enabled) {
      return res.status(200).json({ ok: true, stored: false });
    }

    const { type, message, details, stack, domain, userAgent } = _req.body;
    
    const log = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: type || 'info',
      timestamp: new Date().toISOString(),
      message: message || '',
      details,
      stack,
      domain: domain || 'unknown',
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
    return res.status(500).json({ error: 'Internal server error' });
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
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if debug mode is enabled (public endpoint for frontends)
router.get('/enabled', async (_req, res: Response) => {
  return res.json({ enabled: debugState.enabled });
});

// Localhost-only toggle (no auth needed, only from 127.0.0.1)
router.post('/local-toggle', async (req, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  if (!ip.includes('127.0.0.1') && !ip.includes('::1') && !ip.includes('::ffff:127.0.0.1')) {
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
