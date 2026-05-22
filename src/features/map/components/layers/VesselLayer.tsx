import { Source, Layer, type LayerProps } from 'react-map-gl/maplibre';
import { useMapStore } from '../../stores/map.store';
import { useMapSync } from '../../hooks/useMapSync';

// ── Layer Styling Definitions ─────────────────────────────────

// 1. Heatmap (visible at lower zoom levels)
const heatmapLayer: LayerProps = {
  id: 'vessels-heatmap',
  type: 'heatmap',
  source: 'vessels',
  maxzoom: 9,
  paint: {
    'heatmap-weight': 1, // Can scale by density or speed
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(2, 12, 20, 0)',
      0.2, '#0f52a0',
      0.4, '#1a6fcf',
      0.6, '#00e5ff',
      0.8, '#ffab00',
      1, '#ff1744',
    ],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 9, 0],
  },
};

// 2. Clusters (grouping dense vessels)
const clusterLayer: LayerProps = {
  id: 'vessels-clusters',
  type: 'circle',
  source: 'vessels',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#1a6fcf', // default
      100, '#00e5ff', // 100+
      750, '#ffab00', // 750+
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      15, // default size
      100, 20, // 100+
      750, 25, // 750+
    ],
    'circle-opacity': 0.8,
    'circle-stroke-width': 2,
    'circle-stroke-color': 'rgba(255, 255, 255, 0.5)',
  },
};

const clusterCountLayer: LayerProps = {
  id: 'vessels-cluster-count',
  type: 'symbol',
  source: 'vessels',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
    'text-size': 11,
  },
  paint: {
    'text-color': '#ffffff',
  },
};

const unclusteredLayer: LayerProps = {
  id: 'vessels-unclustered',
  type: 'symbol',
  source: 'vessels',
  layout: {
    'icon-image': 'vessel-arrow',
    'icon-size': [
      'interpolate', ['linear'], ['zoom'],
      3, 0.15,
      10, 0.3,
      15, 0.5,
    ],
    'icon-rotate': ['get', 'heading'],
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'icon-pitch-alignment': 'map', // Keeps arrows flat on the map
  },
  paint: {
    'icon-color': [
      'match',
      ['get', 'vesselType'],
      'cargo',        '#4caf50',   // Green
      'tanker',       '#ef5350',   // Light red
      'bulk_carrier', '#b71c1c',   // Dark red
      'passenger',    '#42a5f5',   // Blue
      'fishing',      '#7c4dff',   // Purple
      'tug',          '#ffab00',   // Amber
      'hsc',          '#18ffff',   // Cyan
      '#78909c'                    // Gray default (other/unknown)
    ],
    'icon-halo-color': 'rgba(0, 0, 0, 0.7)',
    'icon-halo-width': 1,
  },
};

const EMPTY_GEOJSON: any = { type: 'FeatureCollection', features: [] };

export function VesselLayer() {
  const { showVessels, showHeatmap } = useMapStore((s) => s.layers);

  // Initialize the imperative sync bridge
  useMapSync();

  return (
    <Source
      id="vessels"
      type="geojson"
      data={EMPTY_GEOJSON} // Use stable reference to avoid clearing data on re-render
      cluster={false}
    >
      {showHeatmap && <Layer {...heatmapLayer} />}
      {showVessels && (
        <>
          <Layer {...unclusteredLayer} />
        </>
      )}
    </Source>
  );
}

