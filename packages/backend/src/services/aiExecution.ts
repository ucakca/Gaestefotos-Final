/**
 * AI Execution Service
 * 
 * Verbindet AI Provider mit Workflow Steps und dem Credit-System.
 * Jeder AI-Call wird:
 * 1. Feature-Flag geprüft
 * 2. Credits abgezogen
 * 3. Provider + API Key aufgelöst
 * 4. API aufgerufen
 * 5. Usage geloggt
 */

import prisma from '../config/database';
import { decryptValue } from '../utils/encryption';
import { logger } from '../utils/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AiFeature = 
  | 'face_switch'
  | 'bg_removal'
  | 'ai_oldify'
  | 'ai_cartoon'
  | 'ai_style_pop'
  | 'style_transfer'
  | 'drawbot'
  | 'highlight_reel'
  | 'compliment_mirror'
  | 'chat'
  | 'album_suggest'
  | 'description_suggest'
  | 'invitation_suggest'
  | 'challenge_suggest'
  | 'guestbook_suggest'
  | 'color_scheme'
  | 'face_search';

// Credit costs per AI feature
export const AI_CREDIT_COSTS: Record<AiFeature, number> = {
  face_switch: 5,
  bg_removal: 3,
  ai_oldify: 4,
  ai_cartoon: 4,
  ai_style_pop: 4,
  style_transfer: 5,
  drawbot: 8,
  highlight_reel: 10,
  compliment_mirror: 2,
  chat: 1,
  album_suggest: 1,
  description_suggest: 1,
  invitation_suggest: 1,
  challenge_suggest: 1,
  guestbook_suggest: 1,
  color_scheme: 1,
  face_search: 0, // free
};

export interface ResolvedProvider {
  id: string;
  slug: string;
  name: string;
  type: string;
  apiKey: string;
  baseUrl: string | null;
  model: string | null;
  config: any;
}

// ─── Provider Resolution ────────────────────────────────────────────────────

/**
 * Resolve which AI provider to use for a given feature.
 * Looks up AiFeatureMapping first, falls back to default provider for the type.
 */
export async function resolveProvider(feature: AiFeature): Promise<ResolvedProvider | null> {
  // 1. Check feature mapping
  const mapping = await prisma.aiFeatureMapping.findUnique({
    where: { feature },
    include: { provider: true },
  });

  let provider: any = null;
  let model: string | null = null;

  if (mapping && mapping.isEnabled && mapping.provider.isActive) {
    provider = mapping.provider;
    model = mapping.model || provider.defaultModel;
  } else {
    // 2. Fall back to default provider for the expected type
    const expectedType = getExpectedProviderType(feature);
    provider = await prisma.aiProvider.findFirst({
      where: { type: expectedType as any, isActive: true, isDefault: true },
    });
    if (!provider) {
      // 3. Any active provider of that type
      provider = await prisma.aiProvider.findFirst({
        where: { type: expectedType as any, isActive: true },
      });
    }
    model = provider?.defaultModel || null;
  }

  if (!provider) {
    logger.warn(`No AI provider found for feature: ${feature}`);
    return null;
  }

  if (!provider.apiKeyEncrypted || !provider.apiKeyIv || !provider.apiKeyTag) {
    logger.warn(`AI provider ${provider.slug} has no API key configured`);
    return null;
  }

  const apiKey = decryptValue({
    encrypted: provider.apiKeyEncrypted,
    iv: provider.apiKeyIv,
    tag: provider.apiKeyTag,
  });

  return {
    id: provider.id,
    slug: provider.slug,
    name: provider.name,
    type: provider.type,
    apiKey,
    baseUrl: provider.baseUrl,
    model,
    config: provider.config,
  };
}

function getExpectedProviderType(feature: AiFeature): string {
  const typeMap: Record<AiFeature, string> = {
    face_switch: 'IMAGE_GEN',
    bg_removal: 'IMAGE_GEN',
    ai_oldify: 'IMAGE_GEN',
    ai_cartoon: 'IMAGE_GEN',
    ai_style_pop: 'IMAGE_GEN',
    style_transfer: 'IMAGE_GEN',
    drawbot: 'IMAGE_GEN',
    highlight_reel: 'VIDEO_GEN',
    compliment_mirror: 'LLM',
    chat: 'LLM',
    album_suggest: 'LLM',
    description_suggest: 'LLM',
    invitation_suggest: 'LLM',
    challenge_suggest: 'LLM',
    guestbook_suggest: 'LLM',
    color_scheme: 'LLM',
    face_search: 'FACE_RECOGNITION',
  };
  return typeMap[feature] || 'LLM';
}

