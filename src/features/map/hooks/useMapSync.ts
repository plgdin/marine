import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/mapbox';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { positionsToGeoJson } from '../utils/geo.utils';
import type { GeoJSONSource } from 'mapbox-gl';

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
  const syncFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map) return;

    // Subscribe to Zustand store changes directly without triggering re-renders
    const unsubscribe = useRealtimeStore.subscribe((state) => {
      // Throttle updates via requestAnimationFrame to avoid blocking the main thread
      if (syncFrameRef.current !== null) {
        cancelAnimationFrame(syncFrameRef.current);
      }

      syncFrameRef.current = requestAnimationFrame(() => {
        const mapboxInstance = map.getMap();
        if (!mapboxInstance.isStyleLoaded()) return;

        const source = mapboxInstance.getSource('vessels') as GeoJSONSource;
        if (source) {
          const geoJson = positionsToGeoJson(state.positions);
          source.setData(geoJson);
        }
      });
    });

    return () => {
      unsubscribe();
      if (syncFrameRef.current !== null) {
        cancelAnimationFrame(syncFrameRef.current);
      }
    };
  }, [map]);
}
