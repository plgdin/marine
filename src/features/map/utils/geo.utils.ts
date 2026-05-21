import type { VesselPosition } from '@shared/types/domain.types';
import type { FeatureCollection, Point, Feature } from 'geojson';

export interface VesselGeoJsonProperties {
  id: string;
  mmsi: string;
  name: string;
  type: string;
  status: string;
  speed: number;
  heading: number;
  timestamp: string;
}

/**
 * Converts a Map of VesselPositions into a flat GeoJSON FeatureCollection.
 * Mapbox GL JS relies on GeoJSON for high-performance data sourcing.
 */
export function positionsToGeoJson(
  positions: Map<string, VesselPosition>
): FeatureCollection<Point, VesselGeoJsonProperties> {
  const features: Feature<Point, VesselGeoJsonProperties>[] = [];

  for (const pos of positions.values()) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [pos.location.lng, pos.location.lat],
      },
      properties: {
        id: pos.vesselId,
        mmsi: 'Unknown',
        name: pos.vesselId,
        type: 'Unknown',
        status: pos.navStatus,
        speed: pos.speed ?? 0,
        heading: pos.heading ?? 0,
        timestamp: pos.timestamp,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
