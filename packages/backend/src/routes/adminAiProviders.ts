import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { encryptValue, decryptValue } from '../utils/encryption';
import { z } from 'zod';
import {
  AI_FEATURE_REGISTRY,
  PACKAGE_CATEGORY_TO_FEATURE_KEY,
  AiPackageCategory,
} from '../services/aiFeatureRegistry';

// All AI provider routes require ADMIN role
// (legacy requireAdmin function kept for backwards compat but router.use enforces it)
async function requireAdmin(req: AuthRequest, res: Response): Promise<boolean> {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

const router = Router();

// ─── Public-ish routes (auth required, but NOT admin-only) ────
// These must be defined BEFORE the ADMIN middleware below.

/**
 * GET /api/admin/ai-providers/registry
 * Read-only AI feature metadata — needed by partners & admins for AI config UI.
 */
router.get('/registry', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const categories: Record<string, {
      key: string;
      label: string;
      icon: string;
      packageFeatureKey: string;
      features: typeof AI_FEATURE_REGISTRY;
    }> = {};

    const CATEGORY_META: Record<AiPackageCategory, { label: string; icon: string }> = {
      games: { label: 'AI Games', icon: '🎮' },
      imageEffects: { label: 'Image Effects', icon: '🎨' },
      styleTransfer: { label: 'Style Transfer', icon: '🖼️' },
      advanced: { label: 'Advanced', icon: '⚡' },
      gifVideo: { label: 'GIF / Video', icon: '🎬' },
      hostTools: { label: 'Host-Tools', icon: '🛠️' },
      recognition: { label: 'Face Search', icon: '👤' },
    };

    for (const feat of AI_FEATURE_REGISTRY) {
      const cat = feat.packageCategory;
      if (!categories[cat]) {
        const meta = CATEGORY_META[cat] || { label: cat, icon: '❓' };
        categories[cat] = {
          key: cat,
          label: meta.label,
          icon: meta.icon,
          packageFeatureKey: PACKAGE_CATEGORY_TO_FEATURE_KEY[cat] || '',
          features: [],
        };
      }
      categories[cat].features.push(feat);
    }

    res.json({
      features: AI_FEATURE_REGISTRY,
      categories: Object.values(categories),
      packageCategoryMap: PACKAGE_CATEGORY_TO_FEATURE_KEY,
    });
  } catch (err) {
    logger.error('Failed to get AI feature registry', err);
    res.status(500).json({ error: 'Failed to load registry' });
  }
});

// Enforce ADMIN role at router level (defense-in-depth alongside per-handler requireAdmin)
router.use(authMiddleware, requireRole('ADMIN'));

// ─────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────

const createProviderSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(100),
  type: z.enum(['LLM', 'IMAGE_GEN', 'FACE_RECOGNITION', 'VIDEO_GEN', 'STT', 'TTS']),
  baseUrl: z.string().url().optional().nullable(),
  apiKey: z.string().optional().nullable(),
  defaultModel: z.string().optional().nullable(),
  models: z.array(z.object({
    id: z.string(),
    name: z.string(),
    costPer1kTokens: z.number().optional(),
  })).optional().nullable(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  rateLimitPerMinute: z.number().int().positive().optional().nullable(),
  rateLimitPerDay: z.number().int().positive().optional().nullable(),
  monthlyBudgetCents: z.number().int().nonnegative().optional().nullable(),
  config: z.any().optional().nullable(),
});

const updateProviderSchema = createProviderSchema.partial();

const createFeatureMappingSchema = z.object({
  feature: z.string().min(2).max(50),
  providerId: z.string().uuid(),
  model: z.string().optional().nullable(),
  isEnabled: z.boolean().optional(),
  maxTokens: z.number().int().positive().optional().nullable(),
  temperature: z.number().min(0).max(2).optional().nullable(),
  config: z.any().optional().nullable(),
});

// ─────────────────────────────────────────────────────────────
// IMPORTANT: Static routes BEFORE /:id param routes
// ─────────────────────────────────────────────────────────────

