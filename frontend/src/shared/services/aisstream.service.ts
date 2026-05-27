export interface VesselMetadata {
  name: string;
  mmsi: string;
  imo: string | null;
  callSign: string | null;
  shipType: number;
  vesselType: string;
  destination: string | null;
}

const vesselMetadataCache = new Map<string, VesselMetadata>();

export function getVesselMetadata(mmsi: string): VesselMetadata | undefined {
  return vesselMetadataCache.get(mmsi);
}

export function getAllVesselMetadata(): Map<string, VesselMetadata> {
  return vesselMetadataCache;
}

export function mapAISShipType(typeCode: number, name?: string): string {
  if (!typeCode || typeCode === 0) {
    const nameLower = (name || '').toLowerCase();
    if (nameLower.includes('fishing') || nameLower.includes('trawler')) return 'fishing';
    if (nameLower.includes('tanker')) return 'tanker';
    if (nameLower.includes('cargo') || nameLower.includes('bulk')) return 'cargo';
    if (nameLower.includes('tug') || nameLower.includes('towing')) return 'tug';
    if (nameLower.includes('passenger') || nameLower.includes('ferry')) return 'passenger';
    return 'unknown';
  }
  if (typeCode >= 20 && typeCode <= 29) return 'wig';
  if (typeCode === 30) return 'fishing';
  if (typeCode >= 31 && typeCode <= 32) return 'tug';
  if (typeCode >= 33 && typeCode <= 35) return 'military';
  if (typeCode === 36) return 'sailing';
  if (typeCode === 37) return 'pleasure';
  if (typeCode >= 40 && typeCode <= 49) return 'hsc';
  if (typeCode >= 50 && typeCode <= 59) return 'pilot';
  if (typeCode >= 60 && typeCode <= 69) return 'passenger';
  if (typeCode >= 70 && typeCode <= 79) return 'cargo';
  if (typeCode >= 80 && typeCode <= 89) return 'tanker';
  if (typeCode >= 90 && typeCode <= 99) return 'other';
  return 'unknown';
}
