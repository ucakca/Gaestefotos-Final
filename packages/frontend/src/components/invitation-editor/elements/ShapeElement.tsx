'use client';

import { Rect, Circle, Line, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';
import Konva from 'konva';
import { ShapeElement as ShapeElementType } from '@gaestefotos/shared';

interface ShapeElementProps {
  element: ShapeElementType;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: Partial<ShapeElementType>) => void;
  isLocked?: boolean;
  isVisible?: boolean;
}

export function ShapeElement({
  element,
  isSelected,
  onSelect,
  onChange,
  isLocked = false,
  isVisible = true,
}: ShapeElementProps) {
  const shapeRef = useRef<Konva.Rect | Konva.Circle | Konva.Line>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!isVisible) return null;

  const commonProps = {
    ref: shapeRef,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    opacity: element.opacity,
    fill: element.fill,
    stroke: element.stroke,
    strokeWidth: element.strokeWidth || 0,
    draggable: !isLocked,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange({
        x: e.target.x(),
        y: e.target.y(),
      });
    },
    onTransformEnd: () => {
      const node = shapeRef.current;
      if (!node) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      node.scaleX(1);
      node.scaleY(1);

      onChange({
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation(),
      });
    },
  };

  let ShapeComponent;
  switch (element.shapeType) {
    case 'rectangle':
      ShapeComponent = (
        <Rect
          {...commonProps}
          width={element.width}
          height={element.height}
        />
      );
      break;
    case 'circle':
      ShapeComponent = (
        <Circle
          {...commonProps}
          radius={Math.min(element.width, element.height) / 2}
        />
      );
      break;
    case 'line':
      ShapeComponent = (
        <Line
          {...commonProps}
          points={[0, 0, element.width, 0]}
        />
      );
      break;
    default:
      return null;
  }

  return (
    <>
      {ShapeComponent}
      {isSelected && !isLocked && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
