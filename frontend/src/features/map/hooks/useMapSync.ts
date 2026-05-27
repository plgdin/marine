import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { positionsToGeoJson } from '../utils/geo.utils';
import type { GeoJSONSource } from 'maplibre-gl';
import { supabase } from '@/config/supabase';
import { useOrgId } from '@/features/auth/stores/auth.store';

/**
 * Imperative Synchronization Hook.
 * 
 * Bypasses React rendering entirely for vessel updates by pushing
 * directly to MapLibre WebGL canvas.
 * Now integrated with Supabase for data fetching and realtime subscription.
 */
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

export function useMapSync() {
  const { current: map } = useMap();
  const lastSyncRef = useRef<number>(0);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVersionRef = useRef<number>(0);
  const orgId = useOrgId();

  useEffect(() => {
    const fetchInitialState = async () => {
      console.log(`[DEBUG] Fetching initial fleet positions... (orgId: ${orgId})`);
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

  // 2. High-Performance Bridge to MapLibre (from dev3 logic)
  useEffect(() => {
    if (!map) return;

    const unsubscribe = useRealtimeStore.subscribe((state) => {
      const version = state._positionVersion;
      if (version === lastVersionRef.current) return;
      lastVersionRef.current = version;

      const now = Date.now();
      
      if (now - lastSyncRef.current < 500) {
        if (!syncTimeoutRef.current) {
          syncTimeoutRef.current = setTimeout(() => {
            syncTimeoutRef.current = null;
            pushToMap();
          }, 500 - (now - lastSyncRef.current));
        }
        return;
      }
      
      pushToMap();
    });

    function pushToMap() {
      lastSyncRef.current = Date.now();
      
      const mapInstance = map?.getMap();
      if (!mapInstance || !mapInstance.isStyleLoaded()) {
        return;
      }

      const source = mapInstance.getSource('vessels') as GeoJSONSource;
      if (source) {
        try {
          const positions = useRealtimeStore.getState().positions;
          const geoJson = positionsToGeoJson(positions);
          source.setData(geoJson);
        } catch (err) {
          console.error('MapSync: Error converting to GeoJSON', err);
        }
      }
    }

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [map]);
}
