import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const createSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['BASE', 'UPGRADE']).optional(),
  resultingTier: z.string().min(1),
  upgradeFromTier: z.string().min(1).optional().nullable(),
  storageLimitBytes: z.union([z.number().int().nonnegative(), z.string()]).optional().nullable(),
  storageDurationDays: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

function toBigIntOrNull(value: unknown): bigint | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string' && value.trim() !== '') return BigInt(value);
  return null;
}

function serializePackage(pkg: any) {
  return {
    ...pkg,
    storageLimitBytes: pkg?.storageLimitBytes === null || pkg?.storageLimitBytes === undefined ? pkg?.storageLimitBytes : pkg.storageLimitBytes.toString(),
  };
}

router.get('/', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const packages = await prisma.packageDefinition.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json({ packages: packages.map(serializePackage) });
});

router.post('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const data = createSchema.parse(req.body);
  const created = await prisma.packageDefinition.create({
    data: {
      sku: data.sku,
      name: data.name,
      type: data.type || 'BASE',
      resultingTier: data.resultingTier,
      upgradeFromTier: data.upgradeFromTier ?? null,
      storageLimitBytes: toBigIntOrNull(data.storageLimitBytes),
      storageDurationDays: data.storageDurationDays ?? null,
      isActive: data.isActive ?? true,
    },
  });
  res.status(201).json({ package: serializePackage(created) });
});

router.put('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const patch = updateSchema.parse(req.body);

  const updated = await prisma.packageDefinition.update({
    where: { id },
    data: {
      sku: patch.sku,
      name: patch.name,
      type: patch.type,
      resultingTier: patch.resultingTier,
      upgradeFromTier: patch.upgradeFromTier === undefined ? undefined : patch.upgradeFromTier,
      storageLimitBytes: toBigIntOrNull(patch.storageLimitBytes),
      storageDurationDays: patch.storageDurationDays === undefined ? undefined : patch.storageDurationDays,
      isActive: patch.isActive,
    },
  });

  res.json({ package: serializePackage(updated) });
});

router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updated = await prisma.packageDefinition.update({
    where: { id },
    data: { isActive: false },
  });
  res.json({ success: true, package: serializePackage(updated) });
});

export default router;
