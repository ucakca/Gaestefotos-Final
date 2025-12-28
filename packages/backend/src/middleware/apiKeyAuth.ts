import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';

export interface ApiKeyAuthRequest extends Request {
  apiKeyId?: string;
  apiKeyScopes?: string[];
}

function getApiKeyFromRequest(req: Request): string | null {
  const header = req.headers['x-api-key'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  return null;
}

const IS_PROD = process.env.NODE_ENV === 'production';

function getApiKeyPepper(): string {
  const pepper = process.env.API_KEY_PEPPER || process.env.JWT_SECRET || '';
  if (IS_PROD && !pepper) {
    throw new Error('Server misconfigured: API_KEY_PEPPER (or at least JWT_SECRET) must be set in production');
  }
  return pepper || 'dev-pepper';
}

function getIpHashSecret(): string {
  const secret = process.env.IP_HASH_SECRET || process.env.JWT_SECRET || '';
  if (IS_PROD && !secret) {
    throw new Error('Server misconfigured: IP_HASH_SECRET (or at least JWT_SECRET) must be set in production');
  }
  return secret || 'dev-ip-hash-secret';
}

function hashApiKey(rawKey: string): string {
  const pepper = getApiKeyPepper();
  return crypto.createHash('sha256').update(`${pepper}|${rawKey}`).digest('hex');
}

function hashIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const secret = getIpHashSecret();
  return crypto.createHash('sha256').update(`${ip}|${secret}`).digest('hex');
}

export function requireApiKey(requiredScopes: string[] = []) {
  return async (req: ApiKeyAuthRequest, res: Response, next: NextFunction) => {
    const rawKey = getApiKeyFromRequest(req);
    if (!rawKey) {
      return res.status(401).json({ error: 'Unauthorized: Missing API key' });
    }

    const keyHash = hashApiKey(rawKey);
    const prefix = rawKey.slice(0, 10);

    const apiKey = await (prisma as any).apiKey.findFirst({
      where: {
        OR: [{ keyHash }, { prefix }],
        status: 'ACTIVE',
      },
    });

    if (!apiKey) {
      try {
        await (prisma as any).apiKeyAuditLog.create({
          data: {
            action: 'FAILED',
            scope: requiredScopes.length ? requiredScopes.join(',') : null,
            path: req.path,
            ipHash: hashIp(req.ip),
            userAgent: req.get('user-agent') || undefined,
            message: 'unknown_api_key',
          },
        });
      } catch {
        // ignore audit errors
      }
      return res.status(403).json({ error: 'Forbidden: Invalid API key' });
    }

    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
      await (prisma as any).apiKey.update({ where: { id: apiKey.id }, data: { status: 'EXPIRED' } }).catch(() => undefined);
      return res.status(403).json({ error: 'Forbidden: API key expired' });
    }

    const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes : [];
    const hasAllScopes = requiredScopes.every((s) => scopes.includes(s));
    if (!hasAllScopes) {
      await (prisma as any).apiKeyAuditLog
        .create({
          data: {
            apiKeyId: apiKey.id,
            action: 'FAILED',
            scope: requiredScopes.length ? requiredScopes.join(',') : null,
            path: req.path,
            ipHash: hashIp(req.ip),
            userAgent: req.get('user-agent') || undefined,
            message: 'missing_scope',
          },
        })
        .catch(() => undefined);

      return res.status(403).json({ error: 'Forbidden: Missing scope' });
    }

    await (prisma as any).apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    await (prisma as any).apiKeyAuditLog
      .create({
        data: {
          apiKeyId: apiKey.id,
          action: 'USED',
          scope: requiredScopes.length ? requiredScopes.join(',') : null,
          path: req.path,
          ipHash: hashIp(req.ip),
          userAgent: req.get('user-agent') || undefined,
        },
      })
      .catch(() => undefined);

    req.apiKeyId = apiKey.id;
    req.apiKeyScopes = scopes;
    next();
  };
}

export function generateApiKey(): { rawKey: string; prefix: string; keyHash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const rawKey = `gf_${raw}`;
  const prefix = rawKey.slice(0, 10);
  return { rawKey, prefix, keyHash: hashApiKey(rawKey) };
}
