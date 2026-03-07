/**
 * ComfyUI Workflow Templates for RunPod EU
 *
 * Replaces fal.ai API calls with self-hosted ComfyUI workflows on RunPod EU (Amsterdam).
 * Each workflow is a ComfyUI API-format JSON template with placeholder values.
 *
 * Supported workflows:
 *   - flux-img2img:      Style transfer (replaces fal-ai/flux/dev/image-to-image)
 *   - reactor-faceswap:  Face swap (replaces fal-ai/face-swap, fal-ai/inswapper)
 *   - wan-i2v:           Image-to-video (replaces fal-ai/wan/v2.1/image-to-video)
 *   - instantid-style:   Identity-preserving style (replaces fal-ai/instantid)
 */

import { logger } from '../utils/logger';
import { runpodService } from './runpodService';

// ─── Workflow Types ─────────────────────────────────────────────────────────

export type WorkflowName = 'flux-img2img' | 'reactor-faceswap' | 'wan-i2v' | 'instantid-style';

export interface FluxImg2ImgParams {
  prompt: string;
  negativePrompt?: string;
  strength?: number;   // 0.0-1.0, default 0.65
  steps?: number;      // default 28
  seed?: number;
  width?: number;      // default 1024
  height?: number;     // default 1024
}

export interface ReactorFaceSwapParams {
  codeformerWeight?: number;  // 0.0-1.0, default 0.7
  faceRestoreVisibility?: number; // 0.0-1.0, default 1.0
  sourceFaceIndex?: string;   // default "0"
  inputFaceIndex?: string;    // default "0"
}

export interface WanI2VParams {
  prompt?: string;
  duration?: number;   // seconds, maps to frame count
  seed?: number;
  steps?: number;      // default 30
  width?: number;      // default 832
  height?: number;     // default 480
}

export interface InstantIdStyleParams {
  prompt: string;
  negativePrompt?: string;
  ipWeight?: number;     // 0.0-1.0, default 0.8
  cnStrength?: number;   // 0.0-1.0, default 0.65
  steps?: number;        // default 30
  seed?: number;
}

// ─── Workflow Builders ──────────────────────────────────────────────────────

function buildFluxImg2ImgWorkflow(params: FluxImg2ImgParams): Record<string, any> {
  const {
    prompt,
    negativePrompt = '',
    strength = 0.65,
    steps = 28,
    seed = Math.floor(Math.random() * 2147483647),
    width = 1024,
    height = 1024,
  } = params;

  return {
    '3': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: 'flux1-dev-fp8.safetensors' },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['3', 1] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: negativePrompt, clip: ['3', 1] },
    },
    '10': {
      class_type: 'LoadImage',
      inputs: { image: 'input_image.png' },
    },
    '11': {
      class_type: 'ImageScale',
      inputs: {
        image: ['10', 0],
        upscale_method: 'lanczos',
        width,
        height,
        crop: 'center',
      },
    },
    '12': {
      class_type: 'VAEEncode',
      inputs: { pixels: ['11', 0], vae: ['3', 2] },
    },
    '13': {
      class_type: 'KSampler',
      inputs: {
        model: ['3', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['12', 0],
        seed,
        steps,
        cfg: 1.0,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: strength,
      },
    },
    '14': {
      class_type: 'VAEDecode',
      inputs: { samples: ['13', 0], vae: ['3', 2] },
    },
    '15': {
      class_type: 'SaveImage',
      inputs: { images: ['14', 0], filename_prefix: 'flux_img2img' },
    },
  };
}

function buildReactorFaceSwapWorkflow(params: ReactorFaceSwapParams): Record<string, any> {
  const {
    codeformerWeight = 0.7,
    faceRestoreVisibility = 1.0,
    sourceFaceIndex = '0',
    inputFaceIndex = '0',
  } = params;

  return {
    '1': {
      class_type: 'LoadImage',
      inputs: { image: 'source_face.png' },
    },
    '2': {
      class_type: 'LoadImage',
      inputs: { image: 'target_image.png' },
    },
    '3': {
      class_type: 'ReActorFaceSwap',
      inputs: {
        enabled: true,
        input_image: ['2', 0],
        source_image: ['1', 0],
        swap_model: 'inswapper_128.onnx',
        facedetection: 'retinaface_resnet50',
        face_restore_model: 'codeformer-v0.1.0.pth',
        face_restore_visibility: faceRestoreVisibility,
        codeformer_weight: codeformerWeight,
        detect_gender_source: 'no',
        detect_gender_input: 'no',
        source_faces_index: sourceFaceIndex,
        input_faces_index: inputFaceIndex,
        console_log_level: 1,
      },
    },
    '4': {
      class_type: 'SaveImage',
      inputs: { images: ['3', 0], filename_prefix: 'faceswap' },
    },
  };
}

