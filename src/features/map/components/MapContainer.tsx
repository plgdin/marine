import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../stores/map.store';
import { VesselLayer } from './layers/VesselLayer';
import { VesselPopup } from './VesselPopup';
import { useCallback } from 'react';
import type { MapMouseEvent } from 'maplibre-gl';

// Free dark tile style from CARTO (OpenStreetMap-based)
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export function MapContainer() {
  const viewport = useMapStore((s) => s.viewport);
  const setViewport = useMapStore((s) => s.setViewport);
  const setSelectedVessel = useMapStore((s) => s.setSelectedVessel);

  const onMouseMove = useCallback((event: MapMouseEvent) => {
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

  const onLoad = useCallback((e: any) => {
    const map = e.target;
    // Generate an arrow image for the vessels using a canvas
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw an arrow pointing UP (0 degrees)
    ctx.beginPath();
    ctx.moveTo(size / 2, 0); // Tip
    ctx.lineTo(size, size); // Bottom right
    ctx.lineTo(size / 2, size * 0.75); // Inner bottom indent
    ctx.lineTo(0, size); // Bottom left
    ctx.closePath();
    ctx.fillStyle = 'black'; // Color doesn't matter for SDF, alpha does
    ctx.fill();

    const imageData = ctx.getImageData(0, 0, size, size);
    
    // sdf: true allows us to use icon-color to color the arrow dynamically
    if (!map.hasImage('vessel-arrow')) {
      map.addImage('vessel-arrow', imageData, { sdf: true });
    }
  }, []);

  return (
    <div className="w-full h-full relative bg-marine-950">
      <Map
        id="main-map"
        initialViewState={viewport}
        onMove={(evt: any) => setViewport(evt.viewState)}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={['vessels-unclustered']}
        onLoad={onLoad}
        onMouseMove={onMouseMove as any}
        onMouseLeave={() => {
          document.body.style.cursor = '';
          setSelectedVessel(null);
        }}
        reuseMaps
      >
        <VesselLayer />
        <VesselPopup />
      </Map>
    </div>
  );
}