// GET /api/admin/ai-providers/usage/stats — Usage statistics
router.get('/usage/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const days = parseInt(req.query.days as string) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const perProvider = await prisma.aiUsageLog.groupBy({
      by: ['providerId'],
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, costCents: true, inputTokens: true, outputTokens: true },
      _count: true,
      _avg: { durationMs: true },
    });

    // Error rate per provider
    const errorsPerProvider = await prisma.aiUsageLog.groupBy({
      by: ['providerId'],
      where: { createdAt: { gte: since }, success: false },
      _count: true,
    });
    const totalsPerProvider = await prisma.aiUsageLog.groupBy({
      by: ['providerId'],
      where: { createdAt: { gte: since } },
      _count: true,
    });
    const errorRateMap: Record<string, string> = {};
    for (const t of totalsPerProvider) {
      const errEntry = errorsPerProvider.find(e => e.providerId === t.providerId);
      const errCount = errEntry?._count || 0;
      errorRateMap[t.providerId] = t._count > 0 ? (errCount / t._count * 100).toFixed(1) : '0';
    }

    const perFeature = await prisma.aiUsageLog.groupBy({
      by: ['feature'],
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, costCents: true },
      _count: true,
      _avg: { durationMs: true },
    });

    const dailyRaw = await prisma.$queryRaw<Array<{
      day: Date; requests: bigint; tokens: bigint; cost: number;
    }>>`
      SELECT 
        DATE_TRUNC('day', "createdAt") as day,
        COUNT(*) as requests,
        COALESCE(SUM("totalTokens"), 0) as tokens,
        COALESCE(SUM("costCents"), 0) as cost
      FROM ai_usage_logs
      WHERE "createdAt" >= ${since}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `;

    const daily = dailyRaw.map(d => ({
      day: d.day,
      requests: Number(d.requests),
      tokens: Number(d.tokens),
      cost: Number(d.cost),
    }));

    const errors = await prisma.aiUsageLog.count({
      where: { createdAt: { gte: since }, success: false },
    });
    const total = await prisma.aiUsageLog.count({
      where: { createdAt: { gte: since } },
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthlyAgg = await prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { costCents: true, totalTokens: true },
      _count: true,
    });

    res.json({
      period: { days, since },
      perProvider,
      perFeature,
      daily,
      errorRate: total > 0 ? (errors / total * 100).toFixed(1) : '0',
      errorRatePerProvider: errorRateMap,
      monthly: {
        requests: monthlyAgg._count,
        tokens: monthlyAgg._sum.totalTokens || 0,
        costCents: monthlyAgg._sum.costCents || 0,
      },
    });
  } catch (error) {
    logger.error('Error getting AI usage stats:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// Feature Registry — central definitions of all AI features (labels, categories, costs, provider types)
router.get('/features/registry', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const { AI_FEATURE_REGISTRY } = await import('../services/aiFeatureRegistry');
    res.json({ features: AI_FEATURE_REGISTRY });
  } catch (error) {
    logger.error('Error getting AI feature registry:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Feature Registry' });
  }
});

