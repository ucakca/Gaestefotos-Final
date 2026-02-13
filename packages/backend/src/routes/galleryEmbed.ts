import { Router, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/events/:eventId/embed — Get embed code for an event gallery
 * Returns HTML embed snippet + iframe URL for the host to copy
 */
router.get('/events/:eventId/embed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(403).json({ error: 'Kein Zugriff' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, slug: true, isActive: true },
    });

    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://gästefotos.com';
    const galleryUrl = `${baseUrl}/e3/${event.slug}`;
    const embedUrl = `${baseUrl}/embed/${event.slug}`;

    // Generate various embed code options
    const iframeEmbed = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:12px;overflow:hidden;" allow="fullscreen" title="Galerie: ${event.title}"></iframe>`;

    const scriptEmbed = `<div id="gaestefotos-gallery-${event.slug}"></div>
<script src="${baseUrl}/embed.js" data-slug="${event.slug}" data-theme="auto" data-height="600" async></script>`;

    const linkButton = `<a href="${galleryUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#295B4D;color:white;text-decoration:none;border-radius:8px;font-family:sans-serif;font-weight:600;font-size:14px;">
  📸 Galerie ansehen: ${event.title}
</a>`;

    res.json({
      eventId: event.id,
      eventTitle: event.title,
      slug: event.slug,
      urls: {
        gallery: galleryUrl,
        embed: embedUrl,
      },
      embedCodes: {
        iframe: iframeEmbed,
        script: scriptEmbed,
        linkButton,
      },
    });
  } catch (error) {
    logger.error('Embed code generation error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Generieren des Embed-Codes' });
  }
});

/**
 * GET /embed/:slug — Public embed page (returns minimal gallery view)
 * This is the iframe target — renders a lightweight gallery widget
 */
router.get('/embed/:slug', async (req: any, res: Response) => {
  try {
    const { slug } = req.params;

    const event = await prisma.event.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: { id: true, title: true, slug: true },
    });

    if (!event) {
      return res.status(404).send('<html><body><p>Galerie nicht gefunden</p></body></html>');
    }

    const photos = await prisma.photo.findMany({
      where: { eventId: event.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, storagePathThumb: true, storagePath: true },
    });

    const baseUrl = process.env.FRONTEND_URL || 'https://gästefotos.com';
    const galleryUrl = `${baseUrl}/e3/${event.slug}`;

    const photoGrid = photos.map(p => {
      const imgUrl = `${baseUrl}/api/photos/${p.id}/thumbnail`;
      return `<a href="${galleryUrl}" target="_blank" rel="noopener" class="photo"><img src="${imgUrl}" alt="" loading="lazy" /></a>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${event.title} – Galerie</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fafafa; }
    .header { padding: 16px; text-align: center; background: linear-gradient(135deg, #295B4D, #3a7d6a); color: white; }
    .header h2 { font-size: 16px; font-weight: 600; }
    .header a { color: white; text-decoration: none; opacity: 0.8; font-size: 11px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 4px; padding: 4px; }
    .photo { display: block; aspect-ratio: 1; overflow: hidden; border-radius: 4px; }
    .photo img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
    .photo:hover img { transform: scale(1.05); }
    .footer { padding: 12px; text-align: center; font-size: 11px; color: #999; }
    .footer a { color: #295B4D; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${event.title}</h2>
    <a href="${galleryUrl}" target="_blank" rel="noopener">Vollständige Galerie öffnen →</a>
  </div>
  <div class="grid">${photoGrid}</div>
  <div class="footer">
    Powered by <a href="https://gästefotos.com" target="_blank" rel="noopener">gästefotos.com</a>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    logger.error('Embed page error', { message: (error as Error).message });
    res.status(500).send('<html><body><p>Fehler beim Laden der Galerie</p></body></html>');
  }
});

export default router;
