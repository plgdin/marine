import { useRealtimeStore } from '@shared/stores/realtime.store';
import { logger }           from '@shared/utils/logger';
import { REALTIME }         from '@shared/utils/constants';
import type { VesselPosition } from '@shared/types/domain.types';

// ── AIS Stream Types ───────────────────────────────────────────

export interface AISStreamSubscription {
  Apikey: string;
  BoundingBoxes: [number, number][][];
  FilterMessageTypes?: string[];
  FiltersShipMMSI?: string[];
}

export interface AISStreamPositionReport {
  Cog: number;       // Course over ground
  Sog: number;       // Speed over ground
  Heading: number;   // True heading
  Latitude: number;
  Longitude: number;
  Rot: number;       // Rate of turn
  Timestamp: number; // Seconds past UTC hour
  NavigationalStatus: number;
}

export interface AISStreamShipStaticData {
  Name: string;
  // AISStream docs use ImoNumber + MaximumStaticDraught, but some payloads include older aliases too.
  Imo?: number;
  ImoNumber?: number;
  CallSign: string;
  Type: number;
  Destination: string;
  Eta: { Month: number; Day: number; Hour: number; Minute: number };
  MaximumStaticDraught?: number;
  Draught?: number;
  Dimension: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

export interface AISStreamMessage {
  MessageType: string;
  MetaData: {
    MMSI: number;
    MMSI_String: string;
    ShipName: string;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
  Message: {
    PositionReport?: AISStreamPositionReport;
    ShipStaticData?: AISStreamShipStaticData;
  };
}

// ── AIS Nav Status Mapping ─────────────────────────────────────
const AIS_NAV_STATUS_MAP: Record<number, string> = {
  0: 'underway',
  1: 'anchored',
  2: 'not-under-command',
  3: 'restricted',
  4: 'restricted',
  5: 'moored',
  6: 'aground',
  7: 'fishing',
  8: 'sailing',
  9: 'restricted',
  10: 'restricted',
  11: 'restricted',
  12: 'restricted',
  13: 'restricted',
  14: 'unknown',
  15: 'unknown',
};

// ── AIS Ship Type Mapping ──────────────────────────────────────
/**
 * Maps AIS ship type codes to readable vessel type categories.
 * AIS type codes: 0-19 reserved, 20-29 WIG, 30-39 fishing/towing,
 * 40-49 HSC, 50-59 pilot/tug, 60-69 passenger, 70-79 cargo, 80-89 tanker.
 * 
 * Bulk carriers share code range 70-79 with general cargo — 
 * we use a ship name heuristic to distinguish them.
 */
export function mapAISShipType(typeCode: number, shipName?: string): string {
  // Check ship name for bulk carrier indicators
  const nameUpper = String(shipName || '').toUpperCase();
  if (
    nameUpper.includes('BULK') ||
    nameUpper.includes('BULKER') ||
    nameUpper.includes('BLK')
  ) {
    return 'bulk_carrier';
  }

  if (typeCode >= 70 && typeCode <= 79) return 'cargo';
  if (typeCode >= 80 && typeCode <= 89) return 'tanker';
  if (typeCode >= 60 && typeCode <= 69) return 'passenger';
  if (typeCode >= 30 && typeCode <= 39) return 'fishing';
  if (typeCode >= 50 && typeCode <= 59) return 'tug';
  if (typeCode >= 40 && typeCode <= 49) return 'hsc';
  if (typeCode >= 20 && typeCode <= 29) return 'wig';
  return 'other';
}

// ── Vessel Metadata Cache ──────────────────────────────────────
// Stores ship names, types, etc. from ShipStaticData messages
export interface VesselMetadata {
  name: string;
  mmsi: string;
  imo: string | null;
  callSign: string | null;
  shipType: number;
  vesselType: string;   // Resolved category: 'cargo' | 'tanker' | 'bulk_carrier' | etc.
  destination: string | null;
  etaIso: string | null;
  draughtM: number | null;
  dimension: { A: number; B: number; C: number; D: number } | null;
  lengthOverallM: number | null;
  beamM: number | null;
  lastStaticUpdateIso: string | null;
}

const vesselMetadataCache = new Map<string, VesselMetadata>();

type VesselAisStats = {
  positionCount: number;
  lastPositionIso: string | null;
  lastIntervalSec: number | null;
  avgIntervalSec: number | null;
};

const vesselAisStatsCache = new Map<string, {
  positionCount: number;
  lastPosMs: number | null;
  intervalsSec: number[];
}>();

export function getVesselMetadata(mmsi: string): VesselMetadata | undefined {
  return vesselMetadataCache.get(mmsi);
}

export function getAllVesselMetadata(): Map<string, VesselMetadata> {
  return vesselMetadataCache;
}

export function getVesselAisStats(mmsi: string): VesselAisStats | null {
  const s = vesselAisStatsCache.get(mmsi);
  if (!s) return null;
  const lastIntervalSec = s.intervalsSec.length > 0 ? s.intervalsSec[s.intervalsSec.length - 1] : null;
  const avgIntervalSec = s.intervalsSec.length > 0
    ? s.intervalsSec.reduce((a, b) => a + b, 0) / s.intervalsSec.length
    : null;

  return {
    positionCount: s.positionCount,
    lastPositionIso: s.lastPosMs ? new Date(s.lastPosMs).toISOString() : null,
    lastIntervalSec,
    avgIntervalSec,
  };
}

// ── AIS Stream Service ─────────────────────────────────────────

const AISSTREAM_WS_URL = 'wss://stream.aisstream.io/v0/stream';

function computeEtaIso(eta: AISStreamShipStaticData['Eta'] | undefined): string | null {
  if (!eta) return null;
  const { Month, Day, Hour, Minute } = eta;
  if (!Month || !Day) return null;

  const now = new Date();
  const year = now.getUTCFullYear();
  // AIS ETA lacks year; pick the next occurrence in UTC.
  const guess = new Date(Date.UTC(year, Month - 1, Day, Hour ?? 0, Minute ?? 0, 0));
  if (guess.getTime() < now.getTime() - 12 * 60 * 60 * 1000) {
    guess.setUTCFullYear(year + 1);
  }
  return guess.toISOString();
}

class AISStreamService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private apiKey: string = '';
  private boundingBoxes: [number, number][][] = [[[-90, -180], [90, 180]]];
  private filtersShipMmsi?: string[];
  private messageCount = 0;
  private onStatsUpdate?: (count: number) => void;

