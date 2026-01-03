import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { domainToASCII } from 'node:url';
import prisma from '../config/database';
import {
  authLimiter,
  passwordLimiter,
  twoFactorSetupLimiter,
  twoFactorVerifyLimiter,
  wordpressSsoLimiter,
} from '../middleware/rateLimit';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { getWordPressUserById, verifyWordPressUser, WordPressAuthUnavailableError } from '../config/wordpress';
import { logger } from '../utils/logger';
import {
  buildOtpAuthUrl,
  buildRecoveryCodesPayload,
  consumeRecoveryCode,
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecretBase32,
  verifyTotp,
} from '../utils/twoFactor';

const router = Router();

function isValidEmailLoose(email: string): boolean {
  // Accept unicode domains (e.g. gäste…) without rewriting to punycode.
  // We only enforce minimal sanity: local@domain.tld with no spaces.
  const trimmed = email.trim();
  if (!trimmed) return false;
  if (/\s/.test(trimmed)) return false;
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return false;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!local || !domain) return false;
  if (!domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  return true;
}

function getTwoFactorIssuer(): string {
  return String(process.env.TWO_FACTOR_ISSUER || 'Gästefotos').trim() || 'Gästefotos';
}

function signTwoFactorChallengeToken(params: { userId: string; role: string; purpose: '2fa' | '2fa_setup' }): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('Server misconfigured: JWT_SECRET is missing');
  }

  return jwt.sign(
    { userId: params.userId, role: params.role, purpose: params.purpose },
    jwtSecret,
    { expiresIn: '10m' }
  );
}

function verifyTwoFactorChallengeToken(token: string): { userId: string; role: string; purpose: '2fa' | '2fa_setup' } {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('Server misconfigured: JWT_SECRET is missing');
  }

  const decoded = jwt.verify(token, jwtSecret) as any;
  const purpose = decoded?.purpose;
  const okPurpose = purpose === '2fa' || purpose === '2fa_setup';
  if (!decoded || !okPurpose || typeof decoded.userId !== 'string' || typeof decoded.role !== 'string') {
    throw new Error('Invalid 2FA token');
  }
  return { userId: decoded.userId, role: decoded.role, purpose };
}

const emailSchema = z
  .string()
  .transform((v) => v.trim())
  .refine(isValidEmailLoose, { message: 'Invalid email' });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJitterMs(minMs: number, maxMs: number): number {
  const min = Math.max(0, Math.floor(minMs));
  const max = Math.max(min, Math.floor(maxMs));
  return min + Math.floor(Math.random() * (max - min + 1));
}

router.post('/2fa/verify', passwordLimiter, twoFactorVerifyLimiter, async (req: Request, res: Response) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is missing' });
    }

    const data = twoFactorVerifySchema.parse(req.body);
    const challenge = verifyTwoFactorChallengeToken(data.twoFactorToken);

    if (challenge.purpose !== '2fa') {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        twoFactorEnabled: true,
        twoFactorSecretEncrypted: true,
        twoFactorSecretIv: true,
        twoFactorSecretTag: true,
        twoFactorRecoveryCodesHashed: true,
      },
    });

    if (!user || !user.twoFactorEnabled) {
      return res.status(401).json({ error: '2FA not enabled' });
    }

    let ok = false;
    let nextRecoveryCodes = user.twoFactorRecoveryCodesHashed as any;

    const code = String(data.code || '').trim();
    const recoveryCode = String(data.recoveryCode || '').trim();

    if (recoveryCode) {
      const consumed = consumeRecoveryCode({
        recoveryCodesPayload: (user.twoFactorRecoveryCodesHashed as any) || null,
        code: recoveryCode,
      });
      ok = consumed.ok;
      nextRecoveryCodes = consumed.next;
    } else if (code) {
      if (!user.twoFactorSecretEncrypted || !user.twoFactorSecretIv || !user.twoFactorSecretTag) {
        return res.status(500).json({ error: '2FA misconfigured' });
      }

      const secret = decryptTotpSecret({
        encrypted: user.twoFactorSecretEncrypted,
        iv: user.twoFactorSecretIv,
        tag: user.twoFactorSecretTag,
      });

      ok = verifyTotp({ secretBase32: secret, token: code, window: 1 });
    }

    if (!ok) {
      await sleep(getJitterMs(250, 600));
      logger.warn('[auth] 2fa verify invalid', {
        userId: user.id,
        ip: req.ip,
        usedRecoveryCode: !!recoveryCode,
      });
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    if (recoveryCode) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorRecoveryCodesHashed: nextRecoveryCodes as any,
        },
      });
    }

    logger.info('[auth] 2fa verify ok', {
      userId: user.id,
      ip: req.ip,
      usedRecoveryCode: !!recoveryCode,
    });

    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
    const token = jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn });

    setAuthCookie(res, token, parseJwtExpiresInSeconds(expiresIn));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.warn('[auth] 2fa verify failed', { message: (error as any)?.message || String(error) });
    return res.status(401).json({ error: 'Invalid 2FA token' });
  }
});

