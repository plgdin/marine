import { useEffect } from 'react';
import { Layer, Source, type LayerProps } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '../../stores/map.store';
import { useMapSync } from '../../hooks/useMapSync';
import env from '../../../../config/env';

// ─── Custom Protocol ────────────────────────────────────────────────
// Register a "supatile://" protocol so we can fetch tiles with the
// correct Accept header.  MapLibre's transformRequest is unreliable
// for binary responses via PostgREST — this bypasses it entirely.
// ─────────────────────────────────────────────────────────────────────
const PROTOCOL = 'supatile';
let protocolAdded = false;

function ensureProtocol() {
  if (protocolAdded) return;
  protocolAdded = true;

  maplibregl.addProtocol(PROTOCOL, async (params, abortController) => {
    // params.url looks like "supatile://2/1/1"
    const [z, x, y] = params.url.replace(`${PROTOCOL}://`, '').split('/');
    const realUrl =
      `${env.supabaseUrl}/rest/v1/rpc/vessel_tiles` +
      `?z=${z}&x=${x}&y=${y}`;

    const resp = await fetch(realUrl, {
      headers: { 
        Accept: 'application/vnd.pbf',
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`
      },
      signal: abortController.signal,
    });

    if (!resp.ok) {
      throw new Error(`Tile fetch failed: ${resp.status}`);
    }

    const data = await resp.arrayBuffer();
    return { data };
  });
}

// ─── Layer Definitions ──────────────────────────────────────────────

const getVesselColor = [
  'match',
  ['get', 'vessel_type'],
  'cargo', '#2E7D32',
  'tanker', '#C62828',
  'bulk_carrier', '#BF360C',
  'passenger', '#1565C0',
  'fishing', '#6A1B9A',
  'tug', '#E65100',
  'hsc', '#00838F',
  'Cargo', '#2E7D32',
  'Tanker', '#C62828',
  'Passenger', '#1565C0',
  'Fishing', '#6A1B9A',
  'Special/Tug', '#E65100',
  'High Speed Craft', '#00838F',
  '#455A64',
];

// 1. Heatmap (low zoom)
const heatmapLayer: LayerProps = {
  id: 'vessels-heatmap',
  type: 'heatmap',
  source: 'vessels',
  'source-layer': 'vessels',
  maxzoom: 6,
  paint: {
    'heatmap-weight': 1,
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 3],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(255, 255, 255, 0)',
      0.2, '#1565C0',
      0.4, '#1E88E5',
      0.6, '#FF6F00',
      0.8, '#FF3D00',
      1, '#D50000',
    ],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 6, 15],
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 4, 1, 6, 0],
  },
};

// 2. Stationary Vessels (Speed < 0.5) -> Rendered as Dots
const stationaryLayer: LayerProps = {
  id: 'vessels-stationary',
  type: 'circle',
  source: 'vessels',
  'source-layer': 'vessels',
  // Safely convert speed to number, default to 0
  filter: ['<', ['to-number', ['get', 'speed'], 0], 0.5],
  paint: {
    'circle-color': getVesselColor as any,
    'circle-radius': 4,
    'circle-stroke-width': 0.5,
    'circle-stroke-color': '#FFFFFF',
    'circle-opacity': 0.95,
  },
};

// 3. Moving Vessels (Speed >= 0.5) -> Rendered as Arrows
const movingLayer: LayerProps = {
  id: 'vessels-moving',
  type: 'symbol',
  source: 'vessels',
  'source-layer': 'vessels',
  filter: ['>=', ['to-number', ['get', 'speed'], 0], 0.5],
  layout: {
    'icon-image': 'vessel-arrow',
    'icon-size': 0.3,
    'icon-rotate': [
      'case',
      // If heading is valid (has heading and != 511), use heading
      ['all', ['has', 'heading'], ['!=', ['to-number', ['get', 'heading'], 511], 511]],
      ['to-number', ['get', 'heading'], 0],
      
      // Else if course is valid (has course and != 360 and != 3600), use course
      ['all', ['has', 'course'], ['!=', ['to-number', ['get', 'course'], 360], 360], ['!=', ['to-number', ['get', 'course'], 3600], 3600]],
      ['to-number', ['get', 'course'], 0],
      
      // Fallback
      0
    ],
    'icon-rotation-alignment': 'map',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'icon-pitch-alignment': 'map',
  },
  paint: {
    'icon-color': getVesselColor as any,
    'icon-halo-color': '#FFFFFF',
    'icon-halo-width': ['interpolate', ['linear'], ['zoom'], 2, 0, 8, 0.5, 12, 1.5],
    'icon-opacity': 0.95,
  },
};

// ─── Component ──────────────────────────────────────────────────────

export function VesselLayer() {
  const { showVessels, showHeatmap } = useMapStore((s) => s.layers);

  // Register the custom protocol once
  useEffect(() => {
    ensureProtocol();
  }, []);

  // Sync initial state (no global realtime WS spam)
  useMapSync();

  // Use the custom protocol — MapLibre will call our handler
  const tileUrl = `${PROTOCOL}://{z}/{x}/{y}`;

  return (
    <Source
      id="vessels"
      type="vector"
      tiles={[tileUrl]}
      minzoom={2}
      maxzoom={14}
    >
      {showHeatmap && <Layer {...heatmapLayer} />}
      {showVessels && <Layer {...stationaryLayer} />}
      {showVessels && <Layer {...movingLayer} />}
    </Source>
  );
}
