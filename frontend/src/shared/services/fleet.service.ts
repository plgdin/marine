import { supabase } from '@config/supabase';
import { logger } from '@shared/utils/logger';

export interface FleetRecord {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export class FleetService {
  /**
   * Fetch all fleets for the current organization
   * (For now, we fetch all fleets the user has access to via RLS)
   */
  async getFleets(): Promise<FleetRecord[]> {
    try {
      const { data, error } = await supabase
        .from('fleets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('FleetService: Failed to fetch fleets', err);
      return [];
    }
  }

  /**
   * Add a vessel to a fleet
   */
  async addVesselToFleet(fleetId: string, vesselMmsi: string): Promise<boolean> {
    try {
      const { error } = await (supabase.from('fleet_vessels') as any)
        .insert([
          { fleet_id: fleetId, vessel_mmsi: vesselMmsi }
        ]);
        
      if (error) {
        // Code 23505 is unique violation (already in fleet)
        if (error.code === '23505') {
          return true; // Consider it a success if it's already there
        }
        throw error;
      }
      return true;
    } catch (err) {
      logger.error(`FleetService: Failed to add vessel ${vesselMmsi} to fleet ${fleetId}`, err);
      return false;
    }
  }

  /**
   * Remove a vessel from a fleet
   */
  async removeVesselFromFleet(fleetId: string, vesselMmsi: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fleet_vessels')
        .delete()
        .eq('fleet_id', fleetId)
        .eq('vessel_mmsi', vesselMmsi);

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error(`FleetService: Failed to remove vessel ${vesselMmsi} from fleet ${fleetId}`, err);
      return false;
    }
  }
}

export const fleetService = new FleetService();