router.post('/2fa/setup/start', authMiddleware, requireRole('ADMIN'), twoFactorSetupLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, role: true, twoFactorEnabled: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA already enabled' });
    }

    const secretBase32 = generateTotpSecretBase32();
    const enc = encryptTotpSecret(secretBase32);
    const recoveryCodes = generateRecoveryCodes();
    const recoveryCodesPayload = buildRecoveryCodesPayload(recoveryCodes);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorPending: true,
        twoFactorSecretEncrypted: enc.encrypted,
        twoFactorSecretIv: enc.iv,
        twoFactorSecretTag: enc.tag,
        twoFactorRecoveryCodesHashed: recoveryCodesPayload as any,
      },
    });

    const issuer = getTwoFactorIssuer();
    const otpauthUrl = buildOtpAuthUrl({
      issuer,
      accountName: user.email,
      secretBase32,
    });

    res.json({
      secretBase32,
      otpauthUrl,
      recoveryCodes,
    });

    logger.info('[auth] 2fa setup start', { userId: user.id });
  } catch (error: any) {
    logger.error('[auth] 2fa setup start error', { message: error?.message || String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/2fa/setup/confirm', authMiddleware, requireRole('ADMIN'), twoFactorSetupLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const data = twoFactorConfirmSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorPending: true,
        twoFactorSecretEncrypted: true,
        twoFactorSecretIv: true,
        twoFactorSecretTag: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA already enabled' });
    }
    if (!user.twoFactorPending) {
      return res.status(400).json({ error: '2FA setup not started' });
    }
    if (!user.twoFactorSecretEncrypted || !user.twoFactorSecretIv || !user.twoFactorSecretTag) {
      return res.status(500).json({ error: '2FA misconfigured' });
    }

    const secret = decryptTotpSecret({
      encrypted: user.twoFactorSecretEncrypted,
      iv: user.twoFactorSecretIv,
      tag: user.twoFactorSecretTag,
    });

    const ok = verifyTotp({ secretBase32: secret, token: data.code, window: 1 });
    if (!ok) {
      await sleep(getJitterMs(250, 600));
      logger.warn('[auth] 2fa setup confirm invalid', { userId: user.id, ip: req.ip });
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorPending: false,
        twoFactorSetupAt: new Date(),
      },
    });

    logger.info('[auth] 2fa setup confirm ok', { userId: user.id });
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('[auth] 2fa setup confirm error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

function getEmailAuthCandidates(email: string): string[] {
  const trimmed = email.trim();
  const candidates = new Set<string>();
  candidates.add(trimmed);

  const at = trimmed.lastIndexOf('@');
  if (at > 0 && at < trimmed.length - 1) {
    const local = trimmed.slice(0, at);
    const domain = trimmed.slice(at + 1);
    try {
      const asciiDomain = domainToASCII(domain);
      const asciiEmail = `${local}@${asciiDomain}`;
      candidates.add(asciiEmail);
    } catch {
      // ignore
    }
  }

  return Array.from(candidates);
}

// Validation schemas
const registerSchema = z.object({
  email: emailSchema,
  name: z.string().min(1),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string(),
});

const twoFactorVerifySchema = z.object({
  twoFactorToken: z.string().min(1),
  code: z.string().optional(),
  recoveryCode: z.string().optional(),
});

const twoFactorConfirmSchema = z.object({
  code: z.string().min(6),
});

const twoFactorSetupStartChallengeSchema = z.object({
  twoFactorToken: z.string().min(1),
});

const twoFactorSetupConfirmChallengeSchema = z.object({
  twoFactorToken: z.string().min(1),
  code: z.string().min(6),
});

router.post('/2fa/setup/start-challenge', passwordLimiter, twoFactorSetupLimiter, async (req: Request, res: Response) => {
  try {
    const data = twoFactorSetupStartChallengeSchema.parse(req.body);
    const challenge = verifyTwoFactorChallengeToken(data.twoFactorToken);
    if (challenge.purpose !== '2fa_setup') {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
      select: { id: true, email: true, role: true, twoFactorEnabled: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA already enabled' });
    }

    const secretBase32 = generateTotpSecretBase32();
    const enc = encryptTotpSecret(secretBase32);
    const recoveryCodes = generateRecoveryCodes();
    const recoveryCodesPayload = buildRecoveryCodesPayload(recoveryCodes);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorPending: true,
        twoFactorSecretEncrypted: enc.encrypted,
        twoFactorSecretIv: enc.iv,
        twoFactorSecretTag: enc.tag,
        twoFactorRecoveryCodesHashed: recoveryCodesPayload as any,
      },
    });

    const issuer = getTwoFactorIssuer();
    const otpauthUrl = buildOtpAuthUrl({
      issuer,
      accountName: user.email,
      secretBase32,
    });

    res.json({
      secretBase32,
      otpauthUrl,
      recoveryCodes,
    });

    logger.info('[auth] 2fa setup start (challenge)', { userId: user.id, ip: req.ip });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.warn('[auth] 2fa setup start-challenge failed', { message: (error as any)?.message || String(error) });
    return res.status(401).json({ error: 'Invalid 2FA token' });
  }
});

