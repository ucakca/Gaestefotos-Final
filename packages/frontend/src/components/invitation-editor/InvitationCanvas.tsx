'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Circle, Line, Transformer, Group, Image as RKImage } from 'react-konva';
import Konva from 'konva';
import {
  InvitationDesignConfig,
  CanvasElementUnion,
  TextElement,
  ImageElement,
  ShapeElement,
  QRElement,
} from '@gaestefotos/shared';

interface InvitationCanvasProps {
  config: InvitationDesignConfig;
  onConfigChange: (config: InvitationDesignConfig) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
}

function KonvaImage({ el, isSelected, onSelect, onChange }: {
  el: ImageElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: Partial<ImageElement>) => void;
}) {
  const imgRef = useRef<Konva.Image>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = el.src;
    img.onload = () => setImage(img);
  }, [el.src]);

  if (!image) return null;

  return (
    <RKImage
      ref={imgRef}
      image={image}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation || 0}
      opacity={el.opacity ?? 1}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e: any) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={() => {
        const node = imgRef.current;
        if (!node) return;
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * node.scaleX()),
          height: Math.max(5, node.height() * node.scaleY()),
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );
}

export function InvitationCanvas({
  config,
  onConfigChange,
  selectedElementId,
  onSelectElement,
}: InvitationCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (selectedElementId) {
      const node = stage.findOne(`#${selectedElementId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedElementId, config.elements]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
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
    stage.position({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, []);

  const updateElement = useCallback((id: string, attrs: Partial<CanvasElementUnion>) => {
    const updated = config.elements.map((el) =>
      el.id === id ? { ...el, ...attrs } : el
    );
    onConfigChange({ ...config, elements: updated as CanvasElementUnion[] });
  }, [config, onConfigChange]);

  const sorted = [...config.elements].sort((a, b) => a.zIndex - b.zIndex);

  const renderElement = (el: CanvasElementUnion) => {
    const isSelected = el.id === selectedElementId;

    switch (el.type) {
      case 'text': {
        const t = el as TextElement;
        return (
          <Text
            key={t.id}
            id={t.id}
            x={t.x}
            y={t.y}
            width={t.width}
            height={t.height}
            text={t.text}
            fontSize={t.fontSize}
            fontFamily={t.fontFamily}
            fontStyle={t.fontStyle === 'bold' ? 'bold' : t.fontStyle === 'italic' ? 'italic' : 'normal'}
            fill={t.color}
            align={t.align || 'left'}
            lineHeight={t.lineHeight || 1.2}
            rotation={t.rotation || 0}
            opacity={t.opacity ?? 1}
            draggable
            onClick={() => onSelectElement(t.id)}
            onTap={() => onSelectElement(t.id)}
            onDragEnd={(e) => updateElement(t.id, { x: e.target.x(), y: e.target.y() })}
          />
        );
      }
      case 'image': {
        const img = el as ImageElement;
        return (
          <KonvaImage
            key={img.id}
            el={img}
            isSelected={isSelected}
            onSelect={() => onSelectElement(img.id)}
            onChange={(attrs) => updateElement(img.id, attrs)}
          />
        );
      }
      case 'shape': {
        const s = el as ShapeElement;
        if (s.shapeType === 'circle') {
          return (
            <Circle
              key={s.id}
              id={s.id}
              x={s.x + s.width / 2}
              y={s.y + s.height / 2}
              radius={Math.min(s.width, s.height) / 2}
              fill={s.fill}
              stroke={s.stroke}
              strokeWidth={s.strokeWidth || 0}
              rotation={s.rotation || 0}
              opacity={s.opacity ?? 1}
              draggable
              onClick={() => onSelectElement(s.id)}
              onTap={() => onSelectElement(s.id)}
              onDragEnd={(e) => updateElement(s.id, { x: e.target.x() - s.width / 2, y: e.target.y() - s.height / 2 })}
            />
          );
        }
        if (s.shapeType === 'line') {
          return (
            <Line
              key={s.id}
              id={s.id}
              points={[s.x, s.y, s.x + s.width, s.y + s.height]}
              stroke={s.stroke || s.fill || '#000'}
              strokeWidth={s.strokeWidth || 2}
              opacity={s.opacity ?? 1}
              draggable
              onClick={() => onSelectElement(s.id)}
              onTap={() => onSelectElement(s.id)}
              onDragEnd={(e) => updateElement(s.id, { x: e.target.x(), y: e.target.y() })}
            />
          );
        }
        // rectangle (default)
        return (
          <Rect
            key={s.id}
            id={s.id}
            x={s.x}
            y={s.y}
            width={s.width}
            height={s.height}
            fill={s.fill}
            stroke={s.stroke}
            strokeWidth={s.strokeWidth || 0}
            cornerRadius={4}
            rotation={s.rotation || 0}
            opacity={s.opacity ?? 1}
            draggable
            onClick={() => onSelectElement(s.id)}
            onTap={() => onSelectElement(s.id)}
            onDragEnd={(e) => updateElement(s.id, { x: e.target.x(), y: e.target.y() })}
          />
        );
      }
      case 'qr': {
        const q = el as QRElement;
        // Render QR placeholder — actual QR rendering via export
        return (
          <Group key={q.id}>
            <Rect
              id={q.id}
              x={q.x}
              y={q.y}
              width={q.width}
              height={q.height}
              fill={q.backgroundColor}
              stroke={q.foregroundColor}
              strokeWidth={2}
              cornerRadius={4}
              rotation={q.rotation || 0}
              opacity={q.opacity ?? 1}
              draggable
              onClick={() => onSelectElement(q.id)}
              onTap={() => onSelectElement(q.id)}
              onDragEnd={(e) => updateElement(q.id, { x: e.target.x(), y: e.target.y() })}
            />
            <Text
              x={q.x + 4}
              y={q.y + q.height / 2 - 8}
              width={q.width - 8}
              text="QR"
              fontSize={16}
              fontStyle="bold"
              fill={q.foregroundColor}
              align="center"
              listening={false}
            />
          </Group>
        );
      }
      default:
        return null;
    }
  };

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

          {/* Render canvas elements sorted by zIndex */}
          {sorted.map(renderElement)}

          {/* Transformer for selected element */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-card px-3 py-1 rounded-md shadow text-sm">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
