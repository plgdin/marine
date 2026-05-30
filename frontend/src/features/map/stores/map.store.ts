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
  showAisVessels: boolean;
  showGfwVessels: boolean;
  showTransparencyVessels: boolean;
  showVesselApiVessels: boolean;
}

interface MapStore {
  viewport: ViewportState;
  layers: MapLayerState;
  mapBounds: [number, number, number, number] | null; // [minLng, minLat, maxLng, maxLat]
  selectedVesselId: string | null;
  playbackTimestamp: number | null; // null means live mode
  vesselCount: number;

  setViewport: (viewport: Partial<ViewportState>) => void;
  toggleLayer: (layer: keyof MapLayerState) => void;
  setSelectedVessel: (id: string | null) => void;
  setPlaybackTimestamp: (timestamp: number | null) => void;
  setVesselCount: (count: number) => void;
  setMapBounds: (bounds: [number, number, number, number] | null) => void;
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
  showAisVessels: true,
  showGfwVessels: true,
  showTransparencyVessels: true,
  showVesselApiVessels: true,
};

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      viewport: DEFAULT_VIEWPORT,
      layers: DEFAULT_LAYERS,
      mapBounds: null,
      selectedVesselId: null,
      playbackTimestamp: null,
      vesselCount: 0,

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
      setVesselCount: (count) => set({ vesselCount: count }),
      setMapBounds: (bounds) => set({ mapBounds: bounds }),
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
