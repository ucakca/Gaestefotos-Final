/**
 * Unified LLM Client
 * 
 * Supports multiple OpenAI-compatible providers:
 * - Groq  (https://api.groq.com/openai/v1)
 * - Grok / xAI (https://api.x.ai/v1)
 * - OpenAI (https://api.openai.com/v1)
 * - Any generic OpenAI-compatible endpoint
 * 
 * All providers use the standard OpenAI chat completions format,
 * so a single fetch-based implementation covers them all.
 */

import { logger } from '../utils/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export type LLMProviderType = 'groq' | 'grok' | 'openai' | 'generic';

export interface LLMConfig {
  provider: LLMProviderType;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProviderType;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ─── Provider Defaults ──────────────────────────────────────────────────────

const PROVIDER_DEFAULTS: Record<LLMProviderType, { baseUrl: string; model: string }> = {
  groq:    { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.1-70b-versatile' },
  grok:    { baseUrl: 'https://api.x.ai/v1',            model: 'grok-2-latest' },
  openai:  { baseUrl: 'https://api.openai.com/v1',      model: 'gpt-4o-mini' },
  generic: { baseUrl: '',                                model: '' },
};

// ─── Provider Detection ─────────────────────────────────────────────────────

/**
 * Detect the LLM provider type from a slug string.
 */
export function detectProvider(slug: string): LLMProviderType {
  const s = slug.toLowerCase();
  if (s.includes('grok') || s.includes('xai') || s.includes('x-ai')) return 'grok';
  if (s.includes('groq')) return 'groq';
  if (s.includes('openai') || s.includes('gpt')) return 'openai';
  return 'generic';
}

/**
 * Resolve the default LLM config from environment variables.
 * Priority: XAI_API_KEY (Grok) → GROQ_API_KEY → OPENAI_API_KEY
 */
export function getDefaultConfig(): LLMConfig {
  if (process.env.XAI_API_KEY) {
    return {
      provider: 'grok',
      apiKey: process.env.XAI_API_KEY,
      baseUrl: process.env.XAI_BASE_URL || PROVIDER_DEFAULTS.grok.baseUrl,
      model: process.env.XAI_MODEL || PROVIDER_DEFAULTS.grok.model,
    };
  }
  if (process.env.GROQ_API_KEY) {
    return {
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: PROVIDER_DEFAULTS.groq.baseUrl,
      model: process.env.GROQ_MODEL || PROVIDER_DEFAULTS.groq.model,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || PROVIDER_DEFAULTS.openai.baseUrl,
      model: process.env.OPENAI_MODEL || PROVIDER_DEFAULTS.openai.model,
    };
  }
  // Fallback: empty Groq config (will fail gracefully)
  return {
    provider: 'groq',
    apiKey: '',
    baseUrl: PROVIDER_DEFAULTS.groq.baseUrl,
    model: PROVIDER_DEFAULTS.groq.model,
  };
}

/**
 * Build an LLMConfig from a resolved AI provider (from DB).
 */
export function configFromProvider(provider: {
  slug: string;
  apiKey: string;
  baseUrl: string | null;
  model: string | null;
  config: any;
}): LLMConfig {
  const type = detectProvider(provider.slug);
  const defaults = PROVIDER_DEFAULTS[type];
  return {
    provider: type,
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl || defaults.baseUrl,
    model: provider.model || provider.config?.model || defaults.model,
  };
}

// ─── Core API Call ──────────────────────────────────────────────────────────

/**
 * Send a chat completion request to any OpenAI-compatible LLM API.
 */
export async function chatCompletion(
  config: LLMConfig,
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<LLMResponse> {
  const defaults = PROVIDER_DEFAULTS[config.provider] || PROVIDER_DEFAULTS.generic;
  const baseUrl = config.baseUrl || defaults.baseUrl;
  const model = config.model || defaults.model;

  if (!baseUrl) {
    throw new Error(`Kein API-Endpoint konfiguriert für LLM Provider: ${config.provider}`);
  }
  if (!config.apiKey) {
    throw new Error(`Kein API Key konfiguriert für LLM Provider: ${config.provider}`);
  }

  const url = `${baseUrl}/chat/completions`;

  logger.debug('LLM request', { provider: config.provider, model, url: baseUrl });

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens || 500,
      temperature: options?.temperature ?? 0.7,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    logger.error('LLM API error', { provider: config.provider, status: resp.status, body: body.slice(0, 500) });
    throw new Error(`LLM API Fehler (${config.provider}): ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json() as any;
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content || '',
    model: data.model || model,
    provider: config.provider,
    usage: data.usage ? {
      prompt_tokens: data.usage.prompt_tokens ?? 0,
      completion_tokens: data.usage.completion_tokens ?? 0,
      total_tokens: data.usage.total_tokens ?? 0,
    } : undefined,
  };
}

// ─── Convenience Helpers ────────────────────────────────────────────────────

/**
 * Quick completion using the default provider from env vars.
 */
export async function quickCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<LLMResponse> {
  const config = getDefaultConfig();
  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });
  return chatCompletion(config, messages, options);
}

/**
 * Get info about which LLM provider is currently active.
 */
export function getActiveProviderInfo(): { available: boolean; provider: LLMProviderType; model: string } {
  const config = getDefaultConfig();
  return {
    available: !!config.apiKey,
    provider: config.provider,
    model: config.model || PROVIDER_DEFAULTS[config.provider]?.model || 'unknown',
  };
}
