import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, optionalAuthMiddleware, hasEventManageAccess, hasEventAccess } from '../middleware/auth';
import { logger } from '../utils/logger';

/**
 * Creates a managed stats route with common boilerplate:
 * - authMiddleware
 * - eventId extraction
 * - hasEventManageAccess check
 * - try/catch with error logging
 */
export function statsRoute(
  router: Router,
  path: string,
  logLabel: string,
  handler: (eventId: string) => Promise<any>,
): void {
  router.get(`/:eventId/photos/${path}`, authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });
      const result = await handler(eventId);
      res.json(result);
    } catch (error: any) {
      logger.error(`${logLabel} error`, { error: error.message });
      res.status(500).json({ error: 'Fehler' });
    }
  });
}

/**
 * Like statsRoute but passes the full request for routes needing req.query etc.
 */
export function statsRouteWithReq(
  router: Router,
  path: string,
  logLabel: string,
  handler: (eventId: string, req: AuthRequest) => Promise<any>,
): void {
  router.get(`/:eventId/photos/${path}`, authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });
      const result = await handler(eventId, req);
      res.json(result);
    } catch (error: any) {
      logger.error(`${logLabel} error`, { error: error.message });
      res.status(500).json({ error: 'Fehler' });
    }
  });
}

/**
 * Public stats route using optionalAuthMiddleware + hasEventAccess.
 */
export function publicStatsRoute(
  router: Router,
  path: string,
  logLabel: string,
  handler: (eventId: string, req: AuthRequest) => Promise<any>,
): void {
  router.get(`/:eventId/photos/${path}`, optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      if (!(await hasEventAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });
      const result = await handler(eventId, req);
      res.json(result);
    } catch (error: any) {
      logger.error(`${logLabel} error`, { error: error.message });
      res.status(500).json({ error: 'Fehler' });
    }
  });
}