  /**
   * Configure the service before connecting.
   */
  public configure(options: {
    apiKey: string;
    boundingBoxes?: [number, number][][];
    filtersShipMmsi?: string[];
    onStatsUpdate?: (count: number) => void;
  }) {
    this.apiKey = options.apiKey;
    if (options.boundingBoxes) {
      this.boundingBoxes = options.boundingBoxes;
    }
    if (options.filtersShipMmsi) {
      this.filtersShipMmsi = options.filtersShipMmsi;
    } else {
      this.filtersShipMmsi = undefined;
    }
    this.onStatsUpdate = options.onStatsUpdate;
  }

  /**
   * Open WebSocket connection to AISStream.io.
   */
  public connect() {
    if (this.isConnected || this.ws) return;
    if (!this.apiKey) {
      logger.error('AISStreamService: No API key configured');
      return;
    }

    logger.info('AISStreamService: Connecting to AISStream.io...');
    useRealtimeStore.getState().setConnectionStatus('reconnecting');

    try {
      this.ws = new WebSocket(AISSTREAM_WS_URL);

      this.ws.onopen = () => {
        logger.info('AISStreamService: WebSocket connected, sending subscription...');
        
        const subscription: AISStreamSubscription = {
          Apikey: this.apiKey,
          BoundingBoxes: this.boundingBoxes,
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        };

        if (this.filtersShipMmsi && this.filtersShipMmsi.length > 0) {
          subscription.FiltersShipMMSI = this.filtersShipMmsi;
        }

        this.ws?.send(JSON.stringify(subscription));
        
        this.isConnected = true;
        this.attempt = 0;
        useRealtimeStore.getState().setConnectionStatus('connected');
        logger.info('AISStreamService: Subscription sent, receiving live AIS data...');
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        try {
          // AISStream sends data as Blob - convert to text first
          const raw = event.data instanceof Blob
            ? await event.data.text()
            : event.data;
          const data: AISStreamMessage = JSON.parse(raw);
          this.handleMessage(data);
        } catch (err) {
          logger.error('AISStreamService: Failed to parse message', err);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.isConnected = false;
        this.ws = null;
        useRealtimeStore.getState().setConnectionStatus('disconnected');
        logger.warn(`AISStreamService: Connection closed (code: ${event.code}, reason: ${event.reason})`);
        
        // Auto-reconnect unless manually disconnected
        if (event.code !== 1000) {
          this.handleReconnect();
        }
      };

      this.ws.onerror = (error: Event) => {
        logger.error('AISStreamService: WebSocket error', error);
      };
    } catch (err) {
      logger.error('AISStreamService: Failed to create WebSocket', err);
      this.handleReconnect();
    }
  }

  /**
   * Handle incoming AIS messages.
   */
  private handleMessage(data: AISStreamMessage) {
    const mmsi = data.MetaData.MMSI_String;
    if (!mmsi) return;

    this.messageCount++;
    if (this.messageCount % 50 === 0 && this.onStatsUpdate) {
      this.onStatsUpdate(this.messageCount);
    }

    if (data.MessageType === 'PositionReport' && data.Message.PositionReport) {
      this.handlePositionReport(mmsi, data);
    } else if (data.MessageType === 'ShipStaticData' && data.Message.ShipStaticData) {
      this.handleShipStaticData(mmsi, data);
    }
  }

  /**
   * Process a PositionReport message -> update vessel position on map.
   */
  private handlePositionReport(mmsi: string, data: AISStreamMessage) {
    const report = data.Message.PositionReport!;
    const meta = data.MetaData;

    // We must use the report's Latitude/Longitude.
    // MetaData.latitude/longitude is the position of the RECEIVER ANTENNA, not the ship!
    const lat = report.Latitude;
    const lng = report.Longitude;

    // Skip invalid coordinates
    if (lat === 0 && lng === 0) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    const navStatusCode = report.NavigationalStatus ?? 15;
    const navStatus = (AIS_NAV_STATUS_MAP[navStatusCode] ?? 'unknown') as VesselPosition['navStatus'];

    // Get cached metadata
    const cachedMeta = vesselMetadataCache.get(mmsi);

    // Update metadata cache with position metadata if we don't have static data yet
    if (!cachedMeta && meta.ShipName) {
      const name = meta.ShipName.trim();
      vesselMetadataCache.set(mmsi, {
        name,
        mmsi,
        imo: null,
        callSign: null,
        shipType: 0,
        vesselType: mapAISShipType(0, name),
        destination: null,
        etaIso: null,
        draughtM: null,
        dimension: null,
        lengthOverallM: null,
        beamM: null,
        lastStaticUpdateIso: null,
      });
    }

    const pos: VesselPosition = {
      id: `ais-${mmsi}-${Date.now()}`,
      vesselId: mmsi,
      orgId: 'aisstream',
      location: { lat, lng },
      heading: report.Heading !== 511 ? report.Heading : null,  // 511 = not available
      course: report.Cog !== 3600 ? report.Cog / 10 : null,     // Tenths of degree
      speed: report.Sog !== 1023 ? report.Sog / 10 : null,      // Tenths of knot
      navStatus,
      rot: report.Rot !== -128 ? report.Rot : null,
      timestamp: meta.time_utc || new Date().toISOString(),
      source: 'ais',
    };

    // Lightweight per-vessel stats for detail views.
    const nowMs = Date.now();
    const prev = vesselAisStatsCache.get(mmsi);
    if (!prev) {
      vesselAisStatsCache.set(mmsi, { positionCount: 1, lastPosMs: nowMs, intervalsSec: [] });
    } else {
      const dtSec = prev.lastPosMs ? Math.max(0, (nowMs - prev.lastPosMs) / 1000) : 0;
      const nextIntervals = dtSec > 0 ? [...prev.intervalsSec, dtSec].slice(-60) : prev.intervalsSec;
      vesselAisStatsCache.set(mmsi, {
        positionCount: prev.positionCount + 1,
        lastPosMs: nowMs,
        intervalsSec: nextIntervals,
      });
    }

    useRealtimeStore.getState().upsertPosition(pos);
  }

  /**
   * Process ShipStaticData -> cache vessel metadata.
   */
  private handleShipStaticData(mmsi: string, data: AISStreamMessage) {
    const staticData = data.Message.ShipStaticData!;
    const name = (staticData.Name || data.MetaData.ShipName || '').trim();
    const typeCode = staticData.Type ?? 0;

    const imoNumber = staticData.Imo ?? staticData.ImoNumber ?? 0;
    const dim = staticData.Dimension
      ? {
          A: Number(staticData.Dimension.A ?? 0),
          B: Number(staticData.Dimension.B ?? 0),
          C: Number(staticData.Dimension.C ?? 0),
          D: Number(staticData.Dimension.D ?? 0),
        }
      : null;
    const lengthOverallM = dim ? dim.A + dim.B : null;
    const beamM = dim ? dim.C + dim.D : null;
    const draughtRaw = staticData.MaximumStaticDraught ?? staticData.Draught ?? null;
    const draughtM = draughtRaw == null ? null : Number(draughtRaw);
    
    vesselMetadataCache.set(mmsi, {
      name,
      mmsi,
      imo: imoNumber ? String(imoNumber) : null,
      callSign: staticData.CallSign?.trim() || null,
      shipType: typeCode,
      vesselType: mapAISShipType(typeCode, name),
      destination: staticData.Destination?.trim() || null,
      etaIso: computeEtaIso(staticData.Eta),
      draughtM,
      dimension: dim,
      lengthOverallM,
      beamM,
      lastStaticUpdateIso: new Date().toISOString(),
    });
  }

  /**
   * Update the bounding box filter (e.g., when user pans the map).
   */
  public updateBoundingBoxes(boxes: [number, number][][]) {
    this.boundingBoxes = boxes;
    // Reconnect with new bounding boxes if already connected
    if (this.isConnected) {
      this.disconnect();
      setTimeout(() => this.connect(), 100);
    }
  }

  /**
   * Gracefully disconnect.
   */
  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onclose = null; // Prevent auto-reconnect on intentional disconnect
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    useRealtimeStore.getState().setConnectionStatus('disconnected');
    logger.info('AISStreamService: Disconnected');
  }

  /**
   * Exponential backoff reconnection.
   */
  private handleReconnect() {
    if (this.attempt >= REALTIME.reconnectMaxAttempts) {
      logger.error('AISStreamService: Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(
      REALTIME.reconnectBaseDelayMs * Math.pow(2, this.attempt),
      REALTIME.reconnectMaxDelayMs
    );

    this.attempt++;
    logger.warn(`AISStreamService: Reconnecting in ${delay}ms (Attempt ${this.attempt})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Get current stats.
   */
  public getStats() {
    return {
      isConnected: this.isConnected,
      messageCount: this.messageCount,
      vesselCount: useRealtimeStore.getState().positions.size,
      metadataCacheSize: vesselMetadataCache.size,
    };
  }
}

export const aisStreamService = new AISStreamService();
