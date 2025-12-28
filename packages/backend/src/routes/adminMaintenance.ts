import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { getMaintenanceMode, setMaintenanceMode } from '../middleware/maintenanceMode';

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
  res.json({ enabled, message: message || null, success: true });
});

export default router;
