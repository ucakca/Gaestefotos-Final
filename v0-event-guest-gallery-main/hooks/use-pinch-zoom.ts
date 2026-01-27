"use client";

import React from "react"

import { useState, useRef, useCallback, useEffect } from "react";

interface PinchZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface UsePinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  onZoomChange?: (scale: number) => void;
}

export function usePinchZoom(options: UsePinchZoomOptions = {}) {
  const { minScale = 1, maxScale = 4, onZoomChange } = options;

  const [state, setState] = useState<PinchZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef(1);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  const getDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: TouchList) => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialDistance.current = getDistance(e.touches);
      initialScale.current = state.scale;
      lastTouchCenter.current = getTouchCenter(e.touches);
    }
  }, [state.scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current !== null) {
      e.preventDefault();

      const currentDistance = getDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches);
      
      // Calculate new scale
      const scaleChange = currentDistance / initialDistance.current;
      let newScale = initialScale.current * scaleChange;
      newScale = Math.min(Math.max(newScale, minScale), maxScale);

      // Calculate translation for panning while zoomed
      let newTranslateX = state.translateX;
      let newTranslateY = state.translateY;

      if (lastTouchCenter.current && newScale > 1) {
        const deltaX = currentCenter.x - lastTouchCenter.current.x;
        const deltaY = currentCenter.y - lastTouchCenter.current.y;
        newTranslateX += deltaX;
        newTranslateY += deltaY;
      }

      // Constrain translation when zoomed
      const maxTranslate = ((newScale - 1) * 100) / 2;
      newTranslateX = Math.min(Math.max(newTranslateX, -maxTranslate), maxTranslate);
      newTranslateY = Math.min(Math.max(newTranslateY, -maxTranslate), maxTranslate);

      setState({
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      });

      lastTouchCenter.current = currentCenter;
      onZoomChange?.(newScale);
    }
  }, [state.translateX, state.translateY, minScale, maxScale, onZoomChange]);

  const handleTouchEnd = useCallback(() => {
    initialDistance.current = null;
    lastTouchCenter.current = null;

    // Reset to default if scale is close to 1
    if (state.scale < 1.1) {
      setState({ scale: 1, translateX: 0, translateY: 0 });
      onZoomChange?.(1);
    }
  }, [state.scale, onZoomChange]);

  // Double tap to zoom
  const lastTap = useRef(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      e.preventDefault();
      
      if (state.scale > 1) {
        // Reset zoom
        setState({ scale: 1, translateX: 0, translateY: 0 });
        onZoomChange?.(1);
      } else {
        // Zoom to 2x at tap location
        const touch = e.changedTouches[0];
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const x = touch.clientX - rect.left - rect.width / 2;
          const y = touch.clientY - rect.top - rect.height / 2;
          setState({
            scale: 2,
            translateX: -x / 2,
            translateY: -y / 2,
          });
          onZoomChange?.(2);
        }
      }
    }
    lastTap.current = now;
  }, [state.scale, onZoomChange]);

  const resetZoom = useCallback(() => {
    setState({ scale: 1, translateX: 0, translateY: 0 });
    onZoomChange?.(1);
  }, [onZoomChange]);

  // Reset on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.scale > 1) {
        resetZoom();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.scale, resetZoom]);

  return {
    containerRef,
    scale: state.scale,
    translateX: state.translateX,
    translateY: state.translateY,
    isZoomed: state.scale > 1,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    handleDoubleTap,
    resetZoom,
    style: {
      transform: `scale(${state.scale}) translate(${state.translateX / state.scale}px, ${state.translateY / state.scale}px)`,
      transition: initialDistance.current === null ? "transform 0.2s ease-out" : "none",
    },
  };
}
