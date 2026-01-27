"use client";

import React from "react"

import { useCallback, useRef, useState } from "react";

interface LongPressOptions {
  threshold?: number; // ms to trigger long press
  onLongPress?: () => void;
  onPress?: () => void;
}

interface LongPressResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  isPressed: boolean;
}

export function useLongPress({
  threshold = 500,
  onLongPress,
  onPress,
}: LongPressOptions): LongPressResult {
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (x: number, y: number) => {
      setIsPressed(true);
      isLongPressRef.current = false;
      startPosRef.current = { x, y };

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress?.();
        setIsPressed(false);
      }, threshold);
    },
    [threshold, onLongPress]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressed(false);
  }, []);

  const handleEnd = useCallback(() => {
    cancel();
    if (!isLongPressRef.current) {
      onPress?.();
    }
  }, [cancel, onPress]);

  const handleMove = useCallback(
    (x: number, y: number) => {
      if (!startPosRef.current) return;
      
      const moveThreshold = 10;
      const deltaX = Math.abs(x - startPosRef.current.x);
      const deltaY = Math.abs(y - startPosRef.current.y);
      
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        cancel();
      }
    },
    [cancel]
  );

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      start(touch.clientX, touch.clientY);
    },
    onTouchEnd: handleEnd,
    onTouchMove: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    onMouseDown: (e: React.MouseEvent) => {
      start(e.clientX, e.clientY);
    },
    onMouseUp: handleEnd,
    onMouseLeave: cancel,
    isPressed,
  };
}
