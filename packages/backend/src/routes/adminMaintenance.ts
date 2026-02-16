import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { getMaintenanceMode, setMaintenanceMode } from '../middleware/maintenanceMode';
import { auditLog, AuditType } from '../services/auditLogger';

const router = Router();

const updateSchema = z.object({
  enabled: z.coerce.boolean(),
  message: z.string().optional().nullable(),
});

router.get('/', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const { enabled, message } = await getMaintenanceMode();
  res.json({ enabled, message: message || null });
});

router.put('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const data = updateSchema.parse(req.body);
  await setMaintenanceMode(!!data.enabled, data.message ?? null);
  const { enabled, message } = await getMaintenanceMode();

  auditLog({ type: AuditType.MAINTENANCE_MODE_CHANGED, message: `Wartungsmodus ${enabled ? 'aktiviert' : 'deaktiviert'}`, data: { enabled, message }, req });

  res.json({ enabled, message: message || null, success: true });
});

export default router;
