import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};

  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [rawKey, ...rawValue] = part.split('=');
    const key = (rawKey || '').trim();
    if (!key) continue;
    const value = rawValue.join('=').trim();
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function getEventAccessCookieName(eventId: string) {
  return `event_access_${eventId}`;
}

function getJwtSecret(): string | null {
  return process.env.JWT_SECRET || null;
}

function getInviteJwtSecret(): string | null {
  return process.env.INVITE_JWT_SECRET || process.env.JWT_SECRET || null;
}

function getInviteTokenFromRequest(req: Request): string | null {
  const q = (req as any)?.query;
  const inviteFromQuery = typeof q?.invite === 'string' ? q.invite : null;
  const inviteFromHeader = typeof req.headers['x-invite-token'] === 'string' ? (req.headers['x-invite-token'] as string) : null;
  return inviteFromQuery || inviteFromHeader || null;
}

function hasInviteAccess(req: Request, eventId: string): boolean {
  const secret = getInviteJwtSecret();
  if (!secret) return false;

  const token = getInviteTokenFromRequest(req);
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, secret) as any;
    const t = decoded?.type;
    const okType = t === 'invite' || t === 'event_invite';
    return okType && decoded?.eventId === eventId;
  } catch {
    return false;
  }
}

export function issueEventAccessCookie(res: Response, eventId: string) {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    throw new Error('Server misconfigured: JWT_SECRET is missing');
  }

  const ttlSeconds = Number(process.env.EVENT_ACCESS_TTL_SECONDS || 60 * 60 * 12); // 12h
  const token = jwt.sign(
    { eventId, type: 'event_access' },
    jwtSecret,
    { expiresIn: ttlSeconds }
  );

  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  res.cookie(getEventAccessCookieName(eventId), token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain,
    maxAge: ttlSeconds * 1000,
    path: '/',
  });
}

export function hasEventAccess(req: Request, eventId: string): boolean {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) return false;

  const cookies = parseCookies(req);
  const token = cookies[getEventAccessCookieName(eventId)];
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    return decoded?.type === 'event_access' && decoded?.eventId === eventId;
  } catch {
    return false;
  }
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is missing' });
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      role: string;
    };

    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return next();

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return next();

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      role: string;
    };

    req.userId = decoded.userId;
    req.userRole = decoded.role;
  } catch {
    // Ignore invalid token for optional auth
  }
  next();
};

export const requireEventAccess = (getEventId: (req: Request) => string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const eventId = getEventId(req);
    if (!eventId) {
      return res.status(400).json({ error: 'EventId fehlt' });
    }

    // If a user is authenticated (JWT), let the route handler decide whether they
    // are the host / have permissions for this event.
    if (req.userId) {
      return next();
    }

    // Host JWT access is checked in handlers where event.hostId is known.
    // Here we enforce at least an event access cookie for guests.
    if (hasEventAccess(req, eventId)) {
      return next();
    }

    // Allow short-lived invite tokens to bootstrap an event access cookie
    if (hasInviteAccess(req, eventId)) {
      try {
        issueEventAccessCookie(res, eventId);
      } catch {
        // ignore cookie issuance errors
      }
      return next();
    }

    return res.status(404).json({ error: 'Event nicht gefunden' });
  };
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

