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
}

interface RealtimeActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  upsertPosition:      (pos: VesselPosition) => void;
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

// ── Store ────────────────────────────────
export const useRealtimeStore = create<RealtimeStore>()((set) => ({
  // State
  connectionStatus: 'disconnected',
  positions:        new Map(),
  tracks:           new Map(),
  recentAlerts:     [],
  unreadAlertCount: 0,

  // Actions
  setConnectionStatus: (status) =>
    set({ connectionStatus: status }),

  upsertPosition: (pos) =>
    set((s) => {
      const next = new Map(s.positions);
      next.set(pos.vesselId, pos);
      return { positions: next };
    }),

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
