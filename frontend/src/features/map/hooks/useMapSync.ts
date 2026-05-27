import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useRealtimeStore } from '@shared/stores/realtime.store';
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
 * Imperative Synchronization Hook.
 * 
 * Subscribes to Supabase DB for vessel positions and writes them into the 
 * high-performance Zustand mutable store so the Popup can read them.
 * Map rendering is now handled natively by PostGIS Vector Tiles.
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
        .limit(2000);

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
            name: row.vessels?.name || undefined
          });
        });
        console.log(`[DEBUG] Loaded ${data.length} ships into Realtime Store.`);
      }
    };

    fetchInitialState();

    const channelId = `mapsync-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    console.log("Connecting Supabase Realtime for MapSync...");
    const channel = supabase.channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'vessel_latest_positions'
        },
        (payload) => {
          const row = payload.new as any;
          if (!row || !row.vessel_id) return;
          
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
            source: row.source || 'ais'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);
}
