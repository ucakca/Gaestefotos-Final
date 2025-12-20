import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { randomString, slugify } from '@gaestefotos/shared';

const router = Router();

function parseCookies(req: any): Record<string, string> {
  const header = req?.headers?.cookie;
  if (!header) return {};

  const out: Record<string, string> = {};
  for (const part of String(header).split(';')) {
    const [rawKey, ...rawValue] = part.split('=');
    const key = (rawKey || '').trim();
    if (!key) continue;
    const value = rawValue.join('=').trim();
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function getInvitationAccessCookieName(invitationId: string) {
  return `invitation_access_${invitationId}`;
}

function issueInvitationAccessCookie(res: Response, invitationId: string) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('Server misconfigured: JWT_SECRET is missing');
  }

  const ttlSeconds = Number(process.env.INVITATION_ACCESS_TTL_SECONDS || 60 * 60 * 12); // 12h
  const token = jwt.sign({ invitationId, type: 'invitation_access' }, jwtSecret, { expiresIn: ttlSeconds });

  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  res.cookie(getInvitationAccessCookieName(invitationId), token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain,
    maxAge: ttlSeconds * 1000,
    path: '/',
  });
}

function hasInvitationAccess(req: any, invitationId: string): boolean {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return false;
  const cookies = parseCookies(req);
  const token = cookies[getInvitationAccessCookieName(invitationId)];
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    return decoded?.type === 'invitation_access' && decoded?.invitationId === invitationId;
  } catch {
    return false;
  }
}

function getFrontendBaseUrl(): string {
  return process.env.FRONTEND_URL || process.env.PUBLIC_URL || '';
}

function getShortLinkBaseUrl(): string {
  return process.env.SHORTLINK_BASE_URL || getFrontendBaseUrl();
}

function getClientIp(req: any): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim().length > 0) {
    return xf.split(',')[0].trim();
  }
  if (Array.isArray(xf) && xf.length > 0) {
    return String(xf[0]);
  }
  return req.ip || req.connection?.remoteAddress || '';
}

function hashIp(ip: string): string | null {
  if (!ip) return null;
  const secret = process.env.INVITATION_IP_HASH_SECRET || process.env.JWT_SECRET || '';
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(ip).digest('hex');
}

function generateShortCode(): string {
  // URL-safe; keep short. randomString comes from shared util.
  return randomString(7)
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 7);
}

async function getUniqueInvitationSlug(eventId: string, preferred: string): Promise<string> {
  const base = preferred.trim().length > 0 ? preferred : `invite-${randomString(6).toLowerCase()}`;
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? base : `${base}-${randomString(4).toLowerCase()}`;
    const existing = await prisma.invitation.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
  }
  return `invite-${eventId.slice(0, 6)}-${randomString(10).toLowerCase()}`;
}

async function getUniqueShortCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = generateShortCode();
    const existing = await prisma.invitationShortLink.findUnique({ where: { code: candidate } });
    if (!existing) return candidate;
  }
  return randomString(12).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
}

function serializeInvitation(inv: any) {
  return {
    id: inv.id,
    eventId: inv.eventId,
    slug: inv.slug,
    name: inv.name,
    config: inv.config,
    visibility: inv.visibility,
    isActive: inv.isActive,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
    hasPassword: !!inv.passwordHash,
  };
}

function serializeShortLink(sl: any) {
  return {
    id: sl.id,
    invitationId: sl.invitationId,
    code: sl.code,
    channel: sl.channel,
    createdAt: sl.createdAt,
    lastAccessedAt: sl.lastAccessedAt,
    url: `${getShortLinkBaseUrl()}/s/${sl.code}`,
  };
}

const createInvitationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/).optional(),
  templateId: z.string().optional(),
  config: z.record(z.any()).optional(),
  password: z.string().min(1).max(200).optional().nullable(),
  visibility: z.enum(['UNLISTED', 'PUBLIC']).optional(),
});

const updateInvitationSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.any()).optional(),
  password: z.string().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
  visibility: z.enum(['UNLISTED', 'PUBLIC']).optional(),
});

const createInvitationShortLinkSchema = z.object({
  channel: z.string().max(40).optional().nullable(),
});

const publicGetSchema = z.object({
  password: z.string().max(200).optional(),
});

