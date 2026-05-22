import { Map, MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import env from '@config/env';
import { useMapStore } from '../stores/map.store';
import { VesselLayer } from './layers/VesselLayer';
import { VesselPopup } from './VesselPopup';
import { useCallback } from 'react';

// Required for mapbox-gl workers in some bundler setups
// @ts-ignore - mapbox-gl internal worker
// mapboxgl.workerClass = require('worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker').default;

export function MapContainer() {
  const viewport = useMapStore((s) => s.viewport);
  const setViewport = useMapStore((s) => s.setViewport);
  const setSelectedVessel = useMapStore((s) => s.setSelectedVessel);

  const onClick = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0];
    
    if (feature && feature.layer?.id === 'vessels-unclustered') {
      const vesselId = feature.properties?.id;
      if (vesselId) setSelectedVessel(vesselId);
    } else {
      setSelectedVessel(null);
    }
  }, [setSelectedVessel]);

  const onMouseEnter = useCallback(() => {
    document.body.style.cursor = 'pointer';
  }, []);

  const onMouseLeave = useCallback(() => {
    document.body.style.cursor = '';
  }, []);

  return (
    <div className="w-full h-full relative bg-marine-950">
      <Map
        mapboxAccessToken={env.mapboxToken || 'pk.ey...'}
        initialViewState={viewport}
        onMove={(evt: any) => setViewport(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        interactiveLayerIds={['vessels-unclustered']}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        reuseMaps
      >
        <VesselLayer />
        <VesselPopup />
      </Map>
    </div>
  );
}
