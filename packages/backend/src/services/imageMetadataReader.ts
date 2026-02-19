/**
 * Image Metadata Reader Service
 * 
 * Extracts ALL metadata from uploaded images including:
 * - EXIF data (camera, GPS, dates, software)
 * - AI generation parameters (Stable Diffusion, ComfyUI, Midjourney)
 * - PNG tEXt chunks (SD parameters, workflow JSON)
 * - XMP data (Adobe, AI tools)
 * - ICC Profile info
 * 
 * Cost: $0 — runs entirely locally using sharp + exifr + PNG chunk parsing.
 */

import sharp from 'sharp';
import { logger } from '../utils/logger';

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface ImageMetadata {
  basic: {
    width: number;
    height: number;
    format: string;
    space: string;
    channels: number;
    depth: string;
    density?: number;
    hasAlpha: boolean;
    fileSize: number;
    megapixels: number;
  };
  exif: Record<string, any> | null;
  aiGeneration: AiGenerationParams | null;
  pngChunks: Record<string, string> | null;
  xmp: Record<string, any> | null;
  icc: { description?: string; copyright?: string } | null;
}

export interface AiGenerationParams {
  source: 'sd_parameters' | 'comfyui_workflow' | 'exif_software' | 'exif_comment' | 'xmp' | 'png_comment';
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  sampler?: string;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  size?: string;
  software?: string;
  rawText?: string;
}

// ─── PNG CHUNK PARSER ───────────────────────────────────────────────────────

/**
 * Parse PNG tEXt/iTXt/zTXt chunks to extract metadata.
 * SD WebUI stores generation parameters in the "parameters" tEXt chunk.
 * ComfyUI stores workflow JSON in the "prompt" or "workflow" chunk.
 */
function parsePngTextChunks(buffer: Buffer): Record<string, string> | null {
  const chunks: Record<string, string> = {};

  // PNG signature: 8 bytes
  if (buffer.length < 8) return null;
  const pngSig = buffer.slice(0, 8);
  if (pngSig[0] !== 0x89 || pngSig[1] !== 0x50 || pngSig[2] !== 0x4E || pngSig[3] !== 0x47) {
    return null; // Not a PNG
  }

  let offset = 8;
  while (offset < buffer.length - 12) {
    const length = buffer.readUInt32BE(offset);
    const typeBytes = buffer.slice(offset + 4, offset + 8);
    const type = typeBytes.toString('ascii');

    if (type === 'tEXt' && offset + 8 + length <= buffer.length) {
      // tEXt: keyword\0text
      const data = buffer.slice(offset + 8, offset + 8 + length);
      const nullIdx = data.indexOf(0);
      if (nullIdx > 0) {
        const keyword = data.slice(0, nullIdx).toString('latin1');
        const text = data.slice(nullIdx + 1).toString('latin1');
        chunks[keyword] = text;
      }
    } else if (type === 'iTXt' && offset + 8 + length <= buffer.length) {
      // iTXt: keyword\0compressionFlag\0compressionMethod\0languageTag\0translatedKeyword\0text
      const data = buffer.slice(offset + 8, offset + 8 + length);
      const nullIdx = data.indexOf(0);
      if (nullIdx > 0) {
        const keyword = data.slice(0, nullIdx).toString('utf8');
        // Skip compression flag (1 byte), compression method (1 byte)
        let pos = nullIdx + 3;
        // Skip language tag
        const langEnd = data.indexOf(0, pos);
        if (langEnd >= 0) pos = langEnd + 1;
        // Skip translated keyword
        const transEnd = data.indexOf(0, pos);
        if (transEnd >= 0) pos = transEnd + 1;
        const text = data.slice(pos).toString('utf8');
        chunks[keyword] = text;
      }
    }

    // Move to next chunk: length + type(4) + data(length) + CRC(4)
    offset += 12 + length;

    // IEND = end of PNG
    if (type === 'IEND') break;
  }

  return Object.keys(chunks).length > 0 ? chunks : null;
}

// ─── SD PARAMETERS PARSER ───────────────────────────────────────────────────

/**
 * Parse Stable Diffusion WebUI parameter string.
 * Format: "prompt\nNegative prompt: neg\nSteps: 20, Sampler: Euler a, CFG scale: 7, Seed: 12345, Size: 512x512, Model: sdxl"
 */
