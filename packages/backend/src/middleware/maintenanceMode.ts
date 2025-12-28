import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

const MAINTENANCE_SETTING_KEY = 'maintenance_mode';
const CACHE_TTL_MS = 5000;

let cached: { enabled: boolean; message?: string | null; checkedAt: number } | null = null;

async function loadMaintenanceSetting(): Promise<{ enabled: boolean; message?: string | null }> {
  const now = Date.now();
  if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
    return { enabled: cached.enabled, message: cached.message };
  }

  const setting = await (prisma as any).appSetting.findUnique({
    where: { key: MAINTENANCE_SETTING_KEY },
    select: { value: true },
  });

  const value = (setting?.value || {}) as any;
  const enabled = value?.enabled === true;
  const message = typeof value?.message === 'string' ? value.message : null;

  cached = { enabled, message, checkedAt: now };
  return { enabled, message };
}

function isAllowedDuringMaintenance(req: Request): boolean {
  const path = req.path || '';

  if (path === '/health' || path === '/api/health' || path === '/api/version') return true;

  if (path === '/api/maintenance') return true;

  if (path.startsWith('/api/auth/')) return true;

  if (path.startsWith('/api/admin/')) return true;

  if (path.startsWith('/api/webhooks/woocommerce')) return true;

  return false;
}

export async function maintenanceModeMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const { enabled, message } = await loadMaintenanceSetting();
    if (!enabled) return next();

    if (isAllowedDuringMaintenance(req)) return next();

    return res.status(503).json({
      error: 'Maintenance mode',
      maintenance: true,
      message: message || undefined,
    });
  } catch {
    return next();
  }
}

export async function setMaintenanceMode(enabled: boolean, message?: string | null) {
  await (prisma as any).appSetting.upsert({
    where: { key: MAINTENANCE_SETTING_KEY },
    create: { key: MAINTENANCE_SETTING_KEY, value: { enabled: !!enabled, message: message || null } },
    update: { value: { enabled: !!enabled, message: message || null } },
  });
  cached = { enabled: !!enabled, message: message || null, checkedAt: Date.now() };
}

export async function getMaintenanceMode(): Promise<{ enabled: boolean; message?: string | null }> {
  return loadMaintenanceSetting();
}
