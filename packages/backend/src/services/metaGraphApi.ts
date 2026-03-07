/**
 * Meta Graph API Service
 * Handles Facebook & Instagram OAuth, token management, and media publishing.
 *
 * Required env vars:
 *   META_APP_ID          – Facebook App ID
 *   META_APP_SECRET      – Facebook App Secret
 *   META_REDIRECT_URI    – OAuth callback URL (e.g. https://app.example.com/api/social/callback)
 */

import { PrismaClient, SocialProvider } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Config ──────────────────────────────────────────────────────────────────

const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || '';
const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaUserProfile {
  id: string;
  name: string;
  picture?: { data?: { url?: string } };
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string };
}

export interface IgUser {
  id: string;
  username: string;
  profile_picture_url?: string;
  name?: string;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

// ─── OAuth Helpers ───────────────────────────────────────────────────────────

/**
 * Build the Facebook Login dialog URL for the given scopes.
 * @param state - CSRF state param (should include userId + redirect info)
 */
export function buildOAuthUrl(state: string, scopes: string[] = []): string {
  const defaultScopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
  ];
  const finalScopes = scopes.length > 0 ? scopes : defaultScopes;

  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: META_REDIRECT_URI,
    state,
    scope: finalScopes.join(','),
    response_type: 'code',
  });
  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange a short-lived auth code for a short-lived access token.
 */
export async function exchangeCodeForToken(code: string): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    redirect_uri: META_REDIRECT_URI,
    code,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Meta token exchange failed: ${JSON.stringify(err)}`);
  }
  return res.json() as Promise<MetaTokenResponse>;
}

/**
 * Exchange a short-lived token for a long-lived token (~60 days).
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Long-lived token exchange failed: ${JSON.stringify(err)}`);
  }
  return res.json() as Promise<MetaTokenResponse>;
}

// ─── User / Page / IG Discovery ──────────────────────────────────────────────

/**
 * Get the authenticated Facebook user's profile.
 */
export async function getMe(accessToken: string): Promise<MetaUserProfile> {
  const res = await fetch(`${GRAPH_BASE}/me?fields=id,name,picture&access_token=${accessToken}`);
  if (!res.ok) throw new Error('Failed to fetch Facebook user profile');
  return res.json() as Promise<MetaUserProfile>;
}

/**
 * Get all Facebook Pages the user manages (with page access tokens).
 */
export async function getPages(accessToken: string): Promise<MetaPage[]> {
  const res = await fetch(
    `${GRAPH_BASE}/me/accounts?fields=id,name,access_token,picture,instagram_business_account&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error('Failed to fetch Facebook pages');
  const data = (await res.json()) as { data?: MetaPage[] };
  return (data.data || []) as MetaPage[];
}

/**
 * Get Instagram Business Account info from a connected page.
 */
export async function getIgBusinessAccount(
  igUserId: string,
  accessToken: string
): Promise<IgUser | null> {
  const res = await fetch(
    `${GRAPH_BASE}/${igUserId}?fields=id,username,profile_picture_url,name&access_token=${accessToken}`
  );
  if (!res.ok) return null;
  return res.json() as Promise<IgUser>;
}

// ─── Publishing: Facebook ────────────────────────────────────────────────────

/**
 * Publish a photo to a Facebook Page.
 * The image must be publicly accessible via URL.
 */
export async function publishToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  imageUrl: string,
  caption?: string
): Promise<PublishResult> {
  try {
    const body: Record<string, string> = { url: imageUrl };
    if (caption) body.message = caption;

    const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: pageAccessToken }),
    });

    const data = (await res.json()) as any;
    if (!res.ok) {
      return { success: false, error: data?.error?.message || 'Facebook publish failed' };
    }
    return { success: true, postId: data.id || data.post_id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Publishing: Instagram ───────────────────────────────────────────────────

/**
 * Publish a photo to Instagram Business Account (2-step: create container → publish).
 * The image must be publicly accessible via HTTPS URL.
 */
export async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption?: string
): Promise<PublishResult> {
  try {
    // Step 1: Create media container
    const containerBody: Record<string, string> = {
      image_url: imageUrl,
      access_token: accessToken,
    };
    if (caption) containerBody.caption = caption;

    const containerRes = await fetch(`${GRAPH_BASE}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    });
    const containerData = (await containerRes.json()) as any;
    if (!containerRes.ok) {
      return {
        success: false,
        error: containerData?.error?.message || 'Instagram container creation failed',
      };
    }
    const creationId = containerData.id;

    // Step 2: Wait for container to be ready (poll up to 30s)
    const ready = await waitForContainerReady(creationId, accessToken);
    if (!ready) {
      return { success: false, error: 'Instagram media container timed out' };
    }

    // Step 3: Publish the container
    const publishRes = await fetch(`${GRAPH_BASE}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
    });
    const publishData = (await publishRes.json()) as any;
    if (!publishRes.ok) {
      return {
        success: false,
        error: publishData?.error?.message || 'Instagram publish failed',
      };
    }
    return { success: true, postId: publishData.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Poll the container status until it's FINISHED or timeout.
 */
async function waitForContainerReady(
  containerId: string,
  accessToken: string,
  maxWaitMs = 30000
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      `${GRAPH_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.status_code === 'FINISHED') return true;
      if (data.status_code === 'ERROR') return false;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// ─── Token Refresh ───────────────────────────────────────────────────────────

/**
 * Refresh long-lived tokens that are about to expire (within 7 days).
 * Should be called periodically (e.g. daily cron).
 */
export async function refreshExpiringTokens(): Promise<number> {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accounts = await prisma.socialAccount.findMany({
    where: {
      isActive: true,
      tokenExpiresAt: { lte: sevenDaysFromNow },
    },
  });

  let refreshed = 0;
  for (const account of accounts) {
    try {
      const newToken = await getLongLivedToken(account.accessToken);
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: newToken.access_token,
          tokenExpiresAt: newToken.expires_in
            ? new Date(Date.now() + newToken.expires_in * 1000)
            : null,
        },
      });
      refreshed++;
    } catch (err) {
      console.error(`[MetaGraph] Failed to refresh token for account ${account.id}:`, err);
      // Mark inactive if refresh fails
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: { isActive: false },
      });
    }
  }
  return refreshed;
}