// Feature Status Overview — all AI features with provider, cost, enabled status
router.get('/features/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const { getAiFeatureStatus } = await import('../services/aiExecution');
    const features = await getAiFeatureStatus();
    res.json({ features });
  } catch (error) {
    logger.error('Error getting AI feature status:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// Feature Mappings — static routes
router.get('/features/mappings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const mappings = await prisma.aiFeatureMapping.findMany({
      include: { provider: { select: { id: true, slug: true, name: true, type: true } } },
      orderBy: { feature: 'asc' },
    });
    res.json({ mappings });
  } catch (error) {
    logger.error('Error listing feature mappings:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

router.put('/features/mappings/:feature', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const data = createFeatureMappingSchema.partial().parse(req.body);
    const { feature } = req.params;

    const mapping = await prisma.aiFeatureMapping.upsert({
      where: { feature },
      create: {
        feature,
        providerId: data.providerId!,
        model: data.model,
        isEnabled: data.isEnabled ?? true,
        maxTokens: data.maxTokens,
        temperature: data.temperature,
        config: data.config as any,
      },
      update: {
        ...(data.providerId && { providerId: data.providerId }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.maxTokens !== undefined && { maxTokens: data.maxTokens }),
        ...(data.temperature !== undefined && { temperature: data.temperature }),
        ...(data.config !== undefined && { config: data.config as any }),
      },
      include: { provider: { select: { id: true, slug: true, name: true } } },
    });

    res.json({ mapping });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Eingabe', details: error.errors });
    }
    logger.error('Error updating feature mapping:', error);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

router.delete('/features/mappings/:feature', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    await prisma.aiFeatureMapping.delete({ where: { feature: req.params.feature } });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Mapping nicht gefunden' });
    }
    logger.error('Error deleting feature mapping:', error);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ─────────────────────────────────────────────────────────────
// Auto-Setup: one-click maps all features + seeds prompts
// ─────────────────────────────────────────────────────────────

router.post('/auto-setup', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const { AI_FEATURE_REGISTRY } = await import('../services/aiFeatureRegistry');
    const { seedDefaultPrompts } = await import('../services/promptTemplates');

    const results: { mappingsCreated: string[]; mappingsSkipped: string[]; promptsSeeded: number; errors: string[] } = {
      mappingsCreated: [],
      mappingsSkipped: [],
      promptsSeeded: 0,
      errors: [],
    };

    // 1. Get all active providers grouped by type
    const providers = await prisma.aiProvider.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    const providersByType: Record<string, typeof providers> = {};
    for (const p of providers) {
      if (!providersByType[p.type]) providersByType[p.type] = [];
      providersByType[p.type].push(p);
    }

    // 2. Get existing mappings
    const existingMappings = await prisma.aiFeatureMapping.findMany();
    const mappedFeatures = new Set(existingMappings.map(m => m.feature));

    // 3. Auto-map unmapped features
    for (const feature of AI_FEATURE_REGISTRY) {
      if (mappedFeatures.has(feature.key)) {
        results.mappingsSkipped.push(feature.key);
        continue;
      }

      const candidates = providersByType[feature.providerType] || [];
      if (candidates.length === 0) {
        results.errors.push(`${feature.key}: Kein aktiver ${feature.providerType} Provider`);
        continue;
      }

      // Pick the first (default/oldest) provider of matching type
      const provider = candidates[0];
      try {
        await prisma.aiFeatureMapping.create({
          data: {
            feature: feature.key,
            providerId: provider.id,
            isEnabled: true,
          },
        });
        results.mappingsCreated.push(`${feature.key} → ${provider.slug}`);
      } catch (err: any) {
        results.errors.push(`${feature.key}: ${err.message}`);
      }
    }

    // 4. Seed missing prompts
    try {
      const seeded = await seedDefaultPrompts();
      results.promptsSeeded = seeded.created;
    } catch (err: any) {
      results.errors.push(`Prompt-Seeding: ${err.message}`);
    }

    logger.info('[Auto-Setup] Complete', results);

    res.json({
      success: true,
      summary: {
        ...results,
        totalFeatures: AI_FEATURE_REGISTRY.length,
        totalMapped: mappedFeatures.size + results.mappingsCreated.length,
        totalProviders: providers.length,
      },
    });
  } catch (error) {
    logger.error('Error in auto-setup:', error);
    res.status(500).json({ error: 'Auto-Setup fehlgeschlagen' });
  }
});

