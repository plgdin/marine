import env from '@config/env';
import { logger } from '@shared/utils/logger';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import type { VesselPosition } from '@shared/types/domain.types';

const GFW_API_URL = 'https://gateway.api.globalfishingwatch.org/v3';

export type GfwVesselInclude =
  | 'OWNERSHIP'
  | 'AUTHORIZATIONS'
  | 'REGISTRY_INFO'
  | 'MATCH_CRITERIA'
  | 'IDENTITY';

export type GfwInsight =
  | 'AIS_COVERAGE'
  | 'AIS_OFF'
  | 'FISHING_IN_NO_TAKE_MPA'
  | 'FISHING_WITHOUT_RFMO_AUTHORIZATION';

export type GfwEventType =
  | 'FISHING'
  | 'PORT_VISIT'
  | 'ENCOUNTER'
  | 'LOITERING'
  | 'GAP';

export type GfwDataset =
  | 'public-global-vessel-identity:latest'
  | 'public-global-fishing-events:latest'
  | 'public-global-port-visits-events:latest';

export type GfwFourwingsDataset =
  | 'public-global-fishing-effort:latest'
  | 'public-global-presence:latest'
  | 'public-global-sar-presence:latest';

export type GfwFourwingsTemporalResolution = 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY' | 'ENTIRE';
export type GfwFourwingsFormat = 'JSON' | 'CSV' | 'TIF';
export type GfwFourwingsGroupBy = 'VESSEL_ID' | 'MMSI' | 'FLAG' | 'GEARTYPE' | 'FLAGANDGEARTYPE';

// ── Detailed GFW Registry Record ──────────────────────────────
export interface GfwRegistryRecord {
  sourceCode?: string[];
  ssvid?: string;
  flag?: string;
  shipname?: string;
  nShipname?: string;
  callsign?: string;
  imo?: string;
  latestVesselInfo?: boolean;
  transmissionDateFrom?: string;
  transmissionDateTo?: string;
  geartypes?: string[];
  lengthM?: number;
  tonnageGt?: number;
  vesselInfoReference?: string;
  // Extended fields from deeper payloads
  depth?: number;
  beam?: number;
  beamM?: number;
  grossTonnage?: number;
  netTonnage?: number;
  deadweight?: number;
  displacement?: number;
  draught?: number;
  yearBuilt?: number;
  builder?: string;
  buildCountry?: string;
  hullNumber?: string;
  engineType?: string;
  enginePowerKw?: number;
  enginePowerHp?: number;
  fuelType?: string;
  maxSpeedKnots?: number;
  serviceSpeedKnots?: number;
  classSociety?: string;
  portOfRegistry?: string;
  hullMaterial?: string;
  vesselType?: string;
  owner?: string;
  operator?: string;
}

export interface GfwRegistryInfo {
  currentRegistryInfo?: GfwRegistryRecord[];
  registryInfo?: GfwRegistryRecord[];
  extraFields?: {
    flag?: string;
    length?: number;
    tonnage?: number;
    gearType?: string;
    beam?: number;
    depth?: number;
    draught?: number;
    engineType?: string;
    [key: string]: any;
  };
}

export interface GfwSelfReportedRecord {
  ssvid?: string;
  shipname?: string;
  nShipname?: string;
  flag?: string;
  callsign?: string;
  imo?: string;
  msgCount?: number;
  posCount?: number;
  transmissionDateFrom?: string;
  transmissionDateTo?: string;
}

export interface GfwSelfReportedInfo {
  selfReportedInfo?: GfwSelfReportedRecord[];
}

export interface GfwCombinedSourcesRecord {
  name?: string;
  ssvid?: string;
  flag?: string;
  callsign?: string;
  imo?: string;
  shiptypes?: Array<{ name?: string; id?: number }>;
  geartypes?: Array<{ name?: string; id?: number }>;
  lengthM?: number;
  tonnageGt?: number;
  vesselId?: string;
  transmissionDateFrom?: string;
  transmissionDateTo?: string;
}

