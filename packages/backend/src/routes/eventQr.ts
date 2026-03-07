/**
 * Event QR Code Sub-Router
 * 
 * Extracted from events.ts (P2-7) to reduce file size.
 * Handles: QR config, PNG/PDF export, DIY export, QR logo, QR preview, QR save-design
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, isPrivilegedRole, hasEventPermission } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import { storageService } from '../services/storage';
import { PDFDocument, rgb } from 'pdf-lib';

const router = Router();

// ─── Multer for logo upload ──────────────────────────────────────────────────

const designUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  },
});

const uploadSingleDesignImage = (fieldName: string) => (req: AuthRequest, res: Response, next: any) => {
  designUpload.single(fieldName)(req as any, res as any, (err: any) => {
    if (!err) return next();
    const code = (err as any)?.code;
    if (code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Datei zu groß. Maximum: 50MB' });
    }
    return res.status(400).json({ error: (err as any)?.message || String(err) });
  });
};

// ─── Auth helpers ────────────────────────────────────────────────────────────

async function requireHostOrAdmin(req: AuthRequest, res: Response, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, hostId: true, deletedAt: true, isActive: true, designConfig: true },
  });

  if (!event || event.deletedAt || event.isActive === false) {
    res.status(404).json({ error: 'Event nicht gefunden' });
    return null;
  }

  const hasManageAccess =
    (!!req.userId && event.hostId === req.userId) ||
    isPrivilegedRole(req.userRole) ||
    (!!req.userId &&
      !!(await prisma.eventMember.findUnique({
        where: { eventId_userId: { eventId, userId: req.userId } },
        select: { id: true },
      })));

  if (!hasManageAccess) {
    res.status(404).json({ error: 'Event nicht gefunden' });
    return null;
  }

  return event;
}

async function requireEventEditAccess(req: AuthRequest, res: Response, eventId: string) {
  const event = await requireHostOrAdmin(req, res, eventId);
  if (!event) return null;

  if (req.userId && event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
    const canEdit = await hasEventPermission(req, eventId, 'canEditEvent');
    if (!canEdit) {
      res.status(404).json({ error: 'Event nicht gefunden' });
      return null;
    }
  }

  return event;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const qrExportSchema = z.object({
  format: z.enum(['A6', 'A5']),
  svg: z.string().min(1).max(800_000),
});

const qrPdfOptionsSchema = z.object({
  bleedMm: z.coerce.number().min(0).max(10).optional().default(0),
  cropMarks: z.coerce.boolean().optional().default(false),
  marginMm: z.coerce.number().min(0).max(20).optional().default(6),
});

const qrTemplateConfigSchema = z.object({
  templateSlug: z.string().min(1).max(100),
  format: z.enum(['A6', 'A5', 'story', 'square']),
  headline: z.string().min(1).max(120),
  subline: z.string().min(0).max(160),
  eventName: z.string().min(0).max(120),
  callToAction: z.string().min(0).max(200),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  qrDotStyle: z.enum(['square', 'rounded', 'dots', 'classy', 'classy-rounded']).optional(),
  qrCornerStyle: z.enum(['square', 'extra-rounded', 'dot']).optional(),
});

const diyExportSchema = z.object({
  format: z.enum(['a6-tent', 'a5-tent', 'a4-poster', 'a3-poster', 'cards']),
  svg: z.string().min(10).max(2_000_000),
});

// ─── Helper functions ────────────────────────────────────────────────────────

function getPrintPixels(format: 'A6' | 'A5') {
  const dpi = 300;
  const mmToPx = (mm: number) => Math.round((mm / 25.4) * dpi);
  if (format === 'A6') return { dpi, width: mmToPx(105), height: mmToPx(148) };
  return { dpi, width: mmToPx(148), height: mmToPx(210) };
}

function getPrintMm(format: 'A6' | 'A5') {
  if (format === 'A6') return { widthMm: 105, heightMm: 148 };
  return { widthMm: 148, heightMm: 210 };
}

function mmToPt(mm: number) {
  return (mm * 72) / 25.4;
}

function drawCropMarks(page: any, trim: { x: number; y: number; w: number; h: number }) {
  const markLen = 12;
  const offset = 6;
  const thickness = 0.5;
  const color = rgb(0, 0, 0);
  const left = trim.x;
  const right = trim.x + trim.w;
  const bottom = trim.y;
  const top = trim.y + trim.h;

  page.drawLine({ start: { x: left - offset, y: bottom }, end: { x: left - offset - markLen, y: bottom }, thickness, color });
  page.drawLine({ start: { x: left, y: bottom - offset }, end: { x: left, y: bottom - offset - markLen }, thickness, color });
  page.drawLine({ start: { x: right + offset, y: bottom }, end: { x: right + offset + markLen, y: bottom }, thickness, color });
  page.drawLine({ start: { x: right, y: bottom - offset }, end: { x: right, y: bottom - offset - markLen }, thickness, color });
  page.drawLine({ start: { x: left - offset, y: top }, end: { x: left - offset - markLen, y: top }, thickness, color });
  page.drawLine({ start: { x: left, y: top + offset }, end: { x: left, y: top + offset + markLen }, thickness, color });
  page.drawLine({ start: { x: right + offset, y: top }, end: { x: right + offset + markLen, y: top }, thickness, color });
  page.drawLine({ start: { x: right, y: top + offset }, end: { x: right, y: top + offset + markLen }, thickness, color });
}

function drawFoldLines(page: any, pageW: number, pageH: number, foldY: number) {
  const dashLen = 8;
  const gapLen = 4;
  const thickness = 0.5;
  const color = rgb(0.6, 0.6, 0.6);
  let x = 10;
  while (x < pageW - 10) {
    const endX = Math.min(x + dashLen, pageW - 10);
    page.drawLine({ start: { x, y: foldY }, end: { x: endX, y: foldY }, thickness, color });
    x += dashLen + gapLen;
  }
  page.drawLine({ start: { x: 5, y: foldY - 3 }, end: { x: 10, y: foldY }, thickness: 0.8, color });
  page.drawLine({ start: { x: 5, y: foldY + 3 }, end: { x: 10, y: foldY }, thickness: 0.8, color });
}

function getDiyFormatMm(format: string): { widthMm: number; heightMm: number; foldable: boolean } {
  switch (format) {
    case 'a6-tent': return { widthMm: 105, heightMm: 148 * 2, foldable: true };
    case 'a5-tent': return { widthMm: 148, heightMm: 210 * 2, foldable: true };
    case 'a4-poster': return { widthMm: 210, heightMm: 297, foldable: false };
    case 'a3-poster': return { widthMm: 297, heightMm: 420, foldable: false };
    default: return { widthMm: 105, heightMm: 148 * 2, foldable: true };
  }
}

function isSvgObviouslyUnsafe(svg: string): boolean {
  const s = svg.toLowerCase();
  if (s.includes('<script')) return true;
  if (s.includes('onload=')) return true;
  if (s.includes('javascript:')) return true;
  if (s.includes('href="http')) return true;
  if (s.includes("href='http")) return true;
  if (s.includes('xlink:href="http')) return true;
  if (s.includes("xlink:href='http")) return true;
  return false;
}

function getViewBoxSize(svg: string): { w: number; h: number } | null {
  const match = svg.match(/viewBox\s*=\s*"\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*"/i);
  if (!match) return null;
  const w = Number(match[3]);
  const h = Number(match[4]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { w, h };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get('/:id/qr/config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await requireHostOrAdmin(req, res, eventId);
    if (!event) return;

    const designConfig = (event.designConfig as any) || {};
    const qrTemplateConfig = designConfig.qrTemplateConfig || null;
    return res.json({ ok: true, qrTemplateConfig });
  } catch (error) {
    logger.error('Get QR config error', { message: getErrorMessage(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

router.put('/:id/qr/config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const parsed = qrTemplateConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige QR-Konfiguration' });
    }

    const event = await requireEventEditAccess(req, res, eventId);
    if (!event) return;

    const designConfig = (event.designConfig as any) || {};
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        designConfig: {
          ...designConfig,
          qrTemplateConfig: parsed.data,
        },
      },
      select: { id: true, designConfig: true, updatedAt: true },
    });

    return res.json({ ok: true, event: updated });
  } catch (error) {
    logger.error('Save QR config error', { message: getErrorMessage(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

router.post('/:id/qr/export.png', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const parsed = qrExportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Export-Daten' });
    }

    const event = await requireEventEditAccess(req, res, eventId);
    if (!event) return;

    const { format, svg } = parsed.data;
    if (isSvgObviouslyUnsafe(svg)) {
      return res.status(400).json({ error: 'SVG enthält unsichere Inhalte' });
    }

    const { width, height, dpi } = getPrintPixels(format);

    let png: Buffer | null = null;
    try {
      const { Resvg } = require('@resvg/resvg-js');
      const vb = getViewBoxSize(svg);
      const scale = vb ? width / vb.w : 1;
      const resvg = new Resvg(svg, {
        background: 'white',
        fitTo: { mode: 'zoom', value: scale },
        font: { loadSystemFonts: true },
      });
      const rendered = resvg.render();
      png = Buffer.from(rendered.asPng());
    } catch (e) {
      logger.warn('QR export PNG: resvg unavailable/failed, falling back', { message: (e as any)?.message || String(e) });
    }

    if (!png) {
      try {
        const sharpLib = require('sharp');
        png = await sharpLib(Buffer.from(svg, 'utf8'), { density: dpi })
          .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png({ compressionLevel: 9 })
          .toBuffer();
      } catch (e) {
        logger.error('QR export PNG: no renderer available', { message: (e as any)?.message || String(e) });
        return res.status(501).json({
          error: 'PNG Export ist auf diesem Server nicht verfügbar (Renderer fehlt/ist nicht kompatibel).',
        });
      }
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="qr-aufsteller-${eventId}-${format}.png"`);
    return res.send(png);
  } catch (error) {
    logger.error('QR export PNG error', { message: getErrorMessage(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

router.post('/:id/qr/export.pdf', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const parsed = qrExportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Export-Daten' });
    }

    const pdfOptsParsed = qrPdfOptionsSchema.safeParse(req.body);
    if (!pdfOptsParsed.success) {
      return res.status(400).json({ error: 'Ungültige PDF Optionen' });
    }

    const event = await requireHostOrAdmin(req, res, eventId);
    if (!event) return;

    const { format, svg } = parsed.data;
    if (isSvgObviouslyUnsafe(svg)) {
      return res.status(400).json({ error: 'SVG enthält unsichere Inhalte' });
    }

    const isAdmin = req.userRole === 'ADMIN';
    const bleedMm = isAdmin ? pdfOptsParsed.data.bleedMm : 0;
    const cropMarks = isAdmin ? pdfOptsParsed.data.cropMarks : false;
    const requestedMarginMm = isAdmin ? pdfOptsParsed.data.marginMm : 6;
    const marginMm = bleedMm > 0 || cropMarks ? 0 : requestedMarginMm;

    const { widthMm, heightMm } = getPrintMm(format);
    const pageWidthPt = mmToPt(widthMm + 2 * bleedMm);
    const pageHeightPt = mmToPt(heightMm + 2 * bleedMm);
    const trimWidthPt = mmToPt(widthMm);
    const trimHeightPt = mmToPt(heightMm);

    const { width: renderWidthPx } = getPrintPixels(format);

    let png: Buffer | null = null;
    try {
      const { Resvg } = require('@resvg/resvg-js');
      const vb = getViewBoxSize(svg);
      const scale = vb ? renderWidthPx / vb.w : 1;
      const resvg = new Resvg(svg, {
        background: 'white',
        fitTo: { mode: 'zoom', value: scale },
        font: { loadSystemFonts: true },
      });
      png = Buffer.from(resvg.render().asPng());
    } catch (e) {
      logger.warn('QR export PDF: resvg failed', { message: (e as any)?.message || String(e) });
    }

    if (!png) {
      return res.status(501).json({ error: 'PDF Export ist auf diesem Server nicht verfügbar (Renderer fehlt).' });
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([pageWidthPt, pageHeightPt]);
    const img = await pdf.embedPng(png);

    const trimX = mmToPt(bleedMm);
    const trimY = mmToPt(bleedMm);

    const marginPt = mmToPt(marginMm);
    const targetX = trimX + marginPt;
    const targetY = trimY + marginPt;
    const targetW = Math.max(1, trimWidthPt - 2 * marginPt);
    const targetH = Math.max(1, trimHeightPt - 2 * marginPt);

    const imgW = img.width;
    const imgH = img.height;
    const scale = Math.min(targetW / imgW, targetH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = targetX + (targetW - drawW) / 2;
    const drawY = targetY + (targetH - drawH) / 2;

    page.drawImage(img, { x: drawX, y: drawY, width: drawW, height: drawH });

    if (cropMarks && bleedMm > 0) {
      drawCropMarks(page, { x: trimX, y: trimY, w: trimWidthPt, h: trimHeightPt });
    }

    const pdfBytes = await pdf.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="qr-aufsteller-${eventId}-${format}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    logger.error('QR export PDF error', { message: getErrorMessage(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

router.post('/:id/qr/export-diy.pdf', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const parsed = diyExportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Export-Daten' });
    }

    const event = await requireHostOrAdmin(req, res, eventId);
    if (!event) return;

    const { format, svg } = parsed.data;
    if (isSvgObviouslyUnsafe(svg)) {
      return res.status(400).json({ error: 'SVG enthält unsichere Inhalte' });
    }

    const { widthMm, heightMm, foldable } = getDiyFormatMm(format);
    const pageWidthPt = mmToPt(widthMm);
    const pageHeightPt = mmToPt(heightMm);
    const designHeightMm = foldable ? heightMm / 2 : heightMm;
    const designHeightPt = mmToPt(designHeightMm);

    const dpi = 300;
    const renderWidthPx = Math.round((widthMm / 25.4) * dpi);

    let png: Buffer | null = null;
    try {
      const { Resvg } = require('@resvg/resvg-js');
      const vb = getViewBoxSize(svg);
      const scale = vb ? renderWidthPx / vb.w : 1;
      const resvg = new Resvg(svg, {
        background: 'white',
        fitTo: { mode: 'zoom', value: scale },
        font: { loadSystemFonts: true },
      });
      png = Buffer.from(resvg.render().asPng());
    } catch (e) {
      logger.warn('QR DIY export: resvg failed', { message: (e as any)?.message || String(e) });
    }

    if (!png) {
      return res.status(501).json({ error: 'PDF Export ist auf diesem Server nicht verfügbar.' });
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([pageWidthPt, pageHeightPt]);
    const img = await pdf.embedPng(png);

    const marginPt = mmToPt(6);

    if (foldable) {
      const imgW = img.width;
      const imgH = img.height;
      const topTargetW = pageWidthPt - 2 * marginPt;
      const topTargetH = designHeightPt - 2 * marginPt;
      const topScale = Math.min(topTargetW / imgW, topTargetH / imgH);
      const topDrawW = imgW * topScale;
      const topDrawH = imgH * topScale;
      const topDrawX = marginPt + (topTargetW - topDrawW) / 2;
      const topDrawY = designHeightPt + marginPt + (topTargetH - topDrawH) / 2;

      page.drawImage(img, { x: topDrawX, y: topDrawY, width: topDrawW, height: topDrawH });

      const botTargetW = pageWidthPt - 2 * marginPt;
      const botTargetH = designHeightPt - 2 * marginPt;
      const botScale = Math.min(botTargetW / imgW, botTargetH / imgH);
      const botDrawW = imgW * botScale;
      const botDrawH = imgH * botScale;
      const botCenterX = pageWidthPt / 2;
      const botCenterY = designHeightPt / 2;

      page.pushOperators();
      page.drawImage(img, {
        x: botCenterX - botDrawW / 2,
        y: botCenterY - botDrawH / 2,
        width: botDrawW,
        height: botDrawH,
        rotate: { type: 'degrees' as any, angle: 180 } as any,
      });

      drawFoldLines(page, pageWidthPt, pageHeightPt, designHeightPt);

      const fontSize = 8;
      page.drawText('--- Hier falten ---', {
        x: pageWidthPt - 60,
        y: designHeightPt + 3,
        size: fontSize,
        color: rgb(0.5, 0.5, 0.5),
      });
    } else {
      const imgW = img.width;
      const imgH = img.height;
      const targetW = pageWidthPt - 2 * marginPt;
      const targetH = pageHeightPt - 2 * marginPt;
      const scale = Math.min(targetW / imgW, targetH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const drawX = marginPt + (targetW - drawW) / 2;
      const drawY = marginPt + (targetH - drawH) / 2;

      page.drawImage(img, { x: drawX, y: drawY, width: drawW, height: drawH });
    }

    const pdfBytes = await pdf.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="qr-diy-${format}-${eventId}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    logger.error('QR DIY export error', { message: getErrorMessage(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

router.post('/:id/qr/logo', authMiddleware, uploadSingleDesignImage('logo'), async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await requireEventEditAccess(req, res, eventId);
    if (!event) return;

    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const logoUrl = await storageService.uploadFile(eventId, req.file.originalname, req.file.buffer, req.file.mimetype);

    await prisma.qrDesign.upsert({
      where: { eventId },
      create: { eventId, logoUrl },
      update: { logoUrl },
    });

    return res.json({ logoUrl });
  } catch (error) {
    logger.error('Logo upload error', { message: getErrorMessage(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Logo upload failed' });
  }
});

router.delete('/:id/qr/logo', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await requireEventEditAccess(req, res, eventId);
    if (!event) return;

    const qrDesign = await prisma.qrDesign.findUnique({ where: { eventId } });
    if (qrDesign?.logoUrl) {
      await storageService.deleteFile(qrDesign.logoUrl);
      await prisma.qrDesign.update({
        where: { eventId },
        data: { logoUrl: null },
      });
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('Logo delete error', { message: getErrorMessage(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Logo delete failed' });
  }
});

// QR Code preview image (for img src)
router.get('/:id/qr', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const size = Math.min(Math.max(parseInt(req.query.size as string) || 200, 50), 1000);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://app.xn--gstefotos-v2a.com';
    const eventUrl = `${baseUrl}/e3/${event.slug}`;

    const QRCode = require('qrcode');
    const qrBuffer = await QRCode.toBuffer(eventUrl, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(qrBuffer);
  } catch (error) {
    logger.error('QR code preview error', { message: getErrorMessage(error), eventId: req.params.id });
    return res.status(500).json({ error: 'QR code generation failed' });
  }
});

router.post('/:id/qr/save-design', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      template, format, headline, subline, eventName,
      callToAction, bgColor, textColor, accentColor, logoUrl,
    } = req.body;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || (event.hostId !== user.id && user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }

    const design = await prisma.qrDesign.upsert({
      where: { eventId: id },
      create: {
        eventId: id, templateSlug: template, format, headline, subline,
        eventName, callToAction, bgColor, textColor, accentColor, logoUrl,
      },
      update: {
        templateSlug: template, format, headline, subline,
        eventName, callToAction, bgColor, textColor, accentColor, logoUrl,
      },
    });

    res.json(design);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save QR design' });
  }
});

export default router;
