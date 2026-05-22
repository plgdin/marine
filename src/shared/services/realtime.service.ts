import { useRealtimeStore } from '@shared/stores/realtime.store';
import { eventBus }         from '@shared/utils/event-bus';
import { logger }           from '@shared/utils/logger';
import { REALTIME }         from '@shared/utils/constants';

/**
 * Realtime Connection Manager.
 * Handles the WebSocket lifecycle to Supabase Realtime.
 * In a real implementation, this would use supabase.channel().
 */
class RealtimeService {
  private isConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;

  public connect() {
    if (this.isConnected) return;

    logger.info('RealtimeService: Connecting...');
    useRealtimeStore.getState().setConnectionStatus('reconnecting');

    // STUB: Simulate network delay and connection
    setTimeout(() => {
      this.isConnected = true;
      this.attempt = 0;
      useRealtimeStore.getState().setConnectionStatus('connected');
      eventBus.emit('realtime:connected', {});
      logger.info('RealtimeService: Connected to live feed');
      
      this.startMockStream();
    }, 1500);
  }

  // ── MOCK STREAM FOR ARCHITECTURE VALIDATION ─────────────────
  private mockInterval: ReturnType<typeof setInterval> | null = null;
  private startMockStream() {
    if (this.mockInterval) return;

    logger.info('RealtimeService: Starting mock vessel stream (Architecture Validation)');
    
    // Generate 500 initial vessels around the world
    const initialVessels = Array.from({ length: 500 }).map((_, i) => ({
      id: `POS-${i}`,
      vesselId: `VESSEL-${i}`,
      orgId: 'ORG-1',
      location: {
        lat: (Math.random() - 0.5) * 160,
        lng: (Math.random() - 0.5) * 360,
      },
      heading: Math.floor(Math.random() * 360),
      course: null,
      speed: Math.floor(Math.random() * 25),
      rot: null,
      navStatus: ['underway', 'anchored', 'moored', 'restricted'][Math.floor(Math.random() * 4)] as any,
      timestamp: new Date().toISOString(),
      source: 'ais' as const,
    }));

    initialVessels.forEach(v => useRealtimeStore.getState().upsertPosition(v));

    // Simulate high-frequency WebSocket bursts (e.g. 50 updates per second)
    this.mockInterval = setInterval(() => {
      const updates = [];
      // Pick 50 random vessels to update
      for (let i = 0; i < 50; i++) {
        const id = `VESSEL-${Math.floor(Math.random() * 500)}`;
        const pos = useRealtimeStore.getState().positions.get(id);
        if (pos && pos.heading !== null) {
          // move slightly based on heading
          const latMove = Math.cos(pos.heading * (Math.PI / 180)) * 0.01;
          const lngMove = Math.sin(pos.heading * (Math.PI / 180)) * 0.01;
          
          updates.push({
            ...pos,
            location: {
              lat: pos.location.lat + latMove,
              lng: pos.location.lng + lngMove,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
      
      // Batch update the store
      updates.forEach(u => useRealtimeStore.getState().upsertPosition(u));
    }, 100);
  }

  private stopMockStream() {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }
  // ────────────────────────────────────────────────────────────

  public disconnect() {
    if (!this.isConnected) return;
    
    logger.info('RealtimeService: Disconnecting...');
    this.isConnected = false;
    useRealtimeStore.getState().setConnectionStatus('disconnected');
    eventBus.emit('realtime:disconnected', {});
    this.stopMockStream();
    
    // TODO: supabase.removeAllChannels();
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
