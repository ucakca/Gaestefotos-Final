'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Hand,
  Trash2,
  Save,
  Loader2,
  X,
  Undo2,
  Play,
} from 'lucide-react';

/**
 * Air Graffiti Wall
 * 
 * Uses MediaPipe Hands to track hand position via webcam.
 * Index finger tip = brush position.
 * Pinch (thumb + index close) = draw.
 * Open hand = move without drawing.
 * 
 * Requires: @mediapipe/hands, @mediapipe/camera_utils
 * These are loaded dynamically to avoid SSR issues.
 */

interface AirGraffitiWallProps {
  onSave?: (dataUrl: string) => void;
  onClose?: () => void;
  width?: number;
  height?: number;
}

interface DrawPoint {
  x: number;
  y: number;
}

interface DrawStroke {
  points: DrawPoint[];
  color: string;
  lineWidth: number;
}

const COLORS = [
  '#FF0000', '#FF6B00', '#FFD700', '#00CC00', '#0088FF',
  '#8B00FF', '#FF1493', '#00CED1', '#FFFFFF', '#000000',
];

const NEON_COLORS = [
  '#FF073A', '#39FF14', '#00F0FF', '#FF61F6', '#FFFF00',
  '#FF9500', '#7DF9FF', '#B026FF', '#FF3131', '#0FFF50',
];

