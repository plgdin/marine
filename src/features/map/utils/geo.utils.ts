import type { VesselPosition } from '@shared/types/domain.types';
import type { FeatureCollection, Point, Feature } from 'geojson';
import { getVesselMetadata, mapAISShipType } from '@shared/services/aisstream.service';

export interface VesselGeoJsonProperties {
  id: string;
  mmsi: string;
  name: string;
  vesselType: string;    // 'cargo' | 'tanker' | 'bulk_carrier' | 'passenger' | etc.
  status: string;
  speed: number;
  heading: number;
  timestamp: string;
}

/**
 * Converts a Map of VesselPositions into a flat GeoJSON FeatureCollection.
 * Mapbox GL JS relies on GeoJSON for high-performance data sourcing.
 * 
 * Enriched with AISStream vessel metadata (ship names, vessel types).
 */
export function positionsToGeoJson(
  positions: Map<string, VesselPosition>
): FeatureCollection<Point, VesselGeoJsonProperties> {
  const features: Feature<Point, VesselGeoJsonProperties>[] = [];

  for (const pos of positions.values()) {
    // Enrich with AIS metadata if available
    const metadata = getVesselMetadata(pos.vesselId);
    const shipName = metadata?.name || pos.vesselId;
    const vesselType = metadata?.vesselType || mapAISShipType(metadata?.shipType ?? 0, shipName);

    features.push({
      type: 'Feature',
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
