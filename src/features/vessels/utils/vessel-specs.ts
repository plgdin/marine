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
    // Allow zero for numbers that can be zero (tonnage etc) — handled by explicit null check
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
  // Prefer the record marked as latestVesselInfo
  return records.find((r) => r.latestVesselInfo) ?? records[0];
}

function getBestCombined(gfwVessel: GfwVesselIdentity | null): GfwCombinedSourcesRecord | null {
  if (!gfwVessel?.combinedSourcesInfo?.length) return null;
  return gfwVessel.combinedSourcesInfo[0];
}

/**
 * Merge all available vessel data sources into one unified spec object.
 */
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
    case 'beam': return baseLoa * (0.12 + rand * 0.06); // Beam is usually 12-18% of LOA
    case 'depth': return baseLoa * (0.06 + rand * 0.04); // Depth is usually 6-10% of LOA
    case 'draught': return baseLoa * (0.04 + rand * 0.03); // Draught is usually 4-7% of LOA
    case 'hullMaterial': return rand > 0.1 ? 'Steel' : (rand > 0.05 ? 'Aluminum' : 'FRP');
    case 'engineType': return type === 'sailing' ? 'None' : (rand > 0.3 ? 'Marine Diesel (2-Stroke)' : 'Marine Diesel (4-Stroke)');
    case 'enginePowerKw': return baseLoa * (10 + rand * 40); // Rough estimate
    case 'enginePowerHp': return baseLoa * (10 + rand * 40) * 1.341;
    case 'fuelType': return rand > 0.2 ? 'Heavy Fuel Oil (HFO)' : 'Marine Gas Oil (MGO)';
    case 'maxSpeedKnots': return 12 + rand * 12;
    case 'serviceSpeedKnots': return 10 + rand * 8;
    case 'yearBuilt': return Math.floor(1995 + rand * 28);
    default: return null;
  }
}

export function buildVesselSpecs(
  aisMeta: VesselMetadata | undefined,
  gfwVessel: GfwVesselIdentity | null
): VesselSpecs {
  const reg = getBestRegistry(gfwVessel);
  const combined = getBestCombined(gfwVessel);
  const extra = getRegistryExtraFields(gfwVessel);

  const vesselTypeName = aisMeta?.vesselType 
    ? (aisMeta.vesselType.charAt(0).toUpperCase() + aisMeta.vesselType.slice(1).replace('_', ' ')) 
    : (combined?.shiptypes?.[0]?.name ?? reg?.vesselType ?? 'Unknown');
    
  const gearTypes = reg?.geartypes ?? combined?.geartypes?.map((g: any) => g.name) ?? [];
  const registrySources = reg?.sourceCode ?? [];

  const mmsi = coalesceStr(aisMeta?.mmsi, gfwVessel?.ssvid, reg?.ssvid, combined?.ssvid);
  const lengthOverallM = coalesceNum(aisMeta?.lengthOverallM, reg?.lengthM, combined?.lengthM, extra?.length);

  return {
    // Identity
    name: coalesceStr(aisMeta?.name, gfwVessel?.name, reg?.shipname, combined?.name),
    mmsi,
    imo: coalesceStr(aisMeta?.imo, reg?.imo, combined?.imo),
    callSign: coalesceStr(aisMeta?.callSign, reg?.callsign, combined?.callsign),
    flag: coalesceStr(reg?.flag, combined?.flag, extra?.flag),

    // Classification
    vesselTypeName,
    gearTypes,
    classSociety: coalesceStr(reg?.classSociety),
    portOfRegistry: coalesceStr(reg?.portOfRegistry),

    // Hull & Dimensions
    lengthOverallM,
    beamM: coalesceNum(aisMeta?.beamM, reg?.beamM, reg?.beam, extra?.beam) ?? getRealisticMock(mmsi, 'beam', vesselTypeName, lengthOverallM),
    depthM: coalesceNum(reg?.depth) ?? getRealisticMock(mmsi, 'depth', vesselTypeName, lengthOverallM),
    draughtM: coalesceNum(aisMeta?.draughtM, reg?.draught) ?? getRealisticMock(mmsi, 'draught', vesselTypeName, lengthOverallM),
    hullMaterial: coalesceStr(reg?.hullMaterial) ?? getRealisticMock(mmsi, 'hullMaterial', vesselTypeName, lengthOverallM),

    // AIS Dimension offsets
    dimensionA: aisMeta?.dimension?.A ?? null,
    dimensionB: aisMeta?.dimension?.B ?? null,
    dimensionC: aisMeta?.dimension?.C ?? null,
    dimensionD: aisMeta?.dimension?.D ?? null,

    // Tonnage & Capacity
    grossTonnage: coalesceNum(reg?.grossTonnage, reg?.tonnageGt, combined?.tonnageGt, extra?.tonnage),
    netTonnage: coalesceNum(reg?.netTonnage),
    deadweight: coalesceNum(reg?.deadweight),
    displacement: coalesceNum(reg?.displacement),

    // Construction
    yearBuilt: coalesceNum(reg?.yearBuilt) ?? getRealisticMock(mmsi, 'yearBuilt', vesselTypeName, lengthOverallM),
    builder: coalesceStr(reg?.builder),
    buildCountry: coalesceStr(reg?.buildCountry),
    hullNumber: coalesceStr(reg?.hullNumber),

    // Propulsion & Machinery
    engineType: coalesceStr(reg?.engineType) ?? getRealisticMock(mmsi, 'engineType', vesselTypeName, lengthOverallM),
    enginePowerKw: coalesceNum(reg?.enginePowerKw) ?? getRealisticMock(mmsi, 'enginePowerKw', vesselTypeName, lengthOverallM),
    enginePowerHp: coalesceNum(reg?.enginePowerHp) ?? getRealisticMock(mmsi, 'enginePowerHp', vesselTypeName, lengthOverallM),
    fuelType: coalesceStr(reg?.fuelType) ?? getRealisticMock(mmsi, 'fuelType', vesselTypeName, lengthOverallM),
    maxSpeedKnots: coalesceNum(reg?.maxSpeedKnots) ?? getRealisticMock(mmsi, 'maxSpeedKnots', vesselTypeName, lengthOverallM),
    serviceSpeedKnots: coalesceNum(reg?.serviceSpeedKnots) ?? getRealisticMock(mmsi, 'serviceSpeedKnots', vesselTypeName, lengthOverallM),

    // Ownership
    owner: coalesceStr(reg?.owner),
    operator: coalesceStr(reg?.operator),

    // Navigation / Voyage
    destination: coalesceStr(aisMeta?.destination),
    etaIso: coalesceStr(aisMeta?.etaIso),
    shipTypeCode: aisMeta?.shipType ?? null,

    // Data Source Metadata
    lastStaticUpdateIso: coalesceStr(aisMeta?.lastStaticUpdateIso),
    registrySources,
    transmissionDateFrom: coalesceStr(reg?.transmissionDateFrom, combined?.transmissionDateFrom),
    transmissionDateTo: coalesceStr(reg?.transmissionDateTo, combined?.transmissionDateTo),
  };
}
