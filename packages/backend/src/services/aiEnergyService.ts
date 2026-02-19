/**
 * AI Energy Service
 * 
 * Manages guest energy balances for AI feature usage.
 * Energy is earned through event participation (one-time per activity type)
 * and spent on AI features.
 * 
 * Key design decisions:
 * - Energy is tracked per deviceId (fingerprint + localStorage UUID)
 * - Rewards are one-time per activity type (no spam incentive)
 * - All values are configurable per event via EventAiConfig
 * - Soft limit: cooldown at 0 energy instead of hard block
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { AiFeature, AI_FEATURE_MAP } from './aiFeatureRegistry';

// ─── Types ──────────────────────────────────────────────────

export type EnergyRewardType =
  | 'event_join'
  | 'first_upload'
  | 'guestbook'
  | 'challenge'
  | 'survey'
  | 'social_share';

export type EnergyCostCategory =
  | 'llm_game'
  | 'image_effect'
  | 'style_transfer'
  | 'face_swap'
  | 'gif'
  | 'video'
  | 'trading_card';

export interface EnergyBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  rewardsClaimed: string[];
  cooldownActive: boolean;
  cooldownEndsAt: string | null;
  energyEnabled: boolean;
}

export interface EnergyConfig {
  startBalance: number;
  rewards: Record<EnergyRewardType, number>;
  costs: Record<EnergyCostCategory, number>;
  cooldownSeconds: number;
  enabled: boolean;
}

// ─── Map AI features to cost categories ──────────────────────

const FEATURE_TO_COST_CATEGORY: Record<string, EnergyCostCategory> = {
  // LLM Games → llm_game
  compliment_mirror: 'llm_game',
  fortune_teller: 'llm_game',
  ai_roast: 'llm_game',
  caption_suggest: 'llm_game',
  celebrity_lookalike: 'llm_game',
  ai_bingo: 'llm_game',
  ai_dj: 'llm_game',
  ai_meme: 'llm_game',
  ai_superlatives: 'llm_game',
  ai_photo_critic: 'llm_game',
  ai_couple_match: 'llm_game',
  // Image effects → image_effect
  ai_oldify: 'image_effect',
  ai_cartoon: 'image_effect',
  ai_style_pop: 'image_effect',
  time_machine: 'image_effect',
  pet_me: 'image_effect',
  yearbook: 'image_effect',
  emoji_me: 'image_effect',
  miniature: 'image_effect',
  bg_removal: 'image_effect',
  // Style transfer
  style_transfer: 'style_transfer',
  // Face swap
  face_switch: 'face_swap',
  // GIF/Video
  highlight_reel: 'video',
  // Trading card type
  drawbot: 'trading_card',
};

// Reward types that are truly one-time (not per-instance)
const ONE_TIME_REWARDS: EnergyRewardType[] = [
  'event_join',
  'first_upload',
  'guestbook',
  'social_share',
];

// Reward types that can be earned once per instance (e.g. per challenge)
const PER_INSTANCE_REWARDS: EnergyRewardType[] = [
  'challenge',
  'survey',
];

// ─── Core Functions ─────────────────────────────────────────

/**
 * Get the energy configuration for an event (from EventAiConfig or defaults).
 */
export async function getEnergyConfig(eventId: string): Promise<EnergyConfig> {
  const config = await prisma.eventAiConfig.findUnique({
    where: { eventId },
  });

  return {
    startBalance: config?.energyStartBalance ?? 10,
    rewards: {
      event_join: config?.energyStartBalance ?? 10,
      first_upload: config?.energyRewardFirstUpload ?? 5,
      guestbook: config?.energyRewardGuestbook ?? 3,
      challenge: config?.energyRewardChallenge ?? 3,
      survey: config?.energyRewardSurvey ?? 2,
      social_share: config?.energyRewardSocialShare ?? 2,
    },
    costs: {
      llm_game: config?.energyCostLlmGame ?? 1,
      image_effect: config?.energyCostImageEffect ?? 2,
      style_transfer: config?.energyCostStyleTransfer ?? 2,
      face_swap: config?.energyCostFaceSwap ?? 3,
      gif: config?.energyCostGif ?? 3,
      video: config?.energyCostVideo ?? 5,
      trading_card: config?.energyCostTradingCard ?? 2,
    },
    cooldownSeconds: config?.energyCooldownSeconds ?? 60,
    enabled: config?.energyEnabled ?? true,
  };
}

