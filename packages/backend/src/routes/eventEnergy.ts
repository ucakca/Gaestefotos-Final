/**
 * Event Energy Routes
 * 
 * Guest-facing:
 *   GET  /api/events/:eventId/energy          — Get energy balance for device
 *   POST /api/events/:eventId/energy/reward    — Claim a reward (one-time per type)
 *   GET  /api/events/:eventId/energy/config    — Get energy config (rewards/costs visible to guest)
 * 
 * Admin/Host:
 *   GET  /api/events/:eventId/energy/stats     — Event energy statistics
 *   POST /api/events/:eventId/energy/adjust    — Admin: adjust guest energy
 */

import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getOrCreateBalance,
  earnEnergy,
  getEnergyConfig,
  getEventEnergyStats,
  adminAdjustEnergy,
  EnergyRewardType,
} from '../services/aiEnergyService';

const router = Router();

const VALID_REWARD_TYPES: EnergyRewardType[] = [
  'event_join',
  'first_upload',
  'guestbook',
  'challenge',
  'survey',
  'social_share',
];

/**
 * Extract device ID from request.
 * Priority: header > query > cookie
 */
function getDeviceId(req: Request): string | null {
  return (
    (req.headers['x-device-id'] as string) ||
    (req.query.deviceId as string) ||
    (req.cookies?.gf_device_id as string) ||
    null
  );
}

/**
 * GET /api/events/:eventId/energy
 * Returns energy balance for the requesting device.
 * No auth required (guests are anonymous), but needs deviceId.
 */
router.get('/:eventId/energy', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const deviceId = getDeviceId(req);

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required (x-device-id header or deviceId query param)' });
    }

    const balance = await getOrCreateBalance(eventId, deviceId);

    res.json({ energy: balance });
  } catch (error) {
    logger.error('Get energy balance error', { error });
    res.status(500).json({ error: 'Failed to fetch energy balance' });
  }
});

/**
 * GET /api/events/:eventId/energy/config
 * Returns the energy configuration (rewards and costs) for the event.
 * Public — guests need to know what actions earn/cost energy.
 */
router.get('/:eventId/energy/config', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const config = await getEnergyConfig(eventId);

    res.json({ config });
  } catch (error) {
    logger.error('Get energy config error', { error });
    res.status(500).json({ error: 'Failed to fetch energy config' });
  }
});

/**
 * POST /api/events/:eventId/energy/reward
 * Claim an energy reward for a specific activity.
 * Body: { rewardType: string, instanceId?: string }
 */
router.post('/:eventId/energy/reward', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const deviceId = getDeviceId(req);
    const { rewardType, instanceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }

    if (!rewardType || !VALID_REWARD_TYPES.includes(rewardType as EnergyRewardType)) {
      return res.status(400).json({
        error: `Invalid reward type. Valid: ${VALID_REWARD_TYPES.join(', ')}`,
      });
    }

    const result = await earnEnergy(eventId, deviceId, rewardType as EnergyRewardType, instanceId);

    res.json({ reward: result });
  } catch (error) {
    logger.error('Claim energy reward error', { error });
    res.status(500).json({ error: 'Failed to claim energy reward' });
  }
});

/**
 * GET /api/events/:eventId/energy/stats
 * Admin/Host: get energy statistics for the event.
 */
router.get('/:eventId/energy/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const stats = await getEventEnergyStats(eventId);

    res.json({ stats });
  } catch (error) {
    logger.error('Get energy stats error', { error });
    res.status(500).json({ error: 'Failed to fetch energy stats' });
  }
});

/**
 * POST /api/events/:eventId/energy/adjust
 * Admin: manually adjust a guest's energy balance.
 * Body: { deviceId: string, amount: number, reason: string }
 */
router.post('/:eventId/energy/adjust', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check admin role via DB lookup
    const user = await (await import('../config/database')).default.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { deviceId, amount, reason } = req.body;

    if (!deviceId || typeof amount !== 'number' || !reason) {
      return res.status(400).json({ error: 'deviceId, amount (number), and reason required' });
    }

    const result = await adminAdjustEnergy(eventId, deviceId, amount, reason);

    res.json({ adjustment: { ...result, deviceId, amount, reason } });
  } catch (error) {
    logger.error('Admin adjust energy error', { error });
    res.status(500).json({ error: 'Failed to adjust energy' });
  }
});

export default router;
