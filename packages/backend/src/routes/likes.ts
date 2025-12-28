import { Router, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { AuthRequest, hasEventAccess, optionalAuthMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const ALLOWED_REACTION_KEYS = new Set(['heart', 'laugh', 'wow', 'fire', 'clap']);

const firstGrapheme = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return '';

  try {
    const SegmenterCtor = (Intl as any)?.Segmenter;
    if (!SegmenterCtor) {
      return trimmed.slice(0, 4);
    }
    const seg = new SegmenterCtor(undefined, { granularity: 'grapheme' });
    const it = seg.segment(trimmed)[Symbol.iterator]();
    const first = it.next();
    return first?.value?.segment ? String(first.value.segment) : '';
  } catch {
    // Fallback: may split compound emoji, but still better than rejecting.
    return trimmed.slice(0, 4);
  }
};

const looksLikeEmoji = (value: string): boolean => {
  const v = value.trim();
  if (!v) return false;

  // Prefer Unicode property if supported
  try {
    return /\p{Extended_Pictographic}/u.test(v);
  } catch {
    // Fallback heuristic: any non-ascii char
    for (let i = 0; i < v.length; i++) {
      if (v.charCodeAt(i) > 0x7f) return true;
    }
    return false;
  }
};

const normalizeReactionType = (value: unknown): string => {
  const raw = String(value || '').trim();
  // Backwards compatible default
  if (!raw) return 'heart';

  const lowered = raw.toLowerCase();
  if (ALLOWED_REACTION_KEYS.has(lowered)) return lowered;

  const g = firstGrapheme(raw);
  if (!g) return 'heart';
  if (!looksLikeEmoji(g)) return 'heart';
  if (g.length > 32) return 'heart';
  return g;
};

const getClientFingerprint = (req: AuthRequest) => {
  if (req.userId) return `user:${req.userId}`;

  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  const secret = process.env.IP_HASH_SECRET || process.env.JWT_SECRET || 'default';

  return crypto
    .createHash('sha256')
    .update(`${ip}|${userAgent}|${secret}`)
    .digest('hex');
};

// Like/Unlike a photo
router.post(
  '/:photoId/like',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const ipAddress = getClientFingerprint(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const reactionType = normalizeReactionType((req.body as any)?.reactionType);

    // Check if photo exists
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        event: {
          select: {
            id: true,
            hostId: true,
            deletedAt: true,
            isActive: true,
          },
        },
      },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (photo.deletedAt || photo.status === 'DELETED') {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (photo.event.deletedAt || photo.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const isHost = req.userId && req.userId === photo.event.hostId;
    if (!isHost && !hasEventAccess(req, photo.eventId)) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    // Check if already liked (by IP)
    const existingLike = await (prisma as any).photoLike.findUnique({
      where: {
        photoId_ipAddress: {
          photoId,
          ipAddress: ipAddress as string,
        },
      },
    });

    if (existingLike) {
      const existingReaction = normalizeReactionType((existingLike as any).reactionType);

      // If same reaction => toggle off (unlike). If different reaction => update.
      if (existingReaction === reactionType) {
        await prisma.photoLike.delete({
          where: { id: existingLike.id },
        });
      } else {
        await (prisma as any).photoLike.update({
          where: { id: existingLike.id },
          data: {
            reactionType,
            userAgent,
            guestId: req.userId || null,
          },
        });
      }

      const likeCount = await (prisma as any).photoLike.count({
        where: { photoId },
      });

      const likes = await (prisma as any).photoLike.findMany({
        where: { photoId },
        select: { reactionType: true },
      });
      const reactionCounts = (likes as any[]).reduce(
        (acc: Record<string, number>, l: any) => {
          const rt = normalizeReactionType((l as any).reactionType);
          acc[rt] = (acc[rt] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const stillLiked = existingReaction !== reactionType;
      return res.json({
        liked: stillLiked,
        likeCount,
        reactionType: stillLiked ? reactionType : null,
        reactionCounts,
        message: stillLiked ? 'Reaktion geändert' : 'Like entfernt',
      });
    } else {
      // Like: Create new like
      await (prisma as any).photoLike.create({
        data: {
          photoId,
          guestId: req.userId || null,
          ipAddress: ipAddress as string,
          userAgent,
          reactionType,
        },
      });

      const likeCount = await (prisma as any).photoLike.count({
        where: { photoId },
      });

      const likes = await (prisma as any).photoLike.findMany({
        where: { photoId },
        select: { reactionType: true },
      });
      const reactionCounts = (likes as any[]).reduce(
        (acc: Record<string, number>, l: any) => {
          const rt = normalizeReactionType((l as any).reactionType);
          acc[rt] = (acc[rt] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return res.json({
        liked: true,
        likeCount,
        reactionType,
        reactionCounts,
        message: 'Foto geliked',
      });
    }
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Unique constraint violation (already liked)
      return res.status(400).json({ error: 'Foto bereits geliked' });
    }
    logger.error('Fehler beim Like/Unlike:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Get likes for a photo
router.get(
  '/:photoId/likes',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const ipAddress = getClientFingerprint(req);

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        event: {
          select: {
            id: true,
            hostId: true,
            deletedAt: true,
            isActive: true,
          },
        },
      },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (photo.deletedAt || photo.status === 'DELETED') {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (photo.event.deletedAt || photo.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const isHost = req.userId && req.userId === photo.event.hostId;
    if (!isHost && !hasEventAccess(req, photo.eventId)) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    const likeCount = await (prisma as any).photoLike.count({
      where: { photoId },
    });

    const likes = await (prisma as any).photoLike.findMany({
      where: { photoId },
      select: { reactionType: true },
    });
    const reactionCounts = (likes as any[]).reduce(
      (acc: Record<string, number>, l: any) => {
        const rt = normalizeReactionType((l as any).reactionType);
        acc[rt] = (acc[rt] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Check if current user/IP has liked
    const userLike = await (prisma as any).photoLike.findUnique({
      where: {
        photoId_ipAddress: {
          photoId,
          ipAddress: ipAddress as string,
        },
      },
    });

    res.json({
      likeCount,
      isLiked: !!userLike,
      reactionType: userLike ? normalizeReactionType((userLike as any).reactionType) : null,
      reactionCounts,
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Likes:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;



