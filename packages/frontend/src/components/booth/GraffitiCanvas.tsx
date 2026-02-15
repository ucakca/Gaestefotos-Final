'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Save,
  Loader2,
  X,
} from 'lucide-react';

interface GraffitiCanvasProps {
  photoUrl: string;
  photoId: string;
  eventId: string;
  onSave?: (mergedDataUrl: string, drawingData: any) => void;
  onClose?: () => void;
}

interface DrawAction {
  type: 'path';
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
}

const COLORS = [
  '#FF0000', '#FF6B00', '#FFD700', '#00CC00', '#0088FF',
  '#8B00FF', '#FF1493', '#FFFFFF', '#000000', '#808080',
];

const BRUSH_SIZES = [3, 6, 12, 20, 32];

export default function GraffitiCanvas({ photoUrl, photoId, eventId, onSave, onClose }: GraffitiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [undoneActions, setUndoneActions] = useState<DrawAction[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load background image
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      const maxW = container.clientWidth;
      const maxH = window.innerHeight * 0.7;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      bgCanvas.width = w;
      bgCanvas.height = h;
      const bgCtx = bgCanvas.getContext('2d')!;
      bgCtx.drawImage(img, 0, 0, w, h);

      // Match drawing canvas size
      const drawCanvas = canvasRef.current!;
      drawCanvas.width = w;
      drawCanvas.height = h;

      setImageLoaded(true);
    };
    img.src = photoUrl;
  }, [photoUrl]);

  // Redraw all actions on the drawing canvas
  const redrawActions = useCallback((actionList: DrawAction[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const action of actionList) {
      if (action.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = action.color === 'eraser' ? 'destination-out' : 'source-over';

      ctx.moveTo(action.points[0].x, action.points[0].y);
      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i].x, action.points[i].y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    setIsDrawing(true);
    setCurrentPath([pos]);
    setUndoneActions([]);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentPath(prev => {
      const newPath = [...prev, pos];

      // Draw live preview
      const canvas = canvasRef.current;
      if (canvas && newPath.length >= 2) {
        const ctx = canvas.getContext('2d')!;
        redrawActions(actions);
        ctx.beginPath();
        ctx.strokeStyle = isEraser ? 'eraser' : currentColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
        ctx.moveTo(newPath[0].x, newPath[0].y);
        for (let i = 1; i < newPath.length; i++) {
          ctx.lineTo(newPath[i].x, newPath[i].y);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      return newPath;
    });
  };

  const endDraw = () => {
    if (!isDrawing || currentPath.length < 2) {
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }

    const newAction: DrawAction = {
      type: 'path',
      points: currentPath,
      color: isEraser ? 'eraser' : currentColor,
      lineWidth: brushSize,
    };

    setActions(prev => [...prev, newAction]);
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handleUndo = () => {
    setActions(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoneActions(u => [...u, last]);
      const newActions = prev.slice(0, -1);
      redrawActions(newActions);
      return newActions;
    });
  };

  const handleRedo = () => {
    setUndoneActions(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setActions(a => {
        const newActions = [...a, last];
        redrawActions(newActions);
        return newActions;
      });
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setActions([]);
    setUndoneActions([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSave = async () => {
    const bgCanvas = bgCanvasRef.current;
    const drawCanvas = canvasRef.current;
    if (!bgCanvas || !drawCanvas) return;

    setSaving(true);
    try {
      // Merge: bg + drawing
      const mergeCanvas = document.createElement('canvas');
      mergeCanvas.width = bgCanvas.width;
      mergeCanvas.height = bgCanvas.height;
      const ctx = mergeCanvas.getContext('2d')!;
      ctx.drawImage(bgCanvas, 0, 0);
      ctx.drawImage(drawCanvas, 0, 0);

      const dataUrl = mergeCanvas.toDataURL('image/jpeg', 0.92);

      if (onSave) {
        onSave(dataUrl, { actions, photoId, eventId });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/60">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-card/10">
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm text-white/80 font-medium">Digital Graffiti</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleUndo} disabled={actions.length === 0}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-card/10 disabled:opacity-30">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleRedo} disabled={undoneActions.length === 0}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-card/10 disabled:opacity-30">
            <Redo2 className="w-4 h-4" />
          </button>
          <button onClick={handleClear} disabled={actions.length === 0}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-card/10 disabled:opacity-30">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={handleSave} disabled={saving || actions.length === 0}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium flex items-center gap-1 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="relative inline-block" style={{ touchAction: 'none' }}>
          <canvas ref={bgCanvasRef} className="block rounded-lg" />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 rounded-lg cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom toolbar: colors + brush size */}
      <div className="px-4 py-3 bg-black/60 space-y-3">
        {/* Brush/Eraser toggle */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setIsEraser(false)}
            className={`p-2 rounded-lg ${!isEraser ? 'bg-card/20 text-white' : 'text-white/50'}`}
          >
            <Pen className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsEraser(true)}
            className={`p-2 rounded-lg ${isEraser ? 'bg-card/20 text-white' : 'text-white/50'}`}
          >
            <Eraser className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-card/20 mx-2" />
          {BRUSH_SIZES.map(size => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              className={`p-1 rounded-lg ${brushSize === size ? 'bg-card/20' : ''}`}
            >
              <div
                className="rounded-full bg-card mx-auto"
                style={{ width: Math.min(size, 20), height: Math.min(size, 20) }}
              />
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center justify-center gap-2">
          {COLORS.map(color => (
            <button
              key={color}
              onClick={() => { setCurrentColor(color); setIsEraser(false); }}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                currentColor === color && !isEraser ? 'border-white scale-125' : 'border-white/30'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
