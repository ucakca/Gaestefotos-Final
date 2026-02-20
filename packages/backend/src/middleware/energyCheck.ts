/**
 * Energy Check Middleware
 * 
 * Wraps AI endpoint handlers to automatically:
 * 1. Extract deviceId from request
 * 2. Check if guest has enough energy
 * 3. Deduct energy on successful response
 * 
 * Usage in routes:
 *   router.post('/compliment-mirror', authMiddleware, withEnergyCheck('compliment_mirror'), handler);
 * 
 * Or call manually in handler:
 *   const energyResult = await checkAndSpendEnergy(req, eventId, 'compliment_mirror');
 *   if (!energyResult.success) return res.status(429).json(energyResult);
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { spendEnergy, getOrCreateBalance } from '../services/aiEnergyService';
import { AiFeature } from '../services/aiFeatureRegistry';
import { isAiFeatureAllowed } from '../services/aiFeatureGate';

/**
 * Extract device ID from request (header > query > cookie > body).
 */
export function extractDeviceId(req: Request): string | null {
  return (
    (req.headers['x-device-id'] as string) ||
    (req.query.deviceId as string) ||
    (req.cookies?.gf_device_id as string) ||
    (req.body?.deviceId as string) ||
    null
  );
}

/**
 * Check energy and spend it for an AI feature.
 * Returns result object — caller decides how to handle insufficient energy.
 */
export async function checkAndSpendEnergy(
  req: Request,
  eventId: string,
  featureKey: AiFeature,
): Promise<{
  success: boolean;
  cost?: number;
  newBalance?: number;
  cooldownActive?: boolean;
  cooldownEndsAt?: string | null;
  reason?: string;
  deviceId?: string;
}> {
  const deviceId = extractDeviceId(req);

  if (!deviceId) {
    // No device ID = no energy tracking (e.g. admin, booth without fingerprint)
    // Allow through — energy is guest-facing only
    return { success: true, cost: 0, deviceId: undefined };
  }

  try {
    const result = await spendEnergy(eventId, deviceId, featureKey);
    return { ...result, deviceId };
  } catch (error) {
    logger.error('Energy check failed', { eventId, deviceId, featureKey, error });
    // On error, allow through (fail-open for energy, not fail-closed)
    return { success: true, cost: 0, deviceId };
  }
}

/**
 * Express middleware factory that checks energy before the handler runs.
 * Extracts eventId from req.body.eventId or req.params.eventId.
 * 
 * On insufficient energy, returns 429 with energy info.
 * On success, attaches energy result to req for the handler to use.
 */
export function withEnergyCheck(featureKey: AiFeature) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const eventId = req.body?.eventId || req.params?.eventId;

    if (!eventId) {
      // No eventId = can't check energy, let handler deal with validation
      return next();
    }

    const deviceId = extractDeviceId(req);

    if (!deviceId) {
      // No device tracking = allow through (admin/booth scenario)
      return next();
    }

    try {
      // Feature gate: check package + host config + device before spending energy
      const gateResult = await isAiFeatureAllowed(eventId, featureKey);
      if (!gateResult.allowed) {
        return res.status(403).json({
          error: gateResult.reason === 'package'
            ? 'Feature nicht in deinem Paket verfügbar'
            : gateResult.reason === 'event_config'
            ? 'Feature vom Veranstalter deaktiviert'
            : 'Feature auf diesem Gerät nicht verfügbar',
          code: 'AI_FEATURE_NOT_AVAILABLE',
          reason: gateResult.reason,
        });
      }

      const result = await spendEnergy(eventId, deviceId, featureKey);

      if (!result.success) {
        return res.status(429).json({
          error: result.reason === 'cooldown'
            ? 'Cooldown aktiv — bitte warte einen Moment'
            : 'Nicht genug AI-Energie',
          code: 'INSUFFICIENT_ENERGY',
          energy: {
            cost: result.cost,
            currentBalance: result.newBalance,
            cooldownActive: result.cooldownActive || false,
            cooldownEndsAt: result.cooldownEndsAt || null,
            reason: result.reason,
          },
        });
      }

      // Attach energy info to request for handler to include in response
      (req as any)._energySpent = {
        cost: result.cost,
        newBalance: result.newBalance,
        deviceId,
      };

      next();
    } catch (error) {
      logger.error('Energy middleware error — allowing through', { eventId, deviceId, featureKey, error });
      // Fail-open: allow the request through on energy system errors
      next();
    }
  };
}
