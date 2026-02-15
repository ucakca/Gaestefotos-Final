'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Move, Check, X, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface SvgImportToolProps {
  onImport: (svgContent: string, format: string) => void;
  onClose: () => void;
}

const FORMAT_SIZES: Record<string, { w: number; h: number; label: string }> = {
  svgA6: { w: 105, h: 148, label: 'A6 Hochformat (105×148mm)' },
  svgA5: { w: 148, h: 210, label: 'A5 Hochformat (148×210mm)' },
  svgStory: { w: 1080, h: 1920, label: 'Story (1080×1920px)' },
  svgSquare: { w: 1080, h: 1080, label: 'Quadrat (1080×1080px)' },
};

export default function SvgImportTool({ onImport, onClose }: SvgImportToolProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [svgViewBox, setSvgViewBox] = useState({ x: 0, y: 0, w: 400, h: 560 });
  const [format, setFormat] = useState('svgA6');
  const [qrRect, setQrRect] = useState({ x: 100, y: 300, size: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasQrId, setHasQrId] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSvgContent(content);

      // Parse viewBox from SVG
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (svgEl) {
        const vb = svgEl.getAttribute('viewBox');
        if (vb) {
          const parts = vb.split(/[\s,]+/).map(Number);
          if (parts.length === 4) {
            setSvgViewBox({ x: parts[0], y: parts[1], w: parts[2], h: parts[3] });
            // Auto-position QR rect at bottom-center, 40% of shorter side
            const qrSize = Math.min(parts[2], parts[3]) * 0.35;
            setQrRect({
              x: (parts[2] - qrSize) / 2 + parts[0],
              y: parts[3] * 0.55 + parts[1],
              size: qrSize,
            });
          }
        } else {
          const w = parseFloat(svgEl.getAttribute('width') || '400');
          const h = parseFloat(svgEl.getAttribute('height') || '560');
          setSvgViewBox({ x: 0, y: 0, w, h });
          const qrSize = Math.min(w, h) * 0.35;
          setQrRect({ x: (w - qrSize) / 2, y: h * 0.55, size: qrSize });
        }

        // Check if gf:qr already exists
        const existing = doc.querySelector('[id="gf:qr"]');
        setHasQrId(!!existing);
      }
    };
    reader.readAsText(file);
  };

  const getSvgCoords = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = svgViewBox.w / rect.width;
    const scaleY = svgViewBox.h / rect.height;
    return {
      x: (clientX - rect.left) * scaleX + svgViewBox.x,
      y: (clientY - rect.top) * scaleY + svgViewBox.y,
    };
  }, [svgViewBox]);

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    const coords = getSvgCoords(e.clientX, e.clientY);
    setDragStart({ x: coords.x - qrRect.x, y: coords.y - qrRect.y });
    if (mode === 'drag') setIsDragging(true);
    else setIsResizing(true);
  }, [getSvgCoords, qrRect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;
    const coords = getSvgCoords(e.clientX, e.clientY);

    if (isDragging) {
      setQrRect((prev) => ({
        ...prev,
        x: Math.max(svgViewBox.x, Math.min(coords.x - dragStart.x, svgViewBox.x + svgViewBox.w - prev.size)),
        y: Math.max(svgViewBox.y, Math.min(coords.y - dragStart.y, svgViewBox.y + svgViewBox.h - prev.size)),
      }));
    }

    if (isResizing) {
      const dx = coords.x - qrRect.x;
      const dy = coords.y - qrRect.y;
      const newSize = Math.max(30, Math.min(Math.max(dx, dy), svgViewBox.w * 0.8));
      setQrRect((prev) => ({ ...prev, size: newSize }));
    }
  }, [isDragging, isResizing, dragStart, getSvgCoords, qrRect, svgViewBox]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    const up = () => { setIsDragging(false); setIsResizing(false); };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const generateOutput = () => {
    if (!svgContent) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return svgContent;

    // Remove any existing gf:qr
    const existing = doc.querySelector('[id="gf:qr"]');
    if (existing) existing.remove();

    // Create the QR rect
    const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('id', 'gf:qr');
    rect.setAttribute('x', Math.round(qrRect.x).toString());
    rect.setAttribute('y', Math.round(qrRect.y).toString());
    rect.setAttribute('width', Math.round(qrRect.size).toString());
    rect.setAttribute('height', Math.round(qrRect.size).toString());
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', 'none');

    svgEl.appendChild(rect);

    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  };

  const handleConfirm = () => {
    const output = generateOutput();
    if (output) {
      onImport(output, format);
    }
  };

  // Upload state
  if (!svgContent) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">SVG importieren & QR-Code platzieren</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium block">Zielformat</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FORMAT_SIZES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setFormat(key)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  format === key
                    ? 'bg-pink-600 text-white'
                    : 'bg-muted text-foreground/80 hover:bg-muted/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col items-center justify-center gap-3 p-12 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition-colors">
          <Upload className="w-8 h-8 text-muted-foreground/70" />
          <span className="text-muted-foreground">SVG-Datei hierher ziehen oder klicken</span>
          <span className="text-xs text-muted-foreground/70">Aus Canva, Figma, Illustrator oder anderem Tool</span>
          <input
            type="file"
            accept=".svg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </label>
      </div>
    );
  }

  // Editor state
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">QR-Code Position festlegen</h3>
          <p className="text-sm text-muted-foreground">Ziehe das rosa Quadrat an die gewünschte Position</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setSvgContent(null); setHasQrId(false); }}
            className="px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm"
          >
            Andere Datei
          </button>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {hasQrId && (
        <div className="rounded-lg border border-yellow-300 bg-warning/10 p-3 text-sm text-warning">
          Diese SVG enthält bereits ein <code className="bg-warning/15 px-1 rounded">gf:qr</code> Element.
          Es wird durch die neue Position ersetzt.
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative bg-muted rounded-xl overflow-hidden mx-auto border border-border"
        style={{
          width: '100%',
          maxWidth: 500,
          aspectRatio: `${svgViewBox.w} / ${svgViewBox.h}`,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* SVG Background */}
        <div
          className="absolute inset-0"
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{ pointerEvents: 'none' }}
        />

        {/* QR Overlay */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`${svgViewBox.x} ${svgViewBox.y} ${svgViewBox.w} ${svgViewBox.h}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Draggable QR Rect */}
          <rect
            x={qrRect.x}
            y={qrRect.y}
            width={qrRect.size}
            height={qrRect.size}
            fill="rgba(236, 72, 153, 0.15)"
            stroke="#ec4899"
            strokeWidth={Math.max(1, svgViewBox.w * 0.004)}
            strokeDasharray={`${svgViewBox.w * 0.015} ${svgViewBox.w * 0.01}`}
            className="cursor-move"
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
          />
          {/* Resize Handle */}
          <circle
            cx={qrRect.x + qrRect.size}
            cy={qrRect.y + qrRect.size}
            r={Math.max(4, svgViewBox.w * 0.015)}
            fill="#ec4899"
            className="cursor-se-resize"
            onMouseDown={(e) => handleMouseDown(e, 'resize')}
          />
          {/* Label */}
          <text
            x={qrRect.x + qrRect.size / 2}
            y={qrRect.y + qrRect.size / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ec4899"
            fontSize={Math.max(10, qrRect.size * 0.12)}
            fontWeight="600"
            style={{ pointerEvents: 'none' }}
          >
            QR-CODE
          </text>
        </svg>
      </div>

      {/* Position Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span>X: {Math.round(qrRect.x)}</span>
          <span>Y: {Math.round(qrRect.y)}</span>
          <span>Größe: {Math.round(qrRect.size)}×{Math.round(qrRect.size)}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground/70">
          <Move className="w-3.5 h-3.5" />
          Drag zum Verschieben, Ecke zum Skalieren
        </div>
      </div>

      {/* Manual Position Input */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">X-Position</label>
          <input
            type="number"
            value={Math.round(qrRect.x)}
            onChange={(e) => setQrRect((r) => ({ ...r, x: parseInt(e.target.value) || 0 }))}
            className="w-full px-2 py-1.5 border border-border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Y-Position</label>
          <input
            type="number"
            value={Math.round(qrRect.y)}
            onChange={(e) => setQrRect((r) => ({ ...r, y: parseInt(e.target.value) || 0 }))}
            className="w-full px-2 py-1.5 border border-border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Größe (px)</label>
          <input
            type="number"
            value={Math.round(qrRect.size)}
            onChange={(e) => setQrRect((r) => ({ ...r, size: Math.max(20, parseInt(e.target.value) || 20) }))}
            className="w-full px-2 py-1.5 border border-border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <button
          onClick={onClose}
          className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm"
        >
          Abbrechen
        </button>
        <button
          onClick={handleConfirm}
          className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium text-sm flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          SVG mit QR-Platzhalter übernehmen
        </button>
      </div>
    </div>
  );
}
