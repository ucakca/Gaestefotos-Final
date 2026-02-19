/**
 * AI Cost Calculator
 * 
 * Berechnet echte API-Kosten basierend auf Provider, Modell und Token-Verbrauch.
 * Preise werden regelmäßig aus öffentlichen Pricing-Seiten aktualisiert.
 * Stand: Februar 2026
 */

// Preise in USD pro 1M Tokens (input / output)
// oder pro Sekunde/Request für Bild-APIs
export const MODEL_PRICING: Record<string, { inputPer1M?: number; outputPer1M?: number; perSecond?: number; perRequest?: number }> = {
  // OpenAI
  'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'gpt-4-turbo': { inputPer1M: 10.00, outputPer1M: 30.00 },
  'gpt-4': { inputPer1M: 30.00, outputPer1M: 60.00 },
  'gpt-3.5-turbo': { inputPer1M: 0.50, outputPer1M: 1.50 },
  
  // Anthropic Claude
  'claude-3-5-sonnet': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'claude-3-opus': { inputPer1M: 15.00, outputPer1M: 75.00 },
  'claude-3-haiku': { inputPer1M: 0.25, outputPer1M: 1.25 },
  
  // Replicate (per second of compute)
  'replicate-sdxl': { perSecond: 0.00115 },
  'replicate-flux': { perSecond: 0.00115 },
  'replicate-face-swap': { perSecond: 0.00115 },
  'replicate-default': { perSecond: 0.00115 },
  
  // Stability AI
  'stability-sd3': { perRequest: 0.035 },
  'stability-sdxl': { perRequest: 0.002 },
  'stability-core': { perRequest: 0.03 },
  
  // FAL.ai
  'fal-flux-pro': { perRequest: 0.05 },
  'fal-flux-schnell': { perRequest: 0.003 },
  'fal-sdxl': { perRequest: 0.002 },
  
  // Default fallback
  'default': { inputPer1M: 1.00, outputPer1M: 2.00, perRequest: 0.01 },
};

export interface CostCalculationInput {
  provider: string;       // 'openai', 'replicate', 'stability', 'fal', 'anthropic'
  model?: string;         // 'gpt-4o-mini', 'sdxl', etc.
  inputTokens?: number;
  outputTokens?: number;
  durationSeconds?: number;
  requestCount?: number;  // Usually 1
}

export interface CostCalculationResult {
  costUsd: number;
  costCents: number;
  breakdown: string;
  pricingModel: 'token' | 'time' | 'request';
}

/**
 * Berechnet die Kosten eines AI-API-Calls
 */
export function calculateAiCost(input: CostCalculationInput): CostCalculationResult {
  const { provider, model, inputTokens, outputTokens, durationSeconds, requestCount = 1 } = input;
  
  // Find pricing for this model
  const modelKey = model?.toLowerCase() || 'default';
  const providerKey = `${provider.toLowerCase()}-${modelKey}`;
  
  const pricing = MODEL_PRICING[modelKey] 
    || MODEL_PRICING[providerKey] 
    || MODEL_PRICING[`${provider.toLowerCase()}-default`]
    || MODEL_PRICING['default'];

  let costUsd = 0;
  let breakdown = '';
  let pricingModel: 'token' | 'time' | 'request' = 'request';

  // Token-based pricing (LLMs)
  if (pricing.inputPer1M && (inputTokens || outputTokens)) {
    pricingModel = 'token';
    const inputCost = (inputTokens || 0) * (pricing.inputPer1M / 1_000_000);
    const outputCost = (outputTokens || 0) * ((pricing.outputPer1M || pricing.inputPer1M) / 1_000_000);
    costUsd = inputCost + outputCost;
    breakdown = `${inputTokens || 0} in + ${outputTokens || 0} out tokens @ ${modelKey}`;
  }
  // Time-based pricing (Replicate)
  else if (pricing.perSecond && durationSeconds) {
    pricingModel = 'time';
    costUsd = durationSeconds * pricing.perSecond;
    breakdown = `${durationSeconds.toFixed(2)}s @ $${pricing.perSecond}/s`;
  }
  // Request-based pricing (Stability, FAL)
  else if (pricing.perRequest) {
    pricingModel = 'request';
    costUsd = requestCount * pricing.perRequest;
    breakdown = `${requestCount} request(s) @ $${pricing.perRequest}/req`;
  }
  // Fallback
  else {
    costUsd = 0.01 * requestCount;
    breakdown = 'fallback estimate';
  }

  return {
    costUsd,
    costCents: costUsd * 100,
    breakdown,
    pricingModel,
  };
}

/**
 * Hilfsfunktion: Berechnet empfohlene Energiekosten basierend auf USD-Kosten
 * 
 * Annahme: 1 Energie-Punkt = ca. 0.002 USD (0.2 Cent)
 * Mit 20% Marge für Overhead/Profit
 */
export function calculateRecommendedEnergyCost(avgCostUsd: number): number {
  const ENERGY_TO_USD = 0.002; // 1⚡ = 0.2 Cent
  const MARGIN = 1.2; // 20% Marge
  
  const rawEnergy = (avgCostUsd / ENERGY_TO_USD) * MARGIN;
  
  // Runde auf ganze Zahlen, mindestens 1
  return Math.max(1, Math.round(rawEnergy));
}

/**
 * Bewertet ob ein eingestellter Energiepreis angemessen ist
 */
export function evaluateEnergyCost(
  configuredEnergy: number,
  avgCostUsd: number,
): { status: 'recommended' | 'too_high' | 'too_low' | 'unknown'; message: string } {
  if (avgCostUsd === 0) {
    return { status: 'unknown', message: 'Keine Daten' };
  }
  
  const recommended = calculateRecommendedEnergyCost(avgCostUsd);
  const ratio = configuredEnergy / recommended;
  
  if (ratio >= 0.8 && ratio <= 1.5) {
    return { status: 'recommended', message: `Empfohlen: ${recommended}⚡` };
  } else if (ratio > 1.5) {
    return { status: 'too_high', message: `Zu hoch! Empfohlen: ${recommended}⚡` };
  } else {
    return { status: 'too_low', message: `Zu niedrig! Empfohlen: ${recommended}⚡ (Verlust!)` };
  }
}
