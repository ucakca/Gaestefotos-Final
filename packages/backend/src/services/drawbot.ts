/**
 * Drawbot Service
 * 
 * Pipeline: Foto → Edge Detection → Line Art → SVG Paths → G-Code
 * 
 * Inspiriert von FotoMaster Draw Me Bot:
 * - Monet-Stil: Realistische, elegante Line-Art mit hoher Ähnlichkeit
 * - Davinci-Stil: Spielerische, ausdrucksstarke Karikaturen
 * 
 * Zwei Ansätze:
 * 1. LOCAL: sharp (Canny-ähnlich) → Konturen → SVG → G-Code (schnell, kostenlos)
 * 2. AI: Stability AI / Replicate → One-Line-Art Prompt → SVG → G-Code (qualitativ besser)
 * 
 * Der Server hat AMD Ryzen 9 5950X + 125GB RAM → lokale Bildverarbeitung kein Problem.
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { logger } from '../utils/logger';
import { resolvePrompt, renderPrompt } from './promptTemplates';

// Lazy import: canvas has native bindings that may not be available in all environments
let _canvas: typeof import('canvas') | null = null;
async function getCanvas() {
  if (!_canvas) {
    _canvas = await import('canvas');
  }
  return _canvas;
}

// ─── Constants ──────────────────────────────────────────────

const DRAWBOT_TEMP_DIR = '/tmp/drawbot';
const DRAWBOT_OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'drawbot');

if (!existsSync(DRAWBOT_TEMP_DIR)) mkdirSync(DRAWBOT_TEMP_DIR, { recursive: true });
if (!existsSync(DRAWBOT_OUTPUT_DIR)) mkdirSync(DRAWBOT_OUTPUT_DIR, { recursive: true });

// ─── Types ──────────────────────────────────────────────────

export type DrawbotStyle = 'monet' | 'davinci' | 'minimal' | 'continuous';

export interface DrawbotRequest {
  photoId?: string;
  imageBuffer: Buffer;
  style: DrawbotStyle;
  /** Paper size in mm */
  paperWidth?: number;
  paperHeight?: number;
  /** Drawing detail level 1-10 (higher = more detail, slower draw) */
  detail?: number;
  /** Line thickness for G-Code (pen width in mm) */
  penWidth?: number;
  /** Drawing speed mm/min */
  drawSpeed?: number;
  /** Travel speed mm/min (pen up) */
  travelSpeed?: number;
}

export interface DrawbotResult {
  /** SVG string of the line art */
  svg: string;
  /** G-Code string for the drawing robot */
  gcode: string;
  /** Path to saved SVG file */
  svgPath: string;
  /** Path to saved G-Code file */
  gcodePath: string;
  /** Preview PNG (line art on white background) */
  previewPath: string;
  /** Number of line segments */
  lineCount: number;
  /** Estimated drawing time in seconds */
  estimatedDrawTime: number;
  /** Processing time in ms */
  processingMs: number;
}

// ─── Style Presets ──────────────────────────────────────────

interface StylePreset {
  name: string;
  description: string;
  edgeThreshold: { low: number; high: number };
  blur: number;
  invert: boolean;
  simplifyTolerance: number;
  minPathLength: number;
}

const STYLE_PRESETS: Record<DrawbotStyle, StylePreset> = {
  monet: {
    name: 'Monet',
    description: 'Realistische, elegante Line-Art mit hoher Ähnlichkeit',
    edgeThreshold: { low: 30, high: 100 },
    blur: 1.2,
    invert: false,
    simplifyTolerance: 1.5,
    minPathLength: 8,
  },
  davinci: {
    name: 'Da Vinci',
    description: 'Spielerische, ausdrucksstarke Skizze mit Charakter',
    edgeThreshold: { low: 20, high: 80 },
    blur: 0.8,
    invert: false,
    simplifyTolerance: 2.0,
    minPathLength: 5,
  },
  minimal: {
    name: 'Minimal',
    description: 'Reduzierten Linien — schnell zu zeichnen',
    edgeThreshold: { low: 50, high: 150 },
    blur: 2.0,
    invert: false,
    simplifyTolerance: 3.0,
    minPathLength: 15,
  },
  continuous: {
    name: 'Continuous Line',
    description: 'Eine durchgehende Linie — künstlerisch',
    edgeThreshold: { low: 40, high: 120 },
    blur: 1.5,
    invert: false,
    simplifyTolerance: 2.5,
    minPathLength: 10,
  },
};

export function getDrawbotStyles(): Record<DrawbotStyle, { name: string; description: string }> {
  const result: any = {};
  for (const [key, preset] of Object.entries(STYLE_PRESETS)) {
    result[key] = { name: preset.name, description: preset.description };
  }
  return result;
}

// ─── Core Pipeline ──────────────────────────────────────────

