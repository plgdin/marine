import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ViewportState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface MapLayerState {
  showVessels: boolean;
  showHeatmap: boolean;
  showGeofences: boolean;
  showTrajectories: boolean;
  showLabels: boolean;
}

interface MapStore {
  viewport: ViewportState;
  layers: MapLayerState;
  selectedVesselId: string | null;
  playbackTimestamp: number | null; // null means live mode

  setViewport: (viewport: Partial<ViewportState>) => void;
  toggleLayer: (layer: keyof MapLayerState) => void;
  setSelectedVessel: (id: string | null) => void;
  setPlaybackTimestamp: (timestamp: number | null) => void;
}

const DEFAULT_VIEWPORT: ViewportState = {
  longitude: 0,
  latitude: 20,
  zoom: 2.5,
  pitch: 0,
  bearing: 0,
};

const DEFAULT_LAYERS: MapLayerState = {
  showVessels: true,
  showHeatmap: false,
  showGeofences: true,
  showTrajectories: false,
  showLabels: true,
};

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      viewport: DEFAULT_VIEWPORT,
      layers: DEFAULT_LAYERS,
      selectedVesselId: null,
      playbackTimestamp: null,

      setViewport: (viewport) =>
        set((state) => ({
          viewport: { ...state.viewport, ...viewport },
        })),

      toggleLayer: (layer) =>
        set((state) => ({
          layers: {
            ...state.layers,
            [layer]: !state.layers[layer],
          },
        })),

      setSelectedVessel: (id) => set({ selectedVesselId: id }),
      setPlaybackTimestamp: (ts) => set({ playbackTimestamp: ts }),
    }),
    {
      name: 'marinetrack-map-store',
      partialize: (state) => ({
        viewport: state.viewport,
        layers: state.layers,
      }), // only persist viewport and layer preferences
    }
  )
);
