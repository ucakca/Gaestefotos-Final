// @ts-nocheck
/**
 * AI Trend Monitor Service
 *
 * Fetches weekly trends from multiple sources and generates template/effect suggestions.
 * Sources: Google Trends, Reddit RSS, NewsAPI, FAL.ai models, Hugging Face
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

// ─── Source: Reddit RSS ───────────────────────────────────────────────────────

async function fetchRedditTrends(subreddit: string): Promise<TrendItem[]> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`, {
      headers: { 'User-Agent': 'GaestefoTrendsBot/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.children || [])
      .filter((p: any) => !p.data?.stickied)
      .slice(0, 8)
      .map((p: any) => ({
        title: p.data.title,
        source: `reddit/r/${subreddit}`,
        score: p.data.score,
        url: `https://reddit.com${p.data.permalink}`,
        tags: [subreddit, ...((p.data.title || '').toLowerCase().match(/\b\w{4,}\b/g) || []).slice(0, 4)],
      }));
  } catch (e: any) {
    logger.warn('[TrendMonitor] Reddit fetch failed', { subreddit, err: e.message });
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
    const data = await res.json();
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

// ─── Source: Hugging Face Trending ────────────────────────────────────────────

async function fetchHuggingFaceTrending(): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://huggingface.co/api/models?sort=likes7d&limit=10&filter=text-to-image', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).slice(0, 8).map((m: any) => ({
      title: m.modelId || m.id,
      source: 'huggingface/trending',
      score: m.likes,
      url: `https://huggingface.co/${m.modelId || m.id}`,
      tags: ['ai', 'model', 'image-generation', ...(m.tags || []).slice(0, 3)],
    }));
  } catch (e: any) {
    logger.warn('[TrendMonitor] HuggingFace fetch failed', { err: e.message });
    return [];
  }
}

// ─── Source: Google Trends (via SerpAPI or unofficial) ───────────────────────

async function fetchGoogleTrends(): Promise<TrendItem[]> {
  try {
    // Use Google Trends Daily Trends RSS (no API key needed)
    const res = await fetch('https://trends.google.com/trends/trendingsearches/daily/rss?geo=DE', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const titles = [...text.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g)]
      .map(m => m[1])
      .filter(t => t && !t.includes('Google'))
      .slice(0, 10);
    return titles.map(title => ({
      title,
      source: 'google-trends/DE',
      tags: [title.toLowerCase(), 'trending', 'germany'],
    }));
  } catch (e: any) {
    logger.warn('[TrendMonitor] Google Trends fetch failed', { err: e.message });
    return [];
  }
}

// ─── Source: TikTok via Google Trends proxy ───────────────────────────────────

async function fetchTikTokTrends(): Promise<TrendItem[]> {
  // TikTok doesn't have a public API — use Reddit as proxy
  const tiktokReddit = await fetchRedditTrends('TikTok');
  return tiktokReddit.map(t => ({ ...t, source: 'tiktok-via-reddit' }));
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

  // Always suggest staying current with trends
  if (trends.filter(t => t.source.includes('google')).length > 0) {
    const topTrend = trends.find(t => t.source.includes('google'));
    if (topTrend) {
      suggestions.push({
        type: 'event_theme',
        title: `Aktuelles Thema: ${topTrend.title}`,
        reason: `Google Trends DE #1: ${topTrend.title}`,
        priority: 'low',
        tags: topTrend.tags || [],
      });
    }
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

  const [
    googleTrends,
    redditMemes,
    redditOutOfLoop,
    redditTikTok,
    hfModels,
    falModels,
  ] = await Promise.allSettled([
    fetchGoogleTrends(),
    fetchRedditTrends('memes'),
    fetchRedditTrends('OutOfTheLoop'),
    fetchTikTokTrends(),
    fetchHuggingFaceTrending(),
    falApiKey ? fetchFalModels(falApiKey) : Promise.resolve([]),
  ]);

  const allTrends: TrendItem[] = [
    ...(googleTrends.status === 'fulfilled' ? googleTrends.value : []),
    ...(redditMemes.status === 'fulfilled' ? redditMemes.value : []),
    ...(redditOutOfLoop.status === 'fulfilled' ? redditOutOfLoop.value : []),
    ...(redditTikTok.status === 'fulfilled' ? redditTikTok.value : []),
    ...(hfModels.status === 'fulfilled' ? hfModels.value : []),
    ...(falModels.status === 'fulfilled' ? falModels.value : []),
  ];

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
    // Get FAL.ai API key from DB
    const falProviders: any[] = await prisma.$queryRawUnsafe(
      `SELECT "apiKey" FROM ai_providers WHERE slug LIKE '%fal%' AND "isActive" = true LIMIT 1`
    );
    const falApiKey = falProviders[0]?.apiKey || undefined;

    const { trends, suggestions } = await fetchAllTrends(falApiKey);

    const now = new Date();
    await saveTrendReport(now, 'combined', trends, suggestions);

    logger.info('[TrendMonitor] Weekly job completed', { trends: trends.length, suggestions: suggestions.length });
  } catch (error: any) {
    logger.error('[TrendMonitor] Weekly job failed', { error: error.message });
  }
}