const rsvpSchema = z.object({
  status: z.enum(['YES', 'NO', 'MAYBE']),
  name: z.string().max(120).optional().nullable(),
  password: z.string().max(200).optional().nullable(),
});

function toIcsDateUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeIcsText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function buildInvitationIcs(opts: { title: string; start: Date; location?: string | null; description?: string | null; url?: string | null }): string {
  const dtStamp = toIcsDateUtc(new Date());
  const dtStart = toIcsDateUtc(opts.start);
  const dtEnd = toIcsDateUtc(new Date(opts.start.getTime() + 2 * 60 * 60 * 1000));
  const uid = `${crypto.randomUUID()}@gaestefotos`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gaestefotos//Invitation//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(opts.title)}`,
  ];

  if (opts.location) {
    lines.push(`LOCATION:${escapeIcsText(opts.location)}`);
  }
  if (opts.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(opts.description)}`);
  }
  if (opts.url) {
    lines.push(`URL:${escapeIcsText(opts.url)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

// Host: list invitations for event
router.get('/events/:eventId/invitations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const invitations = await prisma.invitation.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        shortLinks: { orderBy: { createdAt: 'desc' } },
        _count: { select: { visits: true, rsvps: true } },
      },
    });

    return res.json({
      invitations: invitations.map((i: any) => ({
        ...serializeInvitation(i),
        shortLinks: (i.shortLinks || []).map(serializeShortLink),
        opens: i._count?.visits ?? 0,
      })),
    });
  } catch (error) {
    logger.error('List invitations error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Host: create a new shortlink for invitation
router.post('/events/:eventId/invitations/:invitationId/shortlinks', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, invitationId } = req.params;
    const data = createInvitationShortLinkSchema.parse(req.body || {});

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const invitation = await prisma.invitation.findFirst({ where: { id: invitationId, eventId } });
    if (!invitation) {
      return res.status(404).json({ error: 'Einladung nicht gefunden' });
    }

    const code = await getUniqueShortCode();
    const sl = await prisma.invitationShortLink.create({
      data: {
        invitationId: invitation.id,
        code,
        channel: typeof data.channel === 'string' && data.channel.trim().length > 0 ? data.channel.trim() : 'default',
      },
    });

    return res.status(201).json({ shortLink: serializeShortLink(sl) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Create invitation shortlink error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Host: create invitation
router.post('/events/:eventId/invitations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const data = createInvitationSchema.parse(req.body);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true, title: true, slug: true, dateTime: true, locationName: true, designConfig: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const template = data.templateId
      ? await prisma.invitationTemplate.findFirst({ where: { id: data.templateId, isActive: true } })
      : null;

    const preferredSlug = data.slug || slugify(data.name) || '';
    const invitationSlug = await getUniqueInvitationSlug(eventId, preferredSlug);

    const baseConfig = {
      title: event.title,
      dateTime: event.dateTime,
      locationName: event.locationName,
      design: (event.designConfig as any) || {},
      sections: {
        hero: { enabled: true },
        rsvp: { enabled: true },
        calendar: { enabled: true },
        galleryPreview: { enabled: true },
      },
    };

    const nextConfig = {
      ...baseConfig,
      ...(template?.config ? (template.config as any) : {}),
      ...(data.config || {}),
    };

    const passwordHash = typeof data.password === 'string' && data.password.trim().length > 0
      ? await bcrypt.hash(data.password.trim(), 10)
      : null;

    const created = await prisma.invitation.create({
      data: {
        eventId,
        slug: invitationSlug,
        name: data.name,
        config: nextConfig as any,
        passwordHash,
        visibility: data.visibility || undefined,
      },
    });

    // Default shortlink
    const code = await getUniqueShortCode();
    const sl = await prisma.invitationShortLink.create({
      data: {
        invitationId: created.id,
        code,
        channel: 'default',
      },
    });

    return res.status(201).json({
      invitation: serializeInvitation(created),
      shortLink: serializeShortLink(sl),
      invitationUrl: `${getFrontendBaseUrl()}/i/${created.slug}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Create invitation error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Host: update invitation
router.put('/events/:eventId/invitations/:invitationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, invitationId } = req.params;
    const patch = updateInvitationSchema.parse(req.body);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const existing = await prisma.invitation.findFirst({ where: { id: invitationId, eventId } });
    if (!existing) {
      return res.status(404).json({ error: 'Einladung nicht gefunden' });
    }

    const passwordHash = patch.password === undefined
      ? undefined
      : typeof patch.password === 'string' && patch.password.trim().length > 0
        ? await bcrypt.hash(patch.password.trim(), 10)
        : null;

    const updated = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        name: patch.name,
        config: patch.config as any,
        isActive: patch.isActive,
        passwordHash,
        visibility: patch.visibility,
      },
    });

    return res.json({ invitation: serializeInvitation(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Update invitation error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Public: list PUBLIC invitations for an event (by event slug)
router.get('/events/slug/:slug/invitations/public', async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;

    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        dateTime: true,
        locationName: true,
        deletedAt: true,
        isActive: true,
      },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        eventId: event.id,
        isActive: true,
        visibility: 'PUBLIC',
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
        dateTime: event.dateTime,
        locationName: event.locationName,
      },
      invitations: invitations.map(serializeInvitation),
    });
  } catch (error) {
    logger.error('Public list invitations error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Public: get invitation by slug (password optional)
router.get('/invitations/slug/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const query = publicGetSchema.parse(req.query);

    const invitation = await prisma.invitation.findUnique({
      where: { slug },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            dateTime: true,
            locationName: true,
            deletedAt: true,
            isActive: true,
          },
        },
        shortLinks: { orderBy: { createdAt: 'desc' } },
        _count: { select: { visits: true, rsvps: true } },
      },
    });

    if (!invitation || invitation.event.deletedAt || invitation.event.isActive === false || invitation.isActive === false) {
      return res.status(404).json({ error: 'Einladung nicht gefunden' });
    }

    if (invitation.visibility === 'UNLISTED') {
      // UNLISTED invitations require an access cookie which is issued when resolving a shortlink.
      if (!hasInvitationAccess(req, invitation.id)) {
        return res.status(404).json({ error: 'Einladung nicht gefunden' });
      }
    }

    if (invitation.passwordHash) {
      const provided = typeof query.password === 'string' ? query.password : '';
      if (!provided) {
        return res.status(401).json({ error: 'PASSWORD_REQUIRED' });
      }
      const ok = await bcrypt.compare(provided, invitation.passwordHash);
      if (!ok) {
        return res.status(403).json({ error: 'INVALID_PASSWORD' });
      }
    }

    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;

    await prisma.invitationVisit.create({
      data: {
        invitationId: invitation.id,
        ipHash,
        userAgent: ua,
      },
    });

    const [yesCount, noCount, maybeCount] = await Promise.all([
      prisma.invitationRsvp.count({ where: { invitationId: invitation.id, status: 'YES' } }),
      prisma.invitationRsvp.count({ where: { invitationId: invitation.id, status: 'NO' } }),
      prisma.invitationRsvp.count({ where: { invitationId: invitation.id, status: 'MAYBE' } }),
    ]);

    return res.json({
      invitation: serializeInvitation(invitation),
      shortLinks: invitation.shortLinks.map(serializeShortLink),
      opens: invitation._count?.visits ?? 0,
      rsvp: {
        yes: yesCount,
        no: noCount,
        maybe: maybeCount,
        total: invitation._count?.rsvps ?? 0,
      },
      event: {
        id: invitation.event.id,
        slug: invitation.event.slug,
        title: invitation.event.title,
        dateTime: invitation.event.dateTime,
        locationName: invitation.event.locationName,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Public get invitation error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Public: submit RSVP (YES/NO/MAYBE)
router.post('/invitations/slug/:slug/rsvp', async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const data = rsvpSchema.parse(req.body);

    const invitation = await prisma.invitation.findUnique({
      where: { slug },
      include: {
        event: {
          select: {
            id: true,
            deletedAt: true,
            isActive: true,
          },
        },
      },
    });

    if (!invitation || invitation.event.deletedAt || invitation.event.isActive === false || invitation.isActive === false) {
      return res.status(404).json({ error: 'Einladung nicht gefunden' });
    }

    if (invitation.visibility === 'UNLISTED') {
      if (!hasInvitationAccess(req, invitation.id)) {
        return res.status(404).json({ error: 'Einladung nicht gefunden' });
      }
    }

    if (invitation.passwordHash) {
      const provided = typeof data.password === 'string' ? data.password : '';
      if (!provided) {
        return res.status(401).json({ error: 'PASSWORD_REQUIRED' });
      }
      const ok = await bcrypt.compare(provided, invitation.passwordHash);
      if (!ok) {
        return res.status(403).json({ error: 'INVALID_PASSWORD' });
      }
    }

    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;

    await prisma.invitationRsvp.create({
      data: {
        invitationId: invitation.id,
        status: data.status,
        name: typeof data.name === 'string' && data.name.trim().length > 0 ? data.name.trim() : null,
        ipHash,
        userAgent: ua,
      },
    });

    const [yesCount, noCount, maybeCount] = await Promise.all([
      prisma.invitationRsvp.count({ where: { invitationId: invitation.id, status: 'YES' } }),
      prisma.invitationRsvp.count({ where: { invitationId: invitation.id, status: 'NO' } }),
      prisma.invitationRsvp.count({ where: { invitationId: invitation.id, status: 'MAYBE' } }),
    ]);

    return res.json({
      ok: true,
      rsvp: {
        yes: yesCount,
        no: noCount,
        maybe: maybeCount,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Submit invitation RSVP error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Public: download ICS
router.get('/invitations/slug/:slug/ics', async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const query = publicGetSchema.parse(req.query);

    const invitation = await prisma.invitation.findUnique({
      where: { slug },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            dateTime: true,
            locationName: true,
            deletedAt: true,
            isActive: true,
          },
        },
      },
    });

    if (!invitation || invitation.event.deletedAt || invitation.event.isActive === false || invitation.isActive === false) {
      return res.status(404).json({ error: 'Einladung nicht gefunden' });
    }

    if (invitation.visibility === 'UNLISTED') {
      if (!hasInvitationAccess(req, invitation.id)) {
        return res.status(404).json({ error: 'Einladung nicht gefunden' });
      }
    }

    if (invitation.passwordHash) {
      const provided = typeof query.password === 'string' ? query.password : '';
      if (!provided) {
        return res.status(401).json({ error: 'PASSWORD_REQUIRED' });
      }
      const ok = await bcrypt.compare(provided, invitation.passwordHash);
      if (!ok) {
        return res.status(403).json({ error: 'INVALID_PASSWORD' });
      }
    }

    const config = (invitation.config as any) || {};
    const title = String(config.title || invitation.event.title || 'Einladung');
    const dateTimeRaw = config.dateTime || invitation.event.dateTime;
    const start = dateTimeRaw ? new Date(dateTimeRaw) : null;
    if (!start || Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: 'DATE_TIME_MISSING' });
    }

    const locationName = (config.locationName as any) || invitation.event.locationName || null;
    const baseUrl = getFrontendBaseUrl();
    const url = baseUrl ? `${baseUrl}/i/${invitation.slug}` : null;

    const ics = buildInvitationIcs({
      title,
      start,
      location: locationName,
      description: 'Einladung via Gästefotos',
      url,
    });

    const filename = `einladung-${invitation.slug}.ics`;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(ics);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Invitation ICS error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Public: resolve shortlink, track, and return invitation slug + metadata
router.get('/shortlinks/:code', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;

    const sl = await prisma.invitationShortLink.findUnique({
      where: { code },
      include: {
        invitation: {
          include: {
            event: {
              select: {
                id: true,
                slug: true,
                title: true,
                dateTime: true,
                locationName: true,
                deletedAt: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!sl || !sl.invitation || sl.invitation.isActive === false || sl.invitation.event.deletedAt || sl.invitation.event.isActive === false) {
      return res.status(404).json({ error: 'Link nicht gefunden' });
    }

    try {
      issueInvitationAccessCookie(res, sl.invitationId);
    } catch {
      // ignore cookie issuance errors
    }

    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;

    await Promise.all([
      prisma.invitationVisit.create({
        data: {
          invitationId: sl.invitationId,
          shortLinkId: sl.id,
          ipHash,
          userAgent: ua,
        },
      }),
      prisma.invitationShortLink.update({
        where: { id: sl.id },
        data: { lastAccessedAt: new Date() },
      }),
    ]);

    return res.json({
      code: sl.code,
      invitationSlug: sl.invitation.slug,
      invitationUrl: `${getFrontendBaseUrl()}/i/${sl.invitation.slug}`,
      event: {
        title: sl.invitation.event.title,
        dateTime: sl.invitation.event.dateTime,
        locationName: sl.invitation.event.locationName,
      },
    });
  } catch (error) {
    logger.error('Resolve shortlink error', { message: (error as any)?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
