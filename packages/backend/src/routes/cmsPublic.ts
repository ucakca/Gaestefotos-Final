import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import crypto from 'crypto';

const router = Router();

const kindSchema = z.enum(['pages', 'posts']);

router.get('/:kind/:slug', async (req, res: Response) => {
  try {
    const kind = kindSchema.parse(req.params.kind);
    const slug = z.string().min(1).parse(req.params.slug);

    const snap = await (prisma as any).cmsContentSnapshot.findUnique({
      where: { kind_slug: { kind, slug } },
      select: {
        kind: true,
        slug: true,
        title: true,
        html: true,
        excerpt: true,
        sourceUrl: true,
        link: true,
        modifiedGmt: true,
        fetchedAt: true,
        updatedAt: true,
      },
    });

    if (!snap) {
      return res.status(404).json({ error: 'Nicht gefunden' });
    }

    const etagSource = JSON.stringify({
      kind: snap.kind,
      slug: snap.slug,
      title: snap.title,
      modifiedGmt: snap.modifiedGmt,
      fetchedAt: snap.fetchedAt,
      updatedAt: snap.updatedAt,
    });
    const etag = `W/"${crypto.createHash('sha1').update(etagSource).digest('hex')}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');

    const ifNoneMatch = String((req.headers as any)['if-none-match'] || '').trim();
    if (ifNoneMatch && ifNoneMatch === etag) {
      return res.status(304).end();
    }

    res.json({ snapshot: snap });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Bad Request' });
  }
});

export default router;
