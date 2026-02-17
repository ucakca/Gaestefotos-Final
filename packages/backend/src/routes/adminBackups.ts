import { Router, Request, Response } from 'express';
import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const router = Router();

const BACKUP_DIR = '/opt/backups/gaestefotos';
const BACKUP_DB_DIR = '/opt/backups/gaestefotos/db';
const BACKUP_SCRIPT = '/opt/backup_gaestefotos.sh';
const BACKUP_DB_SCRIPT = '/opt/backup_gaestefotos_db.sh';

// ─── Types ───────────────────────────────────────────────

interface BackupEntry {
  id: string;
  filename: string;
  type: 'full' | 'incremental' | 'db';
  category: 'daily' | 'weekly' | 'monthly' | 'manual';
  sizeBytes: number;
  sizeHuman: string;
  createdAt: string;
  path: string;
}

interface BackupSchedule {
  daily: { enabled: boolean; time: string; retention: number };
  weekly: { enabled: boolean; dayOfWeek: number; time: string; retention: number };
  monthly: { enabled: boolean; dayOfMonth: number; time: string; retention: number };
}

// ─── Helpers ─────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function scanBackupDir(dir: string, type: 'full' | 'incremental' | 'db', category: string): BackupEntry[] {
  const entries: BackupEntry[] = [];
  const fullPath = path.join(dir, category);
  if (!fs.existsSync(fullPath)) return entries;

  const files = fs.readdirSync(fullPath);
  for (const file of files) {
    const filePath = path.join(fullPath, file);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;
      // Skip manifest and env files for the main list
      if (file.startsWith('manifest_') || file.startsWith('env_files_')) continue;

      entries.push({
        id: Buffer.from(filePath).toString('base64url'),
        filename: file,
        type: file.endsWith('.sql.gz') ? 'db' : file.startsWith('incr_') ? 'incremental' : type,
        category: category as any,
        sizeBytes: stat.size,
        sizeHuman: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        path: filePath,
      });
    } catch {
      // skip unreadable files
    }
  }
  return entries;
}

// ─── GET /api/admin/backups — List all backups ───────────

router.get('/', async (_req: Request, res: Response) => {
  try {
    const allEntries: BackupEntry[] = [];

    // Scan app backups
    for (const cat of ['daily', 'weekly', 'monthly', 'manual']) {
      allEntries.push(...scanBackupDir(BACKUP_DIR, 'full', cat));
    }

    // Scan DB backups
    for (const cat of ['daily', 'weekly', 'monthly', 'manual']) {
      allEntries.push(...scanBackupDir(BACKUP_DB_DIR, 'db', cat));
    }

    // Sort newest first
    allEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Stats
    const totalSize = allEntries.reduce((sum, e) => sum + e.sizeBytes, 0);
    const lastFull = allEntries.find(e => e.type === 'full');
    const lastDb = allEntries.find(e => e.type === 'db');
    const lastIncremental = allEntries.find(e => e.type === 'incremental');

    // Disk usage
    let diskFree = 0, diskTotal = 0;
    try {
      const dfOutput = execSync('df -B1 /opt/backups 2>/dev/null || df -B1 / 2>/dev/null').toString();
      const lines = dfOutput.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        diskTotal = parseInt(parts[1]) || 0;
        diskFree = parseInt(parts[3]) || 0;
      }
    } catch { /* ignore */ }

    res.json({
      backups: allEntries.map(e => ({ ...e, path: undefined })), // Don't expose paths
      stats: {
        totalBackups: allEntries.length,
        totalSize: formatBytes(totalSize),
        totalSizeBytes: totalSize,
        lastFullBackup: lastFull?.createdAt || null,
        lastDbBackup: lastDb?.createdAt || null,
        lastIncrementalBackup: lastIncremental?.createdAt || null,
        diskFree: formatBytes(diskFree),
        diskTotal: formatBytes(diskTotal),
        diskFreeBytes: diskFree,
        diskTotalBytes: diskTotal,
      },
    });
  } catch (error: any) {
    logger.error('Error listing backups:', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden der Backups' });
  }
});

// ─── GET /api/admin/backups/schedule — Get cron schedule ─

router.get('/schedule', async (_req: Request, res: Response) => {
  try {
    let crontab = '';
    try {
      crontab = execSync('crontab -l 2>/dev/null').toString();
    } catch { /* no crontab */ }

    const schedule: BackupSchedule = {
      daily: { enabled: false, time: '02:00', retention: 7 },
      weekly: { enabled: false, dayOfWeek: 0, time: '03:00', retention: 4 },
      monthly: { enabled: false, dayOfMonth: 1, time: '04:00', retention: 12 },
    };

    // Parse crontab for backup entries
    const lines = crontab.split('\n');
    for (const line of lines) {
      if (line.includes('backup_gaestefotos.sh') || line.includes('backup_gaestefotos_db.sh')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 6) continue;
        const minute = parts[0];
        const hour = parts[1];
        const dom = parts[2]; // day of month
        const dow = parts[4]; // day of week
        const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

        if (line.includes('daily')) {
          schedule.daily.enabled = true;
          schedule.daily.time = time;
        } else if (line.includes('weekly')) {
          schedule.weekly.enabled = true;
          schedule.weekly.time = time;
          schedule.weekly.dayOfWeek = parseInt(dow) || 0;
        } else if (line.includes('monthly')) {
          schedule.monthly.enabled = true;
          schedule.monthly.time = time;
          schedule.monthly.dayOfMonth = parseInt(dom) || 1;
        }
      }
    }

    res.json({ schedule, raw: crontab });
  } catch (error: any) {
    logger.error('Error getting backup schedule:', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden des Backup-Zeitplans' });
  }
});

