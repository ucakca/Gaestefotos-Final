import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import * as os from 'os';

const router = Router();

const analyzeSchema = z.object({
  timeRange: z.enum(['1h', '6h', '24h', '7d']).optional().default('24h'),
});

function getTimeRangeMs(range: string): number {
  switch (range) {
    case '1h': return 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

router.post('/analyze-logs', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = analyzeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Parameter' });
    }

    const { timeRange } = parsed.data;
    const since = new Date(Date.now() - getTimeRangeMs(timeRange));

    // Collect real data from multiple sources
    const [
      errorLogs,
      totalErrorLogs,
      totalEvents,
      totalUsers,
      totalPhotos,
      activeEvents,
      recentWooLogs,
      recentPhotosCount,
      orphanedEvents,
    ] = await Promise.all([
      prisma.qaLogEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { id: true, level: true, type: true, message: true, createdAt: true },
      }),
      prisma.qaLogEvent.count({ where: { createdAt: { gte: since } } }),
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.user.count(),
      prisma.photo.count(),
      prisma.event.count({ where: { deletedAt: null, isActive: true } }),
      (prisma as any).wooWebhookEventLog.count({
        where: { createdAt: { gte: since }, status: { in: ['ERROR', 'FAILED'] } },
      }).catch(() => 0),
      prisma.photo.count({ where: { createdAt: { gte: since } } }),
      prisma.event.count({ where: { deletedAt: null, hostId: null as any } }).catch(() => 0),
    ]);

    // System metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
    const loadAvg = os.loadavg();
    const uptime = os.uptime();
    const cpuCount = os.cpus().length;
    const loadPerCpu = loadAvg[0] / cpuCount;

    // Analyze and generate issues
    const issues: Array<{
      id: string;
      severity: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      recommendation: string;
      canAutoFix: boolean;
    }> = [];

    let healthScore = 100;

    // 1. Memory analysis
    if (memPercent > 90) {
      issues.push({
        id: 'mem-critical',
        severity: 'critical',
        title: `Kritische RAM-Auslastung: ${memPercent}%`,
        description: `Nur noch ${Math.round(freeMem / 1024 / 1024)}MB von ${Math.round(totalMem / 1024 / 1024)}MB verfügbar.`,
        recommendation: 'Sofortiger Neustart des Backend-Services empfohlen. Prüfe auf Memory Leaks.',
        canAutoFix: false,
      });
      healthScore -= 25;
    } else if (memPercent > 75) {
      issues.push({
        id: 'mem-warning',
        severity: 'warning',
        title: `Hohe RAM-Auslastung: ${memPercent}%`,
        description: `${Math.round(freeMem / 1024 / 1024)}MB frei von ${Math.round(totalMem / 1024 / 1024)}MB gesamt.`,
        recommendation: 'Beobachten und ggf. Prozesse prüfen. Bei steigender Tendenz Neustart planen.',
        canAutoFix: false,
      });
      healthScore -= 10;
    }

    // 2. CPU Load analysis
    if (loadPerCpu > 2.0) {
      issues.push({
        id: 'cpu-critical',
        severity: 'critical',
        title: `Sehr hohe CPU-Last: ${loadAvg[0].toFixed(2)} (${cpuCount} Kerne)`,
        description: `Load Average pro CPU-Kern liegt bei ${loadPerCpu.toFixed(2)}, deutlich über dem Normalwert von 1.0.`,
        recommendation: 'Prüfe laufende Prozesse (top/htop). Mögliche Ursache: Bildverarbeitung, Datenbankabfragen.',
        canAutoFix: false,
      });
      healthScore -= 20;
    } else if (loadPerCpu > 1.0) {
      issues.push({
        id: 'cpu-warning',
        severity: 'warning',
        title: `Erhöhte CPU-Last: ${loadAvg[0].toFixed(2)}`,
        description: `Load per CPU: ${loadPerCpu.toFixed(2)}. Leicht über dem Idealwert.`,
        recommendation: 'Normal bei vielen gleichzeitigen Uploads. Bei dauerhafter Last Skalierung prüfen.',
        canAutoFix: false,
      });
      healthScore -= 5;
    }

    // 3. Error log analysis
    const importantErrors = errorLogs.filter(l => l.level === 'IMPORTANT');
    if (importantErrors.length > 50) {
      issues.push({
        id: 'errors-high',
        severity: 'critical',
        title: `${importantErrors.length} wichtige Fehler im Zeitraum`,
        description: `Es wurden ${importantErrors.length} Fehler-Logs in den letzten ${timeRange} erkannt. Das ist ungewöhnlich hoch.`,
        recommendation: 'Prüfe die Error-Logs unter System → Logs für Details. Häufigste Fehlertypen identifizieren.',
        canAutoFix: false,
      });
      healthScore -= 20;
    } else if (importantErrors.length > 10) {
      issues.push({
        id: 'errors-medium',
        severity: 'warning',
        title: `${importantErrors.length} Fehler in den letzten ${timeRange}`,
        description: `Es gibt ${importantErrors.length} Fehler-Einträge. Das liegt über dem Normalwert.`,
        recommendation: 'Regelmäßig Logs prüfen. Wiederkehrende Muster können auf systematische Probleme hinweisen.',
        canAutoFix: false,
      });
      healthScore -= 8;
    } else if (importantErrors.length > 0) {
      issues.push({
        id: 'errors-low',
        severity: 'info',
        title: `${importantErrors.length} Fehler erkannt`,
        description: `Wenige Fehler — normaler Betrieb.`,
        recommendation: 'Keine Aktion nötig. Regelmäßige Kontrolle empfohlen.',
        canAutoFix: false,
      });
    }

    // 4. Error pattern analysis
    const errorTypes = new Map<string, number>();
    for (const log of importantErrors) {
      const key = log.type || log.message || 'unknown';
      errorTypes.set(key, (errorTypes.get(key) || 0) + 1);
    }
    const topErrors = Array.from(errorTypes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (topErrors.length > 0 && topErrors[0][1] > 5) {
      issues.push({
        id: 'error-pattern',
        severity: 'warning',
        title: `Wiederkehrender Fehler: "${topErrors[0][0]}" (${topErrors[0][1]}x)`,
        description: `Der Fehlertyp "${topErrors[0][0]}" tritt wiederholt auf. Top 3: ${topErrors.map(([k, v]) => `${k} (${v}x)`).join(', ')}.`,
        recommendation: 'Untersuche die Root Cause dieses Fehlers. Wiederkehrende Fehler deuten auf ein systematisches Problem hin.',
        canAutoFix: false,
      });
      healthScore -= 5;
    }

    // 5. WooCommerce webhook errors
    if (recentWooLogs > 0) {
      issues.push({
        id: 'woo-errors',
        severity: recentWooLogs > 10 ? 'warning' : 'info',
        title: `${recentWooLogs} fehlgeschlagene WooCommerce-Webhooks`,
        description: `In den letzten ${timeRange} sind ${recentWooLogs} Webhook-Verarbeitungen fehlgeschlagen.`,
        recommendation: 'Prüfe unter Einstellungen → WooCommerce die Webhook-Logs. Mögliche Ursache: API-Key-Änderung, Netzwerkfehler.',
        canAutoFix: false,
      });
      if (recentWooLogs > 10) healthScore -= 5;
    }

    // 6. Activity analysis
    if (totalEvents > 0 && activeEvents === 0) {
      issues.push({
        id: 'no-active-events',
        severity: 'info',
        title: 'Keine aktiven Events',
        description: `Es gibt ${totalEvents} Events, aber keines ist aktuell aktiv.`,
        recommendation: 'Normal außerhalb von Event-Zeiten. Prüfe ob Events versehentlich deaktiviert wurden.',
        canAutoFix: false,
      });
    }

    // 7. Uptime check
    if (uptime < 300) {
      issues.push({
        id: 'recent-restart',
        severity: 'info',
        title: `Server kürzlich neugestartet (Uptime: ${Math.round(uptime / 60)}min)`,
        description: 'Der Server wurde vor kurzem neugestartet.',
        recommendation: 'Prüfe ob der Neustart geplant war oder durch einen Crash verursacht wurde.',
        canAutoFix: false,
      });
    }

    // Clamp health score
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Generate summary
    const criticals = issues.filter(i => i.severity === 'critical').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const infos = issues.filter(i => i.severity === 'info').length;

    let summary = '';
    if (criticals > 0) {
      summary = `Achtung: ${criticals} kritische(s) Problem(e) erkannt. Sofortige Aufmerksamkeit erforderlich.`;
    } else if (warnings > 0) {
      summary = `System läuft mit ${warnings} Warnung(en). Bitte prüfe die Details.`;
    } else if (infos > 0) {
      summary = `System läuft stabil. ${infos} Hinweis(e) zur Kenntnis.`;
    } else {
      summary = 'Alles im grünen Bereich. Keine Probleme erkannt.';
    }

    summary += ` | ${totalUsers} Benutzer, ${totalEvents} Events, ${totalPhotos.toLocaleString()} Fotos gesamt.`;
    if (recentPhotosCount > 0) {
      summary += ` ${recentPhotosCount} neue Fotos in den letzten ${timeRange}.`;
    }

    return res.json({
      summary,
      healthScore,
      issues,
      analyzedLogs: totalErrorLogs,
      analyzedAt: new Date().toISOString(),
      systemMetrics: {
        memoryPercent: memPercent,
        loadAvg: loadAvg[0],
        cpuCores: cpuCount,
        uptimeSeconds: uptime,
      },
    });
  } catch (error: any) {
    logger.error('[admin] AI analysis error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Analyse fehlgeschlagen' });
  }
});

export default router;
