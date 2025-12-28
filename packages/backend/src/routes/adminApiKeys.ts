import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { generateApiKey } from '../middleware/apiKeyAuth';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string().min(1)).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

router.get('/', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const keys = await (prisma as any).apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      status: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      revokedAt: true,
      createdById: true,
    },
  });

  res.json({ apiKeys: keys });
});

router.post('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const data = createSchema.parse(req.body);
  const { rawKey, prefix, keyHash } = generateApiKey();

  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

  const created = await (prisma as any).apiKey.create({
    data: {
      name: data.name,
      prefix,
      keyHash,
      scopes: data.scopes || [],
      status: 'ACTIVE',
      expiresAt,
      createdById: req.userId || null,
    },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      createdById: true,
    },
  });

  await (prisma as any).apiKeyAuditLog
    .create({
      data: {
        apiKeyId: created.id,
        action: 'CREATED',
        scope: (data.scopes || []).join(',') || null,
        path: req.path,
        ipHash: null,
        userAgent: req.get('user-agent') || undefined,
      },
    })
    .catch(() => undefined);

  res.status(201).json({ apiKey: created, rawKey });
});

router.post('/:id/revoke', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const updated = await (prisma as any).apiKey.update({
    where: { id },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      status: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      revokedAt: true,
      createdById: true,
    },
  });

  await (prisma as any).apiKeyAuditLog
    .create({
      data: {
        apiKeyId: id,
        action: 'REVOKED',
        path: req.path,
        userAgent: req.get('user-agent') || undefined,
      },
    })
    .catch(() => undefined);

  res.json({ apiKey: updated, success: true });
});

export default router;