// ─── POST /api/admin/backups/run — Trigger a backup ──────

router.post('/run', async (req: Request, res: Response) => {
  try {
    const { type = 'full', includeDb = true } = req.body;

    if (type === 'db') {
      // DB-only backup
      exec(`${BACKUP_DB_SCRIPT} manual`, (error, stdout, stderr) => {
        if (error) {
          logger.error('DB backup failed:', { error: error.message, stderr });
        } else {
          logger.info('DB backup completed via admin:', { stdout: stdout.substring(0, 500) });
        }
      });
      return res.json({ success: true, message: 'Datenbank-Backup gestartet', type: 'db' });
    }

    if (type === 'incremental') {
      // Incremental backup: only changed files since last full backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').substring(0, 15);
      const incrDir = path.join(BACKUP_DIR, 'manual');

      // Find last full backup for reference
      const lastFullBackup = findLastFullBackup();
      const newerThan = lastFullBackup
        ? `--newer-mtime="${new Date(lastFullBackup).toISOString()}"`
        : '';

      const incrFile = path.join(incrDir, `incr_${timestamp}.tar.gz`);
      const cmd = `mkdir -p "${incrDir}" && tar -czf "${incrFile}" ${newerThan} -C /opt/gaestefotos app --exclude="*/node_modules" --exclude="*/.next" --exclude="*/.pnpm-store" --exclude="*/dist" --exclude="*/.turbo" 2>/dev/null`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          logger.error('Incremental backup failed:', { error: error.message, stderr });
        } else {
          logger.info('Incremental backup completed via admin');
        }
      });

      // Also do DB backup if requested
      if (includeDb) {
        exec(`${BACKUP_DB_SCRIPT} manual`, () => {});
      }

      return res.json({ success: true, message: 'Inkrementelles Backup gestartet', type: 'incremental' });
    }

    // Full backup
    exec(`${BACKUP_SCRIPT} manual`, (error, stdout, stderr) => {
      if (error) {
        logger.error('Full backup failed:', { error: error.message, stderr });
      } else {
        logger.info('Full backup completed via admin:', { stdout: stdout.substring(0, 500) });
      }
    });

    if (includeDb) {
      exec(`${BACKUP_DB_SCRIPT} manual`, () => {});
    }

    res.json({ success: true, message: 'Vollständiges Backup gestartet', type: 'full' });
  } catch (error: any) {
    logger.error('Error triggering backup:', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Starten des Backups' });
  }
});

// ─── GET /api/admin/backups/:id/download — Download ──────

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf-8');

    // Security: only allow files from backup directory
    if (!filePath.startsWith(BACKUP_DIR) && !filePath.startsWith(BACKUP_DB_DIR)) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup nicht gefunden' });
    }

    const filename = path.basename(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/gzip');

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error: any) {
    logger.error('Error downloading backup:', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Download' });
  }
});

// ─── DELETE /api/admin/backups/:id — Delete a backup ─────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf-8');

    // Security: only allow files from backup directory
    if (!filePath.startsWith(BACKUP_DIR) && !filePath.startsWith(BACKUP_DB_DIR)) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup nicht gefunden' });
    }

    fs.unlinkSync(filePath);
    logger.info('Backup deleted via admin:', { path: filePath });

    res.json({ success: true, message: 'Backup gelöscht' });
  } catch (error: any) {
    logger.error('Error deleting backup:', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ─── POST /api/admin/backups/verify — Verify backup integrity

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const filePath = Buffer.from(id, 'base64url').toString('utf-8');

    if (!filePath.startsWith(BACKUP_DIR) && !filePath.startsWith(BACKUP_DB_DIR)) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup nicht gefunden' });
    }

    // Test archive integrity
    let isValid = false;
    let fileCount = 0;
    try {
      if (filePath.endsWith('.tar.gz')) {
        const output = execSync(`tar -tzf "${filePath}" 2>/dev/null | wc -l`).toString().trim();
        fileCount = parseInt(output) || 0;
        isValid = fileCount > 0;
      } else if (filePath.endsWith('.sql.gz')) {
        const output = execSync(`gzip -t "${filePath}" 2>&1 && echo OK || echo FAIL`).toString().trim();
        isValid = output.includes('OK');
        if (isValid) {
          const sizeOutput = execSync(`gzip -l "${filePath}" 2>/dev/null | tail -1`).toString();
          const parts = sizeOutput.trim().split(/\s+/);
          fileCount = parseInt(parts[1]) || 0; // uncompressed size
        }
      }
    } catch {
      isValid = false;
    }

    res.json({
      id,
      valid: isValid,
      fileCount,
      filename: path.basename(filePath),
      message: isValid ? 'Backup ist intakt' : 'Backup ist beschädigt oder unlesbar',
    });
  } catch (error: any) {
    logger.error('Error verifying backup:', { error: error.message });
    res.status(500).json({ error: 'Fehler bei der Verifizierung' });
  }
});

// ─── Helper: Find last full backup timestamp ─────────────

function findLastFullBackup(): string | null {
  for (const cat of ['manual', 'daily', 'weekly', 'monthly']) {
    const dir = path.join(BACKUP_DIR, cat);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('app_') && f.endsWith('.tar.gz'))
      .sort()
      .reverse();
    if (files.length > 0) {
      const stat = fs.statSync(path.join(dir, files[0]));
      return stat.mtime.toISOString();
    }
  }
  return null;
}

export default router;
