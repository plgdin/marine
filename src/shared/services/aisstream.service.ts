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
  Imo: number;
  CallSign: string;
  Type: number;
  Destination: string;
  Eta: { Month: number; Day: number; Hour: number; Minute: number };
  Draught: number;
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
}

const vesselMetadataCache = new Map<string, VesselMetadata>();

export function getVesselMetadata(mmsi: string): VesselMetadata | undefined {
  return vesselMetadataCache.get(mmsi);
}

export function getAllVesselMetadata(): Map<string, VesselMetadata> {
  return vesselMetadataCache;
}

// ── AIS Stream Service ─────────────────────────────────────────

const AISSTREAM_WS_URL = 'wss://stream.aisstream.io/v0/stream';

class AISStreamService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private apiKey: string = '';
  private boundingBoxes: [number, number][][] = [[[-90, -180], [90, 180]]];
  private messageCount = 0;
  private onStatsUpdate?: (count: number) => void;

  /**
   * Configure the service before connecting.
   */
  public configure(options: {
    apiKey: string;
    boundingBoxes?: [number, number][][];
    onStatsUpdate?: (count: number) => void;
  }) {
    this.apiKey = options.apiKey;
    if (options.boundingBoxes) {
      this.boundingBoxes = options.boundingBoxes;
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

        this.ws?.send(JSON.stringify(subscription));
        
        this.isConnected = true;
        this.attempt = 0;
        useRealtimeStore.getState().setConnectionStatus('connected');
        logger.info('AISStreamService: Subscription sent, receiving live AIS data...');
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        try {
          // AISStream sends data as Blob — convert to text first
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
   * Process a PositionReport message → update vessel position on map.
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

    useRealtimeStore.getState().upsertPosition(pos);
  }

  /**
   * Process ShipStaticData → cache vessel metadata.
   */
  private handleShipStaticData(mmsi: string, data: AISStreamMessage) {
    const staticData = data.Message.ShipStaticData!;
    const name = (staticData.Name || data.MetaData.ShipName || '').trim();
    const typeCode = staticData.Type ?? 0;
    
    vesselMetadataCache.set(mmsi, {
      name,
      mmsi,
      imo: staticData.Imo ? String(staticData.Imo) : null,
      callSign: staticData.CallSign?.trim() || null,
      shipType: typeCode,
      vesselType: mapAISShipType(typeCode, name),
      destination: staticData.Destination?.trim() || null,
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
