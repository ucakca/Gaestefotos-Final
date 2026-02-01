import { Router, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AuthRequest, hasEventAccess, optionalAuthMiddleware } from '../middleware/auth';
import { extractFaceDescriptorFromImage, searchPhotosByFace } from '../services/faceSearch';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import prisma from '../config/database';
import { validateUploadedFile } from '../middleware/uploadSecurity';
import { assertFeatureEnabled } from '../services/featureGate';

const router = Router();

function getJwtSecret(): string {
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (!jwtSecret) {
    throw new Error('Server misconfigured: JWT_SECRET is missing');
  }
  return jwtSecret;
}

function getConsentCookieName(eventId: string): string {
  return `face_search_consent_${eventId}`;
}

function issueConsentCookie(res: Response, eventId: string, consentId: string) {
  const jwtSecret = getJwtSecret();
  const ttlSeconds = Number(process.env.FACE_SEARCH_CONSENT_TTL_SECONDS || 60 * 60 * 12);
  const token = jwt.sign(
    { type: 'face_search_consent', eventId, consentId },
    jwtSecret,
    { expiresIn: ttlSeconds }
  );

  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  res.cookie(getConsentCookieName(eventId), token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain,
    maxAge: ttlSeconds * 1000,
    path: '/',
  });
}

function clearConsentCookie(res: Response, eventId: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  res.cookie(getConsentCookieName(eventId), '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain,
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  });
}

function parseCookies(req: AuthRequest): Record<string, string> {
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

function hasConsent(req: AuthRequest, eventId: string): boolean {
  try {
    const jwtSecret = getJwtSecret();
    const cookies = parseCookies(req);
    const token = cookies[getConsentCookieName(eventId)];
    if (!token) return false;
    const decoded = jwt.verify(token, jwtSecret) as any;
    return decoded?.type === 'face_search_consent' && decoded?.eventId === eventId && !!decoded?.consentId;
  } catch {
    return false;
  }
}

function isDbConsentEnabled(): boolean {
  return process.env.FACE_SEARCH_DB_CONSENT_ENABLED === 'true';
}

function getConsentId(req: AuthRequest, eventId: string): string | null {
  try {
    const jwtSecret = getJwtSecret();
    const cookies = parseCookies(req);
    const token = cookies[getConsentCookieName(eventId)];
    if (!token) return null;
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (decoded?.type !== 'face_search_consent') return null;
    if (decoded?.eventId !== eventId) return null;
    const consentId = String(decoded?.consentId || '').trim();
    if (!consentId) return null;
    return consentId;
  } catch {
    return null;
  }
}

async function loadConsentTextSnapshot(): Promise<{ consentKey: string; noticeText: string; checkboxLabel: string }> {
  const consentKey = 'face_search_consent_v1';
  const setting = await (prisma as any).appSetting.findUnique({
    where: { key: consentKey },
    select: { value: true },
  });

  const value = (setting?.value || {}) as any;
  const noticeText = typeof value?.noticeText === 'string' ? value.noticeText : '';
  const checkboxLabel = typeof value?.checkboxLabel === 'string' ? value.checkboxLabel : '';

  return { consentKey, noticeText, checkboxLabel };
}

async function isValidDbConsent(req: AuthRequest, eventId: string): Promise<boolean> {
  if (!isDbConsentEnabled()) return hasConsent(req, eventId);
  const consentId = getConsentId(req, eventId);
  if (!consentId) return false;
  const now = new Date();
  const found = await (prisma as any).faceSearchConsent.findFirst({
    where: {
      id: consentId,
      eventId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true },
  });
  return !!found;
}

function getIpHashSecret(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = String(process.env.IP_HASH_SECRET || process.env.JWT_SECRET || '').trim();
  if (isProd && !secret) {
    throw new Error('Server misconfigured: IP_HASH_SECRET (or at least JWT_SECRET) must be set in production');
  }
  return secret || 'dev-ip-hash-secret';
}

function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const secret = getIpHashSecret();
  return crypto.createHash('sha256').update(`${ip}|${secret}`).digest('hex');
}

