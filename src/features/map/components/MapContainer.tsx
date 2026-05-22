import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../stores/map.store';
import { VesselLayer } from './layers/VesselLayer';
import { VesselPopup } from './VesselPopup';
import { useCallback } from 'react';
import type { MapMouseEvent } from 'maplibre-gl';
import MAP_STYLE from '../styles/map-style';

export function MapContainer() {
  const viewport = useMapStore((s) => s.viewport);
  const setViewport = useMapStore((s) => s.setViewport);
  const setSelectedVessel = useMapStore((s) => s.setSelectedVessel);

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
      >
        <VesselLayer />
        <VesselPopup />
      </Map>
    </div>
  );
}
