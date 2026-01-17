'use client';

import { CanvasElementUnion } from '@gaestefotos/shared';
import { ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Lock, Unlock } from 'lucide-react';

interface LayerPanelProps {
  elements: CanvasElementUnion[];
  selectedId: string | null;
  onSelectElement: (id: string) => void;
  onReorderElement: (id: string, direction: 'up' | 'down') => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDeleteElement: (id: string) => void;
}

export function LayerPanel({
  elements,
  selectedId,
  onSelectElement,
  onReorderElement,
  onToggleVisibility,
  onToggleLock,
  onDeleteElement,
}: LayerPanelProps) {
  // Sort elements by zIndex (highest first for display)
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'text':
        return '📝';
      case 'image':
        return '🖼️';
      case 'shape':
        return '⬜';
      case 'qr':
        return '📱';
      default:
        return '📄';
    }
  };

  const getElementLabel = (element: CanvasElementUnion) => {
    switch (element.type) {
      case 'text':
        return element.text.substring(0, 20) || 'Text';
      case 'image':
        return 'Bild';
      case 'shape':
        return element.shapeType;
      case 'qr':
        return 'QR-Code';
      default:
        return element.type;
    }
  };

  return (
    <div className="space-y-2">
      {sortedElements.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">Noch keine Elemente</p>
          <p className="text-xs mt-1">Füge Text, Bilder oder Formen hinzu</p>
        </div>
      ) : (
        sortedElements.map((element, index) => (
          <div
            key={element.id}
            className={`group relative p-2 rounded-lg border transition-all ${
              selectedId === element.id
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            {/* Main row */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => onSelectElement(element.id)}
            >
              {/* Icon */}
              <span className="text-lg">{getElementIcon(element.type)}</span>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {getElementLabel(element)}
                </p>
                <p className="text-xs text-gray-500">
                  z:{element.zIndex} · {Math.round(element.x)},{Math.round(element.y)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* Visibility toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(element.id);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title={(element as any).visible === false ? 'Einblenden' : 'Ausblenden'}
                >
                  {(element as any).visible === false ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-600" />
                  )}
                </button>

                {/* Lock toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(element.id);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title={(element as any).locked ? 'Entsperren' : 'Sperren'}
                >
                  {(element as any).locked ? (
                    <Lock className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-gray-600" />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Element "${getElementLabel(element)}" wirklich löschen?`)) {
                      onDeleteElement(element.id);
                    }
                  }}
                  className="p-1 hover:bg-red-100 rounded text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Z-Index controls */}
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReorderElement(element.id, 'up');
                }}
                disabled={index === 0}
                className="p-0.5 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Nach vorne"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReorderElement(element.id, 'down');
                }}
                disabled={index === sortedElements.length - 1}
                className="p-0.5 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Nach hinten"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
