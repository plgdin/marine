import { logger } from '@shared/utils/logger';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import type { VesselPosition } from '@shared/types/domain.types';

// Use local proxy to avoid CORS issues
const VESSEL_API_URL = '/api/vesselapi/v1';

function getNavStatusString(status: number): VesselPosition['navStatus'] {
  const map: Record<number, VesselPosition['navStatus']> = {
    0: 'underway',
    1: 'anchored',
    2: 'not-under-command',
    3: 'restricted',
    5: 'moored',
    6: 'aground',
    7: 'fishing',
    8: 'sailing'
  };
  return map[status] || 'unknown';
}

class VesselApiService {
  private token: string | undefined;
  private isPolling = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.token = import.meta.env.VITE_VESSEL_API_KEY;
  }

  /**
   * Fetch vessels in bounding box from VesselAPI
   */
  async fetchVesselsInBoundingBox(minLat: number, maxLat: number, minLon: number, maxLon: number) {
    if (!this.token) return;

    try {
      const url = `${VESSEL_API_URL}/location/vessels/bounding-box?filter.lonLeft=${minLon}&filter.lonRight=${maxLon}&filter.latBottom=${minLat}&filter.latTop=${maxLat}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status !== 429) {
          logger.error(`VesselApiService: API error ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      if (data && data.vessels && Array.isArray(data.vessels)) {
        const positions: VesselPosition[] = [];
        
        for (const pos of data.vessels) {
          if (!pos.latitude || !pos.longitude) continue;

          positions.push({
            id: `vapi-${pos.mmsi}-${Date.now()}`,
            vesselId: String(pos.mmsi),
            orgId: 'vesselapi',
            location: { lat: pos.latitude, lng: pos.longitude },
            name: pos.vessel_name || undefined,
            heading: pos.heading || null,
            course: pos.cog || null,
            speed: pos.sog || null,
            navStatus: typeof pos.nav_status === 'number' ? getNavStatusString(pos.nav_status) : (pos.nav_status || 'unknown'),
            rot: null,
            timestamp: pos.timestamp || new Date().toISOString(),
            source: 'api',
          });
        }

        const store = useRealtimeStore.getState();
        positions.forEach(pos => {
          const existing = store.positions.get(pos.vesselId);
          // Only overwrite if it's not live AIS
          if (!existing || existing.source !== 'ais') {
            store.upsertPosition(pos);
          }
        });
      }
    } catch (err) {
      logger.error('VesselApiService: Failed to fetch vessel positions', err);
    }
  }

  startPolling(getBounds: () => { minLat: number, maxLat: number, minLon: number, maxLon: number }[]) {
    if (this.isPolling) return;
    this.isPolling = true;

    const poll = () => {
      const boundsArray = getBounds();
      
      // Fetch all boxes concurrently
      for (const bounds of boundsArray) {
        this.fetchVesselsInBoundingBox(bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon);
      }
    };

    this.intervalId = setInterval(poll, 60000); // 60s polling to avoid rate limits with multiple boxes
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

export const vesselApiService = new VesselApiService();
