import { useEffect } from 'react';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { useMapStore } from '@/features/map/stores/map.store';
import { supabase } from '@/config/supabase';
import { useOrgId } from '@/features/auth/stores/auth.store';

function parseEWKBPoint(hex: string): [number, number] {
  if (!hex || hex.length < 50) return [0, 0];
  const matches = hex.match(/[\da-f]{2}/gi);
  if (!matches) return [0, 0];
  const buffer = new Uint8Array(matches.map((h) => parseInt(h, 16)));
  const view = new DataView(buffer.buffer);
  const isLittleEndian = view.getUint8(0) === 1;
  const lng = view.getFloat64(9, isLittleEndian);
  const lat = view.getFloat64(17, isLittleEndian);
  return [lng, lat];
}

/**
 * Syncs the initial map state for vessels.
 * Note: Realtime global streaming for 58k vessels has been disabled
 * to prevent exhausting the 2,000,000 msg/month Supabase Realtime quota.
 * Map rendering is handled by high-performance Vector Tiles.
 */
export function useMapSync() {
  const orgId = useOrgId();

  useEffect(() => {
    const fetchInitialState = async () => {
      console.log(`[DEBUG] Fetching initial fleet positions for Popup state... (orgId: ${orgId})`);
      const { data, error } = await supabase
        .from('vessel_latest_positions')
        .select(`
          vessel_id,
          location,
          heading,
          course,
          speed,
          source,
          nav_status,
          vessels ( name, mmsi, vessel_type )
        `)
        .limit(2000); // Limit to top 2000 to prevent heavy client loads on boot

      // Fetch the global vessel count to update the UI
      const { count } = await supabase
        .from('vessel_latest_positions')
        .select('*', { count: 'exact', head: true });

      if (count !== null) {
        useMapStore.getState().setVesselCount(count);
      }

      if (error) {
        console.error('[DEBUG] Failed to load ships from DB:', error);
        return;
      }

      if (data) {
        data.forEach((row: any) => {
          let lat = 0, lng = 0;
          if (row.location?.coordinates) {
             lng = row.location.coordinates[0];
             lat = row.location.coordinates[1];
          } else if (typeof row.location === 'string') {
             [lng, lat] = parseEWKBPoint(row.location);
          }
          
          useRealtimeStore.getState().upsertPosition({
            id: row.vessel_id,
            vesselId: row.vessel_id,
            orgId: orgId || 'demo',
            location: { lat, lng },
            heading: row.heading,
            course: row.course,
            speed: row.speed,
            navStatus: row.nav_status || 'underway',
            rot: null,
            timestamp: new Date().toISOString(),
            source: row.source || 'ais',
            name: row.vessels?.name || undefined,
            mmsi: row.vessels?.mmsi || undefined
          });
        });
        console.log(`[DEBUG] Loaded ${data.length} ships into Realtime Store.`);
      }
    };

    fetchInitialState();

    // The supabase.channel('mapsync') Realtime subscription was removed here
    // because streaming 58,000 constantly moving global AIS vessels over WebSockets
    // exhausts Supabase free-tier quotas and crashes client browsers.
  }, [orgId]);
}