// ─── Account Management Helpers ──────────────────────────────────────────────

/**
 * Store or update a connected Facebook account + any linked Instagram business accounts.
 * Returns the created/updated SocialAccount records.
 */
export async function saveOAuthResult(
  userId: string,
  accessToken: string,
  expiresIn?: number
): Promise<{ facebook?: any; instagram?: any; pages: MetaPage[] }> {
  // Get user profile + pages
  const [me, pages] = await Promise.all([getMe(accessToken), getPages(accessToken)]);

  const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  // Save Facebook account
  const fbAccount = await prisma.socialAccount.upsert({
    where: {
      userId_provider_providerAccountId: {
        userId,
        provider: SocialProvider.FACEBOOK,
        providerAccountId: me.id,
      },
    },
    update: {
      accessToken,
      tokenExpiresAt,
      accountName: me.name,
      accountImageUrl: me.picture?.data?.url || null,
      isActive: true,
    },
    create: {
      userId,
      provider: SocialProvider.FACEBOOK,
      providerAccountId: me.id,
      accessToken,
      tokenExpiresAt,
      accountName: me.name,
      accountImageUrl: me.picture?.data?.url || null,
      scope: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'instagram_basic',
        'instagram_content_publish',
      ],
    },
  });

  let igAccount = null;

  // For each page with an IG business account, save it
  for (const page of pages) {
    // Update FB account with first page info
    if (page.id && page.access_token) {
      await prisma.socialAccount.update({
        where: { id: fbAccount.id },
        data: {
          pageId: page.id,
          pageAccessToken: page.access_token,
        },
      });
    }

    if (page.instagram_business_account?.id) {
      const igInfo = await getIgBusinessAccount(
        page.instagram_business_account.id,
        page.access_token
      );
      if (igInfo) {
        igAccount = await prisma.socialAccount.upsert({
          where: {
            userId_provider_providerAccountId: {
              userId,
              provider: SocialProvider.INSTAGRAM,
              providerAccountId: igInfo.id,
            },
          },
          update: {
            accessToken: page.access_token, // Use page token for IG API
            tokenExpiresAt,
            accountName: igInfo.name || igInfo.username,
            accountImageUrl: igInfo.profile_picture_url || null,
            igUserId: igInfo.id,
            igUsername: igInfo.username,
            pageId: page.id,
            pageAccessToken: page.access_token,
            isActive: true,
          },
          create: {
            userId,
            provider: SocialProvider.INSTAGRAM,
            providerAccountId: igInfo.id,
            accessToken: page.access_token,
            tokenExpiresAt,
            accountName: igInfo.name || igInfo.username,
            accountImageUrl: igInfo.profile_picture_url || null,
            igUserId: igInfo.id,
            igUsername: igInfo.username,
            pageId: page.id,
            pageAccessToken: page.access_token,
            scope: ['instagram_basic', 'instagram_content_publish'],
          },
        });
      }
    }
  }

  return { facebook: fbAccount, instagram: igAccount, pages };
}
