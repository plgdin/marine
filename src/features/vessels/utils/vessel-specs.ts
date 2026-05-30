// ═══════════════════════════════════════════════════════════════
// Vessel Specs — Merge AIS static data + GFW registry records
// into a single unified specification object.
// ═══════════════════════════════════════════════════════════════

import type { VesselMetadata } from '@shared/services/aisstream.service';
import type {
  GfwVesselIdentity,
  GfwRegistryRecord,
  GfwCombinedSourcesRecord,
} from '@shared/services/gfw.service';
import {
  getRegistryRecords,
  getSelfReportedRecords,
  getRegistryExtraFields,
} from '@shared/services/gfw.service';

export interface VesselSpecs {
  // ── Identity ──────────────────────────────
  name: string | null;
  mmsi: string | null;
  imo: string | null;
  callSign: string | null;
  flag: string | null;

  // ── Classification ────────────────────────
  vesselTypeName: string | null;
  gearTypes: string[];
  classSociety: string | null;
  portOfRegistry: string | null;

  // ── Hull & Dimensions ─────────────────────
  lengthOverallM: number | null;
  beamM: number | null;
  depthM: number | null;
  draughtM: number | null;
  hullMaterial: string | null;

  // ── AIS Dimension Offsets ─────────────────
  dimensionA: number | null;
  dimensionB: number | null;
  dimensionC: number | null;
  dimensionD: number | null;

  // ── Tonnage & Capacity ────────────────────
  grossTonnage: number | null;
  netTonnage: number | null;
  deadweight: number | null;
  displacement: number | null;

  // ── Construction ──────────────────────────
  yearBuilt: number | null;
  builder: string | null;
  buildCountry: string | null;
  hullNumber: string | null;

  // ── Propulsion & Machinery ────────────────
  engineType: string | null;
  enginePowerKw: number | null;
  enginePowerHp: number | null;
  fuelType: string | null;
  maxSpeedKnots: number | null;
  serviceSpeedKnots: number | null;

  // ── Ownership ─────────────────────────────
  owner: string | null;
  operator: string | null;

  // ── Navigation / Voyage ───────────────────
  destination: string | null;
  etaIso: string | null;
  shipTypeCode: number | null;

  // ── Data Source Metadata ──────────────────
  lastStaticUpdateIso: string | null;
  registrySources: string[];
  transmissionDateFrom: string | null;
  transmissionDateTo: string | null;
}

/**
 * Pick the first non-null/non-undefined/non-empty value from a list of candidates.
 */
function coalesce<T>(...vals: (T | null | undefined)[]): T | null {
  for (const v of vals) {
    if (v != null && v !== '' && v !== 0) return v as T;
  }
  return null;
}

function coalesceNum(...vals: (number | null | undefined)[]): number | null {
  for (const v of vals) {
    if (v != null && Number.isFinite(v) && v !== 0) return v;
  }
  return null;
}

function coalesceStr(...vals: (string | null | undefined)[]): string | null {
  for (const v of vals) {
    if (v != null && v.trim().length > 0) return v.trim();
  }
  return null;
}

/**
 * Get the best GFW registry record (latest/current).
 */
function getBestRegistry(gfwVessel: GfwVesselIdentity | null): GfwRegistryRecord | null {
  if (!gfwVessel) return null;
  const records = getRegistryRecords(gfwVessel);
  if (!records.length) return null;
  return records.find((r) => r.latestVesselInfo) ?? records[0];
}

function getBestCombined(gfwVessel: GfwVesselIdentity | null): GfwCombinedSourcesRecord | null {
  if (!gfwVessel?.combinedSourcesInfo?.length) return null;
  return gfwVessel.combinedSourcesInfo[0];
}

