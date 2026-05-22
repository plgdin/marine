import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { positionsToGeoJson } from '../utils/geo.utils';
import type { GeoJSONSource } from 'maplibre-gl';

/**
 * Imperative Synchronization Hook.
 * 
 * Bypasses React rendering entirely for vessel updates.
 * Subscribes directly to the Zustand store, converts the Map to GeoJSON,
 * and calls `source.setData()` directly on the WebGL canvas.
 * This is the secret to rendering 100k+ vessels at 60fps.
 */
export function useMapSync() {
  const { current: map } = useMap();
  const lastSyncRef = useRef<number>(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!map) return;

    const unsubscribe = useRealtimeStore.subscribe((state) => {
      const now = Date.now();
      
      // MapLibre's clustering worker gets overloaded if we push 20k+ points at 60fps.
      // Throttle data synchronization to max 2 times per second (500ms).
      if (now - lastSyncRef.current < 500) {
        if (!syncTimeoutRef.current) {
          syncTimeoutRef.current = setTimeout(() => {
            syncTimeoutRef.current = null;
            updateMap(state.positions);
          }, 500 - (now - lastSyncRef.current));
        }
        return;
      }
      
      updateMap(state.positions);
    });

    function updateMap(positions: any) {
      lastSyncRef.current = Date.now();
      
      const mapboxInstance = map.getMap();
      if (!mapboxInstance || !mapboxInstance.isStyleLoaded()) {
        console.warn('MapSync: Map or style not loaded');
        return;
      }

      const source = mapboxInstance.getSource('vessels') as GeoJSONSource;
      if (source) {
        try {
          const geoJson = positionsToGeoJson(positions);
          source.setData(geoJson);
          console.log(`MapSync: Updated source with ${geoJson.features.length} vessels`);
        } catch (err) {
          console.error('MapSync: Error converting to GeoJSON', err);
        }
      } else {
        console.warn('MapSync: Source "vessels" not found on map');
      }
    }

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [map]);
}
