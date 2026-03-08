import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { auditLog, AuditType } from '../services/auditLogger';

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
    return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  }

  // Prevent impersonating admins and superadmins
  if (target.role === 'ADMIN' || target.role === 'SUPERADMIN') {
    return res.status(403).json({ error: 'Cannot impersonate another admin or superadmin' });
  }

  const ttlSeconds = data.expiresInSeconds ?? 60 * 15;

  const ipHashSecret = String(process.env.IP_HASH_SECRET || process.env.JWT_SECRET || '').trim();
  const effectiveHashSecret = ipHashSecret || 'dev-ip-hash-secret';
  const ipHash = crypto
    .createHash('sha256')
    .update(`${req.ip || 'unknown'}|${effectiveHashSecret}`)
    .digest('hex');

  const userAgent = (req.get('user-agent') || '').slice(0, 500) || null;

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

  auditLog({ type: AuditType.ADMIN_IMPERSONATION, message: `Admin impersoniert User: ${target.email}`, data: { targetUserId: target.id, targetEmail: target.email, reason: data.reason, ttlSeconds }, req });

  res.json({
    token,
    expiresInSeconds: ttlSeconds,
    user: target,
  });

  try {
    await prisma.impersonationAuditLog.create({
      data: {
        adminUserId: req.userId as string,
        targetUserId: target.id,
        reason: data.reason || null,
        ttlSeconds,
        ipHash,
        userAgent,
      },
    });
  } catch {
    // ignore audit errors
  }
});

// Alias: /generate — accepts email + ttlMinutes (used by admin dashboard UI)
const generateSchema = z.object({
  email: z.string().email(),
  reason: z.string().trim().min(1).max(200).optional(),
  ttlMinutes: z.coerce.number().int().positive().max(120).optional(),
});

router.post('/generate', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is missing' });
  }

  const data = generateSchema.parse(req.body);

  const target = await prisma.user.findFirst({
    where: { email: { equals: data.email, mode: 'insensitive' } },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!target) {
    return res.status(404).json({ error: 'User nicht gefunden' });
  }

  if (target.role === 'ADMIN' || target.role === 'SUPERADMIN') {
    return res.status(403).json({ error: 'Kann keinen anderen Admin oder Superadmin impersonieren' });
  }

  const ttlSeconds = (data.ttlMinutes ?? 30) * 60;

  const ipHashSecret = String(process.env.IP_HASH_SECRET || process.env.JWT_SECRET || '').trim();
  const effectiveHashSecret = ipHashSecret || 'dev-ip-hash-secret';
  const ipHash = crypto
    .createHash('sha256')
    .update(`${req.ip || 'unknown'}|${effectiveHashSecret}`)
    .digest('hex');

  const userAgent = (req.get('user-agent') || '').slice(0, 500) || null;

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

  auditLog({ type: AuditType.ADMIN_IMPERSONATION, message: `Admin impersoniert User: ${target.email}`, data: { targetUserId: target.id, targetEmail: target.email, reason: data.reason, ttlSeconds }, req });

  res.json({
    token,
    expiresInSeconds: ttlSeconds,
    user: target,
  });

  try {
    await prisma.impersonationAuditLog.create({
      data: {
        adminUserId: req.userId as string,
        targetUserId: target.id,
        reason: data.reason || null,
        ttlSeconds,
        ipHash,
        userAgent,
      },
    });
  } catch {
    // ignore audit errors
  }
});

export default router;
