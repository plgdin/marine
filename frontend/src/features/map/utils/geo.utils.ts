import type { VesselPosition } from '@shared/types/domain.types';
import type { FeatureCollection, Point, Feature } from 'geojson';

export interface VesselGeoJsonProperties {
  id: string;
  mmsi: string;
  name: string;
  vesselType: string;    // 'cargo' | 'tanker' | 'bulk_carrier' | 'passenger' | etc.
  status: string;
  speed: number;
  heading: number;       // True heading (direction bow is pointing)
  course: number;        // Course over ground (direction of movement)
  timestamp: string;
  source: string;
}

/**
 * Converts a Map of VesselPositions into a flat GeoJSON FeatureCollection.
 * MapLibre GL JS relies on GeoJSON for high-performance data sourcing.
 * 
 * Enriched with AISStream vessel metadata (ship names, vessel types).
 */
export function positionsToGeoJson(
  positions: Map<string, VesselPosition>
): FeatureCollection<Point, VesselGeoJsonProperties> {
  const features: Feature<Point, VesselGeoJsonProperties>[] = [];

  for (const pos of positions.values()) {
    const shipName = pos.name || pos.vesselId;
    const vesselType = 'Unknown';

    features.push({
      type: 'Feature',
      id: pos.vesselId,
      geometry: {
        type: 'Point',
        coordinates: [pos.location.lng, pos.location.lat],
      },
      properties: {
        id: pos.vesselId,
        mmsi: pos.vesselId,
        name: shipName,
        vesselType,
        status: pos.navStatus,
        speed: pos.speed ?? 0,
        heading: pos.heading ?? pos.course ?? 0,
        course: pos.course ?? pos.heading ?? 0,
        timestamp: pos.timestamp,
        source: pos.source,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
