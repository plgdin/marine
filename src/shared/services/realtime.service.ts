import { useRealtimeStore } from '@shared/stores/realtime.store';
import { eventBus }         from '@shared/utils/event-bus';
import { logger }           from '@shared/utils/logger';
import { REALTIME }         from '@shared/utils/constants';
import { supabase }         from '@config/supabase';
import type { VesselPosition } from '@shared/types/domain.types';

/**
 * Realtime Connection Manager.
 * Handles the WebSocket lifecycle to Supabase Realtime.
 */
class RealtimeService {
  private isConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private channel: ReturnType<typeof supabase.channel> | null = null;

  public connect() {
    if (this.isConnected || this.channel) return;

    logger.info('RealtimeService: Connecting to Supabase Realtime...');
    useRealtimeStore.getState().setConnectionStatus('reconnecting');

    this.channel = supabase.channel('public:vessel_latest_positions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vessel_latest_positions' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.handlePositionUpdate(payload.new as any);
        }
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .subscribe((status: string, err: any) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.attempt = 0;
          useRealtimeStore.getState().setConnectionStatus('connected');
          eventBus.emit('realtime:connected', {});
          logger.info('RealtimeService: Connected to live feed');
        } else if (status === 'CLOSED') {
          this.isConnected = false;
          useRealtimeStore.getState().setConnectionStatus('disconnected');
          logger.warn('RealtimeService: Connection closed');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('RealtimeService: Channel error', err);
          this.simulateDisconnection();
        }
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlePositionUpdate(row: any) {
    if (!row || !row.id || !row.vessel_id) return;

    // Supabase Realtime often sends PostGIS geographies as EWKB hex strings.
    let lat = 0;
    let lng = 0;
    
    if (typeof row.location === 'string') {
      // WKT fallback
      if (row.location.startsWith('POINT')) {
        const match = row.location.match(/POINT\(([^ ]+)\s+([^)]+)\)/);
        if (match) {
          lng = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        }
      } 
      // EWKB (PostGIS hex) parser
      else if (row.location.startsWith('0101000020E6100000')) {
        try {
          const hex = row.location.substring(18); 
          if (hex.length >= 32) {
            const lngHex = hex.substring(0, 16);
            const latHex = hex.substring(16, 32);
            
            const parseHexDouble = (h: string) => {
              const bytes = new Uint8Array(h.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
              return new Float64Array(bytes.buffer)[0];
            };
            lng = parseHexDouble(lngHex);
            lat = parseHexDouble(latHex);
          }
        } catch (e) {
          logger.error('Failed to parse WKB', e);
        }
      }
    }

    const pos: VesselPosition = {
      id: row.id,
      vesselId: row.vessel_id,
      orgId: row.org_id,
      location: { lat, lng },
      heading: row.heading ?? null,
      course: row.course ?? null,
      speed: row.speed ?? null,
      rot: row.rot ?? null,
      navStatus: row.nav_status ?? 'unknown',
      timestamp: row.timestamp,
      source: row.source,
    };

    useRealtimeStore.getState().upsertPosition(pos);
  }

  public disconnect() {
    if (!this.isConnected && !this.channel) return;
    
    logger.info('RealtimeService: Disconnecting...');
    this.isConnected = false;
    useRealtimeStore.getState().setConnectionStatus('disconnected');
    eventBus.emit('realtime:disconnected', {});
    
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  public simulateDisconnection() {
    this.disconnect();
    this.handleReconnect();
  }

  private handleReconnect() {
    if (this.attempt >= REALTIME.reconnectMaxAttempts) {
      logger.error('RealtimeService: Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(
      REALTIME.reconnectBaseDelayMs * Math.pow(2, this.attempt),
      REALTIME.reconnectMaxDelayMs
    );

    this.attempt++;
    logger.warn(`RealtimeService: Reconnecting in ${delay}ms (Attempt ${this.attempt})`);
    
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export const realtimeService = new RealtimeService();