/**
 * Get or create the energy balance for a guest device on an event.
 * On first access, grants the start balance (event_join reward).
 */
export async function getOrCreateBalance(
  eventId: string,
  deviceId: string,
): Promise<EnergyBalance> {
  const energyConfig = await getEnergyConfig(eventId);

  if (!energyConfig.enabled) {
    return {
      balance: 9999,
      totalEarned: 0,
      totalSpent: 0,
      rewardsClaimed: [],
      cooldownActive: false,
      cooldownEndsAt: null,
      energyEnabled: false,
    };
  }

  let record = await prisma.guestEnergyBalance.findUnique({
    where: { eventId_deviceId: { eventId, deviceId } },
  });

  if (!record) {
    // First visit: create with start balance
    const startBalance = energyConfig.startBalance;
    record = await prisma.guestEnergyBalance.create({
      data: {
        eventId,
        deviceId,
        balance: startBalance,
        totalEarned: startBalance,
        totalSpent: 0,
        rewardsClaimed: ['event_join'],
      },
    });

    // Log the initial grant
    await prisma.guestEnergyLog.create({
      data: {
        eventId,
        deviceId,
        type: 'EARN',
        amount: startBalance,
        reason: 'event_join',
        balanceAfter: startBalance,
      },
    });

    logger.info('Guest energy initialized', { eventId, deviceId, startBalance });
  }

  // Check cooldown
  const cooldownInfo = await getCooldownStatus(eventId, deviceId, energyConfig.cooldownSeconds);

  return {
    balance: record.balance,
    totalEarned: record.totalEarned,
    totalSpent: record.totalSpent,
    rewardsClaimed: record.rewardsClaimed,
    cooldownActive: record.balance <= 0 && cooldownInfo.active,
    cooldownEndsAt: cooldownInfo.endsAt,
    energyEnabled: true,
  };
}

/**
 * Earn energy for a specific activity. Returns the new balance or null if already claimed.
 */
export async function earnEnergy(
  eventId: string,
  deviceId: string,
  rewardType: EnergyRewardType,
  instanceId?: string,
): Promise<{ earned: boolean; amount: number; newBalance: number; reason?: string }> {
  const energyConfig = await getEnergyConfig(eventId);

  if (!energyConfig.enabled) {
    return { earned: true, amount: 0, newBalance: 9999 };
  }

  const rewardAmount = energyConfig.rewards[rewardType];
  if (!rewardAmount || rewardAmount <= 0) {
    return { earned: false, amount: 0, newBalance: 0, reason: 'reward_disabled' };
  }

  // Build the reward key for deduplication
  const rewardKey = instanceId
    ? `${rewardType}:${instanceId}`
    : rewardType;

  // Check if one-time reward already claimed
  const record = await prisma.guestEnergyBalance.findUnique({
    where: { eventId_deviceId: { eventId, deviceId } },
  });

  if (!record) {
    // Auto-create balance first
    await getOrCreateBalance(eventId, deviceId);
    return earnEnergy(eventId, deviceId, rewardType, instanceId);
  }

  if (record.rewardsClaimed.includes(rewardKey)) {
    return {
      earned: false,
      amount: 0,
      newBalance: record.balance,
      reason: 'already_claimed',
    };
  }

  // For one-time rewards, check if any variant was claimed
  if (ONE_TIME_REWARDS.includes(rewardType) && record.rewardsClaimed.includes(rewardType)) {
    return {
      earned: false,
      amount: 0,
      newBalance: record.balance,
      reason: 'already_claimed',
    };
  }

  // Grant the reward
  const updated = await prisma.guestEnergyBalance.update({
    where: { eventId_deviceId: { eventId, deviceId } },
    data: {
      balance: { increment: rewardAmount },
      totalEarned: { increment: rewardAmount },
      rewardsClaimed: { push: rewardKey },
    },
  });

  await prisma.guestEnergyLog.create({
    data: {
      eventId,
      deviceId,
      type: 'EARN',
      amount: rewardAmount,
      reason: rewardKey,
      balanceAfter: updated.balance,
    },
  });

  logger.info('Guest earned energy', { eventId, deviceId, rewardType, rewardKey, amount: rewardAmount, newBalance: updated.balance });

  return {
    earned: true,
    amount: rewardAmount,
    newBalance: updated.balance,
  };
}

