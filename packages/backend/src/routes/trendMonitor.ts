import { Router, Response } from 'express';
import { authMiddleware, isPrivilegedRole, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import prisma from '../config/database';

const router = Router();

// GET /api/admin/trend-monitor — list reports
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!isPrivilegedRole(req.userRole)) return res.status(403).json({ error: 'Nur Admins' });
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, "weekOf", source, status, "fetchedAt", "createdAt",
         jsonb_array_length(trends) as trend_count,
         jsonb_array_length(suggestions) as suggestion_count
       FROM trend_reports ORDER BY "weekOf" DESC, source LIMIT 20`
    );
    res.json({ reports: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/trend-monitor/:id — full report detail
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!isPrivilegedRole(req.userRole)) return res.status(403).json({ error: 'Nur Admins' });
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM trend_reports WHERE id = $1 LIMIT 1`, req.params.id
    );
    if (!rows[0]) return res.status(404).json({ error: 'Bericht nicht gefunden' });
    res.json({ report: rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/trend-monitor/latest/summary — latest report summary
router.get('/latest/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!isPrivilegedRole(req.userRole)) return res.status(403).json({ error: 'Nur Admins' });
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM trend_reports WHERE source = 'combined' ORDER BY "weekOf" DESC LIMIT 1`
    );
    if (!rows[0]) return res.json({ report: null, message: 'Noch kein Bericht — bitte "Jetzt analysieren" klicken' });
    res.json({ report: rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/trend-monitor/run — trigger manual analysis
router.post('/run', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!isPrivilegedRole(req.userRole)) return res.status(403).json({ error: 'Nur Admins' });

    // Run async — don't block the response
    res.json({ success: true, message: 'Trend-Analyse gestartet (läuft im Hintergrund, ~30-60s)' });

    // Import and run the trend monitor job
    const { runTrendMonitorJob } = await import('../services/trendMonitor');
    runTrendMonitorJob().catch(err => {
      logger.error('[TrendMonitor] Manual run failed', { error: err.message });
    });
  } catch (error: any) {
    logger.error('[TrendMonitor] Trigger failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/trend-monitor/:id — delete report
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!isPrivilegedRole(req.userRole)) return res.status(403).json({ error: 'Nur Admins' });
    await prisma.$executeRawUnsafe(`DELETE FROM trend_reports WHERE id = $1`, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
