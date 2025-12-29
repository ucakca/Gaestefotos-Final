import { imageProcessor } from './imageProcessor';
import { logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';

// Lazy-load face-api and TensorFlow to avoid startup errors if native modules are missing
let faceapi: any = null;
let createCanvas: any = null;
let loadImage: any = null;
let tf: any = null;

async function loadFaceApiModules(): Promise<boolean> {
  if (faceapi === false) {
    return false; // Already tried and failed
  }
  if (faceapi !== null) {
    return true; // Already loaded
  }

  try {
    const faceApiModule = await import('@vladmandic/face-api');
    const canvasModule = await import('canvas');
    const tfModule = await import('@tensorflow/tfjs-node');
    
    faceapi = faceApiModule;
    createCanvas = canvasModule.createCanvas;
    loadImage = canvasModule.loadImage;
    tf = tfModule;
    
    // Initialize TensorFlow backend
    faceapi.env.monkeyPatch({ Canvas: canvasModule.Canvas, Image: canvasModule.Image });
    return true;
  } catch (error: any) {
    logger.warn('Face recognition modules not available:', error.message);
    faceapi = false; // Mark as failed
    return false;
  }
}

let modelsLoaded = false;
const MODELS_PATH = path.join(__dirname, '../../models');

/**
 * Check if models directory exists and has required files
 */
function checkModelsAvailable(): boolean {
  if (!fs.existsSync(MODELS_PATH)) {
    return false;
  }

  const requiredFiles = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model.bin',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model.bin',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model.bin',
  ];

  return requiredFiles.every(file => 
    fs.existsSync(path.join(MODELS_PATH, file))
  );
}

/**
 * Load face-api models
 */
async function loadModels(): Promise<void> {
  if (modelsLoaded) {
    return;
  }

  // First, ensure modules are loaded
  const modulesLoaded = await loadFaceApiModules();
  if (!modulesLoaded || faceapi === false) {
    modelsLoaded = false;
    return;
  }

  try {
    if (!checkModelsAvailable()) {
      logger.warn('Face detection models not found. Run: pnpm download-face-models');
      modelsLoaded = false;
      return;
    }

    logger.info('Loading face-api models...');
    
    // Load models
    await faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
    
    modelsLoaded = true;
    logger.info('✓ Face-api models loaded successfully');
  } catch (error: any) {
    logger.error('Error loading face-api models:', error);
    modelsLoaded = false;
    // Don't throw - just mark as not loaded
  }
}

/**
 * Detect faces in an image using face-api
 */
export async function detectFaces(buffer: Buffer): Promise<Array<{
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}>> {
  try {
    // Ensure modules are loaded first
    const modulesLoaded = await loadFaceApiModules();
    if (!modulesLoaded || faceapi === false) {
      logger.debug('Face recognition modules not available, skipping detection');
      return [];
    }

    // Ensure models are loaded
    if (!modelsLoaded) {
      await loadModels();
    }

    if (!modelsLoaded) {
      logger.debug('Face detection models not available, skipping detection');
      return [];
    }

    // Get image metadata
    const metadata = await imageProcessor.getMetadata(buffer);
    if (!metadata.width || !metadata.height) {
      logger.warn('Could not get image dimensions for face detection');
      return [];
    }

    // Convert buffer to image
    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Detect faces using face-api
    const detections = await faceapi
      .detectAllFaces(canvas as any, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const faces = detections.map((detection: any) => {
      const box = detection.detection.box;
      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        confidence: detection.detection.score || 0.9,
      };
    });

    logger.info(`Detected ${faces.length} face(s) in image`, {
      imageSize: `${metadata.width}x${metadata.height}`,
      faceCount: faces.length,
    });

    return faces;
  } catch (error) {
    logger.error('Error detecting faces:', error);
    // Return empty array on error (don't fail the upload)
    return [];
  }
}

/**
 * Extract face descriptor (embedding) from an image
 * Returns the 128-dimensional face descriptor vector
 */
export async function extractFaceDescriptor(buffer: Buffer): Promise<{
  descriptor: number[];
  confidence: number;
} | null> {
  try {
    // Ensure modules are loaded first
    const modulesLoaded = await loadFaceApiModules();
    if (!modulesLoaded || faceapi === false) {
      logger.debug('Face recognition modules not available');
      return null;
    }

    // Ensure models are loaded
    if (!modelsLoaded) {
      await loadModels();
    }

    if (!modelsLoaded) {
      logger.debug('Face detection models not available');
      return null;
    }

    // Convert buffer to image
    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Detect single face with descriptor
    const detection = await faceapi
      .detectSingleFace(canvas as any, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      logger.warn('No face detected in image');
      return null;
    }

    // Extract descriptor (128-dimensional vector)
    const descriptor: number[] = Array.from(detection.descriptor as Iterable<number>);
    const confidence = detection.detection.score || 0.9;

    logger.info('Face descriptor extracted', {
      descriptorLength: descriptor.length,
      confidence,
    });

    return {
      descriptor,
      confidence,
    };
  } catch (error) {
    logger.error('Error extracting face descriptor:', error);
    return null;
  }
}

/**
 * Count faces in an image
 */
export async function countFaces(buffer: Buffer): Promise<number> {
  const faces = await detectFaces(buffer);
  return faces.length;
}

/**
 * Check if image contains faces
 */
export async function hasFaces(buffer: Buffer): Promise<boolean> {
  const count = await countFaces(buffer);
  return count > 0;
}

/**
 * Get face detection metadata
 */
export interface FaceDetectionResult {
  faceCount: number;
  faces: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  hasFaces: boolean;
  descriptors?: Array<number[]>; // Face descriptors for each face
}

export async function getFaceDetectionMetadata(buffer: Buffer): Promise<FaceDetectionResult> {
  try {
    // Ensure modules are loaded first
    const modulesLoaded = await loadFaceApiModules();
    if (!modulesLoaded || faceapi === false) {
      return {
        faceCount: 0,
        faces: [],
        hasFaces: false,
      };
    }

    // Ensure models are loaded
    if (!modelsLoaded) {
      await loadModels();
    }

    if (!modelsLoaded) {
      return {
        faceCount: 0,
        faces: [],
        hasFaces: false,
      };
    }

    const faces = await detectFaces(buffer);
    
    // Extract descriptors for all faces
    const descriptors: number[][] = [];
    if (faces.length > 0) {
      const img = await loadImage(buffer);
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const detections = await faceapi
        .detectAllFaces(canvas as any, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      for (const detection of detections) {
        descriptors.push(Array.from(((detection as any).descriptor as Iterable<number>)));
      }
    }
    
    return {
      faceCount: faces.length,
      faces,
      hasFaces: faces.length > 0,
      descriptors: descriptors.length > 0 ? descriptors : undefined,
    };
  } catch (error) {
    logger.error('Error getting face detection metadata:', error);
    // Return empty result on error
    return {
      faceCount: 0,
      faces: [],
      hasFaces: false,
    };
  }
}