function parseSDParameters(text: string): AiGenerationParams | null {
  if (!text || text.length < 10) return null;

  const result: AiGenerationParams = {
    source: 'sd_parameters',
    rawText: text,
  };

  const lines = text.split('\n');

  // First line(s) until "Negative prompt:" = positive prompt
  const promptLines: string[] = [];
  let negativeStartIdx = -1;
  let paramsStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Negative prompt:')) {
      negativeStartIdx = i;
      break;
    }
    if (/^Steps:\s*\d/.test(lines[i]) || /^Sampler:/.test(lines[i])) {
      paramsStartIdx = i;
      break;
    }
    promptLines.push(lines[i]);
  }

  result.prompt = promptLines.join('\n').trim();

  // Negative prompt
  if (negativeStartIdx >= 0) {
    const negLines: string[] = [];
    for (let i = negativeStartIdx; i < lines.length; i++) {
      if (i === negativeStartIdx) {
        negLines.push(lines[i].replace('Negative prompt:', '').trim());
      } else if (/^Steps:\s*\d/.test(lines[i]) || /^Sampler:/.test(lines[i])) {
        paramsStartIdx = i;
        break;
      } else {
        negLines.push(lines[i]);
      }
    }
    result.negativePrompt = negLines.join('\n').trim();
  }

  // Parse key-value parameters from the last line(s)
  if (paramsStartIdx >= 0) {
    const paramsText = lines.slice(paramsStartIdx).join(', ');
    const kvPairs = paramsText.split(',').map(s => s.trim());

    for (const pair of kvPairs) {
      const [key, ...valueParts] = pair.split(':');
      const value = valueParts.join(':').trim();
      if (!key || !value) continue;

      const k = key.trim().toLowerCase();
      if (k === 'steps') result.steps = parseInt(value, 10);
      else if (k === 'sampler') result.sampler = value;
      else if (k === 'cfg scale') result.cfgScale = parseFloat(value);
      else if (k === 'seed') result.seed = parseInt(value, 10);
      else if (k === 'size') result.size = value;
      else if (k === 'model' || k === 'model hash') result.model = value;
    }
  }

  return result.prompt ? result : null;
}

// ─── COMFYUI WORKFLOW PARSER ────────────────────────────────────────────────

function parseComfyUIWorkflow(jsonText: string): AiGenerationParams | null {
  try {
    const workflow = JSON.parse(jsonText);
    const result: AiGenerationParams = {
      source: 'comfyui_workflow',
      rawText: jsonText.substring(0, 2000),
    };

    // Try to find prompt nodes (KSampler, CLIPTextEncode, etc.)
    for (const [, node] of Object.entries(workflow) as any) {
      if (node?.class_type === 'CLIPTextEncode' && node?.inputs?.text) {
        if (!result.prompt) {
          result.prompt = node.inputs.text;
        }
      }
      if (node?.class_type === 'KSampler' && node?.inputs) {
        if (node.inputs.steps) result.steps = node.inputs.steps;
        if (node.inputs.cfg) result.cfgScale = node.inputs.cfg;
        if (node.inputs.seed) result.seed = node.inputs.seed;
        if (node.inputs.sampler_name) result.sampler = node.inputs.sampler_name;
      }
      if (node?.class_type === 'CheckpointLoaderSimple' && node?.inputs?.ckpt_name) {
        result.model = node.inputs.ckpt_name;
      }
    }

    result.software = 'ComfyUI';
    return result.prompt ? result : null;
  } catch {
    return null;
  }
}

// ─── MAIN EXTRACTION ────────────────────────────────────────────────────────

/**
 * Extract all metadata from an image buffer.
 * Returns structured data for EXIF, AI generation params, PNG chunks, XMP.
 */