router.post('/2fa/setup/confirm-challenge', passwordLimiter, twoFactorSetupLimiter, async (req: Request, res: Response) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is missing' });
    }

    const data = twoFactorSetupConfirmChallengeSchema.parse(req.body);
    const challenge = verifyTwoFactorChallengeToken(data.twoFactorToken);
    if (challenge.purpose !== '2fa_setup') {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        twoFactorEnabled: true,
        twoFactorPending: true,
        twoFactorSecretEncrypted: true,
        twoFactorSecretIv: true,
        twoFactorSecretTag: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA already enabled' });
    }
    if (!user.twoFactorPending) {
      return res.status(400).json({ error: '2FA setup not started' });
    }
    if (!user.twoFactorSecretEncrypted || !user.twoFactorSecretIv || !user.twoFactorSecretTag) {
      return res.status(500).json({ error: '2FA misconfigured' });
    }

    const secret = decryptTotpSecret({
      encrypted: user.twoFactorSecretEncrypted,
      iv: user.twoFactorSecretIv,
      tag: user.twoFactorSecretTag,
    });

    const ok = verifyTotp({ secretBase32: secret, token: data.code, window: 1 });
    if (!ok) {
      await sleep(getJitterMs(250, 600));
      logger.warn('[auth] 2fa setup confirm invalid (challenge)', { userId: user.id, ip: req.ip });
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorPending: false,
        twoFactorSetupAt: new Date(),
      },
    });

    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
    const token = jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn });
    setAuthCookie(res, token, parseJwtExpiresInSeconds(expiresIn));

    logger.info('[auth] 2fa setup confirm ok (challenge)', { userId: user.id, ip: req.ip });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.warn('[auth] 2fa setup confirm-challenge failed', { message: (error as any)?.message || String(error) });
    return res.status(401).json({ error: 'Invalid 2FA token' });
  }
});

function parseJwtExpiresInSeconds(expiresIn: any): number {
  // jsonwebtoken supports: number (seconds) or string like '7d', '12h', '30m'
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) return Math.max(0, expiresIn);
  if (typeof expiresIn !== 'string') return 60 * 60 * 24 * 7;

  const trimmed = expiresIn.trim();
  const match = /^([0-9]+)\s*([smhd])$/.exec(trimmed);
  if (!match) return 60 * 60 * 24 * 7;

  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
  };
  return Math.max(0, value * (multipliers[unit] || 1));
}

function setAuthCookie(res: Response, token: string, ttlSeconds: number) {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain,
    maxAge: ttlSeconds * 1000,
    path: '/',
  });
}

