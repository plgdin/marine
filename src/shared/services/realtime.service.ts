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

    this.channel = supabase.channel('public:vessel_positions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vessel_positions' },
        (payload: any) => {
          this.handlePositionUpdate(payload.new as any);
        }
      )
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

  private handlePositionUpdate(row: any) {
    if (!row || !row.id || !row.vessel_id) return;

    // Supabase Realtime often sends PostGIS geographies as EWKB hex strings.
    // For simplicity here, we assume it's parsed or we fallback to 0,0 
    // until a dedicated hex parser or PostgREST computed column is used.
    let lat = 0;
    let lng = 0;
    
    // Naive fallback for WKT 'POINT(lng lat)'
    if (typeof row.location === 'string' && row.location.startsWith('POINT')) {
      const match = row.location.match(/POINT\(([^ ]+)\s+([^)]+)\)/);
      if (match) {
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
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