export async function extractImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const result: ImageMetadata = {
    basic: { width: 0, height: 0, format: '', space: '', channels: 0, depth: '', hasAlpha: false, fileSize: buffer.length, megapixels: 0 },
    exif: null,
    aiGeneration: null,
    pngChunks: null,
    xmp: null,
    icc: null,
  };

  try {
    // 1. Sharp metadata (basic info + ICC)
    const meta = await sharp(buffer).metadata();
    result.basic = {
      width: meta.width || 0,
      height: meta.height || 0,
      format: meta.format || '',
      space: meta.space || '',
      channels: meta.channels || 0,
      depth: meta.depth || '',
      density: meta.density,
      hasAlpha: meta.hasAlpha || false,
      fileSize: buffer.length,
      megapixels: Math.round(((meta.width || 0) * (meta.height || 0)) / 10000) / 100,
    };

    if (meta.icc) {
      try {
        const iccStr = meta.icc.toString('ascii').substring(0, 500);
        result.icc = { description: iccStr.includes('sRGB') ? 'sRGB' : iccStr.includes('Display P3') ? 'Display P3' : 'Custom' };
      } catch { /* ignore */ }
    }
  } catch (error) {
    logger.warn('[MetadataReader] Sharp metadata failed', { error: (error as Error).message });
  }

  try {
    // 2. EXIF via exifr (comprehensive)
    const exifr: any = await import('exifr');
    const exif = await exifr.parse(buffer, {
      // Extract everything
      tiff: true,
      xmp: true,
      icc: false,
      iptc: true,
      jfif: true,
      ihdr: true,
    });

    if (exif && typeof exif === 'object') {
      result.exif = {};
      // Extract all non-buffer fields
      for (const [key, value] of Object.entries(exif)) {
        if (Buffer.isBuffer(value) || value instanceof Uint8Array) continue;
        if (typeof value === 'function') continue;
        result.exif[key] = value;
      }

      // Check for AI generation hints in EXIF
      const software = exif.Software || exif.software || '';
      const userComment = exif.UserComment || exif.userComment || '';
      const imageDesc = exif.ImageDescription || exif.imageDescription || '';

      if (typeof software === 'string' && /stable.diffusion|comfyui|midjourney|dall.e|novelai/i.test(software)) {
        result.aiGeneration = {
          source: 'exif_software',
          software,
          prompt: typeof imageDesc === 'string' ? imageDesc : undefined,
          rawText: `Software: ${software}`,
        };
      }

      if (typeof userComment === 'string' && userComment.length > 10 && !result.aiGeneration) {
        result.aiGeneration = {
          source: 'exif_comment',
          prompt: userComment,
          rawText: userComment,
        };
      }

      // XMP extraction
      try {
        const xmpData = await exifr.parse(buffer, { xmp: true, tiff: false, icc: false });
        if (xmpData) {
          result.xmp = {};
          for (const [key, value] of Object.entries(xmpData)) {
            if (Buffer.isBuffer(value) || typeof value === 'function') continue;
            if (key.startsWith('xmp') || key.startsWith('dc') || key === 'Description' || key === 'Creator') {
              result.xmp[key] = value;
            }
          }
          if (Object.keys(result.xmp).length === 0) result.xmp = null;
        }
      } catch { /* XMP extraction optional */ }
    }
  } catch (error) {
    logger.warn('[MetadataReader] EXIF extraction failed', { error: (error as Error).message });
  }

  // 3. PNG-specific: tEXt chunks
  if (result.basic.format === 'png' || buffer[0] === 0x89) {
    const pngChunks = parsePngTextChunks(buffer);
    if (pngChunks) {
      result.pngChunks = pngChunks;

      // Check for SD parameters
      if (pngChunks['parameters'] && !result.aiGeneration) {
        result.aiGeneration = parseSDParameters(pngChunks['parameters']);
      }

      // Check for ComfyUI workflow
      if (pngChunks['prompt'] && !result.aiGeneration) {
        result.aiGeneration = parseComfyUIWorkflow(pngChunks['prompt']);
      }
      if (pngChunks['workflow'] && !result.aiGeneration) {
        result.aiGeneration = parseComfyUIWorkflow(pngChunks['workflow']);
      }

      // Check Comment field
      if (pngChunks['Comment'] && !result.aiGeneration) {
        // Could be ComfyUI JSON or SD params
        const comment = pngChunks['Comment'];
        if (comment.startsWith('{')) {
          result.aiGeneration = parseComfyUIWorkflow(comment);
        } else {
          result.aiGeneration = parseSDParameters(comment);
        }
      }
    }
  }

  logger.info('[MetadataReader] Extraction complete', {
    format: result.basic.format,
    size: `${result.basic.width}x${result.basic.height}`,
    hasExif: !!result.exif,
    hasAiParams: !!result.aiGeneration,
    hasPngChunks: !!result.pngChunks,
    aiSource: result.aiGeneration?.source,
  });

  return result;
}