router.get(
  '/:eventId/face-search-consent',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, hostId: true, deletedAt: true, isActive: true },
      });
      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const isHost = !!req.userId && req.userId === event.hostId;
      const isAdmin = req.userRole === 'ADMIN';
      if (!isHost && !isAdmin && !hasEventAccess(req, eventId)) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (isHost || isAdmin) return res.json({ accepted: true });
      return res.json({ accepted: await isValidDbConsent(req, eventId) });
    } catch (error) {
      logger.error('Error reading face search consent', { message: getErrorMessage(error), eventId: req.params.eventId });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post(
  '/:eventId/face-search-consent',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, hostId: true, deletedAt: true, isActive: true },
      });
      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const isHost = !!req.userId && req.userId === event.hostId;
      const isAdmin = req.userRole === 'ADMIN';
      if (!isHost && !isAdmin && !hasEventAccess(req, eventId)) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const ttlSeconds = Number(process.env.FACE_SEARCH_CONSENT_TTL_SECONDS || 60 * 60 * 12);
      const ipHash = hashIp(req.ip);

      if (!isDbConsentEnabled()) {
        issueConsentCookie(res, eventId, 'cookie_only');
        logger.info('Face search consent accepted (cookie-only)', { eventId, ipHash });
        return res.json({ ok: true, accepted: true });
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
      const userAgent = String(req.headers['user-agent'] || '').slice(0, 500);
      const snap = await loadConsentTextSnapshot();

      const consent = await (prisma as any).faceSearchConsent.create({
        data: {
          eventId,
          ipHash,
          userAgent,
          consentKey: snap.consentKey,
          noticeText: snap.noticeText,
          checkboxLabel: snap.checkboxLabel,
          expiresAt,
        },
        select: { id: true },
      });

      await (prisma as any).faceSearchConsentAuditLog.create({
        data: {
          consentId: consent.id,
          eventId,
          action: 'ACCEPTED',
          ipHash,
          userAgent,
          consentKey: snap.consentKey,
          noticeText: snap.noticeText,
          checkboxLabel: snap.checkboxLabel,
        },
      });

      issueConsentCookie(res, eventId, consent.id);
      logger.info('Face search consent accepted', { eventId, ipHash });
      return res.json({ ok: true, accepted: true });
    } catch (error) {
      logger.error('Error accepting face search consent', { message: getErrorMessage(error), eventId: req.params.eventId });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.delete(
  '/:eventId/face-search-consent',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, hostId: true, deletedAt: true, isActive: true },
      });
      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const isHost = !!req.userId && req.userId === event.hostId;
      const isAdmin = req.userRole === 'ADMIN';
      if (!isHost && !isAdmin && !hasEventAccess(req, eventId)) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const ipHash = hashIp(req.ip);

      if (isDbConsentEnabled()) {
        const userAgent = String(req.headers['user-agent'] || '').slice(0, 500);
        const consentId = getConsentId(req, eventId);
        if (consentId && consentId !== 'cookie_only') {
          try {
            await (prisma as any).faceSearchConsent.update({
              where: { id: consentId },
              data: { revokedAt: new Date() },
            });
          } catch {
            // ignore
          }

          const snap = await loadConsentTextSnapshot();
          await (prisma as any).faceSearchConsentAuditLog.create({
            data: {
              consentId,
              eventId,
              action: 'REVOKED',
              ipHash,
              userAgent,
              consentKey: snap.consentKey,
              noticeText: snap.noticeText,
              checkboxLabel: snap.checkboxLabel,
            },
          });
        }
      }

      clearConsentCookie(res, eventId);
      logger.info('Face search consent revoked', { eventId, ipHash });
      return res.json({ ok: true, accepted: false });
    } catch (error) {
      logger.error('Error revoking face search consent', { message: getErrorMessage(error), eventId: req.params.eventId });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Multer for reference image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  },
});

/**
 * Search for photos containing a specific face
 * POST /api/events/:eventId/face-search
 * Body: multipart/form-data with 'reference' image file
 */
router.post(
  '/:eventId/face-search',
  optionalAuthMiddleware,
  upload.single('reference'),
  validateUploadedFile('image'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const file = req.file;
      const minSimilarityRaw = parseFloat(req.body.minSimilarity || '0.6');
      const minSimilarity = Number.isFinite(minSimilarityRaw)
        ? Math.min(1, Math.max(0, minSimilarityRaw))
        : 0.6;

      if (!file) {
        return res.status(400).json({ error: 'Kein Referenzbild bereitgestellt' });
      }

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          hostId: true,
          featuresConfig: true,
          deletedAt: true,
          isActive: true,
        },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Access control: host/admin OR event access cookie
      const isHost = !!req.userId && req.userId === event.hostId;
      const isAdmin = req.userRole === 'ADMIN';
      if (!isHost && !isAdmin && !hasEventAccess(req, eventId)) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Art. 9 consent enforcement: guests need explicit consent token
      if (!isHost && !isAdmin && !(await isValidDbConsent(req, eventId))) {
        return res.status(403).json({ error: 'Einwilligung erforderlich' });
      }

      // Check if face search feature is enabled for this event's package
      try {
        await assertFeatureEnabled(eventId, 'faceSearch');
      } catch (err: any) {
        if (err.code === 'FEATURE_NOT_AVAILABLE') {
          return res.status(403).json({
            error: 'Gesichtssuche ist in deinem aktuellen Paket nicht verfügbar. Upgrade auf Premium für dieses Feature.',
            code: 'FEATURE_NOT_AVAILABLE',
            requiredUpgrade: true,
          });
        }
        throw err;
      }

      // Check if face search is enabled
      const featuresConfig = event.featuresConfig as any;
      const faceSearchEnabled = featuresConfig?.faceSearch !== false; // Default true if face recognition is enabled

      if (!faceSearchEnabled) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Extract face descriptor from reference image
      const descriptor = await extractFaceDescriptorFromImage(file.buffer);

      if (!descriptor) {
        return res.status(400).json({ 
          error: 'Kein Gesicht im Referenzbild erkannt. Bitte ein Foto mit einem klaren Gesicht verwenden.' 
        });
      }

      // Search for matching photos
      const results = await searchPhotosByFace(eventId, descriptor, minSimilarity);

      logger.info('Face search completed', {
        eventId,
        resultsCount: results.length,
        minSimilarity,
        ipHash: hashIp(req.ip),
      });

      res.json({
        success: true,
        results,
        count: results.length,
        message: `${results.length} Foto${results.length !== 1 ? 's' : ''} gefunden`,
      });
    } catch (error) {
      logger.error('Error in face search', { message: getErrorMessage(error), eventId: req.params.eventId });
      res.status(500).json({ error: 'Fehler bei der Gesichtssuche' });
    }
  }
);

export default router;