/**
 * Main Drawbot pipeline: Image → Line Art → SVG → G-Code
 */
export async function processDrawbot(request: DrawbotRequest): Promise<DrawbotResult> {
  const startTime = Date.now();
  const jobId = `drawbot-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const jobDir = path.join(DRAWBOT_TEMP_DIR, jobId);
  await fs.mkdir(jobDir, { recursive: true });

  try {
    const {
      imageBuffer,
      style = 'monet',
      paperWidth = 210,   // A4 default
      paperHeight = 297,
      detail = 5,
      penWidth = 0.5,
      drawSpeed = 3000,
      travelSpeed = 5000,
    } = request;

    const preset = STYLE_PRESETS[style] || STYLE_PRESETS.monet;

    logger.info('[Drawbot] Processing', { style, detail, paperWidth, paperHeight });

    // Step 1: Preprocess image (resize, grayscale, blur)
    const processed = await preprocessImage(imageBuffer, preset, detail);

    // Step 2: Edge detection (Sobel-based)
    const edges = await detectEdges(processed.data, processed.width, processed.height, preset);

    // Step 3: Trace contours → paths
    const paths = traceContours(edges, processed.width, processed.height, preset);

    logger.info('[Drawbot] Contours traced', { pathCount: paths.length });

    // Step 4: Simplify paths (Douglas-Peucker)
    const simplified = paths.map(p => simplifyPath(p, preset.simplifyTolerance));

    // Step 5: Scale to paper size
    const scaled = scalePaths(simplified, processed.width, processed.height, paperWidth, paperHeight);

    // Step 6: Generate SVG
    const svg = generateSVG(scaled, paperWidth, paperHeight, penWidth);

    // Step 7: Generate G-Code
    const gcode = generateGCode(scaled, {
      paperWidth,
      paperHeight,
      penWidth,
      drawSpeed,
      travelSpeed,
    });

    // Step 8: Save files
    const timestamp = Date.now();
    const svgFilename = `drawbot-${timestamp}.svg`;
    const gcodeFilename = `drawbot-${timestamp}.gcode`;
    const previewFilename = `drawbot-${timestamp}-preview.png`;

    const svgPath = path.join(DRAWBOT_OUTPUT_DIR, svgFilename);
    const gcodePath = path.join(DRAWBOT_OUTPUT_DIR, gcodeFilename);
    const previewPath = path.join(DRAWBOT_OUTPUT_DIR, previewFilename);

    await fs.writeFile(svgPath, svg);
    await fs.writeFile(gcodePath, gcode);

    // Generate preview PNG
    await generatePreview(scaled, processed.width, processed.height, paperWidth, paperHeight, previewPath);

    // Estimate draw time
    const totalLength = scaled.reduce((sum, p) => {
      let len = 0;
      for (let i = 1; i < p.length; i++) {
        const dx = p[i][0] - p[i - 1][0];
        const dy = p[i][1] - p[i - 1][1];
        len += Math.sqrt(dx * dx + dy * dy);
      }
      return sum + len;
    }, 0);
    const estimatedDrawTime = Math.round((totalLength / drawSpeed) * 60);

    const processingMs = Date.now() - startTime;
    logger.info('[Drawbot] Complete', { processingMs, lineCount: scaled.length, estimatedDrawTime });

    // Cleanup temp
    await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});

    return {
      svg,
      gcode,
      svgPath: `/uploads/drawbot/${svgFilename}`,
      gcodePath: `/uploads/drawbot/${gcodeFilename}`,
      previewPath: `/uploads/drawbot/${previewFilename}`,
      lineCount: scaled.length,
      estimatedDrawTime,
      processingMs,
    };
  } catch (error) {
    await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

// ─── Step 1: Image Preprocessing ────────────────────────────

async function preprocessImage(
  buffer: Buffer,
  preset: StylePreset,
  detail: number
): Promise<{ data: Uint8Array; width: number; height: number }> {
  // Target resolution based on detail level (1-10)
  const targetWidth = Math.round(400 + (detail - 1) * 80); // 400px (detail=1) to 1120px (detail=10)

  const image = sharp(buffer)
    .grayscale()
    .resize(targetWidth, undefined, { fit: 'inside' })
    .blur(preset.blur > 0 ? preset.blur : undefined);

  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8Array(data),
    width: info.width,
    height: info.height,
  };
}

// ─── Step 2: Edge Detection (Sobel) ─────────────────────────

function detectEdges(
  pixels: Uint8Array,
  width: number,
  height: number,
  preset: StylePreset
): Uint8Array {
  const edges = new Uint8Array(width * height);
  const { low, high } = preset.edgeThreshold;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Sobel kernels
      const gx =
        -1 * pixels[(y - 1) * width + (x - 1)] +
        1 * pixels[(y - 1) * width + (x + 1)] +
        -2 * pixels[y * width + (x - 1)] +
        2 * pixels[y * width + (x + 1)] +
        -1 * pixels[(y + 1) * width + (x - 1)] +
        1 * pixels[(y + 1) * width + (x + 1)];

      const gy =
        -1 * pixels[(y - 1) * width + (x - 1)] +
        -2 * pixels[(y - 1) * width + x] +
        -1 * pixels[(y - 1) * width + (x + 1)] +
        1 * pixels[(y + 1) * width + (x - 1)] +
        2 * pixels[(y + 1) * width + x] +
        1 * pixels[(y + 1) * width + (x + 1)];

      const magnitude = Math.sqrt(gx * gx + gy * gy);

      // Hysteresis thresholding
      if (magnitude > high) {
        edges[y * width + x] = 255;
      } else if (magnitude > low) {
        // Check if connected to a strong edge
        const hasStrongNeighbor = [
          edges[(y - 1) * width + (x - 1)],
          edges[(y - 1) * width + x],
          edges[(y - 1) * width + (x + 1)],
          edges[y * width + (x - 1)],
        ].some(v => v === 255);
        edges[y * width + x] = hasStrongNeighbor ? 255 : 0;
      }
    }
  }

  return edges;
}

// ─── Step 3: Contour Tracing ────────────────────────────────

type Point = [number, number];
type Path = Point[];

function traceContours(
  edges: Uint8Array,
  width: number,
  height: number,
  preset: StylePreset
): Path[] {
  const visited = new Uint8Array(width * height);
  const paths: Path[] = [];

  // 8-connected neighbor offsets
  const dx = [-1, 0, 1, 1, 1, 0, -1, -1];
  const dy = [-1, -1, -1, 0, 1, 1, 1, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (edges[idx] !== 255 || visited[idx]) continue;

      // Follow connected edge pixels
      const path: Path = [];
      let cx = x, cy = y;

      while (true) {
        const cidx = cy * width + cx;
        if (visited[cidx]) break;
        visited[cidx] = 1;
        path.push([cx, cy]);

        // Find next unvisited edge neighbor
        let found = false;
        for (let d = 0; d < 8; d++) {
          const nx = cx + dx[d];
          const ny = cy + dy[d];
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nidx = ny * width + nx;
          if (edges[nidx] === 255 && !visited[nidx]) {
            cx = nx;
            cy = ny;
            found = true;
            break;
          }
        }
        if (!found) break;
      }

      if (path.length >= preset.minPathLength) {
        paths.push(path);
      }
    }
  }

  return paths;
}

// ─── Step 4: Path Simplification (Douglas-Peucker) ──────────

function simplifyPath(path: Path, tolerance: number): Path {
  if (path.length <= 2) return path;

  let maxDist = 0;
  let maxIdx = 0;
  const first = path[0];
  const last = path[path.length - 1];

  for (let i = 1; i < path.length - 1; i++) {
    const dist = pointToLineDistance(path[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPath(path.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPath(path.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const ddx = point[0] - lineStart[0];
    const ddy = point[1] - lineStart[1];
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }

  const t = Math.max(0, Math.min(1, ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / lenSq));
  const projX = lineStart[0] + t * dx;
  const projY = lineStart[1] + t * dy;
  const ddx = point[0] - projX;
  const ddy = point[1] - projY;
  return Math.sqrt(ddx * ddx + ddy * ddy);
}

// ─── Step 5: Scale to Paper ─────────────────────────────────

function scalePaths(
  paths: Path[],
  imgWidth: number,
  imgHeight: number,
  paperWidth: number,
  paperHeight: number
): Path[] {
  // Maintain aspect ratio
  const scaleX = paperWidth / imgWidth;
  const scaleY = paperHeight / imgHeight;
  const scale = Math.min(scaleX, scaleY);

  // Center on paper
  const offsetX = (paperWidth - imgWidth * scale) / 2;
  const offsetY = (paperHeight - imgHeight * scale) / 2;

  return paths.map(path =>
    path.map(([x, y]) => [
      Math.round((x * scale + offsetX) * 100) / 100,
      Math.round((y * scale + offsetY) * 100) / 100,
    ] as Point)
  );
}

// ─── Step 6: SVG Generation ─────────────────────────────────

function generateSVG(
  paths: Path[],
  width: number,
  height: number,
  strokeWidth: number = 0.5
): string {
  const svgPaths = paths.map(path => {
    if (path.length < 2) return '';
    const d = `M ${path[0][0]} ${path[0][1]} ` +
      path.slice(1).map(([x, y]) => `L ${x} ${y}`).join(' ');
    return `  <path d="${d}" />`;
  }).filter(Boolean);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width}mm" height="${height}mm" 
     viewBox="0 0 ${width} ${height}">
  <g fill="none" stroke="black" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
${svgPaths.join('\n')}
  </g>
</svg>`;
}

