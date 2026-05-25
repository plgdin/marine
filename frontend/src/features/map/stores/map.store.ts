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

export interface SupabaseVesselData {
  vessel_id: string;
  location: string;
  heading: number | null;
  speed: number | null;
  nav_status: string;
  course?: number | null; 
  source?: string;
  vessels?: { name: string; mmsi: string; vessel_type: string };
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

  vessels: Record<string, SupabaseVesselData>;
  setVessels: (vessels: SupabaseVesselData[]) => void;
  updateVesselPosition: (payload: SupabaseVesselData) => void;
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

      vessels: {},
      setVessels: (vesselList) => set((state) => {
        const newVessels = { ...state.vessels };
        vesselList.forEach(v => {
          newVessels[v.vessel_id] = v;
        });
        return { vessels: newVessels };
      }),
      updateVesselPosition: (payload) => set((state) => ({
        vessels: { 
          ...state.vessels, 
          [payload.vessel_id]: { ...state.vessels[payload.vessel_id], ...payload } 
        }
      })),
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
