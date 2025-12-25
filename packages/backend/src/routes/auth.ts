import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { toASCII } from 'node:punycode';
import prisma from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { verifyWordPressUser, WordPressAuthUnavailableError } from '../config/wordpress';
import { logger } from '../utils/logger';

const router = Router();

function normalizeEmailForAuth(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  const raw = input.trim();
  const at = raw.lastIndexOf('@');
  if (at <= 0 || at === raw.length - 1) return raw;

  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);

  try {
    const asciiDomain = toASCII(domain);
    return `${local}@${asciiDomain}`;
  } catch {
    return raw;
  }
}

// Validation schemas
const registerSchema = z.object({
  email: z.preprocess(normalizeEmailForAuth, z.string().email()),
  name: z.string().min(1),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.preprocess(normalizeEmailForAuth, z.string().email()),
  password: z.string(),
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
router.post('/register', async (req: Request, res: Response) => {
  if (process.env.ALLOW_SELF_REGISTER !== 'true') {
    return res.status(403).json({ error: 'Registration disabled' });
  }

  try {
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
      process.env.JWT_SECRET || 'secret',
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
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    logger.info('[auth] login attempt', { email: data.email });

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    const localPasswordOk = user ? await bcrypt.compare(data.password, user.password) : false;

    logger.info('[auth] login local check', {
      email: data.email,
      hasLocalUser: !!user,
      localPasswordOk,
      localRole: user?.role,
    });

    let effectiveUser = user;
    if (!localPasswordOk) {
      try {
        const wpUser = await verifyWordPressUser(data.email, data.password);
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

    // Generate token
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
    const token = jwt.sign(
      { userId: effectiveUser.id, role: effectiveUser.role },
      process.env.JWT_SECRET || 'secret',
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

