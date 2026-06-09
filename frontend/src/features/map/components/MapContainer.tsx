import { Map, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../stores/map.store';
import { VesselLayer } from './layers/VesselLayer';
import { VesselPopup } from './VesselPopup';
import { useCallback, useEffect } from 'react';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import type { MapMouseEvent } from 'maplibre-gl';
import MAP_STYLE from '../styles/map-style';
import { gfwService } from '@shared/services/gfw.service';
import { vesselApiService } from '@shared/services/vesselapi.service';


export function MapContainer() {
  const viewport = useMapStore((s) => s.viewport);
  const setViewport = useMapStore((s) => s.setViewport);
  const setSelectedVessel = useMapStore((s) => s.setSelectedVessel);
  const setMapBounds = useMapStore((s) => s.setMapBounds);

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
    
    if (feature && (feature.layer?.id === 'vessels-stationary' || feature.layer?.id === 'vessels-moving')) {
      const vesselId = feature.properties?.vessel_id;
      if (vesselId) {
        document.body.style.cursor = 'pointer';
        setSelectedVessel(vesselId);

        // If the vessel is missing from our store (because it wasn't in the top 2000 initial fetch),
        // we populate the store directly from the vector tile's properties so the Popup can render.
        const store = useRealtimeStore.getState();
        if (!store.positions.has(vesselId)) {
          let lng = event.lngLat.lng;
          let lat = event.lngLat.lat;
          if (feature.geometry && feature.geometry.type === 'Point') {
             lng = feature.geometry.coordinates[0];
             lat = feature.geometry.coordinates[1];
          }

          store.upsertPosition({
             id: vesselId,
             vesselId: vesselId,
             orgId: 'demo',
             location: { lat, lng },
             heading: feature.properties?.heading ? Number(feature.properties.heading) : null,
             course: feature.properties?.course ? Number(feature.properties.course) : null,
             speed: feature.properties?.speed ? Number(feature.properties.speed) : null,
             navStatus: feature.properties?.nav_status || 'underway',
             rot: null,
             timestamp: new Date().toISOString(),
             source: 'ais',
          });
          store.flushPositions();
        }
      }
    } else {
      document.body.style.cursor = '';
    }
  }, [setSelectedVessel]);

  const onClick = useCallback((event: MapMouseEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const features = (event as any).features;
    const feature = features?.[0];
    
    // If we clicked the map but NOT a vessel, clear the selection
    if (!feature || (feature.layer?.id !== 'vessels-stationary' && feature.layer?.id !== 'vessels-moving')) {
      setSelectedVessel(null);
    }
  }, [setSelectedVessel]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onLoad = useCallback((e: any) => {
    const map = e.target;
    
    // Initialize bounds on load
    const bounds = map.getBounds();
    setMapBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);

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
        minZoom={2}
        maxPitch={0}
        minPitch={0}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMove={(evt: any) => setViewport(evt.viewState)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMoveEnd={(evt: any) => {
          const bounds = evt.target.getBounds();
          setMapBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
        }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={['vessels-stationary', 'vessels-moving']}
        onLoad={onLoad}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMouseMove={onMouseMove as any}
        onClick={onClick as any}
        onMouseLeave={() => {
          document.body.style.cursor = '';
          setSelectedVessel(null);
        }}
      >
        <VesselLayer />
        <VesselPopup />
        <NavigationControl position="bottom-right" />
      </Map>
    </div>
  );
}
