import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../stores/map.store';
import { VesselLayer } from './layers/VesselLayer';
import { VesselPopup } from './VesselPopup';
import { useCallback, useEffect } from 'react';
import type { MapMouseEvent } from 'maplibre-gl';
import MAP_STYLE from '../styles/map-style';
import { gfwService } from '@shared/services/gfw.service';
import { vesselApiService } from '@shared/services/vesselapi.service';
import { useAuthStore } from '../../auth/stores/auth.store';

export function MapContainer() {
  const viewport = useMapStore((s) => s.viewport);
  const setViewport = useMapStore((s) => s.setViewport);
  const setSelectedVessel = useMapStore((s) => s.setSelectedVessel);

  useEffect(() => {
    // transparencyService.startPolling(() => {
    //   const state = useMapStore.getState();
    //   return { lat: state.viewport.latitude, lng: state.viewport.longitude };
    // });

    gfwService.startPolling();

    vesselApiService.startPolling(() => {
      const state = useMapStore.getState();
      
      // If zoomed out, fetch high-traffic global zones to populate the map
      if (state.viewport.zoom < 5) {
        return [
          { minLat: 49.5, maxLat: 51.5, minLon: -2, maxLon: 0 }, // English Channel
          { minLat: 1, maxLat: 3, minLon: 102.5, maxLon: 104.5 }, // Singapore
          { minLat: 28, maxLat: 30, minLon: -91, maxLon: -89 }, // Gulf of Mexico
        ];
      }

      // If zoomed in, strictly fetch the 2x2 degree box around the viewport
      return [{
        minLat: state.viewport.latitude - 1,
        maxLat: state.viewport.latitude + 1,
        minLon: state.viewport.longitude - 1,
        maxLon: state.viewport.longitude + 1,
      }];
    });

    return () => {
      // transparencyService.stopPolling();
      gfwService.stopPolling();
      vesselApiService.stopPolling();
    };
  }, []);

  const onMouseMove = useCallback((event: MapMouseEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const features = (event as any).features;
    const feature = features?.[0];
    
    if (feature && feature.layer?.id === 'vessels-unclustered') {
      const vesselId = feature.properties?.id;
      if (vesselId) {
        document.body.style.cursor = 'pointer';
        setSelectedVessel(vesselId);
      }
    } else {
      document.body.style.cursor = '';
      setSelectedVessel(null);
    }
  }, [setSelectedVessel]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onLoad = useCallback((e: any) => {
    const map = e.target;
    // Generate an arrow image for the vessels using a canvas
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw a sharp directional arrow pointing UP (0 degrees = North)
    // The 'icon-rotate' property in the layer will rotate it to match course
    ctx.beginPath();
    ctx.moveTo(size / 2, 2);              // Tip (top center)
    ctx.lineTo(size * 0.82, size * 0.85); // Bottom right
    ctx.lineTo(size / 2, size * 0.65);    // Inner V notch
    ctx.lineTo(size * 0.18, size * 0.85); // Bottom left
    ctx.closePath();
    ctx.fillStyle = '#000000'; // Color doesn't matter for SDF — only alpha channel
    ctx.fill();

    const imageData = ctx.getImageData(0, 0, size, size);
    
    // sdf: true allows us to use icon-color to color the arrow dynamically
    if (!map.hasImage('vessel-arrow')) {
      map.addImage('vessel-arrow', imageData, { sdf: true });
    }
  }, []);

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: '#FFFFFF' }}>
      <Map
        id="main-map"
        initialViewState={viewport}
        maxPitch={0}
        minPitch={0}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMove={(evt: any) => setViewport(evt.viewState)}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={['vessels-unclustered']}
        onLoad={onLoad}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMouseMove={onMouseMove as any}
        onMouseLeave={() => {
          document.body.style.cursor = '';
          setSelectedVessel(null);
        }}
        reuseMaps
        transformRequest={(url) => {
          if (url.includes('rpc/vessel_tiles')) {
            const token = useAuthStore.getState().session?.accessToken;
            return {
              url,
              headers: {
                Accept: 'application/vnd.pbf',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
            };
          }
          return { url };
        }}
      >
        <VesselLayer />
        <VesselPopup />
      </Map>
    </div>
  );
}