function buildWanI2VWorkflow(params: WanI2VParams): Record<string, any> {
  const {
    prompt = 'gentle cinematic camera movement, subtle animation, high quality',
    duration = 5,
    seed = Math.floor(Math.random() * 2147483647),
    steps = 30,
    width = 832,
    height = 480,
  } = params;

  // WAN: 16fps, duration in seconds → frame count
  const frameCount = Math.min(Math.max(Math.round(duration * 16), 33), 81);

  return {
    '1': {
      class_type: 'UNETLoader',
      inputs: {
        unet_name: 'wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors',
        weight_dtype: 'fp8_e4m3fn',
      },
    },
    '2': {
      class_type: 'CLIPLoader',
      inputs: { clip_name: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', type: 'wan' },
    },
    '3': {
      class_type: 'VAELoader',
      inputs: { vae_name: 'wan_2.1_vae.safetensors' },
    },
    '4': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['2', 0] },
    },
    '5': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: 'static, blurry, distorted, low quality, watermark',
        clip: ['2', 0],
      },
    },
    '6': {
      class_type: 'LoadImage',
      inputs: { image: 'input_image.png' },
    },
    '7': {
      class_type: 'ImageScale',
      inputs: {
        image: ['6', 0],
        upscale_method: 'lanczos',
        width,
        height,
        crop: 'center',
      },
    },
    '8': {
      class_type: 'WanImageToVideo',
      inputs: {
        clip_vision_output: ['7', 0],
        vae: ['3', 0],
        width,
        height,
        length: frameCount,
      },
    },
    '9': {
      class_type: 'BasicScheduler',
      inputs: { model: ['1', 0], scheduler: 'normal', steps, denoise: 1.0 },
    },
    '10': {
      class_type: 'BasicGuider',
      inputs: { model: ['1', 0], conditioning: ['4', 0] },
    },
    '11': {
      class_type: 'RandomNoise',
      inputs: { noise_seed: seed },
    },
    '12': {
      class_type: 'SamplerCustomAdvanced',
      inputs: {
        noise: ['11', 0],
        guider: ['10', 0],
        sampler: { class_type: 'KSamplerSelect', inputs: { sampler_name: 'uni_pc_bh2' } },
        sigmas: ['9', 0],
        latent_image: ['8', 0],
      },
    },
    '13': {
      class_type: 'VAEDecode',
      inputs: { samples: ['12', 0], vae: ['3', 0] },
    },
    '14': {
      class_type: 'SaveAnimatedWEBP',
      inputs: {
        images: ['13', 0],
        filename_prefix: 'wan_video',
        fps: 16,
        lossless: false,
        quality: 85,
        method: 'default',
      },
    },
  };
}

