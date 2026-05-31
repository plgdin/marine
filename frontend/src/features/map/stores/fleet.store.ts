import { create } from 'zustand';
import { fleetService, type FleetRecord } from '@shared/services/fleet.service';

interface FleetState {
  fleets: FleetRecord[];
  isLoading: boolean;
  
  // Actions
  fetchFleets: () => Promise<void>;
  addVesselToFleet: (fleetId: string, vesselMmsi: string) => Promise<boolean>;
}

export const useFleetStore = create<FleetState>((set) => ({
  fleets: [],
  isLoading: false,

  fetchFleets: async () => {
    set({ isLoading: true });
    const fleets = await fleetService.getFleets();
    set({ fleets, isLoading: false });
  },

  addVesselToFleet: async (fleetId: string, vesselMmsi: string) => {
    const success = await fleetService.addVesselToFleet(fleetId, vesselMmsi);
    return success;
  }
}));