// ─── Credit Management ──────────────────────────────────────────────────────

/**
 * Get or create credit balance for a user
 */
export async function getOrCreateCreditBalance(userId: string) {
  let balance = await prisma.creditBalance.findUnique({ where: { userId } });
  if (!balance) {
    balance = await prisma.creditBalance.create({
      data: { userId, balance: 0 },
    });
  }
  return balance;
}

/**
 * Check if user has enough credits for a feature
 */
export async function hasEnoughCredits(userId: string, feature: AiFeature): Promise<boolean> {
  const cost = AI_CREDIT_COSTS[feature];
  if (cost === 0) return true;
  
  const balance = await getOrCreateCreditBalance(userId);
  return balance.balance >= cost;
}

/**
 * Consume credits for an AI feature execution
 */
export async function consumeCredits(
  userId: string,
  feature: AiFeature,
  eventId?: string,
): Promise<{ success: boolean; remainingBalance: number; error?: string }> {
  const cost = AI_CREDIT_COSTS[feature];
  if (cost === 0) {
    const balance = await getOrCreateCreditBalance(userId);
    return { success: true, remainingBalance: balance.balance };
  }

  const balance = await getOrCreateCreditBalance(userId);

  if (balance.balance < cost) {
    return {
      success: false,
      remainingBalance: balance.balance,
      error: `Nicht genügend Credits. Benötigt: ${cost}, Verfügbar: ${balance.balance}`,
    };
  }

  // Atomic update: only decrement if balance is still sufficient (prevents race condition)
  const rowsAffected = await prisma.$executeRaw`
    UPDATE "credit_balances"
    SET "balance" = "balance" - ${cost},
        "totalConsumed" = "totalConsumed" + ${cost},
        "updatedAt" = NOW()
    WHERE "userId" = ${userId}
      AND "balance" >= ${cost}
  `;

  if (rowsAffected === 0) {
    // Another concurrent request consumed the credits first
    const refreshed = await getOrCreateCreditBalance(userId);
    return {
      success: false,
      remainingBalance: refreshed.balance,
      error: `Nicht genügend Credits. Benötigt: ${cost}, Verfügbar: ${refreshed.balance}`,
    };
  }

  const updated = await prisma.creditBalance.findUnique({ where: { userId } });
  const remainingBalance = updated?.balance ?? 0;

  await prisma.creditTransaction.create({
    data: {
      balanceId: balance.id,
      type: 'CONSUME',
      amount: -cost,
      feature,
      eventId,
      description: `AI Feature: ${feature} (-${cost} Credits)`,
    },
  });

  logger.info('Credits consumed', { userId, feature, cost, remaining: remainingBalance });

  // Fire-and-forget: check auto-recharge after consumption
  checkAutoRecharge(userId, remainingBalance).catch(err =>
    logger.warn('Auto-recharge check failed', { userId, error: err })
  );

  return { success: true, remainingBalance };
}

/**
 * Check if auto-recharge should fire and execute it
 * Called asynchronously after credit consumption
 */
