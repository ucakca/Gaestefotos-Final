/**
 * Photo Quality Gate Service
 * 
 * Runs automatic quality checks on uploaded photos:
 * 1. Resolution Check — Rejects photos below minimum dimensions
 * 2. Blur Detection — Flags blurry photos using Laplacian variance
 * 3. Duplicate Detection — Delegates to existing duplicateDetection service
 * 
 * Decision E11: Blur+Duplicate+Resolution always active (no opt-out).
 */

// Sharp import - fallback if not available (matches imageProcessor.ts pattern)
let sharp: any;
try {
  sharp = require('sharp');
} catch {
  // Sharp not available - handled in runPhotoQualityGate
}
import { logger } from '../utils/logger';
import { processDuplicateDetection, DuplicateResult } from './duplicateDetection';

// ─── THRESHOLDS ─────────────────────────────────────────────────────────────

const MIN_WIDTH = 200;
const MIN_HEIGHT = 200;
const MIN_MEGAPIXELS = 0.05; // 50k pixels minimum (very generous)
const BLUR_THRESHOLD = 50; // Laplacian variance below this = blurry
const BLUR_WARN_THRESHOLD = 100; // Below this = soft warning

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface QualityCheckResult {
  passed: boolean;
  checks: {
    resolution: { passed: boolean; width: number; height: number; megapixels: number; reason?: string };
    blur: { passed: boolean; score: number; isBlurry: boolean; isWarning: boolean; reason?: string };
    duplicate: DuplicateResult;
  };
  rejectionReason?: string;
  warnings: string[];
}

// ─── BLUR DETECTION ─────────────────────────────────────────────────────────

/**
 * Detect blur using Laplacian variance.
 * Sharp doesn't have a native Laplacian, so we use:
 * 1. Convert to greyscale
 * 2. Apply sharpen (acts like edge detection)
 * 3. Calculate variance of the result
 * Higher variance = sharper image, lower = blurrier.
 */
async function detectBlur(buffer: Buffer): Promise<{ score: number; isBlurry: boolean; isWarning: boolean }> {
  try {
    // Resize to consistent size for analysis (saves memory)
    const analysisSize = 512;
    const grey = await sharp(buffer)
      .resize(analysisSize, analysisSize, { fit: 'inside', withoutEnlargement: true })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = grey;
    const pixels = info.width * info.height;

    // Calculate edge strength using simple Laplacian kernel approximation
    // Kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0]
    let varianceSum = 0;
    const w = info.width;
    const h = info.height;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const laplacian =
          4 * data[idx] -
          data[idx - 1] -
          data[idx + 1] -
          data[idx - w] -
          data[idx + w];
        varianceSum += laplacian * laplacian;
      }
    }

    const score = Math.sqrt(varianceSum / Math.max(1, (w - 2) * (h - 2)));

    return {
      score: Math.round(score * 100) / 100,
      isBlurry: score < BLUR_THRESHOLD,
      isWarning: score < BLUR_WARN_THRESHOLD && score >= BLUR_THRESHOLD,
    };
  } catch (error) {
    logger.warn('[QualityGate] Blur detection failed, allowing photo', { error: (error as Error).message });
    return { score: 999, isBlurry: false, isWarning: false };
  }
}

// ─── RESOLUTION CHECK ───────────────────────────────────────────────────────

interface ResolutionResult {
  passed: boolean;
  width: number;
  height: number;
  megapixels: number;
  reason?: string;
}

async function checkResolution(buffer: Buffer): Promise<ResolutionResult> {
  try {
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const megapixels = (width * height) / 1_000_000;

    if (width < MIN_WIDTH || height < MIN_HEIGHT) {
      return {
        passed: false,
        width,
        height,
        megapixels: Math.round(megapixels * 100) / 100,
        reason: `Mindestgröße: ${MIN_WIDTH}x${MIN_HEIGHT}px (ist: ${width}x${height}px)`,
      };
    }

    if (megapixels < MIN_MEGAPIXELS) {
      return {
        passed: false,
        width,
        height,
        megapixels: Math.round(megapixels * 100) / 100,
        reason: `Zu niedrige Auflösung: ${megapixels.toFixed(2)} MP`,
      };
    }

    return { passed: true, width, height, megapixels: Math.round(megapixels * 100) / 100 };
  } catch (error) {
    logger.warn('[QualityGate] Resolution check failed, allowing photo', { error: (error as Error).message });
    return { passed: true, width: 0, height: 0, megapixels: 0 };
  }
}

// ─── MAIN QUALITY GATE ──────────────────────────────────────────────────────

/**
 * Run all quality checks on an uploaded photo.
 * Returns a comprehensive result with pass/fail status and details.
 * 
 * NOTE: This does NOT reject photos automatically — it flags them.
 * The upload flow decides how to handle flagged photos (e.g., auto-delete, mark for review).
 */
export async function runPhotoQualityGate(
  eventId: string,
  photoId: string,
  buffer: Buffer,
): Promise<QualityCheckResult> {
  if (!sharp) {
    logger.error('[QualityGate] Sharp not available — cannot run quality checks');
    throw new Error('Sharp image processor not available — cannot run quality gate');
  }

  const warnings: string[] = [];

  // Run checks in parallel
  const [resolution, blur, duplicate] = await Promise.all([
    checkResolution(buffer),
    detectBlur(buffer),
    processDuplicateDetection(eventId, photoId, buffer),
  ]);

  // Build blur check result
  const blurCheck = {
    passed: !blur.isBlurry,
    score: blur.score,
    isBlurry: blur.isBlurry,
    isWarning: blur.isWarning,
    reason: blur.isBlurry ? `Foto ist unscharf (Score: ${blur.score}, Minimum: ${BLUR_THRESHOLD})` : undefined,
  };

  // Collect warnings
  if (blur.isWarning) warnings.push(`Foto könnte unscharf sein (Score: ${blur.score})`);
  if (!resolution.passed) warnings.push(resolution.reason || 'Auflösung zu niedrig');
  if (blur.isBlurry) warnings.push(blurCheck.reason || 'Foto ist unscharf');
  if (duplicate.isDuplicate && !duplicate.isBestInGroup) warnings.push('Duplikat erkannt — nicht das beste Foto der Gruppe');

  // Overall pass: resolution must pass, blur must pass
  // Duplicates don't cause rejection — they're just flagged
  const passed = resolution.passed && blurCheck.passed;

  const result: QualityCheckResult = {
    passed,
    checks: {
      resolution,
      blur: blurCheck,
      duplicate,
    },
    warnings,
  };

  if (!passed) {
    const reasons: string[] = [];
    if (!resolution.passed) reasons.push(resolution.reason || 'Auflösung');
    if (!blurCheck.passed) reasons.push(blurCheck.reason || 'Unschärfe');
    result.rejectionReason = reasons.join('; ');
  }

  logger.info('[QualityGate] Photo checked', {
    eventId,
    photoId,
    passed,
    blurScore: blur.score,
    resolution: `${resolution.width}x${resolution.height}`,
    isDuplicate: duplicate.isDuplicate,
    warnings: warnings.length,
  });

  return result;
}
