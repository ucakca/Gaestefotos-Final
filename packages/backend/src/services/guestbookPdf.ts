import PDFDocument from 'pdfkit';
import prisma from '../config/database';
import { storageService } from './storage';
import { logger } from '../utils/logger';

interface GuestbookEntryForPdf {
  id: string;
  authorName: string | null;
  message: string | null;
  photoUrl: string | null;
  audioUrl: string | null;
  createdAt: Date;
  status: string;
}

export async function generateGuestbookPdf(
  eventId: string,
  options?: { includePhotos?: boolean; onlyApproved?: boolean }
): Promise<Buffer> {
  const includePhotos = options?.includePhotos ?? true;
  const onlyApproved = options?.onlyApproved ?? true;

  // Fetch event info
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true, dateTime: true, locationName: true, guestbookHostMessage: true },
  });

  if (!event) throw new Error('Event nicht gefunden');

  // Fetch guestbook entries
  const whereClause: any = { eventId };
  if (onlyApproved) whereClause.status = 'APPROVED';

  const entries: GuestbookEntryForPdf[] = await (prisma as any).guestbookEntry.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      authorName: true,
      message: true,
      photoUrl: true,
      audioUrl: true,
      createdAt: true,
      status: true,
    },
  });

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: `Gästebuch — ${event.title}`,
        Author: 'Gästefotos',
        Subject: 'Gästebuch-Export',
      },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ─── Title Page ───────────────────────────────────────────
    doc.fontSize(32).font('Helvetica-Bold');
    doc.text('Gästebuch', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(20).font('Helvetica');
    doc.text(event.title, { align: 'center' });
    doc.moveDown(0.3);

    if (event.dateTime) {
      doc.fontSize(12).fillColor('#666666');
      doc.text(
        new Date(event.dateTime).toLocaleDateString('de-DE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        { align: 'center' }
      );
    }

    if (event.locationName) {
      doc.fontSize(12).fillColor('#666666');
      doc.text(event.locationName, { align: 'center' });
    }

    doc.moveDown(1);

    // Host message
    if (event.guestbookHostMessage) {
      doc.fontSize(11).fillColor('#444444').font('Helvetica-Oblique');
      doc.text(`"${event.guestbookHostMessage}"`, { align: 'center' });
      doc.font('Helvetica');
    }

    doc.moveDown(1);

    // Separator line
    doc.strokeColor('#cccccc').lineWidth(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Entry count
    doc.fontSize(10).fillColor('#999999');
    doc.text(`${entries.length} Einträge`, { align: 'center' });
    doc.moveDown(2);

    // ─── Entries ──────────────────────────────────────────────
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Check if we need a new page (leave at least 120pt for an entry)
      if (doc.y > 680) {
        doc.addPage();
      }

      // Author name + date
      doc.fontSize(13).fillColor('#222222').font('Helvetica-Bold');
      doc.text(entry.authorName || 'Anonym', { continued: false });

      doc.fontSize(9).fillColor('#999999').font('Helvetica');
      const dateStr = new Date(entry.createdAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      doc.text(dateStr);
      doc.moveDown(0.3);

      // Message
      if (entry.message) {
        doc.fontSize(11).fillColor('#333333').font('Helvetica');
        doc.text(entry.message, { width: 495 });
      }

      // Photo indicator
      if (entry.photoUrl) {
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor('#666666');
        doc.text('📷 Foto angehängt', { width: 495 });
      }

      // Audio indicator
      if (entry.audioUrl) {
        doc.moveDown(0.1);
        doc.fontSize(9).fillColor('#666666');
        doc.text('🎤 Sprachnachricht angehängt', { width: 495 });
      }

      doc.moveDown(0.8);

      // Separator between entries
      if (i < entries.length - 1) {
        doc.strokeColor('#e5e5e5').lineWidth(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.8);
      }
    }

    // ─── Footer ───────────────────────────────────────────────
    doc.moveDown(2);
    doc.strokeColor('#cccccc').lineWidth(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(8).fillColor('#bbbbbb').font('Helvetica');
    doc.text(
      `Erstellt mit Gästefotos — ${new Date().toLocaleDateString('de-DE')}`,
      { align: 'center' }
    );

    doc.end();
  });
}
