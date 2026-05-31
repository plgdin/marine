import { useRealtimeStore } from '@shared/stores/realtime.store';
import { logger } from '@shared/utils/logger';
import { VesselPosition } from '@shared/types/domain.types';

const TRANPARENCY_API_URL = import.meta.env.VITE_TRANSPARENCY_API_URL || 'http://localhost:5000';

class TransparencyService {
  private isPolling = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastLat = 0;
  private lastLng = 0;

  /**
   * Fetch vessels near a specific coordinate and distance (nm)
   */
  async fetchVesselsNear(lat: number, lng: number, distanceNm: number = 50) {
    try {
      const url = `${TRANPARENCY_API_URL}/legacy/getVesselsNearMe/${lat}/${lng}/${distanceNm}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return;
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const positions: VesselPosition[] = data.map((v: any) => ({
          id: `transparency-${v.MMSI}-${Date.now()}`,
          vesselId: String(v.MMSI),
          orgId: 'transparency',
          location: { lat: parseFloat(v.LAT), lng: parseFloat(v.LON) },
          heading: parseFloat(v.HEADING) || null,
          course: parseFloat(v.COURSE) || null,
          speed: parseFloat(v.SPEED) || null,
          navStatus: 'underway', // Default or map if available
          rot: null,
          timestamp: v.TIMESTAMP || new Date().toISOString(),
          source: 'transparency',
        }));

        const store = useRealtimeStore.getState();
        positions.forEach(pos => {
          // If we already have fresh AIS data for this vessel, don't overwrite it with transparency data
          // (assuming AIS is more real-time/accurate if available)
          const existing = store.positions.get(pos.vesselId);
          if (!existing || existing.source !== 'ais') {
             store.upsertPosition(pos);
          }
        });
      }
    } catch (err) {
      logger.error('TransparencyService: Failed to fetch open ocean vessels', err);
    }
  }

  startPolling(getCenter: () => { lat: number, lng: number }) {
    if (this.isPolling) return;
    this.isPolling = true;
    
    // Poll every 60 seconds
    this.intervalId = setInterval(() => {
      const { lat, lng } = getCenter();
      // Only fetch if moved significantly to save calls
      if (Math.abs(lat - this.lastLat) > 0.5 || Math.abs(lng - this.lastLng) > 0.5) {
        this.fetchVesselsNear(lat, lng, 100);
        this.lastLat = lat;
        this.lastLng = lng;
      }
    }, 60000);

    // Initial fetch
    const { lat, lng } = getCenter();
    this.fetchVesselsNear(lat, lng, 100);
    this.lastLat = lat;
    this.lastLng = lng;
  }

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
  }
}

export const transparencyService = new TransparencyService();
