'use client';

import { Image, Transformer } from 'react-konva';
import { useRef, useEffect, useState } from 'react';
import Konva from 'konva';
import useImage from 'use-image';
import { ImageElement as ImageElementType } from '@gaestefotos/shared';

interface ImageElementProps {
  element: ImageElementType;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: Partial<ImageElementType>) => void;
  isLocked?: boolean;
  isVisible?: boolean;
}

export function ImageElement({
  element,
  isSelected,
  onSelect,
  onChange,
  isLocked = false,
  isVisible = true,
}: ImageElementProps) {
  const imageRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [image, status] = useImage(element.src, 'anonymous');

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!isVisible) return null;

  // Show loading state
  if (status === 'loading') {
    return null; // Could render a placeholder here
  }

  return (
    <>
      <Image
        ref={imageRef}
        image={image}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        opacity={element.opacity}
        draggable={!isLocked}
        onClick={onSelect}
        onTap={onSelect}
        crop={
          element.cropX !== undefined
            ? {
                x: element.cropX,
                y: element.cropY || 0,
                width: element.cropWidth || element.width,
                height: element.cropHeight || element.height,
              }
            : undefined
        }
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = imageRef.current;
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
          keepRatio={true}
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
