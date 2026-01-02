import { io, Socket } from 'socket.io-client';
import { Photo } from '@gaestefotos/shared';

const getWsBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;

  // During SSR we can't inspect window; keep the previous behavior.
  if (typeof window === 'undefined') {
    return envUrl || 'http://localhost:8001';
  }

  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  // In local dev/E2E, prefer local backend even if NEXT_PUBLIC_WS_URL is set to production.
  if (isLocalHost) {
    if (envUrl && /(localhost|127\.0\.0\.1)/i.test(envUrl)) return envUrl;
    return 'http://localhost:8001';
  }

  // In production (or any non-local host), prefer same-origin unless explicitly overridden.
  return envUrl || window.location.origin;
};

class WebSocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect() {
    if (process.env.NEXT_PUBLIC_DISABLE_REALTIME === 'true') return;
    if (this.socket?.connected) return;

    this.socket = io(getWsBaseUrl(), {
      transports: ['polling'],
      upgrade: false,
      path: '/socket.io',
    });

    // Forward all events to listeners
    this.socket.onAny((event, data) => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach(listener => listener(data));
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  joinEvent(eventId: string) {
    if (this.socket) {
      this.socket.emit('join:event', eventId);
    }
  }

  leaveEvent(eventId: string) {
    if (this.socket) {
      this.socket.emit('leave:event', eventId);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }
}

export const wsManager = new WebSocketManager();

