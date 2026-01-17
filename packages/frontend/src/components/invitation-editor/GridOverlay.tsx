'use client';

interface GridOverlayProps {
  width: number;
  height: number;
  gridSize: number;
  visible: boolean;
}

export function GridOverlay({ width, height, gridSize, visible }: GridOverlayProps) {
  if (!visible) return null;

  const lines: JSX.Element[] = [];

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="#e0e0e0"
        strokeWidth={x % (gridSize * 5) === 0 ? 1 : 0.5}
        opacity={x % (gridSize * 5) === 0 ? 0.3 : 0.15}
      />
    );
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="#e0e0e0"
        strokeWidth={y % (gridSize * 5) === 0 ? 1 : 0.5}
        opacity={y % (gridSize * 5) === 0 ? 0.3 : 0.15}
      />
    );
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {lines}
    </svg>
  );
}