async function checkAutoRecharge(userId: string, currentBalance: number): Promise<void> {
  const creditBalance = await prisma.creditBalance.findUnique({ where: { userId } });
  if (!creditBalance) return;

  if (!creditBalance.autoRecharge) return;
  if (currentBalance > creditBalance.autoRechargeThreshold) return;

  const rechargeAmount = creditBalance.autoRechargeAmount;
  if (rechargeAmount <= 0) return;

  // Prevent duplicate auto-recharge within 60 seconds
  const recentRecharge = await prisma.creditTransaction.findFirst({
    where: {
      balanceId: creditBalance.id,
      type: 'AUTO_RECHARGE',
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recentRecharge) {
    logger.debug('Auto-recharge skipped (cooldown)', { userId });
    return;
  }

  await addCredits(
    userId,
    rechargeAmount,
    'AUTO_RECHARGE',
    `Auto-Recharge: +${rechargeAmount} Credits (Schwellwert: ${creditBalance.autoRechargeThreshold})`,
  );

  logger.info('Auto-recharge executed', {
    userId,
    amount: rechargeAmount,
    threshold: creditBalance.autoRechargeThreshold,
    previousBalance: currentBalance,
  });
}

/**
 * Add credits to user balance (purchase, bonus, etc.)
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: 'PURCHASE' | 'BONUS' | 'REFUND' | 'AUTO_RECHARGE',
  description: string,
  stripePaymentId?: string,
): Promise<{ balance: number }> {
  const creditBalance = await getOrCreateCreditBalance(userId);
  
  const updated = await prisma.creditBalance.update({
    where: { userId },
    data: {
      balance: { increment: amount },
      totalPurchased: type === 'PURCHASE' || type === 'AUTO_RECHARGE' 
        ? { increment: amount } 
        : undefined,
    },
  });

  await prisma.creditTransaction.create({
    data: {
      balanceId: creditBalance.id,
      type,
      amount,
      description,
      stripePaymentId,
    },
  });

  logger.info('Credits added', { userId, amount, type, newBalance: updated.balance });

  return { balance: updated.balance };
}

// ─── AI Execution with Full Pipeline ────────────────────────────────────────

/**
 * Execute an AI feature with full pipeline:
 * 1. Resolve provider
 * 2. Check & consume credits
 * 3. Log usage
 * Returns the resolved provider for the caller to make the actual API call.
 */
export async function prepareAiExecution(
  userId: string,
  feature: AiFeature,
  eventId?: string,
): Promise<{
  success: boolean;
  provider?: ResolvedProvider;
  error?: string;
  creditCost: number;
}> {
  const creditCost = AI_CREDIT_COSTS[feature];

  // 1. Resolve provider
  const provider = await resolveProvider(feature);
  if (!provider) {
    return {
      success: false,
      error: `Kein AI-Provider für Feature "${feature}" konfiguriert. Bitte im Admin-Dashboard unter AI Provider einrichten.`,
      creditCost,
    };
  }

  // 2. Check & consume credits
  if (creditCost > 0) {
    const creditResult = await consumeCredits(userId, feature, eventId);
    if (!creditResult.success) {
      return {
        success: false,
        error: creditResult.error,
        creditCost,
      };
    }
  }

  return { success: true, provider, creditCost };
}

/**
 * Log AI usage after execution completes
 */
export async function logAiUsage(
  providerId: string,
  feature: string,
  opts: {
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    costCents?: number;
    durationMs: number;
    success: boolean;
    errorMessage?: string;
  },
): Promise<void> {
  try {
    await prisma.aiUsageLog.create({
      data: {
        providerId,
        feature,
        model: opts.model,
        inputTokens: opts.inputTokens,
        outputTokens: opts.outputTokens,
        totalTokens: opts.totalTokens,
        costCents: opts.costCents,
        durationMs: opts.durationMs,
        success: opts.success,
        errorMessage: opts.errorMessage,
      },
    });
  } catch (err) {
    logger.error('Failed to log AI usage', { err, providerId, feature });
  }
}

// ─── Workflow Step → AI Feature Mapping ─────────────────────────────────────

/**
 * Map a workflow step type to its corresponding AI feature.
 * Returns null if the step type doesn't use AI.
 */
export function workflowStepToAiFeature(stepType: string): AiFeature | null {
  const mapping: Record<string, AiFeature> = {
    'AI_MODIFY': 'style_transfer',
    'AI_FACE_SWITCH': 'face_switch',
    'AI_BG_REMOVAL': 'bg_removal',
    'AI_OLDIFY': 'ai_oldify',
    'AI_CARTOON': 'ai_cartoon',
    'AI_STYLE_POP': 'ai_style_pop',
    'FACE_SEARCH': 'face_search',
    'COMPLIMENT': 'compliment_mirror',
  };
  return mapping[stepType] || null;
}

/**
 * Get all available AI features with their providers and credit costs
 */
export async function getAiFeatureStatus(): Promise<Array<{
  feature: AiFeature;
  creditCost: number;
  providerType: string;
  hasProvider: boolean;
  providerName: string | null;
  isEnabled: boolean;
}>> {
  const features = Object.keys(AI_CREDIT_COSTS) as AiFeature[];
  const mappings = await prisma.aiFeatureMapping.findMany({
    include: { provider: { select: { name: true, isActive: true } } },
  });

  return features.map(feature => {
    const mapping = mappings.find(m => m.feature === feature);
    return {
      feature,
      creditCost: AI_CREDIT_COSTS[feature],
      providerType: getExpectedProviderType(feature),
      hasProvider: !!(mapping && mapping.provider.isActive),
      providerName: mapping?.provider.name || null,
      isEnabled: mapping?.isEnabled ?? false,
    };
  });
}