/**
 * Spend energy for an AI feature. Returns success/failure.
 * Uses optimistic locking (balance >= cost check in WHERE clause).
 */
export async function spendEnergy(
  eventId: string,
  deviceId: string,
  featureKey: AiFeature,
): Promise<{ success: boolean; cost: number; newBalance: number; cooldownActive?: boolean; cooldownEndsAt?: string | null; reason?: string }> {
  const energyConfig = await getEnergyConfig(eventId);

  if (!energyConfig.enabled) {
    return { success: true, cost: 0, newBalance: 9999 };
  }

  // Determine cost category for this feature
  const costCategory = FEATURE_TO_COST_CATEGORY[featureKey];
  if (!costCategory) {
    // Features without a cost category (e.g. face_search, hostTools) are free
    const def = AI_FEATURE_MAP[featureKey];
    if (def && (def.packageCategory === 'hostTools' || def.packageCategory === 'recognition')) {
      return { success: true, cost: 0, newBalance: 0 };
    }
    // Unknown feature — default to llm_game cost
    logger.warn('Unknown energy cost category for feature', { featureKey });
  }

  const cost = costCategory ? energyConfig.costs[costCategory] : energyConfig.costs.llm_game;

  // Ensure balance exists
  let record = await prisma.guestEnergyBalance.findUnique({
    where: { eventId_deviceId: { eventId, deviceId } },
  });

  if (!record) {
    await getOrCreateBalance(eventId, deviceId);
    record = await prisma.guestEnergyBalance.findUnique({
      where: { eventId_deviceId: { eventId, deviceId } },
    });
  }

  if (!record) {
    return { success: false, cost, newBalance: 0, reason: 'no_balance' };
  }

  // Check if in cooldown (balance was 0 and last spend was recent)
  if (record.balance <= 0) {
    const cooldownInfo = await getCooldownStatus(eventId, deviceId, energyConfig.cooldownSeconds);
    if (cooldownInfo.active) {
      return {
        success: false,
        cost,
        newBalance: 0,
        cooldownActive: true,
        cooldownEndsAt: cooldownInfo.endsAt,
        reason: 'cooldown',
      };
    }
    // Cooldown expired but balance is still 0 — still can't spend
    return {
      success: false,
      cost,
      newBalance: 0,
      reason: 'insufficient_energy',
    };
  }

  if (record.balance < cost) {
    return {
      success: false,
      cost,
      newBalance: record.balance,
      reason: 'insufficient_energy',
    };
  }

  // Deduct energy (optimistic: only if balance still sufficient)
  try {
    const updated = await prisma.guestEnergyBalance.updateMany({
      where: {
        eventId,
        deviceId,
        balance: { gte: cost },
      },
      data: {
        balance: { decrement: cost },
        totalSpent: { increment: cost },
      },
    });

    if (updated.count === 0) {
      return { success: false, cost, newBalance: record.balance, reason: 'race_condition' };
    }

    // Re-read for actual balance
    const finalRecord = await prisma.guestEnergyBalance.findUnique({
      where: { eventId_deviceId: { eventId, deviceId } },
    });

    const newBalance = finalRecord?.balance ?? 0;

    await prisma.guestEnergyLog.create({
      data: {
        eventId,
        deviceId,
        type: 'SPEND',
        amount: cost,
        reason: `ai_feature`,
        featureKey,
        balanceAfter: newBalance,
      },
    });

    logger.info('Guest spent energy', { eventId, deviceId, featureKey, cost, newBalance });

    return { success: true, cost, newBalance };
  } catch (error) {
    logger.error('Failed to spend energy', { eventId, deviceId, featureKey, error });
    return { success: false, cost, newBalance: record.balance, reason: 'db_error' };
  }
}

/**
 * Admin adjustment: set or modify energy balance directly.
 */
