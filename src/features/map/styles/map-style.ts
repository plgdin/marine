/**
 * Custom MapLibre GL style:
 * - White water bodies
 * - Green land masses
 * - Country borders and labels
 *
 * Based on OpenFreeMap OpenMapTiles vector tiles (no API key needed).
 * Layer schema matches the positron reference style.
 */

import type { StyleSpecification } from 'maplibre-gl';

const MAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'MarineTrack Custom',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  sprite: 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  layers: [
    // ── Background (land = light green) ────────────────
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#C8E6C9', // Light green for all land
      },
    },

    // ── Park areas (slightly more green) ───────────────
    {
      id: 'park',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'park',
      filter: ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
      paint: {
        'fill-color': '#A5D6A7',
        'fill-opacity': 0.5,
      },
    },

    // ── Water (white) ──────────────────────────────────
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      filter: [
        'all',
        ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
        ['!=', ['get', 'brunnel'], 'tunnel'],
      ],
      paint: {
        'fill-antialias': true,
        'fill-color': '#FFFFFF',
      },
    },

    // ── Land cover — ice shelves ───────────────────────
    {
      id: 'landcover_ice_shelf',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      maxzoom: 8,
      filter: [
        'all',
        ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
        ['==', ['get', 'subclass'], 'ice_shelf'],
      ],
      paint: {
        'fill-color': '#E8F5E9',
        'fill-opacity': 0.7,
      },
    },

    // ── Land cover — glacier ───────────────────────────
    {
      id: 'landcover_glacier',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      maxzoom: 8,
      filter: [
        'all',
        ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
        ['==', ['get', 'subclass'], 'glacier'],
      ],
      paint: {
        'fill-color': '#C8E6C9',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 0, 1, 8, 0.5],
      },
    },

    // ── Residential areas ──────────────────────────────
    {
      id: 'landuse_residential',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      maxzoom: 16,
      filter: [
        'all',
        ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
        ['==', ['get', 'class'], 'residential'],
      ],
      paint: {
        'fill-color': '#C8E6C9',
        'fill-opacity': ['interpolate', ['exponential', 0.6], ['zoom'], 8, 0.8, 9, 0.6],
      },
    },

    // ── Wooded areas ───────────────────────────────────
    {
      id: 'landcover_wood',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      minzoom: 10,
      filter: [
        'all',
        ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
        ['==', ['get', 'class'], 'wood'],
      ],
      paint: {
        'fill-color': '#81C784',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0, 12, 1],
      },
    },

    // ── Waterway lines ─────────────────────────────────
    {
      id: 'waterway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
      paint: {
        'line-color': '#E0E0E0',
        'line-width': 1,
      },
    },

    // ── Buildings ──────────────────────────────────────
    {
      id: 'building',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 12,
      paint: {
        'fill-antialias': true,
        'fill-color': '#A5D6A7',
        'fill-outline-color': '#81C784',
      },
    },

    // ── Roads pier ─────────────────────────────────────
    {
      id: 'road_area_pier',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: [
        'all',
        ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
        ['==', ['get', 'class'], 'pier'],
      ],
      paint: {
        'fill-antialias': true,
        'fill-color': '#C8E6C9',
      },
    },

    // ── Major roads ────────────────────────────────────
    {
      id: 'highway_major_subtle',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      maxzoom: 11,
      filter: [
        'all',
        ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': 'hsla(0,0%,85%,0.69)',
        'line-width': 2,
      },
    },

    // ── Motorway ───────────────────────────────────────
    {
      id: 'highway_motorway_subtle',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      maxzoom: 6,
      filter: [
        'all',
        ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        ['==', ['get', 'class'], 'motorway'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': 'hsla(0,0%,85%,0.53)',
        'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 4, 2, 6, 1.3],
      },
    },

    // ── Sub-national boundaries ────────────────────────
    {
      id: 'boundary_3',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      minzoom: 8,
      filter: [
        'all',
        ['>=', ['get', 'admin_level'], 3],
        ['<=', ['get', 'admin_level'], 6],
        ['!=', ['get', 'maritime'], 1],
        ['!=', ['get', 'disputed'], 1],
        ['!', ['has', 'claimed_by']],
      ],
      paint: {
        'line-color': 'hsl(0,0%,70%)',
        'line-dasharray': [1, 1],
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 11, 2],
      },
    },

    // ── Country boundaries ─────────────────────────────
    {
      id: 'boundary_2',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: [
        'all',
        ['==', ['get', 'admin_level'], 2],
        ['!=', ['get', 'maritime'], 1],
        ['!=', ['get', 'disputed'], 1],
        ['!', ['has', 'claimed_by']],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#888888',
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 4, 1],
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 5, 1.2, 12, 3],
      },
    },

    // ── Disputed boundaries ────────────────────────────
    {
      id: 'boundary_disputed',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: [
        'all',
        ['!=', ['get', 'maritime'], 1],
        ['==', ['get', 'disputed'], 1],
      ],
      paint: {
        'line-color': 'hsl(0,0%,70%)',
        'line-dasharray': [1, 2],
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 5, 1.2, 12, 3],
      },
    },

    // ── State labels ───────────────────────────────────
    {
      id: 'label_state',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 5,
      maxzoom: 8,
      filter: ['==', ['get', 'class'], 'state'],
      layout: {
        'text-field': [
          'case',
          ['has', 'name:nonlatin'],
          ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
          ['coalesce', ['get', 'name_en'], ['get', 'name']],
        ],
        'text-font': ['Noto Sans Italic'],
        'text-letter-spacing': 0.2,
        'text-max-width': 9,
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 8, 14],
        'text-transform': 'uppercase',
      },
      paint: {
        'text-color': '#555555',
        'text-halo-blur': 1,
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1,
      },
    },

    // ── City labels ────────────────────────────────────
    {
      id: 'label_city',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 3,
      filter: [
        'all',
        ['==', ['get', 'class'], 'city'],
        ['!=', ['get', 'capital'], 2],
      ],
      layout: {
        'icon-allow-overlap': true,
        'icon-image': ['step', ['zoom'], 'circle_11_black', 9, ''],
        'icon-optional': false,
        'icon-size': 0.4,
        'text-anchor': 'bottom',
        'text-field': [
          'case',
          ['has', 'name:nonlatin'],
          ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
          ['coalesce', ['get', 'name_en'], ['get', 'name']],
        ],
        'text-font': ['Noto Sans Regular'],
        'text-max-width': 8,
        'text-offset': [0, -0.1],
        'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 4, 11, 7, 13, 11, 18],
      },
      paint: {
        'text-color': '#333333',
        'text-halo-blur': 1,
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1,
      },
    },

    // ── Capital city labels ────────────────────────────
    {
      id: 'label_city_capital',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 3,
      filter: [
        'all',
        ['==', ['get', 'class'], 'city'],
        ['==', ['get', 'capital'], 2],
      ],
      layout: {
        'icon-allow-overlap': true,
        'icon-image': ['step', ['zoom'], 'circle_11_black', 9, ''],
        'icon-optional': false,
        'icon-size': 0.5,
        'text-anchor': 'bottom',
        'text-field': [
          'case',
          ['has', 'name:nonlatin'],
          ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
          ['coalesce', ['get', 'name_en'], ['get', 'name']],
        ],
        'text-font': ['Noto Sans Bold'],
        'text-max-width': 8,
        'text-offset': [0, -0.2],
        'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 4, 12, 7, 14, 11, 20],
      },
      paint: {
        'text-color': '#222222',
        'text-halo-blur': 1,
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1,
      },
    },

    // ── Country labels (small) ─────────────────────────
    {
      id: 'label_country_3',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 2,
      maxzoom: 9,
      filter: [
        'all',
        ['==', ['get', 'class'], 'country'],
        ['>=', ['get', 'rank'], 3],
      ],
      layout: {
        'text-field': [
          'case',
          ['has', 'name:nonlatin'],
          ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
          ['coalesce', ['get', 'name_en'], ['get', 'name']],
        ],
        'text-font': ['Noto Sans Bold'],
        'text-max-width': 6.25,
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 9, 7, 17],
      },
      paint: {
        'text-color': '#444444',
        'text-halo-blur': 1,
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1,
      },
    },

    // ── Country labels (medium) ────────────────────────
    {
      id: 'label_country_2',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      maxzoom: 9,
      filter: [
        'all',
        ['==', ['get', 'class'], 'country'],
        ['==', ['get', 'rank'], 2],
      ],
      layout: {
        'text-field': [
          'case',
          ['has', 'name:nonlatin'],
          ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
          ['coalesce', ['get', 'name_en'], ['get', 'name']],
        ],
        'text-font': ['Noto Sans Bold'],
        'text-max-width': 6.25,
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 5, 17],
      },
      paint: {
        'text-color': '#333333',
        'text-halo-blur': 1,
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1,
      },
    },

    // ── Country labels (large / rank 1) ────────────────
    {
      id: 'label_country_1',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      maxzoom: 9,
      filter: [
        'all',
        ['==', ['get', 'class'], 'country'],
        ['==', ['get', 'rank'], 1],
      ],
      layout: {
        'text-field': [
          'case',
          ['has', 'name:nonlatin'],
          ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
          ['coalesce', ['get', 'name_en'], ['get', 'name']],
        ],
        'text-font': ['Noto Sans Bold'],
        'text-max-width': 6.25,
        'text-size': ['interpolate', ['linear'], ['zoom'], 1, 9, 4, 17],
      },
      paint: {
        'text-color': '#222222',
        'text-halo-blur': 1,
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1,
      },
    },
  ],
};

export default MAP_STYLE;