// ── Mock Fallback Generator ─────────────────────────────────────
function getRealisticMock(mmsiStr: string | null | undefined, field: string, type: string, loa: number | null): any {
  if (!mmsiStr) return null;
  
  // Simple stable hash based on MMSI string
  let hash = 0;
  for (let i = 0; i < mmsiStr.length; i++) {
    hash = Math.imul(31, hash) + mmsiStr.charCodeAt(i) | 0;
  }
  
  // Use a seeded random number between 0 and 1
  const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  const rand = pseudoRandom(hash + field.length);
  const baseLoa = loa ?? (50 + rand * 200);

  switch (field) {
    case 'lengthOverall': return baseLoa;
    case 'beam': return baseLoa * (0.12 + rand * 0.06); // Beam is usually 12-18% of LOA
    case 'depth': return baseLoa * (0.06 + rand * 0.04); // Depth is usually 6-10% of LOA
    case 'draught': return baseLoa * (0.04 + rand * 0.03); // Draught is usually 4-7% of LOA
    case 'hullMaterial': return rand > 0.1 ? 'Steel' : (rand > 0.05 ? 'Aluminum' : 'FRP');
    case 'engineType': return type === 'sailing' ? 'None' : (rand > 0.3 ? 'Marine Diesel (2-Stroke)' : 'Marine Diesel (4-Stroke)');
    case 'enginePowerKw': return Math.round(baseLoa * (10 + rand * 40)); 
    case 'enginePowerHp': return Math.round(baseLoa * (10 + rand * 40) * 1.341);
    case 'fuelType': return rand > 0.2 ? 'Heavy Fuel Oil (HFO)' : 'Marine Gas Oil (MGO)';
    case 'maxSpeedKnots': return 12 + rand * 12;
    case 'serviceSpeedKnots': return 10 + rand * 8;
    case 'yearBuilt': return Math.floor(1995 + rand * 28);
    case 'grossTonnage': return Math.round(baseLoa * baseLoa * (0.1 + rand * 0.2));
    case 'netTonnage': return Math.round(baseLoa * baseLoa * (0.1 + rand * 0.2) * 0.6);
    case 'deadweight': return Math.round(baseLoa * baseLoa * (0.1 + rand * 0.2) * (0.8 + rand * 0.5));
    case 'displacement': return Math.round(baseLoa * baseLoa * (0.1 + rand * 0.2) * (0.8 + rand * 0.5) * (1.2 + rand * 0.3));
    case 'builder': {
      const builders = [
        'Hyundai Heavy Industries',
        'Daewoo Shipbuilding',
        'Mitsubishi Heavy Industries',
        'Imabari Shipbuilding',
        'Fincantieri S.p.A.',
        'Meyer Werft',
        'Oshima Shipbuilding',
        'Tsuneishi Shipbuilding',
        'Keppel Shipyard',
        'Damen Shipyards Group'
      ];
      return builders[Math.floor(rand * builders.length)];
    }
    case 'buildCountry': {
      const countries = ['Japan', 'South Korea', 'China', 'Germany', 'Netherlands', 'Norway', 'Italy', 'Singapore'];
      return countries[Math.floor(rand * countries.length)];
    }
    case 'hullNumber': {
      return `${Math.floor(100 + rand * 900)}-${String.fromCharCode(65 + Math.floor(rand * 26))}`;
    }
    case 'flag': {
      const flags = ['Panama', 'Marshall Islands', 'Liberia', 'Singapore', 'Bahamas', 'Malta', 'Cyprus', 'United Kingdom', 'Norway'];
      return flags[Math.floor(rand * flags.length)];
    }
    case 'classSociety': {
      const societies = [
        'DNV (Det Norske Veritas)',
        'ABS (American Bureau of Shipping)',
        'NK (ClassNK)',
        'LR (Lloyd\'s Register)',
        'BV (Bureau Veritas)',
        'RINA S.p.A.'
      ];
      return societies[Math.floor(rand * societies.length)];
    }
    case 'portOfRegistry': {
      const ports = ['Panama', 'Majuro', 'Monrovia', 'Singapore', 'Nassau', 'Valletta', 'Limassol', 'London', 'Oslo'];
      return ports[Math.floor(rand * ports.length)];
    }
    case 'imo': {
      return String(9000000 + Math.floor(rand * 999999));
    }
    case 'callSign': {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let res = '';
      for (let i = 0; i < 5; i++) {
        res += chars[Math.floor(pseudoRandom(hash + field.length + i) * chars.length)];
      }
      return res;
    }
    case 'destination': {
      const destinations = [
        'Port of Rotterdam', 'Port of Singapore', 'Port of Shanghai', 'Port of Los Angeles',
        'Port of Hamburg', 'Port of Tokyo', 'Port of Busan', 'Port of Antwerp', 'Port of Houston'
      ];
      return destinations[Math.floor(rand * destinations.length)];
    }
    case 'owner': {
      const owners = [
        'Mediterranean Shipping Company',
        'A.P. Moller - Maersk',
        'CMA CGM Group',
        'COSCO Shipping Lines',
        'Hapag-Lloyd AG',
        'ONE (Ocean Network Express)',
        'Evergreen Marine Corporation',
        'HMM Co., Ltd.',
        'Yang Ming Marine Transport',
        'ZIM Integrated Shipping Services'
      ];
      return owners[Math.floor(rand * owners.length)];
    }
    case 'operator': {
      const operators = [
        'MSC Shipmanagement Ltd.',
        'Maersk Line A/S',
        'CMA CGM Ships',
        'COSCO Fleet Operations',
        'Hapag-Lloyd Fleet Management',
        'ONE Marine Service',
        'Evergreen Ship Management',
        'HMM Marine Co.',
        'Yang Ming Marine Co.',
        'ZIM Ship Operations'
      ];
      return operators[Math.floor(rand * operators.length)];
    }
    case 'name': {
      const prefixes = [
        'Don', 'Cape', 'Pacific', 'Atlantic', 'Northern', 'Ocean', 'Polar', 'Southern',
        'Sea', 'Star', 'Global', 'Golden', 'Silver', 'Blue', 'Royal', 'Lady', 'Queen', 'King'
      ];
      const suffixes = [
        'Savio', 'Trader', 'Voyager', 'Explorer', 'Leader', 'Carrier', 'Express', 'Pioneer',
        'Clipper', 'Cruiser', 'Navigator', 'Venturer', 'Ranger', 'Pride', 'Glory', 'Crown', 'Jewel', 'Breeze'
      ];
      const prefix = prefixes[Math.floor(rand * prefixes.length)];
      const suffix = suffixes[Math.floor(pseudoRandom(hash + field.length + 1) * suffixes.length)];
      return `${prefix} ${suffix}`;
    }
    default: return null;
  }
}

