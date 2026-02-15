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

  return (
    <div className="relative w-full h-full overflow-hidden bg-muted rounded-lg">
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
      <div className="absolute bottom-4 right-4 bg-card px-3 py-1 rounded-md shadow text-sm">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