// ─── Step 7: G-Code Generation ──────────────────────────────

interface GCodeOptions {
  paperWidth: number;
  paperHeight: number;
  penWidth: number;
  drawSpeed: number;
  travelSpeed: number;
  penUpZ?: number;
  penDownZ?: number;
}

function generateGCode(paths: Path[], options: GCodeOptions): string {
  const {
    drawSpeed,
    travelSpeed,
    penUpZ = 5,
    penDownZ = 0,
  } = options;

  const lines: string[] = [
    '; Drawbot G-Code',
    '; Generated by gaestefotos.com Drawbot Service',
    `; Paper: ${options.paperWidth}x${options.paperHeight}mm`,
    `; Paths: ${paths.length}`,
    `; Pen width: ${options.penWidth}mm`,
    `; Draw speed: ${drawSpeed}mm/min`,
    `; Travel speed: ${travelSpeed}mm/min`,
    '',
    '; Initialize',
    'G21 ; mm mode',
    'G90 ; absolute positioning',
    `G0 Z${penUpZ} F${travelSpeed} ; pen up`,
    'G28 X Y ; home XY',
    '',
  ];

  let totalTravel = 0;
  let totalDraw = 0;
  let lastX = 0, lastY = 0;

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    if (path.length < 2) continue;

    lines.push(`; Path ${i + 1} (${path.length} points)`);

    // Travel to start
    const [startX, startY] = path[0];
    const travelDist = Math.sqrt((startX - lastX) ** 2 + (startY - lastY) ** 2);
    totalTravel += travelDist;

    lines.push(`G0 Z${penUpZ} ; pen up`);
    lines.push(`G0 X${startX} Y${startY} F${travelSpeed} ; move to start`);
    lines.push(`G0 Z${penDownZ} ; pen down`);

    // Draw path
    for (let j = 1; j < path.length; j++) {
      const [x, y] = path[j];
      const drawDist = Math.sqrt((x - path[j - 1][0]) ** 2 + (y - path[j - 1][1]) ** 2);
      totalDraw += drawDist;
      lines.push(`G1 X${x} Y${y} F${drawSpeed}`);
    }

    lastX = path[path.length - 1][0];
    lastY = path[path.length - 1][1];
    lines.push('');
  }

  // Footer
  lines.push('; Finish');
  lines.push(`G0 Z${penUpZ} ; pen up`);
  lines.push('G28 X Y ; home');
  lines.push('M84 ; motors off');
  lines.push('');
  lines.push(`; Stats: ${paths.length} paths, draw=${Math.round(totalDraw)}mm, travel=${Math.round(totalTravel)}mm`);
  lines.push(`; Est. draw time: ${Math.round(totalDraw / drawSpeed * 60)}s + ${Math.round(totalTravel / travelSpeed * 60)}s travel`);

  return lines.join('\n');
}