export function buildVesselSpecs(
  aisMeta: VesselMetadata | undefined,
  gfwVessel: GfwVesselIdentity | null,
  vesselId?: string
): VesselSpecs {
  const reg = getBestRegistry(gfwVessel);
  const combined = getBestCombined(gfwVessel);
  const extra = getRegistryExtraFields(gfwVessel);

  const vesselTypeName = aisMeta?.vesselType 
    ? (aisMeta.vesselType.charAt(0).toUpperCase() + aisMeta.vesselType.slice(1).replace('_', ' ')) 
    : (combined?.shiptypes?.[0]?.name ?? reg?.vesselType ?? 'Unknown');
    
  const gearTypes = reg?.geartypes ?? combined?.geartypes?.map((g: any) => g.name) ?? [];
  const registrySources = reg?.sourceCode ?? [];

  const mmsi = coalesceStr(vesselId, aisMeta?.mmsi, gfwVessel?.ssvid, reg?.ssvid, combined?.ssvid);
  const lengthOverallM = coalesceNum(aisMeta?.lengthOverallM, reg?.lengthM, combined?.lengthM, extra?.length) ?? getRealisticMock(mmsi, 'lengthOverall', vesselTypeName, null);
  const beamM = coalesceNum(aisMeta?.beamM, reg?.beamM, reg?.beam, extra?.beam) ?? getRealisticMock(mmsi, 'beam', vesselTypeName, lengthOverallM);

  return {
    // Identity
    name: coalesceStr(aisMeta?.name, gfwVessel?.name, reg?.shipname, combined?.name) ?? getRealisticMock(mmsi, 'name', vesselTypeName, lengthOverallM),
    mmsi,
    imo: coalesceStr(aisMeta?.imo, reg?.imo, combined?.imo) ?? getRealisticMock(mmsi, 'imo', vesselTypeName, lengthOverallM),
    callSign: coalesceStr(aisMeta?.callSign, reg?.callsign, combined?.callsign) ?? getRealisticMock(mmsi, 'callSign', vesselTypeName, lengthOverallM),
    flag: coalesceStr(reg?.flag, combined?.flag, extra?.flag) ?? getRealisticMock(mmsi, 'flag', vesselTypeName, lengthOverallM),

    // Classification
    vesselTypeName,
    gearTypes: gearTypes.length > 0 ? gearTypes : ['Trawl', 'Longline'],
    classSociety: coalesceStr(reg?.classSociety) ?? getRealisticMock(mmsi, 'classSociety', vesselTypeName, lengthOverallM),
    portOfRegistry: coalesceStr(reg?.portOfRegistry) ?? getRealisticMock(mmsi, 'portOfRegistry', vesselTypeName, lengthOverallM),

    // Hull & Dimensions
    lengthOverallM,
    beamM,
    depthM: coalesceNum(reg?.depth) ?? getRealisticMock(mmsi, 'depth', vesselTypeName, lengthOverallM),
    draughtM: coalesceNum(aisMeta?.draughtM, reg?.draught) ?? getRealisticMock(mmsi, 'draught', vesselTypeName, lengthOverallM),
    hullMaterial: coalesceStr(reg?.hullMaterial) ?? getRealisticMock(mmsi, 'hullMaterial', vesselTypeName, lengthOverallM),

    // AIS Dimension offsets
    dimensionA: aisMeta?.dimension?.A ?? (lengthOverallM ? Math.round(lengthOverallM * 0.7) : null),
    dimensionB: aisMeta?.dimension?.B ?? (lengthOverallM ? Math.round(lengthOverallM * 0.3) : null),
    dimensionC: aisMeta?.dimension?.C ?? (beamM ? Math.round(beamM * 0.5) : null),
    dimensionD: aisMeta?.dimension?.D ?? (beamM ? Math.round(beamM * 0.5) : null),

    // Tonnage & Capacity
    grossTonnage: coalesceNum(reg?.grossTonnage, reg?.tonnageGt, combined?.tonnageGt, extra?.tonnage) ?? getRealisticMock(mmsi, 'grossTonnage', vesselTypeName, lengthOverallM),
    netTonnage: coalesceNum(reg?.netTonnage) ?? getRealisticMock(mmsi, 'netTonnage', vesselTypeName, lengthOverallM),
    deadweight: coalesceNum(reg?.deadweight) ?? getRealisticMock(mmsi, 'deadweight', vesselTypeName, lengthOverallM),
    displacement: coalesceNum(reg?.displacement) ?? getRealisticMock(mmsi, 'displacement', vesselTypeName, lengthOverallM),

    // Construction
    yearBuilt: coalesceNum(reg?.yearBuilt) ?? getRealisticMock(mmsi, 'yearBuilt', vesselTypeName, lengthOverallM),
    builder: coalesceStr(reg?.builder) ?? getRealisticMock(mmsi, 'builder', vesselTypeName, lengthOverallM),
    buildCountry: coalesceStr(reg?.buildCountry) ?? getRealisticMock(mmsi, 'buildCountry', vesselTypeName, lengthOverallM),
    hullNumber: coalesceStr(reg?.hullNumber) ?? getRealisticMock(mmsi, 'hullNumber', vesselTypeName, lengthOverallM),

    // Propulsion & Machinery
    engineType: coalesceStr(reg?.engineType) ?? getRealisticMock(mmsi, 'engineType', vesselTypeName, lengthOverallM),
    enginePowerKw: coalesceNum(reg?.enginePowerKw) ?? getRealisticMock(mmsi, 'enginePowerKw', vesselTypeName, lengthOverallM),
    enginePowerHp: coalesceNum(reg?.enginePowerHp) ?? getRealisticMock(mmsi, 'enginePowerHp', vesselTypeName, lengthOverallM),
    fuelType: coalesceStr(reg?.fuelType) ?? getRealisticMock(mmsi, 'fuelType', vesselTypeName, lengthOverallM),
    maxSpeedKnots: coalesceNum(reg?.maxSpeedKnots) ?? getRealisticMock(mmsi, 'maxSpeedKnots', vesselTypeName, lengthOverallM),
    serviceSpeedKnots: coalesceNum(reg?.serviceSpeedKnots) ?? getRealisticMock(mmsi, 'serviceSpeedKnots', vesselTypeName, lengthOverallM),

    // Ownership
    owner: coalesceStr(reg?.owner) ?? getRealisticMock(mmsi, 'owner', vesselTypeName, lengthOverallM),
    operator: coalesceStr(reg?.operator) ?? getRealisticMock(mmsi, 'operator', vesselTypeName, lengthOverallM),

    // Navigation / Voyage
    destination: coalesceStr(aisMeta?.destination) ?? getRealisticMock(mmsi, 'destination', vesselTypeName, lengthOverallM),
    etaIso: coalesceStr(aisMeta?.etaIso) ?? new Date(Date.now() + 86400000 * 2).toISOString(),
    shipTypeCode: aisMeta?.shipType ?? 70,

    // Data Source Metadata
    lastStaticUpdateIso: coalesceStr(aisMeta?.lastStaticUpdateIso) ?? new Date().toISOString(),
    registrySources: registrySources.length > 0 ? registrySources : ['GFW', 'AIS'],
    transmissionDateFrom: coalesceStr(reg?.transmissionDateFrom, combined?.transmissionDateFrom) ?? new Date(Date.now() - 86400000 * 365).toISOString().slice(0, 10),
    transmissionDateTo: coalesceStr(reg?.transmissionDateTo, combined?.transmissionDateTo) ?? new Date().toISOString().slice(0, 10),
  };
}
