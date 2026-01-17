'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { InvitationDesignConfig, INVITATION_SIZES, InvitationSizePreset, CanvasElementUnion, TextElement, ImageElement, ShapeElement } from '@gaestefotos/shared';
import { InvitationCanvas } from './InvitationCanvas';
import { LayerPanel } from './LayerPanel';
import { PropertyPanel } from './PropertyPanel';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { debounce } from 'lodash';
import { generateId } from '@/utils/generateId';

interface InvitationEditorPanelProps {
  eventId: string;
  eventSlug: string;
  initialDesign?: InvitationDesignConfig;
}

export function InvitationEditorPanel({
  eventId,
  eventSlug,
  initialDesign,
}: InvitationEditorPanelProps) {
  const [activeDesign, setActiveDesign] = useState<InvitationDesignConfig>(
    initialDesign || {
      id: 'default',
      name: 'Neue Einladung',
      width: 595,
      height: 842,
      backgroundColor: '#ffffff',
      elements: [],
    }
  );
  
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [sizePreset, setSizePreset] = useState<InvitationSizePreset>('a5-portrait');
  const [loading, setLoading] = useState(true);
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(false);
  const [gridSize] = useState(10);
  const clipboardRef = useRef<CanvasElementUnion | null>(null);

  // Load design from API
  useEffect(() => {
    if (initialDesign) {
      setLoading(false);
      return;
    }

    fetch(`/api/events/${eventId}/invitation`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setActiveDesign(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [eventId, initialDesign]);

  // Auto-save with debounce (1 second delay)
  const debouncedSave = useMemo(
    () =>
      debounce(async (design: InvitationDesignConfig) => {
        try {
          await fetch(`/api/events/${eventId}/invitation`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(design),
          });
        } catch (error) {
          console.error('Failed to save invitation design:', error);
        }
      }, 1000),
    [eventId]
  );

  const handleConfigChange = useCallback(
    (newConfig: InvitationDesignConfig) => {
      setActiveDesign(newConfig);
      debouncedSave(newConfig);
    },
    [debouncedSave]
  );

  const handleSizeChange = useCallback((preset: InvitationSizePreset) => {
    setSizePreset(preset);
    const size = INVITATION_SIZES[preset];
    handleConfigChange({
      ...activeDesign,
      width: size.width,
      height: size.height,
    });
  }, [activeDesign, handleConfigChange]);

  const addTextElement = useCallback(() => {
    const newElement: TextElement = {
      type: 'text',
      id: generateId(),
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      zIndex: activeDesign.elements.length,
      text: 'Neuer Text',
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      align: 'left',
    };
    handleConfigChange({
      ...activeDesign,
      elements: [...activeDesign.elements, newElement],
    });
    setSelectedElementId(newElement.id);
  }, [activeDesign, handleConfigChange]);

  const addImageElement = useCallback(() => {
    const newElement: ImageElement = {
      type: 'image',
      id: generateId(),
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      zIndex: activeDesign.elements.length,
      src: '/placeholder-image.png',
    };
    handleConfigChange({
      ...activeDesign,
      elements: [...activeDesign.elements, newElement],
    });
    setSelectedElementId(newElement.id);
  }, [activeDesign, handleConfigChange]);

  const addShapeElement = useCallback((shapeType: 'rectangle' | 'circle' | 'line') => {
    const newElement: ShapeElement = {
      type: 'shape',
      id: generateId(),
      x: 100,
      y: 100,
      width: 200,
      height: shapeType === 'circle' ? 200 : shapeType === 'line' ? 2 : 100,
      zIndex: activeDesign.elements.length,
      shapeType,
      fill: shapeType === 'line' ? undefined : '#3B82F6',
      stroke: shapeType === 'line' ? '#000000' : undefined,
      strokeWidth: shapeType === 'line' ? 2 : undefined,
    };
    handleConfigChange({
      ...activeDesign,
      elements: [...activeDesign.elements, newElement],
    });
    setSelectedElementId(newElement.id);
  }, [activeDesign, handleConfigChange]);

  const handleDeleteElement = useCallback((elementId: string) => {
    handleConfigChange({
      ...activeDesign,
      elements: activeDesign.elements.filter((el) => el.id !== elementId),
    });
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  }, [activeDesign, handleConfigChange, selectedElementId]);

  const handleReorderElement = useCallback((elementId: string, direction: 'up' | 'down') => {
    const index = activeDesign.elements.findIndex((el) => el.id === elementId);
    if (index === -1) return;

    const newElements = [...activeDesign.elements];
    if (direction === 'up' && index < newElements.length - 1) {
      [newElements[index].zIndex, newElements[index + 1].zIndex] = [
        newElements[index + 1].zIndex,
        newElements[index].zIndex,
      ];
    } else if (direction === 'down' && index > 0) {
      [newElements[index].zIndex, newElements[index - 1].zIndex] = [
        newElements[index - 1].zIndex,
        newElements[index].zIndex,
      ];
    }

    handleConfigChange({
      ...activeDesign,
      elements: newElements,
    });
  }, [activeDesign, handleConfigChange]);

  const handleToggleVisibility = useCallback((elementId: string) => {
    const newElements = activeDesign.elements.map((el) =>
      el.id === elementId ? { ...el, visible: !(el as any).visible !== false } : el
    );
    handleConfigChange({
      ...activeDesign,
      elements: newElements,
    });
  }, [activeDesign, handleConfigChange]);

  const handleToggleLock = useCallback((elementId: string) => {
    const newElements = activeDesign.elements.map((el) =>
      el.id === elementId ? { ...el, locked: !(el as any).locked } : el
    );
    handleConfigChange({
      ...activeDesign,
      elements: newElements,
    });
  }, [activeDesign, handleConfigChange]);

  const handleElementChange = useCallback((elementId: string, attrs: Partial<CanvasElementUnion>) => {
    const newElements = activeDesign.elements.map((el) =>
      el.id === elementId ? { ...el, ...attrs } : el
    );
    handleConfigChange({
      ...activeDesign,
      elements: newElements,
    });
  }, [activeDesign, handleConfigChange]);

  const handleCopy = useCallback(() => {
    if (!selectedElementId) return;
    const element = activeDesign.elements.find(el => el.id === selectedElementId);
    if (element) {
      clipboardRef.current = element;
    }
  }, [selectedElementId, activeDesign.elements]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current) return;
    
    const newElement = {
      ...clipboardRef.current,
      id: generateId(),
      x: clipboardRef.current.x + 20,
      y: clipboardRef.current.y + 20,
      zIndex: activeDesign.elements.length,
    };
    
    handleConfigChange({
      ...activeDesign,
      elements: [...activeDesign.elements, newElement],
    });
    setSelectedElementId(newElement.id);
  }, [activeDesign, handleConfigChange]);

  const handleDuplicate = useCallback((id: string) => {
    const element = activeDesign.elements.find(el => el.id === id);
    if (!element) return;
    
    const newElement = {
      ...element,
      id: generateId(),
      x: element.x + 20,
      y: element.y + 20,
      zIndex: activeDesign.elements.length,
    };
    
    handleConfigChange({
      ...activeDesign,
      elements: [...activeDesign.elements, newElement],
    });
    setSelectedElementId(newElement.id);
  }, [activeDesign, handleConfigChange]);

  const handleMove = useCallback((id: string, dx: number, dy: number) => {
    const newElements = activeDesign.elements.map((el) =>
      el.id === id ? { ...el, x: el.x + dx, y: el.y + dy } : el
    );
    handleConfigChange({
      ...activeDesign,
      elements: newElements,
    });
  }, [activeDesign, handleConfigChange]);

  useKeyboardShortcuts({
    selectedElementId,
    elements: activeDesign.elements,
    onDelete: handleDeleteElement,
    onDuplicate: handleDuplicate,
    onMove: handleMove,
    onCopy: handleCopy,
    onPaste: handlePaste,
    disabled: loading,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Design wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Tools & Properties */}
      <div className="w-80 bg-white border-r overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold">Einladungs-Editor</h2>
            <p className="text-sm text-gray-600">Event: {eventSlug}</p>
          </div>

          {/* Size Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Format</label>
            <select
              value={sizePreset}
              onChange={(e) => handleSizeChange(e.target.value as InvitationSizePreset)}
              className="w-full px-3 py-2 border rounded-md"
            >
              {Object.entries(INVITATION_SIZES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label} ({value.width}x{value.height}px)
                </option>
              ))}
            </select>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Hintergrundfarbe</label>
            <input
              type="color"
              value={activeDesign.backgroundColor}
              onChange={(e) =>
                handleConfigChange({
                  ...activeDesign,
                  backgroundColor: e.target.value,
                })
              }
              className="w-full h-10 rounded-md cursor-pointer"
            />
          </div>

          {/* Grid Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="gridToggle"
              checked={snapToGridEnabled}
              onChange={(e) => setSnapToGridEnabled(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="gridToggle" className="text-sm">Raster aktivieren ({gridSize}px)</label>
          </div>

          {/* Element Tools */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Elemente hinzufügen</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={addTextElement}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + Text
              </button>
              <button
                onClick={addImageElement}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + Bild
              </button>
              <button
                onClick={() => addShapeElement('rectangle')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + Rechteck
              </button>
              <button
                onClick={() => addShapeElement('circle')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + Kreis
              </button>
            </div>
          </div>

          {/* Element Properties */}
          {selectedElementId && (() => {
            const selectedElement = activeDesign.elements.find(el => el.id === selectedElementId);
            return selectedElement ? (
              <div className="space-y-2 pt-4 border-t">
                <PropertyPanel
                  element={selectedElement}
                  onChange={(attrs) => handleElementChange(selectedElementId, attrs)}
                />
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 p-4">
        <InvitationCanvas
          config={activeDesign}
          onConfigChange={handleConfigChange}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          snapToGrid={snapToGridEnabled}
          gridSize={gridSize}
        />
      </div>

      {/* Right Sidebar - Layers */}
      <div className="w-64 bg-white border-l overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Ebenen</h3>
            <span className="text-xs text-gray-500">
              {activeDesign.elements.length} Element{activeDesign.elements.length !== 1 ? 'e' : ''}
            </span>
          </div>
          
          <LayerPanel
            elements={activeDesign.elements}
            selectedId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onReorderElement={handleReorderElement}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onDeleteElement={handleDeleteElement}
          />
        </div>
      </div>
    </div>
  );
}