function buildInstantIdStyleWorkflow(params: InstantIdStyleParams): Record<string, any> {
  const {
    prompt,
    negativePrompt = 'different person, changed face, blurry, low quality',
    ipWeight = 0.8,
    cnStrength = 0.65,
    steps = 30,
    seed = Math.floor(Math.random() * 2147483647),
  } = params;

  return {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: 'flux1-dev-fp8.safetensors' },
    },
    '2': {
      class_type: 'LoadImage',
      inputs: { image: 'input_image.png' },
    },
    '3': {
      class_type: 'InstantIDModelLoader',
      inputs: { instantid_file: 'ip-adapter.bin' },
    },
    '4': {
      class_type: 'ControlNetLoader',
      inputs: { control_net_name: 'instantid-controlnet.safetensors' },
    },
    '5': {
      class_type: 'InstantIDFaceAnalysis',
      inputs: { provider: 'CPU' },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['1', 1] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: negativePrompt, clip: ['1', 1] },
    },
    '8': {
      class_type: 'ApplyInstantID',
      inputs: {
        instantid: ['3', 0],
        insightface: ['5', 0],
        control_net: ['4', 0],
        image: ['2', 0],
        model: ['1', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        ip_weight: ipWeight,
        cn_strength: cnStrength,
        start_at: 0.0,
        end_at: 1.0,
      },
    },
    '9': {
      class_type: 'EmptyLatentImage',
      inputs: { width: 1024, height: 1024, batch_size: 1 },
    },
    '10': {
      class_type: 'KSampler',
      inputs: {
        model: ['8', 0],
        positive: ['8', 1],
        negative: ['8', 2],
        latent_image: ['9', 0],
        seed,
        steps,
        cfg: 5.0,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1.0,
      },
    },
    '11': {
      class_type: 'VAEDecode',
      inputs: { samples: ['10', 0], vae: ['1', 2] },
    },
    '12': {
      class_type: 'SaveImage',
      inputs: { images: ['11', 0], filename_prefix: 'instantid_style' },
    },
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Execute a Flux img2img style transfer via RunPod ComfyUI.
 * Returns the output image as Buffer.
 */
export async function runFluxImg2Img(
  imageBuffer: Buffer,
  params: FluxImg2ImgParams,
): Promise<Buffer> {
  const workflow = buildFluxImg2ImgWorkflow(params);
  return executeComfyUIWorkflow(workflow, {
    input_image: imageBuffer,
  });
}

/**
 * Execute a ReActor face swap via RunPod ComfyUI.
 * Returns the output image as Buffer.
 */
export async function runReactorFaceSwap(
  sourceFaceBuffer: Buffer,
  targetImageBuffer: Buffer,
  params: ReactorFaceSwapParams = {},
): Promise<Buffer> {
  const workflow = buildReactorFaceSwapWorkflow(params);
  return executeComfyUIWorkflow(workflow, {
    source_face: sourceFaceBuffer,
    target_image: targetImageBuffer,
  });
}

/**
 * Execute WAN 2.1 image-to-video via RunPod ComfyUI.
 * Returns the output video as Buffer (WEBP animated).
 */
export async function runWanI2V(
  imageBuffer: Buffer,
  params: WanI2VParams = {},
): Promise<Buffer> {
  const workflow = buildWanI2VWorkflow(params);
  return executeComfyUIWorkflow(workflow, {
    input_image: imageBuffer,
  }, 600_000); // 10 min timeout for video
}

/**
 * Execute InstantID identity-preserving style transfer via RunPod ComfyUI.
 * Returns the output image as Buffer.
 */
export async function runInstantIdStyle(
  imageBuffer: Buffer,
  params: InstantIdStyleParams,
): Promise<Buffer> {
  const workflow = buildInstantIdStyleWorkflow(params);
  return executeComfyUIWorkflow(workflow, {
    input_image: imageBuffer,
  });
}

// ─── Internal ───────────────────────────────────────────────────────────────

/**
 * Execute a ComfyUI workflow on RunPod and return the output as Buffer.
 */
async function executeComfyUIWorkflow(
  workflow: Record<string, any>,
  images: Record<string, Buffer>,
  timeoutMs = 360_000,
): Promise<Buffer> {
  if (!runpodService.isConfigured()) {
    throw new Error('RunPod nicht konfiguriert (RUNPOD_API_KEY / RUNPOD_ENDPOINT_ID fehlt)');
  }

  // Convert image buffers to worker-comfyui v5.x format:
  // Array of { name: "filename.png", image: "data:image/png;base64,..." }
  const imagePayload = Object.entries(images).map(([name, buffer]) => ({
    name: name.endsWith('.png') ? name : `${name}.png`,
    image: `data:image/png;base64,${buffer.toString('base64')}`,
  }));

  logger.info('[ComfyUI] Submitting workflow to RunPod EU', {
    nodeCount: Object.keys(workflow).length,
    imageCount: Object.keys(images).length,
  });

  const result = await runpodService.submitAndWait(
    { workflow, images: imagePayload.length > 0 ? imagePayload : undefined },
    timeoutMs,
  );

  if (!result) {
    throw new Error('RunPod: Keine Antwort erhalten');
  }

  if (result.status === 'FAILED') {
    throw new Error(`RunPod Job fehlgeschlagen: ${result.error || 'unbekannter Fehler'}`);
  }

  if (result.status === 'TIMED_OUT') {
    throw new Error('RunPod Job Timeout');
  }

  if (result.status !== 'COMPLETED') {
    throw new Error(`RunPod Job Status unerwartet: ${result.status}`);
  }

  // Extract output image/video from RunPod response
  if (!result.output) {
    throw new Error('RunPod: Kein Output im Ergebnis');
  }

  const { buffer: outputData } = await runpodService.extractOutputBuffer(result.output);

  if (!outputData || outputData.length === 0) {
    logger.error('[ComfyUI] Unbekanntes Output-Format', { outputKeys: Object.keys(result.output) });
    throw new Error('RunPod: Output-Format nicht erkannt');
  }

  logger.info('[ComfyUI] Workflow erfolgreich', {
    outputSize: outputData.length,
    executionTime: result.executionTime,
  });

  return outputData;
}
