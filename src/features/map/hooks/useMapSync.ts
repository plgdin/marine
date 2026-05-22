import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { positionsToGeoJson } from '../utils/geo.utils';
import type { GeoJSONSource } from 'maplibre-gl';

/**
 * Imperative Synchronization Hook.
 * 
 * Bypasses React rendering entirely for vessel updates.
 * Subscribes directly to the Zustand store's _positionVersion counter,
 * reads the mutable positions buffer, converts to GeoJSON,
 * and calls `source.setData()` directly on the WebGL canvas.
 */
export function useMapSync() {
  const { current: map } = useMap();
  const lastSyncRef = useRef<number>(0);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVersionRef = useRef<number>(0);

  useEffect(() => {
    if (!map) return;

    // Subscribe to any state change, but only act when version bumps
    const unsubscribe = useRealtimeStore.subscribe((state) => {
      const version = state._positionVersion;
      if (version === lastVersionRef.current) return;
      lastVersionRef.current = version;

      const now = Date.now();
      
      // Additional throttle — max 2 updates per second to MapLibre
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
          console.log(`MapSync: Updated source with ${geoJson.features.length} vessels`);
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
