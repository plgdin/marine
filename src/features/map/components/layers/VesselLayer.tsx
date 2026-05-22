import { Source, Layer, type LayerProps } from 'react-map-gl/mapbox';
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
    'text-font': ['Inter Medium', 'Arial Unicode MS Bold'],
    'text-size': 11,
  },
  paint: {
    'text-color': '#ffffff',
  },
};

// 3. Unclustered Vessels (individual icons)
const unclusteredLayer: LayerProps = {
  id: 'vessels-unclustered',
  type: 'circle', // Using circle temporarily until SVG sprites are loaded
  source: 'vessels',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': [
      'match',
      ['get', 'status'],
      'underway', '#00e676',
      'anchored', '#ffab00',
      'moored', '#40c4ff',
      'alert', '#ff1744',
      '#78909c' // default
    ],
    'circle-radius': 5,
    'circle-stroke-width': 1,
    'circle-stroke-color': '#ffffff',
  },
};

export function VesselLayer() {
  const { showVessels, showHeatmap } = useMapStore((s) => s.layers);

  // Initialize the imperative sync bridge
  useMapSync();

  return (
    <Source
      id="vessels"
      type="geojson"
      data={{ type: 'FeatureCollection', features: [] }} // Initial empty dataset
      cluster={true}
      clusterMaxZoom={10} // Max zoom to cluster points on
      clusterRadius={50} // Radius of each cluster when clustering points
    >
      {showHeatmap && <Layer {...heatmapLayer} />}
      {showVessels && (
        <>
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredLayer} />
        </>
      )}
    </Source>
  );
}