export interface GfwVesselIdentity {
  id?: string;
  dataset?: string;
  name?: string;
  ssvid?: string;
  // Search endpoint returns registryInfo as a direct array; getById wraps it differently.
  // We union-type it to handle both shapes.
  registryInfo?: GfwRegistryInfo | GfwRegistryRecord[];
  registryInfoTotalRecords?: number;
  selfReportedInfo?: GfwSelfReportedInfo | GfwSelfReportedRecord[];
  combinedSourcesInfo?: GfwCombinedSourcesRecord[];
  registryOwners?: Array<{ name?: string; flag?: string; ssvid?: string; sourceCode?: string[] }>;
  ownership?: unknown;
  authorizations?: unknown;
  matchCriteria?: unknown;
  identity?: unknown;
}

export interface GfwEventEntry {
  id: string;
  type: string;
  start?: string;
  end?: string;
  position?: { lat: number; lon: number };
  vessel?: { id?: string; ssvid?: string; name?: string };
  fishing?: { averageSpeedKnots?: number | null };
  [k: string]: unknown;
}

export interface GfwEventsResponse {
  total?: number;
  limit?: number | null;
  offset?: number | null;
  nextOffset?: number | null;
  entries?: GfwEventEntry[];
  metadata?: unknown;
}

export interface GfwInsightsResponse {
  entries?: unknown[];
  [k: string]: unknown;
}

export interface GfwFourwingsReportResponse {
  total?: number;
  limit?: number | null;
  offset?: number | null;
  nextOffset?: number | null;
  metadata?: unknown;
  // The key is the resolved dataset version, e.g. "public-global-fishing-effort:v4.0"
  entries?: Array<Record<string, unknown[]>>;
}

export interface GfwFourwingsLastReportRunning {
  uri: string;
  status: 'running';
  lastUpdate?: string;
}

export interface GfwFourwingsLastReportError {
  status: number;
  message?: unknown;
}

export type GfwFourwingsLastReportResponse =
  | GfwFourwingsLastReportRunning
  | GfwFourwingsReportResponse
  | GfwFourwingsLastReportError;

// Backwards-compatible export name used by existing UI components.
export type GFWVesselInfo = GfwVesselIdentity;

/**
 * Normalize registryInfo from a GfwVesselIdentity to a flat array of GfwRegistryRecord.
 * Handles both shapes: direct array from search endpoint, and wrapper object from getById.
 */
export function getRegistryRecords(vessel: GfwVesselIdentity | null): GfwRegistryRecord[] {
  if (!vessel?.registryInfo) return [];
  // Direct array (from search/getById endpoints)
  if (Array.isArray(vessel.registryInfo)) return vessel.registryInfo;
  // Wrapper object shape (legacy/some endpoints)
  const wrapper = vessel.registryInfo as GfwRegistryInfo;
  return wrapper.currentRegistryInfo ?? wrapper.registryInfo ?? [];
}

/**
 * Normalize selfReportedInfo from a GfwVesselIdentity to a flat array of GfwSelfReportedRecord.
 */
export function getSelfReportedRecords(vessel: GfwVesselIdentity | null): GfwSelfReportedRecord[] {
  if (!vessel?.selfReportedInfo) return [];
  if (Array.isArray(vessel.selfReportedInfo)) return vessel.selfReportedInfo;
  const wrapper = vessel.selfReportedInfo as GfwSelfReportedInfo;
  return wrapper.selfReportedInfo ?? [];
}

/**
 * Get the best (latest/most complete) registry record from a vessel.
 */
export function getBestRegistryRecord(vessel: GfwVesselIdentity | null): GfwRegistryRecord | null {
  const records = getRegistryRecords(vessel);
  if (!records.length) return null;
  return records.find((r) => r.latestVesselInfo) ?? records[0];
}

/**
 * Extract extra fields from registryInfo if it's a wrapper object.
 */