// ─── Preview Generation ─────────────────────────────────────

async function generatePreview(
  paths: Path[],
  imgWidth: number,
  imgHeight: number,
  paperWidth: number,
  paperHeight: number,
  outputPath: string
): Promise<void> {
  // Render at 2x for quality
  const scale = 2;
  const canvasWidth = Math.round(paperWidth * scale);
  const canvasHeight = Math.round(paperHeight * scale);

  const { createCanvas } = await getCanvas();
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw paths
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const path of paths) {
    if (path.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(path[0][0] * scale, path[0][1] * scale);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i][0] * scale, path[i][1] * scale);
    }
    ctx.stroke();
  }

  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(outputPath, buffer);
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Get available Drawbot styles
 */
export function getStyles(): Record<DrawbotStyle, { name: string; description: string }> {
  return getDrawbotStyles();
}

/**
 * Process a photo into line art + G-Code for the drawing robot.
 * This is the main entry point for the Drawbot feature.
 */
export async function createDrawing(
  imageBuffer: Buffer,
  style: DrawbotStyle = 'monet',
  options?: Partial<DrawbotRequest>
): Promise<DrawbotResult> {
  return processDrawbot({
    imageBuffer,
    style,
    ...options,
  });
}

/**
 * List existing drawbot outputs for cleanup/management
 */
export async function listDrawings(): Promise<string[]> {
  try {
    const files = await fs.readdir(DRAWBOT_OUTPUT_DIR);
    return files.filter(f => f.startsWith('drawbot-'));
  } catch {
    return [];
  }
}

/**
 * Delete a drawbot output file
 */
export async function deleteDrawing(filename: string): Promise<void> {
  const filepath = path.join(DRAWBOT_OUTPUT_DIR, path.basename(filename));
  await fs.unlink(filepath);
}
