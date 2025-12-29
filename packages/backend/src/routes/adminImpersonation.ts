import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const issueTokenSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(1).max(200).optional(),
  expiresInSeconds: z.coerce.number().int().positive().max(60 * 60).optional(), // <= 1h
});

router.post('/token', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is missing' });
  }

  const data = issueTokenSchema.parse(req.body);

  const target = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }

  const ttlSeconds = data.expiresInSeconds ?? 60 * 15;

  const token = jwt.sign(
    {
      userId: target.id,
      role: target.role,
      impersonatedBy: req.userId,
      type: 'impersonation',
      reason: data.reason || undefined,
    },
    jwtSecret,
    { expiresIn: ttlSeconds }
  );

  res.json({
    token,
    expiresInSeconds: ttlSeconds,
    user: target,
  });
});

export default router;
