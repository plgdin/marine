import { create } from 'zustand';
import type { VesselPosition, AlertEvent } from '@shared/types/domain.types';

// ── Types ────────────────────────────────
type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface RealtimeState {
  connectionStatus: ConnectionStatus;
  /** Latest position per vessel: vesselId → VesselPosition */
  positions:        Map<string, VesselPosition>;
  /** Short track history per vessel: vesselId → ordered positions */
  tracks:           Map<string, VesselPosition[]>;
  /** Recent unread alert events (max 50) */
  recentAlerts:     AlertEvent[];
  unreadAlertCount: number;
  /** Monotonic counter bumped on every batch flush to trigger subscribers */
  _positionVersion: number;
}

interface RealtimeActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  upsertPosition:      (pos: VesselPosition) => void;
  flushPositions:      () => void;
  appendTrack:         (vesselId: string, pos: VesselPosition) => void;
  clearTrack:          (vesselId: string) => void;
  clearAllTracks:      () => void;
  addAlert:            (alert: AlertEvent) => void;
  acknowledgeAlert:    (alertId: string) => void;
  clearUnreadCount:    () => void;
}

type RealtimeStore = RealtimeState & RealtimeActions;

const MAX_TRACK_POINTS = 200;
const MAX_RECENT_ALERTS = 50;

/**
 * Batched position buffer.
 * 
 * Instead of cloning the entire Map on every single AIS message (hundreds/sec),
 * we write directly into a mutable Map and bump a version counter on a timer.
 * The `useMapSync` hook subscribes to version changes to push data to MapLibre.
 */
const positionsBuffer = new Map<string, VesselPosition>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 300; // Flush every 300ms

// ── Store ────────────────────────────────
export const useRealtimeStore = create<RealtimeStore>()((set, get) => ({
  // State
  connectionStatus: 'connected',
  positions:        positionsBuffer,
  tracks:           new Map(),
  recentAlerts:     [],
  unreadAlertCount: 0,
  _positionVersion: 0,

  // Actions
  setConnectionStatus: (status) =>
    set({ connectionStatus: status }),

  /**
   * Upsert a single vessel position into the shared mutable buffer.
   * Does NOT trigger a React re-render on each call — instead, schedules
   * a batched flush that bumps _positionVersion.
   */
  upsertPosition: (pos) => {
    positionsBuffer.set(pos.vesselId, pos);

    // Schedule a flush if not already pending
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        get().flushPositions();
      }, FLUSH_INTERVAL_MS);
    }
  },

  /**
   * Bump the version counter so subscribers (useMapSync) pick up changes.
   * The positions Map reference stays the same (mutable), but the version
   * number is what triggers the Zustand notification.
   */
  flushPositions: () => {
    set((s) => ({ _positionVersion: s._positionVersion + 1 }));
  },

  appendTrack: (vesselId, pos) =>
    set((s) => {
      const next    = new Map(s.tracks);
      const current = next.get(vesselId) ?? [];
      const updated = [...current, pos].slice(-MAX_TRACK_POINTS);
      next.set(vesselId, updated);
      return { tracks: next };
    }),

  clearTrack: (vesselId) =>
    set((s) => {
      const next = new Map(s.tracks);
      next.delete(vesselId);
      return { tracks: next };
    }),

  clearAllTracks: () =>
    set({ tracks: new Map() }),

  addAlert: (alert) =>
    set((s) => ({
      recentAlerts:     [alert, ...s.recentAlerts].slice(0, MAX_RECENT_ALERTS),
      unreadAlertCount: s.unreadAlertCount + 1,
    })),

  acknowledgeAlert: (alertId) =>
    set((s) => ({
      recentAlerts: s.recentAlerts.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true } : a,
      ),
    })),

  clearUnreadCount: () =>
    set({ unreadAlertCount: 0 }),
}));
