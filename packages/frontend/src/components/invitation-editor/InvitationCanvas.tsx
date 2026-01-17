'use client';

import { useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import { InvitationDesignConfig, CanvasElementUnion } from '@gaestefotos/shared';

interface InvitationCanvasProps {
  config: InvitationDesignConfig;
  onConfigChange: (config: InvitationDesignConfig) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
}

export function InvitationCanvas({
  config,
  onConfigChange,
  selectedElementId,
  onSelectElement,
}: InvitationCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(1);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Click on stage background deselects
      if (e.target === e.target.getStage()) {
        onSelectElement(null);
      }
    },
    [onSelectElement]
  );

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * 0.95 : oldScale * 1.05;
    const clampedScale = Math.max(0.1, Math.min(3, newScale));

    setScale(clampedScale);
    stage.scale({ x: clampedScale, y: clampedScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };
    stage.position(newPos);
  }, []);

  const handleElementChange = useCallback(
    (elementId: string, attrs: Partial<CanvasElementUnion>) => {
      let finalAttrs = attrs;
      
      // Apply grid snapping if enabled
      if (snapEnabled && (attrs.x !== undefined || attrs.y !== undefined)) {
        finalAttrs = {
          ...attrs,
          x: attrs.x !== undefined ? snapToGrid(attrs.x, gridSize) : undefined,
          y: attrs.y !== undefined ? snapToGrid(attrs.y, gridSize) : undefined,
        };
      }
      
      const newElements = config.elements.map((el) =>
        el.id === elementId ? { ...el, ...finalAttrs } : el
      );
      onConfigChange({
        ...config,
        elements: newElements,
      });
    },
    [config, onConfigChange, snapEnabled, gridSize]
  );

  const renderElement = (element: CanvasElementUnion) => {
    const isSelected = element.id === selectedElementId;
    const isLocked = (element as any).locked;
    const isVisible = (element as any).visible !== false;

    const commonProps = {
      key: element.id,
      element,
      isSelected,
      onSelect: () => onSelectElement(element.id),
      onChange: (attrs: Partial<CanvasElementUnion>) => handleElementChange(element.id, attrs),
      isLocked,
      isVisible,
    };

    switch (element.type) {
      case 'text':
        return <TextElement {...commonProps} element={element} />;
      case 'image':
        return <ImageElement {...commonProps} element={element} />;
      case 'shape':
        return <ShapeElement {...commonProps} element={element} />;
      case 'qr':
        // TODO: QR element renderer in Phase 2.4
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-100 rounded-lg">
      <Stage
        ref={stageRef}
        width={800}
        height={600}
        onClick={handleStageClick}
        onWheel={handleWheel}
        draggable
      >
        <Layer>
          {/* Canvas Background */}
          <Rect
            x={0}
            y={0}
            width={config.width}
            height={config.height}
            fill={config.backgroundColor}
            shadowBlur={10}
            shadowColor="rgba(0,0,0,0.3)"
          />
          
          {/* TODO: Render elements here */}
          {/* Elements will be added in Phase 2.3 */}
        </Layer>
      </Stage>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded-md shadow text-sm">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
