// ─── Workflow Event Bus ─────────────────────────────────────────────────────
// Central pub/sub system for workflow events.
// Decouples workflow engine from UI, analytics, logging, and other consumers.

import type { EngineEvent } from './types';

export type EventBusListener = (event: EngineEvent) => void;

class WorkflowEventBus {
  private listeners = new Map<string, Set<EventBusListener>>();
  private globalListeners = new Set<EventBusListener>();
  private history: EngineEvent[] = [];
  private maxHistory = 200;

  /** Subscribe to a specific event type */
  on(eventType: string, listener: EventBusListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
    return () => this.listeners.get(eventType)?.delete(listener);
  }

  /** Subscribe to ALL events */
  onAny(listener: EventBusListener): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  /** Emit an event to all relevant listeners */
  emit(event: EngineEvent): void {
    // Store in history
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Notify type-specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch (e) {
          console.error(`[EventBus] Listener error for ${event.type}:`, e);
        }
      }
    }

    // Notify global listeners
    for (const listener of this.globalListeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[EventBus] Global listener error:', e);
      }
    }
  }

  /** Get event history (for debugging / replay) */
  getHistory(): readonly EngineEvent[] {
    return this.history;
  }

  /** Clear all listeners and history */
  clear(): void {
    this.listeners.clear();
    this.globalListeners.clear();
    this.history = [];
  }

  /** Remove all listeners but keep history */
  removeAllListeners(): void {
    this.listeners.clear();
    this.globalListeners.clear();
  }
}

// Singleton instance
export const workflowEventBus = new WorkflowEventBus();
