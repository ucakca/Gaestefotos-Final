'use client';

import { Text, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';
import Konva from 'konva';
import { TextElement as TextElementType } from '@gaestefotos/shared';

interface TextElementProps {
  element: TextElementType;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: Partial<TextElementType>) => void;
  isLocked?: boolean;
  isVisible?: boolean;
}

export function TextElement({
  element,
  isSelected,
  onSelect,
  onChange,
  isLocked = false,
  isVisible = true,
}: TextElementProps) {
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!isVisible) return null;

  return (
    <>
      <Text
        ref={textRef}
        {...element}
        text={element.text}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily}
        fontStyle={element.fontStyle}
        fill={element.color}
        align={element.align}
        lineHeight={element.lineHeight || 1.2}
        draggable={!isLocked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = textRef.current;
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
        }}
      />
      {isSelected && !isLocked && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize
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