export default function AirGraffitiWall({ onSave, onClose, width = 1280, height = 720 }: AirGraffitiWallProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isTracking, setIsTracking] = useState(false);
  const [currentColor, setCurrentColor] = useState('#39FF14');
  const [brushSize, setBrushSize] = useState(8);
  const [useNeon, setUseNeon] = useState(true);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawPoint[]>([]);
  const [isPinching, setIsPinching] = useState(false);
  const [cursorPos, setCursorPos] = useState<DrawPoint | null>(null);
  const [saving, setSaving] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strokesRef = useRef(strokes);
  const currentStrokeRef = useRef(currentStroke);
  const isPinchingRef = useRef(isPinching);
  const colorRef = useRef(currentColor);
  const brushRef = useRef(brushSize);

  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { currentStrokeRef.current = currentStroke; }, [currentStroke]);
  useEffect(() => { isPinchingRef.current = isPinching; }, [isPinching]);
  useEffect(() => { colorRef.current = currentColor; }, [currentColor]);
  useEffect(() => { brushRef.current = brushSize; }, [brushSize]);

  // Calculate pinch distance
  const getPinchDistance = (landmarks: any[]) => {
    const thumb = landmarks[4];  // Thumb tip
    const index = landmarks[8];  // Index finger tip
    return Math.hypot(thumb.x - index.x, thumb.y - index.y);
  };

  // Start hand tracking
  const startTracking = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: width }, height: { ideal: height }, facingMode: 'user' },
      });

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCameraReady(true);

      // Dynamically load MediaPipe
      const { Hands } = await import('@mediapipe/hands');
      const { Camera } = await import('@mediapipe/camera_utils');

      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: any) => {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
          setCursorPos(null);
          if (isPinchingRef.current && currentStrokeRef.current.length > 1) {
            // End stroke
            setStrokes(prev => [...prev, {
              points: currentStrokeRef.current,
              color: colorRef.current,
              lineWidth: brushRef.current,
            }]);
            setCurrentStroke([]);
            setIsPinching(false);
          }
          return;
        }

        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];

        // Mirror X for selfie view
        const x = (1 - indexTip.x) * width;
        const y = indexTip.y * height;
        setCursorPos({ x, y });

        const pinchDist = getPinchDistance(landmarks);
        const pinchThreshold = 0.06;
        const nowPinching = pinchDist < pinchThreshold;

        if (nowPinching && !isPinchingRef.current) {
          // Start stroke
          setIsPinching(true);
          setCurrentStroke([{ x, y }]);
        } else if (nowPinching && isPinchingRef.current) {
          // Continue stroke
          setCurrentStroke(prev => [...prev, { x, y }]);
        } else if (!nowPinching && isPinchingRef.current) {
          // End stroke
          if (currentStrokeRef.current.length > 1) {
            setStrokes(prev => [...prev, {
              points: currentStrokeRef.current,
              color: colorRef.current,
              lineWidth: brushRef.current,
            }]);
          }
          setCurrentStroke([]);
          setIsPinching(false);
        }
      });

      const camera = new Camera(video, {
        onFrame: async () => { await hands.send({ image: video }); },
        width,
        height,
      });
      camera.start();
      setIsTracking(true);
    } catch (err: any) {
      setError(err.message || 'Kamera-Zugriff verweigert');
    }
  }, [width, height]);

  // Render drawing
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);

    const drawStroke = (points: DrawPoint[], color: string, lineWidth: number) => {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (useNeon) {
        ctx.shadowColor = color;
        ctx.shadowBlur = lineWidth * 2;
      }

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // Draw completed strokes
    for (const stroke of strokes) {
      drawStroke(stroke.points, stroke.color, stroke.lineWidth);
    }

    // Draw current stroke
    if (currentStroke.length > 1) {
      drawStroke(currentStroke, currentColor, brushSize);
    }
  }, [strokes, currentStroke, currentColor, brushSize, useNeon, width, height]);

  // Render cursor overlay
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);

    if (cursorPos) {
      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, brushSize / 2 + 4, 0, Math.PI * 2);
      ctx.strokeStyle = isPinching ? currentColor : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isPinching) {
        ctx.beginPath();
        ctx.arc(cursorPos.x, cursorPos.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = currentColor;
        ctx.fill();
      }
    }
  }, [cursorPos, isPinching, currentColor, brushSize, width, height]);

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
  };

  const handleSave = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    setSaving(true);
    const dataUrl = canvas.toDataURL('image/png');
    onSave?.(dataUrl);
    setSaving(false);
  };

  const activeColors = useNeon ? NEON_COLORS : COLORS;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/60 z-10">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
          <Hand className="w-5 h-5 text-emerald-400" />
          <span className="text-sm text-white/80 font-medium">Air Graffiti Wall</span>
          {isPinching && <span className="text-xs text-emerald-400 animate-pulse">● Zeichnet...</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleUndo} disabled={strokes.length === 0}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleClear} disabled={strokes.length === 0}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={handleSave} disabled={saving || strokes.length === 0}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium flex items-center gap-1 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      </div>

      {/* Canvas stack */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Webcam feed (mirrored) */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
        />

        {/* Dark overlay for better graffiti visibility */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Drawing canvas */}
        <canvas
          ref={drawCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Cursor overlay */}
        <canvas
          ref={overlayCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Start overlay */}
        {!isTracking && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center">
              <Hand className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Air Graffiti Wall</h2>
              <p className="text-white/60 text-sm mb-6 max-w-sm">
                Male in der Luft! Zeigefinger = Cursor. Daumen + Zeigefinger zusammen = Zeichnen.
              </p>
              <button
                onClick={startTracking}
                className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold flex items-center gap-2 mx-auto hover:bg-emerald-600 transition-colors"
              >
                <Play className="w-5 h-5" /> Kamera starten
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center">
              <X className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-white/80 mb-2">Fehler: {error}</p>
              <p className="text-white/50 text-sm">Bitte Kamera-Zugriff erlauben und erneut versuchen.</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="px-4 py-3 bg-black/60 space-y-3 z-10">
        {/* Brush size + neon toggle */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setUseNeon(!useNeon)}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${useNeon ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'bg-white/10 text-white/50 border border-white/20'}`}>
            {useNeon ? '✨ Neon' : '● Normal'}
          </button>
          <div className="w-px h-6 bg-white/20" />
          {[4, 8, 14, 22, 32].map(size => (
            <button key={size} onClick={() => setBrushSize(size)}
              className={`p-1 rounded-lg ${brushSize === size ? 'bg-white/20' : ''}`}>
              <div className="rounded-full mx-auto" style={{
                width: Math.min(size, 20),
                height: Math.min(size, 20),
                backgroundColor: currentColor,
                boxShadow: useNeon ? `0 0 ${size}px ${currentColor}` : 'none',
              }} />
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center justify-center gap-2">
          {activeColors.map(color => (
            <button key={color} onClick={() => setCurrentColor(color)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                currentColor === color ? 'border-white scale-125' : 'border-white/20'
              }`}
              style={{
                backgroundColor: color,
                boxShadow: useNeon ? `0 0 8px ${color}` : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
