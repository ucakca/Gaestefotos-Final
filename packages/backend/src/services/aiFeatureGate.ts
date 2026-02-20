/**
 * AI Feature Gate — 3-Level Access Control
 * 
 * Combines:
 * 1. Package (what's paid for?) → PackageDefinition AI category flags
 * 2. Event Config (what does the host want?) → EventAiConfig.disabledFeatures
 * 3. Device Context (where is it running?) → AiFeatureRegistry.allowedDevices
 * 
 * A feature is ACTIVE only when ALL 3 levels say "yes".
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { cacheGet, cacheSet } from './cache/redis';
import {
  AiFeature,
  AiFeatureDefinition,
  DeviceType,
  AiPackageCategory,
  AI_FEATURE_REGISTRY,
  AI_FEATURE_MAP,
  PACKAGE_CATEGORY_TO_FEATURE_KEY,
  isFeatureAllowedOnDevice,
} from './aiFeatureRegistry';
import { getEventPackageDefinition, type FeatureKey } from './featureGate';

// ─── Types ──────────────────────────────────────────────────

export interface AiFeatureAccess {
  key: AiFeature;
  label: string;
  description: string;
  allowed: boolean;
  reason?: 'package' | 'event_config' | 'device' | 'disabled';
  creditCost: number;
  category: string;
  packageCategory: AiPackageCategory;
  // UI metadata for dynamic frontend rendering
  emoji?: string;
  gradient?: string;
  guestDescription?: string;
  endpoint?: string;
  uiGroup?: string;
  inputFlow?: string;
  energyCostCategory?: string;
  sortOrder?: number;
}

export interface AiFeatureGateResult {
  features: AiFeatureAccess[];
  allowedFeatures: AiFeature[];
  limits: {
    maxAiCreditsPerEvent: number | null;
    maxAiPlaysPerGuest: number | null;
  };
  deviceType: DeviceType;
}

// ─── Core Gate Function ─────────────────────────────────────

/**
 * Returns all AI features with their access status for a given event + device.
 */