function getAppBaseUrl(): string {
  const raw = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean)[0];
  const fallbackUnicode = 'https://app.gästefotos.com';
  const fallback = (() => {
    try {
      const u = new URL(fallbackUnicode);
      const asciiHost = domainToASCII(u.hostname);
      return `${u.protocol}//${asciiHost}${u.port ? `:${u.port}` : ''}`;
    } catch {
      return fallbackUnicode;
    }
  })();

  const candidate = (raw || fallback).replace(/\/$/, '');

  try {
    const u = new URL(candidate);
    const asciiHost = domainToASCII(u.hostname);
    const normalized = `${u.protocol}//${asciiHost}${u.port ? `:${u.port}` : ''}`;

    // Guard against misconfigured FRONTEND_URL that already contains a broken ASCII transformation.
    // Example seen in the wild: app.g00e4stefotos.com
    if (/g00e4/i.test(asciiHost)) {
      return fallback;
    }

    return normalized;
  } catch {
    return candidate;
  }
}

function clearAuthCookie(res: Response) {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain,
    path: '/',
  });
}

// Register
router.post('/register', passwordLimiter, async (req: Request, res: Response) => {
  if (process.env.ALLOW_SELF_REGISTER !== 'true') {
    return res.status(403).json({ error: 'Registration disabled' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is missing' });
    }

    const data = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate token
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn }
    );

    setAuthCookie(res, token, parseJwtExpiresInSeconds(expiresIn));

    res.json({
      user,
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', passwordLimiter, async (req: Request, res: Response) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is missing' });
    }

    const data = loginSchema.parse(req.body);

    const emailCandidates = getEmailAuthCandidates(data.email);

    logger.info('[auth] login attempt', { email: data.email, emailCandidatesCount: emailCandidates.length });

    // Find user
    const user = await prisma.user.findFirst({
      where: { email: { in: emailCandidates } },
    });

    const localPasswordOk = user ? await bcrypt.compare(data.password, user.password) : false;

    logger.info('[auth] login local check', {
      email: data.email,
      hasLocalUser: !!user,
      matchedLocalEmail: user?.email,
      localPasswordOk,
      localRole: user?.role,
    });

    let effectiveUser = user;
    if (!localPasswordOk) {
      try {
        let wpUser: Awaited<ReturnType<typeof verifyWordPressUser>> = null;
        for (const identifier of emailCandidates) {
          wpUser = await verifyWordPressUser(identifier, data.password);
          if (wpUser) break;
        }
        if (!wpUser) {
          logger.info('[auth] login failed (wordpress invalid credentials)', { email: data.email });
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const passwordHash = await bcrypt.hash(data.password, 10);
        const role = wpUser.is_admin ? 'ADMIN' : 'HOST';

        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { wordpressUserId: wpUser.id },
              { email: wpUser.user_email },
            ],
          },
        });

        if (existing) {
          effectiveUser = await prisma.user.update({
            where: { id: existing.id },
            data: {
              email: wpUser.user_email,
              name: wpUser.display_name || wpUser.user_login,
              role: role as any,
              wordpressUserId: wpUser.id,
              password: passwordHash,
            },
          });
        } else {
          effectiveUser = await prisma.user.create({
            data: {
              email: wpUser.user_email,
              name: wpUser.display_name || wpUser.user_login,
              role: role as any,
              wordpressUserId: wpUser.id,
              password: passwordHash,
            },
          });
        }
      } catch (e: any) {
        if (e instanceof WordPressAuthUnavailableError) {
          logger.warn('[auth] wordpress authentication unavailable', { email: data.email, message: e.message });
          return res.status(503).json({ error: 'WordPress authentication unavailable' });
        }
        throw e;
      }
    }

    if (!effectiveUser) {
      logger.info('[auth] login failed (no effective user)', { email: data.email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (effectiveUser.wordpressUserId) {
      try {
        let wpUser: Awaited<ReturnType<typeof verifyWordPressUser>> = null;
        for (const identifier of emailCandidates) {
          wpUser = await verifyWordPressUser(identifier, data.password);
          if (wpUser) break;
        }

        if (wpUser) {
          const nextRole = wpUser.is_admin ? 'ADMIN' : 'HOST';
          if (effectiveUser.role !== nextRole) {
            const previousRole = effectiveUser.role;
            const updated = await prisma.user.update({
              where: { id: effectiveUser.id },
              data: {
                role: nextRole as any,
                email: wpUser.user_email,
                name: wpUser.display_name || wpUser.user_login,
                wordpressUserId: wpUser.id,
              },
            });
            effectiveUser = updated;
            logger.info('[auth] wp role resynced on login', {
              userId: effectiveUser.id,
              from: previousRole,
              to: nextRole,
              wpUserId: wpUser.id,
            });
          }
        }
      } catch (e: any) {
        if (e instanceof WordPressAuthUnavailableError) {
          logger.warn('[auth] wp role resync skipped (wordpress unavailable)', { email: data.email, message: e.message });
        } else {
          logger.warn('[auth] wp role resync failed', { email: data.email, message: e?.message || String(e) });
        }
      }
    }

    const adminMustUse2fa = effectiveUser.role === 'ADMIN';

    if (effectiveUser.twoFactorEnabled) {
      const twoFactorToken = signTwoFactorChallengeToken({
        userId: effectiveUser.id,
        role: effectiveUser.role,
        purpose: '2fa',
      });

      return res.json({
        twoFactorRequired: true,
        twoFactorToken,
        user: {
          id: effectiveUser.id,
          email: effectiveUser.email,
          name: effectiveUser.name,
          role: effectiveUser.role,
          createdAt: effectiveUser.createdAt,
        },
      });
    }

    if (adminMustUse2fa) {
      const twoFactorToken = signTwoFactorChallengeToken({
        userId: effectiveUser.id,
        role: effectiveUser.role,
        purpose: '2fa_setup',
      });

      return res.json({
        twoFactorSetupRequired: true,
        twoFactorToken,
        user: {
          id: effectiveUser.id,
          email: effectiveUser.email,
          name: effectiveUser.name,
          role: effectiveUser.role,
          createdAt: effectiveUser.createdAt,
        },
      });
    }

    // Generate token
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
    const token = jwt.sign(
      { userId: effectiveUser.id, role: effectiveUser.role },
      jwtSecret,
      { expiresIn }
    );

    setAuthCookie(res, token, parseJwtExpiresInSeconds(expiresIn));

    res.json({
      user: {
        id: effectiveUser.id,
        email: effectiveUser.email,
        name: effectiveUser.name,
        role: effectiveUser.role,
        createdAt: effectiveUser.createdAt,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const wordpressSsoSchema = z.object({
  wpUserId: z.union([z.number().int(), z.string()]).transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
  ssoSecret: z.string().optional(),
});

router.post('/wordpress-sso', wordpressSsoLimiter, async (req: Request, res: Response) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is missing' });
    }

    const parsed = wordpressSsoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const wpUserId = parsed.data.wpUserId;
    if (!Number.isFinite(wpUserId) || wpUserId <= 0) {
      return res.status(400).json({ error: 'Invalid wpUserId' });
    }

    const requiredSecret = (process.env.WORDPRESS_SSO_SECRET || '').trim();
    if (requiredSecret) {
      const headerSecret = String(req.get('x-gf-wp-sso-secret') || '').trim();
      const bodySecret = String(parsed.data.ssoSecret || '').trim();
      if (!headerSecret && !bodySecret) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (headerSecret !== requiredSecret && bodySecret !== requiredSecret) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    let user = await prisma.user.findFirst({
      where: { wordpressUserId: wpUserId },
    });

    if (!user) {
      const wpUser = await getWordPressUserById(wpUserId);
      if (!wpUser) {
        return res.status(404).json({ error: 'WordPress user not found' });
      }

      const existing = await prisma.user.findFirst({
        where: { email: wpUser.user_email },
      });

      const role = 'HOST';
      const passwordHash = await bcrypt.hash(jwt.sign({ wpUserId }, jwtSecret, { expiresIn: '15m' }), 10);

      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            email: wpUser.user_email,
            name: wpUser.display_name || wpUser.user_login,
            role: role as any,
            wordpressUserId: wpUserId,
            password: passwordHash,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: wpUser.user_email,
            name: wpUser.display_name || wpUser.user_login,
            role: role as any,
            wordpressUserId: wpUserId,
            password: passwordHash,
          },
        });
      }
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn }
    );

    setAuthCookie(res, token, parseJwtExpiresInSeconds(expiresIn));

    const appUrl = getAppBaseUrl();
    res.json({
      success: true,
      redirectUrl: `${appUrl}/dashboard?token=${encodeURIComponent(token)}`,
      token,
    });
  } catch (error: any) {
    logger.error('wordpress-sso error', { message: error?.message || String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorPending: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

