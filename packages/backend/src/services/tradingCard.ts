import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';
import { logger } from '../utils/logger';
import { storageService } from './storage';

interface TradingCardOptions {
  photoBuffer: Buffer;
  eventId: string;
  guestName?: string;
  stats: {
    title: string;
    emoji: string;
    charisma: number;
    humor: number;
    dance: number;
    style: number;
    energy: number;
    specialMove: string;
  };
}

const CARD_WIDTH = 600;
const CARD_HEIGHT = 900;
const PHOTO_Y = 80;
const PHOTO_SIZE = 340;
const STATS_Y = 480;

const STAT_LABELS = [
  { key: 'charisma', label: 'Charisma', color: '#f59e0b' },
  { key: 'humor', label: 'Humor', color: '#10b981' },
  { key: 'dance', label: 'Tanzskill', color: '#8b5cf6' },
  { key: 'style', label: 'Style', color: '#ec4899' },
  { key: 'energy', label: 'Energie', color: '#3b82f6' },
];

export async function createTradingCard(options: TradingCardOptions): Promise<{ cardUrl: string }> {
  const { photoBuffer, eventId, guestName, stats } = options;

  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // ─── Background gradient ───
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bgGrad.addColorStop(0, '#1a1a2e');
  bgGrad.addColorStop(0.5, '#16213e');
  bgGrad.addColorStop(1, '#0f3460');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // ─── Card border (gold) ───
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.roundRect(10, 10, CARD_WIDTH - 20, CARD_HEIGHT - 20, 20);
  ctx.stroke();

  // ─── Inner border ───
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
  ctx.lineWidth = 1;
  ctx.roundRect(18, 18, CARD_WIDTH - 36, CARD_HEIGHT - 36, 16);
  ctx.stroke();

  // ─── Title bar ───
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ PARTY LEGEND ★', CARD_WIDTH / 2, 50);

  // ─── Photo frame ───
  const photoX = (CARD_WIDTH - PHOTO_SIZE) / 2;

  // Photo frame glow
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.roundRect(photoX - 3, PHOTO_Y - 3, PHOTO_SIZE + 6, PHOTO_SIZE + 6, 12);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Load and draw photo
  try {
    const resizedPhoto = await sharp(photoBuffer)
      .resize(PHOTO_SIZE, PHOTO_SIZE, { fit: 'cover' })
      .png()
      .toBuffer();

    const photoImage = await loadImage(resizedPhoto);

    // Clip rounded rect for photo
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(photoX, PHOTO_Y, PHOTO_SIZE, PHOTO_SIZE, 10);
    ctx.clip();
    ctx.drawImage(photoImage, photoX, PHOTO_Y, PHOTO_SIZE, PHOTO_SIZE);
    ctx.restore();
  } catch (err) {
    logger.warn('Trading card photo load failed, using placeholder');
    ctx.fillStyle = '#334155';
    ctx.roundRect(photoX, PHOTO_Y, PHOTO_SIZE, PHOTO_SIZE, 10);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '60px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📸', CARD_WIDTH / 2, PHOTO_Y + PHOTO_SIZE / 2 + 20);
  }

  // ─── Name + Title ───
  const nameY = PHOTO_Y + PHOTO_SIZE + 35;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(guestName || 'Mystery Guest', CARD_WIDTH / 2, nameY);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`${stats.emoji} ${stats.title}`, CARD_WIDTH / 2, nameY + 28);

  // ─── Stats bars ───
  const barX = 60;
  const barWidth = CARD_WIDTH - 120;
  const barHeight = 20;
  const barGap = 38;

  STAT_LABELS.forEach((stat, i) => {
    const y = STATS_Y + i * barGap;
    const value = Math.min(99, Math.max(1, (stats as any)[stat.key] || 50));

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(stat.label, barX, y);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(value), barX + barWidth, y);

    // Bar background
    const barY = y + 5;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 5);
    ctx.fill();

    // Bar fill
    const fillWidth = (value / 100) * barWidth;
    const barGrad = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
    barGrad.addColorStop(0, stat.color);
    barGrad.addColorStop(1, stat.color + '80');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillWidth, barHeight, 5);
    ctx.fill();
  });

  // ─── Special Move ───
  const moveY = STATS_Y + STAT_LABELS.length * barGap + 25;
  ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
  ctx.beginPath();
  ctx.roundRect(40, moveY, CARD_WIDTH - 80, 44, 10);
  ctx.fill();

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(40, moveY, CARD_WIDTH - 80, 44, 10);
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SPEZIAL-MOVE', CARD_WIDTH / 2, moveY + 17);

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.fillText(stats.specialMove, CARD_WIDTH / 2, moveY + 35);

  // ─── Footer ───
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('gästefotos.com • AI Trading Card', CARD_WIDTH / 2, CARD_HEIGHT - 25);

  // ─── Export ───
  const pngBuffer = canvas.toBuffer('image/png');

  const key = await storageService.uploadFile(
    eventId,
    `trading-card-${Date.now()}.png`,
    pngBuffer,
    'image/png'
  );
  const cardUrl = await storageService.getFileUrl(key);

  logger.info('Trading card created', { eventId, guestName });

  return { cardUrl };
}
