/**
 * Social Media Routes
 * 
 * OAuth:
 *   GET  /api/social/auth-url        — Get Meta OAuth URL
 *   GET  /api/social/callback         — OAuth callback (code exchange)
 *   GET  /api/social/accounts         — List connected accounts
 *   DELETE /api/social/accounts/:id   — Disconnect an account
 * 
 * Publishing:
 *   POST /api/social/publish          — Publish image to connected account
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import {
  buildOAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
  saveOAuthResult,
  publishToFacebookPage,
  publishToInstagram,
} from '../services/metaGraphApi';

const router = Router();

// In-memory CSRF state store (short-lived, keyed by state → { userId, redirectUrl, expiresAt })
const oauthStates = new Map<string, { userId: string; redirectUrl: string; expiresAt: number }>();

// Clean up expired states periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of oauthStates.entries()) {
    if (val.expiresAt < now) oauthStates.delete(key);
  }
}, 60_000);

// ─── Get OAuth URL ───────────────────────────────────────────────────────────

router.get('/auth-url', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const redirectUrl = (req.query.redirect as string) || '/dashboard';

    // Generate CSRF state
    const state = crypto.randomBytes(24).toString('hex');
    oauthStates.set(state, {
      userId,
      redirectUrl,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
    });

    const url = buildOAuthUrl(state);
    res.json({ url, state });
  } catch (error) {
    logger.error('Social auth-url error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// ─── OAuth Callback ──────────────────────────────────────────────────────────

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn('Social OAuth error from Meta', { error: oauthError });
      return res.redirect(`${process.env.FRONTEND_URL || ''}/dashboard?social_error=denied`);
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.redirect(`${process.env.FRONTEND_URL || ''}/dashboard?social_error=invalid`);
    }

    // Validate state
    const stateData = oauthStates.get(state);
    if (!stateData || stateData.expiresAt < Date.now()) {
      oauthStates.delete(state);
      return res.redirect(`${process.env.FRONTEND_URL || ''}/dashboard?social_error=expired`);
    }
    oauthStates.delete(state);

    const { userId, redirectUrl } = stateData;

    // Exchange code for short-lived token
    const shortToken = await exchangeCodeForToken(code);

    // Exchange for long-lived token
    const longToken = await getLongLivedToken(shortToken.access_token);

    // Save accounts (Facebook + Instagram if available)
    const result = await saveOAuthResult(userId, longToken.access_token, longToken.expires_in);

    logger.info('Social OAuth complete', {
      userId,
      hasFacebook: !!result.facebook,
      hasInstagram: !!result.instagram,
      pageCount: result.pages.length,
    });

    const frontendUrl = process.env.FRONTEND_URL || '';
    const separator = redirectUrl.includes('?') ? '&' : '?';
    res.redirect(`${frontendUrl}${redirectUrl}${separator}social_connected=true`);
  } catch (error) {
    logger.error('Social OAuth callback error', { message: getErrorMessage(error) });
    res.redirect(`${process.env.FRONTEND_URL || ''}/dashboard?social_error=server`);
  }
});

// ─── List Connected Accounts ─────────────────────────────────────────────────

router.get('/accounts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const accounts = await prisma.socialAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        accountName: true,
        accountImageUrl: true,
        igUsername: true,
        isActive: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
    });

    res.json({ accounts });
  } catch (error) {
    logger.error('List social accounts error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// ─── Disconnect Account ──────────────────────────────────────────────────────

router.delete('/accounts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = req.params.id;

    const account = await prisma.socialAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account nicht gefunden' });
    }

    await prisma.socialAccount.delete({ where: { id: accountId } });

    logger.info('Social account disconnected', { userId, accountId, provider: account.provider });
    res.json({ success: true });
  } catch (error) {
    logger.error('Disconnect social account error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// ─── Publish to Social Media ─────────────────────────────────────────────────

const publishSchema = z.object({
  accountId: z.string().uuid(),
  imageUrl: z.string().url(),
  caption: z.string().max(2200).optional(),
});

router.post('/publish', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = publishSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { accountId, imageUrl, caption } = parsed.data;

    // Get account and verify ownership
    const account = await prisma.socialAccount.findFirst({
      where: { id: accountId, userId, isActive: true },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account nicht gefunden oder deaktiviert' });
    }

    // Check token expiry
    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      return res.status(401).json({ error: 'Token abgelaufen. Bitte erneut verbinden.' });
    }

    let result;
    if (account.provider === 'FACEBOOK') {
      if (!account.pageId || !account.pageAccessToken) {
        return res.status(400).json({ error: 'Keine Facebook-Seite verknüpft' });
      }
      result = await publishToFacebookPage(
        account.pageId,
        account.pageAccessToken,
        imageUrl,
        caption
      );
    } else if (account.provider === 'INSTAGRAM') {
      if (!account.igUserId) {
        return res.status(400).json({ error: 'Kein Instagram Business Account verknüpft' });
      }
      result = await publishToInstagram(
        account.igUserId,
        account.accessToken,
        imageUrl,
        caption
      );
    } else {
      return res.status(400).json({ error: 'Unbekannter Provider' });
    }

    if (!result.success) {
      logger.warn('Social publish failed', { accountId, provider: account.provider, error: result.error });
      return res.status(502).json({ error: result.error || 'Veröffentlichung fehlgeschlagen' });
    }

    logger.info('Social publish success', {
      userId,
      accountId,
      provider: account.provider,
      postId: result.postId,
    });

    res.json({ success: true, postId: result.postId });
  } catch (error) {
    logger.error('Social publish error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;
