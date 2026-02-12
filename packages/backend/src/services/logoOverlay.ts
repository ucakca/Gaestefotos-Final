import sharp from 'sharp';
import { logger } from '../utils/logger';

// SVG logo for gästefotos.com watermark — small, bottom-right corner
const LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="32" viewBox="0 0 200 32">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="200" height="32" rx="6" fill="rgba(0,0,0,0.45)"/>
  <text x="12" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="white" filter="url(#shadow)">
    📸 gästefotos.com
  </text>
</svg>
`;

/**
 * Add a small gästefotos.com logo watermark to the bottom-right corner of an image.
 * Used for hashtag-imported photos as branding.
 */
export async function addLogoOverlay(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 1920;
    const imgHeight = metadata.height || 1080;

    // Scale logo relative to image size (max 15% of width, min 120px)
    const logoWidth = Math.max(120, Math.min(Math.round(imgWidth * 0.15), 300));
    const logoHeight = Math.round(logoWidth * (32 / 200));

    const logoPng = await sharp(Buffer.from(LOGO_SVG))
      .resize(logoWidth, logoHeight)
      .png()
      .toBuffer();

    // Margin from edge: 2% of image dimensions
    const marginX = Math.round(imgWidth * 0.02);
    const marginY = Math.round(imgHeight * 0.02);

    return sharp(imageBuffer)
      .composite([{
        input: logoPng,
        gravity: 'southeast',
        top: imgHeight - logoHeight - marginY,
        left: imgWidth - logoWidth - marginX,
      }])
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (err) {
    logger.warn('logoOverlay: Failed to add watermark, returning original', {
      error: (err as Error).message,
    });
    return imageBuffer;
  }
}

/**
 * Add a "DEMO" watermark across the center of an image (for demo mosaic walls).
 */
export async function addDemoWatermark(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 1920;
    const imgHeight = metadata.height || 1080;

    const fontSize = Math.max(24, Math.round(imgWidth * 0.08));
    const svgWidth = Math.round(fontSize * 5);
    const svgHeight = Math.round(fontSize * 1.5);

    const watermarkSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
      <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="900"
        fill="rgba(255,255,255,0.3)" stroke="rgba(0,0,0,0.15)" stroke-width="2"
        transform="rotate(-30, ${svgWidth / 2}, ${svgHeight / 2})">
        DEMO
      </text>
    </svg>`;

    const watermarkPng = await sharp(Buffer.from(watermarkSvg))
      .png()
      .toBuffer();

    return sharp(imageBuffer)
      .composite([{
        input: watermarkPng,
        gravity: 'center',
        blend: 'over',
      }])
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (err) {
    logger.warn('demoWatermark: Failed to add watermark, returning original', {
      error: (err as Error).message,
    });
    return imageBuffer;
  }
}
