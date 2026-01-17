'use client';

import { TextElement, ImageElement, ShapeElement, CanvasElementUnion } from '@gaestefotos/shared';

interface PropertyPanelProps {
  element: CanvasElementUnion;
  onChange: (attrs: Partial<CanvasElementUnion>) => void;
}

export function PropertyPanel({ element, onChange }: PropertyPanelProps) {
  if (element.type === 'text') {
    return <TextPropertyPanel element={element} onChange={onChange} />;
  }
  
  if (element.type === 'image') {
    return <ImagePropertyPanel element={element} onChange={onChange} />;
  }
  
  if (element.type === 'shape') {
    return <ShapePropertyPanel element={element} onChange={onChange} />;
  }
  
  return null;
}

function TextPropertyPanel({ element, onChange }: { element: TextElement; onChange: (attrs: Partial<TextElement>) => void }) {
  const fonts = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Impact', label: 'Impact' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm">Text-Eigenschaften</h3>
      
      {/* Text Content */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Text</label>
        <textarea
          value={element.text}
          onChange={(e) => onChange({ text: e.target.value })}
          className="w-full px-3 py-2 border rounded-md text-sm resize-none"
          rows={3}
        />
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Schriftart</label>
        <select
          value={element.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full px-3 py-2 border rounded-md text-sm"
        >
          {fonts.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Schriftgröße: {element.fontSize}px
        </label>
        <input
          type="range"
          min="8"
          max="120"
          value={element.fontSize}
          onChange={(e) => onChange({ fontSize: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Color */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Farbe</label>
        <input
          type="color"
          value={element.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="w-full h-10 rounded-md cursor-pointer"
        />
      </div>

      {/* Alignment */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Ausrichtung</label>
        <div className="grid grid-cols-3 gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onChange({ align })}
              className={`px-3 py-2 text-xs rounded-md border ${
                element.align === align
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {align === 'left' ? 'Links' : align === 'center' ? 'Mitte' : 'Rechts'}
            </button>
          ))}
        </div>
      </div>

      {/* Font Style */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Stil</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onChange({ fontStyle: 'normal' })}
            className={`px-3 py-2 text-xs rounded-md border ${
              element.fontStyle === 'normal'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => onChange({ fontStyle: 'bold' })}
            className={`px-3 py-2 text-xs rounded-md border font-bold ${
              element.fontStyle === 'bold'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            Fett
          </button>
          <button
            onClick={() => onChange({ fontStyle: 'italic' })}
            className={`px-3 py-2 text-xs rounded-md border italic ${
              element.fontStyle === 'italic'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            Kursiv
          </button>
        </div>
      </div>

      {/* Position */}
      <div className="space-y-2 pt-4 border-t">
        <label className="block text-xs font-medium text-gray-700">Position & Größe</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600">X</label>
            <input
              type="number"
              value={Math.round(element.x)}
              onChange={(e) => onChange({ x: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Y</label>
            <input
              type="number"
              value={Math.round(element.y)}
              onChange={(e) => onChange({ y: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Deckkraft: {Math.round((element.opacity || 1) * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={element.opacity || 1}
          onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
}

function ImagePropertyPanel({ element, onChange }: { element: ImageElement; onChange: (attrs: Partial<ImageElement>) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm">Bild-Eigenschaften</h3>
      
      {/* Image URL */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Bild-URL</label>
        <input
          type="text"
          value={element.src}
          onChange={(e) => onChange({ src: e.target.value })}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="https://..."
        />
      </div>

      {/* Position */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Position</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600">X</label>
            <input
              type="number"
              value={Math.round(element.x)}
              onChange={(e) => onChange({ x: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Y</label>
            <input
              type="number"
              value={Math.round(element.y)}
              onChange={(e) => onChange({ y: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Größe</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600">Breite</label>
            <input
              type="number"
              value={Math.round(element.width)}
              onChange={(e) => onChange({ width: parseInt(e.target.value) || 1 })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Höhe</label>
            <input
              type="number"
              value={Math.round(element.height)}
              onChange={(e) => onChange({ height: parseInt(e.target.value) || 1 })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Deckkraft: {Math.round((element.opacity || 1) * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={element.opacity || 1}
          onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
}

function ShapePropertyPanel({ element, onChange }: { element: ShapeElement; onChange: (attrs: Partial<ShapeElement>) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm">Form-Eigenschaften</h3>
      
      {/* Shape Type */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Form-Typ</label>
        <select
          value={element.shapeType}
          onChange={(e) => onChange({ shapeType: e.target.value as 'rectangle' | 'circle' | 'line' })}
          className="w-full px-3 py-2 border rounded-md text-sm"
        >
          <option value="rectangle">Rechteck</option>
          <option value="circle">Kreis</option>
          <option value="line">Linie</option>
        </select>
      </div>

      {/* Fill Color */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Füllfarbe</label>
        <input
          type="color"
          value={element.fill || '#000000'}
          onChange={(e) => onChange({ fill: e.target.value })}
          className="w-full h-10 rounded-md cursor-pointer"
        />
      </div>

      {/* Stroke Color */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Rahmenfarbe</label>
        <input
          type="color"
          value={element.stroke || '#000000'}
          onChange={(e) => onChange({ stroke: e.target.value })}
          className="w-full h-10 rounded-md cursor-pointer"
        />
      </div>

      {/* Stroke Width */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Rahmenstärke: {element.strokeWidth || 0}px
        </label>
        <input
          type="range"
          min="0"
          max="20"
          value={element.strokeWidth || 0}
          onChange={(e) => onChange({ strokeWidth: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Position */}
      <div className="space-y-2 pt-4 border-t">
        <label className="block text-xs font-medium text-gray-700">Position</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600">X</label>
            <input
              type="number"
              value={Math.round(element.x)}
              onChange={(e) => onChange({ x: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Y</label>
            <input
              type="number"
              value={Math.round(element.y)}
              onChange={(e) => onChange({ y: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Deckkraft: {Math.round((element.opacity || 1) * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={element.opacity || 1}
          onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
}
