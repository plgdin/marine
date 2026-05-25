/**
 * Lightweight typed event bus for cross-feature communication.
 * Features must never import each other directly — use events instead.
 */

import type { VesselPosition, AlertEvent } from '@shared/types/domain.types';

// ── Event Definitions ────────────────────
export interface EventMap {
  'vessel:selected':        { vesselId: string };
  'vessel:deselected':      Record<string, never>;
  'vessel:position-update': { position: VesselPosition };
  'alert:received':         { alert: AlertEvent };
  'alert:acknowledged':     { alertId: string };
  'geofence:created':       { geofenceId: string };
  'map:fly-to':             { lng: number; lat: number; zoom?: number };
  'map:viewport-changed':   { zoom: number; center: [number, number] };
  'command-palette:open':   Record<string, never>;
  'command-palette:close':  Record<string, never>;
  'notification:show':      { type: 'success' | 'error' | 'info' | 'warning'; message: string; duration?: number };
  'realtime:connected':     Record<string, never>;
  'realtime:disconnected':  Record<string, never>;
}

type EventHandler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

class EventBus {
  private readonly listeners = new Map<string, Set<EventHandler<keyof EventMap>>>();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(handler as EventHandler<keyof EventMap>);

    // Return unsubscribe function
    return () => { handlers.delete(handler as EventHandler<keyof EventMap>); };
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const handlers = this.listeners.get(event);
    handlers?.forEach((handler) => handler(payload));
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<K>): void {
    this.listeners.get(event)?.delete(handler as EventHandler<keyof EventMap>);
  }

  clear(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/** Singleton event bus — import this instance everywhere */
export const eventBus = new EventBus();