// ─────────────────────────────────────────────────────────────
// CRUD routes: list, create, get, update, delete
// ─────────────────────────────────────────────────────────────

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const providers = await prisma.aiProvider.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { usageLogs: true, featureMappings: true } },
      },
    });

    // Get last-used timestamp per provider
    const lastUsedRaw = await prisma.aiUsageLog.groupBy({
      by: ['providerId'],
      _max: { createdAt: true },
    });
    const lastUsedMap: Record<string, Date | null> = {};
    for (const row of lastUsedRaw) {
      lastUsedMap[row.providerId] = row._max.createdAt;
    }

    const safe = providers.map(p => ({
      ...p,
      apiKeyEncrypted: undefined,
      apiKeyIv: undefined,
      apiKeyTag: undefined,
      hasApiKey: !!(p.apiKeyEncrypted && p.apiKeyIv && p.apiKeyTag),
      lastUsedAt: lastUsedMap[p.id] || null,
    }));

    res.json({ providers: safe });
  } catch (error) {
    logger.error('Error listing AI providers:', error);
    res.status(500).json({ error: 'Fehler beim Laden der AI Provider' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const data = createProviderSchema.parse(req.body);
    const { apiKey, ...rest } = data;

    let encrypted: { apiKeyEncrypted: string; apiKeyIv: string; apiKeyTag: string; apiKeyHint: string } | {} = {};
    if (apiKey) {
      const enc = encryptValue(apiKey);
      encrypted = {
        apiKeyEncrypted: enc.encrypted,
        apiKeyIv: enc.iv,
        apiKeyTag: enc.tag,
        apiKeyHint: '…' + apiKey.slice(-4),
      };
    }

    if (rest.isDefault) {
      await prisma.aiProvider.updateMany({
        where: { type: rest.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    const provider = await prisma.aiProvider.create({
      data: {
        ...rest,
        ...encrypted,
        models: rest.models as any,
        config: rest.config as any,
      },
    });

    logger.info('AI provider created', { id: provider.id, slug: provider.slug });

    res.status(201).json({
      provider: {
        ...provider,
        apiKeyEncrypted: undefined,
        apiKeyIv: undefined,
        apiKeyTag: undefined,
        hasApiKey: !!(provider.apiKeyEncrypted),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Eingabe', details: error.errors });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ein Provider mit diesem Slug existiert bereits' });
    }
    logger.error('Error creating AI provider:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const provider = await prisma.aiProvider.findUnique({
      where: { id: req.params.id },
      include: {
        featureMappings: true,
        _count: { select: { usageLogs: true } },
      },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider nicht gefunden' });
    }

    res.json({
      provider: {
        ...provider,
        apiKeyEncrypted: undefined,
        apiKeyIv: undefined,
        apiKeyTag: undefined,
        hasApiKey: !!(provider.apiKeyEncrypted && provider.apiKeyIv && provider.apiKeyTag),
      },
    });
  } catch (error) {
    logger.error('Error getting AI provider:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const data = updateProviderSchema.parse(req.body);
    const { apiKey, ...rest } = data;

    const existing = await prisma.aiProvider.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Provider nicht gefunden' });
    }

    let encrypted: any = {};
    if (apiKey !== undefined) {
      if (apiKey) {
        const enc = encryptValue(apiKey);
        encrypted = {
          apiKeyEncrypted: enc.encrypted,
          apiKeyIv: enc.iv,
          apiKeyTag: enc.tag,
          apiKeyHint: '…' + apiKey.slice(-4),
        };
      } else {
        encrypted = {
          apiKeyEncrypted: null,
          apiKeyIv: null,
          apiKeyTag: null,
          apiKeyHint: null,
        };
      }
    }

    if (rest.isDefault) {
      const type = rest.type || existing.type;
      await prisma.aiProvider.updateMany({
        where: { type, isDefault: true, id: { not: req.params.id } },
        data: { isDefault: false },
      });
    }

    const provider = await prisma.aiProvider.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...encrypted,
        models: rest.models !== undefined ? (rest.models as any) : undefined,
        config: rest.config !== undefined ? (rest.config as any) : undefined,
      },
    });

    logger.info('AI provider updated', { id: provider.id, slug: provider.slug });

    res.json({
      provider: {
        ...provider,
        apiKeyEncrypted: undefined,
        apiKeyIv: undefined,
        apiKeyTag: undefined,
        hasApiKey: !!(provider.apiKeyEncrypted),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Eingabe', details: error.errors });
    }
    logger.error('Error updating AI provider:', error);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    await prisma.aiProvider.delete({ where: { id: req.params.id } });
    logger.info('AI provider deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Provider nicht gefunden' });
    }
    logger.error('Error deleting AI provider:', error);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

router.post('/:id/test', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const provider = await prisma.aiProvider.findUnique({
      where: { id: req.params.id },
    });
    if (!provider) {
      return res.status(404).json({ error: 'Provider nicht gefunden' });
    }

    const isOllama = provider.slug?.toLowerCase().includes('ollama') || provider.slug?.toLowerCase().includes('local-llm');

    if (!isOllama && (!provider.apiKeyEncrypted || !provider.apiKeyIv || !provider.apiKeyTag)) {
      return res.status(400).json({ error: 'Kein API Key konfiguriert' });
    }

    const apiKey = isOllama
      ? 'ollama'
      : decryptValue({
          encrypted: provider.apiKeyEncrypted!,
          iv: provider.apiKeyIv!,
          tag: provider.apiKeyTag!,
        });

    const startTime = Date.now();
    let success = false;
    let message = '';
    let model = provider.defaultModel || '';

    if (provider.type === 'LLM') {
      if (isOllama) {
        // Ollama — test local endpoint
        const baseUrl = provider.baseUrl || 'http://localhost:11434/v1';
        try {
          const resp = await fetch(`${baseUrl.replace('/v1', '')}/api/tags`);
          if (resp.ok) {
            const data = await resp.json() as any;
            const models = (data.models || []).map((m: any) => m.name).join(', ');
            success = true;
            message = `Ollama lokal erreichbar. Modelle: ${models || '(keine installiert)'}`;
          } else {
            message = `Ollama nicht erreichbar: ${resp.status} — starte mit: ollama serve`;
          }
        } catch {
          message = 'Ollama nicht erreichbar — läuft der Dienst? (systemctl status ollama)';
        }
      } else if (provider.slug === 'groq' || provider.slug.includes('groq')) {
        const { default: Groq } = await import('groq-sdk');
        const client = new Groq({ apiKey });
        const completion = await client.chat.completions.create({
          model: model || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
          max_tokens: 5,
        });
        success = !!completion.choices[0]?.message?.content;
        message = success ? `Antwort: "${completion.choices[0].message.content}"` : 'Keine Antwort';
      } else if (provider.slug.includes('grok') || provider.slug.includes('xai') || provider.slug.includes('x-ai')) {
        // Grok / xAI — OpenAI-compatible API
        const baseUrl = provider.baseUrl || 'https://api.x.ai/v1';
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model || 'grok-3-mini',
            messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
            max_tokens: 5,
          }),
        });
        if (resp.ok) {
          const data = await resp.json() as any;
          const answer = data.choices?.[0]?.message?.content || '';
          success = !!answer;
          message = success ? `Grok Antwort: "${answer}" (Model: ${data.model || model})` : 'Keine Antwort';
        } else {
          const body = await resp.text().catch(() => '');
          message = `${resp.status} ${resp.statusText} — ${body.slice(0, 200)}`;
        }
      } else if (provider.slug === 'openai' || provider.slug.includes('openai')) {
        const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
        const resp = await fetch(`${baseUrl}/models`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        success = resp.ok;
        message = success ? `${resp.status} OK — Models endpoint erreichbar` : `${resp.status} ${resp.statusText}`;
      } else {
        const baseUrl = provider.baseUrl;
        if (baseUrl) {
          const resp = await fetch(`${baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
          success = resp.ok;
          message = success ? `${resp.status} OK` : `${resp.status} ${resp.statusText}`;
        } else {
          message = 'Kein Test möglich — baseUrl fehlt';
        }
      }
    } else if (provider.type === 'IMAGE_GEN') {
      if (provider.slug.includes('replicate')) {
        const resp = await fetch('https://api.replicate.com/v1/account', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        success = resp.ok;
        message = success ? 'Replicate API erreichbar' : `${resp.status} ${resp.statusText}`;
      } else if (provider.slug.includes('stability')) {
        const resp = await fetch('https://api.stability.ai/v1/user/account', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        success = resp.ok;
        message = success ? 'Stability API erreichbar' : `${resp.status} ${resp.statusText}`;
      } else if (provider.slug.includes('remove') || provider.slug.includes('removebg') || provider.slug.includes('remove-bg')) {
        const resp = await fetch('https://api.remove.bg/v1.0/account', {
          headers: { 'X-Api-Key': apiKey },
        });
        if (resp.ok) {
          const data = await resp.json() as any;
          success = true;
          const credits = data.data?.attributes?.credits?.total ?? 'unbekannt';
          message = `remove.bg API erreichbar (Credits: ${credits})`;
        } else {
          message = `remove.bg ${resp.status} ${resp.statusText}`;
        }
      } else {
        // Generic IMAGE_GEN: try baseUrl or Replicate-style auth check
        const baseUrl = provider.baseUrl;
        if (baseUrl) {
          const resp = await fetch(baseUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
          success = resp.ok || resp.status === 404; // 404 = server up, just wrong path
          message = success ? `API erreichbar (${resp.status})` : `${resp.status} ${resp.statusText}`;
        } else {
          message = 'Kein Test möglich — baseUrl fehlt';
        }
      }

    } else if (provider.type === 'VIDEO_GEN') {
      // ─── Runway ───
      if (provider.slug.includes('runway')) {
        const baseUrl = provider.baseUrl || 'https://api.dev.runwayml.com/v1';
        // Runway: GET /tasks is a lightweight way to verify auth
        const resp = await fetch(`${baseUrl}/tasks?limit=1`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-Runway-Version': '2024-11-06',
          },
        });
        if (resp.ok) {
          success = true;
          message = `Runway API erreichbar (Model: ${model || 'gen4_turbo'})`;
        } else if (resp.status === 401 || resp.status === 403) {
          message = `Runway Auth fehlgeschlagen: ${resp.status} ${resp.statusText}`;
        } else {
          // Some non-auth error — API is reachable but might need different endpoint
          const body = await resp.text().catch(() => '');
          // 404 on /tasks means the server is up, just no tasks endpoint for listing
          success = resp.status === 404;
          message = success
            ? `Runway API erreichbar (${resp.status} — kein Task-Listing, aber Auth OK)`
            : `Runway ${resp.status} ${resp.statusText} — ${body.slice(0, 200)}`;
        }
      }
      // ─── Luma AI ───
      else if (provider.slug.includes('luma')) {
        const baseUrl = provider.baseUrl || 'https://api.lumalabs.ai/dream-machine/v1';
        // Luma: GET /generations?limit=1 to verify auth
        const resp = await fetch(`${baseUrl}/generations?limit=1`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        if (resp.ok) {
          success = true;
          message = `Luma AI erreichbar (Model: ${model || 'ray2'})`;
        } else if (resp.status === 401 || resp.status === 403) {
          message = `Luma Auth fehlgeschlagen: ${resp.status} ${resp.statusText}`;
        } else {
          const body = await resp.text().catch(() => '');
          success = resp.status === 404;
          message = success
            ? `Luma API erreichbar (Auth OK)`
            : `Luma ${resp.status} — ${body.slice(0, 200)}`;
        }
      }
      // ─── Generic VIDEO_GEN (OpenAI-compatible or custom) ───
      else {
        const baseUrl = provider.baseUrl;
        if (baseUrl) {
          const resp = await fetch(baseUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
          success = resp.ok || resp.status === 404;
          message = success ? `Video API erreichbar (${resp.status})` : `${resp.status} ${resp.statusText}`;
        } else {
          message = 'Kein Test möglich — baseUrl fehlt';
        }
      }

    } else if (provider.type === 'FACE_RECOGNITION') {
      // Face recognition uses local face-api.js — no external API to test
      success = true;
      message = 'Face Recognition nutzt lokale face-api.js (kein externer API-Call nötig)';

    } else if (provider.type === 'STT') {
      // Speech-to-Text: try OpenAI-compatible /models or Whisper endpoint
      const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
      const resp = await fetch(`${baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      success = resp.ok;
      message = success ? `STT API erreichbar (${resp.status})` : `${resp.status} ${resp.statusText}`;

    } else if (provider.type === 'TTS') {
      // Text-to-Speech: try OpenAI-compatible /models endpoint
      const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
      const resp = await fetch(`${baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      success = resp.ok;
      message = success ? `TTS API erreichbar (${resp.status})` : `${resp.status} ${resp.statusText}`;

    } else {
      // Unknown provider type — try generic auth check if baseUrl is set
      const baseUrl = provider.baseUrl;
      if (baseUrl) {
        const resp = await fetch(baseUrl, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        success = resp.ok;
        message = success ? `API erreichbar (${resp.status})` : `${resp.status} ${resp.statusText}`;
      } else {
        message = `Unbekannter Provider-Typ: ${provider.type}`;
      }
    }

    const durationMs = Date.now() - startTime;

    await prisma.aiUsageLog.create({
      data: {
        providerId: provider.id,
        feature: 'connection_test',
        model: model || undefined,
        durationMs,
        success,
        errorMessage: success ? undefined : message,
      },
    });

    res.json({ success, message, durationMs });
  } catch (error: any) {
    logger.error('Error testing AI provider:', error);
    res.json({
      success: false,
      message: error.message || 'Verbindungstest fehlgeschlagen',
      durationMs: 0,
    });
  }
});

// ─── AI Usage Stats & Cost Aggregation ────────────────────────────────────────

/**
 * GET /admin/ai-providers/usage-stats
 * Returns aggregated usage statistics and average costs per feature
 * Used for self-learning energy cost recommendations
 */
router.get('/usage-stats', async (_req: AuthRequest, res: Response) => {
  try {
    // Aggregate costs per feature (last 30 days)
    const stats = await prisma.$queryRaw<Array<{
      feature: string;
      totalCalls: bigint;
      successfulCalls: bigint;
      avgCostCents: number;
      totalCostCents: number;
      avgDurationMs: number;
      avgInputTokens: number;
      avgOutputTokens: number;
    }>>`
      SELECT 
        feature,
        COUNT(*) as "totalCalls",
        COUNT(*) FILTER (WHERE success = true) as "successfulCalls",
        AVG(CASE WHEN success = true THEN "costCents" ELSE NULL END) as "avgCostCents",
        SUM(CASE WHEN success = true THEN "costCents" ELSE 0 END) as "totalCostCents",
        AVG(CASE WHEN success = true THEN "durationMs" ELSE NULL END) as "avgDurationMs",
        AVG(CASE WHEN success = true THEN "inputTokens" ELSE NULL END) as "avgInputTokens",
        AVG(CASE WHEN success = true THEN "outputTokens" ELSE NULL END) as "avgOutputTokens"
      FROM ai_usage_logs
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY feature
      ORDER BY "totalCalls" DESC
    `;

    // Convert bigints to numbers and calculate recommended energy
    const ENERGY_TO_USD = 0.002; // 1⚡ = 0.2 Cent = 0.002 USD
    const MARGIN = 1.2;

    const result = stats.map(s => {
      const avgCostUsd = (s.avgCostCents || 0) / 100;
      const recommendedEnergy = Math.max(1, Math.round((avgCostUsd / ENERGY_TO_USD) * MARGIN));
      
      return {
        feature: s.feature,
        totalCalls: Number(s.totalCalls),
        successfulCalls: Number(s.successfulCalls),
        successRate: Number(s.totalCalls) > 0 
          ? (Number(s.successfulCalls) / Number(s.totalCalls) * 100).toFixed(1) + '%'
          : '0%',
        avgCostCents: Number((s.avgCostCents || 0).toFixed(4)),
        avgCostUsd: Number(avgCostUsd.toFixed(6)),
        totalCostUsd: Number(((s.totalCostCents || 0) / 100).toFixed(2)),
        avgDurationMs: Math.round(s.avgDurationMs || 0),
        avgInputTokens: Math.round(s.avgInputTokens || 0),
        avgOutputTokens: Math.round(s.avgOutputTokens || 0),
        recommendedEnergy,
      };
    });

    // Also return total stats
    const totals = await prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      _count: true,
      _sum: { costCents: true },
    });

    res.json({
      period: '30 days',
      features: result,
      totals: {
        totalCalls: totals._count,
        totalCostUsd: Number(((totals._sum.costCents || 0) / 100).toFixed(2)),
      },
    });
  } catch (err) {
    logger.error('Failed to get AI usage stats', err);
    res.status(500).json({ error: 'Failed to load usage stats' });
  }
});

// GET /api/admin/ai-providers/monitoring — Per-provider health: latency, error rate, volume, last seen
router.get('/monitoring', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const hours = parseInt(req.query.hours as string) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const providers = await prisma.aiProvider.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: { id: true, slug: true, name: true, type: true, isActive: true, isDefault: true },
    });

    const [perProvider, lastSeen, p95Raw] = await Promise.all([
      prisma.aiUsageLog.groupBy({
        by: ['providerId'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        _avg: { durationMs: true },
        _sum: { costCents: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ['providerId'],
        _max: { createdAt: true },
      }),
      prisma.$queryRaw<Array<{ providerId: string; p50: number; p95: number }>>`
        SELECT
          "providerId",
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "durationMs") AS p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "durationMs") AS p95
        FROM ai_usage_logs
        WHERE "createdAt" >= ${since} AND "durationMs" IS NOT NULL
        GROUP BY "providerId"
      `,
    ]);

    const errorsPerProvider = await prisma.aiUsageLog.groupBy({
      by: ['providerId'],
      where: { createdAt: { gte: since }, success: false },
      _count: { id: true },
    });

    const p95Map: Record<string, { p50: number; p95: number }> = {};
    for (const r of p95Raw as any[]) {
      p95Map[r.providerId] = { p50: Math.round(Number(r.p50) || 0), p95: Math.round(Number(r.p95) || 0) };
    }

    const lastSeenMap: Record<string, Date | null> = {};
    for (const r of lastSeen) lastSeenMap[r.providerId] = r._max.createdAt;

    const stats = providers.map((p) => {
      const usage = perProvider.find((u) => u.providerId === p.id);
      const errors = errorsPerProvider.find((e) => e.providerId === p.id);
      const total = usage?._count?.id ?? 0;
      const errCount = errors?._count?.id ?? 0;
      const latency = p95Map[p.id] || { p50: 0, p95: 0 };
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        type: p.type,
        isActive: p.isActive,
        isDefault: p.isDefault,
        period: { hours },
        requests: total,
        errors: errCount,
        errorRatePct: total > 0 ? Math.round((errCount / total) * 1000) / 10 : 0,
        avgLatencyMs: Math.round(usage?._avg?.durationMs ?? 0),
        p50LatencyMs: latency.p50,
        p95LatencyMs: latency.p95,
        totalCostCents: usage?._sum?.costCents ?? 0,
        lastSeenAt: lastSeenMap[p.id] ?? null,
        status: !p.isActive ? 'DISABLED' : total === 0 ? 'IDLE' : errCount / Math.max(total, 1) > 0.5 ? 'DEGRADED' : 'OK',
      };
    });

    res.json({ providers: stats, period: { hours, since } });
  } catch (error: any) {
    logger.error('Provider monitoring error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

export default router;