export async function adminAdjustEnergy(
  eventId: string,
  deviceId: string,
  amount: number,
  reason: string,
): Promise<{ newBalance: number }> {
  const record = await prisma.guestEnergyBalance.upsert({
    where: { eventId_deviceId: { eventId, deviceId } },
    create: {
      eventId,
      deviceId,
      balance: Math.max(0, amount),
      totalEarned: amount > 0 ? amount : 0,
      totalSpent: 0,
      rewardsClaimed: [],
    },
    update: {
      balance: { increment: amount },
    },
  });

  // Ensure balance doesn't go below 0
  if (record.balance < 0) {
    await prisma.guestEnergyBalance.update({
      where: { eventId_deviceId: { eventId, deviceId } },
      data: { balance: 0 },
    });
  }

  const finalBalance = Math.max(0, record.balance);

  await prisma.guestEnergyLog.create({
    data: {
      eventId,
      deviceId,
      type: 'ADMIN_ADJUST',
      amount,
      reason,
      balanceAfter: finalBalance,
    },
  });

  logger.info('Admin adjusted energy', { eventId, deviceId, amount, reason, newBalance: finalBalance });

  return { newBalance: finalBalance };
}

/**
 * Get energy stats for an event (admin view).
 */
export async function getEventEnergyStats(eventId: string) {
  const [balances, logs] = await Promise.all([
    prisma.guestEnergyBalance.findMany({
      where: { eventId },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.guestEnergyLog.groupBy({
      by: ['type'],
      where: { eventId },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalGuests = balances.length;
  const totalEarned = logs.find(l => l.type === 'EARN')?._sum.amount ?? 0;
  const totalSpent = logs.find(l => l.type === 'SPEND')?._sum.amount ?? 0;
  const totalTransactions = logs.reduce((acc, l) => acc + l._count, 0);

  return {
    totalGuests,
    totalEarned,
    totalSpent,
    totalTransactions,
    averageBalance: totalGuests > 0
      ? Math.round(balances.reduce((sum, b) => sum + b.balance, 0) / totalGuests)
      : 0,
    guestsAtZero: balances.filter(b => b.balance <= 0).length,
  };
}

/**
 * Get system-wide energy stats (admin dashboard).
 */
export async function getSystemEnergyStats() {
  const [balanceAgg, logAgg, activeEvents] = await Promise.all([
    prisma.guestEnergyBalance.aggregate({
      _count: true,
      _sum: { balance: true, totalEarned: true, totalSpent: true },
    }),
    prisma.guestEnergyLog.groupBy({
      by: ['reason'],
      _sum: { amount: true },
      _count: true,
      where: { type: 'SPEND' },
    }),
    prisma.guestEnergyBalance.groupBy({
      by: ['eventId'],
      _count: true,
    }),
  ]);

  return {
    totalGuests: balanceAgg._count,
    totalEnergyEarned: balanceAgg._sum.totalEarned ?? 0,
    totalEnergySpent: balanceAgg._sum.totalSpent ?? 0,
    totalBalanceRemaining: balanceAgg._sum.balance ?? 0,
    activeEventsWithEnergy: activeEvents.length,
    spendByReason: logAgg.map(l => ({
      reason: l.reason,
      totalSpent: l._sum.amount ?? 0,
      count: l._count,
    })),
  };
}

// ─── Helpers ────────────────────────────────────────────────

async function getCooldownStatus(
  eventId: string,
  deviceId: string,
  cooldownSeconds: number,
): Promise<{ active: boolean; endsAt: string | null }> {
  if (cooldownSeconds <= 0) {
    return { active: false, endsAt: null };
  }

  // Find the last SPEND log for this guest
  const lastSpend = await prisma.guestEnergyLog.findFirst({
    where: {
      eventId,
      deviceId,
      type: 'SPEND',
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  if (!lastSpend) {
    return { active: false, endsAt: null };
  }

  const cooldownEnd = new Date(lastSpend.createdAt.getTime() + cooldownSeconds * 1000);
  const now = new Date();

  if (now < cooldownEnd) {
    return { active: true, endsAt: cooldownEnd.toISOString() };
  }

  return { active: false, endsAt: null };
}

/**
 * Get the energy cost for a specific AI feature based on event config.
 */
export async function getFeatureEnergyCost(
  eventId: string,
  featureKey: AiFeature,
): Promise<number> {
  const energyConfig = await getEnergyConfig(eventId);

  if (!energyConfig.enabled) return 0;

  const costCategory = FEATURE_TO_COST_CATEGORY[featureKey];
  if (!costCategory) {
    const def = AI_FEATURE_MAP[featureKey];
    if (def && (def.packageCategory === 'hostTools' || def.packageCategory === 'recognition')) {
      return 0;
    }
    return energyConfig.costs.llm_game;
  }

  return energyConfig.costs[costCategory];
}