export function getRegistryExtraFields(vessel: GfwVesselIdentity | null): GfwRegistryInfo['extraFields'] | undefined {
  if (!vessel?.registryInfo) return undefined;
  if (Array.isArray(vessel.registryInfo)) return undefined;
  return (vessel.registryInfo as GfwRegistryInfo).extraFields;
}

class GFWService {
  private token: string | undefined;
  // Cache to avoid redundant calls for same MMSI
  private cache = new Map<string, GfwVesselIdentity | null>();
  private fourwingsQueue: Promise<unknown> = Promise.resolve();
  
  private isPolling = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // NOTE: this exposes token to the client bundle; for production we should proxy via an edge function.
    this.token = env.gfwApiToken || undefined;
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    if (!this.token) return null;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status !== 404 && response.status !== 422 && response.status !== 429) {
        logger.error(`GFWService: API error ${response.status} for ${url}`);
      }
      return null;
    }

    return (await response.json()) as T;
  }

  private async fetchJsonWithStatus<T>(url: string): Promise<{ ok: boolean; status: number; data: T | null }> {
    if (!this.token) return { ok: false, status: 0, data: null };

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return { ok: false, status: response.status, data: null };

    try {
      return { ok: true, status: response.status, data: (await response.json()) as T };
    } catch {
      return { ok: false, status: response.status, data: null };
    }
  }

  private runFourwingsExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.fourwingsQueue.then(fn, fn);
    // Keep the queue alive even if a task fails.
    this.fourwingsQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async getFourwingsLastReport(): Promise<GfwFourwingsLastReportResponse | null> {
    const url = `${GFW_API_URL}/4wings/last-report`;
    return await this.fetchJson<GfwFourwingsLastReportResponse>(url);
  }

  /**
   * Run a 4Wings report (GET).
   *
   * Notes:
   * - GFW enforces "one concurrent report per token"; we serialize calls via a queue.
   * - `date-range` has a max of 366 days, so callers should chunk long ranges.
   * - Reports may time out (524). In that case, callers can recover via `last-report`.
   */
  async fourwingsReport(opts: {
    dataset: GfwFourwingsDataset;
    dateRange: { start: string; end: string }; // YYYY-MM-DD,YYYY-MM-DD
    temporalResolution: GfwFourwingsTemporalResolution;
    spatialAggregation?: boolean;
    groupBy?: GfwFourwingsGroupBy;
    format?: GfwFourwingsFormat;
    filters?: string[]; // e.g. ["vessel_id in ('123456789')"]
    region?: { dataset: string; id: string | number };
  }): Promise<GfwFourwingsReportResponse | null> {
    return await this.runFourwingsExclusive(async () => {
      const params = new URLSearchParams();
      params.set('format', opts.format ?? 'JSON');
      params.set('datasets[0]', opts.dataset);
      params.set('date-range', `${opts.dateRange.start},${opts.dateRange.end}`);
      params.set('temporal-resolution', opts.temporalResolution);

      if (opts.spatialAggregation != null) params.set('spatial-aggregation', String(opts.spatialAggregation));
      if (opts.groupBy) params.set('group-by', opts.groupBy);
      (opts.filters ?? []).forEach((f, i) => params.set(`filters[${i}]`, f));
      if (opts.region) {
        params.set('region-dataset', String(opts.region.dataset));
        params.set('region-id', String(opts.region.id));
      }

      const url = `${GFW_API_URL}/4wings/report?${params.toString()}`;

      // First attempt.
      const first = await this.fetchJsonWithStatus<GfwFourwingsReportResponse>(url);
      if (first.ok) return first.data;

      // Recoverable cases: 429 (report already running) or 524 (gateway timeout while report continues running).
      if (first.status !== 429 && first.status !== 524) return null;

      // Poll last-report for up to ~60s.
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        const last = await this.getFourwingsLastReport();
        if (!last) return null;
        if ((last as GfwFourwingsLastReportRunning).status === 'running') {
          // Keep polling.
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        // Finished (either a report response or an error wrapper).
        if ((last as GfwFourwingsLastReportError).status && (last as GfwFourwingsLastReportError).status !== 200) {
          return null;
        }
        return last as GfwFourwingsReportResponse;
      }

      return null;
    });
  }

  /**
   * Search for vessel metadata by MMSI.
   * Uses `where` parameter with ssvid syntax for reliable MMSI lookups.
   * Falls back to `query` parameter if `where` returns no results.
   * Returns null if not found or if no token is configured.
   */
  async searchByMmsi(mmsi: string, opts?: { dataset?: GfwDataset }): Promise<GfwVesselIdentity | null> {
    if (!this.token) {
      return null;
    }

    if (this.cache.has(mmsi)) {
      return this.cache.get(mmsi)!;
    }

    try {
      const dataset = opts?.dataset ?? 'public-global-vessel-identity:latest';

      // Strategy 1: Use `where` parameter with ssvid='MMSI' (most reliable for MMSI lookups)
      const whereParams = new URLSearchParams();
      whereParams.set('where', `ssvid='${mmsi}'`);
      whereParams.set('datasets[0]', dataset);
      // NOTE: search endpoint does NOT support `includes` — it returns full data by default

      const whereUrl = `${GFW_API_URL}/vessels/search?${whereParams.toString()}`;
      const whereData = await this.fetchJson<{ entries?: GfwVesselIdentity[] }>(whereUrl);
      if (whereData?.entries?.length) {
        // Prefer the entry that has registry info (more data)
        const entry = this.pickBestEntry(whereData.entries);
        this.cache.set(mmsi, entry);
        return entry;
      }

      // Strategy 2: Fallback to `query` parameter (handles partial/fuzzy matches)
      const queryParams = new URLSearchParams();
      queryParams.set('query', mmsi);
      queryParams.set('datasets[0]', dataset);

      const queryUrl = `${GFW_API_URL}/vessels/search?${queryParams.toString()}`;
      const queryData = await this.fetchJson<{ entries?: GfwVesselIdentity[] }>(queryUrl);
      if (queryData?.entries?.length) {
        const entry = this.pickBestEntry(queryData.entries);
        this.cache.set(mmsi, entry);
        return entry;
      }

      this.cache.set(mmsi, null);
      return null;

    } catch (err) {
      logger.error('GFWService: Failed to fetch vessel info', err);
      return null;
    }
  }

  /**
   * Search for vessel metadata by vessel name.
   * Uses the `query` parameter for name-based lookups.
   */
  async searchByName(name: string, opts?: { dataset?: GfwDataset }): Promise<GfwVesselIdentity | null> {
    if (!this.token || !name || name.trim().length < 3) {
      return null;
    }

    const cacheKey = `name:${name.trim().toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const dataset = opts?.dataset ?? 'public-global-vessel-identity:latest';

      const params = new URLSearchParams();
      params.set('query', name.trim());
      params.set('datasets[0]', dataset);

      const url = `${GFW_API_URL}/vessels/search?${params.toString()}`;
      const data = await this.fetchJson<{ entries?: GfwVesselIdentity[] }>(url);
      if (data?.entries?.length) {
        const entry = this.pickBestEntry(data.entries);
        this.cache.set(cacheKey, entry);
        return entry;
      }

      this.cache.set(cacheKey, null);
      return null;

    } catch (err) {
      logger.error('GFWService: Failed to search vessel by name', err);
      return null;
    }
  }

  /**
   * Pick the best entry from search results — prefer entries with registry info.
   */
  private pickBestEntry(entries: GfwVesselIdentity[]): GfwVesselIdentity {
    // Prefer entries with registry info (has ship name, IMO, etc)
    const withRegistry = entries.find((e) => {
      const records = getRegistryRecords(e);
      return records.length && records.some((r) => r.shipname || r.imo);
    });
    if (withRegistry) return withRegistry;

    // Prefer entries with self-reported info that has a ship name
    const withName = entries.find((e) =>
      getSelfReportedRecords(e).some((s) => s.shipname),
    );
    if (withName) return withName;

    return entries[0];
  }

  async getVesselById(vesselId: string, opts?: { dataset?: GfwDataset }): Promise<GfwVesselIdentity | null> {
    const dataset = opts?.dataset ?? 'public-global-vessel-identity:latest';
    const params = new URLSearchParams();
    params.set('dataset', dataset);
    // NOTE: `includes` parameter causes 422 on current API version — omit it

    const url = `${GFW_API_URL}/vessels/${encodeURIComponent(vesselId)}?${params.toString()}`;
    return await this.fetchJson<GfwVesselIdentity>(url);
  }

  async listEvents(opts: {
    vesselIds: string[];
    datasets: GfwDataset[];
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD (exclusive in GFW docs)
    types?: GfwEventType[];
    limit?: number;
    offset?: number;
  }): Promise<GfwEventsResponse | null> {
    const params = new URLSearchParams();
    opts.vesselIds.forEach((v, i) => params.set(`vessels[${i}]`, v));
    opts.datasets.forEach((d, i) => params.set(`datasets[${i}]`, d));
    params.set('start-date', opts.startDate);
    params.set('end-date', opts.endDate);
    if (opts.types && opts.types.length) params.set('types', opts.types.join(','));
    params.set('limit', String(opts.limit ?? 100));
    params.set('offset', String(opts.offset ?? 0));

    const url = `${GFW_API_URL}/events?${params.toString()}`;
    return await this.fetchJson<GfwEventsResponse>(url);
  }

  async getInsightsByVessels(opts: { vesselIds: string[]; insights: GfwInsight[] }): Promise<GfwInsightsResponse | null> {
    const url = `${GFW_API_URL}/insights/vessels`;
    if (!this.token) return null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vessels: opts.vesselIds,
          insights: opts.insights,
        }),
      });

      if (!response.ok) {
        if (response.status !== 404 && response.status !== 429) {
          logger.error(`GFWService: Insights API error ${response.status}`);
        }
        return null;
      }

      return (await response.json()) as GfwInsightsResponse;
    } catch (err) {
      logger.error('GFWService: Failed to fetch insights', err);
      return null;
    }
  }

  /**
   * Fetch recent fishing events (last 2 days)
   * to display vessels from GFW API.
   */
  async fetchVesselsInBoundingBox() {
    if (!this.token) return;

    // GFW data typically has a 3-5 day processing latency.
    // Fetch a 14-day window to ensure we always get the most recent data.
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    try {
      // Fetch the 500 most recent global fishing events
      const data = await this.listEvents({
        vesselIds: [],
        datasets: ['public-global-fishing-events:latest'],
        startDate: startStr,
        endDate: endStr,
        limit: 500,
        offset: 0,
      });

      if (data && data.entries && Array.isArray(data.entries)) {
        const positions: VesselPosition[] = [];
        
        for (const event of data.entries) {
          if (!event.position || !event.vessel) continue;

          positions.push({
            id: `gfw-${event.vessel.ssvid}-${Date.now()}`,
            vesselId: String(event.vessel.ssvid || event.vessel.id),
            orgId: 'gfw',
            location: { lat: event.position.lat, lng: event.position.lon },
            name: event.vessel.name || undefined,
            heading: null,
            course: null,
            speed: event.fishing?.averageSpeedKnots || null,
            navStatus: 'fishing',
            rot: null,
            timestamp: event.end || new Date().toISOString(),
            source: 'globalfishing',
          });
        }

        const store = useRealtimeStore.getState();
        positions.forEach(pos => {
          // Do not overwrite live AIS or Transparency data with historical GFW data
          const existing = store.positions.get(pos.vesselId);
          if (!existing || existing.source === 'globalfishing') {
            store.upsertPosition(pos);
          }
        });
      }
    } catch (err) {
      logger.error('GFWService: Failed to fetch fishing events', err);
    }
  }

  startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;

    const poll = () => {
      // Fetch 500 recent global events, regardless of bounds
      this.fetchVesselsInBoundingBox();
    };

    this.intervalId = setInterval(poll, 60000);
    poll(); // Initial fetch
  }

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
  }
}

export const gfwService = new GFWService();
