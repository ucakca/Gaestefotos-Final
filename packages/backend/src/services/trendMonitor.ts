
/**
 * AI Trend Monitor Service
 *
 * Fetches weekly trends from multiple sources and generates template/effect suggestions.
 * Sources: HuggingFace (Image + Video), CivitAI, Hacker News (AI), FAL.ai models
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

export interface TrendItem {
  title: string;
  source: string;
  score?: number;
  url?: string;
  tags?: string[];
}

export interface TrendSuggestion {
  type: 'template' | 'effect' | 'style' | 'event_theme';
  title: string;
  reason: string;
  category?: string;
  tags?: string[];
  priority: 'high' | 'medium' | 'low';
}

// ─── Source: CivitAI Trending Models ──────────────────────────────────────────

async function fetchCivitAITrending(): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://civitai.com/api/v1/models?limit=10&sort=Highest%20Rated&period=Week&types=Checkpoint', {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data?.items || []).slice(0, 10).map((m: any) => ({
      title: m.name || 'Unknown Model',
      source: 'civitai/trending',
      score: m.stats?.rating ? Math.round(m.stats.rating * 100) : undefined,
      url: `https://civitai.com/models/${m.id}`,
      tags: ['civitai', 'checkpoint', 'image-generation', ...(m.tags || []).slice(0, 3)],
    }));
  } catch (e: any) {
    logger.warn('[TrendMonitor] CivitAI fetch failed', { err: e.message });
    return [];
  }
}

// ─── Source: CivitAI Trending LoRAs ──────────────────────────────────────────

async function fetchCivitAILoRAs(): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://civitai.com/api/v1/models?limit=8&sort=Highest%20Rated&period=Week&types=LORA', {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data?.items || []).slice(0, 8).map((m: any) => ({
      title: m.name || 'Unknown LoRA',
      source: 'civitai/loras',
      score: m.stats?.downloadCount,
      url: `https://civitai.com/models/${m.id}`,
      tags: ['civitai', 'lora', 'style', ...(m.tags || []).slice(0, 3)],
    }));
  } catch (e: any) {
    logger.warn('[TrendMonitor] CivitAI LoRAs fetch failed', { err: e.message });
    return [];
  }
}

// ─── Source: Hacker News (AI-related) ────────────────────────────────────────

async function fetchHackerNewsTrends(): Promise<TrendItem[]> {
  try {
    const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      signal: AbortSignal.timeout(8000),
    });
    if (!topRes.ok) return [];
    const topIds = await topRes.json() as number[];

    // Fetch details for top 30 stories, filter for AI-related
    const items = await Promise.all(
      topIds.slice(0, 30).map(async (id) => {
        try {
          const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            signal: AbortSignal.timeout(5000),
          });
          return r.ok ? r.json() : null;
        } catch { return null; }
      })
    );

    const aiKeywords = ['ai', 'llm', 'gpt', 'diffusion', 'stable', 'flux', 'video', 'image', 'generation', 'model', 'neural', 'deep learning', 'machine learning', 'openai', 'anthropic', 'midjourney', 'runway', 'luma', 'fal.ai', 'comfyui', 'hugging', 'transformer'];
    return items
      .filter((item: any) => {
        if (!item?.title) return false;
        const lower = item.title.toLowerCase();
        return aiKeywords.some(kw => lower.includes(kw));
      })
      .slice(0, 8)
      .map((item: any) => ({
        title: item.title,
        source: 'hackernews/ai',
        score: item.score,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        tags: ['hackernews', 'tech', 'ai'],
      }));
  } catch (e: any) {
    logger.warn('[TrendMonitor] HackerNews fetch failed', { err: e.message });
    return [];
  }
}

// ─── Source: FAL.ai Models ────────────────────────────────────────────────────

async function fetchFalModels(apiKey: string): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://fal.run/fal-ai/models', {
      headers: { Authorization: `Key ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    return ((data?.models || data) as any[])
      .slice(0, 15)
      .map((m: any) => ({
        title: m.name || m.id || 'Unknown Model',
        source: 'fal.ai/models',
        url: `https://fal.ai/models/${m.id || m.name}`,
        tags: ['fal', 'ai', 'model', ...(m.tags || [])],
      }));
  } catch (e: any) {
    logger.warn('[TrendMonitor] FAL.ai models fetch failed', { err: e.message });
    return [];
  }
}

// ─── Source: Hugging Face Trending (Image Models) ────────────────────────────

async function fetchHuggingFaceImageModels(): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://huggingface.co/api/models?sort=likes7d&limit=10&filter=text-to-image', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).slice(0, 8).map((m: any) => ({
      title: m.modelId || m.id,
      source: 'huggingface/image-models',
      score: m.likes,
      url: `https://huggingface.co/${m.modelId || m.id}`,
      tags: ['ai', 'model', 'image-generation', ...(m.tags || []).slice(0, 3)],
    }));
  } catch (e: any) {
    logger.warn('[TrendMonitor] HuggingFace image models fetch failed', { err: e.message });
    return [];
  }
}

// ─── Source: Hugging Face Trending (Video Models) ────────────────────────────

async function fetchHuggingFaceVideoModels(): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://huggingface.co/api/models?sort=likes7d&limit=8&filter=text-to-video', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).slice(0, 6).map((m: any) => ({
      title: m.modelId || m.id,
      source: 'huggingface/video-models',
      score: m.likes,
      url: `https://huggingface.co/${m.modelId || m.id}`,
      tags: ['ai', 'model', 'video-generation', ...(m.tags || []).slice(0, 3)],
    }));
  } catch (e: any) {
    logger.warn('[TrendMonitor] HuggingFace video models fetch failed', { err: e.message });
    return [];
  }
}

// ─── Source: Hugging Face Trending (LLMs) ────────────────────────────────────

async function fetchHuggingFaceLLMs(): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://huggingface.co/api/models?sort=likes7d&limit=8&filter=text-generation', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).slice(0, 6).map((m: any) => ({
      title: m.modelId || m.id,
      source: 'huggingface/llms',
      score: m.likes,
      url: `https://huggingface.co/${m.modelId || m.id}`,
      tags: ['ai', 'model', 'llm', 'text-generation', ...(m.tags || []).slice(0, 3)],
    }));
  } catch (e: any) {
    logger.warn('[TrendMonitor] HuggingFace LLMs fetch failed', { err: e.message });
    return [];
  }
}

// ─── AI Suggestions Generator ─────────────────────────────────────────────────

function generateSuggestions(trends: TrendItem[]): TrendSuggestion[] {
  const suggestions: TrendSuggestion[] = [];
  const allTitles = trends.map(t => t.title.toLowerCase()).join(' ');

  // Seasonal/Event patterns
  const patterns = [
    { keywords: ['weihnacht', 'christmas', 'santa', 'xmas', 'holiday'], suggestion: { type: 'template' as const, title: 'Weihnachts-Templates', reason: 'Christmas ist trending', category: 'seasonal', tags: ['christmas', 'winter', 'santa'], priority: 'high' as const } },
    { keywords: ['karneval', 'fasching', 'carnival', 'mardi gras'], suggestion: { type: 'template' as const, title: 'Karneval/Fasching Templates', reason: 'Karneval-Saison erkannt', category: 'seasonal', tags: ['carnival', 'costume', 'karneval'], priority: 'high' as const } },
    { keywords: ['halloween', 'horror', 'spooky', 'witch', 'zombie'], suggestion: { type: 'template' as const, title: 'Halloween Templates', reason: 'Halloween trending', category: 'seasonal', tags: ['halloween', 'spooky', 'costume'], priority: 'high' as const } },
    { keywords: ['superhero', 'marvel', 'dc comics', 'batman', 'spider-man', 'avengers'], suggestion: { type: 'template' as const, title: 'Superhelden-Templates', reason: 'Superhero-Thema trending', category: 'superhero', tags: ['superhero', 'costume', 'marvel'], priority: 'high' as const } },
    { keywords: ['wedding', 'hochzeit', 'bride', 'groom', 'marriage'], suggestion: { type: 'template' as const, title: 'Hochzeits-Templates', reason: 'Hochzeits-Thema trending', category: 'wedding', tags: ['wedding', 'bride', 'groom'], priority: 'medium' as const } },
    { keywords: ['anime', 'manga', 'one piece', 'naruto', 'demon slayer'], suggestion: { type: 'effect' as const, title: 'Anime Style Effect', reason: 'Anime-Trend erkannt', category: 'style', tags: ['anime', 'manga', 'japanese'], priority: 'high' as const } },
    { keywords: ['pixel', 'retro', 'gaming', 'game', '8-bit', '16-bit'], suggestion: { type: 'effect' as const, title: 'Pixel Art Style', reason: 'Retro Gaming trending', category: 'style', tags: ['pixel', 'retro', 'gaming'], priority: 'medium' as const } },
    { keywords: ['sport', 'football', 'soccer', 'basketball', 'olympia', 'wm', 'em', 'bundesliga'], suggestion: { type: 'template' as const, title: 'Sport-Templates', reason: 'Sport-Event trending', category: 'sport', tags: ['sport', 'athletic'], priority: 'medium' as const } },
    { keywords: ['meme', 'viral', 'trending'], suggestion: { type: 'event_theme' as const, title: 'Meme-Template', reason: 'Meme geht viral', category: 'fun', tags: ['meme', 'viral', 'fun'], priority: 'medium' as const } },
    { keywords: ['flux', 'stable diffusion', 'midjourney', 'dall-e', 'sora', 'video generation'], suggestion: { type: 'effect' as const, title: 'Neues AI-Modell verfügbar', reason: 'Neues AI-Modell trending', category: 'ai', tags: ['ai', 'model', 'new'], priority: 'high' as const } },
  ];

  for (const pattern of patterns) {
    if (pattern.keywords.some(kw => allTitles.includes(kw))) {
      if (!suggestions.find(s => s.title === pattern.suggestion.title)) {
        suggestions.push(pattern.suggestion);
      }
    }
  }

  // Highlight top HackerNews AI trend
  const topHN = trends.find(t => t.source === 'hackernews/ai');
  if (topHN) {
    suggestions.push({
      type: 'event_theme',
      title: `AI News: ${topHN.title.slice(0, 60)}`,
      reason: `Hacker News Top AI Story (Score: ${topHN.score || '?'})`,
      priority: 'low',
      tags: topHN.tags || [],
    });
  }

  // Highlight top CivitAI model
  const topCivit = trends.find(t => t.source === 'civitai/trending');
  if (topCivit) {
    suggestions.push({
      type: 'style',
      title: `Neues Top-Modell: ${topCivit.title.slice(0, 50)}`,
      reason: 'Top bewertetes CivitAI Modell dieser Woche',
      category: 'ai',
      priority: 'medium',
      tags: topCivit.tags || [],
    });
  }

  return suggestions.slice(0, 10);
}

// ─── Main: Fetch All Trends ───────────────────────────────────────────────────

export async function fetchAllTrends(falApiKey?: string): Promise<{
  trends: TrendItem[];
  suggestions: TrendSuggestion[];
  sources: string[];
}> {
  logger.info('[TrendMonitor] Fetching trends from all sources...');

  const results = await Promise.allSettled([
    fetchHuggingFaceImageModels(),
    fetchHuggingFaceVideoModels(),
    fetchHuggingFaceLLMs(),
    fetchCivitAITrending(),
    fetchCivitAILoRAs(),
    fetchHackerNewsTrends(),
    falApiKey ? fetchFalModels(falApiKey) : Promise.resolve([]),
  ]);

  const allTrends: TrendItem[] = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  const sources = [...new Set(allTrends.map(t => t.source))];
  const suggestions = generateSuggestions(allTrends);

  logger.info('[TrendMonitor] Fetch complete', { trendsCount: allTrends.length, suggestionsCount: suggestions.length, sources });

  return { trends: allTrends, suggestions, sources };
}

// ─── Save to DB ───────────────────────────────────────────────────────────────

export async function saveTrendReport(
  weekOf: Date,
  source: string,
  trends: TrendItem[],
  suggestions: TrendSuggestion[],
): Promise<void> {
  const weekDate = new Date(weekOf);
  weekDate.setHours(0, 0, 0, 0);
  // Set to Monday of the week
  const day = weekDate.getDay();
  weekDate.setDate(weekDate.getDate() - (day === 0 ? 6 : day - 1));
  const weekStr = weekDate.toISOString().split('T')[0];

  await prisma.$executeRawUnsafe(
    `INSERT INTO trend_reports (id, "weekOf", source, trends, suggestions, status, "fetchedAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1::date, $2, $3::jsonb, $4::jsonb, 'completed', NOW(), NOW())
     ON CONFLICT ("weekOf", source) DO UPDATE SET
       trends = $3::jsonb, suggestions = $4::jsonb, status = 'completed', "fetchedAt" = NOW(), "updatedAt" = NOW()`,
    weekStr, source, JSON.stringify(trends), JSON.stringify(suggestions)
  );
}

// ─── Run Weekly Job ───────────────────────────────────────────────────────────

export async function runTrendMonitorJob(): Promise<void> {
  try {
    // Get FAL.ai API key from DB (encrypted)
    let falApiKey: string | undefined;
    try {
      const falProviders: any[] = await prisma.$queryRawUnsafe(
        `SELECT "apiKeyEncrypted", "apiKeyIv", "apiKeyTag" FROM ai_providers WHERE slug LIKE '%fal%' AND "isActive" = true LIMIT 1`
      );
      if (falProviders[0]?.apiKeyEncrypted) {
        const { decryptValue } = await import('../utils/encryption');
        falApiKey = decryptValue({
          encrypted: falProviders[0].apiKeyEncrypted,
          iv: falProviders[0].apiKeyIv,
          tag: falProviders[0].apiKeyTag,
        });
      }
    } catch (e: any) {
      logger.warn('[TrendMonitor] Could not load FAL API key, skipping FAL models', { error: e.message });
    }

    const { trends, suggestions } = await fetchAllTrends(falApiKey);

    const now = new Date();
    await saveTrendReport(now, 'combined', trends, suggestions);

    logger.info('[TrendMonitor] Weekly job completed', { trends: trends.length, suggestions: suggestions.length });
  } catch (error: any) {
    logger.error('[TrendMonitor] Weekly job failed', { error: error.message });
  }
}