export async function getAiFeatureGate(
  eventId: string,
  deviceType: DeviceType = 'guest_app',
): Promise<AiFeatureGateResult> {
  // Redis cache: avoid repeated DB queries for the same event+device
  const cacheKey = `event:${eventId}:ai-gate:${deviceType}`;
  const cached = await cacheGet<AiFeatureGateResult>(cacheKey);
  if (cached) return cached;

  // 1. Load package definition
  const { pkg } = await getEventPackageDefinition(eventId);

  // 2. Load EventAiConfig (host overrides)
  let disabledFeatures: string[] = [];
  let boothPreset: Record<string, string[]> | null = null;
  try {
    const aiConfig = await prisma.eventAiConfig.findUnique({
      where: { eventId },
    });
    if (aiConfig) {
      disabledFeatures = aiConfig.disabledFeatures || [];
      boothPreset = aiConfig.boothPreset as Record<string, string[]> | null;
    }
  } catch (err) {
    logger.warn('Failed to load EventAiConfig', { eventId, error: err });
  }

  // 3. Evaluate each feature
  const features: AiFeatureAccess[] = AI_FEATURE_REGISTRY.map((def) => {
    // Level 1a: Package allows the category?
    const categoryField = PACKAGE_CATEGORY_TO_FEATURE_KEY[def.packageCategory] as string;
    const packageCategoryAllowed = pkg ? (pkg as any)[categoryField] === true : isFreeTierAllowed(def.packageCategory);
    // Level 1b: Package hasn't explicitly disabled this individual feature?
    const pkgDisabledFeatures: string[] = (pkg as any)?.disabledAiFeatures || [];
    const packageFeatureAllowed = !pkgDisabledFeatures.includes(def.key);
    const packageAllowed = packageCategoryAllowed && packageFeatureAllowed;

    // Level 2: Host hasn't disabled this feature?
    const hostAllowed = !disabledFeatures.includes(def.key);

    // Level 3: Device supports this feature?
    let deviceAllowed = isFeatureAllowedOnDevice(def.key, deviceType);

    // Booth preset override: if host configured specific features for this device
    if (boothPreset && boothPreset[deviceType]) {
      const preset = boothPreset[deviceType];
      if (preset.includes('all')) {
        deviceAllowed = true;
      } else {
        deviceAllowed = preset.includes(def.key);
      }
    }

    const allowed = packageAllowed && hostAllowed && deviceAllowed;
    let reason: AiFeatureAccess['reason'] | undefined;
    if (!allowed) {
      if (!packageAllowed) reason = 'package';
      else if (!hostAllowed) reason = 'event_config';
      else if (!deviceAllowed) reason = 'device';
    }

    return {
      key: def.key,
      label: def.label,
      description: def.description,
      allowed,
      reason,
      creditCost: def.creditCost,
      category: def.category,
      packageCategory: def.packageCategory,
      // UI metadata
      emoji: def.emoji,
      gradient: def.gradient,
      guestDescription: def.guestDescription,
      endpoint: def.endpoint,
      uiGroup: def.uiGroup,
      inputFlow: def.inputFlow,
      energyCostCategory: def.energyCostCategory,
      sortOrder: def.sortOrder,
    };
  });

  const allowedFeatures = features.filter(f => f.allowed).map(f => f.key);

  // Limits
  const maxAiCreditsPerEvent = pkg ? ((pkg as any).maxAiCreditsPerEvent ?? null) : 0;
  const maxAiPlaysPerGuest = pkg ? ((pkg as any).maxAiPlaysPerGuest ?? null) : 3;

  const result: AiFeatureGateResult = {
    features,
    allowedFeatures,
    limits: { maxAiCreditsPerEvent, maxAiPlaysPerGuest },
    deviceType,
  };

  // Cache for 30 seconds — balances freshness vs DB load
  await cacheSet(cacheKey, result, 30);

  return result;
}

/**
 * Check if a single AI feature is allowed for the given context.
 */
export async function isAiFeatureAllowed(
  eventId: string,
  feature: AiFeature,
  deviceType: DeviceType = 'guest_app',
): Promise<{ allowed: boolean; reason?: string }> {
  const gate = await getAiFeatureGate(eventId, deviceType);
  const featureAccess = gate.features.find(f => f.key === feature);

  if (!featureAccess) {
    return { allowed: false, reason: 'unknown_feature' };
  }

  return {
    allowed: featureAccess.allowed,
    reason: featureAccess.reason,
  };
}

/**
 * Assert that an AI feature is allowed, throw error if not.
 */
export async function assertAiFeatureAllowed(
  eventId: string,
  feature: AiFeature,
  deviceType: DeviceType = 'guest_app',
): Promise<void> {
  const { allowed, reason } = await isAiFeatureAllowed(eventId, feature, deviceType);

  if (!allowed) {
    const def = AI_FEATURE_MAP[feature];
    const label = def?.label || feature;

    const messages: Record<string, string> = {
      package: `"${label}" ist in deinem aktuellen Paket nicht verfügbar. Upgrade für dieses Feature.`,
      event_config: `"${label}" wurde vom Veranstalter deaktiviert.`,
      device: `"${label}" ist auf diesem Gerätetyp nicht verfügbar.`,
      unknown_feature: `Unbekanntes AI-Feature: "${feature}"`,
    };

    const err: any = new Error(messages[reason || 'package'] || messages.package);
    err.code = 'AI_FEATURE_NOT_AVAILABLE';
    err.httpStatus = 403;
    err.details = { eventId, feature, deviceType, reason };
    throw err;
  }
}

// ─── Helpers ────────────────────────────────────────────────

function isFreeTierAllowed(category: AiPackageCategory): boolean {
  // Free tier: games + hostTools are always on, everything else off
  return category === 'games' || category === 'hostTools' || category === 'recognition';
}
