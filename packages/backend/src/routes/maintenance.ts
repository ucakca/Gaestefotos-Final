import { Router, Response } from 'express';
import { getMaintenanceMode } from '../middleware/maintenanceMode';

const router = Router();

router.get('/maintenance', async (_req, res: Response) => {
  const { enabled, message } = await getMaintenanceMode();
  res.json({ enabled, message: message || null });
});

export default router;
