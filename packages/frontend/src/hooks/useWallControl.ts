'use client';

import { useCallback, useEffect, useState } from 'react';
import { wsManager } from '@/lib/websocket';
import type { OverlayType } from '@/components/event-theme/WallThemeOverlay';

/**
 * Wall control state — shared between admin panel and wall display.
 * Synchronized via WebSocket `wall:control` events.
 */
export interface WallControlState {
  viewMode: string;
  isPlaying: boolean;
  intervalSec: number;
  soundEnabled: boolean;
  overlayType: OverlayType;
  overlayIntensity: number;
  showQR: boolean;
  showBranding: boolean;
  message: string;       // Custom text overlay message (announcement)
  messageVisible: boolean;
}

const DEFAULT_STATE: WallControlState = {
  viewMode: 'grid',
  isPlaying: true,
  intervalSec: 6,
  soundEnabled: false,
  overlayType: 'none',
  overlayIntensity: 0.5,
  showQR: true,
  showBranding: true,
  message: '',
  messageVisible: false,
};

/**
 * Hook for controlling the Live Wall remotely.
 * 
 * @param eventId - Event to control
 * @param role - 'admin' sends commands, 'wall' receives and applies them
 */
export function useWallControl(eventId: string, role: 'admin' | 'wall') {
  const [state, setState] = useState<WallControlState>(DEFAULT_STATE);

  // Connect & join event room
  useEffect(() => {
    if (!eventId) return;
    wsManager.connect();
    wsManager.joinEvent(eventId);

    return () => {
      wsManager.leaveEvent(eventId);
    };
  }, [eventId]);

  // Listen for wall control updates
  useEffect(() => {
    if (!eventId) return;

    const unsubscribe = wsManager.on('wall:control', (data: Partial<WallControlState>) => {
      setState(prev => ({ ...prev, ...data }));
    });

    return unsubscribe;
  }, [eventId]);

  // Admin: send a control command
  const sendCommand = useCallback((update: Partial<WallControlState>) => {
    if (role !== 'admin' || !eventId) return;

    // Optimistic local update
    setState(prev => ({ ...prev, ...update }));

    // Broadcast via WebSocket
    wsManager.emit('wall:control', {
      eventId,
      ...update,
    });
  }, [role, eventId]);

  // Convenience methods for admin
  const setViewMode = useCallback((mode: string) => sendCommand({ viewMode: mode }), [sendCommand]);
  const togglePlay = useCallback(() => sendCommand({ isPlaying: !state.isPlaying }), [sendCommand, state.isPlaying]);
  const setInterval = useCallback((sec: number) => sendCommand({ intervalSec: sec }), [sendCommand]);
  const toggleSound = useCallback(() => sendCommand({ soundEnabled: !state.soundEnabled }), [sendCommand, state.soundEnabled]);
  const setOverlay = useCallback((type: OverlayType) => sendCommand({ overlayType: type }), [sendCommand]);
  const setOverlayIntensity = useCallback((v: number) => sendCommand({ overlayIntensity: v }), [sendCommand]);
  const toggleQR = useCallback(() => sendCommand({ showQR: !state.showQR }), [sendCommand, state.showQR]);
  const showMessage = useCallback((msg: string) => sendCommand({ message: msg, messageVisible: true }), [sendCommand]);
  const hideMessage = useCallback(() => sendCommand({ messageVisible: false }), [sendCommand]);

  return {
    state,
    setState,
    sendCommand,
    setViewMode,
    togglePlay,
    setInterval,
    toggleSound,
    setOverlay,
    setOverlayIntensity,
    toggleQR,
    showMessage,
    hideMessage,
  };
}
