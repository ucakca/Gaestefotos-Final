import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { encryptValue, decryptValue } from '../utils/encryption';
import { z } from 'zod';

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

    const safe = providers.map(p => ({
      ...p,
      apiKeyEncrypted: undefined,
      apiKeyIv: undefined,
      apiKeyTag: undefined,
      hasApiKey: !!(p.apiKeyEncrypted && p.apiKeyIv && p.apiKeyTag),
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

    if (!provider.apiKeyEncrypted || !provider.apiKeyIv || !provider.apiKeyTag) {
      return res.status(400).json({ error: 'Kein API Key konfiguriert' });
    }

    const apiKey = decryptValue({
      encrypted: provider.apiKeyEncrypted,
      iv: provider.apiKeyIv,
      tag: provider.apiKeyTag,
    });

    const startTime = Date.now();
    let success = false;
    let message = '';
    let model = provider.defaultModel || '';

    if (provider.type === 'LLM') {
      if (provider.slug === 'groq' || provider.slug.includes('groq')) {
        const { default: Groq } = await import('groq-sdk');
        const client = new Groq({ apiKey });
        const completion = await client.chat.completions.create({
          model: model || 'llama-3.1-70b-versatile',
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
            model: model || 'grok-2-latest',
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
      } else {
        message = 'Test für diesen Provider-Typ nicht implementiert';
      }
    } else {
      message = 'Test für diesen Provider-Typ nicht implementiert';
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

export default router;
