import { Source, Layer, type LayerProps } from 'react-map-gl/maplibre';
import { useMapStore } from '../../stores/map.store';
import { useMapSync } from '../../hooks/useMapSync';
import { useEffect, useState } from 'react';

// 1. Heatmap (visible at lower zoom levels)
const heatmapLayer: LayerProps = {
  id: 'vessels-heatmap',
  type: 'heatmap',
  source: 'vessels',
  maxzoom: 9,
  paint: {
    'heatmap-weight': 1,
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
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
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 9, 0],
  },
};

// 2. Individual vessel arrows
const unclusteredLayer: LayerProps = {
  id: 'vessels-unclustered',
  type: 'symbol',
  source: 'vessels',
  layout: {
    'icon-image': 'vessel-arrow',
    'icon-size': [
      'interpolate', ['linear'], ['zoom'],
      2, 0.35,
      6, 0.45,
      10, 0.55,
      15, 0.7,
    ],
    'icon-rotate': [
      'case',
      ['>', ['get', 'course'], 0], ['get', 'course'],
      ['get', 'heading'],
    ],
    'icon-rotation-alignment': 'map',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'icon-pitch-alignment': 'map',
  },
  paint: {
    'icon-color': [
      'match',
      ['get', 'vesselType'],
      'cargo',        '#2E7D32',   
      'tanker',       '#C62828',   
      'bulk_carrier', '#BF360C',   
      'passenger',    '#1565C0',   
      'fishing',      '#6A1B9A',   
      'tug',          '#E65100',   
      'hsc',          '#00838F',   
      '#455A64'                    
    ],
    'icon-halo-color': [
      'match',
      ['get', 'source'],
      'transparency', '#00E5FF', 
      'globalfishing', '#00E676', 
      'api', '#FF4081', 
      '#FFFFFF' 
    ],
    'icon-halo-width': 1.5,
    'icon-opacity': 0.9,
  },
};

const EMPTY_GEOJSON: any = { type: 'FeatureCollection', features: [] };

export function VesselLayer() {
  const { showVessels, showHeatmap, showAisVessels, showGfwVessels, showTransparencyVessels, showVesselApiVessels } = useMapStore((s) => s.layers);

  // Initialize the imperative sync bridge
  useMapSync();

  // Create a dynamic filter array based on active source toggles
  const activeSources: any[] = [];
  if (showAisVessels) activeSources.push(['==', ['get', 'source'], 'ais'], ['==', ['get', 'source'], 'manual']);
  if (showGfwVessels) activeSources.push(['==', ['get', 'source'], 'globalfishing']);
  if (showTransparencyVessels) activeSources.push(['==', ['get', 'source'], 'transparency']);
  if (showVesselApiVessels) activeSources.push(['==', ['get', 'source'], 'api']);

  const filterExpression = (activeSources.length > 0 ? ['any', ...activeSources] : ['==', 'id', 'nothing']) as any;

  return (
    <Source
      id="vessels"
      type="geojson"
      data={EMPTY_GEOJSON}
      cluster={false}
      tolerance={0}
    >
      {showHeatmap && <Layer {...heatmapLayer} />}
      {showVessels && <Layer {...(unclusteredLayer as any)} filter={filterExpression} />}
    </Source>
  );
}
